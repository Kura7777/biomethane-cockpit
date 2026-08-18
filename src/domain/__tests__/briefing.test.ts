import { describe, it, expect } from 'vitest';
import { simulateDesk } from '../marks/simulate';
import {
  generateMorningBriefing,
  synthesizeOvernightMovers,
  evaluateMarkStaleness,
  calculatePriceMovement,
  formatStructuredDealUrl,
  DEFAULT_PRIOR_CLOSE_MARKS,
} from '../briefing';
import { MarksState, CostInputs } from '../netback/types';
import { MARKETS } from '../markets/registry';

describe('Briefing Domain — calculatePriceMovement', () => {
  it('correctly calculates positive price movement', () => {
    const res = calculatePriceMovement(30.5, 28.0);
    expect(res.direction).toBe('UP');
    expect(res.absoluteDelta).toBe(2.5);
    expect(res.percentageDelta).toBe(8.93);
  });

  it('correctly calculates negative price movement', () => {
    const res = calculatePriceMovement(320.0, 340.0);
    expect(res.direction).toBe('DOWN');
    expect(res.absoluteDelta).toBe(-20.0);
    expect(res.percentageDelta).toBe(-5.88);
  });

  it('correctly calculates unchanged movement', () => {
    const res = calculatePriceMovement(100.0, 100.0);
    expect(res.direction).toBe('UNCHANGED');
    expect(res.absoluteDelta).toBe(0);
    expect(res.percentageDelta).toBe(0);
  });

  it('handles null values gracefully', () => {
    const res1 = calculatePriceMovement(null, 28.0);
    expect(res1.direction).toBe('NO_DATA');
    expect(res1.absoluteDelta).toBeNull();
    expect(res1.percentageDelta).toBeNull();

    const res2 = calculatePriceMovement(30.0, null);
    expect(res2.direction).toBe('NO_DATA');
    expect(res2.absoluteDelta).toBeNull();
    expect(res2.percentageDelta).toBeNull();
  });
});

describe('Briefing Domain — formatStructuredDealUrl', () => {
  it('serializes deal parameters into clean URL query string', () => {
    const url = formatStructuredDealUrl({
      originCountry: 'DK',
      feedstock: 'manure',
      ci: -100,
      marketId: 'DE_THG',
      volume: 120000,
      scheme: 'ISCC_EU',
      coc: 'MASS_BALANCE',
      counterparty: 'Shell Energy Europe',
      deliveryPeriod: 'Cal-2026',
    });

    expect(url.startsWith('/trade?')).toBe(true);
    const queryString = url.replace('/trade?', '');
    const params = new URLSearchParams(queryString);

    expect(params.get('originCountry')).toBe('DK');
    expect(params.get('feedstock')).toBe('manure');
    expect(params.get('ci')).toBe('-100');
    expect(params.get('marketId')).toBe('DE_THG');
    expect(params.get('volume')).toBe('120000');
    expect(params.get('scheme')).toBe('ISCC_EU');
    expect(params.get('coc')).toBe('MASS_BALANCE');
    expect(params.get('counterparty')).toBe('Shell Energy Europe');
    expect(params.get('deliveryPeriod')).toBe('Cal-2026');
  });
});

describe('Briefing Domain — synthesizeOvernightMovers', () => {
  it('synthesizes key European biomethane instruments and FX rates', () => {
    const simulated = simulateDesk(new Date('2026-08-18T00:00:00Z'));
    const movers = synthesizeOvernightMovers(simulated.marks);

    expect(movers.length).toBeGreaterThanOrEqual(7);

    const ids = movers.map(m => m.instrumentId);
    expect(ids).toContain('TTF_GAS');
    expect(ids).toContain('DE_THG');
    expect(ids).toContain('NL_ERE');
    expect(ids).toContain('FR_CPB');
    expect(ids).toContain('IT_CIC');
    expect(ids).toContain('UK_RTFO');
    expect(ids).toContain('FX_GBP_EUR');

    const ttf = movers.find(m => m.instrumentId === 'TTF_GAS')!;
    expect(ttf.unitOfAccount).toBe('EUR/MWh');
    expect(typeof ttf.previousPrice).toBe('number');
    expect(ttf.previousPrice).toBe(DEFAULT_PRIOR_CLOSE_MARKS.gasIndexMid);
  });

  it('accurately computes deltas when explicit previousMarks is provided', () => {
    const current: MarksState = {
      marks: {
        DE_THG: {
          marketId: 'DE_THG',
          bid: 350,
          offer: 360,
          mid: 355,
          updatedAt: '2026-08-18T00:00:00Z',
          source: 'TEST',
          provenance: { sourceType: 'PRICE_REPORTING', sourceName: 'Argus', sourceUrl: null, observedAt: '2026-08-18T00:00:00Z', note: null },
        },
      },
      gasIndex: {
        bid: 30,
        offer: 31,
        mid: 30.5,
        updatedAt: '2026-08-18T00:00:00Z',
        provenance: { sourceType: 'EXCHANGE_AUCTION', sourceName: 'EEX', sourceUrl: null, observedAt: '2026-08-18T00:00:00Z', note: null },
      },
      fx: {
        gbpEur: 1.20,
        chfEur: 1.05,
        updatedAt: '2026-08-18T00:00:00Z',
      },
      pricingSides: { certificateSide: 'bid', moleculeSide: 'bid' },
    };

    const previous: MarksState = {
      marks: {
        DE_THG: {
          marketId: 'DE_THG',
          bid: 330,
          offer: 340,
          mid: 335,
          updatedAt: '2026-08-17T00:00:00Z',
          source: 'TEST',
        },
      },
      gasIndex: {
        bid: 32,
        offer: 33,
        mid: 32.5,
        updatedAt: '2026-08-17T00:00:00Z',
      },
      fx: {
        gbpEur: 1.18,
        chfEur: 1.05,
        updatedAt: '2026-08-17T00:00:00Z',
      },
      pricingSides: { certificateSide: 'bid', moleculeSide: 'bid' },
    };

    const movers = synthesizeOvernightMovers(current, previous);

    const deThg = movers.find(m => m.instrumentId === 'DE_THG')!;
    expect(deThg.currentPrice).toBe(355);
    expect(deThg.previousPrice).toBe(335);
    expect(deThg.absoluteDelta).toBe(20);
    expect(deThg.percentageDelta).toBe(5.97);
    expect(deThg.direction).toBe('UP');

    const ttf = movers.find(m => m.instrumentId === 'TTF_GAS')!;
    expect(ttf.currentPrice).toBe(30.5);
    expect(ttf.previousPrice).toBe(32.5);
    expect(ttf.absoluteDelta).toBe(-2.0);
    expect(ttf.percentageDelta).toBe(-6.15);
    expect(ttf.direction).toBe('DOWN');

    const fx = movers.find(m => m.instrumentId === 'FX_GBP_EUR')!;
    expect(fx.currentPrice).toBe(1.2);
    expect(fx.previousPrice).toBe(1.18);
    expect(fx.absoluteDelta).toBe(0.02);
    expect(fx.direction).toBe('UP');
  });
});

describe('Briefing Domain — evaluateMarkStaleness', () => {
  it('correctly categorizes marks into fresh, warning, critical, and unfilled', () => {
    const now = new Date('2026-08-18T00:00:00Z');
    const dayMs = 86400000;

    const testMarks: MarksState = {
      marks: {
        DE_THG: {
          marketId: 'DE_THG',
          bid: 350,
          offer: 360,
          mid: 355,
          updatedAt: new Date(now.getTime() - 2 * dayMs).toISOString(), // 2 days old -> FRESH
          source: 'TEST',
        },
        NL_ERE: {
          marketId: 'NL_ERE',
          bid: 0.35,
          offer: 0.37,
          mid: 0.36,
          updatedAt: new Date(now.getTime() - 10 * dayMs).toISOString(), // 10 days old -> STALE_WARNING
          source: 'TEST',
        },
        FR_CPB: {
          marketId: 'FR_CPB',
          bid: 85,
          offer: 90,
          mid: 87.5,
          updatedAt: new Date(now.getTime() - 35 * dayMs).toISOString(), // 35 days old -> STALE_CRITICAL
          source: 'TEST',
        },
        IT_CIC: {
          marketId: 'IT_CIC',
          bid: null,
          offer: null,
          mid: null,
          updatedAt: null, // UNFILLED
          source: null,
        },
      },
      gasIndex: { bid: 30, offer: 31, mid: 30.5, updatedAt: now.toISOString() },
      fx: { gbpEur: 1.18, chfEur: 1.06, updatedAt: now.toISOString() },
      pricingSides: { certificateSide: 'bid', moleculeSide: 'bid' },
    };

    const summary = evaluateMarkStaleness(testMarks);
    expect(summary.freshCount).toBeGreaterThanOrEqual(1);
    expect(summary.warningCount).toBeGreaterThanOrEqual(1);
    expect(summary.criticalCount).toBeGreaterThanOrEqual(1);
    expect(summary.unfilledCount).toBeGreaterThanOrEqual(1);

    const deAlert = summary.alerts.find(a => a.marketId === 'DE_THG')!;
    expect(deAlert.stalenessStatus).toBe('FRESH');

    const nlAlert = summary.alerts.find(a => a.marketId === 'NL_ERE')!;
    expect(nlAlert.stalenessStatus).toBe('STALE_WARNING');

    const frAlert = summary.alerts.find(a => a.marketId === 'FR_CPB')!;
    expect(frAlert.stalenessStatus).toBe('STALE_CRITICAL');

    const itAlert = summary.alerts.find(a => a.marketId === 'IT_CIC')!;
    expect(itAlert.stalenessStatus).toBe('UNFILLED');
  });
});

describe('Briefing Domain — generateMorningBriefing', () => {
  it('generates a full morning briefing summary with top arbitrage corridors and remedies', () => {
    const desk = simulateDesk(new Date('2026-08-18T00:00:00Z'));
    const summary = generateMorningBriefing({
      currentMarks: desk.marks,
      costs: desk.costs,
      selectedFeedstockKey: 'manure',
      ciOverride: -100,
      defaultDealVolumeMWh: 120000,
    });

    expect(summary.generatedAt).toBeDefined();
    expect(summary.macroHeadline).toContain('European Biomethane Desk');
    expect(summary.overnightMovers.length).toBeGreaterThanOrEqual(7);
    expect(summary.regulatoryUpdates.length).toBeGreaterThanOrEqual(4);
    expect(summary.topArbitrageCorridors.length).toBeGreaterThan(0);
    expect(summary.topArbitrageCorridors.length).toBeLessThanOrEqual(3);

    // Verify top corridor integrity
    const topCorridor = summary.topArbitrageCorridors[0];
    expect(topCorridor.corridorRank).toBe(1);
    expect(topCorridor.deskMarginEurPerMWh).toBeGreaterThan(0);
    expect(topCorridor.annualVolumeMWh).toBe(120000);
    expect(topCorridor.projectedDeskPnLEur).toBeGreaterThan(0);
    expect(topCorridor.structuredDealUrl).toContain('/trade?');
    expect(topCorridor.structuredDealUrl).toContain('originCountry=');
    expect(topCorridor.structuredDealUrl).toContain('marketId=');

    // Verify desk remedies
    expect(summary.topRemedies.length).toBeGreaterThan(0);
    expect(summary.topRemedies[0].priority).toBe('HIGH');
    expect(summary.topRemedies[0].actionLabel).toBeDefined();
    expect(summary.topRemedies[0].targetRoute).toBeDefined();
  });
});
