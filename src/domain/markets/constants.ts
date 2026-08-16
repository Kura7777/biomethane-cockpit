/**
 * CI_COMPARATOR_ROAD_TRANSPORT
 * Fossil fuel comparator for transport (RED III Annex V, Part C, point 19)
 * Source: https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX%3A32018L2001
 */
export const CI_COMPARATOR_ROAD_TRANSPORT = 94; // gCO2e/MJ

/**
 * CI_COMPARATOR_HEAT
 * Fossil fuel comparator for heat
 */
export const CI_COMPARATOR_HEAT = 80; // gCO2e/MJ

/**
 * CI_COMPARATOR_ELECTRICITY
 * Fossil fuel comparator for electricity
 */
export const CI_COMPARATOR_ELECTRICITY = 183; // gCO2e/MJ

export const MJ_PER_MWH = 3600;
export const MWH_PER_GCAL = 1.163;
export const GCAL_PER_CIC_CONVENTIONAL = 10;
export const GCAL_PER_CIC_ADVANCED = 5;
export const MWH_PER_CIC_CONVENTIONAL = GCAL_PER_CIC_CONVENTIONAL * MWH_PER_GCAL; // 11.63
export const MWH_PER_CIC_ADVANCED = GCAL_PER_CIC_ADVANCED * MWH_PER_GCAL; // 5.815

/**
 * FuelEU Maritime Penalty per tonne VLSFO-eq
 * Source: Regulation (EU) 2023/1805
 */
export const FUELEU_PENALTY_EUR_PER_TONNE = 2400;

/**
 * Energy density of Very Low Sulfur Fuel Oil (VLSFO)
 */
export const VLSFO_MJ_PER_TONNE = 41000;

/**
 * France CPB Ceiling Price in EUR/MWh
 */
export const FR_CPB_CEILING_EUR_MWH = 100;

/**
 * GHG Saving Thresholds for Transport (by commissioning date)
 * Source: RED III Art. 29(10)
 */
export const GHG_THRESHOLDS_TRANSPORT: Record<string, number> = {
  PRE_OCT_2015: 0.50,
  OCT_2015_TO_2020: 0.60,
  POST_2021_TO_2025: 0.65,
  POST_2026: 0.65,  // Same as post-2021 for transport
};

/**
 * GHG Saving Thresholds for Heat & Power (by commissioning date)
 * Source: RED III Art. 29(10)
 */
export const GHG_THRESHOLDS_HEAT_POWER = {
  POST_2021_TO_2025: 0.70,
  POST_2026: 0.80,
};

export const STALE_MARK_DAYS = 7;
export const VERY_STALE_MARK_DAYS = 14;
