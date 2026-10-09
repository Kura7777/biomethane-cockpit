import { describe, it, expect } from 'vitest';
import { SIDEBAR_ITEMS, getPageTitle, isNavItemActive } from '../navConfig';

describe('getPageTitle', () => {
  it('resolves every SIDEBAR_ITEMS route to its own label — no silent fallback for a real nav route', () => {
    for (const item of SIDEBAR_ITEMS) {
      expect(getPageTitle(item.to)).toBe(item.label);
    }
  });

  it('treats the root path as the Morning brief, the app\'s landing page', () => {
    expect(getPageTitle('/')).toBe('Morning brief');
    expect(getPageTitle('/sourcing')).toBe('Origination');
  });

  it('marks the Brief tab active on the landing page and Origination only on its own routes', () => {
    expect(isNavItemActive('/brief', '/')).toBe(true);
    expect(isNavItemActive('/brief', '/brief')).toBe(true);
    expect(isNavItemActive('/sourcing', '/')).toBe(false);
    expect(isNavItemActive('/sourcing', '/commercial')).toBe(true);
  });

  it('resolves a nested path under a nav route to that route\'s label', () => {
    expect(getPageTitle('/plants/friedland')).toBe('Plants (1,974)');
  });

  it('falls back to a capitalized route segment for a route outside SIDEBAR_ITEMS', () => {
    expect(getPageTitle('/settings')).toBe('Settings');
    expect(getPageTitle('/citations')).toBe('Citations');
  });

  it('falls back to a generic label for an empty or unrecognised path', () => {
    expect(getPageTitle('')).toBe('Biomethane Desk');
  });
});
