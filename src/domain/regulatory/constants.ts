/**
 * Regulatory constants — the single canonical home for every statutory number the desk
 * engines use, with its legal citation, for the Assumptions tab's read-only "Regulatory
 * constants" section (Pricing desk → Assumptions).
 *
 * Defined for real here — engines import these directly from this module. markets/constants.ts
 * and fueleu/calculator.ts re-export them (rather than redefining) for any caller still using
 * their historical import path. CAM_NC_DURATION_MULTIPLIERS and NATIONAL_BIOMETHANE_INJECTION_
 * INCENTIVES stay defined in logistics/corridors.ts (map/logistics domain, not a cross-cutting
 * statutory penalty) and are only re-exported here for the Assumptions tab table.
 */
import {
  CAM_NC_DURATION_MULTIPLIERS,
  NATIONAL_BIOMETHANE_INJECTION_INCENTIVES,
} from '../logistics/corridors';
import { CI_COMPARATOR_HEAT } from '../markets/constants';

export {
  CAM_NC_DURATION_MULTIPLIERS,
  NATIONAL_BIOMETHANE_INJECTION_INCENTIVES,
};

/**
 * GGE Fossil Fuel Comparator (RED Annex VI Part B, point 19, heat).
 * Reuses CI_COMPARATOR_HEAT (80 gCO2e/MJ).
 * Source: Draft Regeling bijmengverplichting groen gas toelichting 2.3; NEa.
 */
export const NL_GGE_FOSSIL_COMPARATOR_GCO2E_MJ = CI_COMPARATOR_HEAT;

/**
 * GGE Buy-out Schedule (€/tCO2e shortfall) for compliance years 2027–2035 (R19).
 * Source: Concept Regeling bijmengverplichting groen gas Art. 2.
 */
export const NL_GGE_BUYOUT_EUR_PER_TCO2E: Readonly<Record<number, number>> = {
  2027: 450,
  2028: 459,
  2029: 468,
  2030: 478,
  2031: 487,
  2032: 497,
  2033: 507,
  2034: 517,
  2035: 527,
};

/**
 * GGE National Obligation Trajectory in Mt CO2e for compliance years 2027–2035 (R18).
 * 0.63 / 0.92 / 1.33 / 1.91 / 2.85 Mt for 2027–2031, flat 2.85 to 2035.
 * Source: Ontwerpbesluit bijmengverplichting groen gas Art. 1.
 */
export const NL_GGE_OBLIGATION_TRAJECTORY_MT: Readonly<Record<number, number>> = {
  2027: 0.63,
  2028: 0.92,
  2029: 1.33,
  2030: 1.91,
  2031: 2.85,
  2032: 2.85,
  2033: 2.85,
  2034: 2.85,
  2035: 2.85,
};

/**
 * GGE Banking Cap: max 10% of own written-off obligation (R20).
 * Source: Ontwerpbesluit bijmengverplichting groen gas Art. 11.
 */
export const NL_GGE_BANKING_CAP_PCT = 10;

/**
 * GGE Booking Deadline: 1 May of the calendar year following delivery (Y+1) (R10).
 * Source: Ontwerpbesluit bijmengverplichting groen gas 2.2.1 Table 2.
 */
export const NL_GGE_BOOKING_DEADLINE_MONTH_DAY = '05-01';

/**
 * GGE GO Validity: expires 12 months after end of production period (R9).
 * Source: Ontwerpbesluit bijmengverplichting groen gas 2.2.1; Concept Regeling 2.3.
 */
export const NL_GGE_GO_VALIDITY_MONTHS = 12;

/**
 * GGE Claw-back Window: NEa may re-determine booked gas up to 5 years after booking (R21).
 * Source: Ontwerpbesluit bijmengverplichting groen gas Art. 6, 2.3.
 */
export const NL_GGE_CLAWBACK_YEARS = 5;

/**
 * RED Art 29(10) heat/cooling GHG saving thresholds (O2, flagged category unconfirmed):
 * 70% for installations starting operation 2021–2025; 80% from 2026.
 * Source: RED III Directive (EU) 2023/2413 Art. 29(10)(d).
 */
export const RED_HEAT_THRESHOLD_POST_2021 = 0.70;
export const RED_HEAT_THRESHOLD_POST_2026 = 0.80;

/**
 * France CPB Ceiling Price in EUR/MWh
 * Source: Code de l'énergie, Art. L.446-24
 */
export const FR_CPB_CEILING_EUR_MWH = 100;

/**
 * German THG-Quote non-compliance penalty (€/tCO2e shortfall)
 * Source: §37c(2) BImSchG — €600/tCO2e since compliance year 2022
 */
export const DE_THG_PENALTY_EUR_PER_TCO2E = 600;

/**
 * UK RTFO buy-out price per RTFC (£) — no obligated supplier rationally pays more
 * Source: Renewable Transport Fuel Obligations Order 2007 (SI 2007/3072), Art. 17
 */
export const UK_RTFC_BUYOUT_GBP = 0.50;

/** FuelEU Annex IV statutory penalty, €/tonne VLSFO equivalent. Source: Regulation (EU) 2023/1805, Annex IV. */
export const FUELEU_STATUTORY_PENALTY_PER_TONNE = 2400;

/** FuelEU Annex IV VLSFO energy content, MJ/tonne. Source: Regulation (EU) 2023/1805, Annex IV. */
export const FUELEU_PENALTY_VLSFO_MJ_PER_TONNE = 41000;

/** RED III Art. 29(10): 65% GHG saving vs. the 94 gCO2e/MJ transport comparator. Defined once; both
 * domain/corporate/orderPricer.ts and domain/valueStack/engine.ts import it from here. */
export const RED3_TRANSPORT_MAX_CI = 32.9;

export interface RegulatoryConstantRow {
  key: string;
  label: string;
  value: string;
  unit: string;
  citation: string | null;
  usedIn: string;
}

/** Drives the Assumptions tab's read-only "Regulatory constants" table. */
export const REGULATORY_CONSTANT_ROWS: RegulatoryConstantRow[] = [
  {
    key: 'FR_CPB_CEILING_EUR_MWH',
    label: 'France CPB penalty ceiling',
    value: String(FR_CPB_CEILING_EUR_MWH),
    unit: '€/MWh',
    citation: 'Code de l’énergie — CPB penalty ceiling',
    usedIn: 'Netback engine: caps the FR_CPB certificate value',
  },
  {
    key: 'DE_THG_PENALTY_EUR_PER_TCO2E',
    label: 'Germany THG-Quote non-compliance penalty',
    value: String(DE_THG_PENALTY_EUR_PER_TCO2E),
    unit: '€/tCO₂e',
    citation: '§37c(2) BImSchG — €600/tCO2e since compliance year 2022',
    usedIn: 'Netback engine: ceiling on the DE THG certificate value (not the value itself)',
  },
  {
    key: 'UK_RTFC_BUYOUT_GBP',
    label: 'UK RTFC buy-out price',
    value: String(UK_RTFC_BUYOUT_GBP),
    unit: '£/RTFC',
    citation: 'Renewable Transport Fuel Obligations Order 2007 (SI 2007/3072), Art. 17',
    usedIn: 'Netback engine: ceiling on the UK RTFO certificate value',
  },
  {
    key: 'FUELEU_STATUTORY_PENALTY_PER_TONNE',
    label: 'FuelEU Annex IV statutory penalty',
    value: String(FUELEU_STATUTORY_PENALTY_PER_TONNE),
    unit: '€/tonne VLSFO-equivalent',
    citation: 'Regulation (EU) 2023/1805, Annex IV',
    usedIn: 'FuelEU calculator: deficit penalty formula',
  },
  {
    key: 'FUELEU_PENALTY_VLSFO_MJ_PER_TONNE',
    label: 'FuelEU Annex IV VLSFO energy content',
    value: String(FUELEU_PENALTY_VLSFO_MJ_PER_TONNE),
    unit: 'MJ/tonne',
    citation: 'Regulation (EU) 2023/1805, Annex IV',
    usedIn: 'FuelEU calculator: deficit penalty formula (VLSFO-equivalent tonnes)',
  },
  {
    key: 'RED3_TRANSPORT_MAX_CI',
    label: 'RED III transport 65% GHG-saving threshold',
    value: String(RED3_TRANSPORT_MAX_CI),
    unit: 'gCO₂e/MJ',
    citation: 'RED III Art. 29(10) — 65% saving vs. the 94 gCO2e/MJ transport comparator',
    usedIn: 'Corporate order pricer and value-stack engine: RED III transport compliance gate',
  },
  {
    key: 'NL_GGE_FOSSIL_COMPARATOR_GCO2E_MJ',
    label: 'NL GGE fossil fuel comparator',
    value: String(NL_GGE_FOSSIL_COMPARATOR_GCO2E_MJ),
    unit: 'gCO₂e/MJ',
    citation: 'RED Annex VI B pt 19; Draft Regeling toelichting 2.3',
    usedIn: 'Netback engine: baseline fossil reference for Dutch GGE reduction volume calculation',
  },
  {
    key: 'NL_GGE_BUYOUT_2027',
    label: 'NL GGE 2027 buy-out ceiling',
    value: String(NL_GGE_BUYOUT_EUR_PER_TCO2E[2027]),
    unit: '€/tCO₂e',
    citation: 'Concept Regeling bijmengverplichting groen gas Art. 2 (€450/t in 2027 to €527/t in 2035)',
    usedIn: 'Statutory non-compliance buy-out price and ceiling on GGE mark',
  },
  {
    key: 'NL_GGE_OBLIGATION_2027',
    label: 'NL GGE 2027 national obligation',
    value: String(NL_GGE_OBLIGATION_TRAJECTORY_MT[2027]),
    unit: 'Mt CO₂e',
    citation: 'Ontwerpbesluit bijmengverplichting groen gas Art. 1 (0.63 Mt in 2027 to 2.85 Mt in 2031–2035)',
    usedIn: 'National trajectory reference for green gas obligation volume',
  },
  {
    key: 'NL_GGE_BANKING_CAP_PCT',
    label: 'NL GGE banking cap',
    value: String(NL_GGE_BANKING_CAP_PCT),
    unit: '%',
    citation: 'Ontwerpbesluit bijmengverplichting groen gas Art. 11',
    usedIn: 'Maximum banking of own written-off obligation to next compliance year',
  },
  {
    key: 'NL_GGE_BOOKING_DEADLINE_MONTH_DAY',
    label: 'NL GGE booking deadline',
    value: '1 May Y+1',
    unit: 'date',
    citation: 'Ontwerpbesluit bijmengverplichting groen gas 2.2.1 Table 2',
    usedIn: 'Deadline for booking delivered gas in NEa register',
  },
  {
    key: 'NL_GGE_GO_VALIDITY_MONTHS',
    label: 'NL GGE GO validity',
    value: String(NL_GGE_GO_VALIDITY_MONTHS),
    unit: 'months',
    citation: 'Ontwerpbesluit bijmengverplichting groen gas 2.2.1; Concept Regeling 2.3',
    usedIn: 'Maximum validity period of Guarantee of Origin after production period end',
  },
  {
    key: 'NL_GGE_CLAWBACK_YEARS',
    label: 'NL GGE NEa claw-back window',
    value: String(NL_GGE_CLAWBACK_YEARS),
    unit: 'years',
    citation: 'Ontwerpbesluit bijmengverplichting groen gas Art. 6, 2.3',
    usedIn: 'NEa audit and re-determination window for previously booked gas',
  },
  {
    key: 'RED_HEAT_THRESHOLDS',
    label: 'RED heat/cooling GHG saving thresholds',
    value: `${RED_HEAT_THRESHOLD_POST_2021 * 100}% / ${RED_HEAT_THRESHOLD_POST_2026 * 100}%`,
    unit: '%',
    citation: 'RED III Art. 29(10)(d) (category unconfirmed for gas grid injection)',
    usedIn: 'GHG threshold gate for heat/power installations commissioned post-2021 (70%) and post-2026 (80%)',
  },
  ...Object.entries(CAM_NC_DURATION_MULTIPLIERS).map(([code, row]) => ({
    key: `CAM_NC.${code}`,
    label: row.label,
    value: String(row.multiplier),
    unit: '×',
    citation: 'ENTSOG CAM NC, Commission Regulation (EU) 2017/459',
    usedIn: 'Map capacity-booking tariff multiplier by product duration',
  })),
  ...Object.entries(NATIONAL_BIOMETHANE_INJECTION_INCENTIVES).map(([country, row]) => ({
    key: `INJECTION_INCENTIVE.${country}`,
    label: `${country} biomethane grid injection credit`,
    value: String(row.creditEurMwh),
    unit: '€/MWh',
    citation: row.statutoryBasis,
    usedIn: 'Reference only — avoided grid-charge credit per injecting country, not wired into deal pricing',
  })),
];
