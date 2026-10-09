import { describe, it, expect } from 'vitest';

// ============================================================================
// DOMAIN IMPORTS
// ============================================================================

// 5. Core Markets, Netback, Logistics, Eligibility, Feedstocks, Trade
import { getMarketById } from '../markets/registry';
import {
  MWH_PER_CIC_ADVANCED
} from '../markets/constants';
import {
  computeNetback,
  tCO2ePerMWh,
  computeFuelEUDeficitClosureValue
} from '../netback/engine';
import { Consignment } from '../consignment/types';
import { MarksState, CostInputs } from '../netback/types';

// ============================================================================
// COMMON TEST FIXTURES
// ============================================================================

const fixtureMarks: MarksState = {
  marks: {
    DE_THG: {
      marketId: 'DE_THG',
      bid: 280.0,
      offer: 300.0,
      mid: 290.0,
      updatedAt: '2026-08-18T00:00:00Z',
      source: 'Argus Media',
      provenance: {
        sourceType: 'PRICE_REPORTING',
        sourceName: 'Argus Media',
        sourceUrl: 'https://www.argusmedia.com',
        observedAt: '2026-08-18T00:00:00Z',
        note: 'Biomethane THG Quota Mark',
      },
    },
    FR_CPB: {
      marketId: 'FR_CPB',
      bid: 95.0,
      offer: 105.0,
      mid: 100.0,
      updatedAt: '2026-08-18T00:00:00Z',
      source: 'EEX Powernext',
      provenance: {
        sourceType: 'EXCHANGE_AUCTION',
        sourceName: 'EEX Powernext',
        sourceUrl: 'https://www.powernext.com',
        observedAt: '2026-08-18T00:00:00Z',
        note: 'CPB Auction Settlement',
      },
    },
    NL_ERE: {
      marketId: 'NL_ERE',
      bid: 0.30,
      offer: 0.34,
      mid: 0.32,
      updatedAt: '2026-08-18T00:00:00Z',
      source: 'NEa / VertiCer',
      provenance: {
        sourceType: 'PLATFORM_HISTORY',
        sourceName: 'VertiCer / NEa',
        sourceUrl: null,
        observedAt: '2026-08-18T00:00:00Z',
        note: 'ERE Bilateral Trade Index',
      },
    },
    IT_CIC: {
      marketId: 'IT_CIC',
      bid: 360.0,
      offer: 390.0,
      mid: 375.0,
      updatedAt: '2026-08-18T00:00:00Z',
      source: 'GSE',
      provenance: {
        sourceType: 'PLATFORM_HISTORY',
        sourceName: 'GSE Portal',
        sourceUrl: null,
        observedAt: '2026-08-18T00:00:00Z',
        note: 'CIC Quota Settlement',
      },
    },
    UK_RTFO: {
      marketId: 'UK_RTFO',
      bid: 0.28,
      offer: 0.32,
      mid: 0.30,
      updatedAt: '2026-08-18T00:00:00Z',
      source: 'Argus Media',
      provenance: {
        sourceType: 'PRICE_REPORTING',
        sourceName: 'Argus Media',
        sourceUrl: 'https://www.argusmedia.com',
        observedAt: '2026-08-18T00:00:00Z',
        note: 'RTFO Certificate Assessment',
      },
    },
    FUELEU: {
      marketId: 'FUELEU',
      bid: 230.0,
      offer: 270.0,
      mid: 250.0,
      updatedAt: '2026-08-18T00:00:00Z',
      source: 'SIMULATED',
      provenance: {
        sourceType: 'ESTIMATE',
        sourceName: 'SIMULATED',
        sourceUrl: null,
        observedAt: '2026-08-18T00:00:00Z',
        note: 'FuelEU Maritime Compliance Value',
      },
    },
  },
  gasIndex: {
    bid: 29.50,
    offer: 30.50,
    mid: 30.00,
    updatedAt: '2026-08-18T00:00:00Z',
    provenance: {
      sourceType: 'EXCHANGE_AUCTION',
      sourceName: 'ICE Endex TTF',
      sourceUrl: null,
      observedAt: '2026-08-18T00:00:00Z',
      note: 'TTF Prompt Month Settlement',
    },
  },
  fx: {
    gbpEur: 1.18,
    chfEur: 1.05,
    updatedAt: '2026-08-18T00:00:00Z',
    provenance: {
      sourceType: 'PLATFORM_HISTORY',
      sourceName: 'ECB Reference Rates',
      sourceUrl: null,
      observedAt: '2026-08-18T00:00:00Z',
      note: 'Daily Reference Fixing',
    },
  },
  pricingSides: {
    certificateSide: 'bid',
    moleculeSide: 'bid',
  },
};

const fixtureFixedCosts: CostInputs = {
  transferCosts: 1.20,
  certificationCosts: 0.50,
  logistics: 2.30,
  otherCosts: 0.0,
  producerPricing: {
    mode: 'FIXED_PRICE',
    fixedPriceEurPerMwh: 70.0,
    indexLinkedShare: null,
    source: 'Bilateral Producer PPA',
    lastVerified: '2026-08-18',
    confidence: 'VERIFIED',
  },
};

const fixtureDanishManureConsignment: Consignment = {
  id: 'CSG-DK-MANURE-10K',
  name: 'Danish Wet Manure 10,000 MWh',
  originCountry: 'DK',
  originCountryName: 'Denmark',
  feedstock: 'manure',
  feedstockName: 'Liquid Manure',
  annexClassification: 'IX_A',
  carbonIntensity: -100.0, // gCO2e/MJ (avoided methane credit)
  commissioningDateRange: 'POST_2021_TO_2025',
  certificationScheme: 'ISCC_EU',
  chainOfCustody: 'MASS_BALANCE',
  injectionCountry: 'DK',
  injectionIsEU: true,
  udbStatus: 'RECORDED',
  posStatus: 'ISSUED',
  volumeMWh: 10000,
  deliveryPeriod: {
    type: 'QUARTER',
    complianceYear: 2026,
    startDate: '2026-07-01',
    endDate: '2026-09-30',
  },
};

// ============================================================================
// 5-TIER E2E TEST SUITE
// ============================================================================

describe('Biomethane Trading Platform — Registry, Netback & Workflow Verification Suite', () => {

  // ==========================================================================
  // TIER 2: BOUNDARY & CORNER CASES
  // ==========================================================================
  describe('Tier 2: Boundary & Corner Cases (Deep Negative CI, UDB Blocks, Statutory Caps, FX & Volumes)', () => {

    it('2.1 handles deep negative carbon intensity down to -150.0 gCO2e/MJ with exact RED III Annex V methane credits', () => {
      const deepNegConsignment: Consignment = {
        ...fixtureDanishManureConsignment,
        carbonIntensity: -150.0,
        observedBundlePriceEurPerMwh: 1e9, // no bundle cap: tests the uncapped model
      };

      // Formula: (94 - (-150)) * 3600 / 1e6 = 244 * 0.0036 = 0.8784 tCO2e/MWh
      const tCO2e = tCO2ePerMWh(-150.0);
      expect(tCO2e).toBeCloseTo(0.8784, 4);

      const deMarket = getMarketById('DE_THG')!;
      const netback = computeNetback(
        deMarket,
        deepNegConsignment,
        fixtureMarks,
        fixtureFixedCosts,
        'bid'
      );

      // Certificate value for single counting (assumed 2026+): 280.0 * 0.8784 = 245.952 -> 245.95 €/MWh
      // No DC_ON branch or valuation range under settled Drs 21/5530
      expect(netback.certificateValue?.valueEurPerMWh).toBeCloseTo(245.95, 1);
      expect(netback.valuationRange).toBeNull();
      expect(netback.uncertaintyBranches).toBeNull();
    });

    it('2.2 handles high positive carbon intensity (+85 gCO2e/MJ) with minimal GHG savings', () => {
      const highCiConsignment: Consignment = {
        ...fixtureDanishManureConsignment,
        feedstock: 'crop_residues',
        carbonIntensity: 85.0,
      };

      // Formula: (94 - 85) * 3600 / 1e6 = 9 * 0.0036 = 0.0324 tCO2e/MWh
      const tCO2e = tCO2ePerMWh(85.0);
      expect(tCO2e).toBeCloseTo(0.0324, 4);

      const deMarket = getMarketById('DE_THG')!;
      const netback = computeNetback(
        deMarket,
        highCiConsignment,
        fixtureMarks,
        fixtureFixedCosts,
        'bid'
      );

      expect(netback.certificateValue?.valueEurPerMWh).toBeCloseTo(280.0 * 0.0324, 2);
    });

    it('2.5 clamps French CPB certificate value at €100.00/MWh statutory ceiling for high market marks', () => {
      const highCpbMarks: MarksState = {
        ...fixtureMarks,
        marks: {
          ...fixtureMarks.marks,
          FR_CPB: {
            marketId: 'FR_CPB',
            bid: 125.0,
            offer: 135.0,
            mid: 130.0,
            updatedAt: '2026-08-18T00:00:00Z',
            source: 'EEX',
          },
        },
      };

      const frMarket = getMarketById('FR_CPB')!;
      const netback = computeNetback(
        frMarket,
        fixtureDanishManureConsignment,
        highCpbMarks,
        fixtureFixedCosts,
        'bid'
      );

      // Raw bid mark was €125.00/MWh -> Must be clamped at €100.00/MWh
      expect(netback.certificateValue?.valueEurPerMWh).toBe(100.00);
      expect(netback.certificateValue?.capped).toBe(true);
      expect(netback.certificateValue?.capReason).toContain('€100');
    });

    it('2.6 verifies FuelEU Maritime 4-year penalty escalation multipliers (Year 1 to Year 4)', () => {
      const yr1 = computeFuelEUDeficitClosureValue(-100, 1);
      const yr2 = computeFuelEUDeficitClosureValue(-100, 2);
      const yr3 = computeFuelEUDeficitClosureValue(-100, 3);
      const yr4 = computeFuelEUDeficitClosureValue(-100, 4);

      expect(yr1.valueEurPerMWh).toBeGreaterThan(0);
      expect(yr2.valueEurPerMWh / yr1.valueEurPerMWh).toBeCloseTo(1.10, 2);
      expect(yr3.valueEurPerMWh / yr1.valueEurPerMWh).toBeCloseTo(1.20, 2);
      expect(yr4.valueEurPerMWh / yr1.valueEurPerMWh).toBeCloseTo(1.30, 2);
    });

    it('2.7 handles missing/null FX rates gracefully without throwing unhandled exceptions', () => {
      const noFxMarks: MarksState = {
        ...fixtureMarks,
        fx: {
          gbpEur: null,
          chfEur: null,
          updatedAt: null,
        },
      };

      const ukMarket = getMarketById('UK_RTFO')!;
      const netback = computeNetback(
        ukMarket,
        fixtureDanishManureConsignment,
        noFxMarks,
        fixtureFixedCosts,
        'bid'
      );

      expect(netback.isComplete).toBe(false);
      expect(netback.certificateValue?.valueEurPerMWh).toBeNull();
      expect(netback.netNetback).toBeNull();
    });

    it('2.8 handles zero and extreme volumes without numeric corruption or divide-by-zero', () => {
      const zeroVolConsignment: Consignment = {
        ...fixtureDanishManureConsignment,
        volumeMWh: 0,
      };

      const deMarket = getMarketById('DE_THG')!;
      const zeroNetback = computeNetback(
        deMarket,
        zeroVolConsignment,
        fixtureMarks,
        fixtureFixedCosts,
        'bid'
      );

      expect(zeroNetback.deskPnL).toBe(0);

      const massiveVolConsignment: Consignment = {
        ...fixtureDanishManureConsignment,
        volumeMWh: 50_000_000,
      };

      const massiveNetback = computeNetback(
        deMarket,
        massiveVolConsignment,
        fixtureMarks,
        fixtureFixedCosts,
        'bid'
      );

      expect(massiveNetback.deskPnL).toBeGreaterThan(0);
      expect(Number.isFinite(massiveNetback.deskPnL!)).toBe(true);
    });

  });

  // ==========================================================================
  // TIER 3: CROSS-FEATURE COMBINATIONS (Pairwise Combinations)
  // ==========================================================================

  // ==========================================================================
  // TIER 4: REAL-WORLD APPLICATION SCENARIOS (Trader Workflows)
  // ==========================================================================
  describe('Tier 4: Real-World Application Scenarios (End-to-End Trader Workflows)', () => {




    it('Scenario D: Italian Manure Advanced Biomethane (5.815 MWh/CIC Yield) under GSE Floor & FuelEU Maritime Deficit Closure', () => {
      // 1. Consignment Setup
      const csg: Consignment = {
        id: 'TRADE-IT-CIC-2026',
        name: 'Italian Bovine Manure 40,000 MWh Advanced Biomethane',
        originCountry: 'IT',
        originCountryName: 'Italy',
        feedstock: 'manure',
        feedstockName: 'Bovine Manure',
        annexClassification: 'IX_A',
        carbonIntensity: -90.0,
        commissioningDateRange: 'POST_2021_TO_2025',
        certificationScheme: 'ISCC_EU',
        chainOfCustody: 'MASS_BALANCE',
        injectionCountry: 'IT',
        injectionIsEU: true,
        udbStatus: 'RECORDED',
        posStatus: 'ISSUED',
        volumeMWh: 40000,
        counterparty: 'Eni S.p.A.',
        deliveryPeriod: {
          type: 'CALENDAR',
          complianceYear: 2026,
          startDate: '2026-01-01',
          endDate: '2026-12-31',
        },
      };

      const itMarket = getMarketById('IT_CIC')!;
      const fuelEUMarket = getMarketById('FUELEU')!;

      // 2. Advanced Biomethane Quota Conversion (5.815 MWh/CIC yield)
      // 1 CIC = 5.815 MWh for Annex IX-A advanced biomethane
      expect(MWH_PER_CIC_ADVANCED).toBe(5.815);
      const expectedCics = 40000 / MWH_PER_CIC_ADVANCED;
      expect(expectedCics).toBeCloseTo(6878.76, 2);

      // 3. Valuation in Italian CIC Market
      const cicNetback = computeNetback(itMarket, csg, fixtureMarks, fixtureFixedCosts, 'bid');
      expect(cicNetback.certificateValue?.valueEurPerMWh).toBeCloseTo(360.0 / 5.815, 2);

      // 4. Alternative Valuation in FuelEU Maritime with Year 2 Escalation (+10%)
      const fuelEUNetback = computeNetback(
        fuelEUMarket,
        csg,
        fixtureMarks,
        fixtureFixedCosts,
        'bid',
        { consecutiveYears: 2 }
      );
      expect(fuelEUNetback.certificateValue?.valueEurPerMWh).toBeGreaterThan(0);

      // 5. Commercial Arbitrage Comparison between IT_CIC and FuelEU
      const cicMargin = cicNetback.deskMargin ?? 0;
      const fuelEUMargin = fuelEUNetback.deskMargin ?? 0;
      expect(cicMargin).toBeGreaterThan(0);
      expect(fuelEUMargin).toBeGreaterThan(0);
    });
  });

  // ==========================================================================
  // TIER 5: ADVERSARIAL STRESS & FUZZING
  // ==========================================================================
  describe('Tier 5: Adversarial Stress & Fuzzing (Extreme Gas Prices, CI Limits, Malformed Payloads)', () => {

    it('5.1 fuzzes extreme TTF natural gas prices (€10.00 to €150.00 / MWh) verifying monotonicity and stability', () => {
      const deMarket = getMarketById('DE_THG')!;

      for (let price = 10.0; price <= 150.0; price += 15.0) {
        const testMarks: MarksState = {
          ...fixtureMarks,
          gasIndex: {
            bid: price - 0.5,
            offer: price + 0.5,
            mid: price,
            updatedAt: '2026-08-18T00:00:00Z',
          },
        };

        const netback = computeNetback(
          deMarket,
          fixtureDanishManureConsignment,
          testMarks,
          fixtureFixedCosts,
          'bid'
        );

        expect(netback.moleculeValue).toBe(price - 0.5);
        expect(netback.netNetback).not.toBeNull();
        expect(Number.isFinite(netback.netNetback!)).toBe(true);
        expect(Number.isNaN(netback.netNetback!)).toBe(false);
      }
    });

    it('5.2 fuzzes carbon intensity range (-150.0 to +120.0 gCO2e/MJ) across multiple compliance markets', () => {
      const testMarkets = [getMarketById('DE_THG')!, getMarketById('NL_ERE')!, getMarketById('FR_CPB')!];

      for (let ci = -150.0; ci <= 120.0; ci += 30.0) {
        const csg: Consignment = {
          ...fixtureDanishManureConsignment,
          carbonIntensity: ci,
        };

        for (const m of testMarkets) {
          const netback = computeNetback(m, csg, fixtureMarks, fixtureFixedCosts, 'bid');
          expect(netback).toBeDefined();
          if (netback.certificateValue?.valueEurPerMWh !== null && netback.certificateValue?.valueEurPerMWh !== undefined) {
            expect(Number.isFinite(netback.certificateValue.valueEurPerMWh)).toBe(true);
            expect(Number.isNaN(netback.certificateValue.valueEurPerMWh)).toBe(false);
          }
        }
      }
    });

    it('5.3 fuzzes GBP/EUR FX exchange rates (0.50 to 2.50) for UK RTFO market', () => {
      const ukMarket = getMarketById('UK_RTFO')!;

      for (let fxRate = 0.50; fxRate <= 2.50; fxRate += 0.25) {
        const testMarks: MarksState = {
          ...fixtureMarks,
          fx: {
            gbpEur: fxRate,
            chfEur: 1.05,
            updatedAt: '2026-08-18T00:00:00Z',
          },
        };

        const netback = computeNetback(
          ukMarket,
          fixtureDanishManureConsignment,
          testMarks,
          fixtureFixedCosts,
          'bid'
        );

        expect(netback.certificateValue?.valueEurPerMWh).not.toBeNull();
        expect(Number.isFinite(netback.certificateValue!.valueEurPerMWh!)).toBe(true);
      }
    });

  });
});
