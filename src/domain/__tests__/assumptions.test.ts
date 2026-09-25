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
} from '../assumptions/registry';
import { calculateVesselExposure } from '../fueleu/calculator';
import { estimateFarmgateProcurementCost } from '../sourcing/benchmarks';
import { getBenchmarkForMarket } from '../markets/marketBenchmarks';

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

  it('FuelEU pool prices default to the FuelEU mark bid/offer, so the desk margin is the quoted spread', () => {
    const mark = getBenchmarkForMarket('FUELEU')!;
    expect(getAssumption('fueleu.poolBuyPriceEurPerTco2e')).toBe(mark.offerPrice);
    expect(getAssumption('fueleu.poolSellPriceEurPerTco2e')).toBe(mark.bidPrice);
    expect(fuelEuPoolSpreadEurPerTco2e()).toBe(mark.offerPrice - mark.bidPrice);
  });

  it('an override flows into the vessel calculator and a reset restores it', () => {
    const base = calculateVesselExposure(deficitVessel);
    const deficit = Math.abs(base.complianceBalanceTco2e);
    expect(base.poolingSavingsEur).toBeCloseTo(base.statutoryPenaltyY1Eur - deficit * getAssumption('fueleu.poolBuyPriceEurPerTco2e'), 2);

    setAssumption('fueleu.poolBuyPriceEurPerTco2e', 400);
    expect(isOverridden('fueleu.poolBuyPriceEurPerTco2e')).toBe(true);
    const bumped = calculateVesselExposure(deficitVessel);
    expect(bumped.poolingSavingsEur).toBeCloseTo(base.statutoryPenaltyY1Eur - deficit * 400, 2);

    setAssumption('fueleu.bioLngPremiumEurPerMwh', 80);
    const physical = calculateVesselExposure(deficitVessel);
    expect(physical.physicalSavingsEur).toBeCloseTo(Math.max(0, base.statutoryPenaltyY1Eur - base.bioLngRequiredNeg100Mwh * 80), 2);

    resetAssumption('fueleu.poolBuyPriceEurPerTco2e');
    expect(calculateVesselExposure(deficitVessel).poolingSavingsEur).toBeCloseTo(base.poolingSavingsEur, 6);
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
