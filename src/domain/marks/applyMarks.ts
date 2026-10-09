/**
 * Canonical ingress seam for market marks.
 *
 * Every writer of market prices must pass through applyMarkUpdates:
 * - The broker-run initial seed and order book
 * - Order-book cell edits from the Pricing desk
 * - Unstructured broker text pastes
 * - Desk re-simulation (SIMULATE_DESK)
 * - Future live market price APIs (Argus, Marex, EEX, ICIS)
 *
 * Precedence rules:
 * 1. A simulated value NEVER overwrites a non-simulated mark.
 * 2. An older observation NEVER overwrites a newer one (compared by provenance.observedAt).
 * 3. Otherwise the incoming update wins.
 */

import { MarksState } from '../netback/types';
import { MarkEntry, MarkProvenance } from '../markets/types';
import { SIMULATED_SOURCE_NAME } from './simulate';
import { PricingBookEntry } from '../markets/brokerRun.seed';
import { isVoluntaryMarket, MARKETS } from '../markets/registry';
import { DE_THG_BUNDLE_MAX_CI, bundleYearFromVintage, deThgBundleMarkId } from '../markets/deThgBundle';

export interface MarkUpdate {
  marketId: string;
  bid?: number | null;
  offer?: number | null;
  mid?: number | null;
  source?: string | null;
  updatedAt?: string | null;
  provenance?: MarkProvenance | null;
  /**
   * True when the update corrects the date of the SAME observation (for example the trader fixing
   * the broker-run date). It skips the older-never-overwrites-newer check, but a simulated value
   * still can never overwrite a real one.
   */
  correction?: boolean;
}

/**
 * Checks whether a mark entry is from a synthetic or simulated origin.
 * Unpriced/empty entries with null bids and offers also behave as simulated/unseated slots.
 */
export function isSimulatedMark(entry?: { source?: string | null; provenance?: MarkProvenance | null; bid?: number | null; offer?: number | null; mid?: number | null } | null): boolean {
  if (!entry) return true;
  if (entry.provenance?.sourceType && entry.provenance.sourceType !== 'ESTIMATE') return false;
  if (entry.source === SIMULATED_SOURCE_NAME) return true;
  if (entry.provenance?.sourceType === 'ESTIMATE') return true;
  if (entry.provenance?.sourceName === SIMULATED_SOURCE_NAME) return true;

  if (
    (entry.bid === null || entry.bid === undefined) &&
    (entry.offer === null || entry.offer === undefined) &&
    (entry.mid === null || entry.mid === undefined) &&
    (!entry.source || entry.source === SIMULATED_SOURCE_NAME)
  ) {
    return true;
  }

  return false;
}

/**
 * Reverse of resolveMarketForQuote: the order-book identity (country, class, product class) of a
 * market that a pasted run line resolved to. Returns null for markets that have no order-book row
 * shape (for example the TTF gas index).
 */
export function quoteIdentityForMarket(marketId: string): { country: string; class: string; productClass: 'GO_VOLUNTARY' | 'BUNDLED_COMPLIANCE' } | null {
  const table: Record<string, { country: string; class: string; productClass: 'GO_VOLUNTARY' | 'BUNDLED_COMPLIANCE' }> = {
    DE_THG: { country: 'DE', class: 'THG', productClass: 'BUNDLED_COMPLIANCE' },
    NL_ERE: { country: 'NL', class: 'ERE', productClass: 'BUNDLED_COMPLIANCE' },
    FR_CPB: { country: 'FR', class: 'CPB', productClass: 'BUNDLED_COMPLIANCE' },
    UK_RTFO: { country: 'UK', class: 'RTFO', productClass: 'BUNDLED_COMPLIANCE' },
    UK_RGGO: { country: 'UK', class: 'RGGO', productClass: 'GO_VOLUNTARY' },
    IT_CIC: { country: 'IT', class: 'CIC', productClass: 'BUNDLED_COMPLIANCE' },
    FUELEU: { country: 'EU', class: 'FUELEU', productClass: 'BUNDLED_COMPLIANCE' },
    DE_GO: { country: 'DE', class: 'GO', productClass: 'GO_VOLUNTARY' },
    NL_GO: { country: 'NL', class: 'GO', productClass: 'GO_VOLUNTARY' },
    FR_GO: { country: 'FR', class: 'GO', productClass: 'GO_VOLUNTARY' },
    DK_GO: { country: 'DK', class: 'GO', productClass: 'GO_VOLUNTARY' },
    AIB_GO: { country: 'AIB', class: 'GO', productClass: 'GO_VOLUNTARY' },
  };
  return table[marketId] ?? null;
}

/**
 * Resolves a pricing book row (country, class, productClass) to its canonical market ID.
 */
export function resolveMarketForQuote(quote: {
  country: string;
  class: string;
  productClass?: string;
}): string | null {
  const c = quote.country.toUpperCase();
  const cls = quote.class.toUpperCase();

  // 1. UK
  if (c === 'UK' || c === 'GB') {
    if (cls === 'RTFO' || cls === 'DRTFC' || cls === 'RTFC') return 'UK_RTFO';
    if (cls === 'RGGO' || cls === 'GGCS') return 'UK_RGGO';
  }

  // 2. Germany
  if (c === 'DE') {
    if (cls === 'THG') return 'DE_THG';
    if (cls === 'GO') return 'DE_GO';
  }

  // 3. Netherlands
  if (c === 'NL') {
    if (cls === 'ERE' || cls === 'HBE') return 'NL_ERE';
    if (cls === 'GGE') return 'NL_GGE';
    if (cls === 'GO') return 'NL_GO';
  }

  // 4. France
  if (c === 'FR') {
    if (cls === 'CPB') return 'FR_CPB';
    if (cls === 'TIRUERT' || cls === 'TIRERT') return 'FR_TIRUERT';
    if (cls === 'GO') return 'FR_GO';
  }

  // 5. Denmark
  if (c === 'DK' && cls === 'GO') return 'DK_GO';

  // 6. AIB Hub
  if (c === 'AIB') return 'AIB_GO';

  // 7. Italy
  if (c === 'IT') {
    if (cls === 'CIC') return 'IT_CIC';
  }

  // 8. Spain
  if (c === 'ES') {
    if (cls === 'GDO') return 'ES_GDO';
  }

  // 9. Sweden
  if (c === 'SE' && (cls === 'TAX' || cls === 'TAX_EXEMPT')) return 'SE_TAX';

  // 10. Austria
  if (c === 'AT' && cls === 'EGG') return 'AT_EGG';

  // 11. Finland
  if (c === 'FI' && cls === 'TRANSPORT') return 'FI_TRANSPORT';

  // 12. Belgium
  if (c === 'BE' && cls === 'TRANSPORT') return 'BE_TRANSPORT';

  // 13. Poland
  if (c === 'PL' && cls === 'OZE') return 'PL_OZE';

  // 14. Czechia
  if (c === 'CZ' && cls === 'POZE') return 'CZ_POZE';

  // 15. Switzerland
  if (c === 'CH' && cls === 'VSG') return 'CH_VSG';

  // 16. Norway
  if (c === 'NO' && cls === 'BIOFUEL') return 'NO_STATNETT';

  // 17. Baltics
  if (c === 'EE' && cls === 'TRANSPORT') return 'EE_TRANSPORT';
  if (c === 'LT' && cls === 'ALT_FUELS') return 'LT_ALT_FUELS';
  if (c === 'LV' && cls === 'STORAGE_GO') return 'LV_CONEXUS';

  // 18. CEE / Southern
  if (c === 'IE' && cls === 'RHO') return 'IE_RHO';
  if (c === 'PT' && cls === 'EEGO') return 'PT_EEGO';
  if (c === 'HU' && cls === 'MEKH') return 'HU_MEKH';
  if (c === 'SK' && cls === 'OKTE') return 'SK_OKTE';
  if (c === 'RO' && cls === 'TRANSGAZ') return 'RO_TRANSGAZ';
  if (c === 'BG' && cls === 'BULGARTRANS') return 'BG_BULGARTRANSGAZ';
  if (c === 'HR' && cls === 'PLINACRO') return 'HR_PLINACRO';
  if (c === 'SI' && cls === 'BORZEN') return 'SI_PLINOVODI';
  if (c === 'GR' && cls === 'DESFA') return 'GR_DESFA';

  // 19. Pan-European Maritime & Carbon
  if ((c === 'EU' || c === 'MARITIME') && cls === 'FUELEU') return 'FUELEU';
  if ((c === 'EU' || c === 'CARBON') && (cls === 'EU_ETS' || cls === 'EU_ETS1')) return 'EU_ETS1';

  return null;
}

/**
 * A row may feed a market's mark only when it is the same kind of product: certificate-only (GO) rows
 * feed the voluntary GO markets, bundled compliance rows feed the compliance markets. Without this a
 * bundled physical quote (c. EUR 126-150) could be written as the AIB or DK GO certificate price.
 */
export function rowFeedsMarket(row: { productClass: string }, marketId: string): boolean {
  return row.productClass === (isVoluntaryMarket(marketId) ? 'GO_VOLUNTARY' : 'BUNDLED_COMPLIANCE');
}

function parseTimestamp(dateStr?: string | null): number | null {
  if (!dateStr) return null;
  const t = new Date(dateStr).getTime();
  return isNaN(t) ? null : t;
}

/**
 * Core pure function applying a batch of mark updates to MarksState with precedence enforcement.
 */
export function applyMarkUpdates(current: MarksState, updates: MarkUpdate[]): MarksState {
  const nextMarks: Record<string, MarkEntry> = { ...current.marks };
  let nextGasIndex = { ...current.gasIndex };

  for (const update of updates) {
    const isGasIndex = update.marketId === 'GAS_TTF' || update.marketId === 'gasIndex';

    const currentEntry: MarkEntry | typeof current.gasIndex = isGasIndex
      ? nextGasIndex
      : nextMarks[update.marketId] || {
          marketId: update.marketId,
          bid: null,
          offer: null,
          mid: null,
          updatedAt: null,
          source: null,
          provenance: null,
        };

    const currentSimulated = isSimulatedMark(currentEntry);
    const updateSimulated = isSimulatedMark(update);

    // Rule 1: A simulated value never overwrites a non-simulated mark
    if (!currentSimulated && updateSimulated) {
      continue;
    }

    // A real observation always overwrites synthetic simulated data regardless of timestamp
    const isUpgradingFromSimulated = currentSimulated && !updateSimulated;

    // Synthetic values carry no real observation date (simulateDesk staggers them at random), so a
    // fresh simulation always replaces an older simulation; rule 2 applies between real observations.
    const simulatedOverSimulated = currentSimulated && updateSimulated;

    if (!isUpgradingFromSimulated && !simulatedOverSimulated && !update.correction) {
      // Rule 2: An older observation never overwrites a newer one (compared by provenance.observedAt)
      const currentObserved = parseTimestamp(currentEntry.provenance?.observedAt);
      const updateObserved = parseTimestamp(update.provenance?.observedAt);

      if (currentObserved !== null && updateObserved !== null) {
        if (updateObserved < currentObserved) {
          continue;
        }
      }
    }

    // Derive mid price if not provided:
    // A one-sided quote gives a one-sided mark: mid is null unless both sides exist.
    let computedMid = update.mid;
    if (computedMid === undefined) {
      const bid = update.bid !== undefined ? update.bid : currentEntry.bid;
      const offer = update.offer !== undefined ? update.offer : currentEntry.offer;
      if (bid !== null && offer !== null) {
        computedMid = Number(((bid + offer) / 2).toFixed(6));
      } else {
        computedMid = null;
      }
    }

    const newBid = update.bid !== undefined ? update.bid : currentEntry.bid;
    const newOffer = update.offer !== undefined ? update.offer : currentEntry.offer;
    const newUpdatedAt = update.updatedAt !== undefined ? update.updatedAt : new Date().toISOString();
    const currentSource: string | null = ('source' in currentEntry) ? ((currentEntry as MarkEntry).source ?? null) : null;
    const newSource: string | null = update.source !== undefined ? (update.source ?? null) : currentSource;
    const fallbackProvenance: MarkProvenance = {
      sourceType: 'ESTIMATE',
      sourceName: newSource || SIMULATED_SOURCE_NAME,
      sourceUrl: null,
      observedAt: newUpdatedAt,
      note: null,
    };
    const newProvenance: MarkProvenance = update.provenance !== undefined
      ? (update.provenance || fallbackProvenance)
      : (currentEntry.provenance || fallbackProvenance);

    if (isGasIndex) {
      nextGasIndex = {
        bid: newBid,
        offer: newOffer,
        mid: computedMid,
        updatedAt: newUpdatedAt,
        provenance: newProvenance,
      };
    } else {
      nextMarks[update.marketId] = {
        marketId: update.marketId,
        bid: newBid,
        offer: newOffer,
        mid: computedMid,
        updatedAt: newUpdatedAt,
        source: newSource,
        provenance: newProvenance,
      };
    }
  }

  return {
    ...current,
    marks: nextMarks,
    gasIndex: nextGasIndex,
  };
}

export function rowHasPrice(r: { bidPriceNumeric: number | null; offerPriceNumeric: number | null }): boolean {
  return r.bidPriceNumeric !== null || r.offerPriceNumeric !== null;
}

/**
 * Selects the default reference row for a market from available broker rows according to Phase 1b rules:
 * 1. The row flagged highlight / isHighInterest (with a price if possible).
 * 2. Else the first row with vintage = currentYear (with a price if possible).
 * 3. Else the first row.
 * Only rows that carry a price are considered; a market with no priced broker row keeps its simulated mark.
 */
export function findDefaultReferenceRow(
  rows: PricingBookEntry[],
  currentYear: string = '2026'
): PricingBookEntry | undefined {
  if (rows.length === 0) return undefined;

  // A row with neither a bid nor an offer is not a price and can never be a reference row.
  const pool = rows.filter(rowHasPrice);
  if (pool.length === 0) return undefined;

  return (
    pool.find(r => r.highlight) ||
    pool.find(r => r.isHighInterest) ||
    pool.find(r => r.vintage === currentYear || r.vintage.includes(currentYear)) ||
    pool[0]
  );
}

/**
 * Creates a MarkUpdate from a pricing book row.
 */
export function createMarkUpdateFromRow(row: PricingBookEntry, marketId: string, runDate?: string): MarkUpdate {
  const observedAt = row.observedAt || runDate || '2026-08-18';
  // Broker rows quote in their own currency. A GBP row feeding a EUR-denominated market (UK RGGO) uses
  // the row's own EUR/MWh figure (numeric*EurMwh); a GBP-denominated market takes the quoted GBP price.
  const unit = MARKETS.find(m => m.id === marketId)?.unitOfAccount ?? '';
  const needsEur = row.currency === 'GBP' && !unit.startsWith('GBP');
  const hasEur = (row.numericBidEurMwh !== null && row.numericBidEurMwh !== undefined) ||
                 (row.numericOfferEurMwh !== null && row.numericOfferEurMwh !== undefined);
  const bid = needsEur
    ? (hasEur ? (row.numericBidEurMwh ?? null) : undefined)
    : (row.bidPriceNumeric ?? null);
  const offer = needsEur
    ? (hasEur ? (row.numericOfferEurMwh ?? null) : undefined)
    : (row.offerPriceNumeric ?? null);
  const mid = bid !== undefined && offer !== undefined && bid !== null && offer !== null
    ? Number(((bid + offer) / 2).toFixed(6))
    : (bid === undefined && offer === undefined ? undefined : null);

  return {
    marketId,
    bid,
    offer,
    mid,
    source: 'Broker run',
    updatedAt: new Date().toISOString(),
    provenance: {
      sourceType: 'BROKER_INDICATION',
      sourceName: 'Broker run',
      sourceUrl: null,
      observedAt,
      note: `Reference quote: ${row.country} ${row.class} (${row.vintage}) ${row.feedstock}${needsEur ? ' · £ quote shown in €/MWh at the dataset conversion' : ''}`,
    },
  };
}

/**
 * The DE THG manure + physical gas bundle quotes, as marks (one per delivery year, key
 * DE_THG_BUNDLE_<year>, EUR/MWh). The broker sheet quotes certificates only ("index gas price/swap
 * to be added on top"), so each mark is the certificate price and the gas index is added by the
 * netback engine. Only broker-run rows with a price and CI at or below -80 qualify; H226 gives 2026,
 * H127 gives 2027. Returned as updates so they go through applyMarkUpdates like every other mark.
 */
export function deThgBundleMarkUpdates(rows: PricingBookEntry[], runDate: string = '2026-08-18'): MarkUpdate[] {
  const byYear = new Map<number, PricingBookEntry[]>();
  for (const r of rows) {
    if (r.provenanceTier !== 'BROKER_RUN') continue;
    if (r.country.toUpperCase() !== 'DE' || r.class.toUpperCase() !== 'THG_BUNDLED') continue;
    if (r.ciNumeric === null || r.ciNumeric === undefined || r.ciNumeric > DE_THG_BUNDLE_MAX_CI) continue;
    if (!rowHasPrice(r)) continue;
    const year = bundleYearFromVintage(r.vintage);
    if (year === null) continue;
    byYear.set(year, [...(byYear.get(year) ?? []), r]);
  }
  const updates: MarkUpdate[] = [];
  for (const [year, group] of byYear) {
    const ref = findDefaultReferenceRow(group, String(year));
    if (!ref) continue;
    const bid = ref.bidPriceNumeric ?? null;
    const offer = ref.offerPriceNumeric ?? null;
    updates.push({
      marketId: deThgBundleMarkId(year),
      bid,
      offer,
      mid: bid !== null && offer !== null ? Number(((bid + offer) / 2).toFixed(6)) : null,
      source: 'Broker run',
      updatedAt: new Date().toISOString(),
      provenance: {
        sourceType: 'BROKER_INDICATION',
        sourceName: 'Broker run',
        sourceUrl: null,
        observedAt: ref.observedAt || runDate,
        note: `Certificate-only bundle: ${ref.country} ${ref.feedstock} (${ref.vintage}, CI ${ref.ciScore}); gas index is added on top. Run ${ref.runId}.`,
      },
    });
  }
  return updates;
}

/**
 * Seeds marks for all markets that have broker quotes in the pricing book.
 */
export function seedMarksFromPricingBook(
  currentMarks: MarksState,
  pricingBook: PricingBookEntry[],
  runDate: string = '2026-08-18'
): { nextMarks: MarksState; referenceRowIds: Record<string, string> } {
  const brokerRows = pricingBook.filter(r => r.provenanceTier === 'BROKER_RUN');
  const marketGroups: Record<string, PricingBookEntry[]> = {};

  for (const row of brokerRows) {
    const marketId = resolveMarketForQuote(row);
    if (marketId && rowFeedsMarket(row, marketId)) {
      if (!marketGroups[marketId]) marketGroups[marketId] = [];
      marketGroups[marketId].push(row);
    }
  }

  const updates: MarkUpdate[] = [];
  const referenceRowIds: Record<string, string> = {};

  for (const [marketId, rows] of Object.entries(marketGroups)) {
    const ref = findDefaultReferenceRow(rows);
    if (ref) {
      referenceRowIds[marketId] = ref.id;
      const existing = currentMarks.marks[marketId];
      if (!existing || isSimulatedMark(existing)) {
        const update = createMarkUpdateFromRow(ref, marketId, runDate);
        if (update.bid !== undefined || update.offer !== undefined) {
          updates.push(update);
        }
      }
    }
  }

  updates.push(...deThgBundleMarkUpdates(brokerRows, runDate));

  const nextMarks = applyMarkUpdates(currentMarks, updates);
  return { nextMarks, referenceRowIds };
}
