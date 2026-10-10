import { describe, it, expect } from 'vitest';
import { HELPER_TOOLS, runHelperTool } from '../helperTools';
import { buildKnowledgePack } from '../knowledgePack';
import type { MarksState, CostInputs } from '../../netback/types';
import { getInitialState } from '../../../store/persistence';

const marks = {
  marks: {
    NL_GGE: { marketId: 'NL_GGE', bid: 0.36, offer: 0.4, mid: null, updatedAt: null, source: 'test' },
    DE_THG: { marketId: 'DE_THG', bid: null, offer: null, mid: 300, updatedAt: null, source: 'test' },
  },
} as unknown as MarksState;
const ctx = { marks, costs: {} as CostInputs };
const run = async (name: string, input: object) => JSON.parse(await runHelperTool(name, input, ctx));

describe('helper tools (read-only lookups into app data)', () => {
  it('every tool is strict, closed and in a stable order', () => {
    expect(HELPER_TOOLS.map(t => t.name)).toEqual(['get_marks', 'get_route', 'price_destinations', 'search_plants', 'get_plant', 'search_sources']);
    for (const t of HELPER_TOOLS) {
      expect(t.strict).toBe(true);
      expect((t.input_schema as { additionalProperties?: boolean }).additionalProperties).toBe(false);
    }
  });
  it('get_marks returns the mid (or bid/offer midpoint) and flags unknown ids', async () => {
    const out = await run('get_marks', { marketIds: ['NL_GGE', 'NOPE'] });
    expect(out[0]).toMatchObject({ marketId: 'NL_GGE', mid: 0.38 });
    expect(out[1].error).toContain('unknown');
  });
  it('get_route reports the audited ES → NL GO route and DK → NL block', async () => {
    expect((await run('get_route', { origin: 'ES', destination: 'NL' })).goRoute.status).toBe('POSSIBLE');
    expect((await run('get_route', { origin: 'DK', destination: 'NL' })).goRoute.status).toBe('NOT_POSSIBLE');
  });
  it('price_destinations values Spanish manure into NL GGE with the desk engines', async () => {
    const desk = getInitialState();
    const rows = JSON.parse(await runHelperTool('price_destinations', { origin: 'ES', feedstock: 'manure' }, { marks: desk.marks, costs: desk.costs }));
    const gge = rows.find((r: { market: string }) => r.market === 'NL_GGE');
    expect(gge).toBeDefined();
    expect(gge.notYetLaw).toBe(true);
  });
  it('search_plants and get_plant read the plant registry and its compliance research', async () => {
    const hits = await run('search_plants', { query: 'Ólvega', country: 'ES' });
    expect(hits.length).toBeGreaterThan(0);
    const plant = await run('get_plant', { plantId: hits[0].id });
    expect(plant.capacityNote).toContain('estimate');
  });
  it('search_sources matches multi-word questions', async () => {
    const hits = await run('search_sources', { query: 'FuelEU Maritime penalty' });
    expect(hits.length).toBeGreaterThan(0);
    expect(hits[0].url).toMatch(/^https?:/);
  });
  it('bad input throws, so the loop can return is_error', async () => {
    await expect(runHelperTool('price_destinations', { origin: 'ES', feedstock: 'unicorn' }, ctx)).rejects.toThrow(/unknown feedstock/);
    await expect(runHelperTool('nope', {}, ctx)).rejects.toThrow(/unknown tool/);
  });
});

describe('knowledge pack', () => {
  it('is deterministic and carries markets, constants, watchlist, regulatory KB and glossary', () => {
    const a = buildKnowledgePack();
    expect(buildKnowledgePack()).toBe(a);
    for (const part of ['MARKETS IN THE APP', 'REGULATORY CONSTANTS', 'REGULATORY WATCHLIST', 'REGULATORY KNOWLEDGE BASE', 'GLOSSARY']) expect(a).toContain(part);
    expect(a).toContain('NL_GGE');
    expect(a).not.toMatch(/\[object Object\]/);
  });
});
