/**
 * Regulatory constants — the single canonical home for every statutory number the desk
 * engines use, with its legal citation, for the Assumptions tab's read-only "Regulatory
 * constants" section (Pricing desk → Assumptions).
 *
 * Values that already lived in a working engine module (markets/constants.ts,
 * fueleu/calculator.ts, logistics/corridors.ts) are re-exported here rather than
 * duplicated, so there is exactly one number for each — this module is the catalogue,
 * the original file stays the import every engine already uses. RED3_TRANSPORT_MAX_CI was
 * the one true duplicate (defined twice, byte-for-byte) and is defined here for real, with
 * both former call sites importing it.
 */
import {
  FR_CPB_CEILING_EUR_MWH,
  DE_THG_PENALTY_EUR_PER_TCO2E,
  UK_RTFC_BUYOUT_GBP,
} from '../markets/constants';
import {
  FUELEU_STATUTORY_PENALTY_PER_TONNE,
  FUELEU_PENALTY_VLSFO_MJ_PER_TONNE,
} from '../fueleu/calculator';
import {
  CAM_NC_DURATION_MULTIPLIERS,
  NATIONAL_BIOMETHANE_INJECTION_INCENTIVES,
} from '../logistics/corridors';

export {
  FR_CPB_CEILING_EUR_MWH,
  DE_THG_PENALTY_EUR_PER_TCO2E,
  UK_RTFC_BUYOUT_GBP,
  FUELEU_STATUTORY_PENALTY_PER_TONNE,
  FUELEU_PENALTY_VLSFO_MJ_PER_TONNE,
  CAM_NC_DURATION_MULTIPLIERS,
  NATIONAL_BIOMETHANE_INJECTION_INCENTIVES,
};

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
