import { describe, it, expect } from 'vitest';
import {
  projectStaticFleet,
  projectStaticFleetForCounterparties,
  STATIC_FLEET_PROJECTION_YEARS,
  FUELEU_VLSFO_WTW,
  penaltyEur,
  getFuelEUTargetIntensity,
  LHV_VLSFO_MJ_PER_TONNE,
} from '../fueleu/calculator';

// Fixed test fleet: pure VLSFO, no MGO/LNG, no scope discount — a conventional, always-deficit
// company (VLSFO's own WtW, 91.7442 gCO2e/MJ, is above every future FuelEU target, which only gets
// stricter, so this fleet never flips back to surplus at any of the 7 milestone years).
const FLEET = { vlsfoTonnes: 10000, mgoTonnes: 0, lngTonnes: 0 };

// Hand-derived arithmetic (see calculateVesselExposure):
//   totalEnergyMj = 10,000 t x 40,500 MJ/t (LHV_VLSFO_MJ_PER_TONNE) = 405,000,000 MJ
//   complianceBalanceTco2e = (target - 91.7441975308642) x totalEnergyMj / 1e6
const TOTAL_ENERGY_MJ = 10000 * LHV_VLSFO_MJ_PER_TONNE; // 405,000,000
function expectedBalance(targetYear: number): number {
  return ((getFuelEUTargetIntensity(targetYear) - FUELEU_VLSFO_WTW) * TOTAL_ENERGY_MJ) / 1_000_000;
}

describe('projectStaticFleet — static-fleet FuelEU compliance projection (Art. 23(2) escalation)', () => {
  it('returns exactly the 7 milestone years, in order', () => {
    const pts = projectStaticFleet(FLEET);
    expect(pts.map(p => p.year)).toEqual([...STATIC_FLEET_PROJECTION_YEARS]);
  });

  it('assume2025NonCompliant=true: n starts at 2 in 2026 and accrues by 1 every subsequent year, including through the unshown gap years (2030->6, 2035->11, 2040->16)', () => {
    const pts = projectStaticFleet({ ...FLEET, assume2025NonCompliant: true });
    // n(year) = year - 2024 while continuously non-compliant (2025 counted as the ship's 1st
    // non-compliant year, so 2026 is its 2nd): 2026->2, 2027->3, 2028->4, 2029->5, 2030->6,
    // (gap years 2031-2034 accrue 7,8,9,10 internally, not returned), 2035->11,
    // (gap years 2036-2039 accrue 12,13,14,15 internally), 2040->16.
    expect(pts.map(p => p.consecutiveN)).toEqual([2, 3, 4, 5, 6, 11, 16]);
    expect(pts.map(p => p.multiplier)).toEqual([1.1, 1.2, 1.3, 1.4, 1.5, 2.0, 2.5]);

    for (const p of pts) {
      const balance = expectedBalance(p.year);
      expect(p.targetGhgie).toBeCloseTo(getFuelEUTargetIntensity(p.year), 6);
      expect(p.complianceBalanceTco2e).toBeCloseTo(balance, 3);
      // Every milestone year is a deficit for this fleet (target only tightens over time).
      expect(p.complianceBalanceTco2e).toBeLessThan(0);
      expect(p.penaltyEur).toBeCloseTo(penaltyEur(balance, FUELEU_VLSFO_WTW, p.consecutiveN), 3);
    }
  });

  it('assume2025NonCompliant=false (default false path): n starts at 1 in 2026, so 2026-2040 is exactly one year behind the assume-true sequence', () => {
    const trueSeq = projectStaticFleet({ ...FLEET, assume2025NonCompliant: true });
    const falseSeq = projectStaticFleet({ ...FLEET, assume2025NonCompliant: false });
    expect(falseSeq.map(p => p.consecutiveN)).toEqual([1, 2, 3, 4, 5, 10, 15]);
    expect(falseSeq.map(p => p.consecutiveN)).toEqual(trueSeq.map(p => p.consecutiveN - 1));
    // Same balances (n doesn't affect the balance), lower penalties (lower multiplier) at every year.
    for (let i = 0; i < falseSeq.length; i++) {
      expect(falseSeq[i].complianceBalanceTco2e).toBeCloseTo(trueSeq[i].complianceBalanceTco2e, 6);
      expect(falseSeq[i].penaltyEur).toBeLessThan(trueSeq[i].penaltyEur);
    }
  });

  it('defaults assume2025NonCompliant to true when omitted', () => {
    const withDefault = projectStaticFleet(FLEET);
    const explicitTrue = projectStaticFleet({ ...FLEET, assume2025NonCompliant: true });
    expect(withDefault).toEqual(explicitTrue);
  });

  it('resets n to 0 (and the multiplier/penalty to 0) in a surplus year, then restarts at n=1 on the next deficit year', () => {
    // A dual-fuel LNG fleet whose 2026 GHGIE is below the 2026 target (surplus) but flips into
    // deficit once the target tightens far enough (2035 step) -- constructed so isOverCompliant
    // is true at 2026-2030 and false from 2035 on, exercising the reset-then-restart path.
    const lngFleet = { vlsfoTonnes: 0, mgoTonnes: 500, lngTonnes: 10000 };
    const pts = projectStaticFleet({ ...lngFleet, assume2025NonCompliant: false });
    const surplusPts = pts.filter(p => p.complianceBalanceTco2e >= 0);
    const deficitPts = pts.filter(p => p.complianceBalanceTco2e < 0);
    expect(surplusPts.length).toBeGreaterThan(0);
    expect(deficitPts.length).toBeGreaterThan(0);
    for (const p of surplusPts) {
      expect(p.consecutiveN).toBe(0);
      expect(p.multiplier).toBe(0);
      expect(p.penaltyEur).toBe(0);
    }
    // The first deficit year after at least one surplus year restarts the consecutive count at 1.
    const firstDeficitIndex = pts.findIndex(p => p.complianceBalanceTco2e < 0);
    expect(pts[firstDeficitIndex].consecutiveN).toBe(1);
  });
});

describe('projectStaticFleetForCounterparties — group projection sums member fleets point-wise', () => {
  it('a group of two identical member fleets is exactly 2x a single fleet, year by year', () => {
    const single = projectStaticFleet(FLEET);
    const group = projectStaticFleetForCounterparties([FLEET, FLEET]);

    expect(group.map(p => p.year)).toEqual(single.map(p => p.year));
    for (let i = 0; i < single.length; i++) {
      expect(group[i].complianceBalanceTco2e).toBeCloseTo(single[i].complianceBalanceTco2e * 2, 3);
      expect(group[i].penaltyEur).toBeCloseTo(single[i].penaltyEur * 2, 3);
    }
  });

  it('sums three heterogeneous member fleets point-wise (not by re-deriving a blended fleet)', () => {
    const a = { vlsfoTonnes: 10000, mgoTonnes: 0, lngTonnes: 0 };
    const b = { vlsfoTonnes: 5000, mgoTonnes: 500, lngTonnes: 0 };
    const c = { vlsfoTonnes: 0, mgoTonnes: 500, lngTonnes: 8000 };
    const [pa, pb, pc] = [projectStaticFleet(a), projectStaticFleet(b), projectStaticFleet(c)];
    const group = projectStaticFleetForCounterparties([a, b, c]);
    for (let i = 0; i < group.length; i++) {
      expect(group[i].complianceBalanceTco2e).toBeCloseTo(
        pa[i].complianceBalanceTco2e + pb[i].complianceBalanceTco2e + pc[i].complianceBalanceTco2e,
        3
      );
      expect(group[i].penaltyEur).toBeCloseTo(pa[i].penaltyEur + pb[i].penaltyEur + pc[i].penaltyEur, 3);
    }
  });

  it('returns an all-zero series for an empty group', () => {
    const group = projectStaticFleetForCounterparties([]);
    expect(group.map(p => p.year)).toEqual([...STATIC_FLEET_PROJECTION_YEARS]);
    for (const p of group) {
      expect(p.complianceBalanceTco2e).toBe(0);
      expect(p.penaltyEur).toBe(0);
    }
  });
});
