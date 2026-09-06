import { useState, useEffect } from 'react';
import { Role, Permission } from '../../domain/auth/types';
import { hasPermission as checkPermission, getRolePermissions } from '../../domain/auth/rbac';
import { getActiveRole, setActiveRole, onRoleChange, getSessionState, DEFAULT_USER } from '../../domain/auth/authStore';

export function useAuth() {
  const [role, setRoleState] = useState<Role>(getActiveRole);

  useEffect(() => {
    return onRoleChange(newRole => {
      setRoleState(newRole);
    });
  }, []);

  const changeRole = (newRole: Role) => {
    setActiveRole(newRole);
  };

  const can = (permission: Permission) => {
    return checkPermission(role, permission);
  };

  return {
    role,
    setRole: changeRole,
    can,
    permissions: getRolePermissions(role),
    user: { ...DEFAULT_USER, role },
    session: getSessionState(),
  };
}
