import { BrokerParseResult, DEFAULT_UNITS } from '../markets/brokerRunParser';
import { MARKETS } from '../markets/registry';
import { findTenorInText } from './tenorLabel';
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
  // Numbers the desk helper extracted from chat text are never labelled as a broker observation.
  const chatLabel = parseResult.chatExtractedLabel ?? null;
  const originLabel = chatLabel ?? `${parseResult.brokerDetected} broker paste`;
  const runId = `broker-run-${effectiveRunDate}-${Date.now()}`;

  // Build new pricing book rows for state.pricingBook
  const bookItems = validMarks.filter(item => item.marketId && quoteIdentityForMarket(item.marketId));
  const newBookRows: PricingBookEntry[] = bookItems.map((item, idx) => {
    const identity = quoteIdentityForMarket(item.marketId as string)!;
    const bidNum = item.bid ?? null;
    const offerNum = item.ask ?? null;
    // The mark's numbers are in the market's own unit of account (the parser converts or rejects before
    // this). Only a genuine EUR/MWh price may ever be written into numeric*EurMwh: a EUR/t, EUR/kg,
    // EUR/CIC or GBP/RTFC number is never treated as EUR/MWh.
    const marketUnit = (item.marketId ? (DEFAULT_UNITS[item.marketId] ?? MARKETS.find(m => m.id === item.marketId)?.unitOfAccount) : null) ?? item.unit;
    const currency = marketUnit.startsWith('GBP') ? 'GBP' : 'EUR';
    const isPerTonne = marketUnit.startsWith('EUR_PER_TCO2E');
    const isPerKg = marketUnit === 'EUR_PER_KG_CO2E';
    const isMwh = marketUnit === 'EUR_PER_MWH';

    // Canonical tenor label (Cal 2027, Q1 2027, H2 2026 ...) from the parser or the raw text; '—' only when none is stated.
    const vintage = item.vintage ?? findTenorInText(item.rawLine + ' ' + item.productRaw) ?? '—';

    // Format display prices with appropriate unit suffix
    const formatPrice = (val: number | null) => {
      if (val === null) return '';
      if (currency === 'GBP') return `£${val.toFixed(2)}`;
      if (isPerTonne) return `€ ${val.toFixed(2)}/t`;
      if (isPerKg) return `€ ${val.toFixed(3)}/kg`;
      return `€ ${val.toFixed(2)}`;
    };

    // Clean up feedstock label if it's just a raw market code
    let feedstockLabel = item.productRaw;
    if (item.marketId === 'DE_THG' && /^(?:DE[_\s]?THG(?:\s+202\d)?|THG)$/i.test(item.productRaw.trim())) {
      feedstockLabel = 'German THG Quota Benchmark (DE_THG)';
    } else if (item.marketId === 'UK_RTFO' && /^(?:UK[_\s]?RTFO|RTFO|RTFC)$/i.test(item.productRaw.trim())) {
      feedstockLabel = 'UK RTFO Development RTFC Benchmark';
    }

    return {
      id: `paste_${Date.now()}_${idx + 1}`,
      baselineId: null,
      runId,
      country: identity.country,
      class: identity.class,
      productClass: identity.productClass,
      feedstock: feedstockLabel,
      vintage,
      certified: '—',
      subsidized: '—',
      ciScore: item.ciScore ?? '—',
      ciNumeric: null,
      currency,
      bidPrice: formatPrice(bidNum),
      offerPrice: formatPrice(offerNum),
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
      numericBidEurMwh: isMwh ? bidNum : null,
      numericOfferEurMwh: isMwh ? offerNum : null,
      highlight: false,
      isHighInterest: false,
      derivedFrom: `${originLabel} (run dated ${effectiveRunDate})`,
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
          sourceName: chatLabel ?? parseResult.brokerDetected,
          sourceUrl: null,
          observedAt: effectiveRunDate,
          note: chatLabel ? 'Extracted by the desk helper from chat text; not a verified broker run' : 'Imported via broker run staging',
        },
      });
    } else if (item.marketId) {
      dispatch({
        type: 'SET_MARK',
        marketId: item.marketId,
        mid: item.midPrice,
        bid: item.bid,
        offer: item.ask,
        source: chatLabel ? `CHAT-EXTRACTED · ${parseResult.brokerDetected}` : `BROKER · ${parseResult.brokerDetected}`,
        updatedAt: now,
        provenance: {
          sourceType: 'BROKER_INDICATION',
          sourceName: chatLabel ?? parseResult.brokerDetected,
          sourceUrl: null,
          observedAt: effectiveRunDate,
          note: chatLabel ? `Extracted by the desk helper from chat text (${effectiveRunDate}); not a verified broker run` : `Imported via broker run (${effectiveRunDate})`,
        },
      });
    }
  });

  return validMarks.length;
}
