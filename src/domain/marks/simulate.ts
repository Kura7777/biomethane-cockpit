import { MARKETS } from '../markets/registry';
import { MarkEntry, UnitOfAccount } from '../markets/types';
import { MarksState, CostInputs } from '../netback/types';

/**
 * Generates a plausible-looking desk for testing, so the Trade Builder, Scanner and Dossiers
 * have something to compute against before real marks are available.
 *
 * These are illustrative levels, NOT researched market data. Every generated mark is stamped
 * with sourceType 'ESTIMATE' and sourceName 'SIMULATED' so it sorts to the bottom of
 * MARK_SOURCE_RELIABILITY and is obvious in the UI. Replace the bands below with real levels
 * once you have broker access.
 */

/** Mid-price band per unit of account. Magnitudes differ by orders of magnitude between units. */
const BANDS: Record<UnitOfAccount, [min: number, max: number]> = {
  EUR_PER_TCO2E: [280, 420],
  EUR_PER_KG_CO2E: [0.28, 0.42],
  EUR_PER_MWH: [45, 95],
  EUR_PER_CIC: [280, 380],
  GBP_PER_DRTFC: [0.15, 0.30],
  EUR_PER_TCO2E_DEFICIT: [240, 340],
};

/**
 * Stamped on every generated mark. The desk seeds itself with these on first run so
 * the screens have something to compute against; the shell reads this name to raise
 * the 'running on simulated marks' banner. Exported so neither side hardcodes it.
 */
export const SIMULATED_SOURCE_NAME = 'SIMULATED';

const between = (min: number, max: number) => min + Math.random() * (max - min);

/** Decimals needed so sub-€1 units don't all round to the same number. */
const precisionFor = (unit: UnitOfAccount) => (unit === 'EUR_PER_KG_CO2E' || unit === 'GBP_PER_DRTFC' ? 3 : 2);

function round(value: number, dp: number): number {
  return Number(value.toFixed(dp));
}

export function simulateDesk(now: Date = new Date()): { marks: MarksState; costs: CostInputs } {
  const marks: Record<string, MarkEntry> = {};

  MARKETS.filter(m => m.status === 'ACTIVE').forEach(market => {
    const [min, max] = BANDS[market.unitOfAccount];
    const dp = precisionFor(market.unitOfAccount);

    // Keep the mid clear of any statutory ceiling (FR CPB is capped at €100/MWh).
    const ceiling = market.ceilingEurMwh;
    const mid = ceiling !== null ? Math.min(between(min, max), ceiling * 0.92) : between(min, max);

    // Half-spread of 1–3% of mid, so bid/offer stay proportionate across wildly different units.
    const halfSpread = mid * between(0.01, 0.03);

    // Stagger observation dates across 0–40 days so the >7d amber / >30d red staleness
    // banding on the Marks screen actually has something to show.
    const observedAt = new Date(now.getTime() - Math.floor(between(0, 40)) * 86_400_000).toISOString();

    marks[market.id] = {
      marketId: market.id,
      bid: round(mid - halfSpread, dp),
      offer: round(mid + halfSpread, dp),
      mid: round(mid, dp),
      updatedAt: now.toISOString(),
      source: SIMULATED_SOURCE_NAME,
      provenance: {
        sourceType: 'ESTIMATE',
        sourceName: SIMULATED_SOURCE_NAME,
        sourceUrl: null,
        observedAt,
        note: 'Synthetic test data — not a real mark.',
      },
    };
  });

  const ttfMid = between(26, 34);

  return {
    marks: {
      marks,
      gasIndex: {
        bid: round(ttfMid - 0.25, 2),
        offer: round(ttfMid + 0.25, 2),
        mid: round(ttfMid, 2),
        updatedAt: now.toISOString(),
        provenance: {
          sourceType: 'ESTIMATE',
          sourceName: SIMULATED_SOURCE_NAME,
          sourceUrl: null,
          observedAt: now.toISOString(),
          note: 'Synthetic test data — not a real mark.',
        },
      },
      fx: {
        gbpEur: round(between(1.14, 1.20), 3),
        chfEur: round(between(1.04, 1.08), 3),
        updatedAt: now.toISOString(),
        provenance: {
          sourceType: 'ESTIMATE',
          sourceName: SIMULATED_SOURCE_NAME,
          sourceUrl: null,
          observedAt: now.toISOString(),
          note: 'Synthetic test data — not a real mark.',
        },
      },
      pricingSides: { certificateSide: 'bid', moleculeSide: 'bid' },
    },
    costs: {
      transferCosts: round(between(0.6, 1.8), 2),
      certificationCosts: round(between(0.3, 0.7), 2),
      logistics: round(between(0.2, 0.9), 2),
      otherCosts: null,
      producerPricing: {
        mode: 'INDEX_LINKED',
        fixedPriceEurPerMwh: null,
        indexLinkedShare: round(between(0.55, 0.75), 2),
        source: SIMULATED_SOURCE_NAME,
        lastVerified: now.toISOString(),
        confidence: 'UNVERIFIED',
      },
    },
  };
}
