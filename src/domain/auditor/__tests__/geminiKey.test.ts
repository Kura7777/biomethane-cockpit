import { afterEach, describe, expect, it, vi } from 'vitest';
import { testGeminiApiKey } from '../geminiClient';
import { GEMINI_API_KEY_STORAGE_KEY } from '../../regcheck/storage';

describe('Auditor Gemini calls', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('send the key in the x-goog-api-key header, never in the URL, on a current model', async () => {
    const fetchMock = vi.fn(async () => new Response('{}', { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    const res = await testGeminiApiKey('AIzaSyTESTSECRET1234567890abcdefghijk');
    expect(res.valid).toBe(true);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent');
    expect(url).not.toContain('key=');
    expect((init.headers as Record<string, string>)['x-goog-api-key']).toBe('AIzaSyTESTSECRET1234567890abcdefghijk');
    expect(String(init.body)).not.toContain('AIzaSy');
  });

  it('shares the saved key with the desk helper', () => {
    expect(GEMINI_API_KEY_STORAGE_KEY).toBe('biomethane_gemini_api_key');
  });
});
