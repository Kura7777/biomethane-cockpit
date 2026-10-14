import { BrokerParseResult } from '../markets/brokerRunParser';
import { PricingBookEntry } from '../markets/brokerRun.seed';
import { quoteIdentityForMarket } from './applyMarks';
import { AppAction } from '../../store/state';

/**
 * Commits a validated BrokerParseResult into the desk's live PricingBook and AppState.
 * Dispatches ADD_PRICING_RUN, SET_GAS_INDEX, and SET_MARK actions.
 */
export function commitBrokerRunToState(
  dispatch: (action: AppAction) => void,
  parseResult: BrokerParseResult,
  customDate?: string
): number {
  const effectiveRunDate = customDate || parseResult.extractedDate || new Date().toISOString().slice(0, 10);
  const validMarks = parseResult.marks.filter(m => m.isValid && m.marketId);
  if (validMarks.length === 0) return 0;

  const now = new Date().toISOString();
  const runId = `broker-run-${effectiveRunDate}-${Date.now()}`;

  // Build new pricing book rows for state.pricingBook
  const bookItems = validMarks.filter(item => item.marketId && quoteIdentityForMarket(item.marketId));
  const newBookRows: PricingBookEntry[] = bookItems.map((item, idx) => {
    const identity = quoteIdentityForMarket(item.marketId as string)!;
    const bidNum = item.bid ?? null;
    const offerNum = item.ask ?? null;
    const currency = item.unit.startsWith('GBP') ? 'GBP' : 'EUR';

    return {
      id: `paste_${Date.now()}_${idx + 1}`,
      baselineId: null,
      runId,
      country: identity.country,
      class: identity.class,
      productClass: identity.productClass,
      feedstock: item.productRaw,
      vintage: '—',
      certified: '—',
      subsidized: '—',
      ciScore: '—',
      ciNumeric: null,
      currency,
      bidPrice: bidNum !== null ? (currency === 'GBP' ? `£${bidNum}` : `€ ${bidNum}`) : '',
      offerPrice: offerNum !== null ? (currency === 'GBP' ? `£${offerNum}` : `€ ${offerNum}`) : '',
      bidPriceNumeric: bidNum,
      offerPriceNumeric: offerNum,
      bidText: null,
      offerText: null,
      bidVolume: '',
      offerVolume: '',
      bidVolumeGWh: null,
      offerVolumeGWh: null,
      bidVolumeText: null,
      offerVolumeText: null,
      numericBidEurMwh: currency === 'EUR' ? bidNum : null,
      numericOfferEurMwh: currency === 'EUR' ? offerNum : null,
      highlight: false,
      isHighInterest: false,
      derivedFrom: `${parseResult.brokerDetected} broker paste (run dated ${effectiveRunDate})`,
      provenanceTier: 'BROKER_RUN',
      observedAt: effectiveRunDate,
      isTradeable: true,
      isReferenceRow: false,
    };
  });

  if (newBookRows.length > 0) {
    dispatch({
      type: 'ADD_PRICING_RUN',
      runMeta: {
        runId,
        broker: parseResult.brokerDetected,
        receivedOn: effectiveRunDate,
        receivedOnIsApproximate: false,
      },
      rows: newBookRows,
    });
  }

  // Lines with no order-book shape (e.g. TTF gas index)
  const bookMarketIds = new Set(bookItems.map(i => i.marketId));
  validMarks.filter(item => !bookMarketIds.has(item.marketId)).forEach(item => {
    if (item.marketId === 'GAS_TTF') {
      dispatch({
        type: 'SET_GAS_INDEX',
        mid: item.midPrice,
        bid: item.bid,
        offer: item.ask,
        updatedAt: now,
        provenance: {
          sourceType: 'BROKER_INDICATION',
          sourceName: parseResult.brokerDetected,
          sourceUrl: null,
          observedAt: effectiveRunDate,
          note: 'Imported via broker run staging',
        },
      });
    } else if (item.marketId) {
      dispatch({
        type: 'SET_MARK',
        marketId: item.marketId,
        mid: item.midPrice,
        bid: item.bid,
        offer: item.ask,
        source: `BROKER · ${parseResult.brokerDetected}`,
        updatedAt: now,
        provenance: {
          sourceType: 'BROKER_INDICATION',
          sourceName: parseResult.brokerDetected,
          sourceUrl: null,
          observedAt: effectiveRunDate,
          note: `Imported via broker run (${effectiveRunDate})`,
        },
      });
    }
  });

  return validMarks.length;
}
