import { describe, it, expect } from 'vitest';
import { resolveCorridorParams, ISO_TO_NAME } from '../MapScreen';

describe('Map deep links and param resolution', () => {
  it('parses valid origin, target and filter params correctly', () => {
    const params = new URLSearchParams('origin=FR&target=DE&filter=POS');
    const resolved = resolveCorridorParams(params);
    expect(resolved).toEqual({
      origin: 'France',
      target: 'Germany',
      filter: 'POS',
    });
  });

  it('handles lowercase and alias codes like UK -> United Kingdom', () => {
    const params = new URLSearchParams('origin=dk&target=uk&filter=go');
    const resolved = resolveCorridorParams(params);
    expect(resolved).toEqual({
      origin: 'Denmark',
      target: 'United Kingdom',
      filter: 'GO',
    });
  });

  it('falls back to defaults when origin or target code is invalid', () => {
    const params = new URLSearchParams('origin=XX&target=YY&filter=INVALID');
    const resolved = resolveCorridorParams(params);
    expect(resolved).toEqual({
      origin: 'Denmark',
      target: 'Germany',
      filter: 'ALL',
    });
  });

  it('drops target and falls back when origin and target are identical', () => {
    const params = new URLSearchParams('origin=DE&target=DE&filter=ALL');
    const resolved = resolveCorridorParams(params);
    expect(resolved.origin).toBe('Germany');
    expect(resolved.target).not.toBe('Germany');
    expect(resolved.target).toBe('Denmark');
  });

  it('maps all European country ISOs in ISO_TO_NAME', () => {
    expect(ISO_TO_NAME['DK']).toBe('Denmark');
    expect(ISO_TO_NAME['DE']).toBe('Germany');
    expect(ISO_TO_NAME['FR']).toBe('France');
    expect(ISO_TO_NAME['GB']).toBe('United Kingdom');
    expect(ISO_TO_NAME['SE']).toBe('Sweden');
  });
});
