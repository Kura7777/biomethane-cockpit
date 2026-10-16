import { describe, it, expect, vi } from 'vitest';
import { askGeminiStream } from '../geminiHelperClient';
import type { MarksState, CostInputs } from '../../netback/types';

const KEY = 'AIzaSyTESTSECRET1234567890abcdefghijk';
const marks = { marks: { NL_GGE: { marketId: 'NL_GGE', bid: null, offer: null, mid: 0.4, updatedAt: null, source: 'test' } } } as unknown as MarksState;
const toolCtx = { marks, costs: {} as CostInputs };
const input = { model: 'gemini-3.5-flash-lite', webSearch: false, route: '/ask', guide: undefined, history: [], question: 'NL GGE?', context: {}, apiKey: KEY, toolCtx, onText: () => {}, onStatus: () => {} };
const sse = (chunks: object[]) => new Response(chunks.map(c => `data: ${JSON.stringify(c)}\r\n\r\n`).join(''), { status: 200, headers: { 'content-type': 'text/event-stream' } });
const callRound = () => sse([
  { candidates: [{ content: { role: 'model', parts: [{ text: 'Checking. ' }] } }] },
  { candidates: [{ content: { role: 'model', parts: [{ functionCall: { name: 'get_marks', args: { marketIds: ['NL_GGE'] }, id: 'c1' } }] }, finishReason: 'STOP' }], usageMetadata: { promptTokenCount: 5000, candidatesTokenCount: 100 } },
]);
const answerRound = () => sse([
  { candidates: [{ content: { role: 'model', parts: [{ text: 'Done.' }] }, finishReason: 'STOP' }], usageMetadata: { promptTokenCount: 6000, candidatesTokenCount: 50 } },
]);

describe('spend plumbing', () => {
  it('reports each completed round as it finishes, so the sum equals the answer cost', async () => {
    const f = vi.fn().mockResolvedValueOnce(callRound()).mockResolvedValueOnce(answerRound());
    const spent: number[] = [];
    const ans = await askGeminiStream({ ...input, fetchImpl: f as unknown as typeof fetch, onSpend: u => spent.push(u) });
    expect(spent).toHaveLength(2);
    expect(spent.reduce((a, b) => a + b, 0)).toBeCloseTo(ans.costUsd, 10);
  });
  it('still counts the completed round when a later round fails', async () => {
    const f = vi.fn().mockResolvedValueOnce(callRound()).mockResolvedValueOnce(new Response('{}', { status: 500 }));
    const spent: number[] = [];
    await expect(askGeminiStream({ ...input, fetchImpl: f as unknown as typeof fetch, onSpend: u => spent.push(u) })).rejects.toThrow();
    expect(spent).toHaveLength(1);
    expect(spent[0]).toBeGreaterThan(0);
  });
  it('stops before another tool round once the daily budget is reached', async () => {
    const f = vi.fn().mockResolvedValueOnce(callRound()).mockResolvedValueOnce(answerRound());
    const ans = await askGeminiStream({ ...input, fetchImpl: f as unknown as typeof fetch, budgetReached: () => true });
    expect(f).toHaveBeenCalledTimes(1);
    expect(ans.text).toContain('Checking.');
  });
});
