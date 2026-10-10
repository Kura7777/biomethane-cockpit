import { describe, it, expect } from 'vitest';
import { getMarketById } from '../markets/registry';
import { computeNetback } from '../netback/engine';
import { evaluateEligibility } from '../eligibility/engine';
import { REFERENCE_CONSIGNMENTS } from '../consignment/feedstocks';
import { goBasisVolumeMwh } from '../consignment/custody';
import type { Consignment, CustodyPack } from '../consignment/types';
import type { CostInputs, MarksState } from '../netback/types';

const GGE = getMarketById('NL_GGE')!;
const costs: CostInputs = { transferCosts: null, certificationCosts: null, logistics: null, otherCosts: null };
const marks = {
  marks: { NL_GGE: { marketId: 'NL_GGE', bid: 0.44, offer: 0.46, mid: 0.45, updatedAt: '2026-10-09T00:00:00Z', source: 'Broker' } },
  gasIndex: { bid: 28, offer: 29, mid: 28.5, updatedAt: '2026-10-09T00:00:00Z' },
  fx: { gbpEur: 1.18, chfEur: 1.06, updatedAt: '2026-10-09T00:00:00Z' },
  pricingSides: { certificateSide: 'mid', moleculeSide: 'mid' },
} as unknown as MarksState;

// GO 1,000 MWh on HHV; the PoS states 900 MWh on LHV (1,000 × 0.90).
const pack: CustodyPack = {
  go: { registry: 'Enagás GTS', issuingCountry: 'ES', seriesNumber: 'ES-2027-001', issueDate: '2027-04-10', productionStart: '2027-03-01', productionEnd: '2027-03-31', energyMWh: 1000, energyBasis: 'HHV', supportType: 'NONE', gridInjected: true },
  pos: { posNumber: 'POS-1', udbNumber: null, scheme: 'ISCC_EU', feedstock: 'Animal manure', feedstockOriginCountry: 'ES', feedstockShares: [{ feedstock: 'Animal manure', pctOfReduction: 100 }], ciTotal: -40, ciSteps: null, supportDeclared: 'NONE', mwh: 900 },
  claims: { notUsedElsewhere: true, prtrGrant: 'NONE', prtrLegalCheckDone: true, ownTraderCertified: true, counterpartyCertified: true },
  structure: 'BUNDLE_AT_ORIGIN',
  plannedBookingDate: '2027-10-01',
};

const deal = (volumeMWh: number): Consignment => ({
  ...REFERENCE_CONSIGNMENTS.DANISH_MANURE,
  id: 'es_vol_basis',
  originCountry: 'ES',
  originCountryName: 'Spain',
  injectionCountry: 'ES',
  carbonIntensity: -40,
  volumeMWh,
  deliveryPeriod: { type: 'CALENDAR', startDate: '2027-03-01', endDate: '2027-03-31', complianceYear: 2027 },
  custody: pack,
});

describe('deal volume is on the GO basis (value is per GO MWh)', () => {
  it('notional is 1,000 × €/GO-MWh, not 900 ×, when the GO is 1,000 MWh HHV and the PoS 900 MWh LHV', () => {
    const perGoMwh = computeNetback(GGE, deal(1000), marks, costs, 'mid').certificateValue!.valueEurPerMWh!;
    expect(perGoMwh).toBe(174.96);

    const volume = goBasisVolumeMwh(GGE, pack)!;
    expect(volume).toBe(1000);
    expect(Math.round(volume * perGoMwh)).toBe(174_960);
    expect(Math.round(900 * perGoMwh)).not.toBe(174_960);
  });

  it('the pairing item WARNs when the deal volume is the PoS 900, and passes at the GO 1,000', () => {
    const pairing = (c: Consignment) =>
      evaluateEligibility(c, GGE).gates.find(g => g.gate === 'CHAIN_OF_CUSTODY')!.checklist!.find(i => i.id === 'go-pos-pairing')!;
    const off = pairing(deal(900));
    expect(off.status).toBe('WARN');
    expect(off.detail).toContain('differs from the GO');
    expect(pairing(deal(1000)).status).toBe('PASS');
  });
});
