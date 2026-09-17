import {
  VesselArchetype,
  VesselCalculationInput,
  VesselCalculationResult,
  FleetCapability,
  JointRegulatoryExposure,
  MarineBunkerQuotationInput,
  MarineBunkerQuotationResult,
} from './types';

/**
 * FuelEU Maritime Physical & Regulatory Constants
 * Source: Regulation (EU) 2023/1805, Annex I, II & IV
 */
export const FUELEU_TARGET_2025 = 89.3368; // 2% reduction vs 91.16 baseline
export const FUELEU_TARGET_2030 = 85.6904; // 6% reduction vs 91.16 baseline
export const FUELEU_BASELINE_VLSFO_CI = 91.16; // gCO2e/MJ
export const FUELEU_BASELINE_MGO_CI = 91.16;   // gCO2e/MJ
export const FUELEU_FOSSIL_LNG_CI = 74.50;     // gCO2e/MJ (including engine slip)
export const FUELEU_STATUTORY_PENALTY_PER_TONNE = 2400; // €/tonne VLSFO equivalent

export const LHV_VLSFO_MJ_PER_TONNE = 41000;
export const LHV_MGO_MJ_PER_TONNE = 42700;
export const LHV_LNG_MJ_PER_TONNE = 49100;
export const LHV_BIO_LNG_MJ_PER_TONNE = 49100;
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
export const LHV_BIO_LNG_GJ_PER_TONNE = 50.0;     // 50.0 GJ/t Bio-LNG
export const MWH_PER_TONNE_BIO_LNG = 13.9;        // 13.9 MWh/t (50 GJ / 3.6 MJ/kWh)
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
    description: 'State-of-the-art dual-fuel LNG liner. Naturally achieves ~74.5 gCO2e/MJ, creating valuable Article 21 surplus balance.',
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

  const vlsfoMj = Math.max(0, vlsfoTonnes) * LHV_VLSFO_MJ_PER_TONNE;
  const mgoMj = Math.max(0, mgoTonnes) * LHV_MGO_MJ_PER_TONNE;
  const lngMj = Math.max(0, lngTonnes) * LHV_LNG_MJ_PER_TONNE;
  const bioLngMj = Math.max(0, bioLngTonnes) * LHV_BIO_LNG_MJ_PER_TONNE;

  const totalEnergyMj = vlsfoMj + mgoMj + lngMj + bioLngMj;
  const totalEnergyMwh = totalEnergyMj / MJ_PER_MWH;

  const targetGhgie = targetYear === 2030 ? FUELEU_TARGET_2030 : FUELEU_TARGET_2025;

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
      physicalSavingsEur: 0,
      physicalTradingMarginEur: 0,
      poolingSavingsEur: 0,
      poolingArrangementMarginEur: 0,
    };
  }

  const totalGhgGrams =
    vlsfoMj * FUELEU_BASELINE_VLSFO_CI +
    mgoMj * FUELEU_BASELINE_MGO_CI +
    lngMj * FUELEU_FOSSIL_LNG_CI +
    bioLngMj * bioLngCi;

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
  let physicalSavingsEur = 0;
  let physicalTradingMarginEur = 0;
  let poolingSavingsEur = 0;
  let poolingArrangementMarginEur = 0;

  if (!isOverCompliant) {
    const absDeficitGrams = Math.abs(complianceBalanceTco2e) * 1000000;
    const vlsfoEqTonnes = absDeficitGrams / (weightedGhgie * LHV_VLSFO_MJ_PER_TONNE);

    statutoryPenaltyY1Eur = vlsfoEqTonnes * FUELEU_STATUTORY_PENALTY_PER_TONNE * penaltyMultiplierY1;
    statutoryPenaltyY2Eur = vlsfoEqTonnes * FUELEU_STATUTORY_PENALTY_PER_TONNE * penaltyMultiplierY2;

    // Bio-LNG at CI -100 required to bring compliance balance to exactly 0
    const deltaCiNeg100 = targetGhgie - (-100);
    const requiredBioEnergyMj = absDeficitGrams / deltaCiNeg100;
    bioLngRequiredNeg100Tonnes = requiredBioEnergyMj / LHV_BIO_LNG_MJ_PER_TONNE;
    bioLngRequiredNeg100Mwh = requiredBioEnergyMj / MJ_PER_MWH;

    // Pathway 1: Physical Bio-LNG bunkering economics
    // Premium of Dutch/Danish manure bio-LNG over VLSFO/fossil fuel ≈ €65/MWh
    // Desk trading margin = €15/MWh
    const bioLngPremiumCost = bioLngRequiredNeg100Mwh * 65;
    physicalSavingsEur = Math.max(0, statutoryPenaltyY1Eur - bioLngPremiumCost);
    physicalTradingMarginEur = bioLngRequiredNeg100Mwh * 15;

    // Pathway 2: Article 21 Compliance Pool transfer economics
    // Pool clearing fee = €465/tCO2e vs statutory equivalent of ~€642/tCO2e
    // Desk pool arrangement fee = €30/tCO2e
    const poolDeficitCost = Math.abs(complianceBalanceTco2e) * 465;
    poolingSavingsEur = Math.max(0, statutoryPenaltyY1Eur - poolDeficitCost);
    poolingArrangementMarginEur = Math.abs(complianceBalanceTco2e) * 30;
  } else {
    // If already over-compliant (surplus generator), calculate surplus pool monetisation potential!
    // Pool surplus can be sold at €435/tCO2e
    poolingSavingsEur = complianceBalanceTco2e * 435;
    poolingArrangementMarginEur = complianceBalanceTco2e * 30;
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

  const targetGhgie = targetYear === 2030 ? FUELEU_TARGET_2030 : FUELEU_TARGET_2025;

  // Bio-LNG Delivered Quote: €72/MWh benchmark
  const allInBioLngPriceEurMwh = Number((ttfGasIndex + liquefactionFee + greenPremium).toFixed(2));
  const allInBioLngPriceEurPerTonne = Number((allInBioLngPriceEurMwh * MWH_PER_TONNE_BIO_LNG).toFixed(2));
  const allInBioLngPriceUsdPerTonne = Number((allInBioLngPriceEurPerTonne * eurUsdRate).toFixed(2));

  // Conventional Comparison (VLSFO baseline)
  // 1 metric tonne Bio-LNG (50.0 GJ = 50,000 MJ) delivers propulsion energy equivalent to ~1.2195 tonnes VLSFO
  const equivalentVlsfoTonnes = Number(((LHV_BIO_LNG_GJ_PER_TONNE * 1000) / LHV_VLSFO_MJ_PER_TONNE).toFixed(4));
  const vlsfoCostUsd = Number((equivalentVlsfoTonnes * vlsfoPriceUsd).toFixed(2));
  const vlsfoCostEur = Number((vlsfoCostUsd / eurUsdRate).toFixed(2));

  // EU ETS Liability incurred by burning 1.2195t VLSFO (2025 at 70% phase-in)
  const vlsfoCo2Tonnes = equivalentVlsfoTonnes * EU_ETS_EMISSION_FACTOR_VLSFO;
  const phaseInRate = targetYear === 2026 || targetYear === 2030 ? EU_ETS_PHASE_IN_2026 : EU_ETS_PHASE_IN_2025;
  const vlsfoEtsLiabilityEur = Number((vlsfoCo2Tonnes * phaseInRate * euaPriceEur).toFixed(2));
  const vlsfoEtsLiabilityUsd = Number((vlsfoEtsLiabilityEur * eurUsdRate).toFixed(2));

  // FuelEU Penalty incurred by burning 1.2195t VLSFO
  const vlsfoEnergyMj = equivalentVlsfoTonnes * LHV_VLSFO_MJ_PER_TONNE; // 50,000 MJ
  const vlsfoDeficitGrams = Math.max(0, vlsfoEnergyMj * (FUELEU_BASELINE_VLSFO_CI - targetGhgie));
  const vlsfoEqTonnes = vlsfoDeficitGrams / (FUELEU_BASELINE_VLSFO_CI * LHV_VLSFO_MJ_PER_TONNE);
  const vlsfoFuelEuPenaltyEur = Number((vlsfoEqTonnes * FUELEU_STATUTORY_PENALTY_PER_TONNE).toFixed(2));
  const vlsfoFuelEuPenaltyUsd = Number((vlsfoFuelEuPenaltyEur * eurUsdRate).toFixed(2));

  // Total Conventional Alternative Cost (VLSFO fuel + ETS liability + FuelEU penalty)
  const totalConventionalAlternativeCostEur = Number(
    (vlsfoCostEur + vlsfoEtsLiabilityEur + vlsfoFuelEuPenaltyEur).toFixed(2)
  );
  const totalConventionalAlternativeCostUsd = Number(
    (vlsfoCostUsd + vlsfoEtsLiabilityUsd + vlsfoFuelEuPenaltyUsd).toFixed(2)
  );

  // Fleet Penalty Neutralization Value:
  // When bunkering Bio-LNG at CI (e.g. -100), it generates compliance surplus:
  const surplusGrams = 50000 * (targetGhgie - bioLngCi);
  const fleetPenaltyAvoidedVlsfoEq = surplusGrams / (FUELEU_BASELINE_VLSFO_CI * LHV_VLSFO_MJ_PER_TONNE);
  const fuelEuFleetPenaltyAvoidedEurPerTonne = Number(
    (fleetPenaltyAvoidedVlsfoEq * FUELEU_STATUTORY_PENALTY_PER_TONNE).toFixed(2)
  );

  const etsAvoidedEurPerTonne = vlsfoEtsLiabilityEur;
  const totalRegulatoryValueEurPerTonne = Number(
    (fuelEuFleetPenaltyAvoidedEurPerTonne + etsAvoidedEurPerTonne).toFixed(2)
  );

  // Net Client Advantage / Savings per tonne Bio-LNG:
  // Evaluated against conventional alternative: avoided VLSFO bunker expenditure plus total statutory regulatory value created (avoided FuelEU fleet deficit penalties and avoided EU ETS carbon liabilities)
  const netSavingsPerTonneBioLngEur = Number(
    (totalRegulatoryValueEurPerTonne + vlsfoCostEur - allInBioLngPriceEurPerTonne).toFixed(2)
  );
  const netSavingsPerTonneBioLngUsd = Number(
    (netSavingsPerTonneBioLngEur * eurUsdRate).toFixed(2)
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
    result.totalClientSavingsUsd = Math.round(result.totalClientSavingsEur * eurUsdRate);
    result.totalEtsAvoidedTco2 = Math.round(vol * vlsfoCo2Tonnes * phaseInRate);
  }

  return result;
}
