import { describe, it, expect } from 'vitest';
import { buildDealUrl, parseDealParams, DEAL_ROUTE, DealParams } from '../trade/dealParams';

/**
 * The deal-parameter contract.
 *
 * Every screen that hands a deal to the Trade Builder speaks through these two
 * functions. Before they existed, nine call sites each hand-rolled their own query
 * string and the two destination screens read two different vocabularies — so
 * `scheme`, `coc` and `deliveryPeriod` were emitted by three callers and read by
 * neither. These tests pin the round trip that prevents that recurring.
 */

const FULL: DealParams = {
  marketId: 'DE_THG',
  originCountry: 'DK',
  feedstock: 'manure',
  ci: -100.5,
  volume: 25000,
  scheme: 'ISCC_EU',
  coc: 'MASS_BALANCE',
  counterparty: 'Shell Energy Europe',
  deliveryPeriod: 'Cal-2026',
};

/** Parse a built URL back through the consumer side, as the router would. */
function roundTrip(params: Partial<DealParams>): Partial<DealParams> {
  const url = buildDealUrl(params);
  return parseDealParams(new URLSearchParams(url.slice(url.indexOf('?') + 1)));
}

describe('dealParams — buildDealUrl', () => {
  it('targets the trade builder route', () => {
    expect(buildDealUrl({ marketId: 'DE_THG' })).toMatch(/^\/trade\?/);
    expect(DEAL_ROUTE).toBe('/trade');
  });

  it('omits keys that were not supplied', () => {
    const url = buildDealUrl({ marketId: 'DE_THG', originCountry: 'DK' });
    expect(url).toContain('marketId=DE_THG');
    expect(url).toContain('originCountry=DK');
    expect(url).not.toContain('feedstock');
    expect(url).not.toContain('volume');
    expect(url).not.toContain('undefined');
    expect(url).not.toContain('null');
  });

  it('omits null and undefined without emitting them as text', () => {
    const url = buildDealUrl({
      marketId: 'DE_THG',
      counterparty: undefined,
      deliveryPeriod: null as unknown as string,
    });
    expect(url).toBe('/trade?marketId=DE_THG');
  });

  it('serialises numbers, including negative carbon intensity', () => {
    const url = buildDealUrl({ ci: -100.5, volume: 25000 });
    expect(url).toContain('ci=-100.5');
    expect(url).toContain('volume=25000');
  });

  it('encodes values that contain URL-significant characters', () => {
    const url = buildDealUrl({ counterparty: 'Shell Energy & Trading' });
    expect(url).not.toContain('Energy & Trading');
    const parsed = parseDealParams(new URLSearchParams(url.slice(url.indexOf('?') + 1)));
    expect(parsed.counterparty).toBe('Shell Energy & Trading');
  });

  it('produces no query string when given nothing', () => {
    expect(buildDealUrl({})).toBe('/trade');
  });
});

describe('dealParams — parseDealParams', () => {
  it('round-trips every field without loss', () => {
    expect(roundTrip(FULL)).toEqual(FULL);
  });

  it('returns only the keys actually present', () => {
    const parsed = parseDealParams(new URLSearchParams('marketId=NL_ERE'));
    expect(parsed).toEqual({ marketId: 'NL_ERE' });
  });

  it('accepts the legacy aliases the sourcing desk already emitted', () => {
    // `market` and `origin` predate the contract. Links in the wild still use them,
    // so the parser absorbs both spellings rather than breaking those entry points.
    const parsed = parseDealParams(new URLSearchParams('market=IT_CIC&origin=SE'));
    expect(parsed.marketId).toBe('IT_CIC');
    expect(parsed.originCountry).toBe('SE');
  });

  it('prefers the canonical spelling when both are present', () => {
    const parsed = parseDealParams(new URLSearchParams('market=IT_CIC&marketId=DE_THG'));
    expect(parsed.marketId).toBe('DE_THG');
  });

  it('drops numeric fields that are not numbers rather than yielding NaN', () => {
    // A NaN reaching the builder becomes a NaN netback on screen. Absent is honest;
    // NaN is a number-shaped lie.
    const parsed = parseDealParams(new URLSearchParams('ci=abc&volume=&marketId=DE_THG'));
    expect(parsed).not.toHaveProperty('ci');
    expect(parsed).not.toHaveProperty('volume');
    expect(parsed.marketId).toBe('DE_THG');
  });

  it('keeps a zero carbon intensity, which is a real value', () => {
    const parsed = parseDealParams(new URLSearchParams('ci=0'));
    expect(parsed.ci).toBe(0);
  });

  it('ignores unrelated query params such as the screen\'s own view state', () => {
    const parsed = parseDealParams(new URLSearchParams('marketId=DE_THG&tab=builder&autoOpen=1'));
    expect(parsed).toEqual({ marketId: 'DE_THG' });
  });
});

describe('dealParams — the fields that used to be dropped', () => {
  // scheme, coc and deliveryPeriod were emitted by the briefing, plants and sourcing
  // screens and read by neither destination. These are the regression cases.
  it.each(['scheme', 'coc', 'deliveryPeriod'] as const)('carries %s across the handoff', field => {
    const parsed = roundTrip(FULL);
    expect(parsed[field]).toBe(FULL[field]);
  });
});
