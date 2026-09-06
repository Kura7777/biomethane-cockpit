import { Role, Permission, RoleDefinition } from './types';

export const ROLE_DEFINITIONS: Record<Role, RoleDefinition> = {
  TRADER: {
    role: 'TRADER',
    label: 'Desk Trader',
    badgeLabel: 'TRADER',
    badgeTone: 'sky',
    badgeClass: 'bg-sky-950 text-sky-300 border-sky-800',
    description: 'Physical & financial trade origination, RFQ generation, pricing waterfall, and deal execution',
    permissions: [
      'TRADE_CREATE',
      'TRADE_PRICE',
      'TRADE_EXECUTE',
      'MARKS_EDIT',
      'AUDIT_VIEW',
    ],
  },
  RISK_MANAGER: {
    role: 'RISK_MANAGER',
    label: 'Risk Manager',
    badgeLabel: 'RISK MGR',
    badgeTone: 'amber',
    badgeClass: 'bg-amber-950 text-amber-300 border-amber-800',
    description: 'Mark-to-market curve verification, official mark sign-off & lock, counterparty exposure, and settlement validation',
    permissions: [
      'TRADE_PRICE',
      'TRADE_SETTLE',
      'MARKS_EDIT',
      'MARKS_APPROVE',
      'MARKS_LOCK',
      'RISK_VIEW_MTM',
      'AUDIT_VIEW',
    ],
  },
  COMPLIANCE_OFFICER: {
    role: 'COMPLIANCE_OFFICER',
    label: 'Compliance Officer',
    badgeLabel: 'COMPLIANCE',
    badgeTone: 'emerald',
    badgeClass: 'bg-emerald-950 text-emerald-300 border-emerald-800',
    description: 'Statutory quota validation, RED III Annex IX verification, UDB mass-balance sign-off, and regulatory audit review',
    permissions: [
      'COMPLIANCE_SIGNOFF',
      'TRADE_SETTLE',
      'AUDIT_VIEW',
    ],
  },
};

/**
 * Check if a given role possesses a specific permission.
 */
export function hasPermission(role: Role, permission: Permission): boolean {
  const def = ROLE_DEFINITIONS[role];
  if (!def) return false;
  return def.permissions.includes(permission);
}

/**
 * Get all permissions granted to a role.
 */
export function getRolePermissions(role: Role): Permission[] {
  const def = ROLE_DEFINITIONS[role];
  return def ? [...def.permissions] : [];
}

/**
 * Get human-readable role metadata.
 */
export function getRoleDefinition(role: Role): RoleDefinition {
  return ROLE_DEFINITIONS[role] || ROLE_DEFINITIONS.TRADER;
}
