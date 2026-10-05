import { describe, it, expect, afterEach } from 'vitest';
import {
  ASSUMPTION_DEFINITIONS,
  getAssumption,
  setAssumption,
  resetAssumption,
  resetAllAssumptions,
  isOverridden,
  subscribeAssumptions,
  getAssumptionsVersion,
  fuelEuPoolSpreadEurPerTco2e,
  fuelEuPoolBidPriceEurPerTco2e,
} from '../assumptions/registry';
import { calculateVesselExposure } from '../fueleu/calculator';
import { estimateFarmgateProcurementCost } from '../sourcing/benchmarks';
import { getBenchmarkForMarket } from '../markets/marketBenchmarks';

const poolPricesAt = (offer: number) => ({
  offerEurPerTco2e: offer,
  bidEurPerTco2e: fuelEuPoolBidPriceEurPerTco2e(offer),
  spreadEurPerTco2e: fuelEuPoolSpreadEurPerTco2e(offer),
});

const deficitVessel = {
  vlsfoTonnes: 20000,
  mgoTonnes: 0,
  lngTonnes: 0,
  bioLngTonnes: 0,
  bioLngCi: -100,
  targetYear: 2025 as const,
  consecutiveYearsNonCompliant: 1,
};

describe('Commercial assumptions register', () => {
  afterEach(() => resetAllAssumptions());

  it('documents every assumption: unique key, unit, source, basis and where it is used', () => {
    const keys = new Set<string>();
    for (const d of ASSUMPTION_DEFINITIONS) {
      expect(keys.has(d.key), d.key).toBe(false);
      keys.add(d.key);
      expect(d.unit, d.key).toBeTruthy();
      expect(d.source.length, d.key).toBeGreaterThan(10);
      expect(d.usedIn, d.key).toBeTruthy();
      expect(Number.isFinite(d.defaultValue), d.key).toBe(true);
    }
  });

  it('FuelEU pool offer is the FUELEU mark offer; the bid is that offer less the desk spread', () => {
    const mark = getBenchmarkForMarket('FUELEU')!;
    expect(fuelEuPoolBidPriceEurPerTco2e(mark.offerPrice)).toBe(mark.offerPrice - getAssumption('fueleu.poolDeskSpreadEurPerTco2e'));
    expect(fuelEuPoolSpreadEurPerTco2e(mark.offerPrice)).toBe(getAssumption('fueleu.poolDeskSpreadEurPerTco2e'));
    // Moving the spread moves the bid; an explicit bid override pins it.
    setAssumption('fueleu.poolDeskSpreadEurPerTco2e', 15);
    expect(fuelEuPoolBidPriceEurPerTco2e(mark.offerPrice)).toBe(mark.offerPrice - 15);
    setAssumption('fueleu.poolSellPriceEurPerTco2e', 90);
    expect(fuelEuPoolBidPriceEurPerTco2e(mark.offerPrice)).toBe(90);
  });

  it('the three FuelEU market prices are no longer assumptions: they come from the marks store', () => {
    const keys = new Set(ASSUMPTION_DEFINITIONS.map(d => d.key));
    expect(keys.has('fueleu.ttfGasIndexEurPerMwh')).toBe(false);
    expect(keys.has('fueleu.euaPriceEurPerTco2e')).toBe(false);
    expect(keys.has('fueleu.poolBuyPriceEurPerTco2e')).toBe(false);
    // Desk judgements stay in the register.
    expect(keys.has('fueleu.poolDeskSpreadEurPerTco2e')).toBe(true);
    expect(keys.has('fueleu.bioLngPremiumEurPerMwh')).toBe(true);
  });

  it('a pool-price change flows into the vessel calculator; with no pool prices the pooling figures are null', () => {
    const offer = 108.6;
    const base = calculateVesselExposure({ ...deficitVessel, poolPrices: poolPricesAt(offer) });
    const deficit = Math.abs(base.complianceBalanceTco2e);
    expect(base.poolingSavingsEur!).toBeCloseTo(base.statutoryPenaltyY1Eur - deficit * offer, 2);

    const bumped = calculateVesselExposure({ ...deficitVessel, poolPrices: poolPricesAt(400) });
    expect(bumped.poolingSavingsEur!).toBeCloseTo(Math.max(0, base.statutoryPenaltyY1Eur - deficit * 400), 2);

    setAssumption('fueleu.bioLngPremiumEurPerMwh', 80);
    const physical = calculateVesselExposure({ ...deficitVessel, poolPrices: poolPricesAt(offer) });
    expect(physical.physicalSavingsEur).toBeCloseTo(Math.max(0, base.statutoryPenaltyY1Eur - base.bioLngRequiredNeg100Mwh * 80), 2);

    const noMark = calculateVesselExposure(deficitVessel);
    expect(noMark.poolingSavingsEur).toBeNull();
    expect(noMark.poolingArrangementMarginEur).toBeNull();
    // Everything that does not depend on the pool is unchanged.
    expect(noMark.statutoryPenaltyY1Eur).toBe(base.statutoryPenaltyY1Eur);
  });

  it('farm-gate estimates read the register', () => {
    const before = estimateFarmgateProcurementCost('DE', 'manure', -85, 30);
    expect(before.estimatedCostEurMwh).toBe(getAssumption('farmgate.DE.fixedPriceEurPerMwh'));
    setAssumption('farmgate.DE.fixedPriceEurPerMwh', 95);
    expect(estimateFarmgateProcurementCost('DE', 'manure', -85, 30).estimatedCostEurMwh).toBe(95);

    // Unknown country falls back to the DEFAULT row
    setAssumption('farmgate.DEFAULT.premiumEurPerMwh', 30);
    expect(estimateFarmgateProcurementCost('PL', 'food_waste', 14, 30).estimatedCostEurMwh).toBe(60);
  });

  it('clamps to documented bounds, drops overrides equal to the default, and notifies subscribers', () => {
    let calls = 0;
    const unsubscribe = subscribeAssumptions(() => calls++);
    const v0 = getAssumptionsVersion();

    setAssumption('scanner.loadHoursPerYear', 99999);
    expect(getAssumption('scanner.loadHoursPerYear')).toBe(8784);
    setAssumption('fueleu.bioLngPremiumEurPerMwh', -5);
    expect(getAssumption('fueleu.bioLngPremiumEurPerMwh')).toBe(0);

    setAssumption('scanner.loadHoursPerYear', 8000);
    expect(isOverridden('scanner.loadHoursPerYear')).toBe(false);

    expect(calls).toBe(3);
    expect(getAssumptionsVersion()).toBe(v0 + 3);
    unsubscribe();
  });

  it('rejects unknown keys rather than silently returning a number', () => {
    expect(() => getAssumption('fueleu.madeUp')).toThrow();
    expect(() => setAssumption('fueleu.madeUp', 1)).toThrow();
  });
});
