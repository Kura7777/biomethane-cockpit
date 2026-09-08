import { describe, it, expect } from 'vitest';
import { MARKETS, getMarketById } from '../markets/registry';
import { evaluateGHGThresholdGate } from '../eligibility/gates/ghg-threshold';
import { REFERENCE_CONSIGNMENTS } from '../consignment/feedstocks';
import { computeNetback } from '../netback/engine';
import { CI_COMPARATOR_HEAT, CI_COMPARATOR_ROAD_TRANSPORT } from '../markets/constants';
import { MarksState, CostInputs } from '../netback/types';

describe('Reality Checks & Institutional Ground-Truth Suite (Task 2.5)', () => {
  const sampleMarks: MarksState = {
    marks: {
      DE_THG: {
        marketId: 'DE_THG',
        bid: 280,
        offer: 290,
        mid: 285,
        updatedAt: '2026-09-06T12:00:00Z',
        source: 'TEST',
        provenance: { sourceType: 'BROKER_INDICATION', sourceName: 'Marex', sourceUrl: null, observedAt: '2026-09-06T12:00:00Z', note: null },
      },
      FR_CPB: {
        marketId: 'FR_CPB',
        bid: 76,
        offer: 80,
        mid: 78,
        updatedAt: '2026-09-06T12:00:00Z',
        source: 'TEST',
        provenance: { sourceType: 'EXCHANGE_AUCTION', sourceName: 'EEX', sourceUrl: null, observedAt: '2026-09-06T12:00:00Z', note: null },
      },
      UK_RTFO: {
        marketId: 'UK_RTFO',
        bid: 0.20,
        offer: 0.24,
        mid: 0.22,
        updatedAt: '2026-09-06T12:00:00Z',
        source: 'TEST',
        provenance: { sourceType: 'BROKER_INDICATION', sourceName: 'Argus', sourceUrl: null, observedAt: '2026-09-06T12:00:00Z', note: null },
      },
    },
    gasIndex: {
      bid: 31.0,
      offer: 31.5,
      mid: 31.25,
      updatedAt: '2026-09-06T12:00:00Z',
      provenance: { sourceType: 'EXCHANGE_AUCTION', sourceName: 'ICE Endex', sourceUrl: null, observedAt: '2026-09-06T12:00:00Z', note: null },
    },
    fx: {
      gbpEur: 1.18,
      chfEur: 1.05,
      updatedAt: '2026-09-06T12:00:00Z',
    },
    pricingSides: {
      certificateSide: 'mid',
      moleculeSide: 'mid',
    },
  };

  const sampleCosts: CostInputs = {
    transferCosts: 1.43,
    certificationCosts: 0.69,
    logistics: 0.49,
    otherCosts: 0.0,
    producerPricing: {
      mode: 'FIXED_PRICE',
      fixedPriceEurPerMwh: 137.89,
      indexLinkedShare: null,
      source: 'Offtake Agreement',
      lastVerified: '2026-09-06',
      confidence: 'VERIFIED',
    },
  };

  describe('1. Market Sector Taxonomy & Statutory Comparator Invariant', () => {
    it('verifies every market in the registry has an explicit sector defined', () => {
      expect(MARKETS.length).toBe(38);
      for (const m of MARKETS) {
        expect(['TRANSPORT', 'HEAT_POWER', 'VOLUNTARY', 'MARITIME']).toContain(m.sector);
      }
    });

    it('verifies heat markets evaluate against CI_COMPARATOR_HEAT (80 gCO2e/MJ)', () => {
      const frCpb = getMarketById('FR_CPB')!;
      expect(frCpb.sector).toBe('HEAT_POWER');

      // Consignment with CI 25 gCO2e/MJ post-2021
      // Under road transport (94 g): saving = (94 - 25)/94 = 73.4% (would erroneously pass 65%)
      // Under heat (80 g): saving = (80 - 25)/80 = 68.75% (must HARD_BLOCK against 70% threshold)
      const borderlineConsignment = {
        ...REFERENCE_CONSIGNMENTS.DANISH_MANURE,
        carbonIntensity: 25.0,
        commissioningDateRange: 'POST_2021_TO_2025' as const,
      };

      const result = evaluateGHGThresholdGate(borderlineConsignment, frCpb);
      expect(result.verdict).toBe('HARD_BLOCK');
      expect(result.reason).toContain('vs. comparator 80 gCO₂e/MJ');
      expect(result.reason).toContain('68.8%');
    });

    it('verifies transport markets evaluate against CI_COMPARATOR_ROAD_TRANSPORT (94 gCO2e/MJ)', () => {
      const deThg = getMarketById('DE_THG')!;
      expect(deThg.sector).toBe('TRANSPORT');

      const consignment = {
        ...REFERENCE_CONSIGNMENTS.DANISH_MANURE,
        carbonIntensity: 25.0,
        commissioningDateRange: 'POST_2021_TO_2025' as const,
      };

      const result = evaluateGHGThresholdGate(consignment, deThg);
      expect(result.verdict).toBe('PASS');
      expect(result.reason).toContain('vs. comparator 94 gCO₂e/MJ');
      expect(result.reason).toContain('73.4%');
    });
  });

  describe('2. Negative Margin Reachability & Market Clearing Checks', () => {
    it('verifies fixed-price offtake above net netback generates a reachable negative margin', () => {
      const market = getMarketById('FR_CPB')!;
      const consignment = REFERENCE_CONSIGNMENTS.DANISH_MANURE;

      // Set producer fixed price higher than net netback to stress-test loss capability
      const underwaterCosts: CostInputs = {
        ...sampleCosts,
        producerPricing: {
          mode: 'FIXED_PRICE',
          fixedPriceEurPerMwh: 200.0,
          indexLinkedShare: null,
          source: 'Above-Market Procurement',
          lastVerified: '2026-09-06',
          confidence: 'VERIFIED',
        },
      };

      const result = computeNetback(market, consignment, sampleMarks, underwaterCosts, 'bid');
      expect(result.netNetback).not.toBeNull();
      expect(result.producerPayable).toBe(200.0);
      expect(result.deskMargin).not.toBeNull();
      expect(result.deskMargin!).toBeLessThan(0);
      expect(result.marginPercent!).toBeLessThan(0);
    });

    it('fires clearingPriceWarning when modelled netback exceeds observed bundle clearing price', () => {
      const market = getMarketById('DE_THG')!;
      const consignment = {
        ...REFERENCE_CONSIGNMENTS.DANISH_MANURE,
        observedBundlePriceEurPerMwh: 145.0, // typical 2026 traded bundle price
      };

      const result = computeNetback(market, consignment, sampleMarks, sampleCosts, 'bid');
      expect(result.netNetback).toBeGreaterThan(145.0);
      expect(result.clearingPriceWarning).toBeDefined();
      expect(result.clearingPriceWarning).toContain('exceeds observed traded bundle price');
    });
  });

  describe('3. Arithmetic Closure & Invariant Conservation', () => {
    it('verifies Net Netback equals Certificate Value + Molecule Value − Total Costs', () => {
      const market = getMarketById('DE_THG')!;
      const consignment = REFERENCE_CONSIGNMENTS.DANISH_MANURE;

      const result = computeNetback(market, consignment, sampleMarks, sampleCosts, 'mid');
      const cert = result.certificateValue?.valueEurPerMWh ?? 0;
      const mol = result.moleculeValue ?? 0;
      const costs = result.totalCosts ?? 0;
      const expectedNetback = Number((cert + mol - costs).toFixed(2));

      expect(result.netNetback).toBeCloseTo(expectedNetback, 2);
    });

    it('verifies Desk Margin equals Net Netback − Producer Payable', () => {
      const market = getMarketById('DE_THG')!;
      const consignment = REFERENCE_CONSIGNMENTS.DANISH_MANURE;

      const result = computeNetback(market, consignment, sampleMarks, sampleCosts, 'mid');
      const netNetback = result.netNetback ?? 0;
      const payable = result.producerPayable ?? 0;
      const expectedMargin = Number((netNetback - payable).toFixed(2));

      expect(result.deskMargin).toBeCloseTo(expectedMargin, 2);
    });
  });
});
