import {
  VesselArchetype,
  VesselCalculationInput,
  VesselCalculationResult,
  FleetCapability,
  JointRegulatoryExposure,
  MarineBunkerQuotationInput,
  MarineBunkerQuotationResult,
  LngEngineType,
} from './types';
import { getAssumption, fuelEuPoolSpreadEurPerTco2e } from '../assumptions/registry';

/**
 * FuelEU Maritime Physical & Regulatory Constants
 * Source: Regulation (EU) 2023/1805, Annex I, II & IV
 */
/** Art. 4(2) reference value: 2020 fleet-average GHG intensity. Targets are reductions from it. */
export const FUELEU_REFERENCE_INTENSITY = 91.16; // gCO2e/MJ
export const FUELEU_TARGET_2025 = 89.3368; // 2% reduction vs 91.16 reference
export const FUELEU_TARGET_2030 = 85.6904; // 6% reduction vs 91.16 reference
export const FUELEU_TARGET_2035 = 77.9418; // 14.5% reduction vs 91.16 reference
export const FUELEU_TARGET_2040 = 62.9004; // 31% reduction vs 91.16 reference
export const FUELEU_TARGET_2045 = 34.6408; // 62% reduction vs 91.16 reference
export const FUELEU_TARGET_2050 = 18.2320; // 80% reduction vs 91.16 reference
/**
 * @deprecated The 91.16 g/MJ figure is the Art. 4(2) fleet *reference*, not the intensity of
 * any fuel. Use FUELEU_REFERENCE_INTENSITY for targets and FUELEU_VLSFO_WTW for VLSFO.
 */
export const FUELEU_BASELINE_VLSFO_CI = FUELEU_REFERENCE_INTENSITY;

/**
 * GHG intensity limit applicable to a reporting year — Regulation (EU) 2023/1805 Art. 4(2).
 * Each reduction step applies from 1 January of its milestone year until the next one.
 * Years before 2025 carry no FuelEU obligation and return the reference value.
 */
export function getFuelEUTargetIntensity(year: number): number {
  if (year >= 2050) return FUELEU_TARGET_2050;
  if (year >= 2045) return FUELEU_TARGET_2045;
  if (year >= 2040) return FUELEU_TARGET_2040;
  if (year >= 2035) return FUELEU_TARGET_2035;
  if (year >= 2030) return FUELEU_TARGET_2030;
  if (year >= 2025) return FUELEU_TARGET_2025;
  return FUELEU_REFERENCE_INTENSITY;
}

/**
 * Annex II default fuel factors. lcv in MJ/g; wtt in gCO2e/MJ; Cf in g/g fuel.
 * VLSFO (0.5% S, typically ISO 8217 RMG) falls in the HFO class (RME–RMK).
 */
export interface FuelEUFuelFactors {
  lcvMjPerG: number;
  wttGPerMj: number;
  cfCo2: number;
  cfCh4: number;
  cfN2o: number;
}
export const FUELEU_ANNEX_II: Record<'HFO' | 'LFO' | 'MGO' | 'LNG', FuelEUFuelFactors> = {
  HFO: { lcvMjPerG: 0.0405, wttGPerMj: 13.5, cfCo2: 3.114, cfCh4: 0.00005, cfN2o: 0.00018 },
  LFO: { lcvMjPerG: 0.041, wttGPerMj: 13.2, cfCo2: 3.151, cfCh4: 0.00005, cfN2o: 0.00018 },
  MGO: { lcvMjPerG: 0.0427, wttGPerMj: 14.4, cfCo2: 3.206, cfCh4: 0.00005, cfN2o: 0.00018 },
  LNG: { lcvMjPerG: 0.0491, wttGPerMj: 18.5, cfCo2: 2.750, cfCh4: 0, cfN2o: 0.00011 },
};
/** Annex I global warming potentials (100-year). */
export const FUELEU_GWP_CH4 = 25;
export const FUELEU_GWP_N2O = 298;

/** Annex II default methane slip (% of LNG fuel mass) by engine class. */
export const FUELEU_LNG_SLIP_PCT: Record<LngEngineType, number> = {
  LNG_OTTO_MS: 3.1,   // dual-fuel, medium speed
  LNG_OTTO_SS: 1.7,   // dual-fuel, slow speed (low-pressure two-stroke)
  LNG_DIESEL_SS: 0.2, // dual-fuel, slow speed (high-pressure diesel cycle)
  LBSI: 2.6,          // lean-burn spark-ignited
};
/** Desk default where a fleet's engine class is unknown: low-pressure two-stroke dual-fuel. */
export const DEFAULT_LNG_ENGINE: LngEngineType = 'LNG_OTTO_SS';

/**
 * Well-to-wake GHG intensity per Annex I:
 *   WtW = WtT + [(1 − Cslip)·(CfCO2 + CfCH4·GWP_CH4 + CfN2O·GWP_N2O) + Cslip·GWP_CH4] / LCV
 * For sustainable biofuels the combustion CO2 is biogenic (CfCO2 = 0) and WtT is the RED
 * lifecycle value — but CH4 slip and N2O are still counted.
 */
export function fuelEuWtwIntensity(
  f: FuelEUFuelFactors,
  slipPct: number = 0,
  opts: { biogenic?: boolean; wttGPerMj?: number } = {}
): number {
  const slip = slipPct / 100;
  const cfCo2 = opts.biogenic ? 0 : f.cfCo2;
  const combustion = cfCo2 + f.cfCh4 * FUELEU_GWP_CH4 + f.cfN2o * FUELEU_GWP_N2O;
  const ttw = ((1 - slip) * combustion + slip * FUELEU_GWP_CH4) / f.lcvMjPerG;
  return (opts.wttGPerMj ?? f.wttGPerMj) + ttw;
}

export const FUELEU_VLSFO_WTW = fuelEuWtwIntensity(FUELEU_ANNEX_II.HFO); // ≈ 91.74 gCO2e/MJ
export const FUELEU_MGO_WTW = fuelEuWtwIntensity(FUELEU_ANNEX_II.MGO);   // ≈ 90.77 gCO2e/MJ

/** Fossil LNG well-to-wake intensity for an engine class (Otto SS ≈ 82.87 gCO2e/MJ). */
export function fossilLngWtw(engine: LngEngineType = DEFAULT_LNG_ENGINE): number {
  return fuelEuWtwIntensity(FUELEU_ANNEX_II.LNG, FUELEU_LNG_SLIP_PCT[engine]);
}

/**
 * FuelEU intensity of Bio-LNG with RED lifecycle CI `redCi` (e.g. −100 for manure), including
 * the engine's tank-to-wake CH4 slip and N2O (Otto SS: −100 → ≈ −90.69 gCO2e/MJ).
 */
export function bioLngFuelEUIntensity(redCi: number, engine: LngEngineType = DEFAULT_LNG_ENGINE): number {
  return fuelEuWtwIntensity(FUELEU_ANNEX_II.LNG, FUELEU_LNG_SLIP_PCT[engine], { biogenic: true, wttGPerMj: redCi });
}

/** @deprecated Use FUELEU_MGO_WTW. */
export const FUELEU_BASELINE_MGO_CI = FUELEU_MGO_WTW;
/** @deprecated Use fossilLngWtw(engine). Default-engine value. */
export const FUELEU_FOSSIL_LNG_CI = fossilLngWtw();
export const FUELEU_STATUTORY_PENALTY_PER_TONNE = 2400; // €/tonne VLSFO equivalent
/** Annex IV fixed energy content of a tonne of VLSFO-equivalent in the penalty formula. */
export const FUELEU_PENALTY_VLSFO_MJ_PER_TONNE = 41000;

export const LHV_VLSFO_MJ_PER_TONNE = FUELEU_ANNEX_II.HFO.lcvMjPerG * 1_000_000; // 40,500 (HFO class)
export const LHV_MGO_MJ_PER_TONNE = FUELEU_ANNEX_II.MGO.lcvMjPerG * 1_000_000;   // 42,700
export const LHV_LNG_MJ_PER_TONNE = FUELEU_ANNEX_II.LNG.lcvMjPerG * 1_000_000;   // 49,100
export const LHV_BIO_LNG_MJ_PER_TONNE = LHV_LNG_MJ_PER_TONNE;
export const MJ_PER_MWH = 3600;

/**
 * EU ETS Maritime Physical & Regulatory Constants
 * Source: Directive (EU) 2023/959, MRV Maritime Regulation (EU) 2015/757
 */
export const EU_ETS_EMISSION_FACTOR_VLSFO = 3.114; // tCO2 / tonne fuel
export const EU_ETS_EMISSION_FACTOR_MGO = 3.206;   // tCO2 / tonne fuel
export const EU_ETS_EMISSION_FACTOR_LNG = 2.750;   // tCO2 / tonne fuel
export const EU_ETS_EMISSION_FACTOR_BIO_LNG = 0.000; // Zero-rated under RED III & EU ETS MRV
export const EU_ETS_PHASE_IN_2025 = 0.70;         // 70% phase-in in 2025
export const EU_ETS_PHASE_IN_2026 = 1.00;         // 100% full enforcement in 2026
export const EUA_BENCHMARK_EUR_PER_TONNE = 70.00; // €70.00 / tCO2

/**
 * Institutional Marine Bunker Quotation Constants
 */
export const LHV_BIO_LNG_GJ_PER_TONNE = LHV_BIO_LNG_MJ_PER_TONNE / 1000;          // 49.1 GJ/t Bio-LNG
export const MWH_PER_TONNE_BIO_LNG = LHV_BIO_LNG_MJ_PER_TONNE / MJ_PER_MWH;       // 13.6389 MWh/t
/** FuelEU compliance-balance pool price default: FUELEU benchmark mid (EUROPEAN_MARKET_BENCHMARKS). */
export const FUELEU_SURPLUS_BENCHMARK_EUR_PER_TCO2E = 285.0;
export const EUR_USD_DEFAULT_FX = 1.08;           // Institutional standard FX benchmark
export const DEFAULT_TTF_GAS_INDEX_EUR_MWH = 36.0;
export const DEFAULT_LIQUEFACTION_FEE_EUR_MWH = 14.0;
export const DEFAULT_GREEN_PREMIUM_EUR_MWH = 22.0;
export const DEFAULT_VLSFO_PRICE_USD_PER_TONNE = 600.0;

export const VESSEL_ARCHETYPES: VesselArchetype[] = [
  {
    id: 'ulcs_24k',
    name: 'Ultra Large Container Ship (ULCS 24k TEU)',
    segment: 'Container Liner',
    description: 'Premier Asia-North Europe express liner calling Rotterdam, Hamburg, Felixstowe. 50% extra-EU / 100% intra-EU scope.',
    dwtOrTeu: '24,000 TEU / 225,000 DWT',
    defaultVlsfoTonnes: 18000,
    defaultMgoTonnes: 1200,
    defaultLngTonnes: 0,
    defaultBioLngTonnes: 0,
    defaultBioLngCi: -100,
    typicalVoyageProfile: 'Shanghai/Singapore -> Suez -> Rotterdam -> Hamburg -> Felixstowe',
    keyPorts: ['Rotterdam', 'Hamburg', 'Antwerp', 'Felixstowe'],
  },
  {
    id: 'post_panamax_15k',
    name: 'Post-Panamax Boxship (15k TEU)',
    segment: 'Container Liner',
    description: 'Workhorse container liner deployed on Mediterranean, Transatlantic, or secondary Asia loops.',
    dwtOrTeu: '15,000 TEU / 150,000 DWT',
    defaultVlsfoTonnes: 12000,
    defaultMgoTonnes: 900,
    defaultLngTonnes: 0,
    defaultBioLngTonnes: 0,
    defaultBioLngCi: -100,
    typicalVoyageProfile: 'US East Coast / Med -> Piraeus -> Valencia -> Algeciras',
    keyPorts: ['Valencia', 'Algeciras', 'Piraeus', 'Genoa'],
  },
  {
    id: 'suezmax_160k',
    name: 'Suezmax Crude Tanker (160k DWT)',
    segment: 'Crude Tanker',
    description: 'Standard Aframax/Suezmax crude shuttle lifting North Sea, West Africa, or US Gulf crude into EU refinery hubs.',
    dwtOrTeu: '160,000 DWT',
    defaultVlsfoTonnes: 7500,
    defaultMgoTonnes: 500,
    defaultLngTonnes: 0,
    defaultBioLngTonnes: 0,
    defaultBioLngCi: -100,
    typicalVoyageProfile: 'West Africa / US Gulf -> Rotterdam (Maasvlakte) / Trieste / Fos',
    keyPorts: ['Rotterdam', 'Trieste', 'Fos-sur-Mer', 'Wilhelmshaven'],
  },
  {
    id: 'capesize_180k',
    name: 'Capesize Bulk Carrier (180k DWT)',
    segment: 'Dry Bulk',
    description: 'Major bulk carrier hauling iron ore, bauxite, and coking coal to European heavy industrial basins.',
    dwtOrTeu: '180,000 DWT',
    defaultVlsfoTonnes: 6000,
    defaultMgoTonnes: 400,
    defaultLngTonnes: 0,
    defaultBioLngTonnes: 0,
    defaultBioLngCi: -100,
    typicalVoyageProfile: 'Brazil (Tubarao) / Australia -> Rotterdam (EMO) / Dunkirk / Taranto',
    keyPorts: ['Rotterdam', 'Dunkirk', 'Taranto', 'Ijmuiden'],
  },
  {
    id: 'ropax_ferry',
    name: 'Ro-Pax Ferry (Large Baltic / North Sea)',
    segment: 'Passenger & Freight Ferry',
    description: '100% intra-EU scope! High-frequency passenger, vehicle, and freight lifeline ferry operating 365 days/year.',
    dwtOrTeu: '2,500 Pax / 3,000 Lane Metres',
    defaultVlsfoTonnes: 14000,
    defaultMgoTonnes: 2000,
    defaultLngTonnes: 0,
    defaultBioLngTonnes: 0,
    defaultBioLngCi: -100,
    typicalVoyageProfile: 'Tallinn-Helsinki / Dover-Calais / Holyhead-Dublin / Travemünde-Helsinki',
    keyPorts: ['Tallinn', 'Helsinki', 'Dover', 'Calais', 'Rostock'],
  },
  {
    id: 'pctc_7k',
    name: 'Pure Car & Truck Carrier (PCTC 7,000 CEU)',
    segment: 'Vehicle Carrier',
    description: 'Specialised pure car carrier distributing automotive exports between Asian/American plants and European auto hubs.',
    dwtOrTeu: '7,000 CEU / 20,000 DWT',
    defaultVlsfoTonnes: 8000,
    defaultMgoTonnes: 700,
    defaultLngTonnes: 0,
    defaultBioLngTonnes: 0,
    defaultBioLngCi: -100,
    typicalVoyageProfile: 'East Asia -> Suez -> Zeebrugge -> Bremerhaven -> Southampton',
    keyPorts: ['Zeebrugge', 'Bremerhaven', 'Southampton', 'Barcelona'],
  },
  {
    id: 'dual_fuel_lng_15k',
    name: 'Dual-Fuel LNG Container (15k TEU - Surplus Generator)',
    segment: 'Container Liner (Dual-Fuel LNG)',
    description: 'State-of-the-art dual-fuel LNG liner. Fossil LNG runs at ~82.9 gCO2e/MJ well-to-wake (Annex II, 1.7% slip), below the 2025 limit, so LNG-heavy voyage profiles generate Article 21 surplus balance.',
    dwtOrTeu: '15,000 TEU / 150,000 DWT',
    defaultVlsfoTonnes: 0,
    defaultMgoTonnes: 600,
    defaultLngTonnes: 10500,
    defaultBioLngTonnes: 0,
    defaultBioLngCi: -100,
    typicalVoyageProfile: 'Asia-North Europe loop with regular LNG bunkering in Rotterdam / Marseille',
    keyPorts: ['Rotterdam', 'Marseille', 'Hamburg', 'Valencia'],
  },
];

/**
 * Calculates FuelEU compliance balance, statutory penalty, and commercial pathway figures.
 */
export function calculateVesselExposure(input: VesselCalculationInput): VesselCalculationResult {
  const {
    vlsfoTonnes,
    mgoTonnes,
    lngTonnes,
    bioLngTonnes,
    bioLngCi,
    targetYear,
    consecutiveYearsNonCompliant,
  } = input;
  const lngEngine = input.lngEngineType ?? DEFAULT_LNG_ENGINE;

  const vlsfoMj = Math.max(0, vlsfoTonnes) * LHV_VLSFO_MJ_PER_TONNE;
  const mgoMj = Math.max(0, mgoTonnes) * LHV_MGO_MJ_PER_TONNE;
  const lngMj = Math.max(0, lngTonnes) * LHV_LNG_MJ_PER_TONNE;
  const bioLngMj = Math.max(0, bioLngTonnes) * LHV_BIO_LNG_MJ_PER_TONNE;

  const totalEnergyMj = vlsfoMj + mgoMj + lngMj + bioLngMj;
  const totalEnergyMwh = totalEnergyMj / MJ_PER_MWH;

  const targetGhgie = getFuelEUTargetIntensity(targetYear);

  if (totalEnergyMj <= 0) {
    return {
      totalEnergyMj: 0,
      totalEnergyMwh: 0,
      weightedGhgie: 0,
      targetGhgie,
      complianceBalanceTco2e: 0,
      isOverCompliant: true,
      statutoryPenaltyY1Eur: 0,
      statutoryPenaltyY2Eur: 0,
      bioLngRequiredNeg100Tonnes: 0,
      bioLngRequiredNeg100Mwh: 0,
      bioLngRequiredZeroCiTonnes: 0,
      bioLngRequiredZeroCiMwh: 0,
      physicalSavingsEur: 0,
      physicalTradingMarginEur: 0,
      poolingSavingsEur: 0,
      poolingArrangementMarginEur: 0,
    };
  }

  // Annex I/II well-to-wake intensities (fossil LNG and Bio-LNG include engine CH4 slip)
  const fossilLngIntensity = fossilLngWtw(lngEngine);
  const totalGhgGrams =
    vlsfoMj * FUELEU_VLSFO_WTW +
    mgoMj * FUELEU_MGO_WTW +
    lngMj * fossilLngIntensity +
    bioLngMj * bioLngFuelEUIntensity(bioLngCi, lngEngine);

  const weightedGhgie = totalGhgGrams / totalEnergyMj;

  // Compliance balance in tCO2e: positive = surplus, negative = deficit
  const complianceBalanceTco2e = ((targetGhgie - weightedGhgie) * totalEnergyMj) / 1000000;
  const isOverCompliant = complianceBalanceTco2e >= 0;

  // Escalation multiplier for consecutive non-compliant years (Regulation (EU) 2023/1805 Annex IV)
  const years = Math.max(1, consecutiveYearsNonCompliant);
  const penaltyMultiplierY1 = 1 + (years - 1) / 10;
  const penaltyMultiplierY2 = 1 + years / 10;

  let statutoryPenaltyY1Eur = 0;
  let statutoryPenaltyY2Eur = 0;
  let bioLngRequiredNeg100Tonnes = 0;
  let bioLngRequiredNeg100Mwh = 0;
  let bioLngRequiredZeroCiTonnes = 0;
  let bioLngRequiredZeroCiMwh = 0;
  let physicalSavingsEur = 0;
  let physicalTradingMarginEur = 0;
  let poolingSavingsEur = 0;
  let poolingArrangementMarginEur = 0;

  if (!isOverCompliant) {
    const absDeficitGrams = Math.abs(complianceBalanceTco2e) * 1000000;
    // Annex IV: penalty = |CB| / (GHGIE_actual × 41,000 MJ/t) × €2,400
    const vlsfoEqTonnes = absDeficitGrams / (weightedGhgie * FUELEU_PENALTY_VLSFO_MJ_PER_TONNE);

    statutoryPenaltyY1Eur = vlsfoEqTonnes * FUELEU_STATUTORY_PENALTY_PER_TONNE * penaltyMultiplierY1;
    statutoryPenaltyY2Eur = vlsfoEqTonnes * FUELEU_STATUTORY_PENALTY_PER_TONNE * penaltyMultiplierY2;

    // Bio-LNG required to bring the compliance balance to exactly 0. Bio-LNG *displaces* fuel
    // on the same voyages (energy unchanged): fossil LNG on LNG-capable fleets, otherwise VLSFO
    // (a notional figure — conventional-only fleets cannot burn LNG and close via pooling).
    // Each MJ displaced improves the balance by (displaced WtW − Bio-LNG WtW).
    const displacedIntensity = lngMj > 0 ? fossilLngIntensity : FUELEU_VLSFO_WTW;
    const deltaCiNeg100 = displacedIntensity - bioLngFuelEUIntensity(-100, lngEngine);
    const requiredBioEnergyMj = absDeficitGrams / deltaCiNeg100;
    bioLngRequiredNeg100Tonnes = requiredBioEnergyMj / LHV_BIO_LNG_MJ_PER_TONNE;
    bioLngRequiredNeg100Mwh = requiredBioEnergyMj / MJ_PER_MWH;

    // Bio-LNG at CI 0 required to bring compliance balance to exactly 0 (food waste / energy crops with CCS)
    const deltaCiZero = displacedIntensity - bioLngFuelEUIntensity(0, lngEngine);
    const requiredBioEnergyMjZero = absDeficitGrams / deltaCiZero;
    bioLngRequiredZeroCiTonnes = requiredBioEnergyMjZero / LHV_BIO_LNG_MJ_PER_TONNE;
    bioLngRequiredZeroCiMwh = requiredBioEnergyMjZero / MJ_PER_MWH;

    // Pathway 1: physical Bio-LNG bunkering (premium and desk margin: commercial assumptions register)
    const bioLngPremiumCost = bioLngRequiredNeg100Mwh * getAssumption('fueleu.bioLngPremiumEurPerMwh');
    physicalSavingsEur = Math.max(0, statutoryPenaltyY1Eur - bioLngPremiumCost);
    physicalTradingMarginEur = bioLngRequiredNeg100Mwh * getAssumption('fueleu.physicalDeskMarginEurPerMwh');

    // Pathway 2: Article 21 pooling — client pays the desk offer; desk keeps the offer − bid spread
    const poolDeficitCost = Math.abs(complianceBalanceTco2e) * getAssumption('fueleu.poolBuyPriceEurPerTco2e');
    poolingSavingsEur = Math.max(0, statutoryPenaltyY1Eur - poolDeficitCost);
    poolingArrangementMarginEur = Math.abs(complianceBalanceTco2e) * fuelEuPoolSpreadEurPerTco2e();
  } else {
    // Over-compliant fleet: surplus can be sold into a pool at the pool bid
    poolingSavingsEur = complianceBalanceTco2e * getAssumption('fueleu.poolSellPriceEurPerTco2e');
    poolingArrangementMarginEur = complianceBalanceTco2e * fuelEuPoolSpreadEurPerTco2e();
  }

  return {
    totalEnergyMj,
    totalEnergyMwh,
    weightedGhgie,
    targetGhgie,
    complianceBalanceTco2e,
    isOverCompliant,
    statutoryPenaltyY1Eur,
    statutoryPenaltyY2Eur,
    bioLngRequiredNeg100Tonnes,
    bioLngRequiredNeg100Mwh,
    bioLngRequiredZeroCiTonnes,
    bioLngRequiredZeroCiMwh,
    physicalSavingsEur,
    physicalTradingMarginEur,
    poolingSavingsEur,
    poolingArrangementMarginEur,
  };
}

/**
 * Calculates EU ETS Maritime Carbon Liability under Directive (EU) 2023/959.
 */
export function calculateEuEtsExposure(
  vlsfoTonnes: number,
  mgoTonnes: number,
  lngTonnes: number,
  euaPriceEur: number = EUA_BENCHMARK_EUR_PER_TONNE,
  fueleuPenaltyEur: number = 0
): JointRegulatoryExposure {
  const totalGrossCo2Tonnes = Number(
    (
      Math.max(0, vlsfoTonnes) * EU_ETS_EMISSION_FACTOR_VLSFO +
      Math.max(0, mgoTonnes) * EU_ETS_EMISSION_FACTOR_MGO +
      Math.max(0, lngTonnes) * EU_ETS_EMISSION_FACTOR_LNG
    ).toFixed(1)
  );

  const etsExposure2025Tco2 = Number((totalGrossCo2Tonnes * EU_ETS_PHASE_IN_2025).toFixed(1));
  const etsExposure2025Eur = Math.round(etsExposure2025Tco2 * euaPriceEur);

  const etsExposure2026Tco2 = Number((totalGrossCo2Tonnes * EU_ETS_PHASE_IN_2026).toFixed(1));
  const etsExposure2026Eur = Math.round(etsExposure2026Tco2 * euaPriceEur);

  const etsSavingsFromBioLngEur = Number(
    ((LHV_BIO_LNG_MJ_PER_TONNE / LHV_VLSFO_MJ_PER_TONNE) * EU_ETS_EMISSION_FACTOR_VLSFO * EU_ETS_PHASE_IN_2025 * euaPriceEur).toFixed(2)
  );

  return {
    totalGrossCo2Tonnes,
    etsExposure2025Tco2,
    etsExposure2025Eur,
    etsExposure2026Tco2,
    etsExposure2026Eur,
    combinedRegulatoryExposure2025Eur: etsExposure2025Eur + fueleuPenaltyEur,
    etsSavingsFromBioLngEur,
  };
}

/**
 * Classifies fleet into DUAL_FUEL_LNG vs CONVENTIONAL_ONLY and determines vessel split.
 */
export function calculateFleetCapability(
  vesselsInScope: number,
  vlsfoTonnes: number,
  mgoTonnes: number,
  lngTonnes: number
): {
  fleetCapability: FleetCapability;
  lngVesselsInScope: number;
  conventionalVesselsInScope: number;
} {
  const safeVessels = Math.max(1, vesselsInScope);
  if (lngTonnes <= 0) {
    return {
      fleetCapability: 'CONVENTIONAL_ONLY',
      lngVesselsInScope: 0,
      conventionalVesselsInScope: safeVessels,
    };
  }

  const vlsfoMj = Math.max(0, vlsfoTonnes) * LHV_VLSFO_MJ_PER_TONNE;
  const mgoMj = Math.max(0, mgoTonnes) * LHV_MGO_MJ_PER_TONNE;
  const lngMj = Math.max(0, lngTonnes) * LHV_LNG_MJ_PER_TONNE;
  const totalEnergy = vlsfoMj + mgoMj + lngMj;

  const lngShare = totalEnergy > 0 ? lngMj / totalEnergy : 0;
  let lngVessels = Math.round(safeVessels * lngShare);

  if (lngShare >= 0.90) {
    lngVessels = safeVessels;
  } else {
    lngVessels = Math.max(1, Math.min(safeVessels - 1, lngVessels));
  }

  const conventionalVessels = safeVessels - lngVessels;

  return {
    fleetCapability: 'DUAL_FUEL_LNG',
    lngVesselsInScope: lngVessels,
    conventionalVesselsInScope: conventionalVessels,
  };
}

/**
 * Institutional Marine Bunker Quotation Engine (€/t and $/t)
 * Models:
 * TTF Gas Index + Liquefaction & Terminalization Fee + Green Bio-LNG Premium
 * vs Alternative Conventional Compliance (VLSFO + FuelEU Deficit Penalty + EU ETS Allowance Cost)
 */
export function calculateMarineBunkerQuotation(
  input: MarineBunkerQuotationInput = {}
): MarineBunkerQuotationResult {
  const ttfGasIndex = input.ttfGasIndexEurMwh !== undefined ? input.ttfGasIndexEurMwh : DEFAULT_TTF_GAS_INDEX_EUR_MWH;
  const liquefactionFee = input.liquefactionFeeEurMwh !== undefined ? input.liquefactionFeeEurMwh : DEFAULT_LIQUEFACTION_FEE_EUR_MWH;
  const greenPremium = input.greenPremiumEurMwh !== undefined ? input.greenPremiumEurMwh : DEFAULT_GREEN_PREMIUM_EUR_MWH;
  const vlsfoPriceUsd = input.vlsfoPriceUsdPerTonne !== undefined ? input.vlsfoPriceUsdPerTonne : DEFAULT_VLSFO_PRICE_USD_PER_TONNE;
  const euaPriceEur = input.euaPriceEurPerTonne !== undefined ? input.euaPriceEurPerTonne : EUA_BENCHMARK_EUR_PER_TONNE;
  const eurUsdRate = input.eurUsdRate !== undefined ? input.eurUsdRate : EUR_USD_DEFAULT_FX;
  const bioLngCi = input.bioLngCi !== undefined ? input.bioLngCi : -100;
  const targetYear = input.targetYear !== undefined ? input.targetYear : 2025;
  const lngEngine = input.lngEngineType ?? DEFAULT_LNG_ENGINE;
  const surplusPriceEur = input.fuelEuSurplusPriceEurPerTco2e !== undefined
    ? input.fuelEuSurplusPriceEurPerTco2e
    : FUELEU_SURPLUS_BENCHMARK_EUR_PER_TCO2E;

  const targetGhgie = getFuelEUTargetIntensity(targetYear);

  // Bio-LNG Delivered Quote: €72/MWh benchmark x 13.6389 MWh/t (49.1 GJ/t LHV)
  const allInBioLngPriceEurMwh = Number((ttfGasIndex + liquefactionFee + greenPremium).toFixed(2));
  const allInBioLngPriceEurPerTonne = Number((allInBioLngPriceEurMwh * MWH_PER_TONNE_BIO_LNG).toFixed(2));
  const allInBioLngPriceUsdPerTonne = Number((allInBioLngPriceEurPerTonne * eurUsdRate).toFixed(2));

  // Conventional Comparison (VLSFO baseline)
  // 1 metric tonne Bio-LNG (49,100 MJ) delivers propulsion energy equivalent to ~1.1976 tonnes VLSFO
  const equivalentVlsfoTonnes = Number((LHV_BIO_LNG_MJ_PER_TONNE / LHV_VLSFO_MJ_PER_TONNE).toFixed(4));
  const vlsfoCostUsd = Number((equivalentVlsfoTonnes * vlsfoPriceUsd).toFixed(2));
  const vlsfoCostEur = Number((vlsfoCostUsd / eurUsdRate).toFixed(2));

  // EU ETS Liability incurred by burning the VLSFO-equivalent tonnage (2025 at 70% phase-in)
  const vlsfoCo2Tonnes = equivalentVlsfoTonnes * EU_ETS_EMISSION_FACTOR_VLSFO;
  // Directive (EU) 2023/959: 70% of 2025 emissions, 100% from 2026 onwards
  const phaseInRate = targetYear >= 2026 ? EU_ETS_PHASE_IN_2026 : EU_ETS_PHASE_IN_2025;
  const vlsfoEtsLiabilityEur = Number((vlsfoCo2Tonnes * phaseInRate * euaPriceEur).toFixed(2));
  const vlsfoEtsLiabilityUsd = Number((vlsfoEtsLiabilityEur * eurUsdRate).toFixed(2));

  // FuelEU statutory penalty on the conventional alternative (Reg. (EU) 2023/1805 Annex IV):
  // burning 49,100 MJ of VLSFO at 91.16 g/MJ against the target leaves a deficit of
  // (91.16 - target) x 49,100 g, penalised at EUR 2,400 per tonne VLSFO-eq of that energy gap.
  const vlsfoDeficitGrams = Math.max(0, FUELEU_VLSFO_WTW - targetGhgie) * LHV_BIO_LNG_MJ_PER_TONNE;
  const vlsfoFuelEuPenaltyEur = Number(
    ((vlsfoDeficitGrams / (FUELEU_VLSFO_WTW * FUELEU_PENALTY_VLSFO_MJ_PER_TONNE)) * FUELEU_STATUTORY_PENALTY_PER_TONNE).toFixed(2)
  );
  const vlsfoFuelEuPenaltyUsd = Number((vlsfoFuelEuPenaltyEur * eurUsdRate).toFixed(2));

  // Bio-LNG compliance surplus vs the target (CI-dependent), monetised at the pool price.
  // Above-target Bio-LNG generates no surplus.
  const fuelEuSurplusTco2ePerTonne = Number(
    ((Math.max(0, targetGhgie - bioLngFuelEUIntensity(bioLngCi, lngEngine)) * LHV_BIO_LNG_MJ_PER_TONNE) / 1_000_000).toFixed(4)
  );
  const fuelEuSurplusValueEurPerTonne = Number((fuelEuSurplusTco2ePerTonne * surplusPriceEur).toFixed(2));
  const fuelEuSurplusValueUsdPerTonne = Number((fuelEuSurplusValueEurPerTonne * eurUsdRate).toFixed(2));

  // Total Conventional Alternative Cost (VLSFO fuel + ETS liability + FuelEU penalty)
  const totalConventionalAlternativeCostEur = Number(
    (vlsfoCostEur + vlsfoEtsLiabilityEur + vlsfoFuelEuPenaltyEur).toFixed(2)
  );
  const totalConventionalAlternativeCostUsd = Number(
    (vlsfoCostUsd + vlsfoEtsLiabilityUsd + vlsfoFuelEuPenaltyUsd).toFixed(2)
  );

  // Regulatory value created per tonne: avoided FuelEU penalty + monetised surplus + avoided EU ETS liability
  const fuelEuFleetPenaltyAvoidedEurPerTonne = vlsfoFuelEuPenaltyEur;
  const etsAvoidedEurPerTonne = vlsfoEtsLiabilityEur;
  const totalRegulatoryValueEurPerTonne = Number(
    (fuelEuFleetPenaltyAvoidedEurPerTonne + fuelEuSurplusValueEurPerTonne + etsAvoidedEurPerTonne).toFixed(2)
  );

  // Net Client Advantage / Savings per tonne Bio-LNG:
  // Evaluated against conventional alternative: (Delivered VLSFO-equivalent compliance cost) - (All-in delivered Bio-LNG price)
  // = (VLSFO fuel + ETS + FuelEU penalty) - (All-in Bio-LNG price - FuelEU surplus value)
  const netSavingsPerTonneBioLngEur = Number(
    (totalConventionalAlternativeCostEur - allInBioLngPriceEurPerTonne + fuelEuSurplusValueEurPerTonne).toFixed(2)
  );
  const netSavingsPerTonneBioLngUsd = Number(
    (totalConventionalAlternativeCostUsd - allInBioLngPriceUsdPerTonne + fuelEuSurplusValueUsdPerTonne).toFixed(2)
  );

  const result: MarineBunkerQuotationResult = {
    allInBioLngPriceEurMwh,
    allInBioLngPriceEurPerTonne,
    allInBioLngPriceUsdPerTonne,
    mwhPerTonneBioLng: MWH_PER_TONNE_BIO_LNG,
    equivalentVlsfoTonnes,
    vlsfoCostUsd,
    vlsfoCostEur,
    vlsfoEtsLiabilityEur,
    vlsfoEtsLiabilityUsd,
    vlsfoFuelEuPenaltyEur,
    vlsfoFuelEuPenaltyUsd,
    totalConventionalAlternativeCostEur,
    totalConventionalAlternativeCostUsd,
    fuelEuFleetPenaltyAvoidedEurPerTonne,
    fuelEuSurplusTco2ePerTonne,
    fuelEuSurplusPriceEurPerTco2e: surplusPriceEur,
    fuelEuSurplusValueEurPerTonne,
    etsAvoidedEurPerTonne,
    totalRegulatoryValueEurPerTonne,
    netSavingsPerTonneBioLngEur,
    netSavingsPerTonneBioLngUsd,
  };

  if (input.bioLngVolumeTonnes && input.bioLngVolumeTonnes > 0) {
    const vol = input.bioLngVolumeTonnes;
    result.dealVolumeTonnes = vol;
    result.dealVolumeMwh = Math.round(vol * MWH_PER_TONNE_BIO_LNG);
    result.totalBioLngInvoiceEur = Math.round(vol * allInBioLngPriceEurPerTonne);
    result.totalBioLngInvoiceUsd = Math.round(vol * allInBioLngPriceUsdPerTonne);
    result.totalClientSavingsEur = Math.round(vol * netSavingsPerTonneBioLngEur);
    result.totalClientSavingsUsd = Math.round(vol * netSavingsPerTonneBioLngUsd);
    result.totalEtsAvoidedTco2 = Math.round(vol * vlsfoCo2Tonnes * phaseInRate);
  }

  return result;
}
