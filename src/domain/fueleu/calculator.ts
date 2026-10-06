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
import { getAssumption } from '../assumptions/registry';

/**
 * FuelEU Maritime Physical & Regulatory Constants
 * Source: Regulation (EU) 2023/1805, Annex I, II & IV
 */
/** Art. 4(2) reference value: 2020 fleet-average GHG intensity. Targets are reductions from it. */
export const FUELEU_REFERENCE_INTENSITY = 91.16; // gCO2e/MJ
export const FUELEU_TARGET_2025 = 89.3368; // 2% reduction vs 91.16 reference
/** The compliance year this desk actively works: the 2025 target step (89.3368 g/MJ, Art. 4(2))
 *  applies unchanged through 2029, so 2026 carries the same target as 2025. */
export const FUELEU_ACTIVE_PERIOD = 2026;
export const FUELEU_TARGET_2026 = FUELEU_TARGET_2025;
/**
 * Statutory deadlines for the FUELEU_ACTIVE_PERIOD (2026) reporting period, falling in the
 * following calendar year's "verification period" (Regulation (EU) 2023/1805):
 *  - Art. 20(3) (banking/borrowing) and Art. 21(8) (pooling): the company/verifier must record
 *    banking, borrowing, or a pool's definitive composition in the FuelEU database "by 30 April
 *    of the verification period".
 *  - Art. 23(2): the company must pay any FuelEU penalty "by 30 June of the verification period".
 */
export const FUELEU_POOLING_BORROWING_DATABASE_DEADLINE = '2027-04-30'; // Art. 20(3) / Art. 21(8)
export const FUELEU_DOCUMENT_OF_COMPLIANCE_AND_PENALTY_DEADLINE = '2027-06-30'; // Art. 22(1)-(2) / Art. 23(2)
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
 * VLSFO (0.5% S, typically ISO 8217 RME–RMK) falls in the HFO class. VLSFO sold as ISO 8217 RMD 80
 * is LFO-class instead (see FUELEU_LFO_WTW below) — the desk assumes HFO class unless told otherwise.
 *
 * Bio-LNG (row "BIO-LNG" in Annex II) takes its LCV/col.3 value "as set out in Annex III of
 * Directive (EU) 2018/2001": biomethane 50 MJ/kg = 0.050 MJ/g. Its combustion factors (Cf_CO2,
 * Cf_CH4, Cf_N2O) are the same physical combustion products as fossil LNG — only the well-to-tank
 * term (wttGPerMj) differs, and is supplied per-shipment from the RED lifecycle value E
 * (see bioLngFuelEUIntensity), so the wttGPerMj entry here is a placeholder.
 */
export interface FuelEUFuelFactors {
  lcvMjPerG: number;
  wttGPerMj: number;
  cfCo2: number;
  cfCh4: number;
  cfN2o: number;
}
export const FUELEU_ANNEX_II: Record<'HFO' | 'LFO' | 'MGO' | 'LNG' | 'BIO_LNG', FuelEUFuelFactors> = {
  HFO: { lcvMjPerG: 0.0405, wttGPerMj: 13.5, cfCo2: 3.114, cfCh4: 0.00005, cfN2o: 0.00018 },
  LFO: { lcvMjPerG: 0.041, wttGPerMj: 13.2, cfCo2: 3.151, cfCh4: 0.00005, cfN2o: 0.00018 },
  MGO: { lcvMjPerG: 0.0427, wttGPerMj: 14.4, cfCo2: 3.206, cfCh4: 0.00005, cfN2o: 0.00018 },
  LNG: { lcvMjPerG: 0.0491, wttGPerMj: 18.5, cfCo2: 2.750, cfCh4: 0, cfN2o: 0.00011 },
  // Annex II col. 3 → RED Annex III (Directive (EU) 2018/2001) biomethane LCV = 50 MJ/kg = 0.050 MJ/g.
  // Combustion factors: same molecule/engine as fossil LNG (Cf_CO2 2.750, Cf_CH4 0, Cf_N2O 0.00011).
  BIO_LNG: { lcvMjPerG: 0.050, wttGPerMj: 0, cfCo2: 2.750, cfCh4: 0, cfN2o: 0.00011 },
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
 * `wttGPerMj` defaults to the fuel's own Annex II well-to-tank value, but can be overridden
 * (e.g. Bio-LNG's per-shipment RED lifecycle value, already adjusted per the Annex II note —
 * see bioLngFuelEUIntensity).
 */
export function fuelEuWtwIntensity(
  f: FuelEUFuelFactors,
  slipPct: number = 0,
  opts: { wttGPerMj?: number } = {}
): number {
  const slip = slipPct / 100;
  const combustion = f.cfCo2 + f.cfCh4 * FUELEU_GWP_CH4 + f.cfN2o * FUELEU_GWP_N2O;
  const ttw = ((1 - slip) * combustion + slip * FUELEU_GWP_CH4) / f.lcvMjPerG;
  return (opts.wttGPerMj ?? f.wttGPerMj) + ttw;
}

export const FUELEU_VLSFO_WTW = fuelEuWtwIntensity(FUELEU_ANNEX_II.HFO); // ≈ 91.74 gCO2e/MJ
export const FUELEU_MGO_WTW = fuelEuWtwIntensity(FUELEU_ANNEX_II.MGO);   // ≈ 90.77 gCO2e/MJ
/** VLSFO sold as ISO 8217 RMD 80 is LFO-class, not HFO-class (Annex II row LFO). */
export const FUELEU_LFO_WTW = fuelEuWtwIntensity(FUELEU_ANNEX_II.LFO);  // ≈ 91.39 gCO2e/MJ

/** Fossil LNG well-to-wake intensity for an engine class (Otto SS ≈ 82.87 gCO2e/MJ). */
export function fossilLngWtw(engine: LngEngineType = DEFAULT_LNG_ENGINE): number {
  return fuelEuWtwIntensity(FUELEU_ANNEX_II.LNG, FUELEU_LNG_SLIP_PCT[engine]);
}

/**
 * FuelEU well-to-wake intensity of Bio-LNG with RED lifecycle value `redCi` (e.g. −100 for
 * manure), including the engine's tank-to-wake CH4 slip and N2O.
 *
 * Regulation (EU) 2023/1805, Annex II explanatory note on column 4 (reg1805.txt l.1099):
 * "the default values of E [RED lifecycle GHG intensity] need to be adjusted by subtracting the
 * ratio of the emission factor for CO2 ... and the [LCV]" — i.e. WtT = E − Cf_CO2/LCV. The
 * combustion (TtW) term of Annex I Eq. (1) is otherwise unchanged: Cf_CO2 stays inside the
 * (1 − Cslip) bracket, so unslipped Bio-LNG still emits its physical CO2 (it isn't zeroed) while
 * the WtT credit already accounts for it being biogenic.
 * ESSF SAPS WS1 FuelEU calculation methodologies (worked example, p.78):
 * https://www.intercargo.org/wp-content/uploads/2025/05/2025-May-ESSF-SAPS-WS1-FuelEU-calculation-methodologies.pdf
 */
export function bioLngFuelEUIntensity(redCi: number, engine: LngEngineType = DEFAULT_LNG_ENGINE): number {
  const f = FUELEU_ANNEX_II.BIO_LNG;
  const adjustedWtt = redCi - f.cfCo2 / f.lcvMjPerG; // Annex II note: E − Cf_CO2/LCV
  return fuelEuWtwIntensity(f, FUELEU_LNG_SLIP_PCT[engine], { wttGPerMj: adjustedWtt });
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
/** Annex II col. 3 → RED Annex III biomethane LCV: 50 MJ/kg = 50,000 MJ/t. */
export const LHV_BIO_LNG_MJ_PER_TONNE = 50_000;
export const MJ_PER_MWH = 3600;

/**
 * Art. 2(1): FuelEU Maritime scope counts intra-EU voyages and at-berth energy at 100%, and
 * voyages to/from a third-country port at 50% (energy is split 50/50 between the EU and
 * third-country legs). `shareThirdCountryVoyages` is the fraction (0..1) of a fleet's annual
 * energy consumed on such voyages; the rest is already 100% in scope (intra-EU + at-berth).
 */
export function fuelEuInScopeFactor(shareThirdCountryVoyages: number): number {
  const share = Math.min(1, Math.max(0, shareThirdCountryVoyages || 0));
  return 1 - 0.5 * share;
}

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

/**
 * From 1 January 2026, CH4 and N2O emissions from shipping enter the EU ETS alongside CO2
 * (Directive 2003/87/EC as amended by Directive (EU) 2023/959, Art. 3ga referencing the MRV
 * Regulation (EU) 2015/757 as amended by Commission Delegated Regulation (EU) 2023/2776).
 * GWP-100 values: N2O = 298 tCO2(e)/tN2O is directly confirmed in the EU ETS Monitoring &
 * Reporting Regulation (Commission Implementing Regulation (EU) 2018/2066, Annex VI, Table 6:
 * "N2O: 298 t CO2(e) / t N2O" — https://www.legislation.gov.uk/eur/2018/2066/annex/VI), which is
 * the IPCC AR4 GWP-100 set (the same one FuelEU Annex I uses: 25/298, not the AR5 28/265 pair).
 * CH4 = 25 tCO2(e)/tCH4 is NOT independently quoted in the fetched text of that table (only N2O,
 * CF4 and C2F6 appear there) — UNVERIFIED for CH4 specifically. Since the N2O figure confirms the
 * table uses the AR4 GWP set, and FuelEU's own Annex I CH4 GWP is 25 (AR4), this implementation
 * uses 25/298 (FUELEU_GWP_CH4 / FUELEU_GWP_N2O) rather than guess a different, unconfirmed pair.
 * Slipped LNG mass is assumed to escape uncombusted as CH4 (consistent with Annex I's Csf_CH4 = 1
 * treatment of slip); N2O is assigned to the combusted (non-slipped) fuel mass.
 */
export function lngEtsNonCo2Co2eTonnes(tonnes: number, engine: LngEngineType = DEFAULT_LNG_ENGINE): number {
  const s = FUELEU_LNG_SLIP_PCT[engine] / 100;
  const safeTonnes = Math.max(0, tonnes);
  const ch4Co2e = safeTonnes * s * FUELEU_GWP_CH4;
  const n2oCo2e = safeTonnes * (1 - s) * FUELEU_ANNEX_II.LNG.cfN2o * FUELEU_GWP_N2O;
  return ch4Co2e + n2oCo2e;
}

/**
 * Institutional Marine Bunker Quotation Constants
 */
export const LHV_BIO_LNG_GJ_PER_TONNE = LHV_BIO_LNG_MJ_PER_TONNE / 1000;          // 50 GJ/t Bio-LNG
export const MWH_PER_TONNE_BIO_LNG = LHV_BIO_LNG_MJ_PER_TONNE / MJ_PER_MWH;       // 13.8889 MWh/t
/** Desk assumption, read at call time — not a module-level constant — so a Pricing desk edit
 * applies without a reload. */
export function eurUsdDefaultFx(): number {
  return getAssumption('fueleu.eurUsdFxRate');
}
export function defaultLiquefactionFeeEurMwh(): number {
  return getAssumption('fueleu.liquefactionFeeEurPerMwh');
}
export function defaultGreenPremiumEurMwh(): number {
  return getAssumption('fueleu.greenPremiumEurPerMwh');
}
/**
 * @deprecated No longer used by calculateMarineBunkerQuotation: only LNG-capable ships can burn
 * Bio-LNG, so the quote's counterfactual is fossil LNG on the same engine, not VLSFO. Kept as a
 * function so existing UI state (a VLSFO price slider) still compiles.
 */
export function defaultVlsfoPriceUsdPerTonne(): number {
  return getAssumption('fueleu.defaultVlsfoPriceUsdPerTonne');
}

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
    defaultShareThirdCountryVoyages: 0.5,
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
    defaultShareThirdCountryVoyages: 0.5,
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
    defaultShareThirdCountryVoyages: 0.5,
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
    defaultShareThirdCountryVoyages: 0.5,
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
    defaultShareThirdCountryVoyages: 0.0,
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
    defaultShareThirdCountryVoyages: 0.5,
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
    defaultShareThirdCountryVoyages: 0.5,
  },
];

/**
 * Annex IV Part B statutory penalty with the Art. 23(2) consecutive-year multiplier:
 *   penalty = |CB| / (GHGIE_actual × 41,000 MJ/t) × €2,400 × [1 + (n − 1)/10]
 * `deficitTco2e` may be passed as a negative deficit or its magnitude — only the magnitude is used.
 */
export function penaltyEur(deficitTco2e: number, actualGhgie: number, consecutiveYears: number = 1): number {
  if (actualGhgie <= 0) return 0;
  const years = Math.max(1, consecutiveYears);
  const multiplier = 1 + (years - 1) / 10;
  const absDeficitGrams = Math.abs(deficitTco2e) * 1_000_000;
  const vlsfoEqTonnes = absDeficitGrams / (actualGhgie * FUELEU_PENALTY_VLSFO_MJ_PER_TONNE);
  return vlsfoEqTonnes * FUELEU_STATUTORY_PENALTY_PER_TONNE * multiplier;
}

/**
 * Bio-LNG energy/tonnage needed to close a FuelEU compliance deficit by displacing a fuel of
 * `displacedIntensity` (fossil LNG on LNG-capable fleets, VLSFO otherwise) with Bio-LNG of RED CI
 * `bioLngCi`, voyage energy unchanged. Each MJ displaced improves the balance by
 * (displacedIntensity − bioWtW), so energy = |deficit| × 1e6 / (displacedIntensity − bioWtW).
 */
export function closeDeficitWithBioLng(params: {
  deficitTco2e: number;
  displacedIntensity: number;
  bioLngCi: number;
  lngEngine?: LngEngineType;
}): { energyMj: number; mwh: number; tonnes: number } {
  const engine = params.lngEngine ?? DEFAULT_LNG_ENGINE;
  const bioWtw = bioLngFuelEUIntensity(params.bioLngCi, engine);
  const deltaCi = params.displacedIntensity - bioWtw;
  const absDeficitGrams = Math.abs(params.deficitTco2e) * 1_000_000;
  const energyMj = deltaCi > 0 ? absDeficitGrams / deltaCi : 0;
  return {
    energyMj,
    mwh: energyMj / MJ_PER_MWH,
    tonnes: energyMj / LHV_BIO_LNG_MJ_PER_TONNE,
  };
}

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
  // Art. 2(1): third-country voyage energy counts 50%; intra-EU/at-berth counts 100%.
  const scopeFactor = fuelEuInScopeFactor(input.shareThirdCountryVoyages ?? 0);

  const vlsfoMj = Math.max(0, vlsfoTonnes) * scopeFactor * LHV_VLSFO_MJ_PER_TONNE;
  const mgoMj = Math.max(0, mgoTonnes) * scopeFactor * LHV_MGO_MJ_PER_TONNE;
  const lngMj = Math.max(0, lngTonnes) * scopeFactor * LHV_LNG_MJ_PER_TONNE;
  const bioLngMj = Math.max(0, bioLngTonnes) * scopeFactor * LHV_BIO_LNG_MJ_PER_TONNE;

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

  // Escalation multiplier years for consecutive non-compliance (Regulation (EU) 2023/1805 Art. 23(2))
  const years = Math.max(1, consecutiveYearsNonCompliant);

  let statutoryPenaltyY1Eur = 0;
  let statutoryPenaltyY2Eur = 0;
  let bioLngRequiredNeg100Tonnes = 0;
  let bioLngRequiredNeg100Mwh = 0;
  let bioLngRequiredZeroCiTonnes = 0;
  let bioLngRequiredZeroCiMwh = 0;
  let physicalSavingsEur = 0;
  let physicalTradingMarginEur = 0;
  let poolingSavingsEur: number | null = 0;
  let poolingArrangementMarginEur: number | null = 0;
  const poolPrices = input.poolPrices ?? null;

  if (!isOverCompliant) {
    statutoryPenaltyY1Eur = penaltyEur(complianceBalanceTco2e, weightedGhgie, years);
    statutoryPenaltyY2Eur = penaltyEur(complianceBalanceTco2e, weightedGhgie, years + 1);

    // Bio-LNG required to bring the compliance balance to exactly 0. Bio-LNG *displaces* fuel
    // on the same voyages (energy unchanged): fossil LNG on LNG-capable fleets, otherwise VLSFO
    // (a notional figure — conventional-only fleets cannot burn LNG and close via pooling).
    const displacedIntensity = lngMj > 0 ? fossilLngIntensity : FUELEU_VLSFO_WTW;
    const neg100 = closeDeficitWithBioLng({
      deficitTco2e: complianceBalanceTco2e,
      displacedIntensity,
      bioLngCi: -100,
      lngEngine,
    });
    bioLngRequiredNeg100Tonnes = neg100.tonnes;
    bioLngRequiredNeg100Mwh = neg100.mwh;

    // Bio-LNG at CI 0 required to bring compliance balance to exactly 0 (food waste / energy crops with CCS)
    const zero = closeDeficitWithBioLng({
      deficitTco2e: complianceBalanceTco2e,
      displacedIntensity,
      bioLngCi: 0,
      lngEngine,
    });
    bioLngRequiredZeroCiTonnes = zero.tonnes;
    bioLngRequiredZeroCiMwh = zero.mwh;

    // Pathway 1: physical Bio-LNG bunkering (premium and desk margin: commercial assumptions register)
    const bioLngPremiumCost = bioLngRequiredNeg100Mwh * getAssumption('fueleu.bioLngPremiumEurPerMwh');
    physicalSavingsEur = Math.max(0, statutoryPenaltyY1Eur - bioLngPremiumCost);
    physicalTradingMarginEur = bioLngRequiredNeg100Mwh * getAssumption('fueleu.physicalDeskMarginEurPerMwh');

    // Pathway 2: Article 21 pooling — client pays the desk offer; desk keeps the offer − bid spread
    // The pool prices come from the FUELEU mark, passed in by the caller. No mark, no figure.
    if (poolPrices) {
      const poolDeficitCost = Math.abs(complianceBalanceTco2e) * poolPrices.offerEurPerTco2e;
      poolingSavingsEur = Math.max(0, statutoryPenaltyY1Eur - poolDeficitCost);
      poolingArrangementMarginEur = Math.abs(complianceBalanceTco2e) * poolPrices.spreadEurPerTco2e;
    } else {
      poolingSavingsEur = null;
      poolingArrangementMarginEur = null;
    }
  } else {
    // Over-compliant fleet: surplus can be sold into a pool at the pool bid
    if (poolPrices) {
      poolingSavingsEur = complianceBalanceTco2e * poolPrices.bidEurPerTco2e;
      poolingArrangementMarginEur = complianceBalanceTco2e * poolPrices.spreadEurPerTco2e;
    } else {
      poolingSavingsEur = null;
      poolingArrangementMarginEur = null;
    }
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
  euaPriceEur: number,
  fueleuPenaltyEur: number = 0,
  lngEngineType: LngEngineType = DEFAULT_LNG_ENGINE
): JointRegulatoryExposure {
  const totalGrossCo2Tonnes = Number(
    (
      Math.max(0, vlsfoTonnes) * EU_ETS_EMISSION_FACTOR_VLSFO +
      Math.max(0, mgoTonnes) * EU_ETS_EMISSION_FACTOR_MGO +
      Math.max(0, lngTonnes) * EU_ETS_EMISSION_FACTOR_LNG
    ).toFixed(1)
  );

  // 2025: CO2 only, 70% phase-in.
  const etsExposure2025Tco2 = Number((totalGrossCo2Tonnes * EU_ETS_PHASE_IN_2025).toFixed(1));
  const etsExposure2025Eur = Math.round(etsExposure2025Tco2 * euaPriceEur);

  // From 2026: 100% phase-in, plus LNG CH4 slip and N2O enter the EU ETS (see lngEtsNonCo2Co2eTonnes).
  const lngNonCo2Tco2e = lngEtsNonCo2Co2eTonnes(Math.max(0, lngTonnes), lngEngineType);
  const etsExposure2026Tco2 = Number((totalGrossCo2Tonnes * EU_ETS_PHASE_IN_2026 + lngNonCo2Tco2e).toFixed(1));
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
 * Models: TTF Gas Index + Liquefaction & Terminalization Fee + Green Bio-LNG Premium
 * vs the Alternative Conventional Compliance route.
 *
 * Only LNG-capable ships can burn Bio-LNG, so their real alternative to bunkering Bio-LNG is
 * bunkering fossil LNG on the same engine (not VLSFO) — fossil LNG fuel cost (TTF + liquefaction,
 * no green premium) + EU ETS liability (Annex II Cf_CO2, plus CH4/N2O from 2026) + FuelEU
 * compliance balance (Annex IV penalty if a deficit, pool-bid credit if a surplus — fossil LNG is
 * usually already below the target).
 */
export function calculateMarineBunkerQuotation(
  input: MarineBunkerQuotationInput
): MarineBunkerQuotationResult {
  const ttfGasIndex = input.ttfGasIndexEurMwh;
  const liquefactionFee = input.liquefactionFeeEurMwh !== undefined ? input.liquefactionFeeEurMwh : defaultLiquefactionFeeEurMwh();
  const greenPremium = input.greenPremiumEurMwh !== undefined ? input.greenPremiumEurMwh : defaultGreenPremiumEurMwh();
  const euaPriceEur = input.euaPriceEurPerTonne;
  const eurUsdRate = input.eurUsdRate !== undefined ? input.eurUsdRate : eurUsdDefaultFx();
  const bioLngCi = input.bioLngCi !== undefined ? input.bioLngCi : -100;
  const targetYear = input.targetYear !== undefined ? input.targetYear : 2025;
  const lngEngine = input.lngEngineType ?? DEFAULT_LNG_ENGINE;
  const consecutiveYears = input.consecutiveYearsNonCompliant ?? 1;
  // Surplus/deficit compliance balance is valued at the desk bid (the price a surplus holder is
  // actually paid), not a fixed benchmark — Regulation (EU) 2023/1805 sets no statutory price.
  const surplusPriceEur = input.fuelEuSurplusPriceEurPerTco2e;

  const targetGhgie = getFuelEUTargetIntensity(targetYear);
  const fossilLngIntensity = fossilLngWtw(lngEngine);
  const bioLngIntensity = bioLngFuelEUIntensity(bioLngCi, lngEngine);

  // Bio-LNG Delivered Quote: e.g. €72/MWh benchmark x 13.8889 MWh/t (50 GJ/t LHV) = €1,000.00/t
  const allInBioLngPriceEurMwh = Number((ttfGasIndex + liquefactionFee + greenPremium).toFixed(2));
  const allInBioLngPriceEurPerTonne = Number((allInBioLngPriceEurMwh * MWH_PER_TONNE_BIO_LNG).toFixed(2));
  const allInBioLngPriceUsdPerTonne = Number((allInBioLngPriceEurPerTonne * eurUsdRate).toFixed(2));

  // Fossil-LNG counterfactual, scaled to the same energy as 1 tonne of Bio-LNG (50,000 MJ).
  const equivalentFossilLngTonnes = Number((LHV_BIO_LNG_MJ_PER_TONNE / LHV_LNG_MJ_PER_TONNE).toFixed(4));
  const fossilLngPriceEurPerMwh = ttfGasIndex + liquefactionFee; // no green premium on fossil gas
  const fossilLngCostEur = Number((fossilLngPriceEurPerMwh * MWH_PER_TONNE_BIO_LNG).toFixed(2));
  const fossilLngCostUsd = Number((fossilLngCostEur * eurUsdRate).toFixed(2));

  // EU ETS liability on the fossil-LNG-equivalent tonnage: Annex II Cf_CO2, phase-in, plus
  // CH4 slip + N2O CO2e from 2026 (Directive (EU) 2023/959).
  const phaseInRate = targetYear >= 2026 ? EU_ETS_PHASE_IN_2026 : EU_ETS_PHASE_IN_2025;
  const fossilLngCo2Tonnes = equivalentFossilLngTonnes * EU_ETS_EMISSION_FACTOR_LNG;
  let fossilLngEtsTco2e = fossilLngCo2Tonnes * phaseInRate;
  if (targetYear >= 2026) {
    fossilLngEtsTco2e += lngEtsNonCo2Co2eTonnes(equivalentFossilLngTonnes, lngEngine);
  }
  const fossilLngEtsLiabilityEur = Number((fossilLngEtsTco2e * euaPriceEur).toFixed(2));
  const fossilLngEtsLiabilityUsd = Number((fossilLngEtsLiabilityEur * eurUsdRate).toFixed(2));

  // Bio-LNG: CO2 from sustainable biomass is zero-rated under the EU ETS, but methane slip and N2O are
  // not (they are not biogenic CO2). From 2026 they are surrendered exactly as for fossil LNG in the same
  // engine. Commission maritime ETS FAQ: zero-rating covers "emissions resulting from the combustion of
  // sustainable biomass"; CH4/N2O enter the ETS from 2026.
  const bioLngEtsTco2e = targetYear >= 2026 ? lngEtsNonCo2Co2eTonnes(1, lngEngine) : 0;
  const bioLngEtsLiabilityEur = Number((bioLngEtsTco2e * euaPriceEur).toFixed(2));
  const bioLngEtsLiabilityUsd = Number((bioLngEtsLiabilityEur * eurUsdRate).toFixed(2));

  // FuelEU compliance balance of burning fossil LNG instead, on the same energy basis:
  // positive = surplus (credited at the desk bid), negative = deficit (Annex IV penalty).
  const fossilLngBalanceTco2e = ((targetGhgie - fossilLngIntensity) * LHV_BIO_LNG_MJ_PER_TONNE) / 1_000_000;
  const fossilLngFuelEuBalanceEur = Number(
    (fossilLngBalanceTco2e >= 0
      ? fossilLngBalanceTco2e * surplusPriceEur
      : -penaltyEur(fossilLngBalanceTco2e, fossilLngIntensity, consecutiveYears)
    ).toFixed(2)
  );
  const fossilLngFuelEuBalanceUsd = Number((fossilLngFuelEuBalanceEur * eurUsdRate).toFixed(2));

  // Bio-LNG's own compliance surplus vs the target (CI-dependent), monetised at the desk bid.
  // Above-target Bio-LNG generates no surplus.
  const fuelEuSurplusTco2ePerTonne = Number(
    ((Math.max(0, targetGhgie - bioLngIntensity) * LHV_BIO_LNG_MJ_PER_TONNE) / 1_000_000).toFixed(4)
  );
  const fuelEuSurplusValueEurPerTonne = Number((fuelEuSurplusTco2ePerTonne * surplusPriceEur).toFixed(2));
  const fuelEuSurplusValueUsdPerTonne = Number((fuelEuSurplusValueEurPerTonne * eurUsdRate).toFixed(2));

  // Total Conventional (fossil-LNG) Alternative Cost: fuel + ETS − FuelEU balance (a surplus
  // credit reduces the cost of choosing fossil LNG; a deficit penalty increases it).
  const totalConventionalAlternativeCostEur = Number(
    (fossilLngCostEur + fossilLngEtsLiabilityEur - fossilLngFuelEuBalanceEur).toFixed(2)
  );
  const totalConventionalAlternativeCostUsd = Number(
    (fossilLngCostUsd + fossilLngEtsLiabilityUsd - fossilLngFuelEuBalanceUsd).toFixed(2)
  );

  // Net Client Advantage / Savings per tonne Bio-LNG:
  // (fossil-LNG fuel + ETS − fossil-LNG FuelEU balance) − (Bio-LNG price − Bio-LNG surplus value)
  const netSavingsPerTonneBioLngEur = Number(
    (totalConventionalAlternativeCostEur - allInBioLngPriceEurPerTonne - bioLngEtsLiabilityEur + fuelEuSurplusValueEurPerTonne).toFixed(2)
  );
  const netSavingsPerTonneBioLngUsd = Number(
    (totalConventionalAlternativeCostUsd - allInBioLngPriceUsdPerTonne - bioLngEtsLiabilityUsd + fuelEuSurplusValueUsdPerTonne).toFixed(2)
  );

  const result: MarineBunkerQuotationResult = {
    allInBioLngPriceEurMwh,
    allInBioLngPriceEurPerTonne,
    allInBioLngPriceUsdPerTonne,
    mwhPerTonneBioLng: MWH_PER_TONNE_BIO_LNG,
    equivalentFossilLngTonnes,
    fossilLngCostEur,
    fossilLngCostUsd,
    fossilLngEtsLiabilityEur,
    fossilLngEtsLiabilityUsd,
    bioLngEtsLiabilityEur,
    bioLngEtsLiabilityUsd,
    fossilLngFuelEuBalanceEur,
    fossilLngFuelEuBalanceUsd,
    totalConventionalAlternativeCostEur,
    totalConventionalAlternativeCostUsd,
    fuelEuSurplusTco2ePerTonne,
    fuelEuSurplusPriceEurPerTco2e: surplusPriceEur,
    fuelEuSurplusValueEurPerTonne,
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
    result.totalEtsAvoidedTco2 = Math.round(vol * (fossilLngEtsTco2e - bioLngEtsTco2e));
  }

  return result;
}

/**
 * Static-fleet FuelEU compliance projection: milestone years shown to a client/desk.
 * Fleet activity is held constant at the input tonnages (no Bio-LNG blend, no Article 21 pooling).
 */
export interface StaticFleetProjectionPoint {
  year: number;
  targetGhgie: number;
  complianceBalanceTco2e: number;
  consecutiveN: number;
  multiplier: number;
  penaltyEur: number;
}

export const STATIC_FLEET_PROJECTION_YEARS = [2026, 2027, 2028, 2029, 2030, 2035, 2040] as const;

/**
 * Projects a fleet's FuelEU compliance position across statutory milestone years, holding fleet
 * activity constant at the fleet's (latest EU MRV publication) fuel tonnages — no Bio-LNG blending, no Article 21
 * pooling: "what happens if nothing changes."
 *
 * Escalation follows Art. 23(2): penalty multiplier = 1 + (n − 1)/10, where n is the number of
 * consecutive reporting periods (including the current one) the ship has had a compliance deficit.
 * If `assume2025NonCompliant` (default true), 2025 is treated as the ship's first non-compliant
 * year, so 2026 starts at n = 2; otherwise 2026 starts at n = 1. n increments by 1 in every
 * subsequent year the balance stays negative and resets to 0 in any surplus year (from which the
 * next deficit year would restart at n = 1). Gap years (2031–2034, 2036–2039) are not returned but
 * are still walked internally so n keeps accruing correctly across them.
 *
 * Doc note: the Art. 23(2) multiplier is defined and applied PER SHIP. This function models one
 * fleet/ship-aggregate input; a company or group projection built by summing member projections
 * (see projectStaticFleetForCounterparties) implicitly assumes every ship in that aggregate shares
 * the same compliance-balance sign and consecutive-non-compliance history as its own tonnages —
 * a simplification for desk-level sizing, not a per-ship calculation.
 */
export function projectStaticFleet(params: {
  vlsfoTonnes: number;
  mgoTonnes: number;
  lngTonnes: number;
  lngEngineType?: LngEngineType;
  assume2025NonCompliant?: boolean;
}): StaticFleetProjectionPoint[] {
  const { vlsfoTonnes, mgoTonnes, lngTonnes, lngEngineType, assume2025NonCompliant = true } = params;
  const points: StaticFleetProjectionPoint[] = [];
  let nPrev = assume2025NonCompliant ? 1 : 0;
  const lastYear = STATIC_FLEET_PROJECTION_YEARS[STATIC_FLEET_PROJECTION_YEARS.length - 1];

  for (let year = 2026; year <= lastYear; year++) {
    // n does not affect the balance itself (only the penalty multiplier), so a placeholder n=1
    // is enough to read off this year's surplus/deficit sign and magnitude.
    const probe = calculateVesselExposure({
      vlsfoTonnes,
      mgoTonnes,
      lngTonnes,
      bioLngTonnes: 0,
      bioLngCi: -100,
      targetYear: year,
      consecutiveYearsNonCompliant: 1,
      lngEngineType,
    });
    const isDeficit = !probe.isOverCompliant;
    const n = isDeficit ? nPrev + 1 : 0;
    const multiplier = isDeficit ? 1 + (n - 1) / 10 : 0;
    const penalty = isDeficit ? penaltyEur(probe.complianceBalanceTco2e, probe.weightedGhgie, n) : 0;

    if ((STATIC_FLEET_PROJECTION_YEARS as readonly number[]).includes(year)) {
      points.push({
        year,
        targetGhgie: probe.targetGhgie,
        complianceBalanceTco2e: probe.complianceBalanceTco2e,
        consecutiveN: n,
        multiplier,
        penaltyEur: penalty,
      });
    }
    nPrev = n;
  }

  return points;
}

export interface StaticFleetGroupProjectionPoint {
  year: number;
  complianceBalanceTco2e: number;
  penaltyEur: number;
}

/**
 * Sums projectStaticFleet point-wise across a group's member fleets (each row is one company's
 * static tonnages). Compliance balance and penalty both sum cleanly; per-ship fields like
 * consecutiveN/multiplier do not (see projectStaticFleet's doc note) and are not aggregated here.
 */
export function projectStaticFleetForCounterparties(
  rows: Array<{
    vlsfoTonnes: number;
    mgoTonnes: number;
    lngTonnes: number;
    lngEngineType?: LngEngineType;
    assume2025NonCompliant?: boolean;
  }>
): StaticFleetGroupProjectionPoint[] {
  const perRow = rows.map(r => projectStaticFleet(r));
  return STATIC_FLEET_PROJECTION_YEARS.map((year, i) => ({
    year,
    complianceBalanceTco2e: perRow.reduce((sum, pts) => sum + (pts[i]?.complianceBalanceTco2e ?? 0), 0),
    penaltyEur: perRow.reduce((sum, pts) => sum + (pts[i]?.penaltyEur ?? 0), 0),
  }));
}
