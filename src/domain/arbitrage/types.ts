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
  
  // Economics
  originEstimatedProcurementEurPerMWh: number; // TTF + local feedstock premium
  destinationNetbackEurPerMWh: number | null;
  grossSpreadEurPerMWh: number | null;         // netback - procurement
  transitCostEurPerMWh: number;                // grid transit / logistics tariffs
  netMarginEurPerMWh: number | null;           // grossSpread - transitCost
  marginPercent: number | null;
  totalDealProfitEur: number | null;           // netMargin * volume
  
  // Regulatory
  eligibility: EligibilityAssessment;
  overallVerdict: OverallVerdict;
  isTradeable: boolean;
  regulatoryRationale: string;
  keyRiskOrTrap: string | null;
  
  // Modelled vs Marked
  isModelled: boolean;
}

export interface ArbitrageMatrixCell {
  originCode: string;
  originName: string;
  targetMarketId: string;
  targetMarketName: string;
  verdict: OverallVerdict;
  netMarginEurPerMWh: number | null;
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
