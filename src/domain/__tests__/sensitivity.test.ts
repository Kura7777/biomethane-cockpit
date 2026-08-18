import { describe, it, expect } from 'vitest';
import {
  evaluateSensitivityScenario,
  runSensitivityMatrix,
  compareScenarios,
  SensitivityShockConfig,
  DEFAULT_SHOCK_CONFIG,
  BASE_CASE,
  TTF_BULL_20,
  TTF_BEAR_20,
  DE_DC_REPEAL_1X,
  UK_UDB_ACCORD,
  FR_CPB_CAP_SHIFT,
  FUELEU_YEAR_2,
  FX_STRESS_GBP,
  SENSITIVITY_PRESETS,
} from '../sensitivity';
import { getMarketById, MARKETS } from '../markets/registry';
import { REFERENCE_CONSIGNMENTS, FEEDSTOCK_REGISTRY } from '../consignment/feedstocks';
import { MarksState, CostInputs } from '../netback/types';
import { Consignment } from '../consignment/types';

describe('SENSITIVITY SIMULATOR — Multi-Branch What-If Engine', () => {
  const deMarket = getMarketById('DE_THG')!;
  const nlMarket = getMarketById('NL_ERE')!;
  const frMarket = getMarketById('FR_CPB')!;
  const ukMarket = getMarketById('UK_RTFO')!;
  const fuelEUMarket = getMarketById('FUELEU')!;

  const baseMarks: MarksState = {
    marks: {
      DE_THG: {
        marketId: 'DE_THG',
        bid: 250.0,
        offer: 260.0,
        mid: 255.0,
        updatedAt: '2026-08-15T10:00:00Z',
        source: 'Argus Biofuels',
        provenance: { sourceType: 'PRICE_REPORTING', sourceName: 'Argus Biofuels', observedAt: '2026-08-15', sourceUrl: null, note: null },
      },
      NL_ERE: {
        marketId: 'NL_ERE',
        bid: 0.12,
        offer: 0.14,
        mid: 0.13,
        updatedAt: '2026-08-15T10:00:00Z',
        source: 'Argus Biofuels',
        provenance: { sourceType: 'PRICE_REPORTING', sourceName: 'Argus Biofuels', observedAt: '2026-08-15', sourceUrl: null, note: null },
      },
      FR_CPB: {
        marketId: 'FR_CPB',
        bid: 95.0,
        offer: 105.0,
        mid: 100.0,
        updatedAt: '2026-08-15T10:00:00Z',
        source: 'Platts Biofuels',
        provenance: { sourceType: 'PRICE_REPORTING', sourceName: 'Platts Biofuels', observedAt: '2026-08-15', sourceUrl: null, note: null },
      },
      UK_RTFO: {
        marketId: 'UK_RTFO',
        bid: 0.35,
        offer: 0.37,
        mid: 0.36,
        updatedAt: '2026-08-15T10:00:00Z',
        source: 'Argus Biofuels',
        provenance: { sourceType: 'PRICE_REPORTING', sourceName: 'Argus Biofuels', observedAt: '2026-08-15', sourceUrl: null, note: null },
      },
      FUELEU: {
        marketId: 'FUELEU',
        bid: null,
        offer: null,
        mid: null,
        updatedAt: '2026-08-15T10:00:00Z',
        source: 'SIMULATED',
        provenance: { sourceType: 'ESTIMATE', sourceName: 'SIMULATED', observedAt: '2026-08-15', sourceUrl: null, note: null },
      },
    },
    gasIndex: {
      bid: 30.0,
      offer: 32.0,
      mid: 31.0,
      updatedAt: '2026-08-15T10:00:00Z',
    },
    fx: {
      gbpEur: 1.18,
      chfEur: 1.05,
      updatedAt: '2026-08-15T10:00:00Z',
    },
    pricingSides: {
      certificateSide: 'bid',
      moleculeSide: 'bid',
    },
  };

  const baseCosts: CostInputs = {
    transferCosts: 0.5,
    certificationCosts: 0.3,
    logistics: 1.2,
    otherCosts: 0.0,
    producerPricing: {
      mode: 'FIXED_PRICE',
      fixedPriceEurPerMwh: 120.0,
      indexLinkedShare: null,
      source: 'Internal deal contract',
      lastVerified: '2026-08-15',
      confidence: 'VERIFIED',
    },
  };

  const dkManureConsignment: Consignment = {
    id: 'CSG-DK-MANURE-01',
    name: 'Danish Biomethane Manure',
    originCountry: 'DK',
    originCountryName: 'Denmark',
    feedstock: 'manure',
    feedstockName: 'Liquid Manure',
    annexClassification: 'IX_A',
    carbonIntensity: -100.0,
    commissioningDateRange: 'POST_2021_TO_2025',
    certificationScheme: 'ISCC_EU',
    chainOfCustody: 'MASS_BALANCE',
    injectionCountry: 'DK',
    injectionIsEU: true,
    udbStatus: 'RECORDED',
    posStatus: 'ISSUED',
    volumeMWh: 100000,
    deliveryPeriod: {
      type: 'QUARTER',
      complianceYear: 2026,
      startDate: '2026-01-01',
      endDate: '2026-03-31',
    },
  };

  const ukManureConsignment: Consignment = {
    ...dkManureConsignment,
    id: 'CSG-UK-MANURE-01',
    name: 'UK Biomethane Manure',
    originCountry: 'GB',
    originCountryName: 'United Kingdom',
    injectionCountry: 'GB',
    injectionIsEU: false,
    udbStatus: 'NOT_RECORDED',
  };

  describe('1. TTF Gas Price Shocks (±10%, ±20%)', () => {
    it('evaluates +20% TTF bull shock with exact molecule and netback delta', () => {
      const shockConfig: SensitivityShockConfig = {
        ...DEFAULT_SHOCK_CONFIG,
        ttfPriceShockPercent: 20,
      };

      const result = evaluateSensitivityScenario(
        {
          consignment: dkManureConsignment,
          baseMarks,
          baseCosts,
          shockConfig,
        },
        deMarket
      );

      // Base TTF bid is 30.00. Shocked TTF (+20%) is 36.00. Delta = +6.00 €/MWh.
      expect(result.baseMoleculeValue).toBe(30.0);
      expect(result.shockedMoleculeValue).toBe(36.0);
      expect(result.moleculeDeltaEurPerMwh).toBe(6.0);
      expect(result.netbackDeltaEurPerMwh).toBe(6.0);
      expect(result.marginDeltaEurPerMwh).toBe(6.0);
      expect(result.notionalDeltaEur).toBe(600000); // 6.00 * 100,000 MWh
    });

    it('evaluates -20% TTF bear shock with exact negative delta', () => {
      const shockConfig: SensitivityShockConfig = {
        ...DEFAULT_SHOCK_CONFIG,
        ttfPriceShockPercent: -20,
      };

      const result = evaluateSensitivityScenario(
        {
          consignment: dkManureConsignment,
          baseMarks,
          baseCosts,
          shockConfig,
        },
        nlMarket
      );

      // Base TTF bid is 30.00. Shocked TTF (-20%) is 24.00. Delta = -6.00 €/MWh.
      expect(result.baseMoleculeValue).toBe(30.0);
      expect(result.shockedMoleculeValue).toBe(24.0);
      expect(result.moleculeDeltaEurPerMwh).toBe(-6.0);
      expect(result.netbackDeltaEurPerMwh).toBe(-6.0);
      expect(result.marginDeltaEurPerMwh).toBe(-6.0);
      expect(result.notionalDeltaEur).toBe(-600000);
    });

    it('evaluates +10% and -10% intermediate shocks accurately', () => {
      const plus10 = evaluateSensitivityScenario(
        {
          consignment: dkManureConsignment,
          baseMarks,
          baseCosts,
          shockConfig: { ...DEFAULT_SHOCK_CONFIG, ttfPriceShockPercent: 10 },
        },
        frMarket
      );
      expect(plus10.moleculeDeltaEurPerMwh).toBe(3.0);

      const minus10 = evaluateSensitivityScenario(
        {
          consignment: dkManureConsignment,
          baseMarks,
          baseCosts,
          shockConfig: { ...DEFAULT_SHOCK_CONFIG, ttfPriceShockPercent: -10 },
        },
        frMarket
      );
      expect(minus10.moleculeDeltaEurPerMwh).toBe(-3.0);
    });
  });

  describe('2. German THG Double-Counting Repeal (1× vs 2× branches)', () => {
    it('evaluates DC_OFF branch for Germany with single counting credit', () => {
      const result = evaluateSensitivityScenario(
        {
          consignment: dkManureConsignment,
          baseMarks,
          baseCosts,
          shockConfig: { ...DEFAULT_SHOCK_CONFIG, deDoubleCounting: 'DC_OFF' },
        },
        deMarket
      );

      // tCO2e for -100 CI = (94 - (-100)) * 3600 / 1e6 = 0.6984 tCO2e/MWh.
      // Base mark bid = 250.0.
      // DC_OFF cert value = 250 * 0.6984 = 174.60 €/MWh.
      // DC_ON cert value = 174.60 * 2 = 349.20 €/MWh.
      expect(result.shockedCertificateValue).toBe(174.6);
      expect(result.shockedNetback).toBeCloseTo(174.6 + 30.0 - 2.0, 1);
    });

    it('evaluates DC_ON branch for Germany with doubled quota value', () => {
      const result = evaluateSensitivityScenario(
        {
          consignment: dkManureConsignment,
          baseMarks,
          baseCosts,
          shockConfig: { ...DEFAULT_SHOCK_CONFIG, deDoubleCounting: 'DC_ON' },
        },
        deMarket
      );

      expect(result.shockedCertificateValue).toBe(349.2);
      expect(result.shockedNetback).toBeCloseTo(349.2 + 30.0 - 2.0, 1);
    });
  });

  describe('3. UK-EU UDB Interconnection Accord Toggle', () => {
    it('blocks UK origin consignment from EU markets in baseline without accord', () => {
      const result = evaluateSensitivityScenario(
        {
          consignment: ukManureConsignment,
          baseMarks,
          baseCosts,
          shockConfig: { ...DEFAULT_SHOCK_CONFIG, ukUdbRecognition: false },
        },
        deMarket
      );

      expect(result.baseEligibilityVerdict).toBe('HARD_BLOCK');
      expect(result.shockedEligibilityVerdict).toBe('HARD_BLOCK');
      expect(result.isBlocked).toBe(true);
      expect(result.isTradeable).toBe(false);
    });

    it('unlocks EU compliance markets when UK UDB recognition is enabled', () => {
      const result = evaluateSensitivityScenario(
        {
          consignment: ukManureConsignment,
          baseMarks,
          baseCosts,
          shockConfig: { ...DEFAULT_SHOCK_CONFIG, ukUdbRecognition: true },
        },
        deMarket
      );

      expect(result.baseEligibilityVerdict).toBe('HARD_BLOCK');
      // For DE_THG with complianceYear 2026, German gate is UNRESOLVED, which is tradeable but flagged
      expect(result.shockedEligibilityVerdict).toBe('UNRESOLVED');
      expect(result.verdictChanged).toBe(true);
      expect(result.isBlocked).toBe(false);
      expect(result.isTradeable).toBe(true);

      // For NL_ERE, UK UDB recognition gives ELIGIBLE
      const nlResult = evaluateSensitivityScenario(
        {
          consignment: ukManureConsignment,
          baseMarks,
          baseCosts,
          shockConfig: { ...DEFAULT_SHOCK_CONFIG, ukUdbRecognition: true },
        },
        nlMarket
      );
      expect(nlResult.shockedEligibilityVerdict).toBe('ELIGIBLE');
      expect(nlResult.isTradeable).toBe(true);
    });
  });

  describe('4. French CPB Statutory Ceiling Clamping', () => {
    it('clamps French CPB certificate value at adjusted €80/MWh ceiling', () => {
      const result = evaluateSensitivityScenario(
        {
          consignment: dkManureConsignment,
          baseMarks,
          baseCosts,
          shockConfig: { ...DEFAULT_SHOCK_CONFIG, frCpbCeilingEurMwh: 80 },
        },
        frMarket
      );

      // Base bid mark was 95.00. Shocked ceiling is 80.00.
      expect(result.baseCertificateValue).toBe(95.0);
      expect(result.shockedCertificateValue).toBe(80.0);
      expect(result.certificateDeltaEurPerMwh).toBe(-15.0);
    });
  });

  describe('5. FuelEU Maritime Consecutive Escalation (+10% / year)', () => {
    it('escalates deficit-closure penalty value under Year 2 consecutive non-compliance', () => {
      const baseRes = evaluateSensitivityScenario(
        {
          consignment: dkManureConsignment,
          baseMarks,
          baseCosts,
          shockConfig: { ...DEFAULT_SHOCK_CONFIG, fuelEUEscalationYears: 1 },
        },
        fuelEUMarket
      );

      const yr2Res = evaluateSensitivityScenario(
        {
          consignment: dkManureConsignment,
          baseMarks,
          baseCosts,
          shockConfig: { ...DEFAULT_SHOCK_CONFIG, fuelEUEscalationYears: 2 },
        },
        fuelEUMarket
      );

      expect(baseRes.shockedCertificateValue).not.toBeNull();
      expect(yr2Res.shockedCertificateValue).not.toBeNull();

      // Year 2 has 1.1x penalty multiplier -> 10% higher certificate avoidance value
      const expectedRatio = (yr2Res.shockedCertificateValue! / baseRes.shockedCertificateValue!);
      expect(expectedRatio).toBeCloseTo(1.1, 2);
      expect(yr2Res.certificateDeltaEurPerMwh).toBeGreaterThan(0);
    });
  });

  describe('6. FX Shock Stress Testing', () => {
    it('reduces UK RTFO value under -10% GBP depreciation', () => {
      const baseRes = evaluateSensitivityScenario(
        {
          consignment: dkManureConsignment,
          baseMarks,
          baseCosts,
          shockConfig: { ...DEFAULT_SHOCK_CONFIG, fxShockPercent: 0 },
        },
        ukMarket
      );

      const fxShockRes = evaluateSensitivityScenario(
        {
          consignment: dkManureConsignment,
          baseMarks,
          baseCosts,
          shockConfig: { ...DEFAULT_SHOCK_CONFIG, fxShockPercent: -10 },
        },
        ukMarket
      );

      expect(baseRes.baseCertificateValue).not.toBeNull();
      expect(fxShockRes.shockedCertificateValue).not.toBeNull();
      expect(fxShockRes.certificateDeltaEurPerMwh).toBeLessThan(0);
      // Value should be approximately 90% of base
      expect(fxShockRes.shockedCertificateValue! / baseRes.baseCertificateValue!).toBeCloseTo(0.9, 2);
    });
  });

  describe('7. Immutability, Single Pricing Authority & Matrix Aggregation', () => {
    it('preserves base marks and consignment state immutability', () => {
      const marksCopy = JSON.stringify(baseMarks);
      const csgCopy = JSON.stringify(dkManureConsignment);

      runSensitivityMatrix({
        consignment: dkManureConsignment,
        baseMarks,
        baseCosts,
        shockConfig: TTF_BULL_20.config,
      });

      expect(JSON.stringify(baseMarks)).toBe(marksCopy);
      expect(JSON.stringify(dkManureConsignment)).toBe(csgCopy);
    });

    it('runs multi-market sensitivity matrix with full coverage', () => {
      const matrix = runSensitivityMatrix({
        consignment: dkManureConsignment,
        baseMarks,
        baseCosts,
        shockConfig: TTF_BULL_20.config,
      });

      expect(matrix.marketResults.length).toBeGreaterThanOrEqual(10);
      expect(matrix.tradeableMarketsCount).toBeGreaterThan(0);
      expect(matrix.activeMarketsCount).toBe(matrix.marketResults.length);
      expect(matrix.averageNetbackDeltaEurPerMwh).toBe(6.0); // +20% TTF on 30.0 mark gives +6 everywhere
    });

    it('compares scenarios and correctly identifies best upside and downside corridors', () => {
      const comparison = compareScenarios(
        {
          consignment: dkManureConsignment,
          baseMarks,
          baseCosts,
          shockConfig: BASE_CASE.config,
        },
        {
          consignment: dkManureConsignment,
          baseMarks,
          baseCosts,
          shockConfig: {
            ...DEFAULT_SHOCK_CONFIG,
            ttfPriceShockPercent: 20,
            deDoubleCounting: 'DC_ON',
          },
        }
      );

      expect(comparison.marketResults.length).toBeGreaterThan(0);
      expect(comparison.bestUpsideMarket).not.toBeNull();
      expect(comparison.bestUpsideMarket?.marketId).toBe('DE_THG'); // DE THG gets +6 TTF AND 2x branch boost
      expect(comparison.maxNetbackDeltaEurPerMwh).toBeGreaterThan(6.0);
    });

    it('evaluates all standard sensitivity presets cleanly without error', () => {
      for (const preset of SENSITIVITY_PRESETS) {
        const matrix = runSensitivityMatrix({
          consignment: dkManureConsignment,
          baseMarks,
          baseCosts,
          shockConfig: preset.config,
        });

        expect(matrix.marketResults.length).toBeGreaterThan(0);
        for (const res of matrix.marketResults) {
          expect(res.marketId).toBeDefined();
          expect(typeof res.isTradeable).toBe('boolean');
          expect(res.shockSummary).toBeDefined();
        }
      }
    });
  });
});
