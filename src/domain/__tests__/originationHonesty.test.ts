import { describe, it, expect, afterEach } from 'vitest';
import { calculateRealisticCommercialDeskMargin } from '../arbitrage/origins';
import {
  computeOriginationBreakdown,
  fmtEurPerMwh,
  ttfMarkLine,
  type BreakdownOpportunity,
} from '../arbitrage/originationBreakdown';
import { originationRouteStatus } from '../arbitrage/routeStatus';
import { resetAllAssumptions, setAssumption, getAssumption } from '../assumptions/registry';
import { SIMULATED_SOURCE_NAME } from '../marks/simulate';
import type { GasIndexMark, PricingSides } from '../netback/types';

afterEach(() => resetAllAssumptions());

describe('Origination margin allocator has no hidden rules', () => {
  it('DE_THG revenue of 160 is capped only through the visible assumption (default 147)', () => {
    expect(getAssumption('origination.deThgBundleCeilingEurPerMwh')).toBe(147);
    const r = calculateRealisticCommercialDeskMargin('DE_THG', 160, 2.0, 0.9);
    expect(r.effectiveRevenueEurPerMWh).toBe(147);
    expect(r.revenueCeilingApplied).toEqual({ ceilingEurPerMwh: 147, uncappedEurPerMwh: 160 });
    expect(r.deskNetMarginEurPerMWh).toBe(14.5); // (147 - 2) * 0.10
    expect(r.producerProcurementEurPerMWh).toBe(130.5); // (147 - 2) * 0.90
  });

  it('is not capped when the assumption is 0 (off)', () => {
    setAssumption('origination.deThgBundleCeilingEurPerMwh', 0);
    const r = calculateRealisticCommercialDeskMargin('DE_THG', 160, 2.0, 0.9);
    expect(r.revenueCeilingApplied).toBeNull();
    expect(r.effectiveRevenueEurPerMWh).toBe(160);
    expect(r.deskNetMarginEurPerMWh).toBe(15.8); // (160 - 2) * 0.10
    expect(r.producerProcurementEurPerMWh).toBe(142.2);
  });

  it('follows a changed ceiling and never caps other markets', () => {
    setAssumption('origination.deThgBundleCeilingEurPerMwh', 150);
    const capped = calculateRealisticCommercialDeskMargin('DE_THG', 160, 2.0, 0.9);
    expect(capped.revenueCeilingApplied?.ceilingEurPerMwh).toBe(150);
    const other = calculateRealisticCommercialDeskMargin('FR_CPB', 160, 2.0, 0.9);
    expect(other.revenueCeilingApplied).toBeNull();
    expect(other.effectiveRevenueEurPerMWh).toBe(160);
  });

  it('does not cap a netback at or below the ceiling', () => {
    const r = calculateRealisticCommercialDeskMargin('DE_THG', 147, 2.0, 0.9);
    expect(r.revenueCeilingApplied).toBeNull();
  });

  it('uses a producer share below 0.85 exactly as given (no silent reset to 0.970)', () => {
    const r = calculateRealisticCommercialDeskMargin('DE_THG', 100, 2.0, 0.5);
    expect(r.deskNetMarginEurPerMWh).toBe(49); // (100 - 2) * 0.5
    expect(r.producerProcurementEurPerMWh).toBe(49);
    const r2 = calculateRealisticCommercialDeskMargin('DE_THG', 100, 2.0, 0.8);
    expect(r2.deskNetMarginEurPerMWh).toBe(19.6);
  });

  it('desk take comes from the assumptions: spread / divisor, between floor and cap', () => {
    // netback 100, transit 2, plant gate 60 -> green spread 38; 38 / 15 = 2.53
    const base = calculateRealisticCommercialDeskMargin('DE_THG', 100, 2.0, null, 60);
    expect(base.deskNetMarginEurPerMWh).toBe(2.53);
    expect(base.producerProcurementEurPerMWh).toBe(95.47);

    setAssumption('origination.deskTakeDivisor', 10);
    expect(calculateRealisticCommercialDeskMargin('DE_THG', 100, 2.0, null, 60).deskNetMarginEurPerMWh).toBe(3.8);

    setAssumption('origination.deskTakeCapEurPerMwh', 3);
    expect(calculateRealisticCommercialDeskMargin('DE_THG', 100, 2.0, null, 60).deskNetMarginEurPerMWh).toBe(3);

    resetAllAssumptions();
    setAssumption('origination.deskTakeFloorEurPerMwh', 4);
    expect(calculateRealisticCommercialDeskMargin('DE_THG', 100, 2.0, null, 60).deskNetMarginEurPerMWh).toBe(4);
  });

  it('a loss-making plant-gate route shows the loss, not the floor', () => {
    const r = calculateRealisticCommercialDeskMargin('DE_THG', 50, 2.0, null, 60);
    expect(r.producerProcurementEurPerMWh).toBe(60);
    expect(r.deskNetMarginEurPerMWh).toBe(-12);
  });
});

describe('computeOriginationBreakdown reads prices from marks and costs only', () => {
  const sides: PricingSides = { certificateSide: 'bid', moleculeSide: 'bid' };
  const simGas: GasIndexMark = {
    bid: 29.75,
    offer: 30.25,
    mid: 30,
    updatedAt: '2026-10-05T08:00:00.000Z',
    provenance: {
      sourceType: 'ESTIMATE',
      sourceName: SIMULATED_SOURCE_NAME,
      sourceUrl: null,
      observedAt: '2026-10-05T08:00:00.000Z',
      note: null,
    },
  };
  const opp: BreakdownOpportunity = {
    producerPayableEurPerMWh: 100,
    transitCostEurPerMWh: 1.8,
    totalTerminalValueStackEurPerMWh: 110,
    deskNetMarginEurPerMWh: 8.2,
    totalDealProfitEur: 164000,
    revenueCeilingApplied: null,
  };
  const simCosts = {
    certificationCosts: 0.5 as number | null,
    producerPricing: {
      mode: 'INDEX_LINKED' as const,
      fixedPriceEurPerMwh: null,
      indexLinkedShare: 0.97,
      source: SIMULATED_SOURCE_NAME,
      lastVerified: null,
      confidence: 'UNVERIFIED' as const,
    },
  };

  it('splits certificate value from the TTF mark, tagged Simulated with its date', () => {
    const b = computeOriginationBreakdown({
      opportunity: opp,
      volumeMwh: 20000,
      marks: { gasIndex: simGas, pricingSides: sides },
      costs: simCosts,
    });
    expect(b.gasIndexEur).toBe(29.75); // the engine's molecule side (bid), not a typed-in 32.50
    expect(b.certificateValueEur).toBeCloseTo(80.25, 5);
    expect(b.gasIndexSource?.badge.label).toBe('Simulated');
    expect(b.gasIndexSource?.asOf).toBe('2026-10-05');
    expect(b.certificationEur).toBe(0.5);
    expect(b.certificationSource?.badge.label).toBe('Simulated');
    expect(b.totalDeliveredCostEur).toBeCloseTo(102.3, 5);
    expect(b.deliveredCostExclCertification).toBe(false);
    expect(ttfMarkLine(b)).toBe('TTF mark as of 2026-10-05 (Simulated)');
  });

  it('follows the molecule side the engine used', () => {
    const b = computeOriginationBreakdown({
      opportunity: opp,
      volumeMwh: 20000,
      marks: { gasIndex: simGas, pricingSides: { certificateSide: 'bid', moleculeSide: 'mid' } },
      costs: simCosts,
    });
    expect(b.gasIndexEur).toBe(30);
  });

  it('with no gas index mark: no TTF, no certificate split, and never 32.50', () => {
    const cleared: GasIndexMark = { bid: null, offer: null, mid: null, updatedAt: null, provenance: null };
    const b = computeOriginationBreakdown({
      opportunity: opp,
      volumeMwh: 20000,
      marks: { gasIndex: cleared, pricingSides: sides },
      costs: simCosts,
    });
    expect(b.gasIndexEur).toBeNull();
    expect(b.gasIndexSource).toBeNull();
    expect(b.certificateValueEur).toBeNull();
    expect(fmtEurPerMwh(b.gasIndexEur)).toBe('—');
    expect(fmtEurPerMwh(b.certificateValueEur)).toBe('—');
    expect(ttfMarkLine(b)).toBe('No TTF mark loaded');
    // The deal margin does not depend on a typed-in TTF
    expect(b.netMarginEurPerMwh).toBe(8.2);
  });

  it('with certification not set: left out of delivered cost and labelled excl. certification', () => {
    const b = computeOriginationBreakdown({
      opportunity: opp,
      volumeMwh: 20000,
      marks: { gasIndex: simGas, pricingSides: sides },
      costs: { ...simCosts, certificationCosts: null },
    });
    expect(b.certificationEur).toBeNull();
    expect(b.certificationSource).toBeNull();
    expect(b.totalDeliveredCostEur).toBeCloseTo(101.8, 5);
    expect(b.deliveredCostExclCertification).toBe(true);
  });

  it('uses the capped revenue when a ceiling bound, so the stack reconciles with the margin split', () => {
    const b = computeOriginationBreakdown({
      opportunity: {
        ...opp,
        totalTerminalValueStackEurPerMWh: 160,
        revenueCeilingApplied: { ceilingEurPerMwh: 147, uncappedEurPerMwh: 160 },
      },
      volumeMwh: 20000,
      marks: { gasIndex: simGas, pricingSides: sides },
      costs: simCosts,
    });
    expect(b.grossRevenueEur).toBe(147);
    expect(b.revenueCeilingApplied?.uncappedEurPerMwh).toBe(160);
    expect(b.certificateValueEur).toBeCloseTo(147 - 29.75, 5);
  });

  it('tags a non-simulated cost bundle as Manual and a broker TTF as Broker', () => {
    const b = computeOriginationBreakdown({
      opportunity: opp,
      volumeMwh: 1000,
      marks: {
        gasIndex: {
          ...simGas,
          provenance: { sourceType: 'BROKER_INDICATION', sourceName: 'ICE', sourceUrl: null, observedAt: '2026-10-01T00:00:00Z', note: null },
        },
        pricingSides: sides,
      },
      costs: { ...simCosts, producerPricing: null },
    });
    expect(b.certificationSource?.badge.label).toBe('Manual');
    expect(b.gasIndexSource?.badge.label).toBe('Broker · ICE');
    expect(b.gasIndexSource?.asOf).toBe('2026-10-01');
    expect(b.marginSplit).toBe('DESK_POLICY');
  });
});

describe('originationRouteStatus', () => {
  it('only ELIGIBLE is tradeable; CONDITIONAL and UNRESOLVED need review', () => {
    expect(originationRouteStatus('ELIGIBLE')).toBe('TRADEABLE');
    expect(originationRouteStatus('CONDITIONAL')).toBe('REVIEW');
    expect(originationRouteStatus('UNRESOLVED')).toBe('REVIEW');
    expect(originationRouteStatus('HARD_BLOCK')).toBe('BLOCKED');
    expect(originationRouteStatus('UNKNOWN')).toBe('BLOCKED');
  });
});
