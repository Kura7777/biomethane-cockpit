import type { CertificateRoute } from '../registries/certificateRoutes';
import { getPosRoute } from './index';
import { MARKETS } from '../markets/registry';
import type { ChainOfCustody } from '../consignment/types';

/**
 * Explicit, typed mapping from audited statutory schemeId (POS_SCHEMES)
 * to institutional desk marketId (MARKETS in src/domain/markets/registry.ts).
 */
export const POS_SCHEME_TO_MARKET_ID: Record<string, string> = {
  DE_THG: 'DE_THG',
  NL_ERE: 'NL_ERE',
  FR_CPB: 'FR_CPB',
  FR_TIRUERT: 'FR_TIRUERT',
  IT_CIC: 'IT_CIC',
  SE_TAX: 'SE_TAX',
  BE_TRANSPORT: 'BE_TRANSPORT',
  EE_TRANSPORT: 'EE_TRANSPORT',
  GB_RTFO: 'UK_RTFO',
  FI_JAKELUVELVOITE: 'FI_TRANSPORT',
  LT_DAEI: 'LT_ALT_FUELS',
};

/**
 * National GO markets defined in MARKETS by country code.
 */
export const DESTINATION_GO_MARKETS: Record<string, string> = {
  DE: 'DE_GO',
  NL: 'NL_GO',
  FR: 'FR_GO',
  GB: 'UK_RGGO',
  UK: 'UK_RGGO',
  DK: 'DK_GO',
  ES: 'ES_GDO',
  PT: 'PT_EEGO',
};

export interface RouteTradeTarget {
  marketId: string;
  coc: ChainOfCustody;
}

/**
 * Resolves the statutory market ID and chain of custody for a given corridor.
 * - PoS / compliance market -> MASS_BALANCE
 * - GO / book-and-claim market -> BOOK_AND_CLAIM
 */
export function getMarketAndCocForRoute(route: CertificateRoute | null | undefined): RouteTradeTarget | null {
  if (!route) return null;

  // 1. If the PoS route is POSSIBLE: map the possible schemeId to a MARKETS id
  const posDetails = getPosRoute(route.origin, route.target);
  const possibleScheme = posDetails.schemes.find(s => s.status === 'POSSIBLE');

  if (possibleScheme) {
    const marketId = POS_SCHEME_TO_MARKET_ID[possibleScheme.schemeId];
    if (marketId && MARKETS.some(m => m.id === marketId)) {
      return {
        marketId,
        coc: 'MASS_BALANCE',
      };
    }
  }

  // 2. Else if the GO route is possible: return destination's GO market or AIB_GO
  const isGoPossible =
    route.status === 'POSSIBLE_OBSERVED' ||
    route.status === 'POSSIBLE_PUBLISHED' ||
    route.status === 'POSSIBLE_RULE' ||
    route.status === 'POSSIBLE_CONDITIONAL';

  if (isGoPossible) {
    const targetIso = (route.target || '').toUpperCase();
    const destinationGoMarket = DESTINATION_GO_MARKETS[targetIso];
    if (destinationGoMarket && MARKETS.some(m => m.id === destinationGoMarket)) {
      return {
        marketId: destinationGoMarket,
        coc: 'BOOK_AND_CLAIM',
      };
    }

    if (route.hubs && route.hubs.includes('AIB') && MARKETS.some(m => m.id === 'AIB_GO')) {
      return {
        marketId: 'AIB_GO',
        coc: 'BOOK_AND_CLAIM',
      };
    }
  }

  // 3. Otherwise: no tradeable market
  return null;
}

/**
 * Convenience getter returning just the marketId or null.
 */
export function getMarketForRoute(route: CertificateRoute | null | undefined): string | null {
  return getMarketAndCocForRoute(route)?.marketId ?? null;
}
