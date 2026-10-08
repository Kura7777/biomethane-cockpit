import { getAssumption, feedstockDefaultCi } from '../assumptions/registry';
import { FEEDSTOCK_REGISTRY } from '../consignment/feedstocks';
import type { ChainOfCustody } from '../consignment/types';
import { MARKETS } from '../markets/registry';
import type { BiomethanePlant } from '../plants/types';
import type { CertificateRoute } from '../registries/certificateRoutes';
import { getPosRoute } from '../routes/index';
import type { DealParams } from './dealParams';

/**
 * Maps a plant record to an audited FEEDSTOCK_REGISTRY key.
 * Mixed organics map to food_waste — the plant dataset's `organic_waste`
 * is not a registry key, and emitting it made Trade Builder relabel the deal.
 */
export function feedstockKeyForPlant(plant: {
  primaryFeedstockCategory?: string | null;
  feedstockDetails?: string | null;
  canonicalFeedstockKey?: string | null;
}): string {
  if (plant.canonicalFeedstockKey) {
    const k = plant.canonicalFeedstockKey.toLowerCase();
    if (k === 'organic_waste') return 'food_waste';
    if (k in FEEDSTOCK_REGISTRY) return k;
  }
  const s = `${plant.primaryFeedstockCategory || ''} ${plant.feedstockDetails || ''}`.toLowerCase();
  if (s.includes('manure') || s.includes('slurry') || s.includes('gülle') || s.includes('mist') || s.includes('lisier') || s.includes('effluent')) return 'manure';
  if (s.includes('sewage') || s.includes('sludge') || s.includes('kläre') || s.includes('step') || s.includes('boue')) return 'sewage_sludge';
  if (s.includes('landfill') || s.includes('deponie') || s.includes('isdnd')) return 'landfill_gas';
  if (s.includes('crop') || s.includes('maize') || s.includes('mais') || s.includes('grass') || s.includes('cive')) return 'energy_crops';
  return 'food_waste';
}

/**
 * Returns the desk's default CI for a feedstock (Pricing desk → Desk assumptions). Always marked
 * estimated. originIso is kept in the signature for callers that resolve a plant's country, but
 * the default CI is one flat value per feedstock — it is not read.
 */
export function defaultCi(
  originIso: string,
  feedstockKey: string
): { ci: number; ciIsEstimated: true } {
  return {
    ci: feedstockDefaultCi(feedstockKey) ?? 0,
    ciIsEstimated: true,
  };
}

/**
 * Resolves the plant's CI.
 * The desk decided 2026-10-08 that every screen uses one flat default CI per feedstock:
 * plant.verifiedCarbonIntensity is a bulk-assigned census value, never audited, and is never
 * read here — see the field's own type comment in plants/types.ts.
 */
export function plantCi(plant: {
  primaryFeedstockCategory?: string | null;
  feedstockDetails?: string | null;
  canonicalFeedstockKey?: string | null;
}): { ci: number; ciIsEstimated: true } {
  return defaultCi('', feedstockKeyForPlant(plant));
}

/**
 * Returns annual energy volume in MWh when plant has positive output.
 * Otherwise returns the 'deal.defaultVolumeMwh' commercial assumption.
 */
export function defaultVolumeMwh(
  plant?: { annualEnergyGWh?: number | null } | null
): number {
  if (plant && typeof plant.annualEnergyGWh === 'number' && plant.annualEnergyGWh > 0) {
    return Math.round(plant.annualEnergyGWh * 1000);
  }
  return getAssumption('deal.defaultVolumeMwh');
}

/**
 * The bio-LNG the FuelEU deal flow and calculators size deals against: −100 gCO₂e/MJ manure
 * biomethane sourced from NL/DK (the desk's standing bio-LNG corridor). One place holds it so the
 * Trade Builder links it builds don't each hardcode the same three literals.
 */
export const FUELEU_BIO_LNG_DEFAULT_ORIGIN = {
  originCountry: 'NL',
  feedstock: 'manure',
  ci: -100,
} as const;

/**
 * Per-origin statutory default market routing.
 * GEMINI.md invariant: UK/GB→UK_RTFO, FR→FR_CPB, IT→IT_CIC, AT/DE/DK/NL/BE/other→DE_THG
 */
export function defaultMarketForOrigin(originIso?: string): string {
  switch ((originIso || '').toUpperCase()) {
    case 'GB':
    case 'UK':
      return 'UK_RTFO';
    case 'FR':
      return 'FR_CPB';
    case 'IT':
      return 'IT_CIC';
    case 'AT':
    case 'DE':
    case 'DK':
    case 'NL':
    case 'BE':
    default:
      return 'DE_THG';
  }
}

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

/** Which certificate the map is showing: GO only, PoS only, or both (PoS preferred). */
export type RouteCertFilter = 'ALL' | 'GO' | 'POS';

export interface RouteTradeTarget {
  marketId: string;
  coc: ChainOfCustody;
}

/**
 * Resolves the statutory market ID and chain of custody for a given corridor.
 * - PoS / compliance market -> MASS_BALANCE
 * - GO / book-and-claim market -> BOOK_AND_CLAIM
 * `filter` follows the map's GO / PoS toggle: 'GO' never returns a PoS market,
 * 'POS' never returns a GO market, 'ALL' prefers PoS.
 */
export function getMarketAndCocForRoute(
  route: CertificateRoute | null | undefined,
  filter: RouteCertFilter = 'ALL',
): RouteTradeTarget | null {
  if (!route) return null;

  // 1. If the PoS route is POSSIBLE: map the possible schemeId to a MARKETS id
  const posDetails = getPosRoute(route.origin, route.target);
  const possibleScheme = filter === 'GO' ? undefined : posDetails.schemes.find(s => s.status === 'POSSIBLE');

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
    filter !== 'POS' && (
    route.status === 'POSSIBLE_OBSERVED' ||
    route.status === 'POSSIBLE_PUBLISHED' ||
    route.status === 'POSSIBLE_RULE' ||
    route.status === 'POSSIBLE_CONDITIONAL');

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
export function getMarketForRoute(
  route: CertificateRoute | null | undefined,
  filter: RouteCertFilter = 'ALL',
): string | null {
  return getMarketAndCocForRoute(route, filter)?.marketId ?? null;
}

/**
 * Canonical builder for a plant-first deal.
 * Emits core deal parameters consistent across all screens.
 * Leaves out contact and legal-entity fields so callers can apply their own verified contacts.
 */
export function plantDealParams(plant: BiomethanePlant): Partial<DealParams> {
  const feedstock = feedstockKeyForPlant(plant);
  const ciResult = plantCi(plant);
  return {
    marketId: defaultMarketForOrigin(plant.countryCode),
    originCountry: plant.countryCode,
    feedstock,
    ci: ciResult.ci,
    ciIsEstimated: true,
    volume: defaultVolumeMwh(plant),
    plantId: plant.id,
    plantName: plant.name,
    plantCapacityNm3h: plant.capacityNm3h ?? undefined,
    plantAnnualGWh: plant.annualEnergyGWh ?? undefined,
    networkOperator: plant.networkOperator || undefined,
  };
}
