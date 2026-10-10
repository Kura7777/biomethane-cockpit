import { describe, it, expect, vi } from 'vitest';
import { buildSuggestedQuestions, offlineAnswer, parseAnswer, matchGlossaryInText, buildSystemBlocks } from '../helperLogic';
import { askHelperStream, buildHelperRequestBase, buildHelperMessages } from '../helperClient';
import type { MarksState, CostInputs } from '../../netback/types';
import { getPageGuide } from '../pageGuides';

const tradeGuide = getPageGuide('/trade');
const context = {
  route: '/trade',
  checklist: [
    { id: 'go-route-nl', label: 'GO route DK → NL', status: 'FAIL', detail: 'No GO route from DK to NL.' },
    { id: 'booking', label: 'Booking date', status: 'TODO', detail: 'Enter the booking date.' },
  ],
};
const KEY = 'sk-ant-test-secret-1234567890';

describe('parseAnswer', () => {
  it('turns valid routes into buttons and unknown ones into plain text', () => {
    const segs = parseAnswer('See [[go:/pricing?tab=costs|Costs]] and [[go:/nowhere|Nowhere]] now.');
    expect(segs.map(s => s.kind)).toEqual(['text', 'link', 'text', 'plain', 'text']);
    expect(segs[1]).toMatchObject({ to: '/pricing?tab=costs', label: 'Costs' });
    expect(segs[3]).toMatchObject({ text: 'Nowhere' });
  });
  it('never produces HTML or a javascript target', () => {
    const segs = parseAnswer('<img src=x onerror=alert(1)> [[go:javascript:alert(1)|Click]] [[go:/pricing?x=<b>|Bad]]');
    expect(segs.filter(s => s.kind === 'link')).toEqual([]);
    expect(segs[0]).toMatchObject({ kind: 'text' });
  });
});

describe('offline mode', () => {
  it('matches terms and aliases typed in a sentence', () => {
    expect(matchGlossaryInText('What does THG mean?').length).toBeGreaterThan(0);
    expect(offlineAnswer('What does THG mean?', tradeGuide).glossary.length).toBeGreaterThan(0);
  });
  it('reads the live checklist for why/what-next questions', () => {
    const a = offlineAnswer('Why is GO route DK → NL failing?', tradeGuide, context);
    expect(a.lines.join('\n')).toContain('No GO route from DK to NL.');
    expect(a.lines.join('\n')).toContain('Enter the booking date.');
  });
  it('falls back to the page overview', () => {
    const a = offlineAnswer('zzzz', tradeGuide);
    expect(a.overview).toBe(true);
    expect(a.lines[0]).toContain('Trade Builder');
  });
  it('puts context-aware questions first', () => {
    const q = buildSuggestedQuestions(tradeGuide, context);
    expect(q[0]).toBe('Why is GO route DK → NL failing?');
    expect(q[1]).toBe('What do I still need to fill in?');
    expect(buildSuggestedQuestions(tradeGuide, {})[0]).toBe(tradeGuide!.suggestedQuestions[0]);
  });
});

// ── Recorded server-sent events for the SDK's streaming parser ──────────────
function sse(events: object[]): Response {
  const body = events.map(e => `event: ${(e as { type: string }).type}\ndata: ${JSON.stringify(e)}\n\n`).join('');
  return new Response(body, { status: 200, headers: { 'content-type': 'text/event-stream' } });
}
const start = { type: 'message_start', message: { id: 'msg_1', type: 'message', role: 'assistant', model: 'claude-opus-5-5', content: [], stop_reason: null, stop_sequence: null, usage: { input_tokens: 1, output_tokens: 0 } } };
const end = (stop: string) => [{ type: 'message_delta', delta: { stop_reason: stop, stop_sequence: null }, usage: { output_tokens: 1 } }, { type: 'message_stop' }];
const textReply = (text: string) => sse([
  start,
  { type: 'content_block_start', index: 0, content_block: { type: 'text', text: '' } },
  { type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text } },
  { type: 'content_block_stop', index: 0 },
  ...end('end_turn'),
]);
const toolReply = (name: string, input: object) => sse([
  start,
  { type: 'content_block_start', index: 0, content_block: { type: 'tool_use', id: 'tu_1', name, input: {} } },
  { type: 'content_block_delta', index: 0, delta: { type: 'input_json_delta', partial_json: JSON.stringify(input) } },
  { type: 'content_block_stop', index: 0 },
  ...end('tool_use'),
]);

const marks = { marks: { NL_GGE: { marketId: 'NL_GGE', bid: null, offer: null, mid: 0.4, updatedAt: null, source: 'test' } } } as unknown as MarksState;
const toolCtx = { marks, costs: {} as CostInputs };
const noop = { onText: () => {}, onStatus: () => {} };
const bodyOf = (fn: { mock: { calls: unknown[][] } }, i: number) => JSON.parse(String((fn.mock.calls[i][1] as RequestInit).body));

describe('AI mode request', () => {
  const input = { model: 'claude-opus-5-5', webSearch: true, route: '/trade', guide: tradeGuide, history: [], question: 'why is this blocked?', context };

  it('caches the static blocks: rules + knowledge pack, then the page guide; per-question data stays out', () => {
    const base = buildHelperRequestBase(input);
    expect(base.system.every(b => b.cache_control?.type === 'ephemeral')).toBe(true);
    expect(base.system[0].text).toContain('KNOWLEDGE PACK');
    expect(base.system[0].text).toContain('MARKETS IN THE APP');
    expect(base.system[1].text).toContain('PAGE GUIDE: Trade Builder');
    expect(JSON.stringify(base.system)).not.toContain('No GO route from DK to NL.');
    const msgs = buildHelperMessages([], input.question, context);
    expect(String(msgs[msgs.length - 1].content)).toContain('No GO route from DK to NL.');
  });
  it('produces byte-identical static blocks and tools on every request (prompt cache)', () => {
    const a = buildHelperRequestBase(input);
    const b = buildHelperRequestBase(input);
    expect(JSON.stringify(a.system[0])).toBe(JSON.stringify(b.system[0]));
    expect(JSON.stringify(a.tools)).toBe(JSON.stringify(b.tools));
  });
  it('no longer restricts answers to the glossary, and labels general knowledge instead', () => {
    const rules = buildHelperRequestBase(input).system[0].text;
    expect(rules).not.toMatch(/use ONLY|answer only from|Grounded answers only/i);
    expect(rules).toContain('(general knowledge)');
    expect(rules).toContain('Never refuse');
  });
  it('adds web search only when the desk setting allows it, plus refusal fallbacks', () => {
    const on = buildHelperRequestBase(input);
    expect(on.tools.some(t => 'type' in t && t.type === 'web_search_20260209')).toBe(true);
    expect(on.fallbacks).toBe('default');
    expect(on.betas).toContain('server-side-fallback-2026-07-01');
    const off = buildHelperRequestBase({ ...input, webSearch: false });
    expect(off.tools.some(t => 'type' in t && t.type === 'web_search_20260209')).toBe(false);
  });
  it('keeps roles alternating when an earlier request failed', () => {
    const msgs = buildHelperMessages([
      { id: '1', role: 'user', text: 'a', sent: 'a' },
      { id: '2', role: 'assistant', text: 'b' },
      { id: '3', role: 'user', text: 'c', sent: 'c' },
    ], 'q', {});
    expect(msgs.map(m => m.role)).toEqual(['user', 'assistant', 'user']);
  });
  it('streams the answer and sends the key only in the header', async () => {
    const fetchImpl = vi.fn(async (_url: string, _init: RequestInit) => textReply('answer'));
    let streamed = '';
    const res = await askHelperStream({ ...input, apiKey: KEY, toolCtx, fetchImpl: fetchImpl as unknown as typeof fetch, onText: d => { streamed += d; }, onStatus: () => {} });
    expect(res.text).toBe('answer');
    expect(streamed).toBe('answer');
    const init = fetchImpl.mock.calls[0][1];
    expect(new Headers(init.headers as HeadersInit).get('x-api-key')).toBe(KEY);
    expect(String(init.body)).not.toContain(KEY);
  });
  it('runs a tool call and sends its result back in the next request', async () => {
    const fetchImpl = vi.fn()
      .mockResolvedValueOnce(toolReply('get_marks', { marketIds: ['NL_GGE'] }))
      .mockResolvedValueOnce(textReply('NL GGE is at 0.40'));
    const statuses: (string | null)[] = [];
    const res = await askHelperStream({ ...input, apiKey: KEY, toolCtx, fetchImpl: fetchImpl as unknown as typeof fetch, onText: () => {}, onStatus: s => statuses.push(s) });
    expect(res.text).toBe('NL GGE is at 0.40');
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    const second = bodyOf(fetchImpl, 1);
    const last = second.messages[second.messages.length - 1];
    expect(last.role).toBe('user');
    expect(last.content[0]).toMatchObject({ type: 'tool_result', tool_use_id: 'tu_1' });
    expect(last.content[0].content).toContain('"mid":0.4');
    expect(statuses).toContain('Reading desk marks');
  });
  it('returns tool errors to the model as is_error instead of crashing', async () => {
    const fetchImpl = vi.fn()
      .mockResolvedValueOnce(toolReply('get_plant', { plantId: 'nope' }))
      .mockResolvedValueOnce(textReply('I could not find that plant.'));
    await askHelperStream({ ...input, apiKey: KEY, toolCtx, fetchImpl: fetchImpl as unknown as typeof fetch, ...noop });
    const second = bodyOf(fetchImpl, 1);
    expect(second.messages[second.messages.length - 1].content[0].is_error).toBe(true);
  });
  it('sanitises the key out of error text', async () => {
    const leak = vi.fn(async () => new Response(JSON.stringify({ type: 'error', error: { type: 'invalid_request_error', message: `bad key ${KEY}` } }), { status: 400, headers: { 'content-type': 'application/json' } }));
    const e1 = await askHelperStream({ ...input, apiKey: KEY, toolCtx, fetchImpl: leak as unknown as typeof fetch, ...noop }).catch((e: Error) => e);
    expect((e1 as Error).message).not.toContain(KEY);
    const net = vi.fn(async () => { throw new Error(`failed for ${KEY}`); });
    const e2 = await askHelperStream({ ...input, apiKey: KEY, toolCtx, fetchImpl: net as unknown as typeof fetch, ...noop }).catch((e: Error) => e);
    expect((e2 as Error).message).not.toContain(KEY);
  });
  it('builds the system blocks without a guide', () => {
    expect(buildSystemBlocks(undefined, '/x')[1].text).toContain('No guide is written');
  });
});
