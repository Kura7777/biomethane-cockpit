import { describe, it, expect, afterEach } from 'vitest';
import { calculateRealisticCommercialDeskMargin } from '../arbitrage/origins';
import {
  computeOriginationBreakdown,
  fmtEurPerMwh,
  ttfMarkLine,
  type BreakdownOpportunity,
} from '../arbitrage/originationBreakdown';
import { originationRouteStatus } from '../arbitrage/routeStatus';
import { resetAllAssumptions, ASSUMPTION_DEFINITIONS } from '../assumptions/registry';
import { SIMULATED_SOURCE_NAME } from '../marks/simulate';
import type { GasIndexMark, PricingSides } from '../netback/types';

afterEach(() => resetAllAssumptions());

describe('Origination margin allocator has no hidden rules', () => {
  it('the allocator takes the netback as given: no hidden DE THG ceiling', () => {
    const r = calculateRealisticCommercialDeskMargin('DE_THG', 160, 2.0, 0.9);
    expect(r.deskNetMarginEurPerMWh).toBe(16.0); // (160 - 144), transit not double deducted
    expect(r.producerProcurementEurPerMWh).toBe(144.0);
    expect(ASSUMPTION_DEFINITIONS.some(d => d.key === 'origination.deThgBundleCeilingEurPerMwh')).toBe(false);
  });

  it('uses a producer share below 0.85 exactly as given (no silent reset to 0.970)', () => {
    const r = calculateRealisticCommercialDeskMargin('DE_THG', 100, 2.0, 0.5);
    expect(r.deskNetMarginEurPerMWh).toBe(50); // 100 * 0.5
    expect(r.producerProcurementEurPerMWh).toBe(50);
    const r2 = calculateRealisticCommercialDeskMargin('DE_THG', 100, 2.0, 0.8);
    expect(r2.deskNetMarginEurPerMWh).toBe(20);
    expect(r2.producerProcurementEurPerMWh).toBe(80);
  });

  it('returns null when no producer share is set (origination.deskTake* assumptions removed)', () => {
    const base = calculateRealisticCommercialDeskMargin('DE_THG', 100, 2.0, null, 60);
    expect(base.deskNetMarginEurPerMWh).toBeNull();
    expect(base.producerProcurementEurPerMWh).toBeNull();
    expect(ASSUMPTION_DEFINITIONS.some(d => d.key.startsWith('origination.deskTake'))).toBe(false);
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
  };
  const simCosts = {
    certificationCosts: 0.5 as number | null,
    transferCosts: 1.2 as number | null,
    otherCosts: null as number | null,
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
    expect(b.transferEur).toBe(1.2);
    expect(b.transferSource?.badge.label).toBe('Simulated');
    // plantGate 100 + transit 1.8 + transfer 1.2 + certification 0.5
    expect(b.totalDeliveredCostEur).toBeCloseTo(103.5, 5);
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
    // plantGate 100 + transit 1.8 + transfer 1.2, certification excluded
    expect(b.totalDeliveredCostEur).toBeCloseTo(103.0, 5);
    expect(b.deliveredCostExclCertification).toBe(true);
  });

  it('with a broker bundle: certificate is the broker price, TTF is its own line on top, revenue is the sum', () => {
    const b = computeOriginationBreakdown({
      opportunity: {
        ...opp,
        totalTerminalValueStackEurPerMWh: 174.55,
        netbackCappedAt: 174.55,
        theoreticalNetbackEurPerMWh: 223.1,
        bundleReference: {
          kind: 'BROKER_CERTIFICATE',
          valueEurPerMwh: 147,
          year: 2026,
          provenance: { sourceType: 'BROKER_INDICATION', sourceName: 'Broker run', sourceUrl: null, observedAt: '2026-08-18', note: null },
        },
      },
      volumeMwh: 20000,
      marks: { gasIndex: simGas, pricingSides: sides },
      costs: simCosts,
    });
    expect(b.brokerBundle?.certificateEurPerMwh).toBe(147);
    expect(b.brokerBundle?.source.badge.label).toBe('Broker \u00b7 Broker run');
    expect(b.brokerBundle?.source.asOf).toBe('2026-08-18');
    expect(b.certificateValueEur).toBe(147);
    expect(b.gasIndexEur).toBe(29.75);
    expect(b.grossRevenueEur).toBeCloseTo(176.75, 5); // certificate + TTF, not 147 - TTF
    expect(b.gasIndexSource?.badge.label).toBe('Simulated');
    expect(b.netbackCapped).toBeNull();
  });

  it('an unsourced desk all-in ceiling is reported as held, not as a broker bundle', () => {
    const b = computeOriginationBreakdown({
      opportunity: {
        ...opp,
        totalTerminalValueStackEurPerMWh: 120,
        netbackCappedAt: 120,
        theoreticalNetbackEurPerMWh: 150,
        bundleReference: { kind: 'DESK_ESTIMATE_ALL_IN', valueEurPerMwh: 120, year: null, provenance: null },
      },
      volumeMwh: 1000,
      marks: { gasIndex: simGas, pricingSides: sides },
      costs: simCosts,
    });
    expect(b.brokerBundle).toBeNull();
    expect(b.netbackCapped).toEqual({ capEurPerMwh: 120, theoreticalEurPerMwh: 150, kind: 'DESK_ESTIMATE_ALL_IN' });
    expect(b.grossRevenueEur).toBe(120);
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
