import { EUROPEAN_MARKET_BENCHMARKS } from '../markets/marketBenchmarks';

/**
 * Commercial assumptions register.
 *
 * Every number the engines use that is a commercial judgement — not a statute, a physical
 * constant or a live mark — lives here with its unit and where it came from, so each idea
 * the desk screens shows what it assumes and a trader can change it.
 *
 * Overrides are kept in this browser's localStorage (per user, per machine). Defaults are
 * never silently changed: a reset always returns to the value and source shown here.
 */

export type AssumptionCategory = 'FUELEU' | 'FARMGATE' | 'SCANNER' | 'RISK';

/** How much weight the default can bear. */
export type AssumptionBasis =
  | 'MARKET_MARK'     // taken from a dated market benchmark in this app
  | 'DESK_ESTIMATE'   // a desk judgement with no transaction evidence on file
  | 'DESK_POLICY';    // a desk choice (fee, convention), not a market fact

export interface AssumptionDefinition {
  key: string;
  category: AssumptionCategory;
  label: string;
  unit: string;
  defaultValue: number;
  basis: AssumptionBasis;
  source: string;
  /** Where the value changes an output. */
  usedIn: string;
  min?: number;
  max?: number;
}

const fueleuMark = EUROPEAN_MARKET_BENCHMARKS.find(b => b.marketId === 'FUELEU');
const fueleuMarkSource = fueleuMark
  ? `FuelEU mark in Pricing Desk (${fueleuMark.sourceName}, observed ${fueleuMark.observedAt})`
  : 'FuelEU mark in Pricing Desk';

const FARMGATE_DEFAULTS: Record<string, { name: string; premium: number; fixed: number }> = {
  DK: { name: 'Denmark', premium: 26.0, fixed: 58.5 },
  DE: { name: 'Germany', premium: 48.0, fixed: 88.0 },
  FR: { name: 'France', premium: 22.0, fixed: 82.0 },
  NL: { name: 'Netherlands', premium: 28.0, fixed: 64.0 },
  GB: { name: 'United Kingdom', premium: 18.5, fixed: 68.0 },
  IT: { name: 'Italy', premium: 35.0, fixed: 92.0 },
  ES: { name: 'Spain', premium: 24.0, fixed: 58.0 },
  SE: { name: 'Sweden', premium: 25.0, fixed: 72.0 },
  AT: { name: 'Austria', premium: 24.0, fixed: 76.0 },
  BE: { name: 'Belgium', premium: 24.0, fixed: 62.0 },
  DEFAULT: { name: 'Other countries', premium: 24.0, fixed: 65.0 },
};

const FARMGATE_SOURCE = 'Desk indicative estimate — no transaction evidence on file. Replace with producer offers as they come in.';

export const ASSUMPTION_DEFINITIONS: AssumptionDefinition[] = [
  // ── FuelEU Maritime pathway economics ────────────────────────────────────
  {
    key: 'fueleu.bioLngPremiumEurPerMwh',
    category: 'FUELEU',
    label: 'Bio-LNG delivered premium over the fuel it displaces',
    unit: '€/MWh',
    defaultValue: 65,
    basis: 'DESK_ESTIMATE',
    source: 'Desk estimate for NL/DK manure Bio-LNG — not a supplier quote.',
    usedIn: 'FuelEU vessel calculator: client saving on the physical Bio-LNG route',
    min: 0,
  },
  {
    key: 'fueleu.physicalDeskMarginEurPerMwh',
    category: 'FUELEU',
    label: 'Desk margin on physical Bio-LNG supply',
    unit: '€/MWh',
    defaultValue: 15,
    basis: 'DESK_POLICY',
    source: 'Desk target margin.',
    usedIn: 'FuelEU vessel calculator: desk margin on the physical route',
    min: 0,
  },
  {
    key: 'fueleu.poolBuyPriceEurPerTco2e',
    category: 'FUELEU',
    label: 'Pool price charged to a deficit client (desk offer)',
    unit: '€/tCO₂e',
    defaultValue: fueleuMark?.offerPrice ?? 300,
    basis: 'MARKET_MARK',
    source: `${fueleuMarkSource} — offer side.`,
    usedIn: 'FuelEU calculators: client saving on the pooling route; desk margin = offer − bid',
    min: 0,
  },
  {
    key: 'fueleu.poolSellPriceEurPerTco2e',
    category: 'FUELEU',
    label: 'Pool price paid to a surplus holder (desk bid)',
    unit: '€/tCO₂e',
    defaultValue: fueleuMark?.bidPrice ?? 270,
    basis: 'MARKET_MARK',
    source: `${fueleuMarkSource} — bid side.`,
    usedIn: 'FuelEU calculators: surplus monetisation; desk margin = offer − bid',
    min: 0,
  },

  // ── Farm-gate procurement benchmarks ─────────────────────────────────────
  ...Object.entries(FARMGATE_DEFAULTS).flatMap(([cc, d]): AssumptionDefinition[] => [
    {
      key: `farmgate.${cc}.premiumEurPerMwh`,
      category: 'FARMGATE',
      label: `${d.name}: premium over gas index`,
      unit: '€/MWh',
      defaultValue: d.premium,
      basis: 'DESK_ESTIMATE',
      source: FARMGATE_SOURCE,
      usedIn: 'Opportunity scanner: estimated farm-gate cost (index-linked countries)',
      min: 0,
    },
    {
      key: `farmgate.${cc}.fixedPriceEurPerMwh`,
      category: 'FARMGATE',
      label: `${d.name}: fixed farm-gate price`,
      unit: '€/MWh',
      defaultValue: d.fixed,
      basis: 'DESK_ESTIMATE',
      source: FARMGATE_SOURCE,
      usedIn: 'Opportunity scanner: estimated farm-gate cost (fixed-price countries)',
      min: 0,
    },
  ]),
  {
    key: 'farmgate.negativeCiUpliftEurPerMwh',
    category: 'FARMGATE',
    label: 'Extra premium for CI ≤ −80 g/MJ (manure)',
    unit: '€/MWh',
    defaultValue: 8,
    basis: 'DESK_ESTIMATE',
    source: FARMGATE_SOURCE,
    usedIn: 'Opportunity scanner: farm-gate premium adjustment',
  },
  {
    key: 'farmgate.highCiDiscountEurPerMwh',
    category: 'FARMGATE',
    label: 'Premium discount for CI ≥ 35 g/MJ (energy crops)',
    unit: '€/MWh',
    defaultValue: 10,
    basis: 'DESK_ESTIMATE',
    source: FARMGATE_SOURCE,
    usedIn: 'Opportunity scanner: farm-gate premium adjustment',
    min: 0,
  },
  {
    key: 'farmgate.minimumPremiumEurPerMwh',
    category: 'FARMGATE',
    label: 'Floor on the adjusted premium',
    unit: '€/MWh',
    defaultValue: 8,
    basis: 'DESK_ESTIMATE',
    source: FARMGATE_SOURCE,
    usedIn: 'Opportunity scanner: farm-gate premium adjustment',
    min: 0,
  },

  // ── Plant opportunity scanner ────────────────────────────────────────────
  {
    key: 'scanner.loadHoursPerYear',
    category: 'SCANNER',
    label: 'Full-load hours per year (plants with capacity but no annual energy)',
    unit: 'h/yr',
    defaultValue: 8000,
    basis: 'DESK_ESTIMATE',
    source: 'Desk estimate (~91% availability). Plant-reported annual energy is used when present.',
    usedIn: 'Opportunity scanner: annual volume and annual profit per plant',
    min: 0,
    max: 8784,
  },
  {
    key: 'scanner.fallbackAnnualGWh',
    category: 'SCANNER',
    label: 'Annual volume for plants with neither capacity nor energy on record',
    unit: 'GWh/yr',
    defaultValue: 25,
    basis: 'DESK_ESTIMATE',
    source: 'Desk placeholder for a small plant. Treat annual profit for these plants as illustrative.',
    usedIn: 'Opportunity scanner: annual volume and annual profit per plant',
    min: 0,
  },
  {
    key: 'scanner.logisticsDomesticEurPerMwh',
    category: 'SCANNER',
    label: 'Logistics cost, same-country route',
    unit: '€/MWh',
    defaultValue: 0.75,
    basis: 'DESK_ESTIMATE',
    source: 'Desk estimate for registry and grid fees. The Trade Builder prices the actual corridor.',
    usedIn: 'Opportunity scanner: net margin per plant',
    min: 0,
  },
  {
    key: 'scanner.logisticsCrossBorderEurPerMwh',
    category: 'SCANNER',
    label: 'Logistics cost, cross-border route',
    unit: '€/MWh',
    defaultValue: 1.65,
    basis: 'DESK_ESTIMATE',
    source: 'Desk estimate for entry/exit tariffs and registry fees. The Trade Builder prices the actual corridor.',
    usedIn: 'Opportunity scanner: net margin per plant',
    min: 0,
  },
  {
    key: 'scanner.noRoutePremiumEurPerMwh',
    category: 'SCANNER',
    label: 'Attribute value assumed when no market clears for a plant',
    unit: '€/MWh',
    defaultValue: 24.5,
    basis: 'DESK_ESTIMATE',
    source: 'Desk placeholder. Such plants are marked CONDITIONAL; check a route in the Trade Builder.',
    usedIn: 'Opportunity scanner: netback for plants with no eligible market',
  },
  {
    key: 'scanner.ci.manureDK',
    category: 'SCANNER',
    label: 'Assumed CI, manure plants in Denmark',
    unit: 'gCO₂e/MJ',
    defaultValue: -100,
    basis: 'DESK_ESTIMATE',
    source: 'Typical certified value for Danish manure co-digestion; plant-specific PoS values replace it.',
    usedIn: 'Opportunity scanner: certificate value per plant',
  },
  {
    key: 'scanner.ci.manureOther',
    category: 'SCANNER',
    label: 'Assumed CI, manure plants elsewhere',
    unit: 'gCO₂e/MJ',
    defaultValue: -85,
    basis: 'DESK_ESTIMATE',
    source: 'Desk estimate; plant-specific PoS values replace it.',
    usedIn: 'Opportunity scanner: certificate value per plant',
  },
  {
    key: 'scanner.ci.energyCrops',
    category: 'SCANNER',
    label: 'Assumed CI, energy-crop plants',
    unit: 'gCO₂e/MJ',
    defaultValue: 42,
    basis: 'DESK_ESTIMATE',
    source: 'Desk estimate; plant-specific PoS values replace it.',
    usedIn: 'Opportunity scanner: certificate value and classification per plant',
  },
  {
    key: 'scanner.ci.foodWaste',
    category: 'SCANNER',
    label: 'Assumed CI, food-waste plants',
    unit: 'gCO₂e/MJ',
    defaultValue: 14,
    basis: 'DESK_ESTIMATE',
    source: 'Desk estimate; plant-specific PoS values replace it.',
    usedIn: 'Opportunity scanner: certificate value per plant',
  },
  {
    key: 'scanner.ci.sewageSludge',
    category: 'SCANNER',
    label: 'Assumed CI, sewage-sludge plants',
    unit: 'gCO₂e/MJ',
    defaultValue: 22,
    basis: 'DESK_ESTIMATE',
    source: 'Desk estimate; plant-specific PoS values replace it.',
    usedIn: 'Opportunity scanner: certificate value per plant',
  },
  {
    key: 'scanner.ci.agriResidues',
    category: 'SCANNER',
    label: 'Assumed CI, agricultural-residue plants',
    unit: 'gCO₂e/MJ',
    defaultValue: 16,
    basis: 'DESK_ESTIMATE',
    source: 'Desk estimate; plant-specific PoS values replace it.',
    usedIn: 'Opportunity scanner: certificate value per plant',
  },

  // ── Netback risk suite fallbacks ─────────────────────────────────────────
  {
    key: 'risk.illustrativeVolumeMwh',
    category: 'RISK',
    label: 'Volume used for risk notionals when the deal has none',
    unit: 'MWh',
    defaultValue: 10000,
    basis: 'DESK_POLICY',
    source: 'Illustrative sizing only. Enter a volume on the deal to replace it.',
    usedIn: 'Trade builder risk suite: basis, replacement-cost and 2026-cliff notionals',
    min: 0,
  },
  {
    key: 'risk.replacementCeilingFloorEurPerMwh',
    category: 'RISK',
    label: 'Replacement-cost ceiling floor (markets without a statutory ceiling)',
    unit: '€/MWh',
    defaultValue: 120,
    basis: 'DESK_ESTIMATE',
    source: 'Desk estimate. FR CPB and DE THG use their statutory ceilings instead.',
    usedIn: 'Trade builder risk suite: replacement-cost exposure',
    min: 0,
  },
  {
    key: 'risk.replacementCeilingNetbackMultiple',
    category: 'RISK',
    label: 'Replacement-cost ceiling as a multiple of netback',
    unit: '×',
    defaultValue: 1.5,
    basis: 'DESK_ESTIMATE',
    source: 'Desk estimate. The ceiling is the larger of this multiple and the floor.',
    usedIn: 'Trade builder risk suite: replacement-cost exposure',
    min: 1,
  },
  {
    key: 'risk.fallbackProcurementPremiumEurPerMwh',
    category: 'RISK',
    label: 'Procurement premium over gas index when no producer price is set',
    unit: '€/MWh',
    defaultValue: 25,
    basis: 'DESK_ESTIMATE',
    source: 'Desk estimate. Set producer pricing on the deal to replace it.',
    usedIn: 'Trade builder risk suite: replacement-cost exposure',
    min: 0,
  },
  {
    key: 'risk.fallbackProcurementEurPerMwh',
    category: 'RISK',
    label: 'Procurement cost when neither producer price nor gas mark is available',
    unit: '€/MWh',
    defaultValue: 58,
    basis: 'DESK_ESTIMATE',
    source: 'Desk estimate.',
    usedIn: 'Trade builder risk suite: replacement-cost exposure',
    min: 0,
  },
  {
    key: 'risk.deThgBundleRefNeg80EurPerMwh',
    category: 'RISK',
    label: 'DE THG traded bundle reference, CI ≤ −80 g/MJ',
    unit: '€/MWh',
    defaultValue: 147,
    basis: 'DESK_ESTIMATE',
    source: 'Desk reference, not a dated observation. An observed bundle price on the deal overrides it.',
    usedIn: 'Trade builder: warning when modelled netback exceeds what the market pays',
    min: 0,
  },
  {
    key: 'risk.deThgBundleRefNeg0EurPerMwh',
    category: 'RISK',
    label: 'DE THG traded bundle reference, −80 < CI ≤ 0 g/MJ',
    unit: '€/MWh',
    defaultValue: 120,
    basis: 'DESK_ESTIMATE',
    source: 'Desk reference, not a dated observation. An observed bundle price on the deal overrides it.',
    usedIn: 'Trade builder: warning when modelled netback exceeds what the market pays',
    min: 0,
  },
];

const DEFINITIONS_BY_KEY = new Map(ASSUMPTION_DEFINITIONS.map(d => [d.key, d]));

export function getAssumptionDefinition(key: string): AssumptionDefinition | undefined {
  return DEFINITIONS_BY_KEY.get(key);
}

// ---------------------------------------------------------------------------
// Override store
// ---------------------------------------------------------------------------

const STORAGE_KEY = 'biomethane-desk.assumptions.v1';

let overrides: Record<string, number> = loadOverrides();
let version = 0;
const listeners = new Set<() => void>();

function loadOverrides(): Record<string, number> {
  try {
    if (typeof localStorage === 'undefined') return {};
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const clean: Record<string, number> = {};
    for (const [k, v] of Object.entries(parsed)) {
      if (DEFINITIONS_BY_KEY.has(k) && typeof v === 'number' && Number.isFinite(v)) clean[k] = v;
    }
    return clean;
  } catch {
    return {};
  }
}

function persistAndNotify(): void {
  try {
    if (typeof localStorage !== 'undefined') localStorage.setItem(STORAGE_KEY, JSON.stringify(overrides));
  } catch {
    // storage unavailable: overrides still apply for this session
  }
  version++;
  listeners.forEach(l => l());
}

/** Current value: the user's override if set, else the documented default. */
export function getAssumption(key: string): number {
  const def = DEFINITIONS_BY_KEY.get(key);
  if (!def) throw new Error(`Unknown commercial assumption: ${key}`);
  return overrides[key] ?? def.defaultValue;
}

export function isOverridden(key: string): boolean {
  return key in overrides;
}

export function setAssumption(key: string, value: number): void {
  const def = DEFINITIONS_BY_KEY.get(key);
  if (!def) throw new Error(`Unknown commercial assumption: ${key}`);
  if (!Number.isFinite(value)) return;
  const bounded = Math.min(def.max ?? Infinity, Math.max(def.min ?? -Infinity, value));
  if (bounded === def.defaultValue) delete overrides[key];
  else overrides = { ...overrides, [key]: bounded };
  persistAndNotify();
}

export function resetAssumption(key: string): void {
  if (!(key in overrides)) return;
  const next = { ...overrides };
  delete next[key];
  overrides = next;
  persistAndNotify();
}

export function resetAllAssumptions(): void {
  overrides = {};
  persistAndNotify();
}

export function subscribeAssumptions(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Increments on every change; include in memo deps so outputs recompute. */
export function getAssumptionsVersion(): number {
  return version;
}

/** Desk pooling margin per tCO2e: the spread between what deficit clients pay and surplus holders receive. */
export function fuelEuPoolSpreadEurPerTco2e(): number {
  return Math.max(0, getAssumption('fueleu.poolBuyPriceEurPerTco2e') - getAssumption('fueleu.poolSellPriceEurPerTco2e'));
}
