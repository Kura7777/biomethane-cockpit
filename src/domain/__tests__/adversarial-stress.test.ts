import { describe, it, expect } from 'vitest';
import { 
  computeCertificateValue, 
  computeNetback, 
  computeAllNetbacks,
  tCO2ePerMWh, 
  computeFuelEUDeficitClosureValue,
  selectMarkPrice,
  RTFO_KG_PER_MWH,
  FUELEU_BASELINE_CI,
  FUELEU_TARGET_CI_2025,
  FUELEU_TARGET_CI_2030,
} from '../netback/engine';
import { calculateLogisticsRoute, findShortestPipelinePath, resolveInterconnectionPoints } from '../logistics/engine';
import { evaluateEligibility, evaluateAllMarkets } from '../eligibility/engine';
import { MARKETS, getMarketById } from '../markets/registry';
import { REFERENCE_CONSIGNMENTS } from '../consignment/feedstocks';
import { Consignment } from '../consignment/types';
import { MarksState, CostInputs } from '../netback/types';

describe('Empirical Adversarial Stress & Fuzz Suite (Milestone 1 & 3 Verification)', () => {

  const baseMarks: MarksState = {
    marks: {
      DE_THG: { marketId: 'DE_THG', bid: 290, offer: 310, mid: 300, updatedAt: new Date().toISOString(), source: 'Argus' },
      FR_CPB: { marketId: 'FR_CPB', bid: 95, offer: 105, mid: 100, updatedAt: new Date().toISOString(), source: 'EEX' },
      NL_ERE: { marketId: 'NL_ERE', bid: 0.28, offer: 0.32, mid: 0.30, updatedAt: new Date().toISOString(), source: 'NEa' },
      VOL_SCOPE1: { marketId: 'VOL_SCOPE1', bid: 35, offer: 45, mid: 40, updatedAt: new Date().toISOString(), source: 'Broker' },
      FUELEU: { marketId: 'FUELEU', bid: 220, offer: 260, mid: 240, updatedAt: new Date().toISOString(), source: 'Broker' },
      IT_CIC: { marketId: 'IT_CIC', bid: 360, offer: 390, mid: 375, updatedAt: new Date().toISOString(), source: 'GSE' },
      UK_RTFO: { marketId: 'UK_RTFO', bid: 0.25, offer: 0.27, mid: 0.26, updatedAt: new Date().toISOString(), source: 'Argus' },
    },
    gasIndex: { bid: 28.00, offer: 29.00, mid: 28.50, updatedAt: new Date().toISOString() },
    fx: { gbpEur: 1.18, chfEur: 1.06, updatedAt: new Date().toISOString() },
    pricingSides: { certificateSide: 'bid', moleculeSide: 'bid' },
  };

  const zeroCosts: CostInputs = {
    transferCosts: 0,
    certificationCosts: 0,
    logistics: 0,
    otherCosts: 0,
    producerPricing: {
      mode: 'INDEX_LINKED',
      fixedPriceEurPerMwh: null,
      indexLinkedShare: 0.90,
      source: null,
      lastVerified: null,
      confidence: 'UNVERIFIED',
    },
  };

  // --------------------------------------------------------------------------
  // TEST GROUP 1: Deep Negative, Zero, and Extreme Positive Carbon Intensity (CI)
  // --------------------------------------------------------------------------
  describe('1. Carbon Intensity (CI) Extremes & Invariants', () => {

    it('handles deep negative CI (-150 gCO2e/MJ) accurately without overflow or NaN', () => {
      const ci = -150;
      const co2e = tCO2ePerMWh(ci);
      // (94 - (-150)) * 3600 / 1,000,000 = 244 * 3600 / 1e6 = 0.8784
      expect(co2e).toBeCloseTo(0.8784, 6);
      expect(Number.isFinite(co2e)).toBe(true);
      expect(Number.isNaN(co2e)).toBe(false);

      const deMarket = getMarketById('DE_THG')!;
      const testConsignment: Consignment = {
        ...REFERENCE_CONSIGNMENTS.DANISH_MANURE,
        carbonIntensity: ci,
      };

      const certVal = computeCertificateValue(deMarket, testConsignment, baseMarks, 'bid');
      expect(certVal).not.toBeNull();
      // 290 * 0.8784 = 254.736
      expect(certVal!.valueEurPerMWh).toBeCloseTo(254.736, 2);
      expect(Number.isFinite(certVal!.valueEurPerMWh!)).toBe(true);

      const netback = computeNetback(deMarket, testConsignment, baseMarks, zeroCosts, 'bid');
      expect(netback.netNetback).not.toBeNull();
      expect(Number.isFinite(netback.netNetback!)).toBe(true);
      expect(Number.isNaN(netback.netNetback!)).toBe(false);
    });

    it('handles zero CI (0 gCO2e/MJ) accurately', () => {
      const ci = 0;
      const co2e = tCO2ePerMWh(ci);
      // (94 - 0) * 3600 / 1,000,000 = 0.3384
      expect(co2e).toBeCloseTo(0.3384, 6);

      const deMarket = getMarketById('DE_THG')!;
      const testConsignment: Consignment = {
        ...REFERENCE_CONSIGNMENTS.DANISH_MANURE,
        carbonIntensity: ci,
      };

      const certVal = computeCertificateValue(deMarket, testConsignment, baseMarks, 'bid');
      expect(certVal).not.toBeNull();
      // 290 * 0.3384 = 98.136
      expect(certVal!.valueEurPerMWh).toBeCloseTo(98.136, 2);
    });

    it('handles extreme positive CI (+120 gCO2e/MJ, exceeding fossil comparator)', () => {
      const ci = 120;
      const co2e = tCO2ePerMWh(ci);
      // (94 - 120) * 3600 / 1,000,000 = -26 * 3600 / 1e6 = -0.0936
      expect(co2e).toBeCloseTo(-0.0936, 6);

      const deMarket = getMarketById('DE_THG')!;
      const testConsignment: Consignment = {
        ...REFERENCE_CONSIGNMENTS.DANISH_MANURE,
        carbonIntensity: ci,
      };

      const certVal = computeCertificateValue(deMarket, testConsignment, baseMarks, 'bid');
      expect(certVal).not.toBeNull();
      // 290 * -0.0936 = -27.144
      expect(certVal!.valueEurPerMWh).toBeCloseTo(-27.144, 2);

      // Eligibility check: GHG gate must HARD_BLOCK
      const eligibility = evaluateEligibility(testConsignment, deMarket);
      expect(eligibility.overallVerdict).toBe('HARD_BLOCK');
      const ghgGate = eligibility.gates.find(g => g.gate === 'GHG_THRESHOLD');
      expect(ghgGate?.verdict).toBe('HARD_BLOCK');
    });

    it('fuzzes CI values across range [-200 to +300] in steps of 10 gCO2e/MJ', () => {
      const deMarket = getMarketById('DE_THG')!;
      for (let ci = -200; ci <= 300; ci += 10) {
        const co2e = tCO2ePerMWh(ci);
        expect(Number.isFinite(co2e)).toBe(true);
        expect(Number.isNaN(co2e)).toBe(false);

        const consignment: Consignment = {
          ...REFERENCE_CONSIGNMENTS.DANISH_MANURE,
          carbonIntensity: ci,
        };
        const certVal = computeCertificateValue(deMarket, consignment, baseMarks, 'bid');
        expect(certVal).not.toBeNull();
        expect(Number.isFinite(certVal!.valueEurPerMWh!)).toBe(true);
        expect(Number.isNaN(certVal!.valueEurPerMWh!)).toBe(false);

        const el = evaluateEligibility(consignment, deMarket);
        expect(['ELIGIBLE', 'CONDITIONAL', 'UNRESOLVED', 'UNKNOWN', 'HARD_BLOCK']).toContain(el.overallVerdict);
      }
    });

  });

  // --------------------------------------------------------------------------
  // TEST GROUP 2: FuelEU Maritime Deficit Closure Model Adversarial Stress
  // --------------------------------------------------------------------------
  describe('2. FuelEU Maritime Deficit Model Bounds & Division Guards', () => {

    it('guards against non-positive ship actual CI (<= 0)', () => {
      const res0 = computeFuelEUDeficitClosureValue(-100, 1, 89.34, 0);
      expect(res0.valueEurPerMWh).toBe(0);
      expect(Number.isFinite(res0.valueEurPerMWh)).toBe(true);
      expect(res0.calculation).toContain('must be positive');

      const resNeg = computeFuelEUDeficitClosureValue(-100, 1, 89.34, -100);
      expect(resNeg.valueEurPerMWh).toBe(0);
      expect(Number.isFinite(resNeg.valueEurPerMWh)).toBe(true);
      expect(resNeg.calculation).toContain('must be positive');
    });

    it('handles bio-fuel CI >= target CI (deltaCI <= 0) yielding 0 compliance value', () => {
      const resEqual = computeFuelEUDeficitClosureValue(89.34, 1, 89.34, 91.16);
      expect(resEqual.valueEurPerMWh).toBe(0);
      expect(resEqual.calculation).toContain('Generates no compliance credit');

      const resHigher = computeFuelEUDeficitClosureValue(100, 1, 89.34, 91.16);
      expect(resHigher.valueEurPerMWh).toBe(0);
      expect(resHigher.calculation).toContain('Generates no compliance credit');
    });

    it('computes accurately for extreme negative CI (-150 gCO2e/MJ)', () => {
      const res = computeFuelEUDeficitClosureValue(-150, 1, 89.34, 91.16);
      // deltaCI = 89.34 - (-150) = 239.34
      // penaltyPerMJ = (239.34 / (91.16 * 41000)) * 2400 * 1 = (239.34 / 3737560) * 2400 ≈ 0.153676194...
      // valueEurPerMWh = penaltyPerMJ * 3600 ≈ 553.234...
      expect(res.valueEurPerMWh).toBeCloseTo(553.23, 1);
      expect(Number.isFinite(res.valueEurPerMWh)).toBe(true);
      expect(Number.isNaN(res.valueEurPerMWh)).toBe(false);
    });

    it('escalates penalty multiplier correctly across years 1 to 5+', () => {
      const yr1 = computeFuelEUDeficitClosureValue(-100, 1, 89.34, 91.16);
      const yr2 = computeFuelEUDeficitClosureValue(-100, 2, 89.34, 91.16);
      const yr3 = computeFuelEUDeficitClosureValue(-100, 3, 89.34, 91.16);
      const yr4 = computeFuelEUDeficitClosureValue(-100, 4, 89.34, 91.16);

      // yr2 is +10% (1.1x), yr3 is +20% (1.2x), yr4 is +30% (1.3x)
      expect(yr2.valueEurPerMWh).toBeCloseTo(yr1.valueEurPerMWh * 1.1, 2);
      expect(yr3.valueEurPerMWh).toBeCloseTo(yr1.valueEurPerMWh * 1.2, 2);
      expect(yr4.valueEurPerMWh).toBeCloseTo(yr1.valueEurPerMWh * 1.3, 2);
    });

    it('handles target year 2030 tighter baseline (85.69 gCO2e/MJ)', () => {
      const yr2025 = computeFuelEUDeficitClosureValue(-100, 1, FUELEU_TARGET_CI_2025, 91.16);
      const yr2030 = computeFuelEUDeficitClosureValue(-100, 1, FUELEU_TARGET_CI_2030, 91.16);
      expect(yr2030.valueEurPerMWh).toBeLessThan(yr2025.valueEurPerMWh);
      // deltaCI 2030 = 85.69 - (-100) = 185.69
      // (185.69 / 3737560) * 2400 * 3600 ≈ 429.26
      expect(yr2030.valueEurPerMWh).toBeCloseTo(429.26, 1);
    });

  });

  // --------------------------------------------------------------------------
  // TEST GROUP 3: Extreme Volumes (0 MWh, 1 MWh, 1 TWh, 1e9 MWh)
  // --------------------------------------------------------------------------
  describe('3. Volume Extremes (Zero and Terawatt-Scale)', () => {

    it('handles 0 MWh volume without NaN or Infinity in PnL', () => {
      const deMarket = getMarketById('DE_THG')!;
      const zeroVolConsignment: Consignment = {
        ...REFERENCE_CONSIGNMENTS.DANISH_MANURE,
        volumeMWh: 0,
      };

      const nb = computeNetback(deMarket, zeroVolConsignment, baseMarks, zeroCosts, 'bid');
      expect(nb.deskPnL).toBe(0);
      expect(Number.isFinite(nb.deskPnL!)).toBe(true);
      expect(Number.isNaN(nb.deskPnL!)).toBe(false);

      if (nb.valuationRange) {
        expect(nb.valuationRange.deltaNotional).toBe(0);
      }
    });

    it('handles 1 TWh (1,000,000 MWh) extreme volume without precision breakdown', () => {
      const deMarket = getMarketById('DE_THG')!;
      const twhConsignment: Consignment = {
        ...REFERENCE_CONSIGNMENTS.DANISH_MANURE,
        volumeMWh: 1_000_000,
      };

      const nb = computeNetback(deMarket, twhConsignment, baseMarks, zeroCosts, 'bid');
      expect(nb.deskPnL).toBe(nb.deskMargin! * 1_000_000);
      expect(Number.isFinite(nb.deskPnL!)).toBe(true);
      expect(Number.isNaN(nb.deskPnL!)).toBe(false);

      if (nb.valuationRange) {
        expect(nb.valuationRange.deltaNotional).toBeCloseTo(nb.valuationRange.deltaPerMwh * 1_000_000, 1);
      }
    });

    it('handles null volume gracefully', () => {
      const deMarket = getMarketById('DE_THG')!;
      const nullVolConsignment: Consignment = {
        ...REFERENCE_CONSIGNMENTS.DANISH_MANURE,
        volumeMWh: null,
      };

      const nb = computeNetback(deMarket, nullVolConsignment, baseMarks, zeroCosts, 'bid');
      expect(nb.deskPnL).toBeNull();
      expect(nb.grossSpreadPnL).toBeNull();
      if (nb.valuationRange) {
        expect(nb.valuationRange.deltaNotional).toBeNull();
      }
    });

  });

  // --------------------------------------------------------------------------
  // TEST GROUP 4: Extreme Market Marks (€0, €2000, Negative Gas Prices)
  // --------------------------------------------------------------------------
  describe('4. Extreme Market Marks & Pricing Bounds', () => {

    it('handles €0.00 mark cleanly across all market mechanisms', () => {
      const zeroMarks: MarksState = {
        marks: {
          DE_THG: { marketId: 'DE_THG', bid: 0, offer: 0, mid: 0, updatedAt: new Date().toISOString(), source: 'Test' },
          FR_CPB: { marketId: 'FR_CPB', bid: 0, offer: 0, mid: 0, updatedAt: new Date().toISOString(), source: 'Test' },
          NL_ERE: { marketId: 'NL_ERE', bid: 0, offer: 0, mid: 0, updatedAt: new Date().toISOString(), source: 'Test' },
          VOL_SCOPE1: { marketId: 'VOL_SCOPE1', bid: 0, offer: 0, mid: 0, updatedAt: new Date().toISOString(), source: 'Test' },
          IT_CIC: { marketId: 'IT_CIC', bid: 0, offer: 0, mid: 0, updatedAt: new Date().toISOString(), source: 'Test' },
          UK_RTFO: { marketId: 'UK_RTFO', bid: 0, offer: 0, mid: 0, updatedAt: new Date().toISOString(), source: 'Test' },
        },
        gasIndex: { bid: 0, offer: 0, mid: 0, updatedAt: new Date().toISOString() },
        fx: { gbpEur: 1.18, chfEur: 1.06, updatedAt: new Date().toISOString() },
        pricingSides: { certificateSide: 'bid', moleculeSide: 'bid' },
      };

      const consignment = REFERENCE_CONSIGNMENTS.DANISH_MANURE;

      for (const marketId of ['DE_THG', 'FR_CPB', 'NL_ERE', 'VOL_SCOPE1', 'IT_CIC', 'UK_RTFO']) {
        const market = getMarketById(marketId)!;
        const certVal = computeCertificateValue(market, consignment, zeroMarks, 'bid');
        expect(certVal).not.toBeNull();
        expect(certVal!.valueEurPerMWh).toBe(0);

        const nb = computeNetback(market, consignment, zeroMarks, zeroCosts, 'bid');
        expect(nb.netNetback).toBe(0);
        expect(nb.producerPayable).toBe(0);
        expect(nb.deskMargin).toBe(0);
        expect(nb.marginPercent).toBeNull(); // 0 netNetback avoids division by 0
      }
    });

    it('handles €2,000.00/t extreme mark with French CPB strictly clamping at €100.00/MWh', () => {
      const highMarks: MarksState = {
        marks: {
          DE_THG: { marketId: 'DE_THG', bid: 2000, offer: 2000, mid: 2000, updatedAt: new Date().toISOString(), source: 'Test' },
          FR_CPB: { marketId: 'FR_CPB', bid: 2000, offer: 2000, mid: 2000, updatedAt: new Date().toISOString(), source: 'Test' },
          IT_CIC: { marketId: 'IT_CIC', bid: 2000, offer: 2000, mid: 2000, updatedAt: new Date().toISOString(), source: 'Test' },
        },
        gasIndex: { bid: 100, offer: 100, mid: 100, updatedAt: new Date().toISOString() },
        fx: { gbpEur: 1.18, chfEur: 1.06, updatedAt: new Date().toISOString() },
        pricingSides: { certificateSide: 'bid', moleculeSide: 'bid' },
      };

      const consignment = REFERENCE_CONSIGNMENTS.DANISH_MANURE;

      // France CPB MUST clamp at 100
      const frMarket = getMarketById('FR_CPB')!;
      const frCertVal = computeCertificateValue(frMarket, consignment, highMarks, 'bid');
      expect(frCertVal?.valueEurPerMWh).toBe(100.00);
      expect(frCertVal?.capped).toBe(true);
      expect(frCertVal?.capReason).toContain('Art. L.446-24');

      // Germany THG scales linearly
      const deMarket = getMarketById('DE_THG')!;
      const deCertVal = computeCertificateValue(deMarket, consignment, highMarks, 'bid');
      // 2000 * 0.6984 = 1396.80
      expect(deCertVal?.valueEurPerMWh).toBeCloseTo(1396.80, 1);

      // Italy CIC Advanced (Annex IX-A): 2000 / 5.815 = 343.94
      const itMarket = getMarketById('IT_CIC')!;
      const itCertVal = computeCertificateValue(itMarket, consignment, highMarks, 'bid');
      expect(itCertVal?.valueEurPerMWh).toBeCloseTo(343.94, 1);
    });

    it('handles negative gas prices (e.g. TTF at -€15.00/MWh) without mathematical breakdown', () => {
      const negGasMarks: MarksState = {
        marks: {
          DE_THG: { marketId: 'DE_THG', bid: 300, offer: 300, mid: 300, updatedAt: new Date().toISOString(), source: 'Test' },
        },
        gasIndex: { bid: -15.00, offer: -14.00, mid: -14.50, updatedAt: new Date().toISOString() },
        fx: { gbpEur: 1.18, chfEur: 1.06, updatedAt: new Date().toISOString() },
        pricingSides: { certificateSide: 'bid', moleculeSide: 'bid' },
      };

      const consignment = REFERENCE_CONSIGNMENTS.DANISH_MANURE;
      const deMarket = getMarketById('DE_THG')!;
      const nb = computeNetback(deMarket, consignment, negGasMarks, zeroCosts, 'bid');

      // Netback = certVal (209.52) + gasIndex (-15.00) - costs (0) = 194.52
      expect(nb.netNetback).toBeCloseTo(209.52 - 15.00, 1);
      expect(nb.deskMargin).toBeCloseTo((209.52 - 15.00) * 0.10, 1);
      expect(nb.producerPayable).toBeCloseTo((209.52 - 15.00) * 0.90, 1);
    });

    it('handles deep negative netback (loss-making trade) with inverted margin percentage', () => {
      const lossMarks: MarksState = {
        marks: {
          DE_THG: { marketId: 'DE_THG', bid: 10, offer: 10, mid: 10, updatedAt: new Date().toISOString(), source: 'Test' },
        },
        gasIndex: { bid: 20, offer: 20, mid: 20, updatedAt: new Date().toISOString() },
        fx: { gbpEur: 1.18, chfEur: 1.06, updatedAt: new Date().toISOString() },
        pricingSides: { certificateSide: 'bid', moleculeSide: 'bid' },
      };

      const highCost: CostInputs = {
        transferCosts: 10,
        certificationCosts: 5,
        logistics: 50,
        otherCosts: 0,
        producerPricing: {
          mode: 'FIXED_PRICE',
          fixedPriceEurPerMwh: 50.00,
          indexLinkedShare: null,
          source: null,
          lastVerified: null,
          confidence: 'UNVERIFIED',
        },
      };

      const consignment = REFERENCE_CONSIGNMENTS.DANISH_MANURE;
      const deMarket = getMarketById('DE_THG')!;
      const nb = computeNetback(deMarket, consignment, lossMarks, highCost, 'bid');

      // certVal = 10 * 0.6984 = 6.98
      // netNetback = 6.98 + 20 - 65 = -38.02
      // deskMargin = -38.02 - 50 = -88.02
      expect(nb.netNetback).toBeLessThan(0);
      expect(nb.deskMargin).toBeLessThan(0);
      expect(nb.marginPercent).not.toBeNull();
      expect(Number.isFinite(nb.marginPercent!)).toBe(true);
    });

  });

  // --------------------------------------------------------------------------
  // TEST GROUP 5: Missing / Null Marks, Missing FX, and Missing Costs
  // --------------------------------------------------------------------------
  describe('5. Missing Marks, FX Rates & Cost Incompleteness Tracking', () => {

    it('returns null certificate value and flags missingInputs when mark is missing', () => {
      const emptyMarks: MarksState = {
        marks: {},
        gasIndex: { bid: null, offer: null, mid: null, updatedAt: null },
        fx: { gbpEur: null, chfEur: null, updatedAt: null },
        pricingSides: { certificateSide: 'bid', moleculeSide: 'bid' },
      };

      const consignment = REFERENCE_CONSIGNMENTS.DANISH_MANURE;
      const deMarket = getMarketById('DE_THG')!;

      const certVal = computeCertificateValue(deMarket, consignment, emptyMarks);
      expect(certVal).toBeNull(); // Never fabricate defaults

      const nb = computeNetback(deMarket, consignment, emptyMarks, zeroCosts);
      expect(nb.netNetback).toBeNull();
      expect(nb.isComplete).toBe(false);
      expect(nb.missingInputs).toContain('gasIndex (TTF)');
    });

    it('UK RTFO returns UNVERIFIED with missing FX rate when GBP/EUR is null', () => {
      const marksNoFx: MarksState = {
        marks: {
          UK_RTFO: { marketId: 'UK_RTFO', bid: 0.25, offer: 0.27, mid: 0.26, updatedAt: new Date().toISOString(), source: 'Argus' },
        },
        gasIndex: { bid: 28.0, offer: 29.0, mid: 28.5, updatedAt: new Date().toISOString() },
        fx: { gbpEur: null, chfEur: 1.06, updatedAt: new Date().toISOString() },
        pricingSides: { certificateSide: 'bid', moleculeSide: 'bid' },
      };

      const ukMarket = getMarketById('UK_RTFO')!;
      const certVal = computeCertificateValue(ukMarket, REFERENCE_CONSIGNMENTS.UK_FOOD_WASTE, marksNoFx);

      expect(certVal).not.toBeNull();
      expect(certVal!.valueEurPerMWh).toBeNull();
      expect(certVal!.statusNote).toContain('Missing FX rate');
    });

    it('tracks missing cost inputs across transferCosts, certificationCosts, logistics', () => {
      const emptyCosts: CostInputs = {
        transferCosts: null,
        certificationCosts: null,
        logistics: null,
        otherCosts: null,
        producerPricing: null,
      };

      const frMarket = getMarketById('FR_CPB')!;
      const nb = computeNetback(frMarket, REFERENCE_CONSIGNMENTS.DANISH_MANURE, baseMarks, emptyCosts);

      expect(nb.missingInputs).toContain('transferCosts');
      expect(nb.missingInputs).toContain('certificationCosts');
      expect(nb.missingInputs).toContain('logistics');
      expect(nb.missingInputs).toContain('producerPricing');
      expect(nb.isComplete).toBe(false);
    });

  });

  // --------------------------------------------------------------------------
  // TEST GROUP 6: Logistics Corridor Engine Route Topology & Distance Bounds
  // --------------------------------------------------------------------------
  describe('6. Logistics Engine Route Topology & Distance Bounds', () => {

    it('handles identical origin and target (domestic delivery) with distance 0 and zero physical tariff (no borders)', () => {
      const res = calculateLogisticsRoute('DE', 'DE', 28.50);
      expect(res.distanceKm).toBe(0);
      expect(res.physicalRoute.transitingCountries).toEqual(['DE']);
      expect(res.physicalRoute.interconnectionPoints.length).toBe(0);
      expect(res.physicalRoute.totalPhysicalTariffEurMwh).toBe(0);
      expect(res.physicalRoute.shrinkageEurMwh).toBe(0.09); // base minimum 0.3% of 28.50 = 0.0855 -> 0.09
    });

    it('handles null gas price cleanly in logistics shrinkage calculations', () => {
      const res = calculateLogisticsRoute('DK', 'DE', null);
      expect(res.physicalRoute.shrinkageEurMwh).toBeNull();
      expect(res.modes.physicalPipeline.totalCostEurMwh).toBeNull();
    });

    it('computes known corridors across Europe accurately', () => {
      const corridors = [
        { from: 'DK', to: 'DE', expectedPath: ['DK', 'DE'] },
        { from: 'SE', to: 'ES', expectedPath: ['SE', 'DK', 'DE', 'FR', 'ES'] },
        { from: 'FR', to: 'IT', expectedPath: ['FR', 'CH', 'IT'] },
        { from: 'NL', to: 'DE', expectedPath: ['NL', 'DE'] },
      ];

      for (const c of corridors) {
        const path = findShortestPipelinePath(c.from, c.to);
        expect(path).toEqual(c.expectedPath);

        const assessment = calculateLogisticsRoute(c.from, c.to, 30.00);
        expect(assessment.originCountry).toBe(c.from);
        expect(assessment.targetCountry).toBe(c.to);
        expect(assessment.modes.virtualSwap).toBeDefined();
        expect(assessment.executionSteps.length).toBe(4);
      }
    });

  });

  // --------------------------------------------------------------------------
  // TEST GROUP 7: Regulatory Eligibility Engine Invariants Across All Markets
  // --------------------------------------------------------------------------
  describe('7. Regulatory Eligibility Invariants Across 24 Jurisdictions', () => {

    it('evaluates all 32 market frameworks against all reference consignments without exceptions', () => {
      const consignments = Object.values(REFERENCE_CONSIGNMENTS);
      for (const consignment of consignments) {
        const assessments = evaluateAllMarkets(consignment, MARKETS);
        expect(assessments.length).toBe(MARKETS.length);

        for (const a of assessments) {
          expect(['ELIGIBLE', 'CONDITIONAL', 'UNRESOLVED', 'UNKNOWN', 'HARD_BLOCK']).toContain(a.overallVerdict);
          expect(a.gates.length).toBe(6);
          expect(a.summary.length).toBeGreaterThan(5);

          // Invariant: if any gate is HARD_BLOCK, overallVerdict must be HARD_BLOCK
          const hasBlock = a.gates.some(g => g.verdict === 'HARD_BLOCK');
          if (hasBlock) {
            expect(a.overallVerdict).toBe('HARD_BLOCK');
            expect(a.blockingGate).not.toBeNull();
          }
        }
      }
    });

    it('evaluates computeAllNetbacks across all markets deterministically', () => {
      const consignment = REFERENCE_CONSIGNMENTS.DANISH_MANURE;
      const netbacks = computeAllNetbacks(consignment, MARKETS, baseMarks, zeroCosts);
      expect(netbacks.length).toBe(MARKETS.length);

      for (const nb of netbacks) {
        expect(nb.marketId).toBeDefined();
        if (nb.netNetback !== null) {
          expect(Number.isFinite(nb.netNetback)).toBe(true);
          expect(Number.isNaN(nb.netNetback)).toBe(false);
        }
      }
    });

  });

});
