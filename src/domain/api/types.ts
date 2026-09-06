import { DealRecord, DealStatus, DealAuditEntry, DealFilterCriteria } from '../deals/types';
import { MarksState } from '../netback/types';
import { MarksAuditRecord } from '../marks/marksStore';
import { Role, RoleDefinition, SessionState } from '../auth/types';

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  isFallback?: boolean;
}

export interface DealsResponse {
  success: boolean;
  count: number;
  deals: DealRecord[];
  isFallback?: boolean;
}

export interface DealResponse {
  success: boolean;
  deal?: DealRecord;
  error?: string;
  isFallback?: boolean;
}

export interface MarksResponse {
  success: boolean;
  marks?: MarksState;
  error?: string;
  isFallback?: boolean;
}

export interface MarksAuditResponse {
  success: boolean;
  count: number;
  history: MarksAuditRecord[];
  isFallback?: boolean;
}

export interface SessionResponse {
  success: boolean;
  session: SessionState;
  isFallback?: boolean;
}

export interface RolesResponse {
  success: boolean;
  roles: RoleDefinition[];
  isFallback?: boolean;
}
