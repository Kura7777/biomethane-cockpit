import { DealRecord, DealStatus } from '../deals/types';

export interface DealMtMValuation {
  dealId: string;
  dealTitle: string;
  counterparty: string;
  marketId: string;
  marketName: string;
  status: DealStatus;
  deliveryYear: number;
  volumeMWh: number;
  bookedNetbackEur: number;
  currentMarkEur: number;
  unrealizedPnLEur: number;
  deskMarginEur: number;
  bookedMarginTotalEur: number;
  ttfDeltaEurPer010: number;
  certSpreadSensitivity1PctEur: number;
}

export interface YearPositionSummary {
  year: number;
  tenorLabel: string;
  volumeMWh: number;
  grossNotionalEur: number;
  unrealizedMtMEur: number;
  dealsCount: number;
}

export interface MarketPositionSummary {
  marketId: string;
  marketName: string;
  volumeMWh: number;
  grossNotionalEur: number;
  unrealizedMtMEur: number;
  dealsCount: number;
}

export interface PortfolioMtMReport {
  timestamp: string;
  totalDealsCount: number;
  activePositionsCount: number;
  totalVolumeMWh: number;
  totalNotionalEur: number;
  totalUnrealizedMtMEur: number;
  totalBookedMarginEur: number;
  vwapMarginEurPerMWh: number;
  positionsByYear: Record<number, YearPositionSummary>;
  positionsByMarket: Record<string, MarketPositionSummary>;
  greeks: {
    ttfDeltaEurPer010: number;
    certSpreadSensitivity1PctEur: number;
  };
  valuations: DealMtMValuation[];
}

export interface VaRConfidenceMetrics {
  var1DayEur: number;
  var10DayEur: number;
  cVar1DayEur: number;
  cVar10DayEur: number;
}

export interface VaRReport {
  timestamp: string;
  portfolioNotionalEur: number;
  totalVolumeMWh: number;
  annualizedVolatilityPct: number;
  historicalSimulation: {
    scenariosCount: number;
    conf95: VaRConfidenceMetrics;
    conf99: VaRConfidenceMetrics;
    distributionPercentiles: {
      p1: number;
      p5: number;
      p50: number;
      p95: number;
      p99: number;
    };
  };
  parametricVaR: {
    var1Day95Eur: number;
    var10Day95Eur: number;
    var1Day99Eur: number;
    var10Day99Eur: number;
  };
  riskLimits: {
    varLimit1Day95Eur: number;
    utilizationPct: number;
    trafficLight: 'GREEN' | 'AMBER' | 'RED';
    actionRecommendation: string;
    isBreached: boolean;
  };
}
