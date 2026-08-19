import { describe, it, expect } from 'vitest';
import { AppState } from '../../store/context';
import { MARKETS } from '../markets/registry';
import { computeAllNetbacks, computeNetback } from '../netback/engine';
import { evaluateEligibility } from '../eligibility/engine';
import { searchSourcingRoutes } from '../arbitrage/sourcingAdapter';
import { calculateDualLegOfftake, DEFAULT_INSTITUTIONAL_OFFTAKE } from '../offtake/engine';
import { evaluateCommercialGates } from '../offtake/commercialGates';
import { Consignment } from '../consignment/types';
import { MarkEntry } from '../markets/types';
import { REFERENCE_CONSIGNMENTS } from '../consignment/feedstocks';

export function createEmptyDeskState(): AppState {
  const emptyMarksRecord: Record<string, MarkEntry> = {};
  MARKETS.filter(m => m.status === 'ACTIVE').forEach(m => {
    emptyMarksRecord[m.id] = {
      marketId: m.id,
      bid: null,
      offer: null,
      mid: null,
      updatedAt: null,
      source: null,
      provenance: {
        sourceType: null,
        sourceName: null,
        sourceUrl: null,
        observedAt: null,
        note: null,
      },
    };
  });

  return {
    schemaVersion: 8,
    marks: {
      marks: emptyMarksRecord,
      gasIndex: {
        bid: null,
        offer: null,
        mid: null,
        updatedAt: null,
        provenance: {
          sourceType: null,
          sourceName: null,
          sourceUrl: null,
          observedAt: null,
          note: null,
        },
      },
      fx: {
        gbpEur: null,
        chfEur: null,
        updatedAt: null,
        provenance: {
          sourceType: null,
          sourceName: null,
          sourceUrl: null,
          observedAt: null,
          note: null,
        },
      },
      pricingSides: {
        certificateSide: 'bid',
        moleculeSide: 'bid',
      },
    },
    consignments: [],
    activeConsignmentId: null,
    costs: {
      transferCosts: null,
      certificationCosts: null,
      logistics: null,
      otherCosts: null,
      producerPricing: null,
    },
    savedAssessments: [],
    selectedMarketId: null,
  };
}

describe('PHASE 1 — EMPTY-DESK DOMAIN & CALCULATION AUDIT', () => {
  const emptyState = createEmptyDeskState();
  const activeMarkets = MARKETS.filter(m => m.status === 'ACTIVE');

  it('1. Netback Engine on Empty Desk: returns unpriced for all markets without throwing or NaN', () => {
    const dummyConsignment: Consignment = {
      ...REFERENCE_CONSIGNMENTS.DANISH_MANURE,
      carbonIntensity: -50,
      volumeMWh: 10000,
      deliveryPeriod: {
        type: 'CALENDAR',
        startDate: '2026-01-01',
        endDate: '2026-12-31',
        complianceYear: 2026,
      },
    };

    const netbackResults = computeAllNetbacks(
      dummyConsignment,
      activeMarkets,
      emptyState.marks,
      emptyState.costs,
      undefined,
      emptyState.marks.pricingSides
    );

    expect(netbackResults.length).toBe(activeMarkets.length);

    netbackResults.forEach(res => {
      // FuelEU is modelled when no broker mark is entered; all other markets are strictly null
      if (res.marketId === 'FUELEU') {
        expect(res.certificateValue?.isModelled).toBe(true);
      } else {
        expect(res.certificateValue, `Market ${res.marketId} cert value must be null`).toBeNull();
        expect(res.netNetback, `Market ${res.marketId} netNetback must be null`).toBeNull();
      }
      expect(res.producerPayable, `Market ${res.marketId} producerPayable must be null`).toBeNull();
      expect(res.deskMargin, `Market ${res.marketId} deskMargin must be null`).toBeNull();
      expect(res.deskPnL, `Market ${res.marketId} deskPnL must be null`).toBeNull();
      expect(res.missingInputs).toContain('gasIndex (TTF)');
    });
  });

  it('2. Sourcing Adapter on Empty Desk: evaluates all markets cleanly without throwing or NaN', () => {
    const sourcingRes = searchSourcingRoutes(
      {
        targetMarketId: 'ANY',
        feedstockKey: 'manure',
        scheme: 'ISCC_EU',
        chainOfCustody: 'MASS_BALANCE',
        volumeMwh: 10000,
        delivery: {
          type: 'CALENDAR',
          startDate: '2026-01-01',
          endDate: '2026-12-31',
          complianceYear: 2026,
        },
        counterparty: null,
        notes: '',
        constraints: {
          physicalDeliveryRequired: false,
          maxCarbonIntensity: -50,
          maxDeliveredCostEurMwh: null,
        },
      },
      emptyState.marks,
      emptyState.costs
    );

    expect(sourcingRes.evaluated).toBeGreaterThan(0);
    expect(sourcingRes.unpriced).toBeGreaterThan(0);

    const allRoutes = [...sourcingRes.tradeable, ...sourcingRes.blocked];
    allRoutes.forEach(route => {
      if (route.totalTerminalValueStackEurPerMWh !== null) {
        expect(isNaN(route.totalTerminalValueStackEurPerMWh as number)).toBe(false);
      }
      if (route.deskNetMarginEurPerMWh !== null) {
        expect(isNaN(route.deskNetMarginEurPerMWh as number)).toBe(false);
      }
    });
  });

  it('3. Sourcing Adapter with undefined constraints: safely handles missing constraints without throwing', () => {
    const sourcingRes = searchSourcingRoutes(
      {
        targetMarketId: 'ANY',
        feedstockKey: 'manure',
        scheme: 'ISCC_EU',
        chainOfCustody: 'MASS_BALANCE',
        volumeMwh: 10000,
        delivery: {
          type: 'CALENDAR',
          startDate: '2026-01-01',
          endDate: '2026-12-31',
          complianceYear: 2026,
        },
        counterparty: null,
        notes: '',
        constraints: undefined as any,
      },
      emptyState.marks,
      emptyState.costs
    );

    expect(sourcingRes.evaluated).toBeGreaterThan(0);
    expect(sourcingRes.unpriced).toBeGreaterThan(0);
  });

  it('4. Offtake Engine on Empty Desk: evaluates contract terms with null market values cleanly', () => {
    const offtakeRes = calculateDualLegOfftake(DEFAULT_INSTITUTIONAL_OFFTAKE, null);

    expect(offtakeRes.physicalGasPriceEurPerMWh).toBeNull();
    expect(offtakeRes.physicalDeliveredNetCostEurPerMWh).toBeNull();
    expect(offtakeRes.totalDeliveredOfftakePriceEurPerMWh).toBeNull();
    expect(offtakeRes.totalAnnualRevenueMinEur).toBeNull();
    expect(offtakeRes.totalAnnualRevenueMaxEur).toBeNull();
    expect(offtakeRes.missingInputs).toContain('gasIndex');
  });

  it('5. Commercial Gates on Empty Desk: evaluates cleanly with unpriced tags rather than inventing numbers', () => {
    const evaluation = evaluateCommercialGates(DEFAULT_INSTITUTIONAL_OFFTAKE, {});

    expect(evaluation.gates.length).toBe(12);
    expect(evaluation.overallVerdict).toBe('CONDITIONAL');

    // Index factor gate should flag unpriced impact
    const indexFactorGate = evaluation.gates.find(g => g.gate === 'INDEX_FACTOR');
    expect(indexFactorGate).toBeDefined();
    expect(indexFactorGate?.impactEurPerMWh).toBeNull();
    expect(indexFactorGate?.impactBasis).toContain('discount');

    // CI slider gate should flag missing destination mark
    const ciSliderGate = evaluation.gates.find(g => g.gate === 'CI_SLIDER_SHARE');
    expect(ciSliderGate).toBeDefined();
    expect(ciSliderGate?.impactEurPerMWh).toBeNull();
  });
});
