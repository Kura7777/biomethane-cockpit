import { describe, it, expect } from 'vitest';
import { evaluateEligibility, evaluateAllMarkets } from '../eligibility/engine';
import { 
  computeCertificateValue, 
  computeNetback, 
  tCO2ePerMWh, 
  computeFuelEUDeficitClosureValue,
  FUELEU_BASELINE_CI,
  FUELEU_TARGET_CI_2025,
  FUELEU_TARGET_CI_2030,
  RTFO_KG_PER_MWH
} from '../netback/engine';
import { getMarketById, MARKETS } from '../markets/registry';
import { Consignment } from '../consignment/types';
import { MarksState, CostInputs } from '../netback/types';
import { REFERENCE_CONSIGNMENTS } from '../consignment/feedstocks';
import { CI_COMPARATOR_ROAD_TRANSPORT, FR_CPB_CEILING_EUR_MWH } from '../markets/constants';

const zeroCosts: CostInputs = {
  transferCosts: 0,
  certificationCosts: 0,
  logistics: 0,
  otherCosts: 0,
  producerPricing: {
    mode: 'FIXED_PRICE',
    fixedPriceEurPerMwh: 0,
    indexLinkedShare: null,
    source: 'Fixture',
    lastVerified: '2026-08-17',
    confidence: 'VERIFIED',
  },
};

const baseMarks: MarksState = {
  marks: {
    DE_THG: { marketId: 'DE_THG', bid: 300, offer: 320, mid: 310, updatedAt: '2026-08-17T00:00:00Z', source: 'Fixture' },
    FR_CPB: { marketId: 'FR_CPB', bid: 95, offer: 105, mid: 100, updatedAt: '2026-08-17T00:00:00Z', source: 'Fixture' },
    NL_ERE: { marketId: 'NL_ERE', bid: 0.30, offer: 0.35, mid: 0.325, updatedAt: '2026-08-17T00:00:00Z', source: 'Fixture' },
    VOL_SCOPE1: { marketId: 'VOL_SCOPE1', bid: 40, offer: 50, mid: 45, updatedAt: '2026-08-17T00:00:00Z', source: 'Fixture' },
    FUELEU: { marketId: 'FUELEU', bid: 220, offer: 260, mid: 240, updatedAt: '2026-08-17T00:00:00Z', source: 'Fixture' },
    IT_CIC: { marketId: 'IT_CIC', bid: 360, offer: 390, mid: 375, updatedAt: '2026-08-17T00:00:00Z', source: 'Fixture' },
    UK_RTFO: { marketId: 'UK_RTFO', bid: 0.25, offer: 0.27, mid: 0.26, updatedAt: '2026-08-17T00:00:00Z', source: 'Fixture' },
  },
  gasIndex: { bid: 28.00, offer: 29.00, mid: 28.50, updatedAt: '2026-08-17T00:00:00Z' },
  fx: { gbpEur: 1.18, chfEur: 1.06, updatedAt: '2026-08-17T00:00:00Z' },
  pricingSides: { certificateSide: 'bid', moleculeSide: 'bid' },
};

describe('Empirical Challenger 2 — Regulatory Boundary Conditions & Mathematical Stress Suite', () => {

  // =========================================================================
  // 1. NON-EU GRID INJECTION (UK GB GRID, SWISS GRID) UDB BOUNDARY HARD BLOCK
  // =========================================================================
  describe('Requirement 1: Non-EU Grid Injection (UK GB, Swiss CH) UDB Boundary Enforcement', () => {
    
    it('Strictly HARD_BLOCKs non-EU grid injection (UK GB grid) from all EU UDB compliance markets', () => {
      const ukGridConsignment: Consignment = {
        ...REFERENCE_CONSIGNMENTS.UK_FOOD_WASTE,
        injectionCountry: 'GB',
        injectionIsEU: false,
        udbStatus: 'NOT_RECORDED',
        certificationScheme: 'ISCC_EU', // Even with EU-recognised scheme!
        chainOfCustody: 'MASS_BALANCE',
      };

      const euUdbMarkets = MARKETS.filter(m => m.requiresUDB);
      expect(euUdbMarkets.length).toBeGreaterThan(15);

      for (const market of euUdbMarkets) {
        const assessment = evaluateEligibility(ukGridConsignment, market);
        expect(assessment.overallVerdict).toBe('HARD_BLOCK');
        expect(assessment.blockingGate).toBe('UDB_RECORDING');
        
        const udbGate = assessment.gates.find(g => g.gate === 'UDB_RECORDING');
        expect(udbGate?.verdict).toBe('HARD_BLOCK');
        expect(udbGate?.reason).toContain('non-EU gas grid (GB)');
        expect(udbGate?.reason).toContain('Union Database operates within the EU regulatory perimeter only');
      }
    });

    it('Strictly HARD_BLOCKs Swiss grid injection (CH grid) from EU UDB compliance markets', () => {
      const swissGridConsignment: Consignment = {
        ...REFERENCE_CONSIGNMENTS.DANISH_MANURE,
        id: 'swiss_grid_manure',
        originCountry: 'CH',
        injectionCountry: 'CH',
        injectionIsEU: false,
        udbStatus: 'NOT_RECORDED',
        certificationScheme: 'REDCERT_EU',
        chainOfCustody: 'MASS_BALANCE',
      };

      const deMarket = getMarketById('DE_THG')!;
      const frMarket = getMarketById('FR_CPB')!;
      const nlMarket = getMarketById('NL_ERE')!;

      const deAssessment = evaluateEligibility(swissGridConsignment, deMarket);
      const frAssessment = evaluateEligibility(swissGridConsignment, frMarket);
      const nlAssessment = evaluateEligibility(swissGridConsignment, nlMarket);

      expect(deAssessment.overallVerdict).toBe('HARD_BLOCK');
      expect(frAssessment.overallVerdict).toBe('HARD_BLOCK');
      expect(nlAssessment.overallVerdict).toBe('HARD_BLOCK');

      expect(deAssessment.gates.find(g => g.gate === 'UDB_RECORDING')?.verdict).toBe('HARD_BLOCK');
    });

    it('Allows domestic UK gas to clear UK RTFO and voluntary Scope 1 without EU UDB block', () => {
      const ukConsignment = REFERENCE_CONSIGNMENTS.UK_FOOD_WASTE;
      const ukRtfoMarket = getMarketById('UK_RTFO')!;
      const volMarket = getMarketById('VOL_SCOPE1')!;

      const rtfoAssessment = evaluateEligibility(ukConsignment, ukRtfoMarket);
      const volAssessment = evaluateEligibility(ukConsignment, volMarket);

      // UK RTFO and Voluntary do not require EU UDB
      expect(rtfoAssessment.gates.find(g => g.gate === 'UDB_RECORDING')?.verdict).toBe('PASS');
      expect(volAssessment.gates.find(g => g.gate === 'UDB_RECORDING')?.verdict).toBe('PASS');
      expect(rtfoAssessment.overallVerdict).not.toBe('HARD_BLOCK');
      expect(volAssessment.overallVerdict).toBe('ELIGIBLE');
    });

    it('Properly differentiates EU grid injection status (RECORDED vs PENDING vs NOT_RECORDED)', () => {
      const recordedConsignment: Consignment = {
        ...REFERENCE_CONSIGNMENTS.DANISH_MANURE,
        injectionIsEU: true,
        udbStatus: 'RECORDED',
      };
      const pendingConsignment: Consignment = {
        ...REFERENCE_CONSIGNMENTS.DANISH_MANURE,
        injectionIsEU: true,
        udbStatus: 'PENDING',
      };
      const notRecordedConsignment: Consignment = {
        ...REFERENCE_CONSIGNMENTS.DANISH_MANURE,
        injectionIsEU: true,
        udbStatus: 'NOT_RECORDED',
      };

      const frMarket = getMarketById('FR_CPB')!;

      const recResult = evaluateEligibility(recordedConsignment, frMarket);
      const penResult = evaluateEligibility(pendingConsignment, frMarket);
      const notResult = evaluateEligibility(notRecordedConsignment, frMarket);

      expect(recResult.gates.find(g => g.gate === 'UDB_RECORDING')?.verdict).toBe('PASS');
      expect(penResult.gates.find(g => g.gate === 'UDB_RECORDING')?.verdict).toBe('CONDITIONAL');
      expect(notResult.gates.find(g => g.gate === 'UDB_RECORDING')?.verdict).toBe('CONDITIONAL');
    });
  });

  // =========================================================================
  // 2. FRENCH CPB PRICE CEILING CLAMPING AT €100.00/MWH
  // =========================================================================
  describe('Requirement 2: French CPB Statutory Ceiling Clamping (€100.00/MWh)', () => {
    
    it('Strictly caps French CPB marks above €100.00/MWh at €100.00/MWh across all pricing sides', () => {
      const consignment = REFERENCE_CONSIGNMENTS.DANISH_MANURE;
      const frCpb = getMarketById('FR_CPB')!;

      const highMarks: MarksState = {
        ...baseMarks,
        marks: {
          ...baseMarks.marks,
          FR_CPB: {
            marketId: 'FR_CPB',
            bid: 100.01,
            offer: 150.00,
            mid: 125.00,
            updatedAt: '2026-08-17T00:00:00Z',
            source: 'Fixture',
          },
        },
      };

      // Test Bid side (100.01 -> 100.00 capped)
      const certBid = computeCertificateValue(frCpb, consignment, highMarks, 'bid');
      expect(certBid?.valueEurPerMWh).toBe(100.00);
      expect(certBid?.capped).toBe(true);
      expect(certBid?.capReason).toContain('€100/MWh');
      expect(certBid?.calculation).toContain('CAPPED at €100/MWh');

      // Test Mid side (125.00 -> 100.00 capped)
      const certMid = computeCertificateValue(frCpb, consignment, highMarks, 'mid');
      expect(certMid?.valueEurPerMWh).toBe(100.00);
      expect(certMid?.capped).toBe(true);

      // Test Offer side (150.00 -> 100.00 capped)
      const certOffer = computeCertificateValue(frCpb, consignment, highMarks, 'offer');
      expect(certOffer?.valueEurPerMWh).toBe(100.00);
      expect(certOffer?.capped).toBe(true);
    });

    it('Does not cap French CPB marks at or below €100.00/MWh', () => {
      const consignment = REFERENCE_CONSIGNMENTS.DANISH_MANURE;
      const frCpb = getMarketById('FR_CPB')!;

      const boundaryMarks: MarksState = {
        ...baseMarks,
        marks: {
          ...baseMarks.marks,
          FR_CPB: {
            marketId: 'FR_CPB',
            bid: 99.99,
            offer: 100.00,
            mid: 99.995,
            updatedAt: '2026-08-17T00:00:00Z',
            source: 'Fixture',
          },
        },
      };

      const certBid = computeCertificateValue(frCpb, consignment, boundaryMarks, 'bid');
      expect(certBid?.valueEurPerMWh).toBe(99.99);
      expect(certBid?.capped).toBe(false);
      expect(certBid?.capReason).toBeNull();

      const certOffer = computeCertificateValue(frCpb, consignment, boundaryMarks, 'offer');
      expect(certOffer?.valueEurPerMWh).toBe(100.00);
      expect(certOffer?.capped).toBe(false);
    });

    it('Fuzz test French CPB ceiling with extreme values (up to €1,000,000/MWh)', () => {
      const consignment = REFERENCE_CONSIGNMENTS.DANISH_MANURE;
      const frCpb = getMarketById('FR_CPB')!;

      const extremeTestPrices = [100.001, 101, 150, 200, 500, 1000, 50000, 1000000];
      for (const price of extremeTestPrices) {
        const testMarks: MarksState = {
          ...baseMarks,
          marks: {
            FR_CPB: { marketId: 'FR_CPB', bid: price, offer: price, mid: price, updatedAt: '2026-08-17T00:00:00Z', source: 'Fixture' },
          },
        };
        const cert = computeCertificateValue(frCpb, consignment, testMarks, 'bid');
        expect(cert?.valueEurPerMWh).toBe(100.00);
        expect(cert?.capped).toBe(true);

        const nb = computeNetback(frCpb, consignment, testMarks, zeroCosts, 'bid');
        expect(nb.certificateValue?.valueEurPerMWh).toBe(100.00);
        expect(nb.netNetback).toBe(100.00 + (testMarks.gasIndex.bid ?? 0));
      }
    });
  });

  // =========================================================================
  // 3. VOLUNTARY SCHEMES (ISCC PLUS, REDCERT2) ON COMPLIANCE MARKETS
  // =========================================================================
  describe('Requirement 3: Voluntary Scheme Restriction (ISCC PLUS, REDcert2)', () => {
    
    it('Strictly HARD_BLOCKs ISCC PLUS on all compliance markets, while allowing on VOL_SCOPE1', () => {
      const isccPlusConsignment: Consignment = {
        ...REFERENCE_CONSIGNMENTS.DANISH_MANURE,
        certificationScheme: 'ISCC_PLUS',
      };

      const complianceMarkets = MARKETS.filter(m => m.id !== 'VOL_SCOPE1');
      for (const market of complianceMarkets) {
        const assessment = evaluateEligibility(isccPlusConsignment, market);
        expect(assessment.overallVerdict).toBe('HARD_BLOCK');
        expect(assessment.blockingGate).toBe('SCHEME_RECOGNITION');
        
        const gate = assessment.gates.find(g => g.gate === 'SCHEME_RECOGNITION');
        expect(gate?.verdict).toBe('HARD_BLOCK');
        expect(gate?.reason).toContain('ISCC PLUS is a voluntary sustainability scheme for non-energy markets');
        expect(gate?.reason).toContain('NOT recognised by the European Commission under RED III');
      }

      // Voluntary scope 1 accepts ISCC PLUS
      const volMarket = getMarketById('VOL_SCOPE1')!;
      const volAssessment = evaluateEligibility(isccPlusConsignment, volMarket);
      expect(volAssessment.overallVerdict).toBe('ELIGIBLE');
      expect(volAssessment.gates.find(g => g.gate === 'SCHEME_RECOGNITION')?.verdict).toBe('PASS');
    });

    it('Strictly HARD_BLOCKs REDcert2 on all compliance markets, while allowing on VOL_SCOPE1', () => {
      const redcert2Consignment: Consignment = {
        ...REFERENCE_CONSIGNMENTS.DANISH_MANURE,
        certificationScheme: 'REDCERT2',
      };

      const complianceMarkets = MARKETS.filter(m => m.id !== 'VOL_SCOPE1');
      for (const market of complianceMarkets) {
        const assessment = evaluateEligibility(redcert2Consignment, market);
        expect(assessment.overallVerdict).toBe('HARD_BLOCK');
        expect(assessment.blockingGate).toBe('SCHEME_RECOGNITION');

        const gate = assessment.gates.find(g => g.gate === 'SCHEME_RECOGNITION');
        expect(gate?.verdict).toBe('HARD_BLOCK');
        expect(gate?.reason).toContain('REDcert² is designed for sustainable materials in the chemical and food industries');
      }

      // Voluntary scope 1 accepts REDcert2
      const volMarket = getMarketById('VOL_SCOPE1')!;
      const volAssessment = evaluateEligibility(redcert2Consignment, volMarket);
      expect(volAssessment.overallVerdict).toBe('ELIGIBLE');
    });

    it('Permits all recognized compliance schemes (ISCC EU, REDcert EU, 2BSvs, KZR INiG)', () => {
      const recognizedSchemes = ['ISCC_EU', 'REDCERT_EU', '2BSVS', 'KZR_INIG'] as const;
      const complianceMarkets = MARKETS.filter(m => m.id !== 'VOL_SCOPE1' && m.status === 'ACTIVE');

      for (const scheme of recognizedSchemes) {
        const consignment: Consignment = {
          ...REFERENCE_CONSIGNMENTS.DANISH_MANURE,
          certificationScheme: scheme,
        };

        for (const market of complianceMarkets) {
          const gate = evaluateEligibility(consignment, market).gates.find(g => g.gate === 'SCHEME_RECOGNITION');
          expect(gate?.verdict).toBe('PASS');
        }
      }
    });
  });

  // =========================================================================
  // 4. BOOK & CLAIM HARD_BLOCK FOR TRANSPORT AND FUELEU MARKETS
  // =========================================================================
  describe('Requirement 4: Book & Claim Prohibition for Transport, FuelEU and Compliance Markets', () => {
    
    it('Strictly HARD_BLOCKs Book & Claim for FuelEU Maritime and transport compliance markets', () => {
      const bcConsignment: Consignment = {
        ...REFERENCE_CONSIGNMENTS.DANISH_MANURE,
        chainOfCustody: 'BOOK_AND_CLAIM',
      };

      const nonBcMarkets = MARKETS.filter(m => !m.acceptsBookAndClaim);
      expect(nonBcMarkets.length).toBeGreaterThan(15);

      for (const market of nonBcMarkets) {
        const assessment = evaluateEligibility(bcConsignment, market);
        expect(assessment.overallVerdict).toBe('HARD_BLOCK');
        expect(assessment.blockingGate).toBe('CHAIN_OF_CUSTODY');

        const cocGate = assessment.gates.find(g => g.gate === 'CHAIN_OF_CUSTODY');
        expect(cocGate?.verdict).toBe('HARD_BLOCK');
        expect(cocGate?.reason).toContain('Book-and-claim chain of custody does not meet RED III requirements');
      }
    });

    it('Permits Book & Claim on designated GO and Voluntary markets', () => {
      const bcConsignment: Consignment = {
        ...REFERENCE_CONSIGNMENTS.DANISH_MANURE,
        chainOfCustody: 'BOOK_AND_CLAIM',
      };

      const bcAllowedMarkets = MARKETS.filter(m => m.acceptsBookAndClaim);
      expect(bcAllowedMarkets.length).toBeGreaterThanOrEqual(1);

      for (const market of bcAllowedMarkets) {
        const assessment = evaluateEligibility(bcConsignment, market);
        const cocGate = assessment.gates.find(g => g.gate === 'CHAIN_OF_CUSTODY');
        expect(cocGate?.verdict).toBe('PASS');
      }
    });

    it('Permits MASS_BALANCE and SEGREGATION across all compliance markets', () => {
      const mbConsignment: Consignment = {
        ...REFERENCE_CONSIGNMENTS.DANISH_MANURE,
        chainOfCustody: 'MASS_BALANCE',
      };
      const segConsignment: Consignment = {
        ...REFERENCE_CONSIGNMENTS.DANISH_MANURE,
        chainOfCustody: 'SEGREGATION',
      };

      for (const market of MARKETS) {
        const mbGate = evaluateEligibility(mbConsignment, market).gates.find(g => g.gate === 'CHAIN_OF_CUSTODY');
        const segGate = evaluateEligibility(segConsignment, market).gates.find(g => g.gate === 'CHAIN_OF_CUSTODY');
        expect(mbGate?.verdict).toBe('PASS');
        expect(segGate?.verdict).toBe('PASS');
      }
    });
  });

  // =========================================================================
  // 5. GERMAN THG UNCERTAINTY BRANCHES & MANURE NEGATIVE CI PRESERVATION
  // =========================================================================
  describe('Requirement 5: German THG Multiplier Branches & Negative CI Preservation ($e_{am}$)', () => {
    
    it('Preserves manure negative CI credits ($e_{am}$) without truncation across wide CI spectrum', () => {
      // Precision test: (94 - ci) * 3600 / 1,000,000
      expect(tCO2ePerMWh(-150)).toBeCloseTo((244 * 3600) / 1_000_000, 6); // 0.8784
      expect(tCO2ePerMWh(-100)).toBeCloseTo((194 * 3600) / 1_000_000, 6); // 0.6984
      expect(tCO2ePerMWh(-80)).toBeCloseTo((174 * 3600) / 1_000_000, 6);  // 0.6264
      expect(tCO2ePerMWh(-50)).toBeCloseTo((144 * 3600) / 1_000_000, 6);  // 0.5184
      expect(tCO2ePerMWh(0)).toBeCloseTo((94 * 3600) / 1_000_000, 6);     // 0.3384
      expect(tCO2ePerMWh(20)).toBeCloseTo((74 * 3600) / 1_000_000, 6);    // 0.2664
    });

    it('Calculates baseline 1x certificate value and 2x double counting branch for DE_THG compliance >= 2026', () => {
      const deMarket = getMarketById('DE_THG')!;
      const testManureConsignment: Consignment = {
        ...REFERENCE_CONSIGNMENTS.DANISH_MANURE,
        carbonIntensity: -100, // 0.6984 tCO2e/MWh
        deliveryPeriod: {
          type: 'CALENDAR',
          startDate: '2026-01-01',
          endDate: '2026-12-31',
          complianceYear: 2026,
        },
      };

      const testMarks: MarksState = {
        ...baseMarks,
        marks: {
          DE_THG: { marketId: 'DE_THG', bid: 300, offer: 300, mid: 300, updatedAt: '2026-08-17T00:00:00Z', source: 'Fixture' },
        },
      };

      const nb = computeNetback(deMarket, testManureConsignment, testMarks, zeroCosts, 'bid');

      // Baseline cert value: 0.6984 * 300 = 209.52 EUR/MWh
      expect(nb.certificateValue?.valueEurPerMWh).toBe(209.52);

      // Uncertainty branches must be present
      expect(nb.uncertaintyBranches).toBeDefined();
      expect(nb.uncertaintyBranches?.length).toBe(2);

      const branch1x = nb.uncertaintyBranches![0];
      const branch2x = nb.uncertaintyBranches![1];

      expect(branch1x.branchId).toBe('DC_OFF');
      expect(branch1x.certificateValue?.valueEurPerMWh).toBe(209.52);

      expect(branch2x.branchId).toBe('DC_ON');
      expect(branch2x.certificateValue?.valueEurPerMWh).toBe(419.04); // Exactly 209.52 * 2

      // Valuation range
      expect(nb.valuationRange).toBeDefined();
      expect(nb.valuationRange?.low).toBe(209.52 + (testMarks.gasIndex.bid ?? 0));
      expect(nb.valuationRange?.high).toBe(419.04 + (testMarks.gasIndex.bid ?? 0));
      expect(nb.valuationRange?.deltaPerMwh).toBe(209.52);
    });

    it('Applies single 2x multiplier directly when complianceYear <= 2025 (pre-2026 regime)', () => {
      const deMarket = getMarketById('DE_THG')!;
      const pre2026Consignment: Consignment = {
        ...REFERENCE_CONSIGNMENTS.DANISH_MANURE,
        carbonIntensity: -100,
        deliveryPeriod: {
          type: 'CALENDAR',
          startDate: '2025-01-01',
          endDate: '2025-12-31',
          complianceYear: 2025,
        },
      };

      const testMarks: MarksState = {
        ...baseMarks,
        marks: {
          DE_THG: { marketId: 'DE_THG', bid: 300, offer: 300, mid: 300, updatedAt: '2026-08-17T00:00:00Z', source: 'Fixture' },
        },
      };

      const nb = computeNetback(deMarket, pre2026Consignment, testMarks, zeroCosts, 'bid');

      // Pre-2026 automatically applies 2x for Annex IX-A manure
      expect(nb.certificateValue?.valueEurPerMWh).toBe(419.04);
      expect(nb.uncertaintyBranches).toBeNull(); // No uncertainty branches for <= 2025
    });
  });

  // =========================================================================
  // 6. FUELEU DEFICIT CLOSURE FORMULA & PENALTY MULTIPLIER SCALING
  // =========================================================================
  describe('Requirement 6: FuelEU Deficit Closure Model & Consecutive Year Penalty Multiplier Scaling', () => {

    it('Accurately calculates penalty multipliers across consecutive non-compliance years', () => {
      // Reg (EU) 2023/1805: multiplier = 1 + (consecutiveYears - 1) / 10
      const calcMultiplier = (year: number) => 1 + Math.max(0, (year - 1) / 10);

      expect(calcMultiplier(1)).toBeCloseTo(1.0, 5); // 0% escalation
      expect(calcMultiplier(2)).toBeCloseTo(1.1, 5); // +10% escalation
      expect(calcMultiplier(3)).toBeCloseTo(1.2, 5); // +20% escalation
      expect(calcMultiplier(4)).toBeCloseTo(1.3, 5); // +30% escalation
      expect(calcMultiplier(5)).toBeCloseTo(1.4, 5); // +40% escalation
      expect(calcMultiplier(10)).toBeCloseTo(1.9, 5); // +90% escalation
    });

    it('Scales deficit closure value linearly with penalty multiplier for consecutive years', () => {
      const ci = -100;
      const shipActualCI = 91.16;
      const targetCI = FUELEU_TARGET_CI_2025; // 89.34

      const year1 = computeFuelEUDeficitClosureValue(ci, 1, targetCI, shipActualCI);
      const year2 = computeFuelEUDeficitClosureValue(ci, 2, targetCI, shipActualCI);
      const year3 = computeFuelEUDeficitClosureValue(ci, 3, targetCI, shipActualCI);
      const year4 = computeFuelEUDeficitClosureValue(ci, 4, targetCI, shipActualCI);

      // Base year 1: ~437.69 EUR/MWh
      expect(year1.valueEurPerMWh).toBeCloseTo(437.69, 1);
      
      // Consecutive years scale exactly with multiplier
      expect(year2.valueEurPerMWh).toBeCloseTo(year1.valueEurPerMWh * 1.1, 2);
      expect(year3.valueEurPerMWh).toBeCloseTo(year1.valueEurPerMWh * 1.2, 2);
      expect(year4.valueEurPerMWh).toBeCloseTo(year1.valueEurPerMWh * 1.3, 2);
    });

    it('Reflects tighter 2030 target (85.69 gCO2e/MJ) compared to 2025 target (89.34 gCO2e/MJ)', () => {
      const ci = -25;
      const shipActualCI = 91.16;

      const val2025 = computeFuelEUDeficitClosureValue(ci, 1, FUELEU_TARGET_CI_2025, shipActualCI);
      const val2030 = computeFuelEUDeficitClosureValue(ci, 1, FUELEU_TARGET_CI_2030, shipActualCI);

      // ΔCI is smaller under 2030 target (85.69 - (-25) = 110.69 vs 89.34 - (-25) = 114.34)
      expect(val2030.valueEurPerMWh).toBeLessThan(val2025.valueEurPerMWh);
      expect(val2025.valueEurPerMWh).toBeCloseTo(264.33, 1);
      expect(val2030.valueEurPerMWh).toBeCloseTo(255.89, 1);
    });

    it('Guards against zero, negative, and invalid ship actual CI values', () => {
      const resZero = computeFuelEUDeficitClosureValue(-100, 1, FUELEU_TARGET_CI_2025, 0);
      expect(resZero.valueEurPerMWh).toBe(0);
      expect(resZero.calculation).toContain('must be positive');

      const resNeg = computeFuelEUDeficitClosureValue(-100, 1, FUELEU_TARGET_CI_2025, -91.16);
      expect(resNeg.valueEurPerMWh).toBe(0);
      expect(resNeg.calculation).toContain('must be positive');
    });

    it('Returns zero credit when bio-fuel CI equals or exceeds target CI', () => {
      // Exactly equal to target CI
      const resEqual = computeFuelEUDeficitClosureValue(89.34, 1, FUELEU_TARGET_CI_2025, 91.16);
      expect(resEqual.valueEurPerMWh).toBe(0);
      expect(resEqual.calculation).toContain('Generates no compliance credit');

      // Higher than target CI
      const resHigher = computeFuelEUDeficitClosureValue(95.00, 1, FUELEU_TARGET_CI_2025, 91.16);
      expect(resHigher.valueEurPerMWh).toBe(0);
      expect(resHigher.calculation).toContain('Generates no compliance credit');
    });
  });

});
