import { Consignment } from '../consignment/types';
import { Market, PriceSide } from '../markets/types';
import { CostInputs, MarksState, PricingSides, FuelEUOptions } from '../netback/types';
import { OverallVerdict } from '../eligibility/types';

/**
 * Parameter configuration for what-if sensitivity simulations.
 */
export interface SensitivityShockConfig {
  /** TTF Gas Price shock percentage (e.g. -30, -20, -10, 0, 10, 20, 30) */
  ttfPriceShockPercent: number;
  /** German THG double-counting branch: 'DC_OFF' (1x) vs 'DC_ON' (2x) vs 'AUTO' (standard engine rule) */
  deDoubleCounting: 'DC_OFF' | 'DC_ON' | 'AUTO';
  /** UK UDB treaty/recognition status: true allows UK-injected gas to satisfy UDB recording */
  ukUdbRecognition: boolean;
  /** French CPB statutory penalty ceiling in €/MWh (statutory default is €100/MWh) */
  frCpbCeilingEurMwh: number;
  /** FuelEU consecutive non-compliance years: 1 (0%), 2 (+10%), 3 (+20%), 4 (+30%) */
  fuelEUEscalationYears: 1 | 2 | 3 | 4;
  /** FX rate shock percentage for non-EUR crosses (GBP/EUR, CHF/EUR) (e.g. -10, -5, 0, +5, +10) */
  fxShockPercent: number;
  /** Optional certificate mark shock percentage across all certificate markets (e.g. -20 to +20) */
  certPriceShockPercent?: number;
}

/**
 * Standard preset scenario for fast selection in UI and testing.
 */
export interface SensitivityPreset {
  id: string;
  name: string;
  shortLabel: string;
  description: string;
  badge?: string;
  config: SensitivityShockConfig;
}

/**
 * Evaluated sensitivity result for a single compliance market.
 */
export interface MarketSensitivityResult {
  marketId: string;
  marketName: string;
  country: string;
  unitOfAccount: string;
  unitLabel: string;
  
  // Certificate Component
  baseCertificateValue: number | null;
  shockedCertificateValue: number | null;
  certificateDeltaEurPerMwh: number | null;
  
  // Molecule Component
  baseMoleculeValue: number | null;
  shockedMoleculeValue: number | null;
  moleculeDeltaEurPerMwh: number | null;
  
  // Total Delivered Net Netback (€/MWh)
  baseNetback: number | null;
  shockedNetback: number | null;
  netbackDeltaEurPerMwh: number | null;
  
  // Commercial Desk Margin (€/MWh)
  baseDeskMargin: number | null;
  shockedDeskMargin: number | null;
  marginDeltaEurPerMwh: number | null;
  
  // Annual / Deal Notional P&L (€)
  baseNotionalPnl: number | null;
  shockedNotionalPnl: number | null;
  notionalDeltaEur: number | null;
  
  // Eligibility & Regulatory Gating
  baseEligibilityVerdict: OverallVerdict;
  shockedEligibilityVerdict: OverallVerdict;
  isTradeable: boolean;
  isBlocked: boolean;
  verdictChanged: boolean;
  
  // Status & Explanatory Rationale
  statusNote: string | null;
  shockSummary: string;
  uncertaintyRange?: {
    low: number;
    high: number;
    deltaPerMwh: number;
  } | null;
}

/**
 * Complete sensitivity matrix evaluated across all markets for a given consignment.
 */
export interface ConsignmentSensitivityMatrix {
  consignmentId: string;
  consignmentName: string;
  originCountry: string;
  feedstockName: string;
  carbonIntensity: number;
  volumeMWh: number | null;
  shockConfig: SensitivityShockConfig;
  marketResults: MarketSensitivityResult[];
  activeMarketsCount: number;
  tradeableMarketsCount: number;
  averageNetbackDeltaEurPerMwh: number | null;
  totalPortfolioNotionalDeltaEur: number | null;
  generatedAt: string;
}

/**
 * Scenario comparison summary highlighting portfolio upside, downside, and best/worst corridors.
 */
export interface ScenarioComparison {
  baselineScenarioName: string;
  shockedScenarioName: string;
  shockConfig: SensitivityShockConfig;
  marketResults: MarketSensitivityResult[];
  totalPortfolioPnlDeltaEur: number | null;
  bestUpsideMarket: MarketSensitivityResult | null;
  worstDownsideMarket: MarketSensitivityResult | null;
  maxNetbackDeltaEurPerMwh: number | null;
  minNetbackDeltaEurPerMwh: number | null;
}

/**
 * Functional arguments passed into sensitivity simulation evaluations.
 */
export interface SensitivityParams {
  consignment: Consignment;
  markets?: Market[];
  baseMarks: MarksState;
  baseCosts: CostInputs;
  shockConfig: SensitivityShockConfig;
  pricingSide?: PriceSide | PricingSides;
  fuelEUOptions?: FuelEUOptions;
}
