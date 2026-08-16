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
  uncertainties: Uncertainty[];
  
  // Real-world plant and production infrastructure metadata
  productionPlants?: number;     // Active operational biomethane plants
  annualProductionTWh?: number;  // Estimated annual production in TWh
  keyFeedstocks?: string;        // Dominant feedstock pathways
  gridInterconnection?: string;  // Grid TSO and interconnection status
}

export interface MarkEntry {
  marketId: string;
  bid: number | null;
  offer: number | null;
  mid: number | null;
  updatedAt: string | null;      // ISO 8601 timestamp of last mark entry
  source: string | null;         // Source label ("Argus 14 Oct", "broker indication", etc.)
}

export type StalenessStatus = 'FRESH' | 'STALE_WARNING' | 'STALE_CRITICAL' | 'UNFILLED';

/**
 * Compute mark age in days and staleness status
 */
export function getMarkAgeDays(updatedAt: string | null): number | null {
  if (!updatedAt) return null;
  const msDiff = Date.now() - new Date(updatedAt).getTime();
  if (isNaN(msDiff)) return null;
  return Math.max(0, Math.floor(msDiff / (1000 * 60 * 60 * 24)));
}

export function getMarkStaleness(updatedAt: string | null): StalenessStatus {
  if (!updatedAt) return 'UNFILLED';
  const days = getMarkAgeDays(updatedAt);
  if (days === null) return 'UNFILLED';
  if (days >= 30) return 'STALE_CRITICAL'; // >30 days red
  if (days >= 7) return 'STALE_WARNING';   // >7 days amber
  return 'FRESH';                          // <7 days green
}
