import { describe, it, expect } from 'vitest';
import { parseTenorSortKey, sortQuotesChronologically } from '../marksSort';
import { PricingBookEntry } from '../../../domain/markets/brokerRun.seed';

describe('marksSort (Institutional Chronological Tenor Sorting)', () => {
  it('correctly maps various vintage and tenor strings to ascending chronological keys', () => {
    const promptKey = parseTenorSortKey('Prompt');
    const spotKey = parseTenorSortKey('Spot');
    const m1Key = parseTenorSortKey('M+1');
    const m2Key = parseTenorSortKey('M+2');
    const h125Key = parseTenorSortKey('H1 2025');
    const y25Key = parseTenorSortKey('2025');
    const h126Key = parseTenorSortKey('H1 2026');
    const y26Key = parseTenorSortKey('2026');
    const h226Key = parseTenorSortKey('H2 2026');
    const q127Key = parseTenorSortKey('Q1 2027');
    const y27Key = parseTenorSortKey('2027');
    const y28Key = parseTenorSortKey('Cal 2028');
    const y30Key = parseTenorSortKey('Cal 2030');

    expect(promptKey).toBe(2026.0);
    expect(spotKey).toBe(2026.0);
    expect(m1Key).toBe(2026.0);
    expect(m2Key).toBeGreaterThan(m1Key);

    // 2025 vintages should precede 2026
    expect(h125Key).toBeLessThan(promptKey);
    expect(y25Key).toBeLessThan(promptKey);

    // Within 2026: H1 < Year Mid < H2
    expect(h126Key).toBeLessThan(y26Key);
    expect(y26Key).toBeLessThan(h226Key);

    // Multi-year progression
    expect(h226Key).toBeLessThan(q127Key);
    expect(q127Key).toBeLessThan(y27Key);
    expect(y27Key).toBeLessThan(y28Key);
    expect(y28Key).toBeLessThan(y30Key);
  });

  it('sorts a list of pricing entries chronologically', () => {
    const mockQuotes: Partial<PricingBookEntry>[] = [
      { id: '1', country: 'DE', vintage: '2028', feedstock: 'Manure' },
      { id: '2', country: 'UK', vintage: '2025', feedstock: 'Waste' },
      { id: '3', country: 'DE', vintage: 'H2 2026', feedstock: 'Bundled' },
      { id: '4', country: 'NL', vintage: 'Prompt', feedstock: 'Gas' },
      { id: '5', country: 'FR', vintage: '2027', feedstock: 'Crops' },
      { id: '6', country: 'DE', vintage: 'H1 2026', feedstock: 'Manure' },
    ];

    const sorted = sortQuotesChronologically(mockQuotes as PricingBookEntry[], 'tenor', 'asc');
    const sortedIds = sorted.map(q => q.id);

    // Expected order:
    // 2 (2025) -> 4 (Prompt 2026.0) -> 6 (H1 2026) -> 3 (H2 2026) -> 5 (2027) -> 1 (2028)
    expect(sortedIds).toEqual(['2', '4', '6', '3', '5', '1']);
  });
});
