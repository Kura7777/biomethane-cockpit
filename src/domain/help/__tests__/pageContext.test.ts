import { describe, it, expect } from 'vitest';
import { CONTEXT_BUDGET_CHARS, capContext, getPageContext, registerPageContext } from '../pageContext';

const long = (n: number) => 'x'.repeat(n);

describe('page context', () => {
  it('falls back to route and page title when nothing is registered', () => {
    expect(getPageContext('/glossary')).toEqual({ route: '/glossary', page: 'Glossary' });
    expect(getPageContext('/')).toMatchObject({ route: '/brief' });
  });

  it('removes anything that looks like a key', () => {
    const out = capContext({ apiKey: 'sk-ant-abcdef123456', nested: { token: 'a', note: 'key is sk-ant-abcdef123456 ok' }, ok: 1 });
    const json = JSON.stringify(out);
    expect(json).not.toContain('sk-ant-abcdef');
    expect(json).not.toContain('apiKey');
    expect(json).not.toContain('token');
    expect(out.ok).toBe(1);
  });

  it('keeps every provider under the size budget, whatever it returns', () => {
    const shapes: Record<string, Record<string, unknown>> = {
      '/trade': { checklist: Array.from({ length: 14 }, (_, i) => ({ id: `i${i}`, label: `Item ${i}`, status: 'TODO', detail: long(600) })) },
      '/map': { destinations: Array.from({ length: 12 }, (_, i) => ({ market: `M${i}`, reason: long(500), openItems: i })) },
      '/plants': { plantCompliance: { readinessItems: Array.from({ length: 10 }, () => ({ detail: long(700) })) } },
      '/pricing': { openAssumptions: Array.from({ length: 12 }, () => ({ label: long(80), why: long(500) })) },
      '/brief': { ladder: { top3: [1, 2, 3].map(() => ({ market: long(900) })) } },
    };
    for (const [route, data] of Object.entries(shapes)) {
      const off = registerPageContext(route, () => data, 'test-size');
      const ctx = getPageContext(route);
      expect(JSON.stringify(ctx).length, route).toBeLessThanOrEqual(CONTEXT_BUDGET_CHARS);
      off();
    }
  });

  it('merges several parts on one route and survives a throwing provider', () => {
    const a = registerPageContext('/map', () => ({ a: 1 }), 'a');
    const b = registerPageContext('/map', () => { throw new Error('boom'); }, 'b');
    const c = registerPageContext('/map', () => ({ c: 2 }), 'c');
    expect(getPageContext('/map')).toMatchObject({ a: 1, c: 2 });
    a(); b(); c();
    expect(Object.keys(getPageContext('/map')).sort()).toEqual(['page', 'route']);
  });
});
