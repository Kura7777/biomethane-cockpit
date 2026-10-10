import { describe, it, expect, vi } from 'vitest';
import { buildSuggestedQuestions, offlineAnswer, parseAnswer, matchGlossaryInText, buildSystemBlocks } from '../helperLogic';
import { askHelper, buildHelperRequest } from '../helperClient';
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

describe('AI mode request', () => {
  const input = { route: '/trade', guide: tradeGuide, history: [], question: 'why is this blocked?', context };

  it('carries the page guide, the context and cache_control on the static blocks', () => {
    const body = buildHelperRequest(input);
    expect(body.system.every(b => b.cache_control?.type === 'ephemeral')).toBe(true);
    expect(body.system[1].text).toContain('PAGE GUIDE: Trade Builder');
    expect(body.system[0].text).toContain('GLOSSARY');
    expect(body.messages[body.messages.length - 1].content).toContain('No GO route from DK to NL.');
    // Per-question data never goes in the cached blocks.
    expect(JSON.stringify(body.system)).not.toContain('No GO route from DK to NL.');
  });
  it('keeps roles alternating when an earlier request failed', () => {
    const body = buildHelperRequest({
      ...input,
      history: [
        { id: '1', role: 'user', text: 'a', sent: 'a' },
        { id: '2', role: 'assistant', text: 'b' },
        { id: '3', role: 'user', text: 'c', sent: 'c' },
      ],
    });
    expect(body.messages.map(m => m.role)).toEqual(['user', 'assistant', 'user']);
  });
  it('sends the key only in the header', async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ content: [{ type: 'text', text: 'answer' }] }), { status: 200 }));
    const text = await askHelper({ ...input, apiKey: KEY, fetchImpl: fetchImpl as unknown as typeof fetch });
    expect(text).toBe('answer');
    const [, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect((init.headers as Record<string, string>)['x-api-key']).toBe(KEY);
    expect(String(init.body)).not.toContain(KEY);
  });
  it('sanitises the key out of error text', async () => {
    const leak = vi.fn(async () => new Response(JSON.stringify({ error: { message: `bad key ${KEY}` } }), { status: 400 }));
    const e1 = await askHelper({ ...input, apiKey: KEY, fetchImpl: leak as unknown as typeof fetch }).catch((e: Error) => e);
    expect((e1 as Error).message).toContain('REDACTED');
    expect((e1 as Error).message).not.toContain(KEY);
    const net = vi.fn(async () => { throw new Error(`failed for ${KEY}`); });
    const e2 = await askHelper({ ...input, apiKey: KEY, fetchImpl: net as unknown as typeof fetch }).catch((e: Error) => e);
    expect((e2 as Error).message).not.toContain(KEY);
  });
  it('builds the system blocks without a guide', () => {
    expect(buildSystemBlocks(undefined, '/x')[1].text).toContain('No guide is written');
  });
});
