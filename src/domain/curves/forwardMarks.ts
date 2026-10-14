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

const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

const pad = (n: number): string => String(n).padStart(2, '0');

/**
 * Pure helper function that dynamically computes the month, quarter, and calendar year
 * labels (M+1, M+2, Q1..Q4, Cal+1..Cal+3) relative to referenceDate.
 */
export function buildTenorDefinitions(referenceDate: Date = new Date()): TenorDefinition[] {
  const refYear = referenceDate.getFullYear();
  const refMonth = referenceDate.getMonth(); // 0-indexed: 0 = Jan, 7 = Aug

  // Prompt Month+1
  const m1Date = new Date(refYear, refMonth + 1, 1);
  const m1Year = m1Date.getFullYear();
  const m1MonthIdx = m1Date.getMonth();
  const m1Month = m1MonthIdx + 1;
  const m1LastDay = new Date(m1Year, m1Month, 0).getDate();
  const m1Period = `${MONTH_NAMES[m1MonthIdx]} ${m1Year}`;

  // Prompt Month+2
  const m2Date = new Date(refYear, refMonth + 2, 1);
  const m2Year = m2Date.getFullYear();
  const m2MonthIdx = m2Date.getMonth();
  const m2Month = m2MonthIdx + 1;
  const m2LastDay = new Date(m2Year, m2Month, 0).getDate();
  const m2Period = `${MONTH_NAMES[m2MonthIdx]} ${m2Year}`;

  // Quarters and Calendar baseload strips benchmark against prompt front year (Cal+1)
  const cal1Year = refYear + 1;
  const cal2Year = refYear + 2;
  const cal3Year = refYear + 3;

  return [
    {
      tenor: 'M_PLUS_1',
      label: 'Prompt Month+1',
      shortLabel: 'M+1',
      category: 'PROMPT',
      deliveryYear: m1Year,
      month: m1Month,
      deliveryPeriod: m1Period,
      startDate: `${m1Year}-${pad(m1Month)}-01`,
      endDate: `${m1Year}-${pad(m1Month)}-${pad(m1LastDay)}`,
      description: 'Front prompt monthly delivery contract on TTF / National hubs',
    },
    {
      tenor: 'M_PLUS_2',
      label: 'Prompt Month+2',
      shortLabel: 'M+2',
      category: 'PROMPT',
      deliveryYear: m2Year,
      month: m2Month,
      deliveryPeriod: m2Period,
      startDate: `${m2Year}-${pad(m2Month)}-01`,
      endDate: `${m2Year}-${pad(m2Month)}-${pad(m2LastDay)}`,
      description: 'Second prompt monthly delivery contract',
    },
    {
      tenor: 'Q1',
      label: 'Quarter 1 (Winter Peak)',
      shortLabel: 'Q1',
      category: 'QUARTER',
      deliveryYear: cal1Year,
      quarter: 1,
      deliveryPeriod: `Q1 ${cal1Year}`,
      startDate: `${cal1Year}-01-01`,
      endDate: `${cal1Year}-03-31`,
      description: 'First quarter peak heating & transport compliance period',
    },
    {
      tenor: 'Q2',
      label: 'Quarter 2 (Summer Injection)',
      shortLabel: 'Q2',
      category: 'QUARTER',
      deliveryYear: cal1Year,
      quarter: 2,
      deliveryPeriod: `Q2 ${cal1Year}`,
      startDate: `${cal1Year}-04-01`,
      endDate: `${cal1Year}-06-30`,
      description: 'Second quarter injection season and agricultural feedstock flush',
    },
    {
      tenor: 'Q3',
      label: 'Quarter 3 (Summer Trough)',
      shortLabel: 'Q3',
      category: 'QUARTER',
      deliveryYear: cal1Year,
      quarter: 3,
      deliveryPeriod: `Q3 ${cal1Year}`,
      startDate: `${cal1Year}-07-01`,
      endDate: `${cal1Year}-09-30`,
      description: 'Third quarter low gas demand period',
    },
    {
      tenor: 'Q4',
      label: 'Quarter 4 (Winter Ramp)',
      shortLabel: 'Q4',
      category: 'QUARTER',
      deliveryYear: cal1Year,
      quarter: 4,
      deliveryPeriod: `Q4 ${cal1Year}`,
      startDate: `${cal1Year}-10-01`,
      endDate: `${cal1Year}-12-31`,
      description: 'Fourth quarter annual quota surrender & compliance deadline sprint',
    },
    {
      tenor: 'CAL_PLUS_1',
      label: 'Calendar Cal+1',
      shortLabel: `Cal ${cal1Year}`,
      category: 'CALENDAR',
      deliveryYear: cal1Year,
      deliveryPeriod: `Cal ${cal1Year}`,
      startDate: `${cal1Year}-01-01`,
      endDate: `${cal1Year}-12-31`,
      description: `Full calendar year ${cal1Year} baseload strip`,
    },
    {
      tenor: 'CAL_PLUS_2',
      label: 'Calendar Cal+2',
      shortLabel: `Cal ${cal2Year}`,
      category: 'CALENDAR',
      deliveryYear: cal2Year,
      deliveryPeriod: `Cal ${cal2Year}`,
      startDate: `${cal2Year}-01-01`,
      endDate: `${cal2Year}-12-31`,
      description: `Full calendar year ${cal2Year} forward strip`,
    },
    {
      tenor: 'CAL_PLUS_3',
      label: 'Calendar Cal+3',
      shortLabel: `Cal ${cal3Year}`,
      category: 'CALENDAR',
      deliveryYear: cal3Year,
      deliveryPeriod: `Cal ${cal3Year}`,
      startDate: `${cal3Year}-01-01`,
      endDate: `${cal3Year}-12-31`,
      description: `Full calendar year ${cal3Year} forward strip (RED III 2030 ramp-up)`,
    },
  ];
}

/**
 * Master rolling definitions of forward delivery tenors initialized cleanly.
 */
export const TENOR_DEFINITIONS: TenorDefinition[] = buildTenorDefinitions();

export function getTenorDefinition(tenor: DeliveryTenor, definitions: TenorDefinition[] = TENOR_DEFINITIONS): TenorDefinition {
  const def = definitions.find(t => t.tenor === tenor);
  if (!def) {
    throw new Error(`Unknown delivery tenor: ${tenor}`);
  }
  return def;
}

export function getTenorsByCategory(category: TenorCategory, definitions: TenorDefinition[] = TENOR_DEFINITIONS): TenorDefinition[] {
  return definitions.filter(t => t.category === category);
}

const DEFAULT_PROVENANCE_SIM: MarkProvenance = {
  sourceType: 'ESTIMATE',
  sourceName: 'SIMULATED',
  sourceUrl: null,
  observedAt: '2026-08-15T08:00:00Z',
  note: 'Forward curve econometric model / historical contango-backwardation baseline',
};

const DEFAULT_PROVENANCE_EEX: MarkProvenance = {
  sourceType: 'EXCHANGE_AUCTION',
  sourceName: 'EEX Forward Settlement',
  sourceUrl: 'https://www.eex.com',
  observedAt: '2026-08-15T08:00:00Z',
  note: 'Official exchange forward benchmark',
};

const DEFAULT_PROVENANCE_PRA: MarkProvenance = {
  sourceType: 'PRICE_REPORTING',
  sourceName: 'Argus Media / Platts',
  sourceUrl: 'https://www.argusmedia.com',
  observedAt: '2026-08-15T08:00:00Z',
  note: 'Assessed forward broker curve assessment',
};

// Baseline realistic Gas Forward Marks (TTF €/MWh)
const DEFAULT_GAS_FORWARD_CURVE: Record<DeliveryTenor, ForwardGasMark> = {
  M_PLUS_1: { tenor: 'M_PLUS_1', bid: 38.20, offer: 38.80, mid: 38.50, updatedAt: '2026-08-15T08:00:00Z', provenance: DEFAULT_PROVENANCE_EEX },
  M_PLUS_2: { tenor: 'M_PLUS_2', bid: 39.00, offer: 39.60, mid: 39.30, updatedAt: '2026-08-15T08:00:00Z', provenance: DEFAULT_PROVENANCE_EEX },
  Q1: { tenor: 'Q1', bid: 41.50, offer: 42.10, mid: 41.80, updatedAt: '2026-08-15T08:00:00Z', provenance: DEFAULT_PROVENANCE_EEX },
  Q2: { tenor: 'Q2', bid: 36.80, offer: 37.40, mid: 37.10, updatedAt: '2026-08-15T08:00:00Z', provenance: DEFAULT_PROVENANCE_EEX },
  Q3: { tenor: 'Q3', bid: 35.20, offer: 35.80, mid: 35.50, updatedAt: '2026-08-15T08:00:00Z', provenance: DEFAULT_PROVENANCE_EEX },
  Q4: { tenor: 'Q4', bid: 39.80, offer: 40.40, mid: 40.10, updatedAt: '2026-08-15T08:00:00Z', provenance: DEFAULT_PROVENANCE_EEX },
  CAL_PLUS_1: { tenor: 'CAL_PLUS_1', bid: 33.30, offer: 33.90, mid: 33.60, updatedAt: '2026-08-15T08:00:00Z', provenance: DEFAULT_PROVENANCE_EEX },
  CAL_PLUS_2: { tenor: 'CAL_PLUS_2', bid: 31.00, offer: 31.80, mid: 31.40, updatedAt: '2026-08-15T08:00:00Z', provenance: DEFAULT_PROVENANCE_EEX },
  CAL_PLUS_3: { tenor: 'CAL_PLUS_3', bid: 28.50, offer: 29.30, mid: 28.90, updatedAt: '2026-08-15T08:00:00Z', provenance: DEFAULT_PROVENANCE_EEX },
};

// Baseline realistic Certificate Forward Marks across European Compliance & GO Markets
const DEFAULT_CERTIFICATE_FORWARD_CURVES: Record<string, Record<DeliveryTenor, ForwardCertificateMark>> = {
  // Germany THG Quota (€/tCO2e)
  DE_THG: {
    M_PLUS_1: { marketId: 'DE_THG', tenor: 'M_PLUS_1', bid: 280.0, offer: 290.0, mid: 285.0, updatedAt: '2026-08-15T08:00:00Z', provenance: DEFAULT_PROVENANCE_PRA },
    M_PLUS_2: { marketId: 'DE_THG', tenor: 'M_PLUS_2', bid: 282.0, offer: 292.0, mid: 287.0, updatedAt: '2026-08-15T08:00:00Z', provenance: DEFAULT_PROVENANCE_PRA },
    Q1: { marketId: 'DE_THG', tenor: 'Q1', bid: 290.0, offer: 300.0, mid: 295.0, updatedAt: '2026-08-15T08:00:00Z', provenance: DEFAULT_PROVENANCE_PRA },
    Q2: { marketId: 'DE_THG', tenor: 'Q2', bid: 295.0, offer: 305.0, mid: 300.0, updatedAt: '2026-08-15T08:00:00Z', provenance: DEFAULT_PROVENANCE_PRA },
    Q3: { marketId: 'DE_THG', tenor: 'Q3', bid: 300.0, offer: 310.0, mid: 305.0, updatedAt: '2026-08-15T08:00:00Z', provenance: DEFAULT_PROVENANCE_PRA },
    Q4: { marketId: 'DE_THG', tenor: 'Q4', bid: 310.0, offer: 320.0, mid: 315.0, updatedAt: '2026-08-15T08:00:00Z', provenance: DEFAULT_PROVENANCE_PRA },
    CAL_PLUS_1: { marketId: 'DE_THG', tenor: 'CAL_PLUS_1', bid: 310.0, offer: 320.0, mid: 315.0, updatedAt: '2026-08-15T08:00:00Z', provenance: DEFAULT_PROVENANCE_PRA },
    CAL_PLUS_2: { marketId: 'DE_THG', tenor: 'CAL_PLUS_2', bid: 340.0, offer: 350.0, mid: 345.0, updatedAt: '2026-08-15T08:00:00Z', provenance: DEFAULT_PROVENANCE_PRA },
    CAL_PLUS_3: { marketId: 'DE_THG', tenor: 'CAL_PLUS_3', bid: 380.0, offer: 390.0, mid: 385.0, updatedAt: '2026-08-15T08:00:00Z', provenance: DEFAULT_PROVENANCE_PRA },
  },

  // Netherlands ERE (€/GJ)
  NL_ERE: {
    M_PLUS_1: { marketId: 'NL_ERE', tenor: 'M_PLUS_1', bid: 0.33, offer: 0.35, mid: 0.34, updatedAt: '2026-08-15T08:00:00Z', provenance: DEFAULT_PROVENANCE_PRA },
    M_PLUS_2: { marketId: 'NL_ERE', tenor: 'M_PLUS_2', bid: 0.335, offer: 0.355, mid: 0.345, updatedAt: '2026-08-15T08:00:00Z', provenance: DEFAULT_PROVENANCE_PRA },
    Q1: { marketId: 'NL_ERE', tenor: 'Q1', bid: 0.35, offer: 0.37, mid: 0.36, updatedAt: '2026-08-15T08:00:00Z', provenance: DEFAULT_PROVENANCE_PRA },
    Q2: { marketId: 'NL_ERE', tenor: 'Q2', bid: 0.355, offer: 0.375, mid: 0.365, updatedAt: '2026-08-15T08:00:00Z', provenance: DEFAULT_PROVENANCE_PRA },
    Q3: { marketId: 'NL_ERE', tenor: 'Q3', bid: 0.36, offer: 0.38, mid: 0.37, updatedAt: '2026-08-15T08:00:00Z', provenance: DEFAULT_PROVENANCE_PRA },
    Q4: { marketId: 'NL_ERE', tenor: 'Q4', bid: 0.37, offer: 0.39, mid: 0.38, updatedAt: '2026-08-15T08:00:00Z', provenance: DEFAULT_PROVENANCE_PRA },
    CAL_PLUS_1: { marketId: 'NL_ERE', tenor: 'CAL_PLUS_1', bid: 0.365, offer: 0.385, mid: 0.375, updatedAt: '2026-08-15T08:00:00Z', provenance: DEFAULT_PROVENANCE_PRA },
    CAL_PLUS_2: { marketId: 'NL_ERE', tenor: 'CAL_PLUS_2', bid: 0.395, offer: 0.415, mid: 0.405, updatedAt: '2026-08-15T08:00:00Z', provenance: DEFAULT_PROVENANCE_PRA },
    CAL_PLUS_3: { marketId: 'NL_ERE', tenor: 'CAL_PLUS_3', bid: 0.435, offer: 0.455, mid: 0.445, updatedAt: '2026-08-15T08:00:00Z', provenance: DEFAULT_PROVENANCE_PRA },
  },

  // France CPB (€/MWh) - bounded by statutory €100.00 cap
  FR_CPB: {
    M_PLUS_1: { marketId: 'FR_CPB', tenor: 'M_PLUS_1', bid: 84.0, offer: 88.0, mid: 86.0, updatedAt: '2026-08-15T08:00:00Z', provenance: DEFAULT_PROVENANCE_PRA },
    M_PLUS_2: { marketId: 'FR_CPB', tenor: 'M_PLUS_2', bid: 85.0, offer: 89.0, mid: 87.0, updatedAt: '2026-08-15T08:00:00Z', provenance: DEFAULT_PROVENANCE_PRA },
    Q1: { marketId: 'FR_CPB', tenor: 'Q1', bid: 88.0, offer: 92.0, mid: 90.0, updatedAt: '2026-08-15T08:00:00Z', provenance: DEFAULT_PROVENANCE_PRA },
    Q2: { marketId: 'FR_CPB', tenor: 'Q2', bid: 89.0, offer: 93.0, mid: 91.0, updatedAt: '2026-08-15T08:00:00Z', provenance: DEFAULT_PROVENANCE_PRA },
    Q3: { marketId: 'FR_CPB', tenor: 'Q3', bid: 90.0, offer: 94.0, mid: 92.0, updatedAt: '2026-08-15T08:00:00Z', provenance: DEFAULT_PROVENANCE_PRA },
    Q4: { marketId: 'FR_CPB', tenor: 'Q4', bid: 92.0, offer: 96.0, mid: 94.0, updatedAt: '2026-08-15T08:00:00Z', provenance: DEFAULT_PROVENANCE_PRA },
    CAL_PLUS_1: { marketId: 'FR_CPB', tenor: 'CAL_PLUS_1', bid: 91.0, offer: 95.0, mid: 93.0, updatedAt: '2026-08-15T08:00:00Z', provenance: DEFAULT_PROVENANCE_PRA },
    CAL_PLUS_2: { marketId: 'FR_CPB', tenor: 'CAL_PLUS_2', bid: 95.0, offer: 99.0, mid: 97.0, updatedAt: '2026-08-15T08:00:00Z', provenance: DEFAULT_PROVENANCE_PRA },
    CAL_PLUS_3: { marketId: 'FR_CPB', tenor: 'CAL_PLUS_3', bid: 98.0, offer: 100.0, mid: 99.0, updatedAt: '2026-08-15T08:00:00Z', provenance: DEFAULT_PROVENANCE_PRA },
  },

  // Italy CIC (€/CIC)
  IT_CIC: {
    M_PLUS_1: { marketId: 'IT_CIC', tenor: 'M_PLUS_1', bid: 320.0, offer: 330.0, mid: 325.0, updatedAt: '2026-08-15T08:00:00Z', provenance: DEFAULT_PROVENANCE_PRA },
    M_PLUS_2: { marketId: 'IT_CIC', tenor: 'M_PLUS_2', bid: 322.0, offer: 332.0, mid: 327.0, updatedAt: '2026-08-15T08:00:00Z', provenance: DEFAULT_PROVENANCE_PRA },
    Q1: { marketId: 'IT_CIC', tenor: 'Q1', bid: 325.0, offer: 335.0, mid: 330.0, updatedAt: '2026-08-15T08:00:00Z', provenance: DEFAULT_PROVENANCE_PRA },
    Q2: { marketId: 'IT_CIC', tenor: 'Q2', bid: 328.0, offer: 338.0, mid: 333.0, updatedAt: '2026-08-15T08:00:00Z', provenance: DEFAULT_PROVENANCE_PRA },
    Q3: { marketId: 'IT_CIC', tenor: 'Q3', bid: 332.0, offer: 342.0, mid: 337.0, updatedAt: '2026-08-15T08:00:00Z', provenance: DEFAULT_PROVENANCE_PRA },
    Q4: { marketId: 'IT_CIC', tenor: 'Q4', bid: 338.0, offer: 348.0, mid: 343.0, updatedAt: '2026-08-15T08:00:00Z', provenance: DEFAULT_PROVENANCE_PRA },
    CAL_PLUS_1: { marketId: 'IT_CIC', tenor: 'CAL_PLUS_1', bid: 335.0, offer: 345.0, mid: 340.0, updatedAt: '2026-08-15T08:00:00Z', provenance: DEFAULT_PROVENANCE_PRA },
    CAL_PLUS_2: { marketId: 'IT_CIC', tenor: 'CAL_PLUS_2', bid: 350.0, offer: 360.0, mid: 355.0, updatedAt: '2026-08-15T08:00:00Z', provenance: DEFAULT_PROVENANCE_PRA },
    CAL_PLUS_3: { marketId: 'IT_CIC', tenor: 'CAL_PLUS_3', bid: 365.0, offer: 375.0, mid: 370.0, updatedAt: '2026-08-15T08:00:00Z', provenance: DEFAULT_PROVENANCE_PRA },
  },

  // UK RTFO (GBP/dRTFC)
  UK_RTFO: {
    M_PLUS_1: { marketId: 'UK_RTFO', tenor: 'M_PLUS_1', bid: 0.210, offer: 0.220, mid: 0.215, updatedAt: '2026-08-15T08:00:00Z', provenance: DEFAULT_PROVENANCE_PRA },
    M_PLUS_2: { marketId: 'UK_RTFO', tenor: 'M_PLUS_2', bid: 0.215, offer: 0.225, mid: 0.220, updatedAt: '2026-08-15T08:00:00Z', provenance: DEFAULT_PROVENANCE_PRA },
    Q1: { marketId: 'UK_RTFO', tenor: 'Q1', bid: 0.225, offer: 0.235, mid: 0.230, updatedAt: '2026-08-15T08:00:00Z', provenance: DEFAULT_PROVENANCE_PRA },
    Q2: { marketId: 'UK_RTFO', tenor: 'Q2', bid: 0.230, offer: 0.240, mid: 0.235, updatedAt: '2026-08-15T08:00:00Z', provenance: DEFAULT_PROVENANCE_PRA },
    Q3: { marketId: 'UK_RTFO', tenor: 'Q3', bid: 0.235, offer: 0.245, mid: 0.240, updatedAt: '2026-08-15T08:00:00Z', provenance: DEFAULT_PROVENANCE_PRA },
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
