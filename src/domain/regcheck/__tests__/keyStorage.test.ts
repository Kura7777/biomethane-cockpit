import { describe, it, expect } from 'vitest';
import { anthropicKeyFingerprint, normaliseAnthropicApiKey } from '../storage';
import { anthropicKeyShapeProblem, testAnthropicApiKey } from '../keyCheck';

const KEY = 'sk-ant-api03-Ab_cD--eF-12345678';

describe('Anthropic key clean-up (keys pasted on a phone)', () => {
  it('leaves a clean key alone', () => {
    expect(normaliseAnthropicApiKey(KEY)).toBe(KEY);
  });
  it('strips spaces, line breaks, non-breaking and zero-width characters anywhere in the key', () => {
    expect(normaliseAnthropicApiKey(` sk-ant-api03-Ab_cD--eF-\n1234\u00A05678\u200B `)).toBe(KEY);
  });
  it('undoes smart punctuation and an auto-capitalised first letter', () => {
    expect(normaliseAnthropicApiKey('Sk-ant-api03-Ab_cD\u2014eF\u201112345678')).toBe(KEY);
    expect(normaliseAnthropicApiKey('SK-ANT-api03-Ab_cD--eF-12345678')).toBe(KEY);
  });
  it('fingerprints a key by its last four characters and length, never the key', () => {
    expect(anthropicKeyFingerprint(KEY)).toBe(`sk-ant-…5678 (${KEY.length} characters)`);
    expect(anthropicKeyFingerprint(KEY)).not.toContain('api03');
    expect(anthropicKeyFingerprint('')).toBe('');
  });
});

describe('Anthropic key check', () => {
  const FULL = `sk-ant-api03-${'x'.repeat(95)}`;
  it('flags a shortened or cut key without a network call', () => {
    expect(anthropicKeyShapeProblem(FULL)).toBeNull();
    expect(anthropicKeyShapeProblem('sk-ant-api03-Ab1…xyz9')).toMatch(/shortened key/);
    expect(anthropicKeyShapeProblem('sk-ant-api03-Ab12')).toMatch(/Only 17 characters/);
    expect(anthropicKeyShapeProblem('AIza-not-anthropic-' + 'x'.repeat(90))).toMatch(/start with "sk-ant-"/);
  });
  it('lists one model with the key in the header only, and reads 200 and 401', async () => {
    const calls: { url: string; init: RequestInit }[] = [];
    const ok = (async (url: string, init: RequestInit) => {
      calls.push({ url: String(url), init });
      return new Response(JSON.stringify({ data: [], has_more: false, first_id: null, last_id: null }), { status: 200, headers: { 'content-type': 'application/json' } });
    }) as unknown as typeof fetch;
    expect(await testAnthropicApiKey(FULL, ok)).toEqual({ ok: true });
    expect(calls[0].url).toContain('/v1/models');
    expect(new Headers(calls[0].init.headers).get('x-api-key')).toBe(FULL);
    expect(calls[0].init.body ?? '').not.toContain(FULL);

    const denied = (async () => new Response(JSON.stringify({ type: 'error', error: { type: 'authentication_error', message: 'invalid x-api-key' } }), { status: 401, headers: { 'content-type': 'application/json' } })) as unknown as typeof fetch;
    const res = await testAnthropicApiKey(FULL, denied);
    expect(res.ok).toBe(false);
    expect(!res.ok && res.reason).toMatch(/HTTP 401/);

    const never = (async () => { throw new Error('should not be called'); }) as unknown as typeof fetch;
    const cut = await testAnthropicApiKey('sk-ant-api03-Ab1…xyz9', never);
    expect(!cut.ok && cut.reason).toMatch(/shortened key/);
  });
});
