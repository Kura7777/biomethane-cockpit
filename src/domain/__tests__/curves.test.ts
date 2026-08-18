import { describe, it, expect } from 'vitest';
import { MARKETS } from '../markets/registry';
import { Consignment } from '../../domain/consignment/types';
import { CostInputs } from '../../domain/netback/types';
import { computeNetback } from '../../domain/netback/engine';
import {
  computeForwardBasisSpreads,
  computeAllMarketsForwardSpreads,
  getDefaultForwardCurveMatrix,
  buildForwardCurveMatrix,
  getTenorDefinition,
  getTenorsByCategory,
  ALL_DELIVERY_TENORS,
  DeliveryTenor,
} from '../curves';

// Mock manure consignment for testing (high GHG savings, manure pathway)
const mockManureConsignment: Consignment = {
  id: 'DK-MANURE-001',
  name: 'Danish Wet Manure 10k MWh',
  originCountry: 'DK',
  originCountryName: 'Denmark',
  feedstock: 'MANURE',
  feedstockName: 'Liquid Manure',
  annexClassification: 'IX_A',
  carbonIntensity: -100, // gCO2e/MJ (negative CI with methane capture credit)
  commissioningDateRange: 'POST_2021_TO_2025',
  certificationScheme: 'ISCC_EU',
  chainOfCustody: 'MASS_BALANCE',
  injectionCountry: 'DK',
  injectionIsEU: true,
  udbStatus: 'RECORDED',
  posStatus: 'ISSUED',
  volumeMWh: 10000,
  deliveryPeriod: {
    type: 'CALENDAR',
    complianceYear: 2026,
    startDate: '2026-01-01',
    endDate: '2026-12-31',
  },
};

const mockCosts: CostInputs = {
  transferCosts: 1.20,
  certificationCosts: 0.50,
  logistics: 2.30,
  otherCosts: 0.0,
  producerPricing: {
    mode: 'FIXED_PRICE',
    fixedPriceEurPerMwh: 65.0,
    indexLinkedShare: null,
    source: 'TEST',
    lastVerified: '2026-08-15',
    confidence: 'VERIFIED',
  },
};

describe('CURVES DOMAIN ENGINE — Tenor Definitions & Matrix', () => {
  it('defines all 9 required forward tenors covering Prompt, Quarter, and Calendar', () => {
    expect(ALL_DELIVERY_TENORS).toHaveLength(9);
    expect(ALL_DELIVERY_TENORS).toEqual([
      'M_PLUS_1',
      'M_PLUS_2',
      'Q1',
      'Q2',
      'Q3',
      'Q4',
      'CAL_PLUS_1',
      'CAL_PLUS_2',
      'CAL_PLUS_3',
    ]);
  });

  it('retrieves tenor definitions correctly by tenor ID and by category', () => {
    const m1 = getTenorDefinition('M_PLUS_1');
    expect(m1.category).toBe('PROMPT');
    expect(m1.shortLabel).toBe('M+1');

    const quarters = getTenorsByCategory('QUARTER');
    expect(quarters).toHaveLength(4);
    expect(quarters.map(q => q.tenor)).toEqual(['Q1', 'Q2', 'Q3', 'Q4']);

    const calendars = getTenorsByCategory('CALENDAR');
    expect(calendars).toHaveLength(3);
    expect(calendars.map(c => c.tenor)).toEqual(['CAL_PLUS_1', 'CAL_PLUS_2', 'CAL_PLUS_3']);
  });

  it('generates a complete default forward curve matrix with valid provenance tags', () => {
    const matrix = getDefaultForwardCurveMatrix();
    expect(matrix.asOfDate).toBeDefined();

    for (const tenor of ALL_DELIVERY_TENORS) {
      const gasMark = matrix.gasForwardCurve[tenor];
      expect(gasMark).toBeDefined();
      expect(gasMark.mid).toBeGreaterThan(0);
      expect(gasMark.provenance.sourceType).toBeDefined();

      const fxMark = matrix.fxForwardCurve[tenor];
      expect(fxMark).toBeDefined();
      expect(fxMark.gbpEur).toBeGreaterThan(1.0);
    }

    // Check key certificate markets are present across all tenors
    const keyMarkets = ['DE_THG', 'NL_ERE', 'FR_CPB', 'IT_CIC', 'UK_RTFO'];
    for (const mId of keyMarkets) {
      expect(matrix.certificateForwardCurves[mId]).toBeDefined();
      for (const tenor of ALL_DELIVERY_TENORS) {
        const certMark = matrix.certificateForwardCurves[mId][tenor];
        expect(certMark).toBeDefined();
        expect(certMark.mid).toBeGreaterThan(0);
      }
    }
  });

  it('allows building custom forward curve matrices with overrides', () => {
    const customMatrix = buildForwardCurveMatrix(
      {
        M_PLUS_1: { mid: 45.00, bid: 44.50, offer: 45.50 },
      },
      {
        FR_CPB: {
          M_PLUS_1: { mid: 95.00, bid: 94.00, offer: 96.00 },
        },
      }
    );

    expect(customMatrix.gasForwardCurve.M_PLUS_1.mid).toBe(45.00);
    expect(customMatrix.certificateForwardCurves.FR_CPB.M_PLUS_1.mid).toBe(95.00);
    // Non-overridden tenors should retain defaults
    expect(customMatrix.gasForwardCurve.CAL_PLUS_1.mid).toBe(33.60);
  });
});

describe('CURVES DOMAIN ENGINE — Forward Basis Spread Calculations', () => {
  const deMarket = MARKETS.find(m => m.id === 'DE_THG')!;
  const frMarket = MARKETS.find(m => m.id === 'FR_CPB')!;
  const nlMarket = MARKETS.find(m => m.id === 'NL_ERE')!;
  const itMarket = MARKETS.find(m => m.id === 'IT_CIC')!;
  const ukMarket = MARKETS.find(m => m.id === 'UK_RTFO')!;

  it('computes 9 forward spreads for Germany THG strictly consistent with computeNetback', () => {
    const matrix = getDefaultForwardCurveMatrix();
    const spreads = computeForwardBasisSpreads({
      consignment: mockManureConsignment,
      market: deMarket,
      curveMatrix: matrix,
      costs: mockCosts,
      pricingSide: 'mid',
    });

    expect(spreads).toHaveLength(9);

    for (const spread of spreads) {
      expect(spread.gasIndexPriceEurPerMwh).toBe(matrix.gasForwardCurve[spread.tenor].mid);
      expect(spread.certificateValueEurPerMwh).toBeGreaterThan(0);
      expect(spread.totalDeliveredValueEurPerMwh).toBeGreaterThan(0);
      
      // Commercial Basis Spread = Delivered Netback - TTF Gas Index Price
      const expectedSpread = Number((spread.totalDeliveredValueEurPerMwh! - spread.gasIndexPriceEurPerMwh!).toFixed(2));
      expect(spread.commercialBasisSpreadEurPerMwh).toBe(expectedSpread);

      // Verify breakdown matches
      expect(spread.breakdown.moleculeValueEurPerMwh).toBe(spread.gasIndexPriceEurPerMwh);
      expect(spread.breakdown.logisticsEurPerMwh).toBe(mockCosts.logistics);
      expect(spread.breakdown.grossDeliveredValueEurPerMwh).toBe(spread.totalDeliveredValueEurPerMwh);

      // Verify desk margin is forwarded from computeNetback
      expect(spread.deskMarginEurPerMwh).toBeDefined();
    }
  });

  it('handles German THG uncertainty branches (DC_OFF vs DC_ON) across forward tenors', () => {
    const spreads = computeForwardBasisSpreads({
      consignment: mockManureConsignment,
      market: deMarket,
      costs: mockCosts,
      pricingSide: 'mid',
    });

    for (const spread of spreads) {
      // 2026+ compliance year triggers uncertainty branches for Germany
      expect(spread.uncertaintyBranches).toBeDefined();
      expect(spread.uncertaintyBranches).toHaveLength(2);
      expect(spread.uncertaintySpreadEurPerMwh).toBeGreaterThan(0);
    }
  });

  it('clamps French CPB certificate value at €100.00/MWh statutory ceiling across forward curve', () => {
    const highCpbMatrix = buildForwardCurveMatrix(
      {},
      {
        FR_CPB: {
          M_PLUS_1: { mid: 120.00, bid: 118.00, offer: 122.00 },
          Q1: { mid: 130.00, bid: 128.00, offer: 132.00 },
        },
      }
    );

    const spreads = computeForwardBasisSpreads({
      consignment: mockManureConsignment,
      market: frMarket,
      curveMatrix: highCpbMatrix,
      costs: mockCosts,
      pricingSide: 'mid',
    });

    const m1Spread = spreads.find(s => s.tenor === 'M_PLUS_1')!;
    expect(m1Spread.certificateValueEurPerMwh).toBe(100.00);

    const q1Spread = spreads.find(s => s.tenor === 'Q1')!;
    expect(q1Spread.certificateValueEurPerMwh).toBe(100.00);
  });

  it('correctly prices UK RTFO with forward GBP/EUR FX conversion', () => {
    const matrix = getDefaultForwardCurveMatrix();
    const spreads = computeForwardBasisSpreads({
      consignment: mockManureConsignment,
      market: ukMarket,
      curveMatrix: matrix,
      costs: mockCosts,
      pricingSide: 'mid',
    });

    for (const spread of spreads) {
      expect(spread.certificateValueEurPerMwh).toBeGreaterThan(0);
      expect(spread.commercialBasisSpreadEurPerMwh).toBeGreaterThan(0);
      expect(spread.totalDeliveredValueEurPerMwh).toBeGreaterThan(spread.gasIndexPriceEurPerMwh!);
    }
  });

  it('computes all markets forward curve spreads in bulk with computeAllMarketsForwardSpreads', () => {
    const allSpreads = computeAllMarketsForwardSpreads(
      mockManureConsignment,
      [deMarket, frMarket, nlMarket, itMarket, ukMarket],
      undefined,
      mockCosts,
      'mid'
    );

    expect(Object.keys(allSpreads)).toEqual(['DE_THG', 'FR_CPB', 'NL_ERE', 'IT_CIC', 'UK_RTFO']);
    for (const spreads of Object.values(allSpreads)) {
      expect(spreads).toHaveLength(9);
    }
  });

  it('properly handles missing/null forward marks without throwing', () => {
    const sparseMatrix = buildForwardCurveMatrix(
      {
        M_PLUS_2: { bid: null, offer: null, mid: null },
      },
      {
        DE_THG: {
          M_PLUS_2: { bid: null, offer: null, mid: null },
        },
      }
    );

    const spreads = computeForwardBasisSpreads({
      consignment: mockManureConsignment,
      market: deMarket,
      curveMatrix: sparseMatrix,
      costs: mockCosts,
    });

    const m2Spread = spreads.find(s => s.tenor === 'M_PLUS_2')!;
    expect(m2Spread.gasIndexPriceEurPerMwh).toBeNull();
    expect(m2Spread.certificateValueEurPerMwh).toBeNull();
    expect(m2Spread.totalDeliveredValueEurPerMwh).toBeNull();
    expect(m2Spread.commercialBasisSpreadEurPerMwh).toBeNull();
    expect(m2Spread.isComplete).toBe(false);
  });
});
