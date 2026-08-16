export interface BiomethanePlant {
  id: string;
  name: string;
  country: string;
  countryCode: string;
  countryFlag: string;
  region: string;
  operator: string;
  status: 'Active' | 'Under Construction' | 'Planned';
  commissioningYear: number;
  capacityNm3h: number;
  annualEnergyGWh: number;
  primaryFeedstockCategory: string;
  feedstockDetails: string;
  upgradingTechnology: string;
  gridConnectionType: string;
  networkOperator: string;
  certificationAndRegistry: string;
  primaryOfftake: string;
  // Geographical coordinates for map pins [lon, lat]
  coordinates?: [number, number];
}

export interface DeveloperPortfolio {
  id: string;
  name: string;
  countryHQ: string;
  countryFlag: string;
  totalCapacityGWh: number;
  coreGeographies: string[];
  signatureAssets: string[];
  strategicFocus: string;
}

export interface CountryMacroStat {
  country: string;
  iso: string;
  flag: string;
  activePlants: number;
  installedCapacityTWh: number;
  installedCapacityMcm: number;
  avgPlantSizeNm3h: number;
  gridConnectionRate: number;
  primaryFeedstockType: string;
  primaryUpgradingTech: string;
  nationalRegistry: string;
}
