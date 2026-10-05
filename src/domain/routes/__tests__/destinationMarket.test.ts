import { describe, it, expect } from 'vitest';
import { getMarketForRoute, getMarketAndCocForRoute, POS_SCHEME_TO_MARKET_ID } from '../destinationMarket';
import { getCertificateRoute } from '../../registries/certificateRoutes';
import { MARKETS } from '../../markets/registry';

describe('destinationMarket', () => {
  it('maps all defined POS_SCHEME_TO_MARKET_ID entries to existing markets in MARKETS', () => {
    const marketIds = new Set(MARKETS.map(m => m.id));
    for (const [schemeId, marketId] of Object.entries(POS_SCHEME_TO_MARKET_ID)) {
      expect(marketIds.has(marketId), `Market ID ${marketId} for scheme ${schemeId} must exist in MARKETS`).toBe(true);
    }
  });

  it('DK -> DE resolves to DE_THG with MASS_BALANCE', () => {
    const route = getCertificateRoute('DK', 'DE');
    expect(getMarketForRoute(route)).toBe('DE_THG');
    expect(getMarketAndCocForRoute(route)).toEqual({
      marketId: 'DE_THG',
      coc: 'MASS_BALANCE',
    });
  });

  it('DK -> SE resolves to SE_TAX with MASS_BALANCE', () => {
    const route = getCertificateRoute('DK', 'SE');
    expect(getMarketForRoute(route)).toBe('SE_TAX');
    expect(getMarketAndCocForRoute(route)).toEqual({
      marketId: 'SE_TAX',
      coc: 'MASS_BALANCE',
    });
  });

  it('DK -> GB resolves to UK_RTFO with MASS_BALANCE', () => {
    const route = getCertificateRoute('DK', 'GB');
    expect(getMarketForRoute(route)).toBe('UK_RTFO');
    expect(getMarketAndCocForRoute(route)).toEqual({
      marketId: 'UK_RTFO',
      coc: 'MASS_BALANCE',
    });
  });

  it('GB -> DE resolves to a GO market (DE_GO), NOT DE_THG, with BOOK_AND_CLAIM', () => {
    const route = getCertificateRoute('GB', 'DE');
    const market = getMarketForRoute(route);
    expect(market).not.toBe('DE_THG');
    expect(market).toBe('DE_GO');
    expect(getMarketAndCocForRoute(route)).toEqual({
      marketId: 'DE_GO',
      coc: 'BOOK_AND_CLAIM',
    });
  });

  it('DK -> IT resolves to null or a GO market (not IT_CIC)', () => {
    const route = getCertificateRoute('DK', 'IT');
    const market = getMarketForRoute(route);
    expect(market).not.toBe('IT_CIC');
    // If GO route is not possible or no GO market exists, it's null
    if (market !== null) {
      expect(getMarketAndCocForRoute(route)?.coc).toBe('BOOK_AND_CLAIM');
    }
  });

  it('closed / non-tradeable route resolves to null', () => {
    const route = getCertificateRoute('DK', 'CH');
    expect(getMarketForRoute(route)).toBeNull();
    expect(getMarketAndCocForRoute(route)).toBeNull();
  });
});
