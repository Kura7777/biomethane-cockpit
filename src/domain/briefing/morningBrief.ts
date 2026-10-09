/**
 * Morning brief — the desk's front page, assembled from the same engines and stores every other
 * screen reads. Nothing here prices anything: netbacks come from computeAllNetbacks / rankNetbacks,
 * routes from scanEuropeanArbitrage, marks and the order book from the desk state. This module only
 * selects, sorts and counts, so the brief can never disagree with the screen a trader clicks into.
 *
 * React-free (architecture.test.ts): the screen lives in features/briefing/.
 */
import { MARKETS, isVoluntaryMarket } from '../markets/registry';
import { getMarkAgeDays } from '../markets/types';
import type { MarkSourceType } from '../markets/types';
import { STALE_MARK_DAYS, VERY_STALE_MARK_DAYS, COUNTRY_NAMES } from '../markets/constants';
import { SIMULATED_SOURCE_NAME } from '../marks/simulate';
import { computeAllNetbacks } from '../netback/engine';
import { rankNetbacks } from '../netback/ranking';
import { evaluateEligibility } from '../eligibility/engine';
import type { EligibilityAssessment, OverallVerdict } from '../eligibility/types';
import type { Consignment } from '../consignment/types';
import type { CostInputs, MarksState } from '../netback/types';
import { scanEuropeanArbitrage } from '../arbitrage/engine';
import { FUELEU_POOL_INDEX_HISTORY } from '../markets/fueleuPoolIndexHistory';
import type { PricingBookEntry } from '../markets/brokerRun.seed';
import type { BiomethanePlant } from '../plants/types';

// ── Marks ────────────────────────────────────────────────────────────────────────────────────

export type BriefMarkCategory = 'COMPLIANCE' | 'VOLUNTARY' | 'EMERGING';
export type MarkFreshness = 'FRESH' | 'STALE' | 'VERY_STALE' | 'UNDATED';

export interface BriefMark {
  marketId: string;
  shortName: string;
  name: string;
  country: string;
  unitLabel: string;
  category: BriefMarkCategory;
  bid: number | null;
  offer: number | null;
  mid: number | null;
  /** Bid-offer spread as a percentage of mid; null unless both sides and a non-zero mid are marked. */
  spreadPct: number | null;
  ageDays: number | null;
  freshness: MarkFreshness;
  sourceType: MarkSourceType | null;
  sourceName: string | null;
  observedAt: string | null;
  /** True when the mark is the desk's synthetic seed (SIMULATED) or an ESTIMATE, not an observation. */
  isEstimate: boolean;
}

export function markFreshness(ageDays: number | null): MarkFreshness {
  if (ageDays === null) return 'UNDATED';
  if (ageDays <= STALE_MARK_DAYS) return 'FRESH';
  if (ageDays <= VERY_STALE_MARK_DAYS) return 'STALE';
  return 'VERY_STALE';
}

/** Every market in the registry that has a mark on the desk, in registry order. */
export function buildBriefMarks(marks: MarksState): BriefMark[] {
  const out: BriefMark[] = [];
  for (const market of MARKETS) {
    const mark = marks.marks[market.id];
    if (!mark) continue;
    const ageDays = getMarkAgeDays(mark);
    const bid = mark.bid ?? null;
    const offer = mark.offer ?? null;
    const mid = mark.mid ?? null;
    const spreadPct = bid !== null && offer !== null && mid ? ((offer - bid) / mid) * 100 : null;
    const category: BriefMarkCategory =
      market.status !== 'ACTIVE' ? 'EMERGING' : isVoluntaryMarket(market.id) ? 'VOLUNTARY' : 'COMPLIANCE';
    out.push({
      marketId: market.id,
      shortName: market.shortName,
      name: market.name,
      country: market.country,
      unitLabel: market.unitLabel,
      category,
      bid,
      offer,
      mid,
      spreadPct,
      ageDays,
      freshness: markFreshness(ageDays),
      sourceType: mark.provenance?.sourceType ?? null,
      sourceName: mark.provenance?.sourceName ?? mark.source ?? null,
      observedAt: mark.provenance?.observedAt ?? mark.updatedAt ?? null,
      isEstimate:
        mark.source === SIMULATED_SOURCE_NAME ||
        mark.provenance?.sourceName === SIMULATED_SOURCE_NAME ||
        mark.provenance?.sourceType === 'ESTIMATE' ||
        !mark.provenance?.sourceType,
    });
  }
  return out;
}

export interface MarkFreshnessSummary {
  total: number;
  fresh: number;
  stale: number;
  veryStale: number;
  undated: number;
  estimates: number;
  /** The oldest dated mark, so the brief can name it. */
  oldest: BriefMark | null;
}

export function summariseFreshness(marks: BriefMark[]): MarkFreshnessSummary {
  let oldest: BriefMark | null = null;
  for (const m of marks) {
    if (m.ageDays !== null && (oldest === null || (oldest.ageDays ?? 0) < m.ageDays)) oldest = m;
  }
  return {
    total: marks.length,
    fresh: marks.filter(m => m.freshness === 'FRESH').length,
    stale: marks.filter(m => m.freshness === 'STALE').length,
    veryStale: marks.filter(m => m.freshness === 'VERY_STALE').length,
    undated: marks.filter(m => m.freshness === 'UNDATED').length,
    estimates: marks.filter(m => m.isEstimate).length,
    oldest,
  };
}

// ── Netback ladder ───────────────────────────────────────────────────────────────────────────

export interface BriefLadderRow {
  marketId: string;
  marketName: string;
  country: string;
  verdict: OverallVerdict;
  /** 1-based rank among tradeable markets; null when blocked. */
  rank: number | null;
  netNetback: number;
  certificateValueEurPerMWh: number | null;
  moleculeValue: number | null;
  totalCosts: number | null;
  deskMarginEurPerMWh: number | null;
  marginPercent: number | null;
  producerPayable: number | null;
  isModelled: boolean;
  /** Set when the engine held the netback to a traded-bundle reference. */
  heldAtBundle: boolean;
  blockingGate: string | null;
  summary: string;
  missingInputs: string[];
}

/**
 * One consignment priced into every active market, ranked exactly as the Scanner and Origination
 * ladders rank it. Markets with no netback (a missing mark) are left out — the Pricing desk lists those.
 */
export function buildConsignmentLadder(consignment: Consignment, marks: MarksState, costs: CostInputs): BriefLadderRow[] {
  const markets = MARKETS.filter(m => m.status === 'ACTIVE');
  const eligibility = new Map<string, EligibilityAssessment>();
  for (const m of markets) eligibility.set(m.id, evaluateEligibility(consignment, m));
  const netbacks = computeAllNetbacks(consignment, markets, marks, costs, eligibility, marks.pricingSides);
  const ranked = rankNetbacks(netbacks, eligibility);

  const rows: BriefLadderRow[] = [];
  for (const nb of ranked) {
    if (nb.netNetback === null) continue;
    const el = eligibility.get(nb.marketId);
    rows.push({
      marketId: nb.marketId,
      marketName: nb.marketName,
      country: markets.find(m => m.id === nb.marketId)?.country ?? '',
      verdict: nb.eligibilityVerdict as OverallVerdict,
      rank: nb.rank ?? null,
      netNetback: nb.netNetback,
      certificateValueEurPerMWh: nb.certificateValue?.valueEurPerMWh ?? null,
      moleculeValue: nb.moleculeValue,
      totalCosts: nb.totalCosts,
      deskMarginEurPerMWh: nb.deskMargin,
      marginPercent: nb.marginPercent,
      producerPayable: nb.producerPayable,
      isModelled: Boolean(nb.isModelled),
      heldAtBundle: nb.netbackCappedAt !== null && nb.netbackCappedAt !== undefined,
      blockingGate: el?.blockingGate ?? null,
      summary: nb.blockingReason || el?.summary || '',
      missingInputs: nb.missingInputs,
    });
  }
  return rows;
}

export interface LadderHeadline {
  best: BriefLadderRow | null;
  runnerUp: BriefLadderRow | null;
  /** best − runner-up net netback (€/MWh); null without both. */
  leadEurMwh: number | null;
  tradeable: number;
  blocked: number;
  /** The most valuable market this consignment cannot legally reach — the "what you're missing" line. */
  bestBlocked: BriefLadderRow | null;
}

export function ladderHeadline(rows: BriefLadderRow[]): LadderHeadline {
  const tradeable = rows.filter(r => r.rank !== null).sort((a, b) => (a.rank ?? 0) - (b.rank ?? 0));
  const blocked = rows.filter(r => r.rank === null).sort((a, b) => b.netNetback - a.netNetback);
  const best = tradeable[0] ?? null;
  const runnerUp = tradeable[1] ?? null;
  return {
    best,
    runnerUp,
    leadEurMwh: best && runnerUp ? best.netNetback - runnerUp.netNetback : null,
    tradeable: tradeable.length,
    blocked: blocked.length,
    bestBlocked: blocked[0] && (!best || blocked[0].netNetback > best.netNetback) ? blocked[0] : null,
  };
}

// ── Routes ───────────────────────────────────────────────────────────────────────────────────

export interface BriefRoute {
  id: string;
  originCountry: string;
  originCountryName: string;
  originFlag: string;
  marketId: string;
  marketName: string;
  verdict: OverallVerdict;
  valueStackEurPerMWh: number | null;
  transitEurPerMWh: number;
  deskMarginEurPerMWh: number | null;
  marginPercent: number | null;
  dealProfitEur: number | null;
  keyRisk: string | null;
}

export interface BriefRoutes {
  feedstockKey: string;
  volumeMWh: number;
  tradeable: BriefRoute[];
  blockedCount: number;
}

/** The European arbitrage scan for one feedstock, tradeable routes by desk margin (best first). */
export function buildBriefRoutes(marks: MarksState, costs: CostInputs, feedstockKey: string, volumeMWh: number): BriefRoutes {
  const scan = scanEuropeanArbitrage(marks, costs, feedstockKey, undefined, undefined, undefined, undefined, volumeMWh);
  const toRow = (o: (typeof scan.allOpportunities)[number]): BriefRoute => ({
    id: o.id,
    originCountry: o.originCountry,
    originCountryName: o.originCountryName,
    originFlag: o.originFlag,
    marketId: o.targetMarketId,
    marketName: o.targetMarketName,
    verdict: o.overallVerdict,
    valueStackEurPerMWh: o.totalTerminalValueStackEurPerMWh,
    transitEurPerMWh: o.transitCostEurPerMWh,
    deskMarginEurPerMWh: o.deskNetMarginEurPerMWh,
    marginPercent: o.marginPercent,
    dealProfitEur: o.totalDealProfitEur,
    keyRisk: o.keyRiskOrTrap,
  });
  const tradeable = scan.allOpportunities
    .filter(o => o.isTradeable && o.deskNetMarginEurPerMWh !== null)
    .map(toRow)
    .sort((a, b) => (b.deskMarginEurPerMWh ?? 0) - (a.deskMarginEurPerMWh ?? 0));
  return {
    feedstockKey,
    volumeMWh,
    tradeable,
    blockedCount: scan.allOpportunities.filter(o => !o.isTradeable).length,
  };
}

// ── FuelEU pool index ────────────────────────────────────────────────────────────────────────

export interface FueleuPoint {
  series: 'OFFER' | 'TRADE';
  label: string;
  period: string;
  /** Mid-month for a monthly print, the day for a dated print. */
  date: Date;
  value: number;
  close: number | null;
  note: string | null;
  url: string;
}

/** OPX offer-index and BetterSea traded (VWAP, else the month's average) prints, oldest first. */
export function buildFueleuSeries(): FueleuPoint[] {
  const pts: FueleuPoint[] = [];
  for (const r of FUELEU_POOL_INDEX_HISTORY) {
    const value = r.source === 'OCEANSCORE_OPX' ? r.offerIndex : (r.vwap ?? r.average);
    if (value === undefined) continue;
    const date = new Date(r.period.length === 7 ? `${r.period}-15T00:00:00Z` : `${r.period}T00:00:00Z`);
    pts.push({
      series: r.source === 'OCEANSCORE_OPX' ? 'OFFER' : 'TRADE',
      label: r.source === 'OCEANSCORE_OPX' ? 'OceanScore OPX (offers)' : 'BetterSea (trades)',
      period: r.period,
      date,
      value,
      close: r.close ?? null,
      note: r.note ?? null,
      url: r.url,
    });
  }
  return pts.sort((a, b) => a.date.getTime() - b.date.getTime());
}

export interface FueleuLatest {
  latest: FueleuPoint;
  previous: FueleuPoint | null;
  /** Latest minus previous print of the same series; two observations the desk holds. */
  change: number | null;
}

export function latestFueleu(points: FueleuPoint[], series: 'OFFER' | 'TRADE'): FueleuLatest | null {
  const s = points.filter(p => p.series === series);
  if (!s.length) return null;
  const latest = s[s.length - 1];
  const previous = s.length > 1 ? s[s.length - 2] : null;
  return { latest, previous, change: previous ? latest.value - previous.value : null };
}

// ── Broker order book ────────────────────────────────────────────────────────────────────────

export interface BriefBookRow {
  id: string;
  country: string;
  product: string;
  feedstock: string;
  vintage: string;
  ci: string;
  bidEurMwh: number | null;
  offerEurMwh: number | null;
  offerGWh: number | null;
  highInterest: boolean;
  observedAt: string | null;
}

/** Tradeable rows of the desk's pricing book that quote at least one side in €/MWh. */
export function buildBriefOrderBook(book: PricingBookEntry[]): BriefBookRow[] {
  return book
    .filter(e => e.isTradeable && (e.numericBidEurMwh != null || e.numericOfferEurMwh != null))
    .map(e => ({
      id: e.id,
      country: e.country,
      product: e.class,
      feedstock: e.feedstock,
      vintage: e.vintage,
      ci: e.ciScore,
      bidEurMwh: e.numericBidEurMwh ?? null,
      offerEurMwh: e.numericOfferEurMwh ?? null,
      offerGWh: e.offerVolumeGWh,
      highInterest: Boolean(e.isHighInterest || e.highlight),
      observedAt: e.observedAt ?? null,
    }));
}

// ── Supply ───────────────────────────────────────────────────────────────────────────────────

export interface CountrySupply {
  country: string;
  countryName: string;
  plants: number;
  verified: number;
  annualGWh: number;
  capacityNm3h: number;
}

export function summariseSupplyByCountry(plants: BiomethanePlant[]): CountrySupply[] {
  const by = new Map<string, CountrySupply>();
  for (const p of plants) {
    const code = p.countryCode || 'XX';
    let row = by.get(code);
    if (!row) {
      row = { country: code, countryName: p.country || COUNTRY_NAMES[code] || code, plants: 0, verified: 0, annualGWh: 0, capacityNm3h: 0 };
      by.set(code, row);
    }
    row.plants += 1;
    if (p.isVerified) row.verified += 1;
    row.annualGWh += p.annualEnergyGWh || 0;
    row.capacityNm3h += p.capacityNm3h || 0;
  }
  return [...by.values()].sort((a, b) => b.plants - a.plants);
}

// ── Greeting ─────────────────────────────────────────────────────────────────────────────────

export function greetingFor(date: Date): string {
  const h = date.getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}
