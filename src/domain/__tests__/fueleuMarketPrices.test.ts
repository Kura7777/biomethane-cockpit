import { describe, it, expect, afterEach } from 'vitest';
import { fuelEuMarketPrices } from '../fueleu/marketPrices';
import { simulateDesk, SIMULATED_SOURCE_NAME } from '../marks/simulate';
import { resetAllAssumptions, setAssumption } from '../assumptions/registry';
import type { MarksState } from '../netback/types';
import type { MarkEntry } from '../markets/types';

afterEach(() => resetAllAssumptions());

const brokerMark = (marketId: string, bid: number, offer: number): MarkEntry => ({
  marketId,
  bid,
  offer,
  mid: (bid + offer) / 2,
  updatedAt: '2026-10-01T00:00:00.000Z',
  source: 'Broker run',
  provenance: {
    sourceType: 'BROKER_INDICATION',
    sourceName: 'Broker run',
    sourceUrl: null,
    observedAt: '2026-10-01T00:00:00.000Z',
    note: null,
  },
});

describe('fuelEuMarketPrices reads the marks store', () => {
  const { marks } = simulateDesk(new Date('2026-10-05T08:00:00Z'));

  it('TTF is the gas index mid, EUA the EU_ETS1 mid, pool offer the FUELEU offer, tagged Simulated on simulated marks', () => {
    const p = fuelEuMarketPrices(marks);
    expect(p.ttfEurPerMwh).toBe(marks.gasIndex.mid);
    expect(p.euaEurPerTco2e).toBe(marks.marks['EU_ETS1'].mid);
    expect(p.pool?.offerEurPerTco2e).toBe(marks.marks['FUELEU'].offer);
    expect(p.ttfSource?.badge.label).toBe('Simulated');
    expect(p.euaSource?.badge.label).toBe('Simulated');
    expect(p.poolSource?.badge.label).toBe('Simulated');
    expect(marks.marks['FUELEU'].source).toBe(SIMULATED_SOURCE_NAME);
  });

  it('the pool bid is the offer less the desk spread, so moving the spread moves the bid', () => {
    const withBroker: MarksState = { ...marks, marks: { ...marks.marks, FUELEU: brokerMark('FUELEU', 104, 116) } };
    const p = fuelEuMarketPrices(withBroker);
    expect(p.pool?.offerEurPerTco2e).toBe(116);
    expect(p.pool?.bidEurPerTco2e).toBe(106); // spread assumption default 10
    expect(p.pool?.spreadEurPerTco2e).toBe(10);
    expect(p.poolSource?.badge.label).toBe('Broker · Broker run');
    expect(p.poolSource?.asOf).toBe('2026-10-01');
    setAssumption('fueleu.poolDeskSpreadEurPerTco2e', 4);
    expect(fuelEuMarketPrices(withBroker).pool?.bidEurPerTco2e).toBe(112);
  });

  it('a missing mark gives null, never a fallback number', () => {
    const empty: MarksState = {
      ...marks,
      marks: {},
      gasIndex: { bid: null, offer: null, mid: null, updatedAt: null, provenance: null },
    };
    const p = fuelEuMarketPrices(empty);
    expect(p.ttfEurPerMwh).toBeNull();
    expect(p.euaEurPerTco2e).toBeNull();
    expect(p.pool).toBeNull();
    expect(p.ttfSource).toBeNull();
    expect(p.euaSource).toBeNull();
    expect(p.poolSource).toBeNull();
  });
});
