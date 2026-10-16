import { PricingBookEntry } from '../../domain/markets/brokerRun.seed';

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

/** Period length ranks used to break start-date ties: shorter period first. */
const RANK = { spot: -2, bom: -1, month: 0, quarter: 1, season: 2, half: 3, cal: 4 } as const;

function toYear(raw: string): number | null {
  const n = Number(raw);
  if (raw.length === 2) return 2000 + n;
  if (raw.length === 4 && n >= 2000 && n <= 2099) return n;
  return null;
}

/** start = months since year 0 (year*12 + monthIndex); key sorts by start, then by period length. */
function key(startMonth: number, rank: number): number {
  return startMonth * 10 + rank;
}

/**
 * Canonical tenor contract (see fix-rules): Spot, BoM, M+n, "Jan 2027", Q1 2027, H1 2027,
 * Win 2026 (Oct-Mar), Sum 2027 (Apr-Sep), Cal 2027, bare year = Cal. Relative tenors are
 * resolved against `today`, never a hard-coded year.
 *
 * Returns a sortable number: chronological by START month, ties broken by shorter period first
 * (month < quarter < season < half < cal). Unknown labels return Infinity (sorted last, stable).
 */
export function parseTenorSortKey(tenorStr?: string | null, today: Date = new Date()): number {
  if (!tenorStr) return Number.POSITIVE_INFINITY;
  const s = tenorStr.trim().toUpperCase().replace(/[\s_\-/]+/g, ' ');
  if (!s) return Number.POSITIVE_INFINITY;
  const nowMonth = today.getFullYear() * 12 + today.getMonth();

  if (s === 'SPOT' || s === 'PROMPT') return key(nowMonth, RANK.spot);
  if (s === 'BOM') return key(nowMonth, RANK.bom);

  const rel = s.match(/^M ?\+ ?(\d+)$/) ?? s.match(/^M PLUS (\d+)$/);
  if (rel) return key(nowMonth + Number(rel[1]), RANK.month);

  const calRel = s.match(/^CAL ?\+ ?(\d+)$/);
  if (calRel) return key((today.getFullYear() + Number(calRel[1])) * 12, RANK.cal);

  const month = s.match(/^([A-Z]{3,9}) ?(\d{4}|\d{2})$/);
  if (month) {
    const idx = MONTHS.indexOf(month[1].slice(0, 3));
    const full = month[1].length > 3;
    const yr = toYear(month[2]);
    // Only accept 3-letter abbreviations or genuine month names (JANUARY, SEPT...).
    if (idx >= 0 && yr !== null && (!full || /^(JANUARY|FEBRUARY|MARCH|APRIL|MAY|JUNE|JULY|AUGUST|SEPT?|SEPTEMBER|OCTOBER|NOVEMBER|DECEMBER)$/.test(month[1]))) {
      return key(yr * 12 + idx, RANK.month);
    }
  }

  const quarter = s.match(/^Q ?([1-4]) ?(\d{4}|\d{2})$/) ?? s.match(/^([1-4]) ?Q ?(\d{4}|\d{2})$/);
  if (quarter) {
    const yr = toYear(quarter[2]);
    if (yr !== null) return key(yr * 12 + (Number(quarter[1]) - 1) * 3, RANK.quarter);
  }

  const half = s.match(/^H ?([12]) ?(\d{4}|\d{2})$/) ?? s.match(/^([12]) ?H ?(\d{4}|\d{2})$/);
  if (half) {
    const yr = toYear(half[2]);
    if (yr !== null) return key(yr * 12 + (Number(half[1]) - 1) * 6, RANK.half);
  }

  const winter = s.match(/^(?:WIN|WINTER|W) ?(\d{4}|\d{2})$/);
  if (winter) {
    const yr = toYear(winter[1]);
    if (yr !== null) return key(yr * 12 + 9, RANK.season);
  }
  const summer = s.match(/^(?:SUM|SUMMER|S) ?(\d{4}|\d{2})$/);
  if (summer) {
    const yr = toYear(summer[1]);
    if (yr !== null) return key(yr * 12 + 3, RANK.season);
  }

  const cal = s.match(/^(?:CAL|CY) ?(\d{4}|\d{2})$/) ?? s.match(/^(\d{4})$/);
  if (cal) {
    const yr = toYear(cal[1]);
    if (yr !== null) return key(yr * 12, RANK.cal);
  }

  return Number.POSITIVE_INFINITY;
}

export type SortField = 'tenor' | 'country' | 'class' | 'feedstock' | 'bid' | 'offer' | 'volume';
export type SortDirection = 'asc' | 'desc';

/**
 * Sorts pricing book entries strictly chronologically by delivery tenor/vintage,
 * followed by country ISO and market class.
 */
export function sortQuotesChronologically(
  quotes: PricingBookEntry[],
  field: SortField = 'tenor',
  direction: SortDirection = 'asc'
): PricingBookEntry[] {
  const dirMultiplier = direction === 'asc' ? 1 : -1;
  const today = new Date();
  const tenorKey = (q: PricingBookEntry) => parseTenorSortKey(q.vintage || q.class, today);

  return [...quotes].sort((a, b) => {
    if (field === 'tenor') {
      const keyA = tenorKey(a);
      const keyB = tenorKey(b);
      // Unknown tenors (Infinity) always stay last, in input order, in either direction.
      if (keyA === Infinity && keyB === Infinity) return 0;
      if (keyA === Infinity) return 1;
      if (keyB === Infinity) return -1;
      if (keyA !== keyB) {
        return (keyA - keyB) * dirMultiplier;
      }
      // Secondary sort: country ISO
      if (a.country !== b.country) {
        return a.country.localeCompare(b.country);
      }
      // Tertiary sort: productClass
      return (a.class || '').localeCompare(b.class || '');
    }

    if (field === 'country') {
      const cmp = a.country.localeCompare(b.country);
      if (cmp !== 0) return cmp * dirMultiplier;
      const kA = tenorKey(a);
      const kB = tenorKey(b);
      if (kA === kB) return 0;
      if (kA === Infinity) return 1;
      if (kB === Infinity) return -1;
      return kA - kB;
    }

    if (field === 'bid') {
      const pA = a.bidPriceNumeric ?? (a.bidPrice ? parseFloat(a.bidPrice.replace(/[^0-9.]/g, '')) || 0 : -9999);
      const pB = b.bidPriceNumeric ?? (b.bidPrice ? parseFloat(b.bidPrice.replace(/[^0-9.]/g, '')) || 0 : -9999);
      return (pA - pB) * dirMultiplier;
    }

    if (field === 'offer') {
      const pA = a.offerPriceNumeric ?? (a.offerPrice ? parseFloat(a.offerPrice.replace(/[^0-9.]/g, '')) || 9999 : 9999);
      const pB = b.offerPriceNumeric ?? (b.offerPrice ? parseFloat(b.offerPrice.replace(/[^0-9.]/g, '')) || 9999 : 9999);
      return (pA - pB) * dirMultiplier;
    }

    if (field === 'volume') {
      const vA = a.offerVolumeGWh ?? a.bidVolumeGWh ?? 0;
      const vB = b.offerVolumeGWh ?? b.bidVolumeGWh ?? 0;
      return (vA - vB) * dirMultiplier;
    }

    return 0;
  });
}
