export type DeliveryMode = 'VIRTUAL_SWAP' | 'PHYSICAL_PIPELINE' | 'BIO_LNG';

export interface InterconnectionPoint {
  id: string;
  name: string;
  fromCountry: string;
  toCountry: string;
  fromTso: string;
  toTso: string;
  entryTariffEurMwh: number | null;
  exitTariffEurMwh: number | null;
  totalTariffEurMwh: number | null;
  capacityPlatform: 'PRISMA' | 'RBP' | 'GSA' | 'NATIONAL' | 'UNVERIFIED';
  confidence?: 'VERIFIED' | 'LIKELY' | 'UNVERIFIED';
  source?: string | null;
  lastVerified?: string | null;
  notes?: string;
}

export interface CostLineItem {
  label: string;
  costEurMwh: number | null;
  category: 'TARIFF' | 'COMMODITY_SPREAD' | 'REGULATORY_FEE' | 'SHRINKAGE' | 'PROCESSING' | 'FREIGHT';
  description: string;
  isOptional?: boolean;
}

export interface ModeCostBreakdown {
  mode: DeliveryMode;
  title: string;
  summary: string;
  totalCostEurMwh: number | null;
  lineItems: CostLineItem[];
  timelineDays: number;
  regulatoryFeasibility: 'HIGH' | 'MEDIUM' | 'COMPLEX' | 'CONTESTED' | 'LOW';
  isRecommended: boolean;
  unverifiedLegs?: string[];
  legalBasis: string;
  pros: string[];
  cons: string[];
}

export interface LogisticsAssessment {
  originCountry: string;
  targetCountry: string;
  distanceKm: number | null;
  modes: {
    virtualSwap: ModeCostBreakdown;
    physicalPipeline: ModeCostBreakdown;
    bioLng: ModeCostBreakdown;
  };
  recommendedMode: DeliveryMode;
  physicalRoute: {
    interconnectionPoints: InterconnectionPoint[];
    transitingCountries: string[];
    totalPhysicalTariffEurMwh: number | null;
    unverifiedLegs: string[];
    shrinkageLossPct: number | null;
    shrinkageEurMwh: number | null;
  };
  hubSpread: {
    originHub: string;
    targetHub: string;
    basisSpreadEurMwh: number;
  };
  executionSteps: {
    phase: string;
    title: string;
    actor: string;
    actions: string[];
  }[];
}
