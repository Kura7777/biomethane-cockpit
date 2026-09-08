import { MARKETS, isVoluntaryMarket } from '../markets/registry';
import { MarkEntry, UnitOfAccount } from '../markets/types';
import { MarksState, CostInputs } from '../netback/types';
import { getBenchmarkForMarket } from '../markets/marketBenchmarks';

/**
 * Generates an institutional trading desk baseline for all European markets, so the Trade Builder,
 * Scanner and Pricing Desk have 100% complete coverage across compliance quotas, voluntary GOs,
 * and regional/emerging sinks.
 */

/** Mid-price band per unit of account. Magnitudes differ by orders of magnitude between units. */
const BANDS: Record<UnitOfAccount, [min: number, max: number]> = {
  EUR_PER_TCO2E: [240, 350],
  EUR_PER_KG_CO2E: [0.28, 0.42],
  EUR_PER_MWH: [45, 95],
  EUR_PER_CIC: [280, 380],
  GBP_PER_RTFC: [0.18, 0.32],
  GBP_PER_DRTFC: [0.15, 0.30],
  EUR_PER_TCO2E_DEFICIT: [240, 340],
};

/** Voluntary Guarantees of Origin trade at €18-€30/MWh certificate premium, and EU ETS trades at €65-€80/tCO2e EUA parity */
const VOLUNTARY_GO_BAND: [min: number, max: number] = [20, 28];
const VOLUNTARY_ETS_BAND: [min: number, max: number] = [65, 80];

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

  // Price ALL Pan-European markets in the registry (Compliance + Voluntary + Emerging)
  MARKETS.forEach(market => {
    const isVol = isVoluntaryMarket(market.id);
    const benchmark = getBenchmarkForMarket(market.id);
    const dp = precisionFor(market.unitOfAccount);

    let mid: number;
    if (benchmark) {
      mid = benchmark.midPrice;
    } else {
      let [min, max] = BANDS[market.unitOfAccount];
      if (isVol) {
        if (market.id === 'VOL_EU_ETS') {
          [min, max] = VOLUNTARY_ETS_BAND;
        } else {
          [min, max] = VOLUNTARY_GO_BAND;
        }
      }
      const ceiling = market.ceilingEurMwh;
      mid = ceiling !== null ? Math.min(between(min, max), ceiling * 0.92) : between(min, max);
    }

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
        indexLinkedShare: round(between(0.965, 0.980), 3),
        source: SIMULATED_SOURCE_NAME,
        lastVerified: now.toISOString(),
        confidence: 'UNVERIFIED',
      },
    },
  };
}
