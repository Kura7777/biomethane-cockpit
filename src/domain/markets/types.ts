export type MarketStatus = 'ACTIVE' | 'EMERGING' | 'NONE' | 'FUTURE';

export type UnitOfAccount =
  | 'EUR_PER_TCO2E'        // Germany THG, EU ETS1
  | 'EUR_PER_KG_CO2E'      // Netherlands ERE
  | 'EUR_PER_MWH'          // France CPB, Austria, Sweden, Finland, Spain, Poland, etc.
  | 'EUR_PER_CIC'          // Italy
  | 'GBP_PER_DRTFC'        // UK RTFO
  | 'EUR_PER_TCO2E_DEFICIT'; // FuelEU Maritime

export type PriceSide = 'bid' | 'mid' | 'offer';

export interface Uncertainty {
  id: string;
  title: string;
  description: string;
  branches: {
    id: string;
    label: string;
    description: string;
    multiplier?: number;  // e.g., 2 for double counting
  }[];
  persistentNote: string;  // Important distinction to always show
  source: string;
  lastUpdated: string;
}

export interface Market {
  id: string;                    // e.g., 'DE_THG', 'NL_ERE', 'FR_CPB'
  name: string;                  // Full name
  shortName: string;             // For table headers
  country: string;               // ISO 3166-1 alpha-2
  countryName: string;           // Full country name
  status: MarketStatus;
  unitOfAccount: UnitOfAccount;
  unitLabel: string;             // Display string: '€/tCO₂e'
  notes: string;
  legalBasis: string;            // Primary legislation reference
  registry: string | null;       // National or scheme registry (dena, VertiCer, EEX, GSE, Enagás, etc.)
  ceilingEurMwh: number | null;  // e.g., 100 for France CPB
  requiresMassBalance: boolean;
  requiresUDB: boolean;
  acceptsBookAndClaim: boolean;
  isEUScope: boolean;            // true for EU-wide markets (FuelEU, ETS)
  deskCategory?: 'COMPLIANCE' | 'VOLUNTARY'; // Top-level commercial desk categorization
  uncertainties: Uncertainty[];
  
  // Real-world plant and production infrastructure metadata
  productionPlants?: number;     // Active operational biomethane plants
  annualProductionTWh?: number;  // Estimated annual production in TWh
  keyFeedstocks?: string;        // Dominant feedstock pathways
  gridInterconnection?: string;  // Grid TSO and interconnection status
}

export type MarkSourceType =
  | 'EXCHANGE_AUCTION'      // published auction result, e.g. EEX French GO/CPB monthly auction
  | 'PLATFORM_HISTORY'      // price history from a platform, e.g. CEGH GreenGas (Platts-derived)
  | 'PRICE_REPORTING'       // subscription PRA assessment, e.g. Argus, Platts, QC Intel
  | 'BROKER_INDICATION'     // indicative level from a broker
  | 'COUNTERPARTY_QUOTE'    // firm or indicative quote from a counterparty
  | 'PRESS_REPORT'          // trade press or public commentary
  | 'ESTIMATE';             // trader's own estimate — lowest weight

export interface MarkProvenance {
  sourceType: MarkSourceType | null;   // null until set
  sourceName: string | null;           // 'EEX', 'CEGH', 'Argus', counterparty name
  sourceUrl: string | null;
  observedAt: string | null;           // ISO date the price was OBSERVED
  note: string | null;
}

export interface MarkEntry {
  marketId: string;
  bid: number | null;
  offer: number | null;
  mid: number | null;
  updatedAt: string | null;      // ISO 8601 timestamp of last mark entry
  source: string | null;         // Legacy source label ("Argus 14 Oct", "broker indication", etc.)
  provenance?: MarkProvenance | null;
}

export type StalenessStatus = 'FRESH' | 'STALE_WARNING' | 'STALE_CRITICAL' | 'UNFILLED';

/**
 * Reliability ordering (for display only — never for arithmetic):
 * EXCHANGE_AUCTION > PRICE_REPORTING > PLATFORM_HISTORY > COUNTERPARTY_QUOTE
 *   > BROKER_INDICATION > PRESS_REPORT > ESTIMATE
 */
export const MARK_SOURCE_RELIABILITY: Record<MarkSourceType, number> = {
  EXCHANGE_AUCTION: 7,
  PRICE_REPORTING: 6,
  PLATFORM_HISTORY: 5,
  COUNTERPARTY_QUOTE: 4,
  BROKER_INDICATION: 3,
  PRESS_REPORT: 2,
  ESTIMATE: 1,
};

export function getMarkReliability(sourceType: MarkSourceType | null | undefined): number | null {
  if (!sourceType) return null;
  return MARK_SOURCE_RELIABILITY[sourceType] ?? null;
}

export interface MarkTimeObject {
  observedAt?: string | null;
  updatedAt?: string | null;
  provenance?: MarkProvenance | null;
}

/**
 * Compute mark age in days based on observedAt (falling back to updatedAt)
 */
export function getMarkAgeDays(
  target: string | null | undefined | MarkTimeObject
): number | null {
  if (!target) return null;
  let dateStr: string | null = null;
  if (typeof target === 'string') {
    dateStr = target;
  } else {
    dateStr = target.provenance?.observedAt ?? target.observedAt ?? target.updatedAt ?? null;
  }
  if (!dateStr) return null;
  const msDiff = Date.now() - new Date(dateStr).getTime();
  if (isNaN(msDiff)) return null;
  return Math.max(0, Math.floor(msDiff / (1000 * 60 * 60 * 24)));
}

export function getMarkStaleness(
  target: string | null | undefined | MarkTimeObject
): StalenessStatus {
  const days = getMarkAgeDays(target);
  if (days === null) return 'UNFILLED';
  if (days >= 30) return 'STALE_CRITICAL'; // >30 days red
  if (days >= 7) return 'STALE_WARNING';   // >7 days amber
  return 'FRESH';                          // <7 days green
}
