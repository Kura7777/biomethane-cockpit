import { DealRecord } from '../deals/types';
import { MarksState } from '../netback/types';
import { generateForwardCurves, getTenorByYear } from '../curves/engine';
import { CurveMarketType } from '../curves/types';
import {
  DealMtMValuation,
  PortfolioMtMReport,
  YearPositionSummary,
  MarketPositionSummary,
} from './types';

/**
 * Extracts delivery year from deal record or assessment.
 */
export function extractDealDeliveryYear(deal: DealRecord): number {
  if (deal.assessment?.consignment.deliveryPeriod?.complianceYear) {
    return deal.assessment.consignment.deliveryPeriod.complianceYear;
  }
  const match = deal.tradeTitle.match(/202[6-9]|2030/);
  if (match) {
    return parseInt(match[0], 10);
  }
  const noteMatch = deal.notes.match(/202[6-9]|2030/);
  if (noteMatch) {
    return parseInt(noteMatch[0], 10);
  }
  return 2026;
}

/**
 * Maps market ID to CurveMarketType.
 */
export function mapMarketToCurveType(marketId: string): CurveMarketType {
  switch (marketId) {
    case 'DE_THG':
      return 'DE_THG';
    case 'NL_ERE':
      return 'NL_ERE';
    case 'FR_CPB':
      return 'FR_CPB';
    case 'UK_RTFO':
      return 'UK_RTFO';
    case 'FUELEU':
      return 'FUELEU';
    case 'DE_GO':
      return 'GO_DE';
    case 'NL_GO':
      return 'GO_NL';
    case 'FR_GO':
      return 'GO_FR';
    case 'VOL_SCOPE1':
      return 'VOL_SCOPE1';
    default:
      return 'TTF_GAS';
  }
}

/**
 * Computes Mark-to-Market (MtM) valuation and Greek sensitivities for a single deal.
 */
export function evaluateDealMtM(
  deal: DealRecord,
  marks: MarksState
): DealMtMValuation {
  const deliveryYear = extractDealDeliveryYear(deal);
  const tenor = getTenorByYear(deliveryYear);
  const curveBook = generateForwardCurves(marks);
  const curveType = mapMarketToCurveType(deal.marketId);
  const curve = curveBook.curves[curveType];

  const tenorQuote = curve ? curve.tenors[tenor] : curveBook.ttfGasCurve.tenors[tenor];
  const ttfQuote = curveBook.ttfGasCurve.tenors[tenor];

  // Derive current mark for this deal's product:
  // For certificate/quota market, the current mark includes the forward gas component + certificate forward value
  const forwardGasPrice = ttfQuote ? ttfQuote.mid : 38.5;
  const forwardCertPrice = tenorQuote ? tenorQuote.mid : deal.netbackEur;

  // If deal had a booked netback:
  const bookedNetbackEur = deal.netbackEur || 0;
  
  // Current forward mark reflects the forward curve movement since booking
  let currentMarkEur = bookedNetbackEur;
  if (curve && curve.basePromptMid > 0) {
    const forwardRatio = tenorQuote.mid / curve.basePromptMid;
    currentMarkEur = Number((bookedNetbackEur * forwardRatio).toFixed(2));
  }

  const volumeMWh = deal.volumeMWh || 0;
  const unrealizedPnLEur = Number(((currentMarkEur - bookedNetbackEur) * volumeMWh).toFixed(2));
  const deskMarginEur = deal.deskMarginEur || 0;
  const bookedMarginTotalEur = Number((deskMarginEur * volumeMWh).toFixed(2));

  // Greeks:
  // 1. TTF Delta: exposure to a +€0.10/MWh shift in European gas index
  // Delta in EUR = volumeMWh * 0.10 EUR/MWh = volumeMWh / 10
  const ttfDeltaEurPer010 = Number((volumeMWh / 10).toFixed(2));

  // 2. Certificate Spread Sensitivity (Cert Beta): exposure to a +1% shift in environmental mark
  // Beta in EUR = (volumeMWh * bookedNetbackEur * 1) / 100
  const certSpreadSensitivity1PctEur = Number(((volumeMWh * bookedNetbackEur) / 100).toFixed(2));

  return {
    dealId: deal.id,
    dealTitle: deal.tradeTitle,
    counterparty: deal.counterparty || 'Counterparty Unspecified',
    marketId: deal.marketId,
    marketName: deal.marketName,
    status: deal.status,
    deliveryYear,
    volumeMWh,
    bookedNetbackEur,
    currentMarkEur,
    unrealizedPnLEur,
    deskMarginEur,
    bookedMarginTotalEur,
    ttfDeltaEurPer010,
    certSpreadSensitivity1PctEur,
  };
}

/**
 * Computes portfolio-wide Mark-to-Market report across all active deals.
 */
export function computePortfolioMtM(
  deals: DealRecord[],
  marks: MarksState
): PortfolioMtMReport {
  const activeDeals = deals.filter(
    d => d.status === 'EXECUTED' || d.status === 'PRICED' || d.status === 'RFQ'
  );

  const valuations: DealMtMValuation[] = activeDeals.map(d => evaluateDealMtM(d, marks));

  let totalVolumeMWh = 0;
  let totalNotionalEur = 0;
  let totalUnrealizedMtMEur = 0;
  let totalBookedMarginEur = 0;
  let totalMarginVolumeProduct = 0;

  let totalTtfDelta = 0;
  let totalCertSensitivity = 0;

  const positionsByYear: Record<number, YearPositionSummary> = {
    2026: { year: 2026, tenorLabel: 'Cal-2026', volumeMWh: 0, grossNotionalEur: 0, unrealizedMtMEur: 0, dealsCount: 0 },
    2027: { year: 2027, tenorLabel: 'Cal-2027', volumeMWh: 0, grossNotionalEur: 0, unrealizedMtMEur: 0, dealsCount: 0 },
    2028: { year: 2028, tenorLabel: 'Cal-2028', volumeMWh: 0, grossNotionalEur: 0, unrealizedMtMEur: 0, dealsCount: 0 },
    2029: { year: 2029, tenorLabel: 'Cal-2029', volumeMWh: 0, grossNotionalEur: 0, unrealizedMtMEur: 0, dealsCount: 0 },
    2030: { year: 2030, tenorLabel: 'Cal-2030', volumeMWh: 0, grossNotionalEur: 0, unrealizedMtMEur: 0, dealsCount: 0 },
  };

  const positionsByMarket: Record<string, MarketPositionSummary> = {};

  for (const val of valuations) {
    const dealNotional = val.bookedNetbackEur * val.volumeMWh;

    totalVolumeMWh += val.volumeMWh;
    totalNotionalEur += dealNotional;
    totalUnrealizedMtMEur += val.unrealizedPnLEur;
    totalBookedMarginEur += val.bookedMarginTotalEur;
    totalMarginVolumeProduct += val.deskMarginEur * val.volumeMWh;

    totalTtfDelta += val.ttfDeltaEurPer010;
    totalCertSensitivity += val.certSpreadSensitivity1PctEur;

    // Year breakdown
    const yr = val.deliveryYear in positionsByYear ? val.deliveryYear : 2026;
    positionsByYear[yr].volumeMWh += val.volumeMWh;
    positionsByYear[yr].grossNotionalEur += dealNotional;
    positionsByYear[yr].unrealizedMtMEur += val.unrealizedPnLEur;
    positionsByYear[yr].dealsCount += 1;

    // Market breakdown
    if (!positionsByMarket[val.marketId]) {
      positionsByMarket[val.marketId] = {
        marketId: val.marketId,
        marketName: val.marketName,
        volumeMWh: 0,
        grossNotionalEur: 0,
        unrealizedMtMEur: 0,
        dealsCount: 0,
      };
    }
    positionsByMarket[val.marketId].volumeMWh += val.volumeMWh;
    positionsByMarket[val.marketId].grossNotionalEur += dealNotional;
    positionsByMarket[val.marketId].unrealizedMtMEur += val.unrealizedPnLEur;
    positionsByMarket[val.marketId].dealsCount += 1;
  }

  const vwapMarginEurPerMWh =
    totalVolumeMWh > 0 ? Number((totalMarginVolumeProduct / totalVolumeMWh).toFixed(2)) : 0;

  return {
    timestamp: new Date().toISOString(),
    totalDealsCount: deals.length,
    activePositionsCount: activeDeals.length,
    totalVolumeMWh,
    totalNotionalEur: Number(totalNotionalEur.toFixed(2)),
    totalUnrealizedMtMEur: Number(totalUnrealizedMtMEur.toFixed(2)),
    totalBookedMarginEur: Number(totalBookedMarginEur.toFixed(2)),
    vwapMarginEurPerMWh,
    positionsByYear,
    positionsByMarket,
    greeks: {
      ttfDeltaEurPer010: Number(totalTtfDelta.toFixed(2)),
      certSpreadSensitivity1PctEur: Number(totalCertSensitivity.toFixed(2)),
    },
    valuations,
  };
}
