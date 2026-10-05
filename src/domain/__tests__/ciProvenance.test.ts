import { describe, it, expect } from 'vitest';
import { buildDealUrl, parseDealParams } from '../trade/dealParams';

// Sept 2026 desk audit, §6 open item 1: census CIs are feedstock defaults, not audited PoS values,
// so they must never reach pricing flagged as firm.
describe('plant carbon intensity provenance', () => {
  it('carries the estimated flag through the deal link', () => {
    const url = buildDealUrl({ originCountry: 'DK', feedstock: 'manure', ci: -78, ciIsEstimated: true, plantId: 'x' });
    const query = url.includes('?') ? url.slice(url.indexOf('?') + 1) : url;
    expect(parseDealParams(new URLSearchParams(query)).ciIsEstimated).toBe(true);
  });
});
