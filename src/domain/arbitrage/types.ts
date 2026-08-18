import { Consignment, CertificationScheme, ChainOfCustody, DeliveryPeriod } from '../consignment/types';
import { Market } from '../markets/types';
import { NetbackResult } from '../netback/types';
import { EligibilityAssessment, OverallVerdict } from '../eligibility/types';

export interface OriginProfile {
  countryCode: string;
  countryName: string;
  flag: string;
  activePlants: number;
  annualProductionTWh: number | null;
  primaryRegistry: string;
  gridZone: 'EU_INTERCONNECTED' | 'NON_EU_ISOLATED';
  typicalFeedstocks: string[];
}

export interface ArbitrageOpportunity {
  id: string;
  originCountry: string;
  originCountryName: string;
  originFlag: string;
  targetMarketId: string;
  targetMarketName: string;
  targetCountry: string;
  targetFlag: string;
  feedstockKey: string;
  feedstockName: string;
  carbonIntensity: number;
  certificationScheme: CertificationScheme;
  chainOfCustody: ChainOfCustody;
  
  // Real Commercial Economics
  totalTerminalValueStackEurPerMWh: number | null; // Total compliance + molecule revenue (€/MWh)
  producerPayableEurPerMWh: number | null;         // Upstream producer index-linked payment (null if unset)
  transitCostEurPerMWh: number;                    // Grid transit & logistics tariffs (€0.50-€3.20/MWh)
  deskNetMarginEurPerMWh: number | null;           // Realistic trading desk margin (€1.50-€8.00/MWh)
  marginPercent: number | null;                    // deskNetMargin / totalValue * 100
  totalDealProfitEur: number | null;               // deskNetMargin * volume (e.g. €35,000 on 10,000 MWh)
  
  // Regulatory
  eligibility: EligibilityAssessment;
  overallVerdict: OverallVerdict;
  isTradeable: boolean;
  regulatoryRationale: string;
  keyRiskOrTrap: string | null;
  marginAllocationType: 'TRANSPORT_COMPLIANCE' | 'MARITIME_INSETTING' | 'WHOLESALE_BASE';
  
  // Modelled vs Marked
  isModelled: boolean;

  // Commercial verification checklist (Regulatory Feasibility != Commercial Availability)
  toConfirm: string[];
}

export interface ClientRequest {
  targetMarketId: string | 'ANY';
  volumeMwh: number | null;              // null is valid — notional simply won't compute
  delivery: DeliveryPeriod;              // reuse the EXISTING type in consignment/types.ts
  feedstockKey: string | 'ANY';
  scheme: CertificationScheme | 'ANY';
  chainOfCustody: ChainOfCustody;
  constraints: {
    maxDeliveredCostEurMwh: number | null;
    maxCarbonIntensity: number | null;
    physicalDeliveryRequired: boolean;   // forces SEGREGATION / bio-LNG paths
  };
  counterparty: string | null;
  notes: string | null;
}

export interface SourcingSearchResult {
  tradeable: ArbitrageOpportunity[];
  blocked: ArbitrageOpportunity[];
  evaluated: number;                     // how many combinations were tried
  unpriced: number;                      // how many had no usable mark
  request: ClientRequest;
  generatedAt: string;
}

export interface ArbitrageMatrixCell {
  originCode: string;
  originName: string;
  targetMarketId: string;
  targetMarketName: string;
  verdict: OverallVerdict;
  deskNetMarginEurPerMWh: number | null;
  totalValueEurPerMWh: number | null;
  isBlocked: boolean;
  blockingReason: string | null;
  isModelled: boolean;
}

export interface RegulatoryWhatIfScenario {
  deDoubleCounting: 'DC_OFF' | 'DC_ON';
  ukUdbRecognition: boolean;
  fuelEUEscalationYears: 1 | 2 | 3 | 4;
  frCpbPenaltyCap: number; // default 100
}

export interface TradeActionPayload {
  marketId?: string;
  originCountry?: string;
  feedstock?: string;
  ci?: number;
  volume?: number;
  counterparty?: string;
  [key: string]: unknown;
}

export interface AgentChatMessage {
  id: string;
  sender: 'user' | 'agent';
  agentRole?: 'Arbitrage Hunter' | 'Regulatory Watchdog' | 'Compliance Officer';
  content: string;
  timestamp: string;
  suggestedAction?: {
    type: 'NAVIGATE_TRADE' | 'APPLY_PRESET';
    payload: TradeActionPayload;
  };
}
