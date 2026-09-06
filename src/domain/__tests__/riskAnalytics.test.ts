import { describe, it, expect } from 'vitest';
import { evaluateDealMtM, computePortfolioMtM, extractDealDeliveryYear } from '../risk/mtmEngine';
import { computePortfolioVaR, generateHistoricalScenarios, Z_SCORE_95, Z_SCORE_99, SQRT_10_DAYS } from '../risk/varEngine';
import { DealRecord } from '../deals/types';
import { MarksState } from '../netback/types';

function createMockMarks(): MarksState {
  return {
    marks: {
      DE_THG: { marketId: 'DE_THG', mid: 0.85, bid: 0.83, offer: 0.87, updatedAt: null, source: null },
      NL_ERE: { marketId: 'NL_ERE', mid: 18.50, bid: 18.20, offer: 18.80, updatedAt: null, source: null },
      FR_CPB: { marketId: 'FR_CPB', mid: 26.00, bid: 25.00, offer: 27.00, updatedAt: null, source: null },
      UK_RTFO: { marketId: 'UK_RTFO', mid: 36.00, bid: 35.00, offer: 37.00, updatedAt: null, source: null },
    },
    gasIndex: { mid: 38.50, bid: 38.20, offer: 38.80, updatedAt: null },
    fx: { gbpEur: 1.17, chfEur: 1.05, updatedAt: null },
    pricingSides: {
      certificateSide: 'mid',
      moleculeSide: 'mid',
    },
  };
}

const mockDeals: DealRecord[] = [
  {
    id: 'DEAL-2026-001',
    status: 'EXECUTED',
    createdAt: '2026-08-15T10:00:00Z',
    updatedAt: '2026-08-15T10:00:00Z',
    tradeTitle: 'Danish Manure to NL ERE (Cal-2026)',
    counterparty: 'Vitol Gas & Power',
    marketId: 'NL_ERE',
    marketName: 'Netherlands ERE',
    originCountry: 'DK',
    originCountryName: 'Denmark',
    feedstock: 'manure',
    feedstockName: 'Manure',
    volumeMWh: 40000,
    carbonIntensity: -100,
    netbackEur: 169.30,
    deskMarginEur: 16.93,
    gasIndexEur: 38.50,
    currency: 'EUR',
    notes: 'Firm EFET Cal-2026 delivery',
    auditTrail: [],
  },
  {
    id: 'DEAL-2027-002',
    status: 'PRICED',
    createdAt: '2026-08-16T12:00:00Z',
    updatedAt: '2026-08-16T12:00:00Z',
    tradeTitle: 'German Manure to DE THG (Cal-2027)',
    counterparty: 'Shell Energy',
    marketId: 'DE_THG',
    marketName: 'German THG',
    originCountry: 'DE',
    originCountryName: 'Germany',
    feedstock: 'manure',
    feedstockName: 'Manure',
    volumeMWh: 60000,
    carbonIntensity: -100,
    netbackEur: 177.65,
    deskMarginEur: 17.77,
    gasIndexEur: 38.50,
    currency: 'EUR',
    notes: 'Priced Cal-2027 step-up',
    auditTrail: [],
  },
  {
    id: 'DEAL-DRAFT-003',
    status: 'DRAFT',
    createdAt: '2026-08-17T09:00:00Z',
    updatedAt: '2026-08-17T09:00:00Z',
    tradeTitle: 'Draft deal (ignored in active MtM)',
    counterparty: 'BP Gas',
    marketId: 'FR_CPB',
    marketName: 'France CPB',
    originCountry: 'FR',
    originCountryName: 'France',
    feedstock: 'manure',
    feedstockName: 'Manure',
    volumeMWh: 10000,
    carbonIntensity: -50,
    netbackEur: 25.00,
    deskMarginEur: 2.50,
    gasIndexEur: 38.50,
    currency: 'EUR',
    notes: 'Draft uncommitted deal',
    auditTrail: [],
  },
];

describe('Portfolio Mark-to-Market (MtM) Engine', () => {
  it('extracts delivery year accurately from title or notes', () => {
    expect(extractDealDeliveryYear(mockDeals[0])).toBe(2026);
    expect(extractDealDeliveryYear(mockDeals[1])).toBe(2027);
  });

  it('evaluates individual deal MtM and Greek sensitivities', () => {
    const marks = createMockMarks();
    const dealVal = evaluateDealMtM(mockDeals[0], marks);

    expect(dealVal.dealId).toBe('DEAL-2026-001');
    expect(dealVal.volumeMWh).toBe(40000);
    expect(dealVal.bookedMarginTotalEur).toBeCloseTo(40000 * 16.93, 1);

    // Greek checks:
    // TTF Delta for +0.10 EUR/MWh move = 40,000 * 0.10 = 4,000 EUR
    expect(dealVal.ttfDeltaEurPer010).toBe(4000);
    // Cert beta for +1% move = (40,000 * 169.30) / 100 = 67,720 EUR
    expect(dealVal.certSpreadSensitivity1PctEur).toBeCloseTo(67720, 1);
  });

  it('aggregates portfolio MtM across active deals and filters out DRAFTs', () => {
    const marks = createMockMarks();
    const report = computePortfolioMtM(mockDeals, marks);

    expect(report.totalDealsCount).toBe(3);
    expect(report.activePositionsCount).toBe(2); // EXECUTED + PRICED, DRAFT excluded
    expect(report.totalVolumeMWh).toBe(100000); // 40,000 + 60,000

    // Volume-weighted margin (VWAP margin)
    // (40,000 * 16.93 + 60,000 * 17.77) / 100,000 = (677,200 + 1,066,200) / 100,000 = 17.434 -> 17.43
    expect(report.vwapMarginEurPerMWh).toBeCloseTo(17.43, 1);

    // Positions broken down by year
    expect(report.positionsByYear[2026].volumeMWh).toBe(40000);
    expect(report.positionsByYear[2027].volumeMWh).toBe(60000);

    // Positions broken down by market
    expect(report.positionsByMarket.NL_ERE.volumeMWh).toBe(40000);
    expect(report.positionsByMarket.DE_THG.volumeMWh).toBe(60000);

    // Greeks aggregated
    expect(report.greeks.ttfDeltaEurPer010).toBe(10000); // 4,000 + 6,000
  });
});

describe('Portfolio Value-at-Risk (VaR) Engine', () => {
  it('computes Historical Simulation VaR and Parametric VaR with Basel III 10-day scaling', () => {
    const marks = createMockMarks();
    const mtmReport = computePortfolioMtM(mockDeals, marks);
    const varReport = computePortfolioVaR(mtmReport);

    expect(varReport.portfolioNotionalEur).toBeGreaterThan(15000000);
    expect(varReport.totalVolumeMWh).toBe(100000);

    // 1-day vs 10-day scaling check
    const hist = varReport.historicalSimulation;
    expect(hist.conf95.var1DayEur).toBeGreaterThan(0);
    expect(hist.conf95.var10DayEur).toBeCloseTo(hist.conf95.var1DayEur * SQRT_10_DAYS, 0);

    // 99% VaR must be strictly greater than 95% VaR
    expect(hist.conf99.var1DayEur).toBeGreaterThan(hist.conf95.var1DayEur);

    // Expected Shortfall (CVaR) must be >= VaR
    expect(hist.conf95.cVar1DayEur).toBeGreaterThanOrEqual(hist.conf95.var1DayEur);
    expect(hist.conf99.cVar1DayEur).toBeGreaterThanOrEqual(hist.conf99.var1DayEur);

    // Parametric VaR checks
    const param = varReport.parametricVaR;
    expect(param.var1Day99Eur).toBeGreaterThan(param.var1Day95Eur);
    expect(param.var10Day95Eur).toBeCloseTo(param.var1Day95Eur * SQRT_10_DAYS, 0);
  });

  it('triggers traffic-light risk limits when limits are approached or breached', () => {
    const marks = createMockMarks();
    const mtmReport = computePortfolioMtM(mockDeals, marks);

    // Set a very generous limit: status GREEN
    const greenReport = computePortfolioVaR(mtmReport, { customDeskLimitEur: 10000000 });
    expect(greenReport.riskLimits.trafficLight).toBe('GREEN');
    expect(greenReport.riskLimits.isBreached).toBe(false);

    // Set a tight limit that causes breach: status RED
    const redReport = computePortfolioVaR(mtmReport, { customDeskLimitEur: 5000 });
    expect(redReport.riskLimits.trafficLight).toBe('RED');
    expect(redReport.riskLimits.isBreached).toBe(true);
    expect(redReport.riskLimits.actionRecommendation).toContain('MANDATE BREACH');
  });

  it('handles empty portfolio gracefully without NaN or division by zero', () => {
    const emptyReport = computePortfolioMtM([], createMockMarks());
    const varReport = computePortfolioVaR(emptyReport);

    expect(varReport.portfolioNotionalEur).toBe(0);
    expect(varReport.historicalSimulation.conf95.var1DayEur).toBe(0);
    expect(varReport.riskLimits.trafficLight).toBe('GREEN');
    expect(varReport.riskLimits.isBreached).toBe(false);
  });
});
