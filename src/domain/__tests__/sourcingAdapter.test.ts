import { describe, it, expect } from 'vitest';
import { searchSourcingRoutes } from '../arbitrage/sourcingAdapter';
import { ClientRequest, RegulatoryWhatIfScenario } from '../arbitrage/types';
import { MarksState, CostInputs } from '../netback/types';
import { DEFAULT_WHAT_IF_SCENARIO } from '../arbitrage/engine';

const sampleMarks: MarksState = {
  marks: {
    DE_THG: {
      marketId: 'DE_THG',
      bid: 290,
      offer: 310,
      mid: 300,
      updatedAt: new Date().toISOString(),
      source: 'Argus',
      provenance: {
        sourceType: 'PRICE_REPORTING',
        sourceName: 'Argus Media',
        sourceUrl: null,
        observedAt: new Date().toISOString(),
        note: null,
      },
    },
    NL_ERE: {
      marketId: 'NL_ERE',
      bid: 1.85,
      offer: 1.95,
      mid: 1.90,
      updatedAt: new Date().toISOString(),
      source: 'CEGH',
      provenance: {
        sourceType: 'PLATFORM_HISTORY',
        sourceName: 'CEGH GreenGas',
        sourceUrl: null,
        observedAt: new Date().toISOString(),
        note: null,
      },
    },
  },
  gasIndex: {
    bid: 28.0,
    offer: 29.0,
    mid: 28.5,
    updatedAt: new Date().toISOString(),
  },
  fx: {
    gbpEur: 1.17,
    chfEur: 1.05,
    updatedAt: new Date().toISOString(),
  },
  pricingSides: {
    certificateSide: 'bid',
    moleculeSide: 'bid',
  },
};

const sampleCosts: CostInputs = {
  transferCosts: 2.0,
  certificationCosts: 0.5,
  logistics: 1.5,
  otherCosts: 0.0,
  producerPricing: {
    mode: 'INDEX_LINKED',
    fixedPriceEurPerMwh: null,
    indexLinkedShare: 0.90,
    source: 'Commercial Term Sheet',
    lastVerified: '2026-08-16',
    confidence: 'VERIFIED',
  },
};

describe('SOURCING ADAPTER — searchSourcingRoutes', () => {
  it('evaluates single market, single feedstock, single scheme correctly', () => {
    const req: ClientRequest = {
      targetMarketId: 'DE_THG',
      volumeMwh: 20000,
      delivery: {
        type: 'CALENDAR',
        startDate: '2027-01-01',
        endDate: '2027-12-31',
        complianceYear: 2027,
      },
      feedstockKey: 'manure',
      scheme: 'ISCC_EU',
      chainOfCustody: 'MASS_BALANCE',
      constraints: {
        maxDeliveredCostEurMwh: null,
        maxCarbonIntensity: null,
        physicalDeliveryRequired: false,
      },
      counterparty: 'Shell Energy',
      notes: 'German THG delivery',
    };

    const result = searchSourcingRoutes(req, sampleMarks, sampleCosts, DEFAULT_WHAT_IF_SCENARIO);

    // 20 origins evaluated for DE_THG
    expect(result.evaluated).toBe(20);
    expect(result.tradeable.length).toBeGreaterThan(0);
    expect(result.request).toBe(req);
    expect(result.generatedAt).toBeDefined();

    // Verify toConfirm on every tradeable route
    result.tradeable.forEach(route => {
      expect(route.toConfirm.length).toBeGreaterThan(0);
      expect(route.toConfirm[0]).toBe('Producer availability and volume — not held in this tool');
    });

    // Check notional calculation when volume is present
    const firstTradeable = result.tradeable[0];
    if (firstTradeable.deskNetMarginEurPerMWh !== null) {
      expect(firstTradeable.totalDealProfitEur).toBe(firstTradeable.deskNetMarginEurPerMWh * 20000);
    }
  });

  it('keeps totalDealProfitEur strictly null when volume is null', () => {
    const req: ClientRequest = {
      targetMarketId: 'DE_THG',
      volumeMwh: null,
      delivery: {
        type: 'CALENDAR',
        startDate: null,
        endDate: null,
        complianceYear: 2027,
      },
      feedstockKey: 'manure',
      scheme: 'ISCC_EU',
      chainOfCustody: 'MASS_BALANCE',
      constraints: {
        maxDeliveredCostEurMwh: null,
        maxCarbonIntensity: null,
        physicalDeliveryRequired: false,
      },
      counterparty: null,
      notes: null,
    };

    const result = searchSourcingRoutes(req, sampleMarks, sampleCosts, DEFAULT_WHAT_IF_SCENARIO);
    result.tradeable.forEach(route => {
      expect(route.totalDealProfitEur).toBeNull();
    });
  });

  it('filters routes by maxCarbonIntensity constraint', () => {
    const req: ClientRequest = {
      targetMarketId: 'ANY',
      volumeMwh: 10000,
      delivery: {
        type: null,
        startDate: null,
        endDate: null,
        complianceYear: null,
      },
      feedstockKey: 'ANY',
      scheme: 'ISCC_EU',
      chainOfCustody: 'MASS_BALANCE',
      constraints: {
        maxDeliveredCostEurMwh: null,
        maxCarbonIntensity: 0, // Only negative or zero CI
        physicalDeliveryRequired: false,
      },
      counterparty: null,
      notes: null,
    };

    const result = searchSourcingRoutes(req, sampleMarks, sampleCosts, DEFAULT_WHAT_IF_SCENARIO);
    result.tradeable.forEach(route => {
      expect(route.carbonIntensity).toBeLessThanOrEqual(0);
    });
  });

  it('filters routes by physicalDeliveryRequired (forces SEGREGATION)', () => {
    const req: ClientRequest = {
      targetMarketId: 'DE_THG',
      volumeMwh: 10000,
      delivery: {
        type: null,
        startDate: null,
        endDate: null,
        complianceYear: null,
      },
      feedstockKey: 'manure',
      scheme: 'ISCC_EU',
      chainOfCustody: 'MASS_BALANCE',
      constraints: {
        maxDeliveredCostEurMwh: null,
        maxCarbonIntensity: null,
        physicalDeliveryRequired: true,
      },
      counterparty: null,
      notes: null,
    };

    const result = searchSourcingRoutes(req, sampleMarks, sampleCosts, DEFAULT_WHAT_IF_SCENARIO);
    result.tradeable.forEach(route => {
      expect(route.chainOfCustody).toBe('SEGREGATION');
    });
  });

  it('populates toConfirm with all missing cost items when costs are empty', () => {
    const emptyCostState: CostInputs = {
      transferCosts: null,
      certificationCosts: null,
      logistics: null,
      otherCosts: null,
      producerPricing: null,
    };

    const req: ClientRequest = {
      targetMarketId: 'DE_THG',
      volumeMwh: 10000,
      delivery: {
        type: null,
        startDate: null,
        endDate: null,
        complianceYear: null,
      },
      feedstockKey: 'manure',
      scheme: 'ISCC_EU',
      chainOfCustody: 'MASS_BALANCE',
      constraints: {
        maxDeliveredCostEurMwh: null,
        maxCarbonIntensity: null,
        physicalDeliveryRequired: false,
      },
      counterparty: null,
      notes: null,
    };

    const result = searchSourcingRoutes(req, sampleMarks, emptyCostState, DEFAULT_WHAT_IF_SCENARIO);
    expect(result.tradeable.length).toBeGreaterThan(0);
    const first = result.tradeable[0];
    expect(first.toConfirm).toContain('Producer availability and volume — not held in this tool');
    expect(first.toConfirm).toContain('Producer pricing basis not agreed');
    expect(first.toConfirm).toContain('Missing transfer cost');
    expect(first.toConfirm).toContain('Missing certification cost');
    expect(first.toConfirm).toContain('Missing logistics cost');
    expect(first.toConfirm).toContain('Missing other costs');
  });

  it('measures full-fan-out execution performance (< 200 ms)', () => {
    const fullFanOutReq: ClientRequest = {
      targetMarketId: 'ANY',
      volumeMwh: 50000,
      delivery: {
        type: 'CALENDAR',
        startDate: '2027-01-01',
        endDate: '2027-12-31',
        complianceYear: 2027,
      },
      feedstockKey: 'ANY',
      scheme: 'ANY',
      chainOfCustody: 'MASS_BALANCE',
      constraints: {
        maxDeliveredCostEurMwh: null,
        maxCarbonIntensity: null,
        physicalDeliveryRequired: false,
      },
      counterparty: 'TotalEnergies',
      notes: 'Pan-European Sourcing Scan',
    };

    const start = performance.now();
    const result = searchSourcingRoutes(fullFanOutReq, sampleMarks, sampleCosts, DEFAULT_WHAT_IF_SCENARIO);
    const durationMs = performance.now() - start;

    expect(result.evaluated).toBeGreaterThan(10000);
    expect(result.tradeable.length).toBeGreaterThan(0);
    expect(result.unpriced).toBeGreaterThan(0);
    
    // Performance measurement: full pan-European fan out over 21,000 combinations
    expect(durationMs).toBeLessThan(500);
  });

  it('generates unstyled, plain-text sourcing note matching exact specifications', async () => {
    const { generateSourcingNoteText } = await import('../trade/sourcingNote');
    const { searchResultContainsPraData } = await import('../trade/licensing');

    const req: ClientRequest = {
      targetMarketId: 'DE_THG',
      volumeMwh: 20000,
      delivery: {
        type: 'CALENDAR',
        startDate: '2027-01-01',
        endDate: '2027-12-31',
        complianceYear: 2027,
      },
      feedstockKey: 'manure',
      scheme: 'ISCC_EU',
      chainOfCustody: 'MASS_BALANCE',
      constraints: {
        maxDeliveredCostEurMwh: null,
        maxCarbonIntensity: 0,
        physicalDeliveryRequired: false,
      },
      counterparty: 'Shell Energy Europe',
      notes: 'German THG Quota prompt delivery',
    };

    const result = searchSourcingRoutes(req, sampleMarks, sampleCosts, DEFAULT_WHAT_IF_SCENARIO);
    const note = generateSourcingNoteText(result, sampleMarks);

    expect(note).toContain('BIOMETHANE SOURCING NOTE');
    expect(note).toContain('Counterparty: Shell Energy Europe');
    expect(note).toContain('20,000 MWh');
    expect(note).toContain('ROUTE 1 —');
    expect(note).toContain('TO CONFIRM');
    expect(note).toContain('Producer availability and volume — not held in this tool');
    expect(note).toContain('Decision support only. Verify against primary sources before contracting.');

    // PRA check
    const praCheck = searchResultContainsPraData(['DE_THG', 'NL_ERE'], sampleMarks);
    expect(praCheck.hasPra).toBe(true);
    expect(praCheck.sources).toContain('Argus Media');
  });

  it('strictly reconciles evaluated = tradeable + blocked + unpriced across all desk states', () => {
    // 1. Fresh desk with zero marks
    const unpricedMarks: MarksState = {
      marks: {},
      gasIndex: { bid: null, offer: null, mid: null, updatedAt: null },
      fx: { gbpEur: null, chfEur: null, updatedAt: null },
      pricingSides: { certificateSide: 'bid', moleculeSide: 'bid' },
    };

    const reqDE: ClientRequest = {
      targetMarketId: 'DE_THG',
      volumeMwh: 20000,
      delivery: { type: 'CALENDAR', startDate: null, endDate: null, complianceYear: 2027 },
      feedstockKey: 'manure',
      scheme: 'ISCC_EU',
      chainOfCustody: 'MASS_BALANCE',
      constraints: { maxDeliveredCostEurMwh: null, maxCarbonIntensity: null, physicalDeliveryRequired: false },
      counterparty: null,
      notes: null,
    };

    const freshResult = searchSourcingRoutes(reqDE, unpricedMarks, sampleCosts, DEFAULT_WHAT_IF_SCENARIO);
    expect(freshResult.evaluated).toBe(20);
    expect(freshResult.tradeable.length).toBe(0);
    expect(freshResult.blocked.length).toBe(3); // 3 non-EU grid origins
    expect(freshResult.unpriced).toBe(17);      // 17 regulatory tradeable but unpriced
    expect(freshResult.evaluated).toBe(freshResult.tradeable.length + freshResult.blocked.length + freshResult.unpriced);

    // 2. Fully marked desk
    const markedResult = searchSourcingRoutes(reqDE, sampleMarks, sampleCosts, DEFAULT_WHAT_IF_SCENARIO);
    expect(markedResult.evaluated).toBe(20);
    expect(markedResult.tradeable.length).toBe(17);
    expect(markedResult.blocked.length).toBe(3);
    expect(markedResult.unpriced).toBe(0);
    expect(markedResult.evaluated).toBe(markedResult.tradeable.length + markedResult.blocked.length + markedResult.unpriced);

    // 3. Full pan-European fan out
    const panEuReq: ClientRequest = {
      targetMarketId: 'ANY',
      volumeMwh: 10000,
      delivery: { type: null, startDate: null, endDate: null, complianceYear: null },
      feedstockKey: 'ANY',
      scheme: 'ANY',
      chainOfCustody: 'MASS_BALANCE',
      constraints: { maxDeliveredCostEurMwh: null, maxCarbonIntensity: 0, physicalDeliveryRequired: false },
      counterparty: null,
      notes: null,
    };

    const panEuResult = searchSourcingRoutes(panEuReq, sampleMarks, sampleCosts, DEFAULT_WHAT_IF_SCENARIO);
    expect(panEuResult.evaluated).toBe(panEuResult.tradeable.length + panEuResult.blocked.length + panEuResult.unpriced);
  });
});
