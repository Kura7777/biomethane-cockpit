import { describe, it, expect } from 'vitest';
import { scanEuropeanArbitrage, DEFAULT_WHAT_IF_SCENARIO } from '../arbitrage/engine';
import { computeNetback } from '../netback/engine';
import { getMarketById } from '../markets/registry';
import { REFERENCE_CONSIGNMENTS } from '../consignment/feedstocks';
import { MarksState, CostInputs } from '../netback/types';

describe('Regulatory What-If Scenario: French CPB Penalty Cap (frCpbPenaltyCap)', () => {
  const marksWithHighFrCpb: MarksState = {
    marks: {
      FR_CPB: { marketId: 'FR_CPB', mid: 110.0, bid: 105.0, offer: 115.0, updatedAt: null, source: null },
      DE_THG: { marketId: 'DE_THG', mid: 285.0, bid: 280.0, offer: 290.0, updatedAt: null, source: null },
    },
    gasIndex: { mid: 30.0, bid: 29.5, offer: 30.5, updatedAt: null },
    fx: { gbpEur: 1.17, chfEur: 1.05, updatedAt: null },
    pricingSides: { certificateSide: 'mid', moleculeSide: 'mid' },
  };

  const zeroCosts: CostInputs = {
    transferCosts: 0,
    certificationCosts: 0,
    logistics: 0,
    otherCosts: 0,
  };

  it('caps FR_CPB certificate value at custom frCpbPenaltyCap = 80 when market mark is 110', () => {
    const frMarket = getMarketById('FR_CPB')!;
    const consignment = REFERENCE_CONSIGNMENTS.DANISH_MANURE;

    const netbackRes = computeNetback(
      frMarket,
      consignment,
      marksWithHighFrCpb,
      zeroCosts,
      'mid',
      undefined,
      80
    );

    expect(netbackRes.certificateValue?.valueEurPerMWh).toBe(80.0);
    expect(netbackRes.certificateValue?.capped).toBe(true);
    expect(netbackRes.netNetback).toBe(110.0); // 80 cert + 30 mol - 0 costs
  });

  it('allows FR_CPB certificate value up to custom frCpbPenaltyCap = 120 when market mark is 110', () => {
    const frMarket = getMarketById('FR_CPB')!;
    const consignment = REFERENCE_CONSIGNMENTS.DANISH_MANURE;

    const netbackRes = computeNetback(
      frMarket,
      consignment,
      marksWithHighFrCpb,
      zeroCosts,
      'mid',
      undefined,
      120
    );

    expect(netbackRes.certificateValue?.valueEurPerMWh).toBe(110.0);
    expect(netbackRes.certificateValue?.capped).toBeFalsy();
    expect(netbackRes.netNetback).toBe(140.0); // 110 cert + 30 mol - 0 costs
  });

  it('wires scenario.frCpbPenaltyCap through scanEuropeanArbitrage', () => {
    const result80 = scanEuropeanArbitrage(
      marksWithHighFrCpb,
      zeroCosts,
      'manure',
      undefined,
      'ISCC_EU',
      'MASS_BALANCE',
      { ...DEFAULT_WHAT_IF_SCENARIO, frCpbPenaltyCap: 80 },
      10000
    );

    const frOpps80 = result80.allOpportunities.filter(o => o.targetMarketId === 'FR_CPB');
    expect(frOpps80.length).toBeGreaterThan(0);
    for (const opp of frOpps80) {
      if (opp.totalTerminalValueStackEurPerMWh !== null) {
        expect(opp.totalTerminalValueStackEurPerMWh).toBeLessThanOrEqual(110.0);
      }
    }

    const result120 = scanEuropeanArbitrage(
      marksWithHighFrCpb,
      zeroCosts,
      'manure',
      undefined,
      'ISCC_EU',
      'MASS_BALANCE',
      { ...DEFAULT_WHAT_IF_SCENARIO, frCpbPenaltyCap: 120 },
      10000
    );

    const frOpps120 = result120.allOpportunities.filter(o => o.targetMarketId === 'FR_CPB');
    expect(frOpps120.length).toBeGreaterThan(0);
    for (const opp of frOpps120) {
      if (opp.totalTerminalValueStackEurPerMWh !== null) {
        // With mark at 110 and cap at 120, cert value should be 110 + 30 mol = 140
        expect(opp.totalTerminalValueStackEurPerMWh).toBe(140.0);
      }
    }
  });
});
