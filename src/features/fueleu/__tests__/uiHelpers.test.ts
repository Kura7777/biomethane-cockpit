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
