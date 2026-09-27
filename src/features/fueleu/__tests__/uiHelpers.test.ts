import { describe, it, expect } from 'vitest';
import {
  daysBetweenIsoDates,
  daysUntil,
  markAgeDays,
  isMarkStale,
  MARK_STALE_AFTER_DAYS,
  buildLinearScale,
  buildOrdinalPositions,
  buildLinePath,
  buildAreaPath,
  formatEurCompact,
  computeFuelEuKpis,
  computeFleetWeightedGhgie,
  scaleDivergingBarWidth,
  sortRows,
} from '../../../domain/fueleu/uiHelpers';

describe('daysBetweenIsoDates', () => {
  it('computes whole-day differences forward', () => {
    expect(daysBetweenIsoDates('2026-09-27', '2027-04-30')).toBe(215);
  });

  it('computes zero for the same date', () => {
    expect(daysBetweenIsoDates('2026-09-27', '2026-09-27')).toBe(0);
  });

  it('computes negative differences for a past date', () => {
    expect(daysBetweenIsoDates('2026-09-27', '2026-09-20')).toBe(-7);
  });
});

describe('daysUntil / markAgeDays', () => {
  it('daysUntil returns days from "now" to a future statutory deadline', () => {
    expect(daysUntil('2027-04-30', '2026-09-27')).toBe(215);
  });

  it('daysUntil is negative once the deadline has passed', () => {
    expect(daysUntil('2026-01-01', '2026-09-27')).toBeLessThan(0);
  });

  it('markAgeDays returns the age of a mark relative to now', () => {
    expect(markAgeDays('2026-09-16', '2026-09-27')).toBe(11);
  });

  it('isMarkStale flags marks older than MARK_STALE_AFTER_DAYS', () => {
    expect(isMarkStale('2026-09-16', '2026-09-27')).toBe(false); // 11 days old
    expect(isMarkStale('2026-08-01', '2026-09-27')).toBe(true); // >14 days old
    expect(MARK_STALE_AFTER_DAYS).toBe(14);
  });
});

describe('buildLinearScale', () => {
  it('maps domain endpoints to range endpoints', () => {
    const scale = buildLinearScale([0, 100], [10, 210]);
    expect(scale(0)).toBe(10);
    expect(scale(100)).toBe(210);
    expect(scale(50)).toBe(110);
  });

  it('handles a zero-span domain without dividing by zero', () => {
    const scale = buildLinearScale([5, 5], [0, 100]);
    expect(scale(5)).toBe(0);
  });
});

describe('buildOrdinalPositions', () => {
  it('evenly spaces N categories across the pixel range', () => {
    const positions = buildOrdinalPositions(7, [0, 600]);
    expect(positions).toHaveLength(7);
    expect(positions[0]).toBe(0);
    expect(positions[6]).toBe(600);
    expect(positions[1]).toBeCloseTo(100, 5);
  });

  it('returns a single position for a single category', () => {
    expect(buildOrdinalPositions(1, [0, 600])).toEqual([0]);
  });
});

describe('buildLinePath / buildAreaPath', () => {
  it('builds an SVG path with M for the first point and L for the rest', () => {
    const path = buildLinePath([{ x: 0, y: 0 }, { x: 10, y: 5 }, { x: 20, y: 2 }]);
    expect(path.startsWith('M0.00,0.00')).toBe(true);
    expect(path).toContain('L10.00,5.00');
    expect(path).toContain('L20.00,2.00');
  });

  it('returns an empty string for no points', () => {
    expect(buildLinePath([])).toBe('');
    expect(buildAreaPath([], 100)).toBe('');
  });

  it('closes the area path down to the baseline', () => {
    const path = buildAreaPath([{ x: 0, y: 10 }, { x: 10, y: 0 }], 50);
    expect(path).toContain('L10.00,50.00');
    expect(path).toContain('L0.00,50.00');
    expect(path.endsWith('Z')).toBe(true);
  });
});

describe('formatEurCompact', () => {
  it('formats with 2 decimals by default', () => {
    expect(formatEurCompact(108.6)).toBe('€108.60');
  });

  it('respects a custom decimal count', () => {
    expect(formatEurCompact(108.6, 0)).toBe('€109');
  });
});

describe('computeFuelEuKpis', () => {
  it('separates deficit and surplus groups and sums their balances/penalties', () => {
    const kpis = computeFuelEuKpis([
      { sumOfCompanyBalances2026: -100, sumOfCompanyPenalties2026: 1000 },
      { sumOfCompanyBalances2026: -50, sumOfCompanyPenalties2026: 500 },
      { sumOfCompanyBalances2026: 30, sumOfCompanyPenalties2026: 0 },
      { sumOfCompanyBalances2026: 0, sumOfCompanyPenalties2026: 0 },
    ]);
    expect(kpis.deficitTco2e).toBe(-150);
    expect(kpis.deficitPenaltyEur).toBe(1500);
    expect(kpis.deficitGroupCount).toBe(2);
    expect(kpis.surplusTco2e).toBe(30);
    expect(kpis.surplusGroupCount).toBe(1);
    expect(kpis.surplusCoverPct).toBeCloseTo(20, 5); // 30 / 150 * 100
  });

  it('returns 0% cover when there is no deficit', () => {
    const kpis = computeFuelEuKpis([{ sumOfCompanyBalances2026: 10, sumOfCompanyPenalties2026: 0 }]);
    expect(kpis.surplusCoverPct).toBe(0);
  });

  it('handles an empty list without dividing by zero', () => {
    const kpis = computeFuelEuKpis([]);
    expect(kpis).toEqual({
      deficitTco2e: 0,
      deficitPenaltyEur: 0,
      deficitGroupCount: 0,
      surplusTco2e: 0,
      surplusGroupCount: 0,
      surplusCoverPct: 0,
    });
  });
});

describe('computeFleetWeightedGhgie', () => {
  it('energy-weights achieved GHGIE across rows', () => {
    const ghgie = computeFleetWeightedGhgie([
      { total_energy_mwh: 100, actual_ghgie: 90 },
      { total_energy_mwh: 300, actual_ghgie: 100 },
    ]);
    // (100*90 + 300*100) / 400 = 97.5
    expect(ghgie).toBeCloseTo(97.5, 6);
  });

  it('ignores zero/negative-energy rows', () => {
    const ghgie = computeFleetWeightedGhgie([
      { total_energy_mwh: 0, actual_ghgie: 999 },
      { total_energy_mwh: 100, actual_ghgie: 90 },
    ]);
    expect(ghgie).toBe(90);
  });

  it('returns 0 for an empty or all-zero-energy input', () => {
    expect(computeFleetWeightedGhgie([])).toBe(0);
    expect(computeFleetWeightedGhgie([{ total_energy_mwh: 0, actual_ghgie: 90 }])).toBe(0);
  });
});

describe('scaleDivergingBarWidth', () => {
  it('scales magnitude proportionally to the page max, capped to maxWidthPx', () => {
    expect(scaleDivergingBarWidth(237.7, 237.7, 72)).toBeCloseTo(72, 6);
    expect(scaleDivergingBarWidth(118.85, 237.7, 72)).toBeCloseTo(36, 6);
    expect(scaleDivergingBarWidth(0, 237.7, 72)).toBe(0);
  });

  it('uses the absolute value of a negative magnitude', () => {
    expect(scaleDivergingBarWidth(-118.85, 237.7, 72)).toBeCloseTo(36, 6);
  });

  it('clamps a magnitude larger than the max to maxWidthPx', () => {
    expect(scaleDivergingBarWidth(500, 237.7, 72)).toBeCloseTo(72, 6);
  });

  it('returns 0 when maxMagnitude is 0', () => {
    expect(scaleDivergingBarWidth(50, 0, 72)).toBe(0);
  });
});

describe('sortRows', () => {
  it('sorts numerically ascending and descending without mutating the input', () => {
    const rows = [{ v: 3 }, { v: 1 }, { v: 2 }];
    const asc = sortRows(rows, r => r.v, 'asc');
    const desc = sortRows(rows, r => r.v, 'desc');
    expect(asc.map(r => r.v)).toEqual([1, 2, 3]);
    expect(desc.map(r => r.v)).toEqual([3, 2, 1]);
    expect(rows.map(r => r.v)).toEqual([3, 1, 2]); // original untouched
  });

  it('sorts strings via localeCompare', () => {
    const rows = [{ name: 'CMA CGM' }, { name: 'A.P. Moller-Maersk' }, { name: 'MSC' }];
    const asc = sortRows(rows, r => r.name, 'asc');
    expect(asc.map(r => r.name)).toEqual(['A.P. Moller-Maersk', 'CMA CGM', 'MSC']);
  });
});
