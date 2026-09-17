import { VesselArchetype, VesselCalculationInput, VesselCalculationResult } from './types';

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
