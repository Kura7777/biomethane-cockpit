export type Role = 'TRADER' | 'RISK_MANAGER' | 'COMPLIANCE_OFFICER';

export type Permission =
  | 'TRADE_CREATE'
  | 'TRADE_PRICE'
  | 'TRADE_EXECUTE'
  | 'TRADE_SETTLE'
  | 'MARKS_EDIT'
  | 'MARKS_APPROVE'
  | 'MARKS_LOCK'
  | 'RISK_VIEW_MTM'
  | 'COMPLIANCE_SIGNOFF'
  | 'AUDIT_VIEW';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  desk: string;
  role: Role;
}

export interface RoleDefinition {
  role: Role;
  label: string;
  badgeLabel: string;
  badgeTone: string;
  badgeClass: string;
  description: string;
  permissions: Permission[];
}

export interface SessionState {
  user: UserProfile;
  activeRole: Role;
  permissions: Permission[];
  isAuthenticated: boolean;
}
