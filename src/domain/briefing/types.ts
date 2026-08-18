import { CertificationScheme, ChainOfCustody } from '../consignment/types';
import { MarkSourceType, StalenessStatus } from '../markets/types';
import { MarksState, CostInputs } from '../netback/types';
import { RegulatoryWhatIfScenario } from '../arbitrage/types';

/**
 * Overnight mover direction indicator.
 */
export type PriceMovementDirection = 'UP' | 'DOWN' | 'UNCHANGED' | 'NO_DATA';

/**
 * Single overnight price mover entry tracking 24h market delta.
 */
export interface OvernightPriceMover {
  instrumentId: string;
  instrumentName: string;
  unitOfAccount: string;
  currentPrice: number | null;
  previousPrice: number | null;
  absoluteDelta: number | null;
  percentageDelta: number | null;
  direction: PriceMovementDirection;
  provenanceSource: string | null;
  observedAt: string | null;
  commentary: string;
}

/**
 * Mark freshness alert tracking staleness buckets.
 */
export interface MarkStalenessAlert {
  marketId: string;
  marketName: string;
  unitLabel: string;
  currentMid: number | null;
  stalenessStatus: StalenessStatus;
  ageDays: number | null;
  sourceType: MarkSourceType | null;
  sourceName: string | null;
  observedAt: string | null;
  recommendation: string;
}

/**
 * Summary of mark freshness counts across the desk.
 */
export interface StalenessSummary {
  freshCount: number;    // <7 days (green)
  warningCount: number;  // 7-30 days (amber)
  criticalCount: number; // >30 days (red)
  unfilledCount: number;
  totalTracked: number;
  alerts: MarkStalenessAlert[];
}

/**
 * Regulatory consultation or statutory milestone update.
 */
export interface RegulatoryConsultationUpdate {
  id: string;
  jurisdiction: string;
  jurisdictionCode: string;
  title: string;
  legalBasis: string;
  status: 'ENACTED' | 'DRAFT_PROPOSAL' | 'UNDER_NEGOTIATION' | 'CONSULTATION_OPEN';
  statusBadge: string;
  effectiveDate: string;
  summaryExcerpt: string;
  tradingDeskImpact: string;
  impactLevel: 'HIGH' | 'MEDIUM' | 'LOW';
  affectedMarkets: string[];
}

/**
 * Parameters for 1-click structured deal handoff to Trade Builder.
 */
export interface StructuredDealParams {
  originCountry: string;
  feedstock: string;
  ci: number;
  marketId: string;
  volume: number;
  scheme?: CertificationScheme;
  coc?: ChainOfCustody;
  counterparty?: string;
  deliveryPeriod?: string;
}

/**
 * Top arbitrage origination opportunity synthesized in morning briefing.
 */
export interface OriginationOpportunity {
  corridorRank: number;
  corridorId: string;
  originCountry: string;
  originCountryName: string;
  targetMarketId: string;
  targetMarketName: string;
  targetCountry: string;
  feedstockKey: string;
  feedstockName: string;
  carbonIntensity: number;
  grossDeliveredValueEurPerMWh: number;
  producerProcurementEurPerMWh: number;
  logisticsTariffEurPerMWh: number;
  deskMarginEurPerMWh: number;
  marginPercent: number;
  annualVolumeMWh: number;
  projectedDeskPnLEur: number;
  complianceVerdict: string;
  keyRiskOrTrap: string | null;
  structuredDealParams: StructuredDealParams;
  structuredDealUrl: string;
}

/**
 * Recommended desk action / remedy.
 */
export interface DeskRemedy {
  id: string;
  title: string;
  description: string;
  actionLabel: string;
  targetRoute: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
}

/**
 * Parameters to execute generateMorningBriefing.
 */
export interface BriefingParams {
  currentMarks: MarksState;
  previousMarks?: MarksState | null;
  costs: CostInputs;
  selectedFeedstockKey?: string;
  ciOverride?: number;
  scheme?: CertificationScheme;
  chainOfCustody?: ChainOfCustody;
  scenario?: RegulatoryWhatIfScenario;
  defaultDealVolumeMWh?: number;
  asOfDate?: Date | string;
}

/**
 * Complete Morning Market Briefing summary payload.
 */
export interface MorningBriefingSummary {
  generatedAt: string;
  macroHeadline: string;
  overnightMovers: OvernightPriceMover[];
  stalenessSummary: StalenessSummary;
  regulatoryUpdates: RegulatoryConsultationUpdate[];
  topArbitrageCorridors: OriginationOpportunity[];
  topRemedies: DeskRemedy[];
}
