import { describe, expect, it, vi } from 'vitest';
import { askGeminiStream, buildGeminiContents, buildGeminiRequestBody, geminiFunctionDeclarations, toGeminiSchema } from '../geminiHelperClient';
import { HELPER_TOOLS } from '../helperTools';
import { HELPER_MAX_TOOL_ROUNDS } from '../helperClient';
import { buildSystemBlocks } from '../helperLogic';
import { geminiKeyShapeProblem, testGeminiApiKeyLive } from '../../regcheck/keyCheck';
import { geminiKeyFingerprint, normaliseGeminiApiKey } from '../../regcheck/storage';
import type { MarksState, CostInputs } from '../../netback/types';

const KEY = 'AIzaSyTESTSECRET1234567890abcdefghijk';
const marks = { marks: { NL_GGE: { marketId: 'NL_GGE', bid: null, offer: null, mid: 0.4, updatedAt: null, source: 'test' } } } as unknown as MarksState;
const toolCtx = { marks, costs: {} as CostInputs };
const noop = { onText: () => {}, onStatus: () => {} };
const input = { model: 'gemini-3.5-flash-lite', webSearch: true, route: '/ask', guide: undefined, history: [], question: 'What is NL GGE at?', context: { route: '/ask' } };

/** A recorded Gemini stream: one "data:" line per chunk. */
function geminiSse(chunks: object[], status = 200): Response {
  return new Response(chunks.map(c => `data: ${JSON.stringify(c)}\r\n\r\n`).join(''), { status, headers: { 'content-type': 'text/event-stream' } });
}
const callChunk = (extra: object = {}) => geminiSse([
  { candidates: [{ content: { role: 'model', parts: [{ text: 'Let me check. ' }] } }] },
  { candidates: [{ content: { role: 'model', parts: [{ functionCall: { name: 'get_marks', args: { marketIds: ['NL_GGE'] }, id: 'call_1' }, thoughtSignature: 'SIG1' }] }, finishReason: 'STOP' }],
    usageMetadata: { promptTokenCount: 5000, cachedContentTokenCount: 0, candidatesTokenCount: 30, thoughtsTokenCount: 70, ...extra } },
]);
const answerChunk = (groundingMetadata?: object) => geminiSse([
  { candidates: [{ content: { role: 'model', parts: [{ text: 'NL GGE mid is ' }] } }] },
  { candidates: [{ content: { role: 'model', parts: [{ text: '0.40.' }] }, finishReason: 'STOP', ...(groundingMetadata ? { groundingMetadata } : {}) }],
    usageMetadata: { promptTokenCount: 5400, cachedContentTokenCount: 4000, candidatesTokenCount: 20, thoughtsTokenCount: 0 } },
]);
const bodyOf = (fn: { mock: { calls: unknown[][] } }, i: number) => JSON.parse(String((fn.mock.calls[i][1] as RequestInit).body));

describe('Gemini request', () => {
  it('converts the desk tools to functionDeclarations without additionalProperties', () => {
    const decls = geminiFunctionDeclarations();
    expect(decls.map(d => d.name)).toEqual(HELPER_TOOLS.map(t => t.name));
    expect(JSON.stringify(decls)).not.toContain('additionalProperties');
    expect(JSON.stringify(decls)).not.toContain('strict');
    const plants = decls.find(d => d.name === 'search_plants')!.parameters as { type: string; required: string[]; properties: Record<string, { type: string; nullable?: boolean }> };
    expect(plants.type).toBe('OBJECT');
    expect(plants.required).toEqual(['query', 'country']);
    expect(plants.properties.country).toMatchObject({ type: 'STRING', nullable: true });
    expect(toGeminiSchema({ type: 'array', items: { type: 'string' }, description: 'ids' })).toEqual({ type: 'ARRAY', items: { type: 'STRING' }, description: 'ids' });
  });
  it('sends the same system prompt as one systemInstruction, and history as user/model contents', () => {
    const body = buildGeminiRequestBody(input, buildGeminiContents([
      { id: '1', role: 'user', text: 'a', sent: 'a' },
      { id: '2', role: 'assistant', text: 'b' },
    ], 'next', {}), false);
    expect(body.systemInstruction.parts[0].text).toBe(buildSystemBlocks(undefined, '/ask').map(b => b.text).join('\n\n'));
    expect(body.contents.map(c => c.role)).toEqual(['user', 'model', 'user']);
    expect(body.generationConfig.maxOutputTokens).toBe(8000);
    // gemini-3.5-flash-lite has googleSearch off:
    expect(JSON.stringify(body.tools)).not.toContain('googleSearch');
    // gemini-3.8-flash has googleSearch enabled when webSearch is true:
    const flashWithSearch = buildGeminiRequestBody({ ...input, model: 'gemini-3.8-flash', webSearch: true }, [], false);
    expect(JSON.stringify(flashWithSearch.tools)).toContain('googleSearch');
    // when webSearch is false, googleSearch stays out even on gemini-3.8-flash:
    const flashNoSearch = buildGeminiRequestBody({ ...input, model: 'gemini-3.8-flash', webSearch: false }, [], false);
    expect(JSON.stringify(flashNoSearch.tools)).not.toContain('googleSearch');
    expect('toolConfig' in body).toBe(false);
    expect(buildGeminiRequestBody(input, [], true).toolConfig).toEqual({ functionCallingConfig: { mode: 'NONE' } });
  });
  it('posts to streamGenerateContent with the key only in the x-goog-api-key header', async () => {
    const fetchImpl = vi.fn(async () => answerChunk());
    let streamed = '';
    const res = await askGeminiStream({ ...input, apiKey: KEY, toolCtx, fetchImpl: fetchImpl as unknown as typeof fetch, onText: d => { streamed += d; }, onStatus: () => {} });
    expect(res.text).toBe('NL GGE mid is 0.40.');
    expect(streamed).toBe('NL GGE mid is 0.40.');
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:streamGenerateContent?alt=sse');
    expect(url).not.toContain(KEY);
    expect(new Headers(init.headers as HeadersInit).get('x-goog-api-key')).toBe(KEY);
    expect(String(init.body)).not.toContain(KEY);
  });
});

describe('Gemini tool loop', () => {
  it('answers a functionCall with a functionResponse and replays the model turn with its thought signature', async () => {
    const fetchImpl = vi.fn().mockResolvedValueOnce(callChunk()).mockResolvedValueOnce(answerChunk());
    const statuses: (string | null)[] = [];
    const res = await askGeminiStream({ ...input, apiKey: KEY, toolCtx, fetchImpl: fetchImpl as unknown as typeof fetch, onText: () => {}, onStatus: s => statuses.push(s) });
    expect(res.text).toBe('Let me check. \n\nNL GGE mid is 0.40.');
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    const second = bodyOf(fetchImpl, 1);
    const [, model, user] = second.contents;
    expect(model.role).toBe('model');
    expect(model.parts[1]).toMatchObject({ functionCall: { name: 'get_marks', id: 'call_1' }, thoughtSignature: 'SIG1' });
    expect(user.role).toBe('user');
    expect(user.parts[0].functionResponse).toMatchObject({ name: 'get_marks', id: 'call_1' });
    expect(JSON.stringify(user.parts[0].functionResponse.response)).toContain('"mid":0.4');
    expect(statuses).toContain('Reading desk marks');
    // Round one used 5,000 prompt + 100 output; round two 1,400 uncached + 4,000 cached + 20 output.
    expect(res.usage).toEqual({ inputTokens: 6400, cacheWriteTokens: 0, cacheReadTokens: 4000, outputTokens: 120, webSearches: 0 });
    const expected = (6400 * 0.3 + 4000 * 0.3 * 0.1 + 120 * 2.5) / 1e6;
    expect(res.costUsd).toBeCloseTo(expected, 10);
  });
  it('answers parallel calls together and returns a tool error as an error field', async () => {
    const parallel = geminiSse([{ candidates: [{ content: { role: 'model', parts: [
      { functionCall: { name: 'get_marks', args: { marketIds: ['NL_GGE'] } } },
      { functionCall: { name: 'get_plant', args: { plantId: 'nope' } } },
    ] } }] }]);
    const fetchImpl = vi.fn().mockResolvedValueOnce(parallel).mockResolvedValueOnce(answerChunk());
    await askGeminiStream({ ...input, apiKey: KEY, toolCtx, fetchImpl: fetchImpl as unknown as typeof fetch, ...noop });
    const user = bodyOf(fetchImpl, 1).contents.at(-1);
    expect(user.role).toBe('user');
    expect(user.parts).toHaveLength(2);
    expect(user.parts[0].functionResponse.response.result).toBeDefined();
    expect(user.parts[1].functionResponse.response.error).toContain('no plant');
  });
  it('stops after the round cap and tells the model to answer on the last round', async () => {
    const fetchImpl = vi.fn(async () => callChunk());
    await askGeminiStream({ ...input, apiKey: KEY, toolCtx, fetchImpl: fetchImpl as unknown as typeof fetch, ...noop }).catch(() => undefined);
    expect(fetchImpl).toHaveBeenCalledTimes(HELPER_MAX_TOOL_ROUNDS);
    expect(bodyOf(fetchImpl, HELPER_MAX_TOOL_ROUNDS - 1).toolConfig).toEqual({ functionCallingConfig: { mode: 'NONE' } });
  });
  it('collects grounding sources: http(s) only, de-duplicated', async () => {
    const grounding = { groundingChunks: [
      { web: { uri: 'https://eur-lex.europa.eu/x', title: 'EUR-Lex' } },
      { web: { uri: 'https://eur-lex.europa.eu/x', title: 'EUR-Lex again' } },
      { web: { uri: 'javascript:alert(1)', title: 'bad' } },
      { web: { uri: 'https://www.gov.uk/y' } },
    ] };
    const fetchImpl = vi.fn(async () => answerChunk(grounding));
    const res = await askGeminiStream({ ...input, apiKey: KEY, toolCtx, fetchImpl: fetchImpl as unknown as typeof fetch, ...noop });
    expect(res.sources).toEqual([{ title: 'EUR-Lex', url: 'https://eur-lex.europa.eu/x' }, { title: 'https://www.gov.uk/y', url: 'https://www.gov.uk/y' }]);
  });
});

describe('Gemini errors never carry the key', () => {
  const failing = (status: number, message: string) => vi.fn(async () => new Response(JSON.stringify({ error: { code: status, message, status: 'INVALID_ARGUMENT' } }), { status, headers: { 'content-type': 'application/json' } }));
  it('names the saved key when Google rejects it (400 API key not valid)', async () => {
    const e = await askGeminiStream({ ...input, apiKey: KEY, toolCtx, fetchImpl: failing(400, `API key not valid. Please pass a valid API key. (${KEY})`) as unknown as typeof fetch, ...noop }).catch((x: Error) => x);
    expect((e as Error).message).toMatch(/^Google did not accept the Gemini key saved on this device \(AIza….*ijk \(37 characters\), HTTP 400\)/);
    expect((e as Error).message).not.toContain(KEY);
  });
  it('explains 429 and redacts the key from other API errors and network failures', async () => {
    const e429 = await askGeminiStream({ ...input, apiKey: KEY, toolCtx, fetchImpl: failing(429, 'quota') as unknown as typeof fetch, ...noop }).catch((x: Error) => x);
    expect((e429 as Error).message).toContain('HTTP 429');
    const e500 = await askGeminiStream({ ...input, apiKey: KEY, toolCtx, fetchImpl: failing(500, `boom ${KEY}`) as unknown as typeof fetch, ...noop }).catch((x: Error) => x);
    expect((e500 as Error).message).toContain('HTTP 500');
    expect((e500 as Error).message).not.toContain(KEY);
    const net = vi.fn(async () => { throw new TypeError(`Failed to fetch ${KEY}`); });
    const eNet = await askGeminiStream({ ...input, apiKey: KEY, toolCtx, fetchImpl: net as unknown as typeof fetch, ...noop }).catch((x: Error) => x);
    expect((eNet as Error).message).toContain('Could not reach generativelanguage.googleapis.com');
    expect((eNet as Error).message).not.toContain(KEY);
  });
  it('turns an abort into Stopped.', async () => {
    const aborted = vi.fn(async () => { throw new DOMException('aborted', 'AbortError'); });
    const e = await askGeminiStream({ ...input, apiKey: KEY, toolCtx, fetchImpl: aborted as unknown as typeof fetch, ...noop }).catch((x: Error) => x);
    expect((e as Error).message).toBe('Stopped.');
  });
});

describe('Gemini key', () => {
  it('is cleaned like the Anthropic key and shown as a fingerprint, never in full', () => {
    expect(normaliseGeminiApiKey(' AIzaSy​ABC—def \n')).toBe('AIzaSyABC-def');
    expect(geminiKeyFingerprint(KEY)).toBe('AIza…hijk (37 characters)'.replace('hijk', KEY.slice(-4)));
    expect(geminiKeyFingerprint(KEY)).not.toContain(KEY);
  });
  it('flags a shortened or cut key before any network call', async () => {
    expect(geminiKeyShapeProblem('AIza…hijk')).toContain('shortened');
    expect(geminiKeyShapeProblem('AIzaShort')).toContain('Only 9 characters');
    expect(geminiKeyShapeProblem(KEY)).toBeNull();
    const fetchImpl = vi.fn();
    expect(await testGeminiApiKeyLive('AIzaShort', fetchImpl as unknown as typeof fetch)).toMatchObject({ ok: false });
    expect(fetchImpl).not.toHaveBeenCalled();
  });
  it('tests a key with a free model listing, key in the header only', async () => {
    const ok = vi.fn(async () => new Response('{"models":[]}', { status: 200 }));
    expect(await testGeminiApiKeyLive(KEY, ok as unknown as typeof fetch)).toEqual({ ok: true });
    const [url, init] = ok.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://generativelanguage.googleapis.com/v1beta/models?pageSize=1');
    expect((init.headers as Record<string, string>)['x-goog-api-key']).toBe(KEY);
    const bad = vi.fn(async () => new Response('{}', { status: 400 }));
    const res = await testGeminiApiKeyLive(KEY, bad as unknown as typeof fetch);
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.reason).not.toContain(KEY);
  });
});
