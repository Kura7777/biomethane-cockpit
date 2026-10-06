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

describe('calc fix 3: all-in markets do not add gas twice', () => {
  it('does not add TTF gas index to CH_VSG, HU_MEKH, RO_TRANSGAZ netback', () => {
    const chMarket = getMarketById('CH_VSG')!;
    const huMarket = getMarketById('HU_MEKH')!;
    const roMarket = getMarketById('RO_TRANSGAZ')!;
    const marks = marksWith({
      CH_VSG: { marketId: 'CH_VSG', bid: 94, offer: 102, mid: 98, updatedAt: NOW, source: 'Fixture' },
      HU_MEKH: { marketId: 'HU_MEKH', bid: 59, offer: 65, mid: 62, updatedAt: NOW, source: 'Fixture' },
      RO_TRANSGAZ: { marketId: 'RO_TRANSGAZ', bid: 55, offer: 61, mid: 58, updatedAt: NOW, source: 'Fixture' },
    });
    // certVal = 94, TTF = 30, costs = 3.
    // Correct netNetback = 94 - 3 = 91.
    const chNb = computeNetback(chMarket, REFERENCE_CONSIGNMENTS.UK_FOOD_WASTE, marks, costs);
    expect(chNb.netNetback).toBe(91);
    expect(chNb.certificateValue?.calculation).toContain('bundled physical gas');

    // HU_MEKH: bid 59 - 3 = 56
    const huNb = computeNetback(huMarket, REFERENCE_CONSIGNMENTS.UK_FOOD_WASTE, marks, costs);
    expect(huNb.netNetback).toBe(56);
    expect(huNb.certificateValue?.calculation).toContain('bundled physical gas');

    // RO_TRANSGAZ: bid 55 - 3 = 52
    const roNb = computeNetback(roMarket, REFERENCE_CONSIGNMENTS.UK_FOOD_WASTE, marks, costs);
    expect(roNb.netNetback).toBe(52);
    expect(roNb.certificateValue?.calculation).toContain('bundled physical gas');
  });

  it('Origination breakdown does not subtract TTF from all-in market revenue', () => {
    const b = computeOriginationBreakdown({
      opportunity: {
        targetMarketId: 'CH_VSG',
        producerPayableEurPerMWh: 80,
        transitCostEurPerMWh: 0,
        totalTerminalValueStackEurPerMWh: 91,
        deskNetMarginEurPerMWh: 11,
        totalDealProfitEur: 220000,
      },
      volumeMwh: 20000,
      marks: marksWith({}),
      costs,
    });
    expect(b.grossRevenueEur).toBe(91);
    expect(b.certificateValueEur).toBe(91);
    expect(b.gasIndexEur).toBeNull();
  });
});

describe('calc fix 4 & 5: Origination and Trade Builder reconciliation', () => {
  it('inspects DK manure -> DE_THG at 20,000 MWh', async () => {
    const { createDefaultState } = await import('../../store/context');
    const { getMarketById } = await import('../markets/registry');
    const { searchSourcingRoutes } = await import('../arbitrage/sourcingAdapter');
    const { DEFAULT_WHAT_IF_SCENARIO } = await import('../arbitrage/engine');
    const { computeOriginationBreakdown } = await import('../arbitrage/originationBreakdown');

    const state = createDefaultState();
    const market = getMarketById('DE_THG')!;
    const dkConsignment = {
      ...REFERENCE_CONSIGNMENTS.DANISH_MANURE,
      volumeMWh: 20000,
    };
    const tbNetback = computeNetback(market, dkConsignment, state.marks, state.costs, state.marks.pricingSides);

    console.log('Trade Builder Netback:', {
      certVal: tbNetback.certificateValue?.valueEurPerMWh,
      safeMol: tbNetback.moleculeValue,
      totalCosts: tbNetback.totalCosts,
      netNetback: tbNetback.netNetback,
      producerPayable: tbNetback.producerPayable,
      deskMargin: tbNetback.deskMargin,
      cappedAt: tbNetback.netbackCappedAt,
    });

    const searchRes = searchSourcingRoutes(
      {
        feedstockKey: 'manure',
        targetMarketId: 'DE_THG',
        scheme: 'ISCC_EU',
        chainOfCustody: 'MASS_BALANCE',
        delivery: { type: 'MONTH', startDate: '2026-09-01', endDate: '2026-09-30', complianceYear: 2026 },
        volumeMwh: 20000,
        constraints: { maxCarbonIntensity: null, maxDeliveredCostEurMwh: null, physicalDeliveryRequired: false },
        counterparty: null,
        notes: null,
      },
      state.marks,
      state.costs,
      DEFAULT_WHAT_IF_SCENARIO
    );

    const dkOpp = searchRes.tradeable.find(o => o.originCountry === 'DK' && o.targetMarketId === 'DE_THG')!;
    console.log('Origination Opp:', {
      totalTerminalValueStackEurPerMWh: dkOpp?.totalTerminalValueStackEurPerMWh,
      producerPayableEurPerMWh: dkOpp?.producerPayableEurPerMWh,
      transitCostEurPerMWh: dkOpp?.transitCostEurPerMWh,
      deskNetMarginEurPerMWh: dkOpp?.deskNetMarginEurPerMWh,
      netbackCappedAt: dkOpp?.netbackCappedAt,
    });

    const b = computeOriginationBreakdown({
      opportunity: dkOpp,
      volumeMwh: 20000,
      marks: state.marks,
      costs: state.costs,
    });
    expect(b.grossRevenueEur).not.toBeNull();
    const diff = Number((b.grossRevenueEur! - b.totalDeliveredCostEur).toFixed(2));
    expect(diff).toBe(b.netMarginEurPerMwh);
  });

  it('calc fix 7: Trade Builder and Origination price the DK->DE corridor leg identically', async () => {
    const { createDefaultState } = await import('../../store/context');
    const { getMarketById } = await import('../markets/registry');
    const { searchSourcingRoutes } = await import('../arbitrage/sourcingAdapter');
    const { DEFAULT_WHAT_IF_SCENARIO } = await import('../arbitrage/engine');
    const { computeOriginationBreakdown } = await import('../arbitrage/originationBreakdown');
    const { getRouteTransitTariff } = await import('../arbitrage/origins');

    // A fixed, non-zero registry transfer fee: the test must fail if either screen drops it.
    const baseState = createDefaultState();
    const state = { ...baseState, costs: { ...baseState.costs, transferCosts: 1.20 } };
    const market = getMarketById('DE_THG')!;
    const dkConsignment = {
      ...REFERENCE_CONSIGNMENTS.DANISH_MANURE,
      volumeMWh: 20000,
    };

    // Trade Builder path, fixed: only `logistics` is replaced by the corridor transit tariff.
    // transferCosts (the registry transfer fee) and otherCosts are kept as entered — they are
    // real desk costs, not folded into the corridor leg.
    const corridorTariff = getRouteTransitTariff('DK', market.country);
    const tbRouteCosts = { ...state.costs, logistics: corridorTariff };
    const tbNetback = computeNetback(market, dkConsignment, state.marks, tbRouteCosts, state.marks.pricingSides);

    // Origination path.
    const searchRes = searchSourcingRoutes(
      {
        feedstockKey: 'manure',
        targetMarketId: 'DE_THG',
        scheme: 'ISCC_EU',
        chainOfCustody: 'MASS_BALANCE',
        delivery: { type: 'MONTH', startDate: '2026-09-01', endDate: '2026-09-30', complianceYear: 2026 },
        volumeMwh: 20000,
        constraints: { maxCarbonIntensity: null, maxDeliveredCostEurMwh: null, physicalDeliveryRequired: false },
        counterparty: null,
        notes: null,
      },
      state.marks,
      state.costs,
      DEFAULT_WHAT_IF_SCENARIO
    );
    const dkOpp = searchRes.tradeable.find(o => o.originCountry === 'DK' && o.targetMarketId === 'DE_THG')!;
    const b = computeOriginationBreakdown({
      opportunity: dkOpp,
      volumeMwh: 20000,
      marks: state.marks,
      costs: state.costs,
    });

    // The registry transfer fee is a real cost on both screens — neither one drops it.
    expect(tbRouteCosts.transferCosts).toBe(1.20);
    expect(b.transferEur).toBe(1.20);
    expect(tbNetback.totalCosts).not.toBeNull();

    // netNetback is the realisable (bundle-capped, when a broker reference binds) figure —
    // the same quantity Origination surfaces as the opportunity's producer payable and margin.
    // dkOpp.netbackCappedAt is the unrounded bundle benchmark (netback.engine.ts stores it
    // before the toFixed(2) that produces netNetback), so compare to 2dp rather than bit-exact.
    expect(tbNetback.netNetback).toBeCloseTo(dkOpp.netbackCappedAt ?? dkOpp.theoreticalNetbackEurPerMWh!, 2);
    expect(tbNetback.producerPayable).toBe(dkOpp.producerPayableEurPerMWh);
    expect(tbNetback.deskMargin).toBe(dkOpp.deskNetMarginEurPerMWh);
    expect(tbNetback.deskMargin).toBe(b.netMarginEurPerMwh);
  });

  it('Step 4 term sheet identity: revenue - costs === desk margin to the cent across markets', async () => {
    const { createDefaultState } = await import('../../store/context');
    const { searchSourcingRoutes } = await import('../arbitrage/sourcingAdapter');
    const { DEFAULT_WHAT_IF_SCENARIO } = await import('../arbitrage/engine');
    const { computeOriginationBreakdown } = await import('../arbitrage/originationBreakdown');

    const state = createDefaultState();
    const searchRes = searchSourcingRoutes(
      {
        feedstockKey: 'ANY',
        targetMarketId: 'ANY',
        scheme: 'ISCC_EU',
        chainOfCustody: 'MASS_BALANCE',
        delivery: { type: 'MONTH', startDate: '2026-09-01', endDate: '2026-09-30', complianceYear: 2026 },
        volumeMwh: 10000,
        constraints: { maxCarbonIntensity: null, maxDeliveredCostEurMwh: null, physicalDeliveryRequired: false },
        counterparty: null,
        notes: null,
      },
      state.marks,
      state.costs,
      DEFAULT_WHAT_IF_SCENARIO
    );

    expect(searchRes.tradeable.length).toBeGreaterThan(0);
    for (const opp of searchRes.tradeable) {
      const b = computeOriginationBreakdown({
        opportunity: opp,
        volumeMwh: 10000,
        marks: state.marks,
        costs: state.costs,
      });
      if (b.grossRevenueEur !== null && b.netMarginEurPerMwh !== null) {
        const revenueMinusCosts = Number((b.grossRevenueEur - b.totalDeliveredCostEur).toFixed(2));
        expect(revenueMinusCosts).toBe(b.netMarginEurPerMwh);
      }
    }
  });
});

describe('calc fix 6: value stack prices certificate leg at chosen side', () => {
  it('prices certificate using state.marks.pricingSides.certificateSide instead of hardcoded mid', async () => {
    const { computeValueStack } = await import('../valueStack/engine');
    type PriceSide = 'bid' | 'offer' | 'mid';

    const testMarks = {
      marks: {
        DE_THG: {
          marketId: 'DE_THG',
          bid: 140,
          offer: 160,
          mid: 150,
          updatedAt: null,
          source: 'test',
        },
      },
      gasIndex: { bid: null, offer: null, mid: null, updatedAt: null },
      fx: { gbpEur: null, chfEur: null, updatedAt: null },
      pricingSides: { certificateSide: 'bid' as PriceSide, moleculeSide: 'bid' as PriceSide },
    };

    const baseInput = {
      client: 'DE_FUEL_SUPPLIER' as const,
      volumeMWh: 10000,
      carbonIntensity: -100,
      deliveryYear: 2026,
      intraEuShare: null,
      smallSiteShare: null,
      ets2PassThrough: null,
      greenTariffPremiumEurPerMWh: null,
      offerPremiumEurPerMWh: null,
    };

    // With bid requested
    const stackBid = computeValueStack(baseInput, testMarks as any);
    const deThgRowBid = stackBid.rows.find(r => r.regime === 'German THG quota');
    // For CI -100, tCO2ePerMWh is ~0.6984, so 140 * 0.6984 = ~97.776
    expect(deThgRowBid).toBeDefined();
    expect(deThgRowBid?.eurPerMWh).toBeCloseTo(140 * 0.6984, 1);

    // With offer requested
    testMarks.pricingSides.certificateSide = 'offer';
    const stackOffer = computeValueStack(baseInput, testMarks as any);
    const deThgRowOffer = stackOffer.rows.find(r => r.regime === 'German THG quota');
    expect(deThgRowOffer).toBeDefined();
    expect(deThgRowOffer?.eurPerMWh).toBeCloseTo(160 * 0.6984, 1);
  });
});
