/**
 * Pure UI helper functions for the FuelEU Maritime trader desk screens: statutory-deadline day
 * counts, price-mark staleness, and small inline-SVG chart math (scales / path builders). Kept
 * dependency-free and side-effect-free so they can be unit tested directly (see
 * src/features/fueleu/__tests__/uiHelpers.test.ts) without any DOM or component-testing library.
 */

/** Whole days between two ISO (YYYY-MM-DD) dates, `to` − `from`. Can be negative. */
export function daysBetweenIsoDates(fromIso: string, toIso: string): number {
  const from = Date.UTC(
    Number(fromIso.slice(0, 4)),
    Number(fromIso.slice(5, 7)) - 1,
    Number(fromIso.slice(8, 10))
  );
  const to = Date.UTC(
    Number(toIso.slice(0, 4)),
    Number(toIso.slice(5, 7)) - 1,
    Number(toIso.slice(8, 10))
  );
  return Math.round((to - from) / 86400000);
}

function todayIso(nowIso?: string): string {
  return nowIso ? nowIso.slice(0, 10) : new Date().toISOString().slice(0, 10);
}

/** Days from now (or `nowIso` for testing) until a future statutory deadline. Negative if past. */
export function daysUntil(deadlineIso: string, nowIso?: string): number {
  return daysBetweenIsoDates(todayIso(nowIso), deadlineIso);
}

/** Age in days of a market/price mark's `observedAt` date, relative to now (or `nowIso`). */
export function markAgeDays(observedAtIso: string, nowIso?: string): number {
  return daysBetweenIsoDates(observedAtIso, todayIso(nowIso));
}

/** A price mark is flagged stale once it is older than this many days. */
export const MARK_STALE_AFTER_DAYS = 14;

export function isMarkStale(observedAtIso: string, nowIso?: string): boolean {
  return markAgeDays(observedAtIso, nowIso) > MARK_STALE_AFTER_DAYS;
}

// ── Small inline-SVG chart primitives ───────────────────────────────────────

export interface ChartPoint {
  x: number;
  y: number;
}

/** Builds a linear scale mapping a numeric domain onto a pixel range. */
export function buildLinearScale(domain: [number, number], range: [number, number]): (value: number) => number {
  const [d0, d1] = domain;
  const [r0, r1] = range;
  const span = d1 - d0;
  return (value: number) => {
    if (span === 0) return r0;
    const t = (value - d0) / span;
    return r0 + t * (r1 - r0);
  };
}

/** Builds an ordinal (categorical) x-scale for unevenly-spaced category labels (e.g. project years
 *  2026..2030, 2035, 2040), placing each index at an evenly-spaced pixel position regardless of the
 *  numeric gap between category values. Returns a lookup by index. */
export function buildOrdinalPositions(count: number, range: [number, number]): number[] {
  const [r0, r1] = range;
  if (count <= 1) return [r0];
  const step = (r1 - r0) / (count - 1);
  return Array.from({ length: count }, (_, i) => r0 + i * step);
}

/** Builds an SVG path `d` attribute for a polyline through the given points. */
export function buildLinePath(points: ChartPoint[]): string {
  if (points.length === 0) return '';
  return points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' ');
}

/** Builds a closed SVG path `d` attribute for an area fill under a polyline, down to `baselineY`. */
export function buildAreaPath(points: ChartPoint[], baselineY: number): string {
  if (points.length === 0) return '';
  const first = points[0];
  const last = points[points.length - 1];
  return `${buildLinePath(points)} L${last.x.toFixed(2)},${baselineY.toFixed(2)} L${first.x.toFixed(2)},${baselineY.toFixed(2)} Z`;
}

/** Formats a €/tCO2e style value into a compact currency string, e.g. "€108.60". */
export function formatEurCompact(value: number, decimals: number = 2): string {
  return `€${value.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`;
}

// ── FuelEU desk redesign: pure aggregation/formatting helpers ──────────────
// Kept dependency-free (no React, no DOM) so they're directly unit-testable and reusable by both
// the KPI tiles and the directory table's diverging balance bars.

export interface FuelEuBalanceLike {
  sumOfCompanyBalances2026: number;
  sumOfCompanyPenalties2026: number;
}

export interface FuelEuKpiSummary {
  /** Sum of every negative 2026 balance across deficit groups, tCO2e (negative or zero). */
  deficitTco2e: number;
  /** Sum of statutory penalties for groups in deficit, EUR. */
  deficitPenaltyEur: number;
  /** Count of groups with a negative 2026 balance. */
  deficitGroupCount: number;
  /** Sum of every positive 2026 balance across surplus groups, tCO2e (positive or zero). */
  surplusTco2e: number;
  /** Count of groups with a positive 2026 balance. */
  surplusGroupCount: number;
  /** Surplus / |deficit| as a percentage (0 if there is no deficit to cover). */
  surplusCoverPct: number;
}

/** Aggregates the four Directory-tab KPI tiles from a list of groups' 2026 balances/penalties. */
export function computeFuelEuKpis(groups: FuelEuBalanceLike[]): FuelEuKpiSummary {
  let deficitTco2e = 0;
  let deficitPenaltyEur = 0;
  let deficitGroupCount = 0;
  let surplusTco2e = 0;
  let surplusGroupCount = 0;

  for (const g of groups) {
    if (g.sumOfCompanyBalances2026 < 0) {
      deficitTco2e += g.sumOfCompanyBalances2026;
      deficitPenaltyEur += g.sumOfCompanyPenalties2026;
      deficitGroupCount += 1;
    } else if (g.sumOfCompanyBalances2026 > 0) {
      surplusTco2e += g.sumOfCompanyBalances2026;
      surplusGroupCount += 1;
    }
  }

  const absDeficit = Math.abs(deficitTco2e);
  const surplusCoverPct = absDeficit > 0 ? (surplusTco2e / absDeficit) * 100 : 0;

  return { deficitTco2e, deficitPenaltyEur, deficitGroupCount, surplusTco2e, surplusGroupCount, surplusCoverPct };
}

export interface FuelEuGhgieLike {
  total_energy_mwh: number;
  actual_ghgie: number;
}

/** Energy-weighted average achieved GHG intensity (gCO2e/MJ) across a fleet/dataset. Returns 0 for an empty or zero-energy input rather than NaN. */
export function computeFleetWeightedGhgie(rows: FuelEuGhgieLike[]): number {
  let totalEnergyMwh = 0;
  let weightedSum = 0;
  for (const r of rows) {
    if (r.total_energy_mwh <= 0) continue;
    totalEnergyMwh += r.total_energy_mwh;
    weightedSum += r.total_energy_mwh * r.actual_ghgie;
  }
  return totalEnergyMwh > 0 ? weightedSum / totalEnergyMwh : 0;
}

/**
 * Scales a magnitude onto a diverging bar's pixel width, capped to `maxWidthPx`, relative to the
 * largest magnitude in the current page/view (`maxMagnitude`). Returns 0 for a non-positive
 * `maxMagnitude` rather than dividing by zero.
 */
export function scaleDivergingBarWidth(magnitude: number, maxMagnitude: number, maxWidthPx: number = 72): number {
  if (maxMagnitude <= 0) return 0;
  const clamped = Math.max(0, Math.min(Math.abs(magnitude), maxMagnitude));
  return (clamped / maxMagnitude) * maxWidthPx;
}

export type SortDirection = 'asc' | 'desc';

/**
 * Generic, stable-ish comparator-based sorter for table rows: sorts a copy of `rows` by the value
 * `getValue` returns (numbers compared numerically, everything else via string localeCompare).
 * Does not mutate `rows`.
 */
export function sortRows<T>(rows: T[], getValue: (row: T) => number | string, direction: SortDirection): T[] {
  const copy = [...rows];
  copy.sort((a, b) => {
    const av = getValue(a);
    const bv = getValue(b);
    let cmp: number;
    if (typeof av === 'number' && typeof bv === 'number') {
      cmp = av - bv;
    } else {
      cmp = String(av).localeCompare(String(bv));
    }
    return direction === 'asc' ? cmp : -cmp;
  });
  return copy;
}
