import { describe, it, expect } from 'vitest';
import { parseTenorSortKey, sortQuotesChronologically } from '../marksSort';
import { PricingBookEntry } from '../../../domain/markets/brokerRun.seed';

describe('marksSort (chronological tenor sorting, legacy behaviour)', () => {
  const today = new Date(2026, 9, 16);
  it('maps vintage strings to ascending chronological keys', () => {
    const k = (s: string) => parseTenorSortKey(s, today);
    expect(k('Prompt')).toBe(k('Spot'));
    expect(k('M+2')).toBeGreaterThan(k('M+1'));
    expect(k('H1 2025')).toBeLessThan(k('Spot'));
    expect(k('2025')).toBeLessThan(k('2026'));
    expect(k('H1 2026')).toBeLessThan(k('H2 2026'));
    expect(k('H2 2026')).toBeLessThan(k('Q1 2027'));
    expect(k('Q1 2027')).toBeLessThan(k('2027'));
    expect(k('2027')).toBeLessThan(k('Cal 2028'));
    expect(k('Cal 2028')).toBeLessThan(k('Cal 2030'));
  });

  it('sorts a list of pricing entries chronologically', () => {
    const mockQuotes: Partial<PricingBookEntry>[] = [
      { id: '1', country: 'DE', vintage: '2028', feedstock: 'Manure' },
      { id: '2', country: 'UK', vintage: '2025', feedstock: 'Waste' },
      { id: '3', country: 'DE', vintage: 'H2 2030', feedstock: 'Bundled' },
      { id: '4', country: 'NL', vintage: 'Spot', feedstock: 'Gas' },
      { id: '5', country: 'FR', vintage: '2027', feedstock: 'Crops' },
      { id: '6', country: 'DE', vintage: 'H1 2029', feedstock: 'Manure' },
    ];
    const sorted = sortQuotesChronologically(mockQuotes as PricingBookEntry[], 'tenor', 'asc');
    expect(sorted.map(q => q.id)).toEqual(['2', '4', '5', '1', '6', '3']);
  });
});
