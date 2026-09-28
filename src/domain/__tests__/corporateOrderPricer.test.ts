import { describe, it, expect } from 'vitest';
import { priceCorporateOrder, buildSupplyBook, CorporateOrderSpec } from '../corporate/orderPricer';
import { BrokerOrderEntry } from '../markets/brokerRuns';
import { MarksState } from '../netback/types';
import { CLEAN_HEAT_PROGRAM_LEADS } from '../ets2/companies';

const marks = (gbpEur: number | null): MarksState => ({
  marks: {
    DE_THG: { marketId: 'DE_THG', bid: 280, offer: 290, mid: 285, updatedAt: '2026-09-28', source: 'test' },
    NL_ERE: { marketId: 'NL_ERE', bid: 0.33, offer: 0.35, mid: 0.34, updatedAt: '2026-09-28', source: 'test' },
  },
  gasIndex: { bid: 30, offer: 30, mid: 30, updatedAt: null },
  fx: { gbpEur, chfEur: null, updatedAt: null },
  pricingSides: { certificateSide: 'bid', moleculeSide: 'bid' },
});

const line = (over: Partial<BrokerOrderEntry>): BrokerOrderEntry => ({
  id: 'x', country: 'NL', class: 'GO', feedstock: 'Waste', vintage: '2026', certified: 'Certified',
  subsidized: 'Subsidised', ciScore: '<20', ciNumeric: 20, currency: 'EUR',
  bidPrice: null, offerPrice: 30, bidVolumeGWh: null, offerVolumeGWh: 10, ...over,
});

const book: BrokerOrderEntry[] = [
  line({ id: 'a', offerPrice: 20, subsidized: 'Subsidised', certified: 'Uncertified', ciNumeric: null, offerVolumeGWh: 10 }),
  line({ id: 'b', offerPrice: 30, subsidized: 'Subsidised', ciNumeric: 0, offerVolumeGWh: 10 }),
  line({ id: 'c', offerPrice: 50, subsidized: 'Unsubsidised', ciNumeric: 0, offerVolumeGWh: 25 }),
  line({ id: 'd', country: 'UK', class: 'RGGO', currency: 'GBP', offerPrice: 20, offerVolumeGWh: 10 }),
  line({ id: 'e', country: 'DE', feedstock: 'Manure + Physical Gas', offerPrice: 148, subsidized: 'Unsubsidised', ciNumeric: -92 }),
];

const spec = (over: Partial<CorporateOrderSpec> = {}): CorporateOrderSpec => ({
  volumeMWh: 10_000, form: 'GO_ONLY', countries: [], vintageYear: null, maxCi: null,
  unsubsidisedOnly: false, excludeCrops: false, claim: 'SCOPE1_VOLUNTARY', ...over,
});

const costs = { transferCostEurPerMWh: 1, marginEurPerMWh: 2 };

describe('corporate order pricer', () => {
  it('leaves GBP offers out when the desk has no GBP/EUR rate, and converts them when it does', () => {
    expect(buildSupplyBook(marks(null), book).some(l => l.entry.id === 'd')).toBe(false);
    const withFx = buildSupplyBook(marks(1.2), book).find(l => l.entry.id === 'd')!;
    expect(withFx.offerEurPerMWh).toBeCloseTo(24, 6);
  });

  it('prices the cheapest offer that meets the spec and adds costs and margin', () => {
    const q = priceCorporateOrder(spec(), costs, marks(null), book);
    expect(q.ctd.averageCostEurPerMWh).toBe(20);
    expect(q.offerEurPerMWh).toBe(23);
    expect(q.annualValueEur).toBe(230_000);
  });

  it('keeps physical bundles out of certificate-only requests', () => {
    const q = priceCorporateOrder(spec({ volumeMWh: 100_000 }), costs, marks(null), book);
    expect(q.ctd.eligible.some(l => l.entry.id === 'e')).toBe(false);
  });

  it('shows what each requirement adds', () => {
    const q = priceCorporateOrder(spec({ form: 'GO_PLUS_POS', unsubsidisedOnly: true }), costs, marks(null), book);
    const labels = q.ladder.map(s => s.label);
    expect(labels[0]).toBe('Any biomethane GO');
    const unsub = q.ladder.find(s => s.label === 'Unsubsidised')!;
    expect(unsub.averageCostEurPerMWh).toBe(50);
    expect(unsub.deltaEurPerMWh).toBe(30);
  });

  it('volume-weights across offers when one is not enough', () => {
    const q = priceCorporateOrder(spec({ volumeMWh: 15_000, form: 'GO_PLUS_POS' }), costs, marks(null), book);
    // 10,000 MWh at 30 + 5,000 MWh at 50
    expect(q.ctd.averageCostEurPerMWh).toBeCloseTo((10_000 * 30 + 5_000 * 50) / 15_000, 6);
  });

  it('warns when compliance buyers would pay more than the voluntary offer', () => {
    const q = priceCorporateOrder(spec({ form: 'GO_PLUS_POS', unsubsidisedOnly: true, maxCi: 0 }), costs, marks(null), book);
    expect(q.complianceFloors.length).toBeGreaterThan(0);
    expect(q.warnings.some(w => w.startsWith('Compliance floor'))).toBe(true);
  });

  it('does not quote until costs and margin are entered', () => {
    const q = priceCorporateOrder(spec(), { transferCostEurPerMWh: null, marginEurPerMWh: null }, marks(null), book);
    expect(q.offerEurPerMWh).toBeNull();
    expect(q.missingInputs).toEqual(['transfer & cancellation cost', 'desk margin']);
  });

  it('flags an ETS1 claim on a bare GO', () => {
    const q = priceCorporateOrder(spec({ claim: 'EU_ETS1' }), costs, marks(null), book);
    expect(q.warnings.some(w => w.includes('EU ETS1 claim'))).toBe(true);
  });
});

describe('Clean Heat Program leads', () => {
  it('sources every lead', () => {
    for (const l of CLEAN_HEAT_PROGRAM_LEADS) {
      expect(l.role).toBe('EXPOSED_END_USER');
      expect(l.evidence.length, l.name).toBeGreaterThan(0);
    }
  });
});
