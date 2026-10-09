import { describe, it, expect } from 'vitest';
import { getMarketById } from '../markets/registry';
import { computeNetback } from '../netback/engine';
import { evaluateEligibility } from '../eligibility/engine';
import { REFERENCE_CONSIGNMENTS } from '../consignment/feedstocks';
import type { Consignment, CustodyPack } from '../consignment/types';
import type { MarksState, CostInputs } from '../netback/types';
import { getLhvFactorForOrigin } from '../assumptions/registry';
import { computeCertificateValue, ggeRouteCostLines } from '../netback/engine';
import { ggeEffectiveBookingDeadline } from '../eligibility/gates/chain-of-custody';
import { simulateDesk } from '../marks/simulate';
import { migrateState, createDefaultState } from '../../store/context';
import { NL_GGE_BUYOUT_EUR_PER_TCO2E } from '../regulatory/constants';

describe('Job GGE-1 — NL_GGE Market, Valuation and Chain of Custody', () => {
  const emptyCosts: CostInputs = {
    transferCosts: null,
    certificationCosts: null,
    logistics: null,
    otherCosts: null,
  };

  const ggeMarks: MarksState = {
    marks: {
      NL_GGE: {
        marketId: 'NL_GGE',
        bid: 0.44,
        offer: 0.46,
        mid: 0.45,
        updatedAt: '2026-10-09T00:00:00Z',
        source: 'Broker',
      },
      DE_THG: {
        marketId: 'DE_THG',
        bid: 290,
        offer: 310,
        mid: 300,
        updatedAt: '2026-10-09T00:00:00Z',
        source: 'Argus',
      },
    },
    gasIndex: { bid: 28, offer: 29, mid: 28.5, updatedAt: '2026-10-09T00:00:00Z' },
    fx: { gbpEur: 1.18, chfEur: 1.06, updatedAt: '2026-10-09T00:00:00Z' },
    pricingSides: { certificateSide: 'mid', moleculeSide: 'mid' },
  };

  const fullCustodyPack: CustodyPack = {
    go: {
      registry: 'Enagás GTS',
      issuingCountry: 'ES',
      seriesNumber: 'ES-2027-001',
      issueDate: '2027-04-10',
      productionStart: '2027-03-01',
      productionEnd: '2027-03-31',
      energyMWh: 1000,
      energyBasis: 'HHV',
      supportType: 'NONE',
      gridInjected: true,
    },
    pos: {
      posNumber: 'POS-ES-2027-99',
      udbNumber: null,
      scheme: 'ISCC_EU',
      feedstock: 'Animal manure',
      feedstockOriginCountry: 'ES',
      feedstockShares: [{ feedstock: 'Animal manure', pctOfReduction: 100 }],
      ciTotal: -40,
      ciSteps: null,
      supportDeclared: 'NONE',
      mwh: 900, // 1000 * 0.90
    },
    claims: {
      notUsedElsewhere: true,
      prtrGrant: 'NONE',
      prtrLegalCheckDone: true,
      ownTraderCertified: true,
      counterpartyCertified: true,
    },
    structure: 'BUNDLE_AT_ORIGIN',
    plannedBookingDate: '2027-10-01',
  };

  const esManureGgeConsignment: Consignment = {
    ...REFERENCE_CONSIGNMENTS.DANISH_MANURE,
    id: 'es_manure_gge_golden',
    name: 'Spanish Manure Benchmark',
    originCountry: 'ES',
    originCountryName: 'Spain',
    injectionCountry: 'ES',
    injectionIsEU: true,
    certificationScheme: 'ISCC_EU',
    chainOfCustody: 'MASS_BALANCE',
    feedstock: 'manure',
    carbonIntensity: -40,
    volumeMWh: 1000,
    deliveryPeriod: {
      type: 'CALENDAR',
      startDate: '2027-03-01',
      endDate: '2027-03-31',
      complianceYear: 2027,
    },
    custody: fullCustodyPack,
  };

  describe('§6 Golden Example Verification', () => {
    it('matches trade spec §6 numbers exactly: 388,800 GGE, €174,960 at €0.45, 150% saving, deadline 2028-03-31', () => {
      const market = getMarketById('NL_GGE')!;
      expect(market.fossilComparatorGCo2eMj).toBe(80);
      expect(getLhvFactorForOrigin('ES')).toBe(0.9);

      // Valuation through the engine: (80 − (−40)) × 3.6 × 0.90 = 388.8 GGE per GO MWh, × €0.45 = €174.96/MWh
      const netback = computeNetback(market, esManureGgeConsignment, ggeMarks, emptyCosts, 'mid');
      const cv = netback.certificateValue!;
      expect(cv.unitConversion).toContain('= 388.8 GGE per GO MWh');
      expect(cv.valueEurPerMWh).toBe(174.96);
      const goMwh = esManureGgeConsignment.custody!.go!.energyMWh;
      expect(Math.round((cv.valueEurPerMWh! / 0.45) * goMwh)).toBe(388_800);
      expect(Math.round(cv.valueEurPerMWh! * goMwh)).toBe(174_960);

      // Saving and deadline through the Chain-of-custody checklist
      const coc = evaluateEligibility(esManureGgeConsignment, market).gates.find(g => g.gate === 'CHAIN_OF_CUSTODY')!;
      expect(coc.checklist!.find(i => i.id === 'ghg-saving')!.detail).toContain('= 150%');
      expect(ggeEffectiveBookingDeadline('2027-03-31', 2027)).toBe('2028-03-31');
      expect(coc.checklist!.find(i => i.id === 'booking-deadlines')!.detail).toContain('effective deadline 2028-03-31');
      // Production ending late in the year: the 1 May Y+1 booking window binds first
      expect(ggeEffectiveBookingDeadline('2027-12-31', 2027)).toBe('2028-05-01');
    });
  });

  describe('§5 Chain of Custody Gate Checks', () => {
    const market = getMarketById('NL_GGE')!;

    it('ES manure -> NL_GGE, fully filled -> PASS', () => {
      const assessment = evaluateEligibility(esManureGgeConsignment, market);
      const cocGate = assessment.gates.find(g => g.gate === 'CHAIN_OF_CUSTODY')!;
      expect(cocGate).toBeDefined();
      expect(cocGate.verdict).toBe('PASS');
      expect(cocGate.checklist).toHaveLength(11);
    });

    it('DK -> NL_GGE -> HARD_BLOCK on the GO route', () => {
      const dkConsignment: Consignment = {
        ...esManureGgeConsignment,
        originCountry: 'DK',
        injectionCountry: 'DK',
      };
      const assessment = evaluateEligibility(dkConsignment, market);
      expect(assessment.overallVerdict).toBe('HARD_BLOCK');
      expect(assessment.blockingGate).toBe('CHAIN_OF_CUSTODY');
      const cocGate = assessment.gates.find(g => g.gate === 'CHAIN_OF_CUSTODY')!;
      const goRouteItem = cocGate.checklist?.find(i => i.id === 'go-route-nl');
      expect(goRouteItem?.status).toBe('FAIL');
    });

    it('DE -> NL_GGE -> HARD_BLOCK on the GO route', () => {
      const deConsignment: Consignment = {
        ...esManureGgeConsignment,
        originCountry: 'DE',
        injectionCountry: 'DE',
      };
      const assessment = evaluateEligibility(deConsignment, market);
      expect(assessment.overallVerdict).toBe('HARD_BLOCK');
      expect(assessment.blockingGate).toBe('CHAIN_OF_CUSTODY');
      const cocGate = assessment.gates.find(g => g.gate === 'CHAIN_OF_CUSTODY')!;
      const goRouteItem = cocGate.checklist?.find(i => i.id === 'go-route-nl');
      expect(goRouteItem?.status).toBe('FAIL');
    });

    it('ES with OPERATING aid -> HARD_BLOCK', () => {
      const opAidConsignment: Consignment = {
        ...esManureGgeConsignment,
        custody: {
          ...fullCustodyPack,
          go: {
            ...fullCustodyPack.go!,
            supportType: 'OPERATING',
          },
        },
      };
      const assessment = evaluateEligibility(opAidConsignment, market);
      expect(assessment.overallVerdict).toBe('HARD_BLOCK');
      expect(assessment.blockingGate).toBe('CHAIN_OF_CUSTODY');
      const cocGate = assessment.gates.find(g => g.gate === 'CHAIN_OF_CUSTODY')!;
      const aidItem = cocGate.checklist?.find(i => i.id === 'no-operating-aid');
      expect(aidItem?.status).toBe('FAIL');
    });

    it('ES PRTR without the legal check -> CONDITIONAL', () => {
      const prtrConsignment: Consignment = {
        ...esManureGgeConsignment,
        custody: {
          ...fullCustodyPack,
          claims: {
            ...fullCustodyPack.claims,
            prtrGrant: 'YES',
            prtrLegalCheckDone: false,
          },
        },
      };
      const assessment = evaluateEligibility(prtrConsignment, market);
      const cocGate = assessment.gates.find(g => g.gate === 'CHAIN_OF_CUSTODY')!;
      expect(cocGate.verdict).toBe('CONDITIONAL');
      const prtrItem = cocGate.checklist?.find(i => i.id === 'spanish-prtr-grant');
      expect(prtrItem?.status).toBe('WARN');
    });

    it('ES -> DE_THG -> follows the PoS route', () => {
      const deThgMarket = getMarketById('DE_THG')!;
      const assessment = evaluateEligibility(esManureGgeConsignment, deThgMarket);
      const cocGate = assessment.gates.find(g => g.gate === 'CHAIN_OF_CUSTODY')!;
      const posItem = cocGate.checklist?.find(i => i.id === 'cross-border-pos');
      expect(posItem).toBeDefined();
      expect(['PASS', 'WARN']).toContain(posItem?.status);
      expect(posItem?.citations.length).toBeGreaterThan(0);
    });

    it('an old deal with no custody -> CONDITIONAL with TODOs, not a crash', () => {
      const oldConsignment: Consignment = {
        ...esManureGgeConsignment,
        custody: null,
      };
      const assessment = evaluateEligibility(oldConsignment, market);
      expect(assessment.overallVerdict).toBe('CONDITIONAL');
      const cocGate = assessment.gates.find(g => g.gate === 'CHAIN_OF_CUSTODY')!;
      expect(cocGate.verdict).toBe('CONDITIONAL');
      const todos = cocGate.checklist?.filter(i => i.status === 'TODO');
      expect(todos && todos.length > 0).toBe(true);
    });
  });

  describe('Valuation, marks and costs', () => {
    const gge = getMarketById('NL_GGE')!;

    it('NL_ERE still values on the 94 transport comparator; NL_GGE on 80 from the market field', () => {
      const ere = getMarketById('NL_ERE')!;
      expect(ere.fossilComparatorGCo2eMj).toBeUndefined();
      const ereMarks: MarksState = { ...ggeMarks, marks: { NL_ERE: { ...ggeMarks.marks.NL_GGE, marketId: 'NL_ERE', mid: 0.34 } } };
      const ereValue = computeCertificateValue(ere, esManureGgeConsignment, ereMarks, 'mid')!;
      expect(ereValue.valueEurPerMWh).toBeCloseTo(0.34 * (94 + 40) * 3.6, 6);
      expect(computeCertificateValue(gge, esManureGgeConsignment, ggeMarks, 'mid')!.unitConversion).toContain('(80 − (-40))');
    });

    it('warns (does not cap) when the mark is above the compliance year buy-out', () => {
      const high: MarksState = { ...ggeMarks, marks: { NL_GGE: { ...ggeMarks.marks.NL_GGE, mid: 0.5 } } };
      const cv = computeCertificateValue(gge, esManureGgeConsignment, high, 'mid')!;
      expect(cv.statusNote).toContain('mark above buy-out ceiling');
      expect(cv.valueEurPerMWh).toBeCloseTo(0.5 * 388.8, 6);
      expect(computeCertificateValue(gge, esManureGgeConsignment, ggeMarks, 'mid')!.statusNote ?? '').not.toContain('above buy-out');
    });

    it('the simulated GGE mark stays below the 2027 buy-out', () => {
      const m = simulateDesk().marks.marks.NL_GGE;
      expect(m.offer!).toBeLessThan(NL_GGE_BUYOUT_EUR_PER_TCO2E[2027] / 1000);
      expect(m.source).toBe('SIMULATED');
    });

    it('GO fees always apply for a Spanish GO; the hub spread only for structure B (delivered TTF)', () => {
      const a = ggeRouteCostLines(gge, esManureGgeConsignment).map(l => l.key);
      expect(a).toEqual(['cost.gge.enagasGoExport', 'cost.gge.verticerGoImport']);
      const b = ggeRouteCostLines(gge, { ...esManureGgeConsignment, custody: { ...fullCustodyPack, structure: 'BUNDLE_DELIVERED_TTF' } }).map(l => l.key);
      expect(b).toEqual(['cost.gge.enagasGoExport', 'cost.gge.verticerGoImport', 'cost.hubBasis.ES']);
      expect(ggeRouteCostLines(getMarketById('NL_ERE')!, esManureGgeConsignment)).toEqual([]);
    });

    it('NL_GGE is selectable for 2027 deals (EMERGING) but not before its start year', () => {
      expect(gge.status).toBe('EMERGING');
      const ms = (year: number) => evaluateEligibility(
        { ...esManureGgeConsignment, deliveryPeriod: { ...esManureGgeConsignment.deliveryPeriod!, complianceYear: year } }, gge,
      ).gates.find(g => g.gate === 'MARKET_SPECIFIC')!.verdict;
      expect(ms(2027)).toBe('PASS');
      expect(ms(2026)).toBe('UNKNOWN');
    });
  });

  describe('Checklist shape', () => {
    it('NL_GGE carries the 11 spec items; book-and-claim fails the pairing item', () => {
      const coc = evaluateEligibility(esManureGgeConsignment, getMarketById('NL_GGE')!).gates.find(g => g.gate === 'CHAIN_OF_CUSTODY')!;
      expect(coc.checklist!.map(i => i.id)).toEqual([
        'origin-eu-eea', 'go-route-nl', 'certified-chain', 'go-pos-pairing', 'no-operating-aid', 'spanish-prtr-grant',
        'ghg-saving', 'booking-deadlines', 'no-double-claim', 'udb-recording', 'legislative-status',
      ]);
      expect(coc.checklist!.find(i => i.id === 'legislative-status')!.status).toBe('WARN');
      const bc = evaluateEligibility({ ...esManureGgeConsignment, chainOfCustody: 'BOOK_AND_CLAIM' }, getMarketById('NL_GGE')!);
      expect(bc.gates.find(g => g.gate === 'CHAIN_OF_CUSTODY')!.checklist!.find(i => i.id === 'go-pos-pairing')!.status).toBe('FAIL');
    });

    it('a GO / PoS volume mismatch fails the pairing item', () => {
      const off = { ...esManureGgeConsignment, custody: { ...fullCustodyPack, pos: { ...fullCustodyPack.pos!, mwh: 1000 } } };
      const coc = evaluateEligibility(off, getMarketById('NL_GGE')!).gates.find(g => g.gate === 'CHAIN_OF_CUSTODY')!;
      expect(coc.verdict).toBe('HARD_BLOCK');
      expect(coc.checklist!.find(i => i.id === 'go-pos-pairing')!.status).toBe('FAIL');
    });

    it('ES -> DE_THG uses the PoS-only subset (no GO route, no GGE items)', () => {
      const coc = evaluateEligibility(esManureGgeConsignment, getMarketById('DE_THG')!).gates.find(g => g.gate === 'CHAIN_OF_CUSTODY')!;
      expect(coc.checklist!.map(i => i.id)).toEqual(['coc-model', 'origin', 'cross-border-pos', 'certified-chain', 'no-double-claim', 'udb-recording']);
    });
  });

  describe('Store migration', () => {
    it('a v14 desk loads: saved deals without custody still evaluate; NL GGE row and mark are added', () => {
      const fresh = createDefaultState();
      const legacy = {
        ...fresh,
        schemaVersion: 14,
        pricingBook: fresh.pricingBook.filter(r => r.id !== 'nl_gge'),
        marks: { ...fresh.marks, marks: Object.fromEntries(Object.entries(fresh.marks.marks).filter(([id]) => id !== 'NL_GGE')) },
        consignments: [REFERENCE_CONSIGNMENTS.DANISH_MANURE],
      };
      const migrated = migrateState(JSON.parse(JSON.stringify(legacy)));
      expect(migrated.pricingBook.some(r => r.id === 'nl_gge')).toBe(true);
      expect(migrated.marks.marks.NL_GGE?.mid).not.toBeNull();
      const deal = migrated.consignments[0];
      expect(deal.custody).toBeUndefined();
      const coc = evaluateEligibility(deal, getMarketById('NL_GGE')!).gates.find(g => g.gate === 'CHAIN_OF_CUSTODY')!;
      expect(coc.checklist!.filter(i => i.status === 'TODO').length).toBeGreaterThan(0);
    });
  });
});
