export type MarketStatus = 'ACTIVE' | 'EMERGING' | 'NONE' | 'FUTURE';

export type UnitOfAccount =
  | 'EUR_PER_TCO2E'        // Germany THG, EU ETS1
  | 'EUR_PER_KG_CO2E'      // Netherlands ERE
  | 'EUR_PER_MWH'          // France CPB, Austria, Sweden, Finland, etc.
  | 'EUR_PER_CIC'          // Italy
  | 'GBP_PER_DRTFC'        // UK RTFO
  | 'EUR_PER_TCO2E_DEFICIT'; // FuelEU Maritime

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
  registry: string | null;
  ceilingEurMwh: number | null;  // e.g., 100 for France CPB
  requiresMassBalance: boolean;
  requiresUDB: boolean;
  acceptsBookAndClaim: boolean;
  isEUScope: boolean;            // true for EU-wide markets (FuelEU, ETS)
  uncertainties: Uncertainty[];
}

export interface MarkEntry {
  marketId: string;
  bid: number | null;
  offer: number | null;
  mid: number | null;
  unit: UnitOfAccount;
  unitLabel: string;
  timestamp: string | null;  // ISO date
  sourceNote: string;
  isStale: boolean;  // computed: >7 days
  isVeryStale: boolean;  // computed: >14 days
}
