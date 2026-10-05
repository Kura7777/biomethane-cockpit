import { describe, it, expect } from 'vitest';
import { computeNetback, selectMarkSide, selectMarkPrice } from '../netback/engine';
import { markSideWarning } from '../netback/sideFallback';
import { getMarketById } from '../markets/registry';
import { REFERENCE_CONSIGNMENTS } from '../consignment/feedstocks';
import { buildMarketLadder } from '../arbitrage/marketLadder';
import { computeOriginationBreakdown } from '../arbitrage/originationBreakdown';
import type { CostInputs, MarksState } from '../netback/types';

const NOW = new Date().toISOString();

const costs: CostInputs = {
  transferCosts: 1,
  certificationCosts: 0.5,
  logistics: 1.5,
  otherCosts: 0,
  producerPricing: {
    mode: 'INDEX_LINKED',
    indexLinkedShare: 0.9,
    fixedPriceEurPerMwh: null,
    source: 'Fixture',
    lastVerified: null,
    confidence: 'VERIFIED',
  },
};

function marksWith(entries: MarksState['marks'], over: Partial<MarksState> = {}): MarksState {
  return {
    marks: entries,
    gasIndex: { bid: 30, offer: 32, mid: 31, updatedAt: NOW },
    fx: { gbpEur: 1.2, chfEur: 1.05, updatedAt: NOW },
    pricingSides: { certificateSide: 'bid', moleculeSide: 'bid' },
    ...over,
  };
}

describe('calc fix 1: a missing side is never silent', () => {
  it('records that the offer was used when the bid is missing', () => {
    const market = getMarketById('FR_CPB')!;
    const marks = marksWith({
      FR_CPB: { marketId: 'FR_CPB', bid: null, offer: 95, mid: null, updatedAt: NOW, source: 'Fixture' },
    });
    const nb = computeNetback(market, REFERENCE_CONSIGNMENTS.UK_FOOD_WASTE, marks, costs);
    expect(nb.certificateValue?.valueEurPerMWh).toBe(95); // fallback kept so the screen shows a number
    expect(nb.sideRequested).toBe('bid');
    expect(nb.sideUsed).toBe('offer');
    expect(markSideWarning(nb.sideRequested, nb.sideUsed)).toBe('No bid quoted, priced off the offer');
  });

  it('records the bid when the offer is missing, and no warning when the requested side exists', () => {
    expect(selectMarkSide({ bid: 80, offer: null, mid: null }, 'offer')).toEqual({
      price: 80, sideRequested: 'offer', sideUsed: 'bid',
    });
    expect(markSideWarning('offer', 'bid')).toBe('No offer quoted, priced off the bid');
    expect(selectMarkSide({ bid: 80, offer: 90, mid: 85 }, 'bid').sideUsed).toBe('bid');
    expect(markSideWarning('bid', 'bid')).toBeNull();
    expect(selectMarkPrice({ bid: null, offer: 95, mid: null }, 'bid')).toBe(95);
  });
});

describe('calc fix 1: the side fallback reaches every screen model', () => {
  const market = getMarketById('FR_CPB')!;
  const offerOnly = marksWith({
    FR_CPB: { marketId: 'FR_CPB', bid: null, offer: 95, mid: null, updatedAt: NOW, source: 'Fixture' },
  });

  it('the Origination ladder row carries the sides', () => {
    const ladder = buildMarketLadder(
      {
        originCountry: 'DK', originCountryName: 'Denmark', feedstockKey: 'manure', feedstockName: 'Manure',
        carbonIntensity: -100, certificationScheme: 'ISCC_EU', chainOfCustody: 'MASS_BALANCE', targetMarketId: 'FR_CPB',
      },
      20000,
      offerOnly,
      costs
    );
    const row = [...ladder.ranked, ...ladder.missing].find(r => r.marketId === 'FR_CPB')!;
    expect(row.sideRequested).toBe('bid');
    expect(row.sideUsed).toBe('offer');
    expect(markSideWarning(row.sideRequested, row.sideUsed)).toBe('No bid quoted, priced off the offer');
  });

  it('the Step 3/4 breakdown carries the warning', () => {
    const nb = computeNetback(market, REFERENCE_CONSIGNMENTS.UK_FOOD_WASTE, offerOnly, costs);
    const b = computeOriginationBreakdown({
      opportunity: {
        producerPayableEurPerMWh: nb.producerPayable,
        transitCostEurPerMWh: 0,
        totalTerminalValueStackEurPerMWh: nb.netNetback,
        deskNetMarginEurPerMWh: nb.deskMargin,
        totalDealProfitEur: nb.deskPnL,
        certSideRequested: nb.sideRequested,
        certSideUsed: nb.sideUsed,
      },
      volumeMwh: 20000,
      marks: offerOnly,
      costs,
    });
    expect(b.sideWarning).toBe('No bid quoted, priced off the offer');
  });
});

describe('calc fix 2: pasted £ broker runs are not converted to €', () => {
  it('leaves EUR null when no FX rate is provided, instead of using raw GBP', async () => {
    const { parseFreeformQuotes } = await import('../markets/brokerRunParser');
    const res = parseFreeformQuotes('UK RGGO 2026 £22.00 Offer');
    expect(res.quotes[0].currency).toBe('GBP');
    expect(res.quotes[0].offerPrice).toBe('£22.00');
    expect(res.quotes[0].numericOfferEurMwh).toBeNull();
  });

  it('converts GBP to EUR when an FX rate is provided', async () => {
    const { parseFreeformQuotes } = await import('../markets/brokerRunParser');
    const res = parseFreeformQuotes('UK RGGO 2026 £22.00 Offer', 1.175);
    expect(res.quotes[0].currency).toBe('GBP');
    expect(res.quotes[0].numericOfferEurMwh).toBe(25.85);
  });

  it('createMarkUpdateFromRow does not write a EUR mark when EUR fields are null', async () => {
    const { createMarkUpdateFromRow, applyMarkUpdates } = await import('../marks/applyMarks');
    const { INITIAL_PRICING_BOOK } = await import('../markets/brokerRun.seed');
    const row = {
      ...INITIAL_PRICING_BOOK[0],
      currency: 'GBP' as const,
      bidPriceNumeric: 20,
      offerPriceNumeric: 22,
      numericBidEurMwh: null,
      numericOfferEurMwh: null,
    };
    const update = createMarkUpdateFromRow(row, 'UK_RGGO');
    expect(update.bid).toBeUndefined();
    expect(update.offer).toBeUndefined();

    const currentMarks = marksWith({
      UK_RGGO: { marketId: 'UK_RGGO', bid: 15, offer: 18, mid: 16.5, updatedAt: NOW, source: 'Simulated' },
    });
    const nextMarks = applyMarkUpdates(currentMarks, [update]);
    expect(nextMarks.marks['UK_RGGO'].offer).toBe(18); // unchanged, not overwritten with null/GBP
  });
});

