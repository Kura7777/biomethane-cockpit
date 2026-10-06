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

// FuelEU Annex IV penalty constants and the statutory ceilings below are defined for real in
// src/domain/regulatory/constants.ts (single source) — re-exported here for callers still
// using this historical import path.
export { FR_CPB_CEILING_EUR_MWH, DE_THG_PENALTY_EUR_PER_TCO2E, UK_RTFC_BUYOUT_GBP } from '../regulatory/constants';

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
export const GHG_THRESHOLDS_HEAT_POWER: Record<string, number> = {
  PRE_OCT_2015: 0.50,
  OCT_2015_TO_2020: 0.60,
  POST_2021_TO_2025: 0.70,
  POST_2026: 0.80,
};

export const STALE_MARK_DAYS = 7;
export const VERY_STALE_MARK_DAYS = 14;

export const COUNTRY_NAMES: Record<string, string> = {
  FR: 'France',
  DE: 'Germany',
  IT: 'Italy',
  NL: 'Netherlands',
  DK: 'Denmark',
  ES: 'Spain',
  SE: 'Sweden',
  AT: 'Austria',
  BE: 'Belgium',
  PL: 'Poland',
  CZ: 'Czech Republic',
  FI: 'Finland',
  EE: 'Estonia',
  LT: 'Lithuania',
  LV: 'Latvia',
  CH: 'Switzerland',
  NO: 'Norway',
  GB: 'United Kingdom',
  UK: 'United Kingdom',
  IE: 'Ireland',
  PT: 'Portugal',
  HU: 'Hungary',
  SK: 'Slovakia',
  RO: 'Romania',
  BG: 'Bulgaria',
  HR: 'Croatia',
  SI: 'Slovenia',
  GR: 'Greece',
  UA: 'Ukraine',
};

