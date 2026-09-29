import { describe, it, expect } from 'vitest';
import { computeValueStack, ValueStackInputs } from '../valueStack/engine';
import { ETS_NATURAL_GAS_TCO2_PER_MWH, computeCertificateValue } from '../netback/engine';
import { HHV_TO_LHV_FACTOR } from '../offtake/engine';
import { getMarketById } from '../markets/registry';
import { MarksState } from '../netback/types';

const mark = (id: string, mid: number) => ({ marketId: id, bid: mid, offer: mid, mid, updatedAt: null, source: 'test' });
const marks: MarksState = {
  marks: {
    EU_ETS1: mark('EU_ETS1', 70),
    EU_ETS2: mark('EU_ETS2', 50),
    FUELEU: mark('FUELEU', 250),
    DE_THG: mark('DE_THG', 280),
  },
  gasIndex: { bid: null, offer: null, mid: null, updatedAt: null },
  fx: { gbpEur: null, chfEur: null, updatedAt: null },
  pricingSides: { certificateSide: 'mid', moleculeSide: 'mid' },
};

const base = (over: Partial<ValueStackInputs>): ValueStackInputs => ({
  client: 'SHIP_OPERATOR', volumeMWh: 10_000, carbonIntensity: -100, deliveryYear: 2026,
  intraEuShare: null, smallSiteShare: null, ets2PassThrough: null, greenTariffPremiumEurPerMWh: null,
  offerPremiumEurPerMWh: null, ...over,
});

const row = (r: ReturnType<typeof computeValueStack>, regime: string) => r.rows.find(x => x.regime.startsWith(regime))!;

describe('value stack', () => {
  it('ship: FuelEU (pricing authority) + ETS maritime with voyage coverage', () => {
    const r = computeValueStack(base({ intraEuShare: 0.6 }), marks);
    const fueleu = computeCertificateValue(getMarketById('FUELEU')!, { ...({} as any), carbonIntensity: -100, feedstock: 'manure', annexClassification: 'IX_A' }, marks, 'mid')!.valueEurPerMWh!;
    expect(row(r, 'FuelEU').eurPerMWh).toBeCloseTo(fueleu, 6);
    // 60% intra-EU at 100% + 40% at 50% = 80% coverage
    expect(row(r, 'EU ETS (maritime)').eurPerMWh).toBeCloseTo(70 * ETS_NATURAL_GAS_TCO2_PER_MWH * 0.8, 6);
    expect(r.stackEurPerMWh).toBeCloseTo(fueleu + 70 * ETS_NATURAL_GAS_TCO2_PER_MWH * 0.8, 6);
    expect(r.stackAnnualEur).toBeCloseTo((r.stackEurPerMWh as number) * 10_000, 6);
  });

  it('ETS1 site: ETS1 counts now; ETS2 at small sites only from 2028', () => {
    const inputs = base({ client: 'ETS1_SITE', smallSiteShare: 0.2, ets2PassThrough: 1 });
    // Only the 80% burned at ETS1 installations earns the ETS1 saving; the 20% at small sites earns ETS2.
    const ets1 = 70 * ETS_NATURAL_GAS_TCO2_PER_MWH * HHV_TO_LHV_FACTOR * 0.8;
    const ets2 = 50 * ETS_NATURAL_GAS_TCO2_PER_MWH * HHV_TO_LHV_FACTOR * 0.2;
    const r2026 = computeValueStack(inputs, marks);
    expect(row(r2026, 'EU ETS1').eurPerMWh).toBeCloseTo(ets1, 6);
    expect(r2026.stackEurPerMWh).toBeCloseTo(ets1, 6);
    const r2028 = computeValueStack({ ...inputs, deliveryYear: 2028 }, marks);
    expect(r2028.stackEurPerMWh).toBeCloseTo(ets1 + ets2, 6);
    expect(r2028.guardrails.join(' ')).toMatch(/outside ETS2/);
  });

  it('ETS1 site: never credits the same MWh under both ETS1 and ETS2', () => {
    const all = computeValueStack(base({ client: 'ETS1_SITE', deliveryYear: 2028, smallSiteShare: 1, ets2PassThrough: 1 }), marks);
    expect(row(all, 'EU ETS1').eurPerMWh).toBe(0);
    const none = computeValueStack(base({ client: 'ETS1_SITE', deliveryYear: 2028, smallSiteShare: 0, ets2PassThrough: 1 }), marks);
    expect(row(none, 'ETS2 at').eurPerMWh).toBe(0);
  });

  it('ETS1 site with no small sites: pass-through is not needed and the stack prices', () => {
    const r = computeValueStack(base({ client: 'ETS1_SITE', deliveryYear: 2028, smallSiteShare: 0, ets2PassThrough: null }), marks);
    expect(r.missingInputs).toEqual([]);
    expect(row(r, 'ETS2 at').eurPerMWh).toBe(0);
    expect(r.stackEurPerMWh).toBeCloseTo(70 * ETS_NATURAL_GAS_TCO2_PER_MWH * HHV_TO_LHV_FACTOR, 6);
    const some = computeValueStack(base({ client: 'ETS1_SITE', smallSiteShare: 0.1, ets2PassThrough: null }), marks);
    expect(some.missingInputs).toContain('ETS2 pass-through');
  });

  it('ship: EU ETS maritime applies the 40% / 70% / 100% phase-in by delivery year', () => {
    const ets = (y: number) => row(computeValueStack(base({ deliveryYear: y, intraEuShare: 1 }), marks), 'EU ETS (maritime)').eurPerMWh as number;
    expect(ets(2025) / ets(2026)).toBeCloseTo(0.7, 9);
    expect(ets(2024) / ets(2026)).toBeCloseTo(0.4, 9);
    expect(ets(2030)).toBeCloseTo(ets(2026), 9);
  });

  it('ETS2 supplier: allowance saving from 2028 plus the green tariff', () => {
    const r = computeValueStack(base({ client: 'ETS2_SUPPLIER', deliveryYear: 2028, greenTariffPremiumEurPerMWh: 4 }), marks);
    expect(r.stackEurPerMWh).toBeCloseTo(50 * ETS_NATURAL_GAS_TCO2_PER_MWH * HHV_TO_LHV_FACTOR + 4, 6);
  });

  it('German fuel supplier: THG counts; the fuel carbon price stays out of the total until verified', () => {
    const r = computeValueStack(base({ client: 'DE_FUEL_SUPPLIER' }), marks);
    expect(row(r, 'German THG').status).toBe('COUNTS');
    expect(row(r, 'Carbon price on fuel').status).toBe('TO_VERIFY');
    expect(r.stackEurPerMWh).toBeCloseTo(row(r, 'German THG').eurPerMWh as number, 6);
  });

  it('German fuel supplier: no THG value above the RED III transport threshold', () => {
    const r = computeValueStack(base({ client: 'DE_FUEL_SUPPLIER', carbonIntensity: 40 }), marks);
    expect(row(r, 'German THG').eurPerMWh).toBeNull();
  });

  it('shows the client net of your offer premium', () => {
    const r = computeValueStack(base({ client: 'ETS2_SUPPLIER', deliveryYear: 2028, greenTariffPremiumEurPerMWh: 4, offerPremiumEurPerMWh: 10 }), marks);
    expect(r.clientNetEurPerMWh).toBeCloseTo((r.stackEurPerMWh as number) - 10, 6);
  });

  it('gives no total while a counted row is missing a price', () => {
    const r = computeValueStack(base({ intraEuShare: null }), marks);
    expect(r.stackEurPerMWh).toBeNull();
    expect(r.missingInputs).toContain('share burned on intra-EU voyages');
  });
});
