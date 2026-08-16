import { Consignment, CertificationScheme, ChainOfCustody } from '../consignment/types';
import { Market } from '../markets/types';
import { NetbackResult } from '../netback/types';
import { EligibilityAssessment, OverallVerdict } from '../eligibility/types';

export interface OriginProfile {
  countryCode: string;
  countryName: string;
  flag: string;
  activePlants: number;
  annualProductionTWh: number;
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
  producerPayableEurPerMWh: number;                // Upstream producer index-linked payment (~88-92% of stack)
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

export interface AgentChatMessage {
  id: string;
  sender: 'user' | 'agent';
  agentRole?: 'Arbitrage Hunter' | 'Regulatory Watchdog' | 'Compliance Officer';
  content: string;
  timestamp: string;
  suggestedAction?: {
    type: 'NAVIGATE_TRADE' | 'APPLY_PRESET';
    payload: any;
  };
}
