import { Market, PriceSide, MarkEntry } from '../markets/types';
import { MARKETS } from '../markets/registry';
import { MarksState, PricingSides, FuelEUOptions } from '../netback/types';
import { computeNetback } from '../netback/engine';
import { evaluateEligibility } from '../eligibility/engine';
import {
  SensitivityParams,
  SensitivityShockConfig,
  MarketSensitivityResult,
  ConsignmentSensitivityMatrix,
  ScenarioComparison,
} from './types';

/**
 * Builds human-readable summary of active shocks.
 */
function buildShockSummary(config: SensitivityShockConfig): string {
  const parts: string[] = [];
  if (config.ttfPriceShockPercent !== 0) {
    const sign = config.ttfPriceShockPercent > 0 ? '+' : '';
    parts.push(`TTF Gas: ${sign}${config.ttfPriceShockPercent}%`);
  }
  if (config.deDoubleCounting === 'DC_OFF') {
    parts.push('German THG: 1× Single-Counting');
  } else if (config.deDoubleCounting === 'DC_ON') {
    parts.push('German THG: 2× Double-Counting');
  }
  if (config.ukUdbRecognition) {
    parts.push('UK UDB Recognition: Enabled');
  }
  if (config.frCpbCeilingEurMwh !== 100) {
    parts.push(`French CPB Ceiling: €${config.frCpbCeilingEurMwh}/MWh`);
  }
  if (config.fuelEUEscalationYears > 1) {
    parts.push(`FuelEU Escalation: Year ${config.fuelEUEscalationYears}`);
  }
  if (config.fxShockPercent !== 0) {
    const sign = config.fxShockPercent > 0 ? '+' : '';
    parts.push(`FX Rates: ${sign}${config.fxShockPercent}%`);
  }
  if (config.certPriceShockPercent && config.certPriceShockPercent !== 0) {
    const sign = config.certPriceShockPercent > 0 ? '+' : '';
    parts.push(`Cert Marks: ${sign}${config.certPriceShockPercent}%`);
  }
  return parts.length > 0 ? parts.join(' · ') : 'Base Case (No active perturbations)';
}

/**
 * Evaluates a what-if sensitivity scenario for a single market.
 * Guaranteed pure & non-destructive: all arithmetic delegates strictly to `computeNetback`.
 */
export function evaluateSensitivityScenario(
  params: SensitivityParams,
  targetMarket: Market
): MarketSensitivityResult {
  const pricingSides: PricingSides =
    typeof params.pricingSide === 'object' && params.pricingSide !== null
      ? params.pricingSide
      : {
          certificateSide: typeof params.pricingSide === 'string' ? params.pricingSide : 'bid',
          moleculeSide: typeof params.pricingSide === 'string' ? params.pricingSide : 'bid',
        };

  // 1. Build Isolated Perturbed MarksState
  const shockedMarks: MarksState = {
    marks: { ...params.baseMarks.marks },
    gasIndex: { ...params.baseMarks.gasIndex },
    fx: { ...params.baseMarks.fx },
    pricingSides,
    fuelEUOptions: { ...params.baseMarks.fuelEUOptions },
  };

  // Apply TTF Gas Price Shock
  if (params.shockConfig.ttfPriceShockPercent !== 0) {
    const ttfMultiplier = 1 + (params.shockConfig.ttfPriceShockPercent / 100);
    shockedMarks.gasIndex = {
      ...params.baseMarks.gasIndex,
      bid: params.baseMarks.gasIndex.bid !== null ? Number((params.baseMarks.gasIndex.bid * ttfMultiplier).toFixed(2)) : null,
      offer: params.baseMarks.gasIndex.offer !== null ? Number((params.baseMarks.gasIndex.offer * ttfMultiplier).toFixed(2)) : null,
      mid: params.baseMarks.gasIndex.mid !== null ? Number((params.baseMarks.gasIndex.mid * ttfMultiplier).toFixed(2)) : null,
    };
  }

  // Apply FX Shock (GBP/EUR, CHF/EUR)
  if (params.shockConfig.fxShockPercent !== 0) {
    const fxMultiplier = 1 + (params.shockConfig.fxShockPercent / 100);
    shockedMarks.fx = {
      ...params.baseMarks.fx,
      gbpEur: params.baseMarks.fx.gbpEur !== null ? Number((params.baseMarks.fx.gbpEur * fxMultiplier).toFixed(4)) : null,
      chfEur: params.baseMarks.fx.chfEur !== null ? Number((params.baseMarks.fx.chfEur * fxMultiplier).toFixed(4)) : null,
    };
  }

  // Apply Global Certificate Mark Shock (if configured)
  if (params.shockConfig.certPriceShockPercent && params.shockConfig.certPriceShockPercent !== 0) {
    const certMultiplier = 1 + (params.shockConfig.certPriceShockPercent / 100);
    const updatedMarks: Record<string, MarkEntry> = {};
    for (const [mId, mEntry] of Object.entries(shockedMarks.marks)) {
      updatedMarks[mId] = {
        ...mEntry,
        bid: mEntry.bid !== null ? Number((mEntry.bid * certMultiplier).toFixed(2)) : null,
        offer: mEntry.offer !== null ? Number((mEntry.offer * certMultiplier).toFixed(2)) : null,
        mid: mEntry.mid !== null ? Number((mEntry.mid * certMultiplier).toFixed(2)) : null,
      };
    }
    shockedMarks.marks = updatedMarks;
  }

  // Apply French CPB Statutory Ceiling Clamping
  if (targetMarket.id === 'FR_CPB' && params.shockConfig.frCpbCeilingEurMwh < 100) {
    const frMark = shockedMarks.marks['FR_CPB'];
    if (frMark) {
      const cap = params.shockConfig.frCpbCeilingEurMwh;
      shockedMarks.marks = {
        ...shockedMarks.marks,
        FR_CPB: {
          ...frMark,
          bid: frMark.bid !== null ? Math.min(frMark.bid, cap) : null,
          offer: frMark.offer !== null ? Math.min(frMark.offer, cap) : null,
          mid: frMark.mid !== null ? Math.min(frMark.mid, cap) : null,
        },
      };
    }
  }

  // 2. Prepare Isolated FuelEU Options
  const baseFuelEUOpts: FuelEUOptions = {
    ...params.baseMarks.fuelEUOptions,
    ...params.fuelEUOptions,
  };
  const shockedFuelEUOpts: FuelEUOptions = {
    ...baseFuelEUOpts,
    consecutiveYears: params.shockConfig.fuelEUEscalationYears,
  };

  // 3. Prepare Isolated Consignments for UK UDB & Policy Toggles
  const baseConsignment = { ...params.consignment };
  const shockedConsignment = { ...params.consignment };

  const isUkOrigin = baseConsignment.originCountry === 'GB' || baseConsignment.injectionCountry === 'GB';
  if (params.shockConfig.ukUdbRecognition && isUkOrigin) {
    shockedConsignment.injectionIsEU = true;
    shockedConsignment.udbStatus = 'RECORDED';
  }

  // 4. Compute Base Netback Result (via single pricing authority)
  const baseRes = computeNetback(
    targetMarket,
    baseConsignment,
    params.baseMarks,
    params.baseCosts,
    pricingSides,
    baseFuelEUOpts
  );

  // 5. Compute Shocked Netback Result (via single pricing authority)
  const rawShockedRes = computeNetback(
    targetMarket,
    shockedConsignment,
    shockedMarks,
    params.baseCosts,
    pricingSides,
    shockedFuelEUOpts
  );

  // 6. Extract baseline and shocked metrics
  const baseCert = baseRes.certificateValue?.valueEurPerMWh ?? null;
  const baseMol = baseRes.moleculeValue ?? null;
  const baseNet = baseRes.netNetback ?? null;
  const baseMargin = baseRes.deskMargin ?? null;

  let shockedCert = rawShockedRes.certificateValue?.valueEurPerMWh ?? null;
  const shockedMol = rawShockedRes.moleculeValue ?? null;
  let shockedNet = rawShockedRes.netNetback ?? null;
  let shockedMargin = rawShockedRes.deskMargin ?? null;

  // Handle German THG Double Counting Branches
  if (targetMarket.id === 'DE_THG' && rawShockedRes.uncertaintyBranches && rawShockedRes.uncertaintyBranches.length >= 2) {
    if (params.shockConfig.deDoubleCounting === 'DC_OFF') {
      const branch0 = rawShockedRes.uncertaintyBranches[0];
      shockedCert = branch0.certificateValue.valueEurPerMWh;
      shockedNet = branch0.netNetback;
      shockedMargin = branch0.deskMargin;
    } else if (params.shockConfig.deDoubleCounting === 'DC_ON') {
      const branch1 = rawShockedRes.uncertaintyBranches[1];
      shockedCert = branch1.certificateValue.valueEurPerMWh;
      shockedNet = branch1.netNetback;
      shockedMargin = branch1.deskMargin;
    }
  }

  // 7. Calculate Economic Deltas
  const certDelta = baseCert !== null && shockedCert !== null
    ? Number((shockedCert - baseCert).toFixed(2))
    : null;
  const molDelta = baseMol !== null && shockedMol !== null
    ? Number((shockedMol - baseMol).toFixed(2))
    : null;
  const netDelta = baseNet !== null && shockedNet !== null
    ? Number((shockedNet - baseNet).toFixed(2))
    : null;
  const marginDelta = baseMargin !== null && shockedMargin !== null
    ? Number((shockedMargin - baseMargin).toFixed(2))
    : null;

  // Volume & Notional P&L
  const vol = params.consignment.volumeMWh ?? null;
  const baseNotional = baseMargin !== null && vol !== null
    ? Math.round(baseMargin * vol)
    : (baseNet !== null && vol !== null ? Math.round(baseNet * vol) : null);
  const shockedNotional = shockedMargin !== null && vol !== null
    ? Math.round(shockedMargin * vol)
    : (shockedNet !== null && vol !== null ? Math.round(shockedNet * vol) : null);
  const notionalDelta = baseNotional !== null && shockedNotional !== null
    ? shockedNotional - baseNotional
    : (marginDelta !== null && vol !== null ? Math.round(marginDelta * vol) : null);

  // 8. Eligibility Assessment
  const baseEligibility = evaluateEligibility(baseConsignment, targetMarket);
  const shockedEligibility = evaluateEligibility(shockedConsignment, targetMarket);

  const baseVerdict = baseEligibility.overallVerdict;
  const shockedVerdict = shockedEligibility.overallVerdict;
  const verdictChanged = baseVerdict !== shockedVerdict;

  const isTradeable = shockedVerdict === 'ELIGIBLE' ||
    shockedVerdict === 'CONDITIONAL' ||
    shockedVerdict === 'UNRESOLVED';
  const isBlocked = shockedVerdict === 'HARD_BLOCK';

  const uncertaintyRange = rawShockedRes.valuationRange
    ? {
        low: rawShockedRes.valuationRange.low,
        high: rawShockedRes.valuationRange.high,
        deltaPerMwh: rawShockedRes.valuationRange.deltaPerMwh,
      }
    : null;

  return {
    marketId: targetMarket.id,
    marketName: targetMarket.name,
    country: targetMarket.country,
    unitOfAccount: targetMarket.unitOfAccount,
    unitLabel: targetMarket.unitLabel,
    baseCertificateValue: baseCert,
    shockedCertificateValue: shockedCert,
    certificateDeltaEurPerMwh: certDelta,
    baseMoleculeValue: baseMol,
    shockedMoleculeValue: shockedMol,
    moleculeDeltaEurPerMwh: molDelta,
    baseNetback: baseNet,
    shockedNetback: shockedNet,
    netbackDeltaEurPerMwh: netDelta,
    baseDeskMargin: baseMargin,
    shockedDeskMargin: shockedMargin,
    marginDeltaEurPerMwh: marginDelta,
    baseNotionalPnl: baseNotional,
    shockedNotionalPnl: shockedNotional,
    notionalDeltaEur: notionalDelta,
    baseEligibilityVerdict: baseVerdict,
    shockedEligibilityVerdict: shockedVerdict,
    isTradeable,
    isBlocked,
    verdictChanged,
    statusNote: rawShockedRes.statusNote ?? null,
    shockSummary: buildShockSummary(params.shockConfig),
    uncertaintyRange,
  };
}

/**
 * Runs sensitivity simulation matrix across all target markets for a consignment.
 */
export function runSensitivityMatrix(params: SensitivityParams): ConsignmentSensitivityMatrix {
  const activeMarkets = params.markets ?? MARKETS.filter(m => m.status === 'ACTIVE');
  const marketResults: MarketSensitivityResult[] = activeMarkets.map(m =>
    evaluateSensitivityScenario(params, m)
  );

  const tradeableMarkets = marketResults.filter(r => r.isTradeable);
  const netDeltas = marketResults
    .map(r => r.netbackDeltaEurPerMwh)
    .filter((d): d is number => d !== null);

  const avgNetDelta = netDeltas.length > 0
    ? Number((netDeltas.reduce((a, b) => a + b, 0) / netDeltas.length).toFixed(2))
    : null;

  const notionalDeltas = marketResults
    .map(r => r.notionalDeltaEur)
    .filter((n): n is number => n !== null);

  const totalPortfolioNotionalDelta = notionalDeltas.length > 0
    ? notionalDeltas.reduce((a, b) => a + b, 0)
    : null;

  return {
    consignmentId: params.consignment.id,
    consignmentName: params.consignment.name,
    originCountry: params.consignment.originCountry,
    feedstockName: params.consignment.feedstockName,
    carbonIntensity: params.consignment.carbonIntensity,
    volumeMWh: params.consignment.volumeMWh,
    shockConfig: params.shockConfig,
    marketResults,
    activeMarketsCount: marketResults.length,
    tradeableMarketsCount: tradeableMarkets.length,
    averageNetbackDeltaEurPerMwh: avgNetDelta,
    totalPortfolioNotionalDeltaEur: totalPortfolioNotionalDelta,
    generatedAt: new Date().toISOString(),
  };
}

/**
 * Compares a baseline scenario against a shocked scenario across all European markets.
 */
export function compareScenarios(
  baseParams: SensitivityParams,
  shockedParams: SensitivityParams,
  baselineName: string = 'Base Case',
  shockedName: string = 'Shocked Scenario'
): ScenarioComparison {
  const matrix = runSensitivityMatrix(shockedParams);
  const results = matrix.marketResults;

  let bestUpsideMarket: MarketSensitivityResult | null = null;
  let worstDownsideMarket: MarketSensitivityResult | null = null;

  let maxNetbackDelta = -Infinity;
  let minNetbackDelta = Infinity;

  for (const r of results) {
    if (r.netbackDeltaEurPerMwh !== null) {
      if (r.netbackDeltaEurPerMwh > maxNetbackDelta) {
        maxNetbackDelta = r.netbackDeltaEurPerMwh;
        bestUpsideMarket = r;
      }
      if (r.netbackDeltaEurPerMwh < minNetbackDelta) {
        minNetbackDelta = r.netbackDeltaEurPerMwh;
        worstDownsideMarket = r;
      }
    }
  }

  return {
    baselineScenarioName: baselineName,
    shockedScenarioName: shockedName,
    shockConfig: shockedParams.shockConfig,
    marketResults: results,
    totalPortfolioPnlDeltaEur: matrix.totalPortfolioNotionalDeltaEur,
    bestUpsideMarket: maxNetbackDelta !== -Infinity ? bestUpsideMarket : null,
    worstDownsideMarket: minNetbackDelta !== Infinity ? worstDownsideMarket : null,
    maxNetbackDeltaEurPerMwh: maxNetbackDelta !== -Infinity ? maxNetbackDelta : null,
    minNetbackDeltaEurPerMwh: minNetbackDelta !== Infinity ? minNetbackDelta : null,
  };
}
