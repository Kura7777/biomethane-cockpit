import { describe, it, expect } from 'vitest';
import { SIDEBAR_ITEMS, getPageTitle } from '../navConfig';

describe('getPageTitle', () => {
  it('resolves every SIDEBAR_ITEMS route to its own label — no silent fallback for a real nav route', () => {
    for (const item of SIDEBAR_ITEMS) {
      expect(getPageTitle(item.to)).toBe(item.label);
    }
  });

  it('treats the root path as the Origination workspace', () => {
    expect(getPageTitle('/')).toBe('Origination');
  });

  it('resolves a nested path under a nav route to that route\'s label', () => {
    expect(getPageTitle('/plants/friedland')).toBe('Plants (1,975)');
  });

  it('falls back to a capitalized route segment for a route outside SIDEBAR_ITEMS', () => {
    expect(getPageTitle('/settings')).toBe('Settings');
    expect(getPageTitle('/citations')).toBe('Citations');
  });

  it('falls back to a generic label for an empty or unrecognised path', () => {
    expect(getPageTitle('')).toBe('Biomethane Desk');
  });
});
