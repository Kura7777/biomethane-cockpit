import { Market, PriceSide } from '../markets/types';
import { Consignment } from '../consignment/types';
import { CostInputs, MarksState, PricingSides, FuelEUOptions } from '../netback/types';
import { computeNetback } from '../netback/engine';
import {
  DeliveryTenor,
  TenorBasisSpread,
  DeliveredValueBreakdown,
  ForwardCurveParams,
  ForwardCurveMatrix,
} from './types';
import {
  ALL_DELIVERY_TENORS,
  getTenorDefinition,
  getDefaultForwardCurveMatrix,
} from './forwardMarks';

/**
 * Builds a DeliveredValueBreakdown object from netback result components and cost inputs.
 */
export function buildDeliveredValueBreakdown(
  moleculeValue: number | null,
  certValueMWh: number | null,
  costs: CostInputs,
  netNetback: number | null
): DeliveredValueBreakdown {
  const molVal = moleculeValue !== null ? Number(moleculeValue.toFixed(2)) : 0;
  const cVal = certValueMWh !== null ? Number(certValueMWh.toFixed(2)) : 0;
  const logVal = costs.logistics !== null ? Number(costs.logistics.toFixed(2)) : 0;
  const feeVal = Number(((costs.transferCosts ?? 0) + (costs.certificationCosts ?? 0)).toFixed(2));
  const otherVal = costs.otherCosts !== null ? Number(costs.otherCosts.toFixed(2)) : 0;
  const totCost = Number((logVal + feeVal + otherVal).toFixed(2));
  const grossDelivered = netNetback !== null ? Number(netNetback.toFixed(2)) : 0;
  const spread = netNetback !== null && moleculeValue !== null
    ? Number((netNetback - moleculeValue).toFixed(2))
    : 0;

  return {
    moleculeValueEurPerMwh: molVal,
    certificateValueEurPerMwh: cVal,
    logisticsEurPerMwh: logVal,
    transferAndRegistryFeesEurPerMwh: feeVal,
    otherCostsEurPerMwh: otherVal,
    totalCostsEurPerMwh: totCost,
    grossDeliveredValueEurPerMwh: grossDelivered,
    ttfBaseEurPerMwh: molVal,
    basisSpreadEurPerMwh: spread,
  };
}

/**
 * Computes forward commercial basis spreads across all delivery tenors for a given market & consignment.
 * Strictly uses `computeNetback` as the single pricing authority.
 */
export function computeForwardBasisSpreads(params: ForwardCurveParams): TenorBasisSpread[] {
  const matrix = params.curveMatrix ?? getDefaultForwardCurveMatrix();
  const results: TenorBasisSpread[] = [];

  const pricingSides: PricingSides =
    typeof params.pricingSide === 'object' && params.pricingSide !== null
      ? params.pricingSide
      : {
          certificateSide: typeof params.pricingSide === 'string' ? params.pricingSide : 'bid',
          moleculeSide: typeof params.pricingSide === 'string' ? params.pricingSide : 'bid',
        };

  for (const tenor of ALL_DELIVERY_TENORS) {
    const tenorDef = getTenorDefinition(tenor);
    const gasMark = matrix.gasForwardCurve[tenor];
    const certMark = matrix.certificateForwardCurves[params.market.id]?.[tenor];
    const fxMark = matrix.fxForwardCurve[tenor];

    // Build an isolated, tenor-specific MarksState to feed into computeNetback
    const tenorMarksState: MarksState = {
      marks: {
        [params.market.id]: certMark
          ? {
              marketId: params.market.id,
              bid: certMark.bid,
              offer: certMark.offer,
              mid: certMark.mid,
              updatedAt: certMark.updatedAt,
              source: certMark.provenance.sourceName,
              provenance: certMark.provenance,
            }
          : {
              marketId: params.market.id,
              bid: null,
              offer: null,
              mid: null,
              updatedAt: null,
              source: null,
              provenance: null,
            },
      },
      gasIndex: gasMark
        ? {
            bid: gasMark.bid,
            offer: gasMark.offer,
            mid: gasMark.mid,
            updatedAt: gasMark.updatedAt,
            provenance: gasMark.provenance,
          }
        : {
            bid: null,
            offer: null,
            mid: null,
            updatedAt: null,
            provenance: null,
          },
      fx: fxMark
        ? {
            gbpEur: fxMark.gbpEur,
            chfEur: fxMark.chfEur,
            updatedAt: fxMark.updatedAt,
            provenance: fxMark.provenance,
          }
        : {
            gbpEur: null,
            chfEur: null,
            updatedAt: null,
            provenance: null,
          },
      pricingSides,
      fuelEUOptions: params.fuelEUOptions,
    };

    // Calculate full netback strictly through domain/netback/engine.ts
    const netbackResult = computeNetback(
      params.market,
      params.consignment,
      tenorMarksState,
      params.costs,
      pricingSides,
      params.fuelEUOptions
    );

    const gasIndexPrice = netbackResult.moleculeValue !== null ? Number(netbackResult.moleculeValue.toFixed(2)) : null;
    const certValue = netbackResult.certificateValue?.valueEurPerMWh ?? null;
    const totalDelivered = netbackResult.netNetback !== null ? Number(netbackResult.netNetback.toFixed(2)) : null;
    const logistics = params.costs.logistics ?? 0;

    // Basis Spread (€/MWh) = Delivered Netback - TTF Gas Index
    let commercialBasisSpread: number | null = null;
    if (totalDelivered !== null && gasIndexPrice !== null) {
      commercialBasisSpread = Number((totalDelivered - gasIndexPrice).toFixed(2));
    }

    const breakdown = buildDeliveredValueBreakdown(
      gasIndexPrice,
      certValue,
      params.costs,
      totalDelivered
    );

    const uncertaintySpread = netbackResult.valuationRange?.deltaPerMwh ?? null;

    results.push({
      tenor,
      tenorLabel: tenorDef.shortLabel,
      category: tenorDef.category,
      deliveryYear: tenorDef.deliveryYear,
      gasIndexPriceEurPerMwh: gasIndexPrice,
      certificateValueEurPerMwh: certValue,
      logisticsTariffEurPerMwh: logistics,
      totalDeliveredValueEurPerMwh: totalDelivered,
      commercialBasisSpreadEurPerMwh: commercialBasisSpread,
      deskMarginEurPerMwh: netbackResult.deskMargin,
      producerPayableEurPerMwh: netbackResult.producerPayable,
      uncertaintySpreadEurPerMwh: uncertaintySpread,
      uncertaintyBranches: netbackResult.uncertaintyBranches,
      isComplete: netbackResult.isComplete,
      missingInputs: netbackResult.missingInputs,
      breakdown,
    });
  }

  return results;
}

/**
 * Computes forward basis spreads across multiple European markets for a given consignment.
 */
export function computeAllMarketsForwardSpreads(
  consignment: Consignment,
  markets: Market[],
  curveMatrix?: ForwardCurveMatrix,
  costs: CostInputs = {
    transferCosts: null,
    certificationCosts: null,
    logistics: null,
    otherCosts: null,
    producerPricing: null,
  },
  side?: PriceSide | PricingSides,
  fuelEUOptions?: FuelEUOptions
): Record<string, TenorBasisSpread[]> {
  const result: Record<string, TenorBasisSpread[]> = {};
  for (const market of markets) {
    result[market.id] = computeForwardBasisSpreads({
      consignment,
      market,
      curveMatrix,
      costs,
      pricingSide: side,
      fuelEUOptions,
    });
  }
  return result;
}
