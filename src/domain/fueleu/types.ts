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
  /** @deprecated No longer used in the quote: only LNG-capable ships can burn Bio-LNG, so the
   *  counterfactual is fossil LNG on the same engine, not VLSFO. Kept optional so existing
   *  callers still compile. */
  vlsfoPriceUsdPerTonne?: number;
  euaPriceEurPerTonne?: number;
  eurUsdRate?: number;
  bioLngVolumeTonnes?: number;
  bioLngCi?: number;
  targetYear?: number;
  /** Consecutive non-compliance escalation year for the fossil-LNG deficit penalty (Art. 23(2)). */
  consecutiveYearsNonCompliant?: number;
  /** Pool / surplus transfer price for FuelEU compliance balance (€/tCO₂e). Defaults to the desk bid (fueleu.poolSellPriceEurPerTco2e). */
  fuelEuSurplusPriceEurPerTco2e?: number;
  /** Engine class burning the Bio-LNG (Annex II methane slip). Defaults to DEFAULT_LNG_ENGINE. */
  lngEngineType?: LngEngineType;
}

export interface MarineBunkerQuotationResult {
  allInBioLngPriceEurMwh: number;
  allInBioLngPriceEurPerTonne: number;
  allInBioLngPriceUsdPerTonne: number;
  /** MWh of energy in 1 tonne of Bio-LNG (Annex II col. 3 → RED Annex III LHV, 50 MJ/kg). */
  mwhPerTonneBioLng: number;
  /** Tonnes of fossil LNG carrying the same energy as 1 tonne of Bio-LNG (only LNG-capable ships can burn Bio-LNG). */
  equivalentFossilLngTonnes: number;
  fossilLngCostEur: number;
  fossilLngCostUsd: number;
  fossilLngEtsLiabilityEur: number;
  fossilLngEtsLiabilityUsd: number;
  /** Signed FuelEU compliance balance value of burning fossil LNG instead (+ = surplus credit, − = deficit penalty). */
  fossilLngFuelEuBalanceEur: number;
  fossilLngFuelEuBalanceUsd: number;
  totalConventionalAlternativeCostEur: number;
  totalConventionalAlternativeCostUsd: number;
  /** Compliance surplus one tonne of Bio-LNG generates vs the FuelEU target intensity (tCO₂e). */
  fuelEuSurplusTco2ePerTonne: number;
  fuelEuSurplusPriceEurPerTco2e: number;
  /** Surplus monetised at the pool price (€/t Bio-LNG). */
  fuelEuSurplusValueEurPerTonne: number;
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

/** Provenance for the EU MRV (THETIS-MRV) dataset a ShippingCounterparty row was derived from. */
export interface FuelEuDatasetSource {
  dataset: string;
  reportingPeriod: number;
  version: number;
  url: string;
  sha256: string;
}

/** A verified human contact for a counterparty. Empty until manually researched/confirmed — never invented. */
export interface ShippingContact {
  name: string;
  role: string;
  email?: string;
  phone?: string;
  sourceUrl: string;
  checkedAt: string;
}

export interface ShippingCounterparty {
  rank: number;
  parent_name: string;
  /** Not present in EU MRV data. Left undefined rather than invented. */
  headquarters?: string;
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
  /** Not present in EU MRV data. Left undefined rather than invented. */
  key_executive?: string;
  /** Not present in EU MRV data. Left undefined rather than invented. */
  primary_bunkering_hubs?: string;
  // Institutional Outreach & Route Dossier — none of these are in EU MRV data and must not be invented.
  callingRegion?: CallingRegion;
  tradeLane?: TradeLane;
  targetDepartment?: string;
  keyContactRole?: string;
  hqAddress?: string;
  switchboardPhone?: string;
  contactDomain?: string;
  outreachPitch: string;
  // Fleet Capability & Joint Regulatory Exposure (FuelEU + EU ETS Directive 2023/959)
  fleetCapability: FleetCapability;
  lng_vessels_in_scope: number;
  conventional_vessels_in_scope: number;
  ets_exposure_2025_tco2: number;
  ets_exposure_2025_eur: number;
  ets_exposure_2026_eur: number;
  combined_regulatory_exposure_2025_eur: number;
  // EU MRV (THETIS-MRV) provenance — every row is traceable back to the source dataset/ships.
  company_imo: string;
  ship_imos: string[];
  source: FuelEuDatasetSource;
  fuelSplitMethod: string;
  lngShipCount: number;
  otherFuelSuspectedShips: number;
  partialReportShips: number;
  /** Verified human contacts. Empty for every row until manually researched — never invented. */
  contacts: ShippingContact[];
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
  /** Default share of annual energy on voyages to/from third-country ports (Art. 2(1)(d)), 0..1. */
  defaultShareThirdCountryVoyages: number;
}

/** FuelEU Annex II LNG engine classes (default methane slip differs by class). */
export type LngEngineType = 'LNG_OTTO_MS' | 'LNG_OTTO_SS' | 'LNG_DIESEL_SS' | 'LBSI';

export interface VesselCalculationInput {
  vlsfoTonnes: number;
  mgoTonnes: number;
  lngTonnes: number;
  bioLngTonnes: number;
  bioLngCi: number;
  targetYear: number;
  consecutiveYearsNonCompliant: number; // 1, 2, 3, 4+
  lngEngineType?: LngEngineType;        // defaults to DEFAULT_LNG_ENGINE
  /** Share (0..1) of annual energy on voyages to/from third-country ports, Art. 2(1)(a)-(d).
   *  Intra-EU voyages and at-berth energy count 100%; third-country voyages count 50%.
   *  Default 0 = all fuel tonnes supplied are already in scope. */
  shareThirdCountryVoyages?: number;
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
