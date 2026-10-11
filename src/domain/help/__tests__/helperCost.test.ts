import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { askHelperStream, buildHelperMessages, buildHelperRequestBase, HELPER_MAX_TOOL_ROUNDS, HELPER_WEB_SEARCH_MAX_USES } from '../helperClient';
import { HELPER_MAX_TOKENS, HELPER_HISTORY_TURNS, buildSystemBlocks, helperBudgetNote, type HelperTurn } from '../helperLogic';
import { HELPER_MODELS, helperModelById } from '../helperModels';
import { addTodaySpendUsd, addUsage, dailyCapReached, EMPTY_USAGE, estimateCostUsd, formatUsd, getTodaySpendUsd, HELPER_SPEND_STORAGE_KEY } from '../helperCost';
import { getAssumption, resetAllAssumptions, setAssumption } from '../../assumptions/registry';
import type { MarksState, CostInputs } from '../../netback/types';

const KEY = 'sk-ant-test-secret-1234567890';
const toolCtx = { marks: { marks: {} } as unknown as MarksState, costs: {} as CostInputs };
const noop = { onText: () => {}, onStatus: () => {} };

function sse(events: object[]): Response {
  const body = events.map(e => `event: ${(e as { type: string }).type}\ndata: ${JSON.stringify(e)}\n\n`).join('');
  return new Response(body, { status: 200, headers: { 'content-type': 'text/event-stream' } });
}
const startWith = (usage: object) => ({ type: 'message_start', message: { id: 'm', type: 'message', role: 'assistant', model: 'claude-haiku-5-5', content: [], stop_reason: null, stop_sequence: null, usage } });
const stop = (reason: string, usage: object) => [{ type: 'message_delta', delta: { stop_reason: reason, stop_sequence: null }, usage }, { type: 'message_stop' }];

/** Round 1: a get_marks call (input 100, cache write 1000, output 50). Round 2: the text answer (input 20, cache read 1000, output 80, one web search). */
const round1 = () => sse([
  startWith({ input_tokens: 100, cache_creation_input_tokens: 1000, cache_read_input_tokens: 0, output_tokens: 0 }),
  { type: 'content_block_start', index: 0, content_block: { type: 'tool_use', id: 'tu_1', name: 'get_marks', input: {} } },
  { type: 'content_block_delta', index: 0, delta: { type: 'input_json_delta', partial_json: '{"marketIds":["NL_GGE"]}' } },
  { type: 'content_block_stop', index: 0 },
  ...stop('tool_use', { output_tokens: 50 }),
]);
const round2 = () => sse([
  startWith({ input_tokens: 20, cache_creation_input_tokens: 0, cache_read_input_tokens: 1000, output_tokens: 0 }),
  { type: 'content_block_start', index: 0, content_block: { type: 'text', text: '' } },
  { type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text: 'done' } },
  { type: 'content_block_stop', index: 0 },
  ...stop('end_turn', { output_tokens: 80, server_tool_use: { web_search_requests: 1 } }),
]);
const bodyOf = (fn: { mock: { calls: unknown[][] } }, i: number) => JSON.parse(String((fn.mock.calls[i][1] as RequestInit).body));
const input = { model: 'claude-opus-5-5', webSearch: true, route: '/ask', guide: undefined, history: [], question: 'q', context: {} };

beforeEach(() => {
  resetAllAssumptions();
});

describe('cost estimate', () => {
  it('sums every round of an Anthropic tool loop and prices it from the registry assumptions', async () => {
    const fetchImpl = vi.fn().mockResolvedValueOnce(round1()).mockResolvedValueOnce(round2());
    const res = await askHelperStream({ ...input, apiKey: KEY, toolCtx, fetchImpl: fetchImpl as unknown as typeof fetch, ...noop });
    expect(res.usage).toEqual({ inputTokens: 120, cacheWriteTokens: 1000, cacheReadTokens: 1000, outputTokens: 130, webSearches: 1 });
    // Opus 5.5: $4 in, $20 out, cache write 1.25x, cache read 0.05x, $10 per 1,000 searches.
    const expected = (120 * 4 + 1000 * 4 * 1.25 + 1000 * 4 * 0.05 + 130 * 20) / 1e6 + 0.01;
    expect(res.costUsd).toBeCloseTo(expected, 8);
    expect(res.costUsd).toBeCloseTo(estimateCostUsd(helperModelById('claude-opus-5-5'), res.usage), 12);
  });
  it('prices Gemini usage with the cached-input fraction, thinking tokens as output', () => {
    const flash = helperModelById('gemini-3.5-flash-lite');
    const usage = { ...EMPTY_USAGE, inputTokens: 1000, cacheReadTokens: 9000, outputTokens: 500 };
    expect(estimateCostUsd(flash, usage)).toBeCloseTo((1000 * 0.3 + 9000 * 0.3 * 0.1 + 500 * 2.5) / 1e6, 10);
    const pro = helperModelById('gemini-2.5-pro');
    expect(estimateCostUsd(pro, { ...EMPTY_USAGE, inputTokens: 1e6, outputTokens: 1e6 })).toBeCloseTo(1.25 + 10, 8);
  });
  it('follows a price changed on the Pricing desk', () => {
    const haiku = helperModelById('claude-haiku-5-5');
    const usage = addUsage(EMPTY_USAGE, { inputTokens: 1e6 });
    expect(estimateCostUsd(haiku, usage)).toBeCloseTo(0.1, 8);
    setAssumption('helper.price.haiku55.inputUsdPerMTok', 0.2);
    expect(estimateCostUsd(haiku, usage)).toBeCloseTo(0.2, 8);
  });
  it('formats cheap answers with three decimals', () => {
    expect(formatUsd(0.0042)).toBe('$0.004');
    expect(formatUsd(0.123)).toBe('$0.12');
    expect(formatUsd(0)).toBe('$0.00');
    expect(formatUsd(0.0001)).toBe('<$0.001');
  });
  it('every model prices from assumptions that exist', () => {
    for (const m of HELPER_MODELS) {
      for (const k of Object.values(m.price)) expect(Number.isFinite(getAssumption(k))).toBe(true);
      expect(getAssumption(m.price.input)).toBeGreaterThan(0);
    }
  });
});

describe('today and the daily cap', () => {
  beforeEach(() => {
    const store = new Map<string, string>();
    vi.stubGlobal('localStorage', { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => { store.set(k, v); }, removeItem: (k: string) => { store.delete(k); } });
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 9, 11, 10, 0, 0));
  });
  it('adds up the day, starts again on a new local date, and reaches the cap', () => {
    expect(getTodaySpendUsd()).toBe(0);
    addTodaySpendUsd(0.5);
    addTodaySpendUsd(1.4);
    expect(getTodaySpendUsd()).toBeCloseTo(1.9, 8);
    expect(dailyCapReached()).toBe(false);
    addTodaySpendUsd(0.2);
    expect(dailyCapReached()).toBe(true);
    setAssumption('helper.dailyCapUsd', 0);
    expect(dailyCapReached()).toBe(false); // 0 = no cap
    resetAllAssumptions();
    vi.setSystemTime(new Date(2026, 9, 12, 9, 0, 0));
    expect(getTodaySpendUsd()).toBe(0);
    expect(dailyCapReached()).toBe(false);
    expect(JSON.parse(localStorage.getItem(HELPER_SPEND_STORAGE_KEY) ?? '{}').date).toBe('2026-10-11');
  });
  it('words the budget note as the desk asked', () => {
    expect(helperBudgetNote(2)).toBe('Today’s AI budget ($2.00) is used up on this device; showing offline help. Change the cap on the Pricing desk.');
  });
  it('tolerates storage being unavailable', () => {
    vi.setSystemTime(new Date(2026, 9, 20, 9, 0, 0)); // a fresh day, so earlier in-memory totals do not count
    vi.stubGlobal('localStorage', { getItem: () => { throw new Error('blocked'); }, setItem: () => { throw new Error('blocked'); }, removeItem: () => {} });
    expect(() => addTodaySpendUsd(0.3)).not.toThrow();
    expect(getTodaySpendUsd()).toBeCloseTo(0.3, 8);
  });
  afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });
});

describe('lower running cost', () => {
  it('uses the trimmed limits', () => {
    expect(HELPER_MAX_TOKENS).toBe(8000);
    expect(HELPER_MAX_TOOL_ROUNDS).toBe(4);
    expect(HELPER_WEB_SEARCH_MAX_USES).toBe(2);
    expect(HELPER_HISTORY_TURNS).toBe(6);
  });
  it('sets effort per model: low for Haiku and Sonnet, medium for Opus', () => {
    expect(buildHelperRequestBase({ ...input, model: 'claude-haiku-5-5' }).output_config.effort).toBe('low');
    expect(buildHelperRequestBase({ ...input, model: 'claude-sonnet-5-5' }).output_config.effort).toBe('low');
    expect(buildHelperRequestBase({ ...input, model: 'claude-opus-5-5' }).output_config.effort).toBe('medium');
  });
  it('caps web searches at 2 per question', () => {
    const tool = buildHelperRequestBase(input).tools.find(t => 'type' in t && t.type === 'web_search_20260209') as { max_uses: number };
    expect(tool.max_uses).toBe(2);
  });
  it('keeps the static system block under 25,000 characters and byte-identical between builds', () => {
    const a = buildSystemBlocks(undefined, '/ask')[0].text;
    expect(a.length).toBeLessThanOrEqual(25000);
    expect(buildSystemBlocks(undefined, '/ask')[0].text).toBe(a);
    expect(a).toContain('lookup_reference');
    expect(a).toContain('MARKETS IN THE APP');
    expect(a).toContain('REGULATORY WATCHLIST');
    expect(a).toContain('[gge]');
  });
  it('sends only the last 6 turns of history, starting on a user turn', () => {
    const history: HelperTurn[] = [];
    for (let i = 0; i < 6; i++) {
      history.push({ id: `u${i}`, role: 'user', text: `question ${i}`, sent: `question ${i}` });
      history.push({ id: `a${i}`, role: 'assistant', text: `answer ${i}` });
    }
    const msgs = buildHelperMessages(history, 'now', {});
    expect(msgs).toHaveLength(HELPER_HISTORY_TURNS + 1);
    expect(msgs[0]).toMatchObject({ role: 'user', content: 'question 3' });
    expect(msgs[msgs.length - 1].role).toBe('user');
  });
  it('asks for an answer, not another tool, on the last allowed round', async () => {
    const fetchImpl = vi.fn(async () => round1());
    await askHelperStream({ ...input, apiKey: KEY, toolCtx, fetchImpl: fetchImpl as unknown as typeof fetch, ...noop }).catch(() => undefined);
    expect(fetchImpl).toHaveBeenCalledTimes(HELPER_MAX_TOOL_ROUNDS);
    expect(bodyOf(fetchImpl, 0).tool_choice).toBeUndefined();
    expect(bodyOf(fetchImpl, HELPER_MAX_TOOL_ROUNDS - 1).tool_choice).toEqual({ type: 'none' });
  });
});
