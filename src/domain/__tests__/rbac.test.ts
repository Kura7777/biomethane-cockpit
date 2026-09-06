import { describe, it, expect, beforeEach } from 'vitest';
import { ROLE_DEFINITIONS, hasPermission, getRolePermissions, getRoleDefinition } from '../auth/rbac';
import { getActiveRole, setActiveRole, onRoleChange, getSessionState, canActiveRole } from '../auth/authStore';
import { Role } from '../auth/types';

describe('Role-Based Access Control (RBAC)', () => {
  beforeEach(() => {
    setActiveRole('TRADER');
  });

  it('defines the three institutional roles with required attributes', () => {
    expect(ROLE_DEFINITIONS.TRADER).toBeDefined();
    expect(ROLE_DEFINITIONS.RISK_MANAGER).toBeDefined();
    expect(ROLE_DEFINITIONS.COMPLIANCE_OFFICER).toBeDefined();

    expect(ROLE_DEFINITIONS.TRADER.badgeLabel).toBe('TRADER');
    expect(ROLE_DEFINITIONS.RISK_MANAGER.badgeLabel).toBe('RISK MGR');
    expect(ROLE_DEFINITIONS.COMPLIANCE_OFFICER.badgeLabel).toBe('COMPLIANCE');
  });

  it('correctly maps permissions for TRADER role', () => {
    const permissions = getRolePermissions('TRADER');
    expect(permissions).toContain('TRADE_CREATE');
    expect(permissions).toContain('TRADE_PRICE');
    expect(permissions).toContain('TRADE_EXECUTE');
    expect(permissions).toContain('MARKS_EDIT');
    expect(permissions).not.toContain('TRADE_SETTLE');
    expect(permissions).not.toContain('MARKS_LOCK');
    expect(permissions).not.toContain('COMPLIANCE_SIGNOFF');

    expect(hasPermission('TRADER', 'TRADE_CREATE')).toBe(true);
    expect(hasPermission('TRADER', 'TRADE_SETTLE')).toBe(false);
  });

  it('correctly maps permissions for RISK_MANAGER role', () => {
    const permissions = getRolePermissions('RISK_MANAGER');
    expect(permissions).toContain('MARKS_LOCK');
    expect(permissions).toContain('MARKS_APPROVE');
    expect(permissions).toContain('RISK_VIEW_MTM');
    expect(permissions).toContain('TRADE_SETTLE');
    expect(permissions).not.toContain('TRADE_CREATE');
    expect(permissions).not.toContain('COMPLIANCE_SIGNOFF');

    expect(hasPermission('RISK_MANAGER', 'MARKS_LOCK')).toBe(true);
    expect(hasPermission('RISK_MANAGER', 'COMPLIANCE_SIGNOFF')).toBe(false);
  });

  it('correctly maps permissions for COMPLIANCE_OFFICER role', () => {
    const permissions = getRolePermissions('COMPLIANCE_OFFICER');
    expect(permissions).toContain('COMPLIANCE_SIGNOFF');
    expect(permissions).toContain('TRADE_SETTLE');
    expect(permissions).toContain('AUDIT_VIEW');
    expect(permissions).not.toContain('TRADE_CREATE');
    expect(permissions).not.toContain('MARKS_EDIT');
    expect(permissions).not.toContain('MARKS_LOCK');

    expect(hasPermission('COMPLIANCE_OFFICER', 'COMPLIANCE_SIGNOFF')).toBe(true);
    expect(hasPermission('COMPLIANCE_OFFICER', 'MARKS_EDIT')).toBe(false);
  });

  it('switches active role and notifies listeners', () => {
    let notifiedRole: Role | null = null;
    const unsub = onRoleChange(r => {
      notifiedRole = r;
    });

    setActiveRole('RISK_MANAGER');
    expect(getActiveRole()).toBe('RISK_MANAGER');
    expect(notifiedRole).toBe('RISK_MANAGER');
    expect(canActiveRole('MARKS_LOCK')).toBe(true);
    expect(canActiveRole('TRADE_CREATE')).toBe(false);

    setActiveRole('COMPLIANCE_OFFICER');
    expect(getActiveRole()).toBe('COMPLIANCE_OFFICER');
    expect(canActiveRole('COMPLIANCE_SIGNOFF')).toBe(true);

    unsub();
  });

  it('returns valid full session state', () => {
    setActiveRole('RISK_MANAGER');
    const session = getSessionState();
    expect(session.isAuthenticated).toBe(true);
    expect(session.activeRole).toBe('RISK_MANAGER');
    expect(session.user.role).toBe('RISK_MANAGER');
    expect(session.permissions).toContain('MARKS_LOCK');
  });

  it('falls back safely for unknown role in getRoleDefinition', () => {
    const def = getRoleDefinition('UNKNOWN' as any);
    expect(def).toEqual(ROLE_DEFINITIONS.TRADER);
  });
});
