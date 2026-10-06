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
  /** TTF gas index (EUR/MWh) from the marks store. Required: there is no default. */
  ttfGasIndexEurMwh: number;
  liquefactionFeeEurMwh?: number;
  greenPremiumEurMwh?: number;
  /** @deprecated No longer used in the quote: only LNG-capable ships can burn Bio-LNG, so the
   *  counterfactual is fossil LNG on the same engine, not VLSFO. Kept optional so existing
   *  callers still compile. */
  vlsfoPriceUsdPerTonne?: number;
  /** EU ETS allowance price (EUR/tCO2e) from the EU_ETS1 mark. Required: there is no default. */
  euaPriceEurPerTonne: number;
  eurUsdRate?: number;
  bioLngVolumeTonnes?: number;
  bioLngCi?: number;
  targetYear?: number;
  /** Consecutive non-compliance escalation year for the fossil-LNG deficit penalty (Art. 23(2)). */
  consecutiveYearsNonCompliant?: number;
  /** Pool / surplus transfer price for FuelEU compliance balance (EUR/tCO2e): the desk bid derived from the FUELEU mark. Required: there is no default. */
  fuelEuSurplusPriceEurPerTco2e: number;
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
  /** ETS on Bio-LNG's own methane slip and N2O (2026+); its CO2 is zero-rated. */
  bioLngEtsLiabilityEur: number;
  bioLngEtsLiabilityUsd: number;
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

/**
 * A verified contact for a commercial GROUP (data/fueleu_group_contacts.json — sourced separately
 * from the per-ship ShippingContact rows). Superset shape: `kind` classifies the contact (e.g.
 * PRESS, IR, COMPLIANCE) and `sourceQuote` is the exact quoted snippet backing it.
 */
export interface GroupContact {
  kind: string;
  name?: string;
  role?: string;
  email?: string;
  phone?: string;
  sourceUrl: string;
  sourceQuote?: string;
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
  compliance_balance_2026_tco2e: number;
  penalty_2026_y1_eur: number;
  penalty_2026_y2_eur: number;
  compliance_balance_2030_tco2e: number;
  penalty_2030_y1_eur: number;
  bio_lng_required_neg100_t: number;
  bio_lng_required_neg100_mwh: number;
  bio_lng_required_zero_t: number;
  client_savings_physical_eur: number;
  desk_margin_physical_eur: number;
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
  /** MRV-reported ets_co2_t (100% 2026 phase-in) plus an estimated CH4 CO2e add-on (see generator; N2O omitted). */
  ets_exposure_2026_tco2: number;
  ets_exposure_2026_eur: number;
  combined_regulatory_exposure_2026_eur: number;
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
  // Commercial group mapping (data/fueleu_group_map.json) — the group_id the DoC-holder company
  // is consolidated into for compliance-purchasing purposes; see scripts/build_fueleu_group_map.py.
  group_id: string;
  group_name: string;
  entityType: GroupEntityType;
  /** Corporate-parent link between two groups (e.g. msc-cruises -> msc); '' when none. Kept
   *  non-optional (empty-string sentinel) rather than `?:` so this large generated array's
   *  element shape stays uniform (an added always-toggling optional field on ~3,500 rows tips
   *  TypeScript's array-literal inference into a "union type too complex" error). */
  parent_group_id: string;
  /** Who typically bears marine fuel cost/FuelEU compliance cost for this row's segment (industry-typical default, not a fact about this specific company). */
  fuelCostBearer: FuelCostBearer;
}

/** Commercial group classification (data/fueleu_group_map.json). */
export type GroupEntityType = 'OWNER_OPERATOR' | 'THIRD_PARTY_MANAGER' | 'CRUISE' | 'UNKNOWN';

export type FuelCostBearerType = 'OWNER_OPERATOR' | 'TIME_CHARTERER' | 'MIXED';

export interface FuelCostBearer {
  typicalBearer: FuelCostBearerType;
  note: string;
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

/** FuelEU pool prices, taken by the caller from the FUELEU mark (see marketPrices.ts). */
export interface FuelEuPoolPrices {
  /** Price a deficit client pays the desk (mark offer). */
  offerEurPerTco2e: number;
  /** Price the desk pays a surplus holder (mark offer less the desk spread, or the explicit override). */
  bidEurPerTco2e: number;
  /** Desk pooling margin per tCO2e: offer less bid, never negative. */
  spreadEurPerTco2e: number;
}

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
  /** Pool prices from the FuelEU mark. When omitted (no mark loaded) the pooling figures come back null, never a default. */
  poolPrices?: FuelEuPoolPrices | null;
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
  /** Client saving on the pooling route (deficit) or surplus value at the desk bid. null when no FuelEU pool mark was supplied. */
  poolingSavingsEur: number | null;
  /** Desk margin on pooling. null when no FuelEU pool mark was supplied. */
  poolingArrangementMarginEur: number | null;
}
