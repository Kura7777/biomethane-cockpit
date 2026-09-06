import { TradeAssessment } from '../trade/types';
import { Role } from '../auth/types';

export type DealStatus = 'DRAFT' | 'RFQ' | 'PRICED' | 'EXECUTED' | 'SETTLED';

export interface DealAuditEntry {
  id: string;
  dealId: string;
  timestamp: string; // ISO format
  previousStatus: DealStatus | null;
  newStatus: DealStatus;
  actor: string;
  actorRole: Role;
  note: string;
}

export interface DealRecord {
  id: string;
  status: DealStatus;
  createdAt: string;
  updatedAt: string;
  tradeTitle: string;
  counterparty: string;
  marketId: string;
  marketName: string;
  originCountry: string;
  originCountryName: string;
  feedstock: string;
  feedstockName: string;
  volumeMWh: number;
  carbonIntensity: number;
  netbackEur: number;
  deskMarginEur: number;
  gasIndexEur: number | null;
  currency: string;
  notes: string;
  auditTrail: DealAuditEntry[];
  assessment?: TradeAssessment;
}

export interface DealFilterCriteria {
  status?: DealStatus | 'ALL';
  marketId?: string;
  originCountry?: string;
  searchQuery?: string;
}
