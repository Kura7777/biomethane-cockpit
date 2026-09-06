import { DealStatus } from '../deals/types';
import { Role } from '../auth/types';

export type SyncEventType =
  | 'PEER_HEARTBEAT'
  | 'MARKS_UPDATED'
  | 'DEAL_BOOKED'
  | 'DEAL_TRANSITIONED'
  | 'ROLE_CHANGED';

export interface BaseSyncEvent {
  type: SyncEventType;
  sessionId: string;
  actor: string;
  role: Role;
  timestamp: string;
}

export interface PeerHeartbeatEvent extends BaseSyncEvent {
  type: 'PEER_HEARTBEAT';
}

export interface MarksUpdatedSyncEvent extends BaseSyncEvent {
  type: 'MARKS_UPDATED';
  marketId: string;
  marketName: string;
  oldMid: number | null;
  newMid: number;
  changePct: number | null;
}

export interface DealBookedSyncEvent extends BaseSyncEvent {
  type: 'DEAL_BOOKED';
  dealId: string;
  title: string;
  volumeMWh: number;
  marketName: string;
  netbackEur: number;
}

export interface DealTransitionedSyncEvent extends BaseSyncEvent {
  type: 'DEAL_TRANSITIONED';
  dealId: string;
  previousStatus: DealStatus | null;
  newStatus: DealStatus;
}

export interface RoleChangedSyncEvent extends BaseSyncEvent {
  type: 'ROLE_CHANGED';
  newRole: Role;
}

export type SyncEvent =
  | PeerHeartbeatEvent
  | MarksUpdatedSyncEvent
  | DealBookedSyncEvent
  | DealTransitionedSyncEvent
  | RoleChangedSyncEvent;

export interface ToastNotification {
  id: string;
  title: string;
  message: string;
  type: 'deal' | 'mark' | 'role' | 'info';
  timestamp: number;
}
