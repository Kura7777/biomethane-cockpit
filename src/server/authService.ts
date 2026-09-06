import { Role, RoleDefinition, SessionState, UserProfile } from '../domain/auth/types';
import { ROLE_DEFINITIONS, getRolePermissions } from '../domain/auth/rbac';

const DEFAULT_USER: UserProfile = {
  id: 'USR-DESK-01',
  name: 'Chris M. (Desk Principal)',
  email: 'c.mitchell@biomethane-desk.internal',
  desk: 'European Biomethane & Environmental Commodities',
  role: 'TRADER',
};

class AuthService {
  private activeRole: Role = 'TRADER';
  private currentUser: UserProfile = { ...DEFAULT_USER };

  public getSession(): SessionState {
    return {
      user: { ...this.currentUser, role: this.activeRole },
      activeRole: this.activeRole,
      permissions: getRolePermissions(this.activeRole),
      isAuthenticated: true,
    };
  }

  public switchRole(newRole: Role): SessionState {
    if (ROLE_DEFINITIONS[newRole]) {
      this.activeRole = newRole;
      this.currentUser.role = newRole;
    }
    return this.getSession();
  }

  public getRoles(): RoleDefinition[] {
    return Object.values(ROLE_DEFINITIONS);
  }

  public reset(): void {
    this.activeRole = 'TRADER';
    this.currentUser = { ...DEFAULT_USER };
  }
}

export const authService = new AuthService();
