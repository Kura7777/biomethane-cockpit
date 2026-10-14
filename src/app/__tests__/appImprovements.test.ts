import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { lazyWithRetry } from '../App';
import { SIDEBAR_ITEMS } from '../navConfig';

const storageMap = new Map<string, string>();
const mockSessionStorage = {
  getItem: (k: string) => storageMap.get(k) ?? null,
  setItem: (k: string, v: string) => { storageMap.set(k, String(v)); },
  removeItem: (k: string) => { storageMap.delete(k); },
  clear: () => { storageMap.clear(); },
  key: (i: number) => Array.from(storageMap.keys())[i] ?? null,
  get length() { return storageMap.size; },
};

describe('App Improvements: lazyWithRetry & Navigation Shortcuts', () => {
  beforeEach(() => {
    storageMap.clear();
    vi.stubGlobal('sessionStorage', mockSessionStorage);
    vi.stubGlobal('window', {
      location: {
        hash: '',
        reload: vi.fn(),
      },
    });
    vi.restoreAllMocks();
  });

  it('removes chunk_reload_ hash flag from sessionStorage on successful module load', async () => {
    window.location.hash = '#/trade';
    const reloadKey = 'chunk_reload_#/trade';
    sessionStorage.setItem(reloadKey, 'true');

    const DummyComponent = () => React.createElement('div', null, 'Loaded');
    const mockFactory = vi.fn().mockResolvedValue({ default: DummyComponent });

    const LazyComp = lazyWithRetry(mockFactory);

    // Call the underlying factory via the lazy wrapper's internal loader
    const loaded = await (LazyComp as any)._payload._result();
    expect(loaded.default).toBe(DummyComponent);
    expect(sessionStorage.getItem(reloadKey)).toBeNull();
  });

  it('sets reload flag and reloads on ChunkLoadError when not previously reloaded', async () => {
    window.location.hash = '#/plants';
    const reloadKey = 'chunk_reload_#/plants';
    const reloadSpy = vi.fn();
    Object.defineProperty(window, 'location', {
      value: { ...window.location, hash: '#/plants', reload: reloadSpy },
      writable: true,
    });

    const chunkError = new Error('Failed to fetch dynamically imported module /assets/plants.js');
    const mockFactory = vi.fn().mockRejectedValue(chunkError);

    const LazyComp = lazyWithRetry(mockFactory);

    // _result starts the loader; when chunk error triggers reload, it returns an unresolved promise.
    (LazyComp as any)._payload._result();
    await new Promise(r => setTimeout(r, 10));

    expect(sessionStorage.getItem(reloadKey)).toBe('true');
    expect(reloadSpy).toHaveBeenCalled();
  });

  it('every non-empty keyHint in SIDEBAR_ITEMS corresponds to an advertised shortcut', () => {
    const advertisedShortcuts: Record<string, string> = {
      'B': '/brief',
      '1': '/sourcing',
      '2': '/plants',
      'G': '/registries',
      '3': '/map',
      '4': '/trade',
      'M': '/fueleu-shipping',
      'E': '/ets2',
      'L': '/clients',
      'Q': '/corporate',
      '5': '/pricing',
      '7': '/data-sources',
    };

    for (const item of SIDEBAR_ITEMS) {
      if (item.keyHint) {
        expect(advertisedShortcuts[item.keyHint]).toBe(item.to);
      }
    }
  });
});
