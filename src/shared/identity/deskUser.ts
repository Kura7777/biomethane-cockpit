/**
 * The name stamped on desk records (compliance sign-off). It is a plain local label the trader
 * can edit - there is no login, no roles and no server behind it, so it proves nothing about who
 * actually clicked. It lives in this browser's localStorage only.
 */
export const DESK_USER_STORAGE_KEY = 'biomethane_desk_user_name_v1';
export const DEFAULT_DESK_USER_NAME = 'Desk user';

export function getDeskUserName(): string {
  try {
    const v = localStorage.getItem(DESK_USER_STORAGE_KEY)?.trim();
    return v ? v : DEFAULT_DESK_USER_NAME;
  } catch {
    return DEFAULT_DESK_USER_NAME;
  }
}

export function setDeskUserName(name: string): void {
  try {
    const v = name.trim();
    if (v) localStorage.setItem(DESK_USER_STORAGE_KEY, v.slice(0, 60));
    else localStorage.removeItem(DESK_USER_STORAGE_KEY);
  } catch {
    // storage blocked: the name just stays the default
  }
}
