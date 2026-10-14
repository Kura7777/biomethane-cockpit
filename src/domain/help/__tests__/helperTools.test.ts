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
    expect(HELPER_TOOLS.map(t => t.name)).toEqual([
      'get_marks',
      'get_route',
      'price_destinations',
      'search_plants',
      'get_plant',
      'search_sources',
      'lookup_reference',
      'get_desk_memory',
      'save_desk_memory',
      'search_shipping_counterparties',
      'get_shipping_counterparty',
      'parse_and_stage_marks',
      'solve_deal_breakeven',
      'evaluate_contract_or_pos',
    ]);
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
  it('saves and retrieves rules via get_desk_memory and save_desk_memory', async () => {
    const saveRes = await run('save_desk_memory', {
      subject: 'TotalEnergies',
      rule: 'Insists on bilateral UDB transfer and RED III certified manure substrate.',
      category: 'counterparty',
    });
    expect(saveRes.success).toBe(true);
    expect(saveRes.savedRule.subject).toBe('TotalEnergies');

    const fetchRes = await run('get_desk_memory', { query: 'TotalEnergies' });
    expect(fetchRes.rulesFound).toBeGreaterThan(0);
    expect(fetchRes.rules[0].subject).toBe('TotalEnergies');
  });
  it('searches and retrieves shipping counterparties under FuelEU Maritime', async () => {
    // 1. Search by query 'Maersk'
    const maerskSearch = await run('search_shipping_counterparties', { query: 'Maersk' });
    expect(maerskSearch.totalFound).toBeGreaterThan(0);
    expect(maerskSearch.results[0].name).toContain('Maersk');
    expect(maerskSearch.results[0].penalty2026Y1Eur).toBeGreaterThan(0);

    // 2. Search by segment 'Container ship'
    const containerSearch = await run('search_shipping_counterparties', { segment: 'Container ship', limit: 5 });
    expect(containerSearch.results.length).toBe(5);
    expect(containerSearch.results.every((r: { segment: string }) => r.segment === 'Container ship')).toBe(true);

    // 3. Search dual-fuel LNG capability
    const dualFuelSearch = await run('search_shipping_counterparties', { fleetCapability: 'DUAL_FUEL_LNG', limit: 5 });
    expect(dualFuelSearch.results.every((r: { fleetCapability: string }) => r.fleetCapability === 'DUAL_FUEL_LNG')).toBe(true);

    // 4. Get by rank '1'
    const rank1 = await run('get_shipping_counterparty', { rankOrName: '1' });
    expect(rank1.rank).toBe(1);
    expect(rank1.name).toBe('Maersk A/S');
    expect(rank1.fuelMix.vlsfoTonnes).toBeGreaterThan(0);
    expect(rank1.regulatoryExposure.penalty2026Y1Eur).toBeGreaterThan(1000000);
    expect(rank1.group.name).toContain('Maersk');

    // 5. Get by name 'MSC'
    const msc = await run('get_shipping_counterparty', { rankOrName: 'MSC' });
    expect(msc.name).toContain('MSC');
    expect(msc.regulatoryExposure.complianceBalance2026Tco2e).toBeLessThan(0);
  });
  it('parse_and_stage_marks parses quotes and triggers onStageMarks callback', async () => {
    let stagedData: any = null;
    const testCtx = { ...ctx, onStageMarks: (res: any) => { stagedData = res; } };
    const rawRun = `DE THG 2026: 295 / 305 €/tCO2e
NL GGE 2026: 0.38 / 0.42
TTF: 39.10`;
    const res = JSON.parse(await runHelperTool('parse_and_stage_marks', { text: rawRun, brokerName: 'Marex' }, testCtx));
    expect(res.status).toBe('staged');
    expect(res.validCount).toBeGreaterThan(0);
    expect(res.stagedMarks.some((m: any) => m.marketId === 'DE_THG')).toBe(true);
    expect(stagedData).not.toBeNull();
    expect(stagedData.validCount).toBeGreaterThan(0);
  });
  it('solve_deal_breakeven ranks European destinations, calculates margins, and emits Trade Builder deep-links', async () => {
    const res = JSON.parse(await runHelperTool('solve_deal_breakeven', {
      origin: 'DK',
      feedstock: 'manure',
      customCi: -85,
      producerPriceEur: 95,
      targetMarginEur: 4,
    }, ctx));

    expect(res.origin).toBe('DK');
    expect(res.ciUsed).toBe(-85);
    expect(res.destinationsEvaluated).toBeGreaterThan(0);
    expect(res.rankedDestinations.length).toBeGreaterThan(0);
    const top = res.rankedDestinations[0];
    expect(top.netNetbackEurPerMwh).toBeGreaterThan(0);
    expect(top.maxPlantGatePriceEur).toBeDefined();
    expect(top.deepLink).toContain('[[go:/trade?');
    expect(top.deepLink).toContain('origin=DK');
    expect(top.deepLink).toContain('ci=-85');
  });
  it('evaluate_contract_or_pos parses certificate, verifies RED III compliance, and generates custody clauses', async () => {
    const samplePos = `ISCC EU Proof of Sustainability
Certificate Number: EU-ISCC-Cert-ES214-99482710
Issuing Body: DNV Business Assurance
Country: ES
Raw material: 100% pig slurry and cattle manure
Total GHG emissions: -40.0 gCO2eq/MJ
Chain of Custody: Mass Balance`;

    const res = JSON.parse(await runHelperTool('evaluate_contract_or_pos', { text: samplePos }, ctx));
    expect(res.isValid).toBe(true);
    expect(res.scheme).toBe('ISCC_EU');
    expect(res.canonicalFeedstock).toBe('manure');
    expect(res.redIiiCompliant).toBe(true);
    expect(res.marketClearance.length).toBeGreaterThan(0);
    expect(res.custodyClauses.length).toBeGreaterThan(0);
  });
  it('bad input throws, so the loop can return is_error', async () => {
    await expect(runHelperTool('price_destinations', { origin: 'ES', feedstock: 'unicorn' }, ctx)).rejects.toThrow(/unknown feedstock/);
    await expect(runHelperTool('nope', {}, ctx)).rejects.toThrow(/unknown tool/);
  });
});

describe('lookup_reference (the full text behind the system-prompt index)', () => {
  it('returns the full glossary entry for a term id', async () => {
    const out = await run('lookup_reference', { query: 'gge' });
    expect(out.glossary[0]).toMatchObject({ id: 'gge' });
    expect(out.glossary[0].meaning.length).toBeGreaterThan(40);
    expect(out.glossary[0].whyItMatters.length).toBeGreaterThan(10);
  });
  it('returns the matching regulatory knowledge-base document', async () => {
    const out = await run('lookup_reference', { query: 'RED III Article 29 greenhouse gas savings' });
    expect(out.knowledgeBase[0].id).toBe('red_iii_directive');
    expect(out.knowledgeBase[0].text).toContain('Article 29');
  });
  it('returns market details by id, says so when nothing matches, and rejects an empty query', async () => {
    expect((await run('lookup_reference', { query: 'NL_GGE' })).markets[0].id).toBe('NL_GGE');
    expect((await run('lookup_reference', { query: 'qqqzzz' })).note).toContain('Nothing in the reference');
    await expect(runHelperTool('lookup_reference', { query: ' ' }, ctx)).rejects.toThrow('query is required');
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
