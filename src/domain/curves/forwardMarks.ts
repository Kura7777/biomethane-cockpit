import { MarkProvenance } from '../markets/types';
import {
  DeliveryTenor,
  TenorCategory,
  TenorDefinition,
  ForwardGasMark,
  ForwardCertificateMark,
  ForwardFxMark,
  ForwardCurveMatrix,
} from './types';

export const TENOR_DEFINITIONS: TenorDefinition[] = [
  {
    tenor: 'M_PLUS_1',
    label: 'Prompt Month+1',
    shortLabel: 'M+1',
    category: 'PROMPT',
    deliveryYear: 2026,
    month: 9,
    deliveryPeriod: 'Sep 2026',
    startDate: '2026-09-01',
    endDate: '2026-09-30',
    description: 'Front prompt monthly delivery contract on TTF / National hubs',
  },
  {
    tenor: 'M_PLUS_2',
    label: 'Prompt Month+2',
    shortLabel: 'M+2',
    category: 'PROMPT',
    deliveryYear: 2026,
    month: 10,
    deliveryPeriod: 'Oct 2026',
    startDate: '2026-10-01',
    endDate: '2026-10-31',
    description: 'Second prompt monthly delivery contract',
  },
  {
    tenor: 'Q1',
    label: 'Quarter 1 (Winter Peak)',
    shortLabel: 'Q1',
    category: 'QUARTER',
    deliveryYear: 2027,
    quarter: 1,
    deliveryPeriod: 'Q1 2027',
    startDate: '2027-01-01',
    endDate: '2027-03-31',
    description: 'First quarter peak heating & transport compliance period',
  },
  {
    tenor: 'Q2',
    label: 'Quarter 2 (Summer Injection)',
    shortLabel: 'Q2',
    category: 'QUARTER',
    deliveryYear: 2027,
    quarter: 2,
    deliveryPeriod: 'Q2 2027',
    startDate: '2027-04-01',
    endDate: '2027-06-30',
    description: 'Second quarter injection season and agricultural feedstock flush',
  },
  {
    tenor: 'Q3',
    label: 'Quarter 3 (Summer Trough)',
    shortLabel: 'Q3',
    category: 'QUARTER',
    deliveryYear: 2027,
    quarter: 3,
    deliveryPeriod: 'Q3 2027',
    startDate: '2027-07-01',
    endDate: '2027-09-30',
    description: 'Third quarter low gas demand period',
  },
  {
    tenor: 'Q4',
    label: 'Quarter 4 (Winter Ramp)',
    shortLabel: 'Q4',
    category: 'QUARTER',
    deliveryYear: 2027,
    quarter: 4,
    deliveryPeriod: 'Q4 2027',
    startDate: '2027-10-01',
    endDate: '2027-12-31',
    description: 'Fourth quarter annual quota surrender & compliance deadline sprint',
  },
  {
    tenor: 'CAL_PLUS_1',
    label: 'Calendar Cal+1',
    shortLabel: 'Cal 2027',
    category: 'CALENDAR',
    deliveryYear: 2027,
    deliveryPeriod: 'Cal 2027',
    startDate: '2027-01-01',
    endDate: '2027-12-31',
    description: 'Full calendar year 2027 baseload strip',
  },
  {
    tenor: 'CAL_PLUS_2',
    label: 'Calendar Cal+2',
    shortLabel: 'Cal 2028',
    category: 'CALENDAR',
    deliveryYear: 2028,
    deliveryPeriod: 'Cal 2028',
    startDate: '2028-01-01',
    endDate: '2028-12-31',
    description: 'Full calendar year 2028 forward strip',
  },
  {
    tenor: 'CAL_PLUS_3',
    label: 'Calendar Cal+3',
    shortLabel: 'Cal 2029',
    category: 'CALENDAR',
    deliveryYear: 2029,
    deliveryPeriod: 'Cal 2029',
    startDate: '2029-01-01',
    endDate: '2029-12-31',
    description: 'Full calendar year 2029 forward strip (RED III 2030 ramp-up)',
  },
];

export const ALL_DELIVERY_TENORS: DeliveryTenor[] = [
  'M_PLUS_1',
  'M_PLUS_2',
  'Q1',
  'Q2',
  'Q3',
  'Q4',
  'CAL_PLUS_1',
  'CAL_PLUS_2',
  'CAL_PLUS_3',
];

export function getTenorDefinition(tenor: DeliveryTenor): TenorDefinition {
  const def = TENOR_DEFINITIONS.find(t => t.tenor === tenor);
  if (!def) {
    throw new Error(`Unknown delivery tenor: ${tenor}`);
  }
  return def;
}

export function getTenorsByCategory(category: TenorCategory): TenorDefinition[] {
  return TENOR_DEFINITIONS.filter(t => t.category === category);
}

const DEFAULT_PROVENANCE_SIM: MarkProvenance = {
  sourceType: 'ESTIMATE',
  sourceName: 'SIMULATED',
  sourceUrl: null,
  observedAt: '2026-08-15T08:00:00Z',
  note: 'Desk benchmark forward curve profile',
};

const DEFAULT_PROVENANCE_EEX: MarkProvenance = {
  sourceType: 'EXCHANGE_AUCTION',
  sourceName: 'EEX_HISTORICAL',
  sourceUrl: 'https://www.eex.com',
  observedAt: '2026-08-15T08:00:00Z',
  note: 'Settlement forward curve benchmark',
};

const DEFAULT_PROVENANCE_PRA: MarkProvenance = {
  sourceType: 'PRICE_REPORTING',
  sourceName: 'PRICE_ASSESSMENT_BENCHMARK',
  sourceUrl: null,
  observedAt: '2026-08-15T08:00:00Z',
  note: 'Assessed forward compliance market curve',
};

// Baseline realistic TTF Gas Forward Curve (€/MWh)
const DEFAULT_GAS_FORWARD_CURVE: Record<DeliveryTenor, ForwardGasMark> = {
  M_PLUS_1: {
    tenor: 'M_PLUS_1',
    bid: 33.30,
    offer: 33.70,
    mid: 33.50,
    updatedAt: '2026-08-15T08:00:00Z',
    provenance: DEFAULT_PROVENANCE_EEX,
  },
  M_PLUS_2: {
    tenor: 'M_PLUS_2',
    bid: 34.00,
    offer: 34.40,
    mid: 34.20,
    updatedAt: '2026-08-15T08:00:00Z',
    provenance: DEFAULT_PROVENANCE_EEX,
  },
  Q1: {
    tenor: 'Q1',
    bid: 36.50,
    offer: 37.10,
    mid: 36.80,
    updatedAt: '2026-08-15T08:00:00Z',
    provenance: DEFAULT_PROVENANCE_EEX,
  },
  Q2: {
    tenor: 'Q2',
    bid: 30.90,
    offer: 31.50,
    mid: 31.20,
    updatedAt: '2026-08-15T08:00:00Z',
    provenance: DEFAULT_PROVENANCE_EEX,
  },
  Q3: {
    tenor: 'Q3',
    bid: 30.50,
    offer: 31.10,
    mid: 30.80,
    updatedAt: '2026-08-15T08:00:00Z',
    provenance: DEFAULT_PROVENANCE_EEX,
  },
  Q4: {
    tenor: 'Q4',
    bid: 35.10,
    offer: 35.70,
    mid: 35.40,
    updatedAt: '2026-08-15T08:00:00Z',
    provenance: DEFAULT_PROVENANCE_EEX,
  },
  CAL_PLUS_1: {
    tenor: 'CAL_PLUS_1',
    bid: 33.30,
    offer: 33.90,
    mid: 33.60,
    updatedAt: '2026-08-15T08:00:00Z',
    provenance: DEFAULT_PROVENANCE_EEX,
  },
  CAL_PLUS_2: {
    tenor: 'CAL_PLUS_2',
    bid: 31.10,
    offer: 31.90,
    mid: 31.50,
    updatedAt: '2026-08-15T08:00:00Z',
    provenance: DEFAULT_PROVENANCE_EEX,
  },
  CAL_PLUS_3: {
    tenor: 'CAL_PLUS_3',
    bid: 29.30,
    offer: 30.30,
    mid: 29.80,
    updatedAt: '2026-08-15T08:00:00Z',
    provenance: DEFAULT_PROVENANCE_EEX,
  },
};

// Baseline realistic Certificate Forward Curves across European Compliance Markets
const DEFAULT_CERTIFICATE_FORWARD_CURVES: Record<string, Record<DeliveryTenor, ForwardCertificateMark>> = {
  // Germany THG Quota (€/tCO2e) - Escalating quota under §37a BImSchG
  DE_THG: {
    M_PLUS_1: { marketId: 'DE_THG', tenor: 'M_PLUS_1', bid: 335.00, offer: 345.00, mid: 340.00, updatedAt: '2026-08-15T08:00:00Z', provenance: DEFAULT_PROVENANCE_PRA },
    M_PLUS_2: { marketId: 'DE_THG', tenor: 'M_PLUS_2', bid: 340.00, offer: 350.00, mid: 345.00, updatedAt: '2026-08-15T08:00:00Z', provenance: DEFAULT_PROVENANCE_PRA },
    Q1: { marketId: 'DE_THG', tenor: 'Q1', bid: 345.00, offer: 355.00, mid: 350.00, updatedAt: '2026-08-15T08:00:00Z', provenance: DEFAULT_PROVENANCE_PRA },
    Q2: { marketId: 'DE_THG', tenor: 'Q2', bid: 350.00, offer: 360.00, mid: 355.00, updatedAt: '2026-08-15T08:00:00Z', provenance: DEFAULT_PROVENANCE_PRA },
    Q3: { marketId: 'DE_THG', tenor: 'Q3', bid: 355.00, offer: 365.00, mid: 360.00, updatedAt: '2026-08-15T08:00:00Z', provenance: DEFAULT_PROVENANCE_PRA },
    Q4: { marketId: 'DE_THG', tenor: 'Q4', bid: 360.00, offer: 370.00, mid: 365.00, updatedAt: '2026-08-15T08:00:00Z', provenance: DEFAULT_PROVENANCE_PRA },
    CAL_PLUS_1: { marketId: 'DE_THG', tenor: 'CAL_PLUS_1', bid: 355.00, offer: 365.00, mid: 360.00, updatedAt: '2026-08-15T08:00:00Z', provenance: DEFAULT_PROVENANCE_PRA },
    CAL_PLUS_2: { marketId: 'DE_THG', tenor: 'CAL_PLUS_2', bid: 375.00, offer: 385.00, mid: 380.00, updatedAt: '2026-08-15T08:00:00Z', provenance: DEFAULT_PROVENANCE_PRA },
    CAL_PLUS_3: { marketId: 'DE_THG', tenor: 'CAL_PLUS_3', bid: 395.00, offer: 405.00, mid: 400.00, updatedAt: '2026-08-15T08:00:00Z', provenance: DEFAULT_PROVENANCE_PRA },
  },

  // Netherlands ERE (€/kgCO2e) - Steady compliance demand
  NL_ERE: {
    M_PLUS_1: { marketId: 'NL_ERE', tenor: 'M_PLUS_1', bid: 0.345, offer: 0.355, mid: 0.350, updatedAt: '2026-08-15T08:00:00Z', provenance: DEFAULT_PROVENANCE_PRA },
    M_PLUS_2: { marketId: 'NL_ERE', tenor: 'M_PLUS_2', bid: 0.350, offer: 0.360, mid: 0.355, updatedAt: '2026-08-15T08:00:00Z', provenance: DEFAULT_PROVENANCE_PRA },
    Q1: { marketId: 'NL_ERE', tenor: 'Q1', bid: 0.355, offer: 0.365, mid: 0.360, updatedAt: '2026-08-15T08:00:00Z', provenance: DEFAULT_PROVENANCE_PRA },
    Q2: { marketId: 'NL_ERE', tenor: 'Q2', bid: 0.360, offer: 0.370, mid: 0.365, updatedAt: '2026-08-15T08:00:00Z', provenance: DEFAULT_PROVENANCE_PRA },
    Q3: { marketId: 'NL_ERE', tenor: 'Q3', bid: 0.365, offer: 0.375, mid: 0.370, updatedAt: '2026-08-15T08:00:00Z', provenance: DEFAULT_PROVENANCE_PRA },
    Q4: { marketId: 'NL_ERE', tenor: 'Q4', bid: 0.370, offer: 0.380, mid: 0.375, updatedAt: '2026-08-15T08:00:00Z', provenance: DEFAULT_PROVENANCE_PRA },
    CAL_PLUS_1: { marketId: 'NL_ERE', tenor: 'CAL_PLUS_1', bid: 0.365, offer: 0.375, mid: 0.370, updatedAt: '2026-08-15T08:00:00Z', provenance: DEFAULT_PROVENANCE_PRA },
    CAL_PLUS_2: { marketId: 'NL_ERE', tenor: 'CAL_PLUS_2', bid: 0.385, offer: 0.395, mid: 0.390, updatedAt: '2026-08-15T08:00:00Z', provenance: DEFAULT_PROVENANCE_PRA },
    CAL_PLUS_3: { marketId: 'NL_ERE', tenor: 'CAL_PLUS_3', bid: 0.405, offer: 0.415, mid: 0.410, updatedAt: '2026-08-15T08:00:00Z', provenance: DEFAULT_PROVENANCE_PRA },
  },

  // France CPB (€/MWh) - Statutory ceiling at €100.00/MWh
  FR_CPB: {
    M_PLUS_1: { marketId: 'FR_CPB', tenor: 'M_PLUS_1', bid: 81.50, offer: 83.50, mid: 82.50, updatedAt: '2026-08-15T08:00:00Z', provenance: DEFAULT_PROVENANCE_EEX },
    M_PLUS_2: { marketId: 'FR_CPB', tenor: 'M_PLUS_2', bid: 82.00, offer: 84.00, mid: 83.00, updatedAt: '2026-08-15T08:00:00Z', provenance: DEFAULT_PROVENANCE_EEX },
    Q1: { marketId: 'FR_CPB', tenor: 'Q1', bid: 83.00, offer: 85.00, mid: 84.00, updatedAt: '2026-08-15T08:00:00Z', provenance: DEFAULT_PROVENANCE_EEX },
    Q2: { marketId: 'FR_CPB', tenor: 'Q2', bid: 83.50, offer: 85.50, mid: 84.50, updatedAt: '2026-08-15T08:00:00Z', provenance: DEFAULT_PROVENANCE_EEX },
    Q3: { marketId: 'FR_CPB', tenor: 'Q3', bid: 84.00, offer: 86.00, mid: 85.00, updatedAt: '2026-08-15T08:00:00Z', provenance: DEFAULT_PROVENANCE_EEX },
    Q4: { marketId: 'FR_CPB', tenor: 'Q4', bid: 84.50, offer: 86.50, mid: 85.50, updatedAt: '2026-08-15T08:00:00Z', provenance: DEFAULT_PROVENANCE_EEX },
    CAL_PLUS_1: { marketId: 'FR_CPB', tenor: 'CAL_PLUS_1', bid: 84.00, offer: 86.00, mid: 85.00, updatedAt: '2026-08-15T08:00:00Z', provenance: DEFAULT_PROVENANCE_EEX },
    CAL_PLUS_2: { marketId: 'FR_CPB', tenor: 'CAL_PLUS_2', bid: 87.00, offer: 89.00, mid: 88.00, updatedAt: '2026-08-15T08:00:00Z', provenance: DEFAULT_PROVENANCE_EEX },
    CAL_PLUS_3: { marketId: 'FR_CPB', tenor: 'CAL_PLUS_3', bid: 89.00, offer: 91.00, mid: 90.00, updatedAt: '2026-08-15T08:00:00Z', provenance: DEFAULT_PROVENANCE_EEX },
  },

  // Italy CIC (€/CIC) - GSE quota
  IT_CIC: {
    M_PLUS_1: { marketId: 'IT_CIC', tenor: 'M_PLUS_1', bid: 320.00, offer: 330.00, mid: 325.00, updatedAt: '2026-08-15T08:00:00Z', provenance: DEFAULT_PROVENANCE_PRA },
    M_PLUS_2: { marketId: 'IT_CIC', tenor: 'M_PLUS_2', bid: 325.00, offer: 335.00, mid: 330.00, updatedAt: '2026-08-15T08:00:00Z', provenance: DEFAULT_PROVENANCE_PRA },
    Q1: { marketId: 'IT_CIC', tenor: 'Q1', bid: 330.00, offer: 340.00, mid: 335.00, updatedAt: '2026-08-15T08:00:00Z', provenance: DEFAULT_PROVENANCE_PRA },
    Q2: { marketId: 'IT_CIC', tenor: 'Q2', bid: 335.00, offer: 345.00, mid: 340.00, updatedAt: '2026-08-15T08:00:00Z', provenance: DEFAULT_PROVENANCE_PRA },
    Q3: { marketId: 'IT_CIC', tenor: 'Q3', bid: 340.00, offer: 350.00, mid: 345.00, updatedAt: '2026-08-15T08:00:00Z', provenance: DEFAULT_PROVENANCE_PRA },
    Q4: { marketId: 'IT_CIC', tenor: 'Q4', bid: 345.00, offer: 355.00, mid: 350.00, updatedAt: '2026-08-15T08:00:00Z', provenance: DEFAULT_PROVENANCE_PRA },
    CAL_PLUS_1: { marketId: 'IT_CIC', tenor: 'CAL_PLUS_1', bid: 340.00, offer: 350.00, mid: 345.00, updatedAt: '2026-08-15T08:00:00Z', provenance: DEFAULT_PROVENANCE_PRA },
    CAL_PLUS_2: { marketId: 'IT_CIC', tenor: 'CAL_PLUS_2', bid: 355.00, offer: 365.00, mid: 360.00, updatedAt: '2026-08-15T08:00:00Z', provenance: DEFAULT_PROVENANCE_PRA },
    CAL_PLUS_3: { marketId: 'IT_CIC', tenor: 'CAL_PLUS_3', bid: 370.00, offer: 380.00, mid: 375.00, updatedAt: '2026-08-15T08:00:00Z', provenance: DEFAULT_PROVENANCE_PRA },
  },

  // UK RTFO (GBP/dRTFC)
  UK_RTFO: {
    M_PLUS_1: { marketId: 'UK_RTFO', tenor: 'M_PLUS_1', bid: 0.220, offer: 0.230, mid: 0.225, updatedAt: '2026-08-15T08:00:00Z', provenance: DEFAULT_PROVENANCE_PRA },
    M_PLUS_2: { marketId: 'UK_RTFO', tenor: 'M_PLUS_2', bid: 0.225, offer: 0.235, mid: 0.230, updatedAt: '2026-08-15T08:00:00Z', provenance: DEFAULT_PROVENANCE_PRA },
    Q1: { marketId: 'UK_RTFO', tenor: 'Q1', bid: 0.230, offer: 0.240, mid: 0.235, updatedAt: '2026-08-15T08:00:00Z', provenance: DEFAULT_PROVENANCE_PRA },
    Q2: { marketId: 'UK_RTFO', tenor: 'Q2', bid: 0.235, offer: 0.245, mid: 0.240, updatedAt: '2026-08-15T08:00:00Z', provenance: DEFAULT_PROVENANCE_PRA },
    Q3: { marketId: 'UK_RTFO', tenor: 'Q3', bid: 0.240, offer: 0.250, mid: 0.245, updatedAt: '2026-08-15T08:00:00Z', provenance: DEFAULT_PROVENANCE_PRA },
    Q4: { marketId: 'UK_RTFO', tenor: 'Q4', bid: 0.245, offer: 0.255, mid: 0.250, updatedAt: '2026-08-15T08:00:00Z', provenance: DEFAULT_PROVENANCE_PRA },
    CAL_PLUS_1: { marketId: 'UK_RTFO', tenor: 'CAL_PLUS_1', bid: 0.240, offer: 0.250, mid: 0.245, updatedAt: '2026-08-15T08:00:00Z', provenance: DEFAULT_PROVENANCE_PRA },
    CAL_PLUS_2: { marketId: 'UK_RTFO', tenor: 'CAL_PLUS_2', bid: 0.255, offer: 0.265, mid: 0.260, updatedAt: '2026-08-15T08:00:00Z', provenance: DEFAULT_PROVENANCE_PRA },
    CAL_PLUS_3: { marketId: 'UK_RTFO', tenor: 'CAL_PLUS_3', bid: 0.270, offer: 0.280, mid: 0.275, updatedAt: '2026-08-15T08:00:00Z', provenance: DEFAULT_PROVENANCE_PRA },
  },

  // Denmark GO (€/MWh)
  DK_GO: {
    M_PLUS_1: { marketId: 'DK_GO', tenor: 'M_PLUS_1', bid: 48.00, offer: 52.00, mid: 50.00, updatedAt: '2026-08-15T08:00:00Z', provenance: DEFAULT_PROVENANCE_SIM },
    M_PLUS_2: { marketId: 'DK_GO', tenor: 'M_PLUS_2', bid: 49.00, offer: 53.00, mid: 51.00, updatedAt: '2026-08-15T08:00:00Z', provenance: DEFAULT_PROVENANCE_SIM },
    Q1: { marketId: 'DK_GO', tenor: 'Q1', bid: 50.00, offer: 54.00, mid: 52.00, updatedAt: '2026-08-15T08:00:00Z', provenance: DEFAULT_PROVENANCE_SIM },
    Q2: { marketId: 'DK_GO', tenor: 'Q2', bid: 51.00, offer: 55.00, mid: 53.00, updatedAt: '2026-08-15T08:00:00Z', provenance: DEFAULT_PROVENANCE_SIM },
    Q3: { marketId: 'DK_GO', tenor: 'Q3', bid: 52.00, offer: 56.00, mid: 54.00, updatedAt: '2026-08-15T08:00:00Z', provenance: DEFAULT_PROVENANCE_SIM },
    Q4: { marketId: 'DK_GO', tenor: 'Q4', bid: 53.00, offer: 57.00, mid: 55.00, updatedAt: '2026-08-15T08:00:00Z', provenance: DEFAULT_PROVENANCE_SIM },
    CAL_PLUS_1: { marketId: 'DK_GO', tenor: 'CAL_PLUS_1', bid: 52.00, offer: 56.00, mid: 54.00, updatedAt: '2026-08-15T08:00:00Z', provenance: DEFAULT_PROVENANCE_SIM },
    CAL_PLUS_2: { marketId: 'DK_GO', tenor: 'CAL_PLUS_2', bid: 55.00, offer: 59.00, mid: 57.00, updatedAt: '2026-08-15T08:00:00Z', provenance: DEFAULT_PROVENANCE_SIM },
    CAL_PLUS_3: { marketId: 'DK_GO', tenor: 'CAL_PLUS_3', bid: 58.00, offer: 62.00, mid: 60.00, updatedAt: '2026-08-15T08:00:00Z', provenance: DEFAULT_PROVENANCE_SIM },
  },

  // Spain GO (€/MWh)
  ES_GO: {
    M_PLUS_1: { marketId: 'ES_GO', tenor: 'M_PLUS_1', bid: 44.00, offer: 48.00, mid: 46.00, updatedAt: '2026-08-15T08:00:00Z', provenance: DEFAULT_PROVENANCE_SIM },
    M_PLUS_2: { marketId: 'ES_GO', tenor: 'M_PLUS_2', bid: 45.00, offer: 49.00, mid: 47.00, updatedAt: '2026-08-15T08:00:00Z', provenance: DEFAULT_PROVENANCE_SIM },
    Q1: { marketId: 'ES_GO', tenor: 'Q1', bid: 46.00, offer: 50.00, mid: 48.00, updatedAt: '2026-08-15T08:00:00Z', provenance: DEFAULT_PROVENANCE_SIM },
    Q2: { marketId: 'ES_GO', tenor: 'Q2', bid: 47.00, offer: 51.00, mid: 49.00, updatedAt: '2026-08-15T08:00:00Z', provenance: DEFAULT_PROVENANCE_SIM },
    Q3: { marketId: 'ES_GO', tenor: 'Q3', bid: 48.00, offer: 52.00, mid: 50.00, updatedAt: '2026-08-15T08:00:00Z', provenance: DEFAULT_PROVENANCE_SIM },
    Q4: { marketId: 'ES_GO', tenor: 'Q4', bid: 49.00, offer: 53.00, mid: 51.00, updatedAt: '2026-08-15T08:00:00Z', provenance: DEFAULT_PROVENANCE_SIM },
    CAL_PLUS_1: { marketId: 'ES_GO', tenor: 'CAL_PLUS_1', bid: 48.00, offer: 52.00, mid: 50.00, updatedAt: '2026-08-15T08:00:00Z', provenance: DEFAULT_PROVENANCE_SIM },
    CAL_PLUS_2: { marketId: 'ES_GO', tenor: 'CAL_PLUS_2', bid: 51.00, offer: 55.00, mid: 53.00, updatedAt: '2026-08-15T08:00:00Z', provenance: DEFAULT_PROVENANCE_SIM },
    CAL_PLUS_3: { marketId: 'ES_GO', tenor: 'CAL_PLUS_3', bid: 54.00, offer: 58.00, mid: 56.00, updatedAt: '2026-08-15T08:00:00Z', provenance: DEFAULT_PROVENANCE_SIM },
  },

  // Austria GO (€/MWh)
  AT_GO: {
    M_PLUS_1: { marketId: 'AT_GO', tenor: 'M_PLUS_1', bid: 52.00, offer: 56.00, mid: 54.00, updatedAt: '2026-08-15T08:00:00Z', provenance: DEFAULT_PROVENANCE_SIM },
    M_PLUS_2: { marketId: 'AT_GO', tenor: 'M_PLUS_2', bid: 53.00, offer: 57.00, mid: 55.00, updatedAt: '2026-08-15T08:00:00Z', provenance: DEFAULT_PROVENANCE_SIM },
    Q1: { marketId: 'AT_GO', tenor: 'Q1', bid: 54.00, offer: 58.00, mid: 56.00, updatedAt: '2026-08-15T08:00:00Z', provenance: DEFAULT_PROVENANCE_SIM },
    Q2: { marketId: 'AT_GO', tenor: 'Q2', bid: 55.00, offer: 59.00, mid: 57.00, updatedAt: '2026-08-15T08:00:00Z', provenance: DEFAULT_PROVENANCE_SIM },
    Q3: { marketId: 'AT_GO', tenor: 'Q3', bid: 56.00, offer: 60.00, mid: 58.00, updatedAt: '2026-08-15T08:00:00Z', provenance: DEFAULT_PROVENANCE_SIM },
    Q4: { marketId: 'AT_GO', tenor: 'Q4', bid: 57.00, offer: 61.00, mid: 59.00, updatedAt: '2026-08-15T08:00:00Z', provenance: DEFAULT_PROVENANCE_SIM },
    CAL_PLUS_1: { marketId: 'AT_GO', tenor: 'CAL_PLUS_1', bid: 56.00, offer: 60.00, mid: 58.00, updatedAt: '2026-08-15T08:00:00Z', provenance: DEFAULT_PROVENANCE_SIM },
    CAL_PLUS_2: { marketId: 'AT_GO', tenor: 'CAL_PLUS_2', bid: 59.00, offer: 63.00, mid: 61.00, updatedAt: '2026-08-15T08:00:00Z', provenance: DEFAULT_PROVENANCE_SIM },
    CAL_PLUS_3: { marketId: 'AT_GO', tenor: 'CAL_PLUS_3', bid: 62.00, offer: 66.00, mid: 64.00, updatedAt: '2026-08-15T08:00:00Z', provenance: DEFAULT_PROVENANCE_SIM },
  },

  // EU ETS 1 (€/tCO2e)
  EU_ETS1: {
    M_PLUS_1: { marketId: 'EU_ETS1', tenor: 'M_PLUS_1', bid: 68.00, offer: 70.00, mid: 69.00, updatedAt: '2026-08-15T08:00:00Z', provenance: DEFAULT_PROVENANCE_EEX },
    M_PLUS_2: { marketId: 'EU_ETS1', tenor: 'M_PLUS_2', bid: 69.00, offer: 71.00, mid: 70.00, updatedAt: '2026-08-15T08:00:00Z', provenance: DEFAULT_PROVENANCE_EEX },
    Q1: { marketId: 'EU_ETS1', tenor: 'Q1', bid: 71.00, offer: 73.00, mid: 72.00, updatedAt: '2026-08-15T08:00:00Z', provenance: DEFAULT_PROVENANCE_EEX },
    Q2: { marketId: 'EU_ETS1', tenor: 'Q2', bid: 72.00, offer: 74.00, mid: 73.00, updatedAt: '2026-08-15T08:00:00Z', provenance: DEFAULT_PROVENANCE_EEX },
    Q3: { marketId: 'EU_ETS1', tenor: 'Q3', bid: 73.00, offer: 75.00, mid: 74.00, updatedAt: '2026-08-15T08:00:00Z', provenance: DEFAULT_PROVENANCE_EEX },
    Q4: { marketId: 'EU_ETS1', tenor: 'Q4', bid: 75.00, offer: 77.00, mid: 76.00, updatedAt: '2026-08-15T08:00:00Z', provenance: DEFAULT_PROVENANCE_EEX },
    CAL_PLUS_1: { marketId: 'EU_ETS1', tenor: 'CAL_PLUS_1', bid: 74.00, offer: 76.00, mid: 75.00, updatedAt: '2026-08-15T08:00:00Z', provenance: DEFAULT_PROVENANCE_EEX },
    CAL_PLUS_2: { marketId: 'EU_ETS1', tenor: 'CAL_PLUS_2', bid: 79.00, offer: 81.00, mid: 80.00, updatedAt: '2026-08-15T08:00:00Z', provenance: DEFAULT_PROVENANCE_EEX },
    CAL_PLUS_3: { marketId: 'EU_ETS1', tenor: 'CAL_PLUS_3', bid: 84.00, offer: 86.00, mid: 85.00, updatedAt: '2026-08-15T08:00:00Z', provenance: DEFAULT_PROVENANCE_EEX },
  },
};

// Baseline realistic FX Forward Marks
const DEFAULT_FX_FORWARD_CURVE: Record<DeliveryTenor, ForwardFxMark> = {
  M_PLUS_1: { tenor: 'M_PLUS_1', gbpEur: 1.172, chfEur: 1.058, updatedAt: '2026-08-15T08:00:00Z', provenance: DEFAULT_PROVENANCE_SIM },
  M_PLUS_2: { tenor: 'M_PLUS_2', gbpEur: 1.173, chfEur: 1.059, updatedAt: '2026-08-15T08:00:00Z', provenance: DEFAULT_PROVENANCE_SIM },
  Q1: { tenor: 'Q1', gbpEur: 1.174, chfEur: 1.060, updatedAt: '2026-08-15T08:00:00Z', provenance: DEFAULT_PROVENANCE_SIM },
  Q2: { tenor: 'Q2', gbpEur: 1.175, chfEur: 1.061, updatedAt: '2026-08-15T08:00:00Z', provenance: DEFAULT_PROVENANCE_SIM },
  Q3: { tenor: 'Q3', gbpEur: 1.176, chfEur: 1.062, updatedAt: '2026-08-15T08:00:00Z', provenance: DEFAULT_PROVENANCE_SIM },
  Q4: { tenor: 'Q4', gbpEur: 1.177, chfEur: 1.063, updatedAt: '2026-08-15T08:00:00Z', provenance: DEFAULT_PROVENANCE_SIM },
  CAL_PLUS_1: { tenor: 'CAL_PLUS_1', gbpEur: 1.175, chfEur: 1.061, updatedAt: '2026-08-15T08:00:00Z', provenance: DEFAULT_PROVENANCE_SIM },
  CAL_PLUS_2: { tenor: 'CAL_PLUS_2', gbpEur: 1.178, chfEur: 1.065, updatedAt: '2026-08-15T08:00:00Z', provenance: DEFAULT_PROVENANCE_SIM },
  CAL_PLUS_3: { tenor: 'CAL_PLUS_3', gbpEur: 1.180, chfEur: 1.068, updatedAt: '2026-08-15T08:00:00Z', provenance: DEFAULT_PROVENANCE_SIM },
};

export function getDefaultForwardCurveMatrix(): ForwardCurveMatrix {
  return {
    gasForwardCurve: { ...DEFAULT_GAS_FORWARD_CURVE },
    certificateForwardCurves: { ...DEFAULT_CERTIFICATE_FORWARD_CURVES },
    fxForwardCurve: { ...DEFAULT_FX_FORWARD_CURVE },
    asOfDate: '2026-08-15T08:00:00Z',
  };
}

export function buildForwardCurveMatrix(
  customGasMarks?: Partial<Record<DeliveryTenor, Partial<ForwardGasMark>>>,
  customCertMarks?: Record<string, Partial<Record<DeliveryTenor, Partial<ForwardCertificateMark>>>>,
  customFxMarks?: Partial<Record<DeliveryTenor, Partial<ForwardFxMark>>>,
  asOfDate: string = '2026-08-15T08:00:00Z'
): ForwardCurveMatrix {
  const base = getDefaultForwardCurveMatrix();

  const gasCurve: Record<DeliveryTenor, ForwardGasMark> = { ...base.gasForwardCurve };
  if (customGasMarks) {
    for (const tenor of ALL_DELIVERY_TENORS) {
      if (customGasMarks[tenor]) {
        gasCurve[tenor] = {
          ...gasCurve[tenor],
          ...customGasMarks[tenor],
        };
      }
    }
  }

  const certCurves: Record<string, Record<DeliveryTenor, ForwardCertificateMark>> = {
    ...base.certificateForwardCurves,
  };
  if (customCertMarks) {
    for (const [marketId, tenorMap] of Object.entries(customCertMarks)) {
      certCurves[marketId] = certCurves[marketId] ? { ...certCurves[marketId] } : {} as Record<DeliveryTenor, ForwardCertificateMark>;
      for (const tenor of ALL_DELIVERY_TENORS) {
        if (tenorMap[tenor]) {
          certCurves[marketId][tenor] = {
            ...(certCurves[marketId][tenor] || {
              marketId,
              tenor,
              bid: null,
              offer: null,
              mid: null,
              updatedAt: asOfDate,
              provenance: DEFAULT_PROVENANCE_SIM,
            }),
            ...tenorMap[tenor],
          };
        }
      }
    }
  }

  const fxCurve: Record<DeliveryTenor, ForwardFxMark> = { ...base.fxForwardCurve };
  if (customFxMarks) {
    for (const tenor of ALL_DELIVERY_TENORS) {
      if (customFxMarks[tenor]) {
        fxCurve[tenor] = {
          ...fxCurve[tenor],
          ...customFxMarks[tenor],
        };
      }
    }
  }

  return {
    gasForwardCurve: gasCurve,
    certificateForwardCurves: certCurves,
    fxForwardCurve: fxCurve,
    asOfDate,
  };
}
