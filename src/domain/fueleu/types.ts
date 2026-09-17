export type CallingRegion =
  | 'ARA_HUB'
  | 'WEST_MED'
  | 'BALTIC_NORDIC'
  | 'UK_CONTINENT'
  | 'CENTRAL_MED_ADRIATIC';

export type TradeLane =
  | 'ASIA_EUROPE'
  | 'INTRA_EU_FEEDER'
  | 'TRANSATLANTIC'
  | 'BALTIC_NORDIC_ROPAX'
  | 'ME_AFRICA_EU_LIQUID';

export interface CallingRegionMeta {
  id: CallingRegion;
  label: string;
  portsDescription: string;
}

export interface TradeLaneMeta {
  id: TradeLane;
  label: string;
  corridorDescription: string;
}

export const CALLING_REGIONS: Record<CallingRegion, CallingRegionMeta> = {
  ARA_HUB: {
    id: 'ARA_HUB',
    label: 'ARA Ports',
    portsDescription: 'ARA Ports (Rotterdam / Antwerp / Amsterdam)',
  },
  WEST_MED: {
    id: 'WEST_MED',
    label: 'West Mediterranean',
    portsDescription: 'West Mediterranean (Algeciras / Valencia / Barcelona / Marseille)',
  },
  BALTIC_NORDIC: {
    id: 'BALTIC_NORDIC',
    label: 'Baltic & Scandinavia',
    portsDescription: 'Baltic & Scandinavia (Gothenburg / Hamburg / Copenhagen / Kiel)',
  },
  UK_CONTINENT: {
    id: 'UK_CONTINENT',
    label: 'UK-Continent',
    portsDescription: 'UK-Continent (Felixstowe / Southampton / London Gateway / Zeebrugge)',
  },
  CENTRAL_MED_ADRIATIC: {
    id: 'CENTRAL_MED_ADRIATIC',
    label: 'Central Med & Adriatic',
    portsDescription: 'Central Med & Adriatic (Piraeus / Genoa / Trieste / Gioia Tauro)',
  },
};

export const TRADE_LANES: Record<TradeLane, TradeLaneMeta> = {
  ASIA_EUROPE: {
    id: 'ASIA_EUROPE',
    label: 'Asia-Europe Loop',
    corridorDescription: 'Asia-Europe Loop (Suez / Cape)',
  },
  INTRA_EU_FEEDER: {
    id: 'INTRA_EU_FEEDER',
    label: 'Intra-EU Short Sea & Feeder',
    corridorDescription: 'Intra-EU Short Sea & Feeder',
  },
  TRANSATLANTIC: {
    id: 'TRANSATLANTIC',
    label: 'Transatlantic',
    corridorDescription: 'Transatlantic (Americas - Europe)',
  },
  BALTIC_NORDIC_ROPAX: {
    id: 'BALTIC_NORDIC_ROPAX',
    label: 'Baltic & Nordic Ro-Pax',
    corridorDescription: 'Baltic & Nordic (Ro-Pax / Ferry)',
  },
  ME_AFRICA_EU_LIQUID: {
    id: 'ME_AFRICA_EU_LIQUID',
    label: 'Middle East / Africa - EU Liquid',
    corridorDescription: 'Middle East / Africa - EU (Tanker)',
  },
};

export function getStrategyTierBadgeClass(strategyTier: string): string {
  if (strategyTier.startsWith('Tier 1')) return 'chip-neg';
  if (strategyTier.startsWith('Tier 2')) return 'chip-warn';
  if (strategyTier.startsWith('Tier 3')) return 'chip-info';
  return 'chip-pos';
}

export type FleetCapability = 'DUAL_FUEL_LNG' | 'CONVENTIONAL_ONLY';

export interface JointRegulatoryExposure {
  totalGrossCo2Tonnes: number;
  etsExposure2025Tco2: number;
  etsExposure2025Eur: number;
  etsExposure2026Tco2: number;
  etsExposure2026Eur: number;
  combinedRegulatoryExposure2025Eur: number;
  etsSavingsFromBioLngEur: number;
}

export interface MarineBunkerQuotationInput {
  ttfGasIndexEurMwh?: number;
  liquefactionFeeEurMwh?: number;
  greenPremiumEurMwh?: number;
  vlsfoPriceUsdPerTonne?: number;
  euaPriceEurPerTonne?: number;
  eurUsdRate?: number;
  bioLngVolumeTonnes?: number;
  bioLngCi?: number;
  targetYear?: 2025 | 2026 | 2030;
}

export interface MarineBunkerQuotationResult {
  allInBioLngPriceEurMwh: number;
  allInBioLngPriceEurPerTonne: number;
  allInBioLngPriceUsdPerTonne: number;
  mwhPerTonneBioLng: number;
  equivalentVlsfoTonnes: number;
  vlsfoCostUsd: number;
  vlsfoCostEur: number;
  vlsfoEtsLiabilityEur: number;
  vlsfoEtsLiabilityUsd: number;
  vlsfoFuelEuPenaltyEur: number;
  vlsfoFuelEuPenaltyUsd: number;
  totalConventionalAlternativeCostEur: number;
  totalConventionalAlternativeCostUsd: number;
  fuelEuFleetPenaltyAvoidedEurPerTonne: number;
  etsAvoidedEurPerTonne: number;
  totalRegulatoryValueEurPerTonne: number;
  netSavingsPerTonneBioLngEur: number;
  netSavingsPerTonneBioLngUsd: number;
  dealVolumeTonnes?: number;
  dealVolumeMwh?: number;
  totalBioLngInvoiceEur?: number;
  totalBioLngInvoiceUsd?: number;
  totalClientSavingsEur?: number;
  totalClientSavingsUsd?: number;
  totalEtsAvoidedTco2?: number;
}

export interface ShippingCounterparty {
  rank: number;
  parent_name: string;
  headquarters: string;
  segment: string;
  vessels_in_scope: number;
  strategy_tier: string;
  vlsfo_tonnes: number;
  mgo_tonnes: number;
  lng_tonnes: number;
  total_energy_mwh: number;
  actual_ghgie: number;
  compliance_balance_2025_tco2e: number;
  penalty_2025_y1_eur: number;
  penalty_2025_y2_eur: number;
  compliance_balance_2030_tco2e: number;
  penalty_2030_y1_eur: number;
  bio_lng_required_neg100_t: number;
  bio_lng_required_neg100_mwh: number;
  bio_lng_required_zero_t: number;
  client_savings_physical_eur: number;
  desk_margin_physical_eur: number;
  client_savings_pooling_eur: number;
  desk_margin_pooling_eur: number;
  key_executive: string;
  primary_bunkering_hubs: string;
  // Institutional Outreach & Route Dossier
  callingRegion: CallingRegion;
  tradeLane: TradeLane;
  targetDepartment: string;
  keyContactRole: string;
  hqAddress: string;
  switchboardPhone: string;
  contactDomain: string;
  outreachPitch: string;
  // Fleet Capability & Joint Regulatory Exposure (FuelEU + EU ETS Directive 2023/959)
  fleetCapability: FleetCapability;
  lng_vessels_in_scope: number;
  conventional_vessels_in_scope: number;
  ets_exposure_2025_tco2: number;
  ets_exposure_2025_eur: number;
  ets_exposure_2026_eur: number;
  combined_regulatory_exposure_2025_eur: number;
}

export interface VesselArchetype {
  id: string;
  name: string;
  segment: string;
  description: string;
  dwtOrTeu: string;
  defaultVlsfoTonnes: number;
  defaultMgoTonnes: number;
  defaultLngTonnes: number;
  defaultBioLngTonnes: number;
  defaultBioLngCi: number;
  typicalVoyageProfile: string;
  keyPorts: string[];
}

export interface VesselCalculationInput {
  vlsfoTonnes: number;
  mgoTonnes: number;
  lngTonnes: number;
  bioLngTonnes: number;
  bioLngCi: number;
  targetYear: 2025 | 2030;
  consecutiveYearsNonCompliant: number; // 1, 2, 3, 4+
}

export interface VesselCalculationResult {
  totalEnergyMj: number;
  totalEnergyMwh: number;
  weightedGhgie: number;
  targetGhgie: number;
  complianceBalanceTco2e: number; // Positive = Surplus, Negative = Deficit
  isOverCompliant: boolean;
  statutoryPenaltyY1Eur: number;
  statutoryPenaltyY2Eur: number;
  bioLngRequiredNeg100Tonnes: number;
  bioLngRequiredNeg100Mwh: number;
  bioLngRequiredZeroCiTonnes: number;
  bioLngRequiredZeroCiMwh: number;
  physicalSavingsEur: number;
  physicalTradingMarginEur: number;
  poolingSavingsEur: number;
  poolingArrangementMarginEur: number;
}
