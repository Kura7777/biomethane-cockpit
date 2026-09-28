import { describe, it, expect } from 'vitest';
import {
  evaluatePlantCommercialStrategies,
  strategyOptionsFromMarks,
  plantAsConsignment,
} from '../valuation/strategyEngine';
import { computeCertificateValue } from '../netback/engine';
import { getMarketById } from '../markets/registry';
import { MarksState } from '../netback/types';
import { BiomethanePlant } from '../plants/types';

const mark = (marketId: string, mid: number) => ({
  marketId, bid: mid, offer: mid, mid, updatedAt: '2026-09-28T00:00:00Z', source: 'test',
});

const marks: MarksState = {
  marks: {
    DE_THG: mark('DE_THG', 285),
    NL_ERE: mark('NL_ERE', 0.34),        // €/kgCO₂e
    UK_RTFO: mark('UK_RTFO', 0.215),     // £/RTFC
    EU_ETS1: mark('EU_ETS1', 72.5),      // €/tCO₂
    DE_GO: mark('DE_GO', 22),
  },
  gasIndex: { bid: 30, offer: 30, mid: 30, updatedAt: '2026-09-28T00:00:00Z' },
  fx: { gbpEur: 1.17, chfEur: 1.06, updatedAt: '2026-09-28T00:00:00Z' },
  pricingSides: { certificateSide: 'mid', moleculeSide: 'mid' },
};

const nlManure: BiomethanePlant = {
  id: 'nl-test', name: 'NL manure test', country: 'Netherlands', countryCode: 'NL', countryFlag: '🇳🇱',
  provenance: 'test', annualEnergyGWh: 45, primaryFeedstockCategory: 'Manure & Slurry',
  feedstockDetails: 'Swine manure', verifiedCarbonIntensity: -60,
};

describe('strategy engine — desk marks in the right units', () => {
  it('converts the NL ERE mark from €/kgCO₂e to €/MWh through the pricing authority', () => {
    const opts = strategyOptionsFromMarks(nlManure, marks);
    const expected = computeCertificateValue(getMarketById('NL_ERE')!, plantAsConsignment(nlManure), marks, 'mid')!.valueEurPerMWh;
    expect(opts.dutchHbeAEurMwh).toBeCloseTo(expected as number, 6);
    // €/MWh, not the raw 0.34 €/kg mark
    expect(opts.dutchHbeAEurMwh as number).toBeGreaterThan(10);
  });

  it('converts the UK RTFO mark from £/RTFC to €/MWh with FX', () => {
    const opts = strategyOptionsFromMarks(nlManure, marks);
    expect(opts.ukRtfoCertValueEurMwh as number).toBeGreaterThan(10);
  });

  it('reads the EUA from the EU_ETS1 mark', () => {
    expect(strategyOptionsFromMarks(nlManure, marks).euEtsEuaEurPerTonne).toBe(72.5);
  });

  it('keeps a missing mark missing', () => {
    const noFx: MarksState = { ...marks, fx: { gbpEur: null, chfEur: null, updatedAt: null } };
    expect(strategyOptionsFromMarks(nlManure, noFx).ukRtfoCertValueEurMwh).toBeNull();
  });
});

describe('strategy engine — no fabricated P&L', () => {
  it('reports a loss-making strategy as a loss, and pitches nothing when every route loses', () => {
    const crops: BiomethanePlant = {
      id: 'de-crops', name: 'Crops test', country: 'Germany', countryCode: 'DE', countryFlag: '🇩🇪',
      provenance: 'test', annualEnergyGWh: 50, primaryFeedstockCategory: 'Energy crops',
      feedstockDetails: 'Maize silage', verifiedCarbonIntensity: 42,
    };
    // A GO premium below the structuring fee makes the only eligible route lose money.
    const res = evaluatePlantCommercialStrategies(crops, {
      ttfDayAheadEurMwh: 30, euEtsEuaEurPerTonne: 10, voluntaryGoPremiumEurMwh: 0.5, monthlyStructuringFeeEur: 10000,
    });
    const go = res.evaluations.find(e => e.strategyId === 'SUPPORTED_VOLUNTARY_GO')!;
    expect(go.annualDeskPnLEur).toBeLessThan(0);
    const ets = res.evaluations.find(e => e.strategyId === 'EU_ETS_INDUSTRIAL')!;
    expect(ets.annualDeskPnLEur).toBeLessThanOrEqual(0);
    expect(res.hasProfitableStrategy).toBe(false);
    expect(res.commercialPitchSummary.pitchScript).toMatch(/No offer/);
  });

  it('still finds a profitable route for deep-negative manure at realistic marks', () => {
    const res = evaluatePlantCommercialStrategies(nlManure, strategyOptionsFromMarks(nlManure, marks));
    expect(res.hasProfitableStrategy).toBe(true);
    expect(res.winningStrategy.annualDeskPnLEur).toBeGreaterThan(0);
  });
});
