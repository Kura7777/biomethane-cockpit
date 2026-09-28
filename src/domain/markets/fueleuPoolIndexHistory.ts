/**
 * FuelEU pooling surplus price history — two independent sources, tracked separately.
 *
 * OceanScore OPX is an OFFER-side index: publicly posted surplus offers, not bids and not
 * executed trades (see marketBenchmarks.ts's FUELEU entry). BetterSea's FuelEU Surplus Index is
 * built from EXECUTED TRADES it observes — a genuinely independent, trade-based cross-check on
 * the offer-side mark the desk prices pooling off today.
 *
 * Every row below is transcribed BY HAND from the publisher's public monthly commentary/index
 * page named in `url` — there is no scraping or API here. When a new month's commentary is
 * published, add a new row with its URL; do not edit existing rows. Do not interpolate missing
 * months (see the 2026-06 OceanScore gap) — leave them absent.
 */

export type FueleuPoolIndexSource = 'OCEANSCORE_OPX' | 'BETTERSEA_INDEX';
export type FueleuPoolIndexBasis = 'OFFER' | 'TRADE';

export interface FueleuPoolIndexRow {
  source: FueleuPoolIndexSource;
  basis: FueleuPoolIndexBasis;
  /** 'YYYY-MM' for a monthly print, 'YYYY-MM-DD' for a dated point print. */
  period: string;
  complianceYear: 2026;
  average?: number;
  vwap?: number;
  close?: number;
  closeWeighted?: number;
  offerIndex?: number;
  rangeLow?: number;
  rangeHigh?: number;
  url: string;
  note?: string;
}

export const FUELEU_POOL_INDEX_HISTORY: FueleuPoolIndexRow[] = [
  // ── OceanScore OPX — offer-side index of posted surplus offers ──────────────────────────────
  {
    source: 'OCEANSCORE_OPX',
    basis: 'OFFER',
    period: '2026-03',
    complianceYear: 2026,
    offerIndex: 197,
    rangeLow: 175,
    rangeHigh: 210,
    url: 'https://oceanscore.com/insights/oceanscore-pool-price-index-market-commentary-march-2026/',
  },
  {
    source: 'OCEANSCORE_OPX',
    basis: 'OFFER',
    period: '2026-04',
    complianceYear: 2026,
    offerIndex: 196,
    url: 'https://oceanscore.com/insights/oceanscore-pool-price-index-market-commentary-may-2026/',
    note: 'Stated in the May commentary as "up from €196 in April".',
  },
  {
    source: 'OCEANSCORE_OPX',
    basis: 'OFFER',
    period: '2026-05',
    complianceYear: 2026,
    offerIndex: 225,
    rangeLow: 170,
    rangeHigh: 210,
    url: 'https://oceanscore.com/insights/oceanscore-pool-price-index-market-commentary-may-2026/',
    note: 'High quotes seen up to €300.',
  },
  // 2026-06: not available from OceanScore — deliberately absent, do not interpolate.
  {
    source: 'OCEANSCORE_OPX',
    basis: 'OFFER',
    period: '2026-07',
    complianceYear: 2026,
    offerIndex: 131.75,
    rangeLow: 115,
    rangeHigh: 180,
    url: 'https://www.hellenicshippingnews.com/oceanscore-pool-price-index-market-commentary-august-2026/',
  },
  {
    source: 'OCEANSCORE_OPX',
    basis: 'OFFER',
    period: '2026-08',
    complianceYear: 2026,
    offerIndex: 118.90,
    rangeLow: 110,
    rangeHigh: 170,
    url: 'https://www.hellenicshippingnews.com/oceanscore-pool-price-index-market-commentary-august-2026/',
  },
  {
    source: 'OCEANSCORE_OPX',
    basis: 'OFFER',
    period: '2026-09-16',
    complianceYear: 2026,
    offerIndex: 108.60,
    url: 'https://oceanscore.com/pool-price-index/',
  },

  // ── BetterSea FuelEU Surplus Index — built from executed trades ─────────────────────────────
  {
    source: 'BETTERSEA_INDEX',
    basis: 'TRADE',
    period: '2026-05',
    complianceYear: 2026,
    average: 152.93,
    close: 125.17,
    url: 'https://www.bettersea.tech/post/may-2026-fueleu-index-market-commentary',
    note: 'Month-end close 125.17; no VWAP published for May.',
  },
  {
    source: 'BETTERSEA_INDEX',
    basis: 'TRADE',
    period: '2026-06',
    complianceYear: 2026,
    average: 123.60,
    vwap: 120.49,
    close: 111.39,
    url: 'https://www.bettersea.tech/post/june-2026-fueleu-index-market-commentary',
    note: 'Close is 30 Jun.',
  },
  {
    source: 'BETTERSEA_INDEX',
    basis: 'TRADE',
    period: '2026-07',
    complianceYear: 2026,
    average: 104.83,
    vwap: 106.52,
    close: 113.98,
    closeWeighted: 114.00,
    url: 'https://www.bettersea.tech/post/july-2026-fueleu-index-market-commentary',
  },
  {
    source: 'BETTERSEA_INDEX',
    basis: 'TRADE',
    period: '2026-08',
    complianceYear: 2026,
    average: 109.72,
    vwap: 108.89,
    close: 114.42,
    closeWeighted: 83.13,
    url: 'https://www.bettersea.tech/fueleu-index',
    note: 'Month-end non-weighted 114.42 vs volume-weighted 83.13 — large blocks trade well below the unweighted close.',
  },
];

/** Latest BetterSea row that carries a VWAP (May has none — average/close only). */
export function latestTradeVwap(): FueleuPoolIndexRow | undefined {
  const rows = FUELEU_POOL_INDEX_HISTORY.filter(r => r.source === 'BETTERSEA_INDEX' && r.vwap !== undefined);
  return rows.length ? rows[rows.length - 1] : undefined;
}

/** Latest OceanScore OPX offer-index row. */
export function latestOfferIndex(): FueleuPoolIndexRow | undefined {
  const rows = FUELEU_POOL_INDEX_HISTORY.filter(r => r.source === 'OCEANSCORE_OPX' && r.offerIndex !== undefined);
  return rows.length ? rows[rows.length - 1] : undefined;
}

/**
 * How far a desk mark (€/tCO2e) sits from the latest BetterSea executed-trade VWAP, as a
 * fraction (e.g. -0.0027 = -0.27%). Returns null if no VWAP print exists to compare against.
 */
export function markDivergencePct(markEurPerT: number): number | null {
  const latest = latestTradeVwap();
  if (!latest || latest.vwap === undefined) return null;
  return (markEurPerT - latest.vwap) / latest.vwap;
}
