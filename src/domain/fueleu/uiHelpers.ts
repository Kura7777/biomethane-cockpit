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
