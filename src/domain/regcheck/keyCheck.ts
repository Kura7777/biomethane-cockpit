/**
 * Is the saved API key usable (Anthropic or Gemini)? A shape check that needs no network, and a live check that lists
 * one model (GET /v1/models: no tokens, no charge) with the key in the x-api-key header only.
 */
import Anthropic from '@anthropic-ai/sdk';

/** Real keys run to about a hundred characters; anything far shorter has been cut. */
const MIN_PLAUSIBLE_KEY_LENGTH = 80;

/** Why a key cannot be right, or null when it looks like a full key. */
export function anthropicKeyShapeProblem(key: string): string | null {
  if (!key) return null;
  if (key.includes('…') || key.includes('...')) {
    return 'This key contains "…", so it is the shortened key shown in the Anthropic console list and cannot be used. Create a new key in the console and copy it in full.';
  }
  if (!key.startsWith('sk-ant-')) return 'Anthropic keys start with "sk-ant-". Check that the whole key was copied.';
  if (key.length < MIN_PLAUSIBLE_KEY_LENGTH) {
    return `Only ${key.length} characters: a full Anthropic key is usually over 100. Part of it is missing; copy it again in full.`;
  }
  return null;
}

export type AnthropicKeyCheck = { ok: true } | { ok: false; reason: string };

export async function testAnthropicApiKey(key: string, /** Tests only. */ fetchImpl?: typeof fetch): Promise<AnthropicKeyCheck> {
  if (!key) return { ok: false, reason: 'No key is saved on this device.' };
  // A cut or shortened key cannot work, and one with "…" cannot even be sent as a header.
  const shape = anthropicKeyShapeProblem(key);
  if (shape) return { ok: false, reason: shape };
  const client = new Anthropic({ apiKey: key, dangerouslyAllowBrowser: true, maxRetries: 0, ...(fetchImpl ? { fetch: fetchImpl } : {}) });
  try {
    await client.models.list({ limit: 1 });
    return { ok: true };
  } catch (err) {
    if (err instanceof Anthropic.AuthenticationError) return { ok: false, reason: 'Anthropic rejected this key (HTTP 401): it is not a valid, active key.' };
    if (err instanceof Anthropic.PermissionDeniedError) return { ok: false, reason: 'Anthropic accepted the key but refused access (HTTP 403). Check the key’s workspace and permissions in the console.' };
    if (err instanceof Anthropic.APIConnectionError) return { ok: false, reason: 'Could not reach api.anthropic.com. Check the connection and try again.' };
    if (err instanceof Anthropic.APIError) return { ok: false, reason: `Anthropic returned an error${err.status ? ` (HTTP ${err.status})` : ''}. Try again in a moment.` };
    return { ok: false, reason: 'The key check failed. Try again in a moment.' };
  }
}

// ── Gemini ──────────────────────────────────────────────────────────────────

/** Gemini keys are about 39 characters ("AIza" + 35); anything far shorter has been cut. */
const MIN_PLAUSIBLE_GEMINI_KEY_LENGTH = 30;

/** Why a Gemini key cannot be right, or null when it looks like a full key. */
export function geminiKeyShapeProblem(key: string): string | null {
  if (!key) return null;
  if (key.includes('…') || key.includes('...')) {
    return 'This key contains "…", so it is a shortened key and cannot be used. Create a new key in Google AI Studio and copy it in full.';
  }
  if (key.length < MIN_PLAUSIBLE_GEMINI_KEY_LENGTH) {
    return `Only ${key.length} characters: a full Gemini key is about 39. Part of it is missing; copy it again in full.`;
  }
  return null;
}

/**
 * Live check that lists one model (GET /v1beta/models?pageSize=1): metadata only, no generation, no
 * charge. The key goes in the x-goog-api-key header only.
 */
export async function testGeminiApiKeyLive(key: string, /** Tests only. */ fetchImpl?: typeof fetch): Promise<AnthropicKeyCheck> {
  if (!key) return { ok: false, reason: 'No key is saved on this device.' };
  const shape = geminiKeyShapeProblem(key);
  if (shape) return { ok: false, reason: shape };
  try {
    const res = await (fetchImpl ?? fetch)('https://generativelanguage.googleapis.com/v1beta/models?pageSize=1', { headers: { 'x-goog-api-key': key } });
    if (res.ok) return { ok: true };
    if (res.status === 401 || res.status === 403 || res.status === 400) {
      return { ok: false, reason: `Google rejected this key (HTTP ${res.status}): it is not a valid, active Gemini key.` };
    }
    if (res.status === 429) return { ok: false, reason: 'Google is rate-limiting this key (HTTP 429). Try again in a moment.' };
    return { ok: false, reason: `Google returned an error (HTTP ${res.status}). Try again in a moment.` };
  } catch {
    return { ok: false, reason: 'Could not reach generativelanguage.googleapis.com. Check the connection and try again.' };
  }
}
