import { describe, it, expect } from 'vitest';
import {
  FUELEU_POOL_INDEX_HISTORY,
  latestTradeVwap,
  latestOfferIndex,
  markDivergencePct,
} from '../fueleuPoolIndexHistory';

describe('FuelEU pool index history — two independent sources', () => {
  it('pins the latest BetterSea executed-trade VWAP to €108.89 (Aug 2026)', () => {
    const latest = latestTradeVwap();
    expect(latest?.period).toBe('2026-08');
    expect(latest?.vwap).toBe(108.89);
    expect(latest?.source).toBe('BETTERSEA_INDEX');
    expect(latest?.basis).toBe('TRADE');
  });

  it('pins the latest OceanScore OPX offer index to €108.60 (2026-09-16)', () => {
    const latest = latestOfferIndex();
    expect(latest?.period).toBe('2026-09-16');
    expect(latest?.offerIndex).toBe(108.60);
    expect(latest?.source).toBe('OCEANSCORE_OPX');
    expect(latest?.basis).toBe('OFFER');
  });

  it('computes the desk mark divergence from the latest BetterSea VWAP as -0.27% at €108.60', () => {
    const pct = markDivergencePct(108.60);
    expect(pct).not.toBeNull();
    expect(Number((pct! * 100).toFixed(2))).toBe(-0.27);
  });

  it('leaves June 2026 absent from the OceanScore series rather than interpolating', () => {
    const juneOceanScore = FUELEU_POOL_INDEX_HISTORY.find(r => r.source === 'OCEANSCORE_OPX' && r.period.startsWith('2026-06'));
    expect(juneOceanScore).toBeUndefined();
  });

  it('every row carries a source URL', () => {
    expect(FUELEU_POOL_INDEX_HISTORY.every(r => typeof r.url === 'string' && r.url.startsWith('http'))).toBe(true);
  });
});
