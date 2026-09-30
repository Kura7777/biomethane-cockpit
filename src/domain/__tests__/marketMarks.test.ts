import { describe, expect, it } from 'vitest';
import { EUROPEAN_MARKET_BENCHMARKS } from '../markets/marketBenchmarks';

describe('EUA and ETS2 marks', () => {
  const eua = EUROPEAN_MARKET_BENCHMARKS.find(b => b.marketId === 'EU_ETS1')!;
  const ets2 = EUROPEAN_MARKET_BENCHMARKS.find(b => b.marketId === 'EU_ETS2')!;

  it('EUA mark is the sourced September 2026 print and named plainly', () => {
    expect(eua.midPrice).toBe(85.4);
    expect((eua.bidPrice + eua.offerPrice) / 2).toBeCloseTo(eua.midPrice, 6);
    expect(eua.observedAt).toBe('2026-09-08');
    expect(eua.name).toBe('EU ETS1 allowance (EUA)');
    expect(eua.provenanceNote).toContain(`€${(85.4 * 0.20196).toFixed(2)}/MWh`);
  });

  it('EUA copies stay consistent', () => {
    const voluntary = EUROPEAN_MARKET_BENCHMARKS.find(b => b.marketId === 'VOL_EU_ETS')!;
    expect(voluntary.midPrice).toBe(eua.midPrice);
    expect(voluntary.observedAt).toBe(eua.observedAt);
  });

  it('ETS2 mark is labelled a desk estimate, not a market source', () => {
    expect(ets2.provenanceTier).toBe('MODELLED_SIMULATED');
    expect(ets2.sourceName).toMatch(/desk estimate/i);
    expect(ets2.sourceName).not.toMatch(/ICIS|Carbon Pulse ETS2 Forward/);
  });
});
