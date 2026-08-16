export interface BiomethanePlant {
  id: string;
  name: string;
  country: string;
  countryCode: string;
  countryFlag: string;
  provenance: string; // Sourced authority (e.g. 'GIE/EBA European Biomethane Map 2026')
  fieldsUnverified?: string[]; // List of fields that are unverified in source map
  region?: string | null;
  operator?: string | null;
  status?: 'Active' | 'Under Construction' | 'Planned' | string | null;
  commissioningYear?: number | null;
  capacityNm3h?: number | null;
  annualEnergyGWh?: number | null;
  primaryFeedstockCategory?: string | null;
  feedstockDetails?: string | null;
  upgradingTechnology?: string | null;
  gridConnectionType?: string | null;
  networkOperator?: string | null;
  certificationAndRegistry?: string | null;
  primaryOfftake?: string | null;
  coordinates?: [number, number] | null;
}

export interface DeveloperPortfolio {
  id: string;
  name: string;
  countryHQ: string;
  countryFlag: string;
  totalCapacityGWh?: number | null;
  coreGeographies: string[];
  signatureAssets: string[];
  strategicFocus: string;
  provenance?: string;
}

export interface CountryMacroStat {
  country: string;
  iso: string;
  flag: string;
  activePlants: number;
  installedCapacityTWh?: number | null;
  installedCapacityMcm?: number | null;
  avgPlantSizeNm3h?: number | null;
  gridConnectionRate?: number | null;
  primaryFeedstockType?: string | null;
  primaryUpgradingTech?: string | null;
  nationalRegistry?: string | null;
  provenance?: string;
}
