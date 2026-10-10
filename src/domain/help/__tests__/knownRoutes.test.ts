import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { KNOWN_ROUTES, resolveGoTarget } from '../knownRoutes';

describe('knownRoutes', () => {
  it('lists exactly the paths declared in App.tsx', () => {
    const app = readFileSync(resolve(__dirname, '../../../app/App.tsx'), 'utf8');
    const declared = [...app.matchAll(/<Route path="([^"]+)"/g)].map(m => m[1]).filter(p => p !== '*');
    expect([...KNOWN_ROUTES].sort()).toEqual([...declared].sort());
  });

  it('accepts a known route with a plain query and rejects everything else', () => {
    expect(resolveGoTarget('/pricing?tab=assumptions')?.to).toBe('/pricing?tab=assumptions');
    expect(resolveGoTarget('/trade?marketId=NL_GGE&origin=DK')).not.toBeNull();
    expect(resolveGoTarget('/nowhere')).toBeNull();
    expect(resolveGoTarget('https://evil.example/pricing')).toBeNull();
    expect(resolveGoTarget('/pricing?tab=<script>')).toBeNull();
    expect(resolveGoTarget('//evil.example')).toBeNull();
  });
});
