import { describe, it, expect } from 'vitest';
import { parseTenorSortKey, sortQuotesChronologically } from '../marksSort';
import { PricingBookEntry } from '../../../domain/markets/brokerRun.seed';

const TODAY = new Date(2026, 9, 16); // 16 Oct 2026
const k = (s: string, t: Date = TODAY) => parseTenorSortKey(s, t);

function sortLabels(labels: string[], t: Date = TODAY): string[] {
  return [...labels].sort((a, b) => {
    const ka = k(a, t);
    const kb = k(b, t);
    if (ka === kb) return 0;
    if (ka === Infinity) return 1;
    if (kb === Infinity) return -1;
    return ka - kb;
  });
}

describe('parseTenorSortKey - canonical contract', () => {
  it('Spot < BoM < M+1 < M+2', () => {
    expect(k('Spot')).toBeLessThan(k('BoM'));
    expect(k('BoM')).toBeLessThan(k('M+1'));
    expect(k('M+1')).toBeLessThan(k('M+2'));
  });

  it('M+n resolves against today and rolls with the year', () => {
    expect(k('M+1')).toBe(k('Nov 2026'));
    expect(k('M+3')).toBe(k('Jan 2027'));
    expect(k('M+1', new Date(2027, 11, 5))).toBe(k('Jan 2028'));
    expect(k('M+3', new Date(2028, 0, 1))).toBe(k('Apr 2028'));
  });

  it('BoM is the current month, not the end of the year', () => {
    expect(k('BoM')).toBeLessThan(k('Nov 2026'));
    expect(k('BoM')).toBeLessThan(k('Cal 2027'));
  });

  it('months are months, not calendar years', () => {
    expect(k('Sep 2026')).toBeLessThan(k('Jan 2027'));
    expect(k('Jan 2027')).toBeLessThan(k('Cal 2028'));
    expect(k('Apr-26')).toBe(k('Apr 2026'));
    expect(k('January 2027')).toBe(k('Jan 2027'));
    expect(k('Jan27')).toBe(k('Jan 2027'));
    expect(k('Jan-27')).toBe(k('Jan 2027'));
  });

  it('collisions: H1/Q1, H2/Q3, Cal/H2 are all distinct and ordered', () => {
    expect(k('Jan 2027')).toBeLessThan(k('Q1 2027'));
    expect(k('Q1 2027')).toBeLessThan(k('H1 2027'));
    expect(k('H1 2027')).toBeLessThan(k('Cal 2027'));
    expect(k('Q3 2027')).toBeLessThan(k('H2 2027'));
    expect(k('H2 2027')).toBeGreaterThan(k('Cal 2027'));
    expect(k('Q2 2027')).toBeLessThan(k('Sum 2027'));
    expect(k('Sum 2027')).toBeLessThan(k('Q3 2027'));
    expect(k('Q4 2026')).toBeLessThan(k('Win 2026'));
    expect(k('Win 2026')).toBeLessThan(k('Jan 2027'));
  });

  it('seasons: Win = Oct-Mar, Sum = Apr-Sep, not tied to Cal', () => {
    expect(k('Sum 2027')).toBeGreaterThan(k('Cal 2027'));
    expect(k('Win 2026')).toBeLessThan(k('Cal 2027'));
    expect(k('Win26')).toBe(k('Win 2026'));
    expect(k('W26')).toBe(k('Win 2026'));
    expect(k('Sum27')).toBe(k('Sum 2027'));
    expect(k('S27')).toBe(k('Sum 2027'));
  });

  it('variants map to the same key', () => {
    expect(k('Cal27')).toBe(k('Cal 2027'));
    expect(k('Cal-27')).toBe(k('Cal 2027'));
    expect(k('CAL 27')).toBe(k('Cal 2027'));
    expect(k('2027')).toBe(k('Cal 2027'));
    expect(k('Q1-27')).toBe(k('Q1 2027'));
    expect(k('Q1 27')).toBe(k('Q1 2027'));
    expect(k('1Q27')).toBe(k('Q1 2027'));
    expect(k('H2-27')).toBe(k('H2 2027'));
    expect(k('h1 2027')).toBe(k('H1 2027'));
  });

  it('Cal 2045 is a real year, not a fallback', () => {
    expect(k('Cal 2045')).toBeGreaterThan(k('Cal 2030'));
    expect(k('Cal 2045')).toBeLessThan(Infinity);
  });

  it('unknown labels return Infinity', () => {
    for (const bad of ['—', '', 'Q1', 'garbage', 'Cal', '12', null, undefined]) {
      expect(parseTenorSortKey(bad as string, TODAY)).toBe(Infinity);
    }
  });

  it('full chronological order of a mixed strip', () => {
    const labels = ['Cal 2028', 'Win 2026', 'H2 2027', 'Sum 2027', 'Q1 2027', 'Cal 2027', 'H1 2027', 'Jan 2027', 'M+1', 'BoM', 'Spot'];
    expect(sortLabels(labels)).toEqual([
      'Spot', 'BoM', 'Win 2026', 'M+1', 'Jan 2027', 'Q1 2027', 'H1 2027', 'Cal 2027', 'Sum 2027', 'H2 2027', 'Cal 2028',
    ]);
  });
});

describe('sortQuotesChronologically - unknown tenors', () => {
  const row = (id: string, vintage: string, country = 'DE') =>
    ({ id, vintage, country, class: 'THG' }) as unknown as PricingBookEntry;

  it('keeps unknown tenors last in input order, both directions', () => {
    const rows = [row('a', '—', 'UK'), row('b', 'Cal 2028'), row('c', 'junk', 'AT'), row('d', 'Cal 2027')];
    expect(sortQuotesChronologically(rows, 'tenor', 'asc').map(r => r.id)).toEqual(['d', 'b', 'a', 'c']);
    expect(sortQuotesChronologically(rows, 'tenor', 'desc').map(r => r.id)).toEqual(['b', 'd', 'a', 'c']);
  });
});
