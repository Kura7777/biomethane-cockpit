import { describe, it, expect } from 'vitest';
import { 
  computeNetback, 
  computeCertificateValue, 
  computeAllNetbacks 
} from '../netback/engine';
import { rankNetbacks } from '../netback/ranking';
import { calculateCiSliderAdjustment } from '../offtake/engine';
import { evaluateEligibility } from '../eligibility/engine';
import { MARKETS, getMarketById } from '../markets/registry';
import { Consignment } from '../consignment/types';
import { MarksState, CostInputs } from '../netback/types';
import { simulateDesk } from '../marks/simulate';
import { REFERENCE_CONSIGNMENTS } from '../consignment/feedstocks';

describe('PHASE 2 — ADVERSARIAL INPUTS STRESS-TEST AUDIT', () => {
  const { marks, costs } = simulateDesk();
  const deThgMarket = getMarketById('DE_THG')!;

  const baseConsignment: Consignment = {
    ...REFERENCE_CONSIGNMENTS.DANISH_MANURE,
    carbonIntensity: -50,
    volumeMWh: 10000,
    deliveryPeriod: {
      type: 'CALENDAR',
      startDate: '2025-01-01',
      endDate: '2025-12-31',
      complianceYear: 2025, // Single branch pre-2026
    }
  };

  // --------------------------------------------------------------------------
  // 1. CARBON INTENSITY EDGES: -200, -100, -20, 0, +94, +200
  // --------------------------------------------------------------------------
  describe('1. Carbon Intensity Edge Stress-Testing', () => {
    it('CI = +94 exactly (fossil comparator): tCO2e = 0, certificate value = €0.00/MWh, no division by zero', () => {
      const consignment94: Consignment = { ...baseConsignment, carbonIntensity: 94.0 };
      const certVal = computeCertificateValue(deThgMarket, consignment94, marks, 'bid');
      
      expect(certVal).not.toBeNull();
      expect(certVal?.valueEurPerMWh).toBe(0.00);
      expect(certVal?.calculation).toContain('0.0000');
      expect(isFinite(certVal?.valueEurPerMWh as number)).toBe(true);

      const netback = computeNetback(deThgMarket, consignment94, marks, costs, { certificateSide: 'bid', moleculeSide: 'bid' });
      expect(isFinite(netback.netNetback as number)).toBe(true);
      expect(isNaN(netback.netNetback as number)).toBe(false);
    });

    it('CI = +200 (> 94): produces negative certificate value without crashing or silent clamping', () => {
      const consignment200: Consignment = { ...baseConsignment, carbonIntensity: 200.0 };
      const certVal = computeCertificateValue(deThgMarket, consignment200, marks, 'bid');

      expect(certVal).not.toBeNull();
      expect(certVal?.valueEurPerMWh).toBeLessThan(0);
      expect(isFinite(certVal?.valueEurPerMWh as number)).toBe(true);
      
      // Regulatory eligibility gate: GHG threshold gate blocks it
      const eligibility = evaluateEligibility(consignment200, deThgMarket);
      const ghgGate = eligibility.gates.find(g => g.gate === 'GHG_THRESHOLD');
      expect(ghgGate?.verdict).toBe('HARD_BLOCK');
    });

    it('CI = -200 (extreme negative): produces large positive certificate value linearly', () => {
      const consignmentNeg200: Consignment = { ...baseConsignment, carbonIntensity: -200.0 };
      const certVal = computeCertificateValue(deThgMarket, consignmentNeg200, marks, 'bid');

      expect(certVal).not.toBeNull();
      expect(certVal?.valueEurPerMWh).toBeGreaterThan(300);
      expect(isFinite(certVal?.valueEurPerMWh as number)).toBe(true);
    });

    it('CI Slider at extreme boundaries: -100 clamps to ceiling, +100 clamps to floor', () => {
      const testCiSliderConfig = {
        basePriceEurPerMWh: 54.0,
        baseCarbonIntensity: -20.0,
        ciMultiplierAlpha: 0.65,
        lowerBoundaryCI: -80.0,
        upperBoundaryCI: 0.0,
        minCarbonIntensityFloor: -80.0,
        maxCarbonIntensityCeiling: 0.0,
        rejectionThresholdCI: 10.0,
        buyerRejectionAboveMaxCi: false,
      };

      // CI = +15 (above rejection threshold)
      const resReject = calculateCiSliderAdjustment({ ...testCiSliderConfig, buyerRejectionAboveMaxCi: true }, 15);
      expect(resReject.buyerRejectionTriggered).toBe(true);
      expect(resReject.isWithinCorridor).toBe(false);

      // CI = +5 (above upper corridor, below rejection)
      const resFloor = calculateCiSliderAdjustment(testCiSliderConfig, 5);
      expect(resFloor.buyerRejectionTriggered).toBe(false);
      expect(resFloor.isWithinCorridor).toBe(false);
      expect(resFloor.adjustmentEurPerMWh).toBe(-13.00); // Clamped to upperBoundaryCI (0.0)

      // CI = -100 (below lower corridor)
      const resLow = calculateCiSliderAdjustment(testCiSliderConfig, -100);
      expect(resLow.buyerRejectionTriggered).toBe(false);
      expect(resLow.isWithinCorridor).toBe(false);
      expect(resLow.adjustmentEurPerMWh).toBe(39.00); // 0.65 * (-20 - (-80 clamped))
    });
  });

  // --------------------------------------------------------------------------
  // 2. VOLUME EDGES: 0, 1, NEGATIVE, 10^9, NON-INTEGER, NULL
  // --------------------------------------------------------------------------
  describe('2. Volume Edge Stress-Testing', () => {
    it('Volume = 0: calculates 0 notional cleanly', () => {
      const consignmentZeroVol: Consignment = { ...baseConsignment, volumeMWh: 0 };
      const netback = computeNetback(deThgMarket, consignmentZeroVol, marks, costs, { certificateSide: 'bid', moleculeSide: 'bid' });
      
      expect(netback.deskPnL).toBe(0);
    });

    it('Volume = null: notional and PnL return null rather than fabricating a value', () => {
      const consignmentNullVol: Consignment = { ...baseConsignment, volumeMWh: null };
      const netback = computeNetback(deThgMarket, consignmentNullVol, marks, costs, { certificateSide: 'bid', moleculeSide: 'bid' });
      
      expect(netback.deskPnL).toBeNull();
      expect(netback.grossSpreadPnL).toBeNull();
    });

    it('Volume = negative (-5,000 MWh): calculates negative notional honestly without crashing', () => {
      const consignmentNegVol: Consignment = { ...baseConsignment, volumeMWh: -5000 };
      const netback = computeNetback(deThgMarket, consignmentNegVol, marks, costs, { certificateSide: 'bid', moleculeSide: 'bid' });
      
      expect(isFinite(netback.deskPnL as number)).toBe(true);
      if (netback.deskMargin !== null && netback.deskMargin > 0) {
        expect(netback.deskPnL).toBeLessThan(0);
      }
    });

    it('Volume = 10^9 (1 Terawatt-hour): large volume arithmetic maintains precision without overflow or Infinity', () => {
      const consignmentHugeVol: Consignment = { ...baseConsignment, volumeMWh: 1_000_000_000 };
      const netback = computeNetback(deThgMarket, consignmentHugeVol, marks, costs, { certificateSide: 'bid', moleculeSide: 'bid' });
      
      expect(isFinite(netback.deskPnL as number)).toBe(true);
      expect(isNaN(netback.deskPnL as number)).toBe(false);
    });

    it('Volume = non-integer (12345.6789 MWh): calculates fractional notional cleanly', () => {
      const consignmentFloatVol: Consignment = { ...baseConsignment, volumeMWh: 12345.6789 };
      const netback = computeNetback(deThgMarket, consignmentFloatVol, marks, costs, { certificateSide: 'bid', moleculeSide: 'bid' });
      
      expect(isFinite(netback.deskPnL as number)).toBe(true);
    });
  });

  // --------------------------------------------------------------------------
  // 3. PRODUCER PRICING & DESK MARGIN EDGES: 0, 0.5, 1.0, 1.2, NEGATIVE
  // --------------------------------------------------------------------------
  describe('3. Producer Pricing Share & Margin Edge Stress-Testing', () => {
    it('Producer Share = 1.0: desk margin is exactly €0.00/MWh (100% passed to producer)', () => {
      const costs100: CostInputs = {
        ...costs,
        producerPricing: {
          mode: 'INDEX_LINKED',
          indexLinkedShare: 1.0,
          fixedPriceEurPerMwh: null,
          source: 'Test',
          lastVerified: '2026-01-01',
          confidence: 'VERIFIED',
        }
      };

      const netback = computeNetback(deThgMarket, baseConsignment, marks, costs100, { certificateSide: 'bid', moleculeSide: 'bid' });
      expect(netback.producerPayable).toBeCloseTo(netback.netNetback as number, 2);
      expect(netback.deskMargin).toBeCloseTo(0.00, 2);
    });

    it('Producer Share = 1.20 (> 1.0): desk margin is negative (loss-making trade shown honestly)', () => {
      const costs120: CostInputs = {
        ...costs,
        producerPricing: {
          mode: 'INDEX_LINKED',
          indexLinkedShare: 1.20,
          fixedPriceEurPerMwh: null,
          source: 'Test',
          lastVerified: '2026-01-01',
          confidence: 'VERIFIED',
        }
      };

      const netback = computeNetback(deThgMarket, baseConsignment, marks, costs120, { certificateSide: 'bid', moleculeSide: 'bid' });
      expect(netback.producerPayable).toBeGreaterThan(netback.netNetback as number);
      expect(netback.deskMargin).toBeLessThan(0);
    });

    it('Producer Share = -0.20 (negative): producer pays desk (negative payable shown honestly)', () => {
      const costsNeg: CostInputs = {
        ...costs,
        producerPricing: {
          mode: 'INDEX_LINKED',
          indexLinkedShare: -0.20,
          fixedPriceEurPerMwh: null,
          source: 'Test',
          lastVerified: '2026-01-01',
          confidence: 'VERIFIED',
        }
      };

      const netback = computeNetback(deThgMarket, baseConsignment, marks, costsNeg, { certificateSide: 'bid', moleculeSide: 'bid' });
      expect(netback.producerPayable).toBeLessThan(0);
      expect(netback.deskMargin).toBeGreaterThan(netback.netNetback as number);
    });
  });

  // --------------------------------------------------------------------------
  // 4. NEGATIVE NETBACK RANKING & LOSS DISPLAY
  // --------------------------------------------------------------------------
  describe('4. Negative Netback Ranking & Loss Display', () => {
    it('ranks negative netbacks correctly among eligible markets in descending order', () => {
      const activeMarkets = MARKETS.filter(m => m.status === 'ACTIVE');
      const eligibilityMap = new Map();
      activeMarkets.forEach(m => eligibilityMap.set(m.id, evaluateEligibility(baseConsignment, m)));

      const highCostInputs: CostInputs = {
        ...costs,
        transferCosts: 150.00,
        certificationCosts: 50.00,
        logistics: 80.00,
      };

      const allNetbacks = computeAllNetbacks(baseConsignment, activeMarkets, marks, highCostInputs);
      const ranked = rankNetbacks(allNetbacks, eligibilityMap);

      expect(ranked.length).toBeGreaterThan(0);
      const tradeable = ranked.filter(r => ['ELIGIBLE', 'CONDITIONAL', 'UNRESOLVED'].includes(r.eligibilityVerdict));
      for (let i = 1; i < tradeable.length; i++) {
        const prev = tradeable[i - 1].netNetback ?? -Infinity;
        const curr = tradeable[i].netNetback ?? -Infinity;
        expect(prev).toBeGreaterThanOrEqual(curr);
      }
    });
  });

  // --------------------------------------------------------------------------
  // 5. FX EDGES
  // --------------------------------------------------------------------------
  describe('5. FX Stress-Testing', () => {
    it('FX rate = 0: converts foreign currency to €0.00 without division by zero', () => {
      const zeroFxMarks: MarksState = {
        ...marks,
        fx: {
          ...marks.fx,
          gbpEur: 0,
        }
      };
      const ukRtfoMarket = getMarketById('UK_RTFO')!;
      const ukConsignment: Consignment = { ...baseConsignment, originCountry: 'GB', injectionCountry: 'GB', injectionIsEU: false };
      const certVal = computeCertificateValue(ukRtfoMarket, ukConsignment, zeroFxMarks, 'bid');
      
      expect(certVal).not.toBeNull();
      expect(certVal?.valueEurPerMWh).toBe(0.00);
    });
  });
});
