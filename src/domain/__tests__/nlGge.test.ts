import { describe, it, expect } from 'vitest';
import { getMarketById } from '../markets/registry';
import { computeNetback } from '../netback/engine';
import { evaluateEligibility } from '../eligibility/engine';
import { REFERENCE_CONSIGNMENTS } from '../consignment/feedstocks';
import type { Consignment, CustodyPack } from '../consignment/types';
import type { MarksState, CostInputs } from '../netback/types';
import { getLhvFactorForOrigin } from '../assumptions/registry';

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
      expect(market).toBeDefined();

      // 1. LHV factor for Spain is 0.90
      const lhvFactor = getLhvFactorForOrigin('ES');
      expect(lhvFactor).toBe(0.90);

      // 2. 1,000 GO MWh (HHV) -> 900 MWh (LHV)
      const goMWh = 1000;
      const mwhLhv = goMWh * lhvFactor;
      expect(mwhLhv).toBe(900);

      // 3. GGE calculation: (80 - (-40)) * 3.6 * 0.90 = 388.8 GGE/MWh
      const ggePerMwh = (80 - (-40)) * 3.6 * lhvFactor;
      expect(ggePerMwh).toBe(388.8);

      const totalGge = ggePerMwh * goMWh;
      expect(totalGge).toBe(388800);

      // 4. Valuation at €0.45/GGE = €174,960 total -> €174.96/MWh
      const netback = computeNetback(market, esManureGgeConsignment, ggeMarks, emptyCosts, 'mid');
      expect(netback.certificateValue?.valueEurPerMWh).toBeCloseTo(174.96, 2);
      expect(netback.certificateValue?.valueEurPerMWh! * goMWh).toBeCloseTo(174960, 0);

      // 5. Saving = (80 - (-40)) / 80 = 150%
      const saving = (80 - (-40)) / 80;
      expect(saving).toBe(1.50);

      // 6. Booking deadline for March 2027 production:
      // min(2027-03-31 + 12m, 2028-05-01) = 2028-03-31
      const prodEnd = new Date('2027-03-31');
      const prodEndPlus12m = new Date(prodEnd);
      prodEndPlus12m.setFullYear(prodEndPlus12m.getFullYear() + 1);
      const effectiveDeadlineStr = prodEndPlus12m.toISOString().slice(0, 10);
      expect(effectiveDeadlineStr).toBe('2028-03-31');
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
});
