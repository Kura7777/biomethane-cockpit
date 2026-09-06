import { PortfolioMtMReport, VaRReport, VaRConfidenceMetrics } from './types';

// Standard statistical constants
export const Z_SCORE_95 = 1.644853; // Normal distribution 95% one-tailed
export const Z_SCORE_99 = 2.326348; // Normal distribution 99% one-tailed
export const SQRT_10_DAYS = Math.sqrt(10); // Holding period scaling factor (Basel III)
export const TRADING_DAYS_PER_YEAR = 252;
export const DEFAULT_DESK_VAR_LIMIT_EUR = 250000; // €250,000 1-day 95% VaR desk mandate

/**
 * Deterministic pseudo-random sequence generator (LCG) for reproducible historical simulation.
 */
function createDeterministicRandom(seed = 123456789) {
  let s = seed;
  return function () {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

/**
 * Generates 250 daily return scenarios simulating European biomethane and gas market volatility.
 * Annualized TTF volatility: ~38%, Bio-certificate volatility: ~25%.
 * Daily standard deviation: sigma_annual / sqrt(252).
 */
export function generateHistoricalScenarios(
  scenariosCount = 250,
  annualVolatilityPct = 32
): number[] {
  const rng = createDeterministicRandom(987654321);
  const dailySigma = (annualVolatilityPct / 100) / Math.sqrt(TRADING_DAYS_PER_YEAR);
  const returns: number[] = [];

  // Box-Muller transform for standard normal shocks
  for (let i = 0; i < scenariosCount; i++) {
    const u1 = Math.max(rng(), 1e-10);
    const u2 = rng();
    const z = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
    // Include slight negative skewness typical of energy price corrections
    const skewedZ = z - (z * z - 1) * (5 / 100);
    returns.push(skewedZ * dailySigma);
  }

  return returns;
}

/**
 * Computes Historical Simulation and Parametric Value-at-Risk (VaR)
 * across 95% and 99% confidence levels, 1-day and 10-day holding horizons.
 */
export function computePortfolioVaR(
  report: PortfolioMtMReport,
  options?: {
    customDeskLimitEur?: number;
    annualVolatilityPct?: number;
    scenariosCount?: number;
  }
): VaRReport {
  const deskLimit = options?.customDeskLimitEur || DEFAULT_DESK_VAR_LIMIT_EUR;
  const annualVol = options?.annualVolatilityPct || 32;
  const scenariosCount = options?.scenariosCount || 250;

  const notional = report.totalNotionalEur;
  const volume = report.totalVolumeMWh;

  // Handle empty portfolio
  if (notional <= 0 || volume <= 0) {
    const emptyConf: VaRConfidenceMetrics = {
      var1DayEur: 0,
      var10DayEur: 0,
      cVar1DayEur: 0,
      cVar10DayEur: 0,
    };
    return {
      timestamp: new Date().toISOString(),
      portfolioNotionalEur: 0,
      totalVolumeMWh: 0,
      annualizedVolatilityPct: annualVol,
      historicalSimulation: {
        scenariosCount,
        conf95: emptyConf,
        conf99: emptyConf,
        distributionPercentiles: { p1: 0, p5: 0, p50: 0, p95: 0, p99: 0 },
      },
      parametricVaR: {
        var1Day95Eur: 0,
        var10Day95Eur: 0,
        var1Day99Eur: 0,
        var10Day99Eur: 0,
      },
      riskLimits: {
        varLimit1Day95Eur: deskLimit,
        utilizationPct: 0,
        trafficLight: 'GREEN',
        actionRecommendation: 'Portfolio book is flat; no open exposure.',
        isBreached: false,
      },
    };
  }

  // 1. Parametric VaR
  const dailySigma = (annualVol / 100) / Math.sqrt(TRADING_DAYS_PER_YEAR);
  const paramVar1d95 = notional * dailySigma * Z_SCORE_95;
  const paramVar10d95 = paramVar1d95 * SQRT_10_DAYS;

  const paramVar1d99 = notional * dailySigma * Z_SCORE_99;
  const paramVar10d99 = paramVar1d99 * SQRT_10_DAYS;

  // 2. Historical Simulation VaR
  const scenarios = generateHistoricalScenarios(scenariosCount, annualVol);
  // Compute P&L scenario losses: negative return implies desk loss on long position
  const scenarioLosses = scenarios.map(r => -r * notional).sort((a, b) => b - a); // descending order of loss

  // 95% VaR: 5th percentile worst loss (index = scenariosCount * 5 / 100)
  const idx95 = Math.floor((scenariosCount * 5) / 100);
  const histVar1d95 = Math.max(0, scenarioLosses[idx95] || 0);
  const histVar10d95 = histVar1d95 * SQRT_10_DAYS;

  // Expected Shortfall (CVaR 95%): average of losses beyond VaR 95%
  const tailLosses95 = scenarioLosses.slice(0, idx95 + 1);
  const cVar1d95 =
    tailLosses95.length > 0
      ? tailLosses95.reduce((sum, v) => sum + v, 0) / tailLosses95.length
      : histVar1d95;
  const cVar10d95 = cVar1d95 * SQRT_10_DAYS;

  // 99% VaR: 1st percentile worst loss (index = scenariosCount * 1 / 100)
  const idx99 = Math.floor((scenariosCount * 1) / 100);
  const histVar1d99 = Math.max(0, scenarioLosses[idx99] || 0);
  const histVar10d99 = histVar1d99 * SQRT_10_DAYS;

  const tailLosses99 = scenarioLosses.slice(0, idx99 + 1);
  const cVar1d99 =
    tailLosses99.length > 0
      ? tailLosses99.reduce((sum, v) => sum + v, 0) / tailLosses99.length
      : histVar1d99;
  const cVar10d99 = cVar1d99 * SQRT_10_DAYS;

  // Distribution Percentiles
  const p1 = Number(scenarioLosses[Math.min(scenarioLosses.length - 1, Math.floor((scenariosCount * 1) / 100))].toFixed(2));
  const p5 = Number(scenarioLosses[Math.min(scenarioLosses.length - 1, Math.floor((scenariosCount * 5) / 100))].toFixed(2));
  const p50 = Number(scenarioLosses[Math.floor(scenariosCount / 2)].toFixed(2));
  const p95 = Number(scenarioLosses[Math.floor((scenariosCount * 95) / 100)].toFixed(2));
  const p99 = Number(scenarioLosses[Math.floor((scenariosCount * 99) / 100)].toFixed(2));

  // 3. Risk Limit & Traffic Light Evaluation
  const primaryVaR = histVar1d95;
  const utilizationPct = Number(((primaryVaR / deskLimit) * 100).toFixed(1));

  let trafficLight: 'GREEN' | 'AMBER' | 'RED' = 'GREEN';
  let isBreached = false;
  let actionRecommendation = 'Risk within authorized trading mandate. All VaR metrics nominal.';

  if (utilizationPct > 100) {
    trafficLight = 'RED';
    isBreached = true;
    actionRecommendation = `MANDATE BREACH (${utilizationPct}% utilization). Immediate hedge required on Cal-2026/2027 book or risk committee limit waiver.`;
  } else if (utilizationPct >= 75) {
    trafficLight = 'AMBER';
    actionRecommendation = `WARNING (${utilizationPct}% utilization). Nearing €${(deskLimit / 1000).toFixed(0)}k limit. Monitor TTF basis risk and limit new unhedged origination.`;
  }

  return {
    timestamp: new Date().toISOString(),
    portfolioNotionalEur: Number(notional.toFixed(2)),
    totalVolumeMWh: volume,
    annualizedVolatilityPct: annualVol,
    historicalSimulation: {
      scenariosCount,
      conf95: {
        var1DayEur: Number(histVar1d95.toFixed(2)),
        var10DayEur: Number(histVar10d95.toFixed(2)),
        cVar1DayEur: Number(cVar1d95.toFixed(2)),
        cVar10DayEur: Number(cVar10d95.toFixed(2)),
      },
      conf99: {
        var1DayEur: Number(histVar1d99.toFixed(2)),
        var10DayEur: Number(histVar10d99.toFixed(2)),
        cVar1DayEur: Number(cVar1d99.toFixed(2)),
        cVar10DayEur: Number(cVar10d99.toFixed(2)),
      },
      distributionPercentiles: { p1, p5, p50, p95, p99 },
    },
    parametricVaR: {
      var1Day95Eur: Number(paramVar1d95.toFixed(2)),
      var10Day95Eur: Number(paramVar10d95.toFixed(2)),
      var1Day99Eur: Number(paramVar1d99.toFixed(2)),
      var10Day99Eur: Number(paramVar10d99.toFixed(2)),
    },
    riskLimits: {
      varLimit1Day95Eur: deskLimit,
      utilizationPct,
      trafficLight,
      actionRecommendation,
      isBreached,
    },
  };
}
