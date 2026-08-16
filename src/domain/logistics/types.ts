export type DeliveryMode = 'VIRTUAL_SWAP' | 'PHYSICAL_PIPELINE' | 'BIO_LNG';

export interface InterconnectionPoint {
  id: string;
  name: string;
  fromCountry: string;
  toCountry: string;
  fromTso: string;
  toTso: string;
  entryTariffEurMwh: number;
  exitTariffEurMwh: number;
  totalTariffEurMwh: number;
  capacityPlatform: 'PRISMA' | 'RBP' | 'GSA' | 'NATIONAL';
  notes?: string;
}

export interface CostLineItem {
  label: string;
  costEurMwh: number;
  category: 'TARIFF' | 'COMMODITY_SPREAD' | 'REGULATORY_FEE' | 'SHRINKAGE' | 'PROCESSING' | 'FREIGHT';
  description: string;
  isOptional?: boolean;
}

export interface ModeCostBreakdown {
  mode: DeliveryMode;
  title: string;
  summary: string;
  totalCostEurMwh: number;
  lineItems: CostLineItem[];
  timelineDays: number;
  regulatoryFeasibility: 'HIGH' | 'MEDIUM' | 'COMPLEX';
  isRecommended: boolean;
  legalBasis: string;
  pros: string[];
  cons: string[];
}

export interface LogisticsAssessment {
  originCountry: string;
  targetCountry: string;
  distanceKm: number;
  modes: {
    virtualSwap: ModeCostBreakdown;
    physicalPipeline: ModeCostBreakdown;
    bioLng: ModeCostBreakdown;
  };
  recommendedMode: DeliveryMode;
  physicalRoute: {
    interconnectionPoints: InterconnectionPoint[];
    transitingCountries: string[];
    totalPhysicalTariffEurMwh: number;
    shrinkageLossPct: number;
    shrinkageEurMwh: number;
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
