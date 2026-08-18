import { MarkProvenance, PriceSide, Market } from '../markets/types';
import { Consignment } from '../consignment/types';
import { CostInputs, FuelEUOptions, PricingSides, NetbackBranch } from '../netback/types';

export type DeliveryTenor =
  | 'M_PLUS_1'
  | 'M_PLUS_2'
  | 'Q1'
  | 'Q2'
  | 'Q3'
  | 'Q4'
  | 'CAL_PLUS_1'
  | 'CAL_PLUS_2'
  | 'CAL_PLUS_3';

export type TenorCategory = 'PROMPT' | 'QUARTER' | 'CALENDAR';

export interface TenorDefinition {
  tenor: DeliveryTenor;
  label: string;
  shortLabel: string;
  category: TenorCategory;
  deliveryYear: number;
  quarter?: number;
  month?: number;
  deliveryPeriod: string;
  startDate: string;
  endDate: string;
  description: string;
}

export interface ForwardGasMark {
  tenor: DeliveryTenor;
  bid: number | null;
  offer: number | null;
  mid: number | null;
  updatedAt: string;
  provenance: MarkProvenance;
}

export interface ForwardCertificateMark {
  marketId: string;
  tenor: DeliveryTenor;
  bid: number | null;
  offer: number | null;
  mid: number | null;
  updatedAt: string;
  provenance: MarkProvenance;
}

export interface ForwardFxMark {
  tenor: DeliveryTenor;
  gbpEur: number | null;
  chfEur: number | null;
  updatedAt: string;
  provenance: MarkProvenance;
}

export interface ForwardCurveMatrix {
  gasForwardCurve: Record<DeliveryTenor, ForwardGasMark>;
  certificateForwardCurves: Record<string, Record<DeliveryTenor, ForwardCertificateMark>>;
  fxForwardCurve: Record<DeliveryTenor, ForwardFxMark>;
  asOfDate: string;
}

export interface DeliveredValueBreakdown {
  moleculeValueEurPerMwh: number;
  certificateValueEurPerMwh: number;
  logisticsEurPerMwh: number;
  transferAndRegistryFeesEurPerMwh: number;
  otherCostsEurPerMwh: number;
  totalCostsEurPerMwh: number;
  grossDeliveredValueEurPerMwh: number;
  ttfBaseEurPerMwh: number;
  basisSpreadEurPerMwh: number;
}

export interface TenorBasisSpread {
  tenor: DeliveryTenor;
  tenorLabel: string;
  category: TenorCategory;
  deliveryYear: number;
  gasIndexPriceEurPerMwh: number | null;
  certificateValueEurPerMwh: number | null;
  logisticsTariffEurPerMwh: number;
  totalDeliveredValueEurPerMwh: number | null;
  commercialBasisSpreadEurPerMwh: number | null;
  deskMarginEurPerMwh: number | null;
  producerPayableEurPerMwh: number | null;
  uncertaintySpreadEurPerMwh?: number | null;
  uncertaintyBranches?: NetbackBranch[] | null;
  isComplete: boolean;
  missingInputs: string[];
  breakdown: DeliveredValueBreakdown;
}

export interface ForwardCurveParams {
  consignment: Consignment;
  market: Market;
  curveMatrix?: ForwardCurveMatrix;
  costs: CostInputs;
  pricingSide?: PriceSide | PricingSides;
  fuelEUOptions?: FuelEUOptions;
}
