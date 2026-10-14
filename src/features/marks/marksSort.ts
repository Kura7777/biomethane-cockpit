import { PricingBookEntry } from '../../domain/markets/brokerRun.seed';

/**
 * Parses any delivery tenor or vintage string into a normalized floating-point year key
 * for strict chronological sorting (e.g. Prompt -> 2026.0, H1 2026 -> 2026.1, Cal 2027 -> 2027.5).
 */
export function parseTenorSortKey(tenorStr?: string | null): number {
  if (!tenorStr) return 2026.9;
  const s = tenorStr.trim().toUpperCase();

  // Prompt / Spot / Front-month contracts
  if (s.includes('SPOT') || s.includes('PROMPT') || s.includes('FRONT-MONTH') || s === 'M+1' || s.includes('M_PLUS_1')) {
    return 2026.0;
  }
  if (s === 'M+2' || s.includes('M_PLUS_2')) {
    return 2026.08;
  }

  // Halves: e.g. "H1 2025", "H125", "H1 2026", "H126", "H2 2026", "H226"
  const h1Match = s.match(/H1\s*(?:20)?(\d{2})/);
  if (h1Match) {
    const yr = Number(`20${h1Match[1]}`);
    return yr + 0.1;
  }
  const h2Match = s.match(/H2\s*(?:20)?(\d{2})/);
  if (h2Match) {
    const yr = Number(`20${h2Match[1]}`);
    return yr + 0.6;
  }

  // Quarters: e.g. "Q1 2026", "Q126", "Q2 2026", "Q3 2026", "Q4 2026"
  const q1Match = s.match(/Q1\s*(?:20)?(\d{2})/);
  if (q1Match) return Number(`20${q1Match[1]}`) + 0.1;
  const q2Match = s.match(/Q2\s*(?:20)?(\d{2})/);
  if (q2Match) return Number(`20${q2Match[1]}`) + 0.35;
  const q3Match = s.match(/Q3\s*(?:20)?(\d{2})/);
  if (q3Match) return Number(`20${q3Match[1]}`) + 0.6;
  const q4Match = s.match(/Q4\s*(?:20)?(\d{2})/);
  if (q4Match) return Number(`20${q4Match[1]}`) + 0.85;

  // Calendar year formats: "CAL 2026", "CAL 26", "2026", "2027", "2028", "2029", "2030"
  const yrMatch = s.match(/(?:CAL\s*)?(?:20)?(\d{2,4})/);
  if (yrMatch) {
    let yr = Number(yrMatch[1]);
    if (yr < 100) yr += 2000;
    if (yr >= 2020 && yr <= 2040) {
      return yr + 0.5;
    }
  }

  return 2026.9;
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

  return [...quotes].sort((a, b) => {
    if (field === 'tenor') {
      const keyA = parseTenorSortKey(a.vintage || a.class);
      const keyB = parseTenorSortKey(b.vintage || b.class);
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
      return (parseTenorSortKey(a.vintage) - parseTenorSortKey(b.vintage));
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
