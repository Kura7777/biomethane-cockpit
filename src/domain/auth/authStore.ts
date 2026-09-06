import { Role, Permission, UserProfile, SessionState } from './types';
import { getRolePermissions, hasPermission as checkPermission, ROLE_DEFINITIONS } from './rbac';

export const ACTIVE_ROLE_STORAGE_KEY = 'biomethane_desk_active_role_v1';

export const DEFAULT_USER: UserProfile = {
  id: 'USR-DESK-01',
  name: 'Chris M. (Desk Principal)',
  email: 'c.mitchell@biomethane-desk.internal',
  desk: 'European Biomethane & Environmental Commodities',
  role: 'TRADER',
};

let currentRoleState: Role = 'TRADER';

// Try loading initial role from localStorage
try {
  if (typeof localStorage !== 'undefined') {
    const savedRole = localStorage.getItem(ACTIVE_ROLE_STORAGE_KEY) as Role;
    if (savedRole && ROLE_DEFINITIONS[savedRole]) {
      currentRoleState = savedRole;
    }
  }
} catch {
  // Ignored in non-browser environments
}

const listeners = new Set<(role: Role) => void>();

/**
 * Get current active role.
 */
export function getActiveRole(): Role {
  return currentRoleState;
}

/**
 * Switch active role and notify subscribers.
 */
export function setActiveRole(role: Role): void {
  if (!ROLE_DEFINITIONS[role]) return;
  currentRoleState = role;
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(ACTIVE_ROLE_STORAGE_KEY, role);
    }
  } catch {
    // Ignored
  }
  listeners.forEach(fn => fn(role));
}

/**
 * Subscribe to active role changes.
 */
export function onRoleChange(listener: (role: Role) => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * Check if the active role has a permission.
 */
export function canActiveRole(permission: Permission): boolean {
  return checkPermission(currentRoleState, permission);
}

/**
 * Get the current full session state.
 */
export function getSessionState(): SessionState {
  const role = getActiveRole();
  return {
    user: { ...DEFAULT_USER, role },
    activeRole: role,
    permissions: getRolePermissions(role),
    isAuthenticated: true,
  };
}
