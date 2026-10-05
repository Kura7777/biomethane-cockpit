import { EUROPEAN_MARKET_BENCHMARKS } from '../markets/marketBenchmarks';
import { ETS1_GAS_SHARE_SECTORS, defaultGasShare } from '../ets1/gasShare';
import { ETS2_SEGMENT_SHARES } from '../ets2/segmentShare';

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

export type AssumptionCategory = 'FUELEU' | 'FARMGATE' | 'SCANNER' | 'RISK' | 'DEAL';

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

/** Share of each country's gas demand under ETS2, used to scope supplier volumes (see ets2/segmentShare.ts). */
const ETS2_SEGMENT_SHARE_ASSUMPTIONS: AssumptionDefinition[] = Object.values(ETS2_SEGMENT_SHARES).map(r => ({
  key: `ets2.segmentShare.${r.iso}`,
  category: 'SCANNER',
  label: `Share of ${r.name} gas demand under ETS2 (buildings, services, small users)`,
  unit: 'share (0–1)',
  defaultValue: r.share,
  basis: 'DESK_ESTIMATE',
  source: `${r.sourceNote} Source: ${r.sourceUrl}. Retrieved 2026-09-30.`,
  usedIn: 'Clients page: scopes disclosed all-segment supplier gas volumes to the ETS2 segment (reference value; edit in ets2/segmentShare.ts)',
  min: 0,
  max: 1,
}));

const FARMGATE_SOURCE = 'Desk indicative estimate — no transaction evidence on file. Replace with producer offers as they come in.';

export const ASSUMPTION_DEFINITIONS: AssumptionDefinition[] = [
  // ── Deal defaults ──────────────────────────────────────────────────────────
  {
    key: 'deal.defaultVolumeMwh',
    category: 'DEAL',
    label: 'Default deal volume fallback',
    unit: 'MWh',
    defaultValue: 20000,
    basis: 'DESK_POLICY',
    source: 'Desk placeholder used when a plant publishes no annual output. Not a market fact.',
    usedIn: 'Plants, Origination, Plant drawer, FuelEU: default trade volume when plant has no annual output',
    min: 100,
  },

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
    key: 'fueleu.poolDeskSpreadEurPerTco2e',
    category: 'FUELEU',
    label: 'Desk bid/offer spread on FuelEU pool transfers',
    unit: '€/tCO₂e',
    defaultValue: 10,
    basis: 'DESK_ESTIMATE',
    source: 'Desk spread — no public bid print exists (see OPX note). Consistent with August 2026: OceanScore OPX offers €118.90/tCO2e vs the BetterSea FuelEU Surplus Index executed-trade VWAP €108.89/tCO2e (see src/domain/markets/fueleuPoolIndexHistory.ts) — a ~€10 offer-to-traded gap.',
    usedIn: 'FuelEU calculators: pool bid = mark offer − this spread',
    min: 0,
  },
  {
    key: 'fueleu.poolSellPriceEurPerTco2e',
    category: 'FUELEU',
    label: 'Pool price paid to a surplus holder (desk bid = mark offer − desk spread)',
    unit: '€/tCO₂e',
    defaultValue: (fueleuMark?.offerPrice ?? 109) - 10,
    basis: 'DESK_ESTIMATE',
    source: `${fueleuMarkSource} offer, less the desk bid/offer spread (fueleu.poolDeskSpreadEurPerTco2e) — no public bid print exists (see OPX note). Consistent with August 2026: OceanScore OPX offers €118.90/tCO2e vs the BetterSea FuelEU Surplus Index executed-trade VWAP €108.89/tCO2e.`,
    usedIn: 'FuelEU calculators: surplus monetisation; desk margin = offer − bid',
    min: 0,
  },
  {
    key: 'fueleu.eurUsdFxRate',
    category: 'FUELEU',
    label: 'EUR/USD FX rate for marine bunker quotations',
    unit: 'USD per EUR',
    defaultValue: 1.08,
    basis: 'DESK_ESTIMATE',
    source: 'unsourced desk default — update',
    usedIn: 'Marine bunker quotation: EUR→USD conversion of the delivered quote',
    min: 0,
  },
  {
    key: 'fueleu.liquefactionFeeEurPerMwh',
    category: 'FUELEU',
    label: 'Small-scale liquefaction, bunkering barge & terminal fee',
    unit: '€/MWh',
    defaultValue: 14,
    basis: 'DESK_ESTIMATE',
    source: 'unsourced desk default — update',
    usedIn: 'Marine bunker quotation: Bio-LNG and fossil-LNG price stack',
    min: 0,
  },
  {
    key: 'fueleu.greenPremiumEurPerMwh',
    category: 'FUELEU',
    label: 'Green Bio-LNG environmental premium (RED III certification spread)',
    unit: '€/MWh',
    defaultValue: 22,
    basis: 'DESK_ESTIMATE',
    source: 'unsourced desk default — update',
    usedIn: 'Marine bunker quotation: Bio-LNG delivered price stack',
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
  ...ETS2_SEGMENT_SHARE_ASSUMPTIONS,
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
  // ── Origination margin allocation ────────────────────────────────────────
  {
    key: 'origination.deThgBundleCeilingEurPerMwh',
    category: 'SCANNER',
    label: 'DE THG bundle revenue ceiling used in Origination (0 = off)',
    unit: '€/MWh',
    defaultValue: 147,
    basis: 'DESK_ESTIMATE',
    source: 'Unsourced desk estimate of where DE THG bundles clear — replace with broker quotes',
    usedIn: 'Origination Step 3 and 4: DE THG revenue above this ceiling is capped before the desk margin split. Set 0 to switch the cap off.',
    min: 0,
  },
  {
    key: 'origination.deskTakeDivisor',
    category: 'SCANNER',
    label: 'Desk take: green spread divided by',
    unit: '×',
    defaultValue: 15,
    basis: 'DESK_POLICY',
    source: 'Desk policy for the plant-gate split: desk take = (revenue after transit − plant-gate cost) ÷ this number, kept between the floor and cap below.',
    usedIn: 'Origination: desk margin and producer payable when no producer share is set',
    min: 1,
  },
  {
    key: 'origination.deskTakeFloorEurPerMwh',
    category: 'SCANNER',
    label: 'Desk take floor on a positive green spread',
    unit: '€/MWh',
    defaultValue: 2.5,
    basis: 'DESK_POLICY',
    source: 'Desk policy, not a market fact.',
    usedIn: 'Origination: lowest desk margin taken when the green spread is positive',
    min: 0,
  },
  {
    key: 'origination.deskTakeCapEurPerMwh',
    category: 'SCANNER',
    label: 'Desk take cap on a positive green spread',
    unit: '€/MWh',
    defaultValue: 6.5,
    basis: 'DESK_POLICY',
    source: 'Desk policy, not a market fact.',
    usedIn: 'Origination: highest desk margin taken when the green spread is positive',
    min: 0,
  },
  {
    key: 'clients.firstDealShare',
    category: 'SCANNER',
    label: 'First ETS1 deal: share of a company biomethane potential',
    unit: '%',
    defaultValue: 10,
    basis: 'DESK_ESTIMATE',
    source: 'Desk heuristic for how much of a company ETS1 potential to open with. Not a market observation.',
    usedIn: 'Clients: the first-deal volume suggested on an ETS1 play (the value of the play is the full potential)',
    min: 1,
    max: 100,
  },
  {
    key: 'clients.ets1DataYear',
    category: 'SCANNER',
    label: 'EU ETS1 installation data: latest verified-emissions year on file',
    unit: 'year',
    defaultValue: 2025,
    basis: 'MARKET_MARK',
    source: 'European Commission verified_emissions_2025_en.xlsx (published 9 Apr 2026, extracted 1 Apr 2026): verified emissions and free allocation. Parent company and NACE from the EUETS.INFO May 2024 EUTL release. Sites with no 2025 figure yet carry 2024 (flagged on the company page).',
    usedIn: 'Clients and the EU ETS installations tab: data vintage label only, not an input to any calculation',
    min: 2025,
    max: 2025,
  },
  ...ETS1_GAS_SHARE_SECTORS.map((sector): AssumptionDefinition => ({
    key: `ets1.gasShare.${sector}`,
    category: 'SCANNER',
    label: `Natural-gas share of site CO2, ${sector.toLowerCase().replace(/_/g, ' ')}`,
    unit: 'share of verified CO2',
    defaultValue: defaultGasShare(sector),
    basis: sector === 'POWER_HEAT' ? 'DESK_POLICY' : 'MARKET_MARK',
    source: sector === 'POWER_HEAT'
      ? 'Set to 1: a power or heat site is only graded fit when its name shows gas (ets1/sites.ts resolveFit).'
      : 'Eurostat nrg_bal_c EU27 2024 (TJ, updated 2026-08-27): natural-gas CO2 over all combustible-fuel CO2 for the sector balance row, IPCC 2006 default emission factors. Energy use only. See ets1/gasShare.ts.',
    usedIn: 'Clients and EU ETS1 sites: the biomethane a site could take is its verified CO2 times this share (not its full tonnage)',
    min: 0,
    max: 1,
  })),
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

/**
 * Desk bid for a given pool offer (the FuelEU mark offer, passed in by the caller from the marks
 * store): the offer less the desk spread, unless the user has explicitly overridden
 * fueleu.poolSellPriceEurPerTco2e directly, in which case that pinned value is used. Moving
 * fueleu.poolDeskSpreadEurPerTco2e therefore moves the bid without a separate edit.
 */
export function fuelEuPoolBidPriceEurPerTco2e(offerEurPerTco2e: number): number {
  if (isOverridden('fueleu.poolSellPriceEurPerTco2e')) return getAssumption('fueleu.poolSellPriceEurPerTco2e');
  return offerEurPerTco2e - getAssumption('fueleu.poolDeskSpreadEurPerTco2e');
}

/** Desk pooling margin per tCO2e: the spread between what deficit clients pay and surplus holders receive. */
export function fuelEuPoolSpreadEurPerTco2e(offerEurPerTco2e: number): number {
  return Math.max(0, offerEurPerTco2e - fuelEuPoolBidPriceEurPerTco2e(offerEurPerTco2e));
}
