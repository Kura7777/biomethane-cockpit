import { describe, it, expect } from 'vitest';
import { formatClock } from '../Header';

describe('formatClock', () => {
  it('pads single-digit hours, minutes, and seconds with a leading zero', () => {
    expect(formatClock(new Date(2026, 7, 19, 3, 5, 9))).toBe('03:05:09');
  });

  it('formats midnight as 00:00:00', () => {
    expect(formatClock(new Date(2026, 7, 19, 0, 0, 0))).toBe('00:00:00');
  });

  it('formats the last second of the day as 23:59:59', () => {
    expect(formatClock(new Date(2026, 7, 19, 23, 59, 59))).toBe('23:59:59');
  });
});
