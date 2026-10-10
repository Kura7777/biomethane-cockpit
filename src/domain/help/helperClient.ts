/**
 * Page helper — the Claude call. Same key, endpoint, version header and browser-access header as the
 * Regulation check (domain/regcheck/claudeClient.ts); the key is only ever in the x-api-key header.
 * No tools, no streaming: one request per question, answered as plain text.
 */
import {
  ANTHROPIC_API_URL,
  ANTHROPIC_API_VERSION,
  DEFAULT_CLAUDE_MODEL,
  extractLastTextBlock,
  sanitizeKey,
} from '../regcheck/claudeClient';
import { buildSystemBlocks, formatUserTurn, HELPER_MAX_TOKENS, type HelperTurn } from './helperLogic';
import type { PageGuide } from './pageGuides';

export interface HelperRequestInput {
  model?: string;
  route: string;
  guide: PageGuide | undefined;
  /** Earlier turns of this page's conversation (user and assistant only). */
  history: HelperTurn[];
  question: string;
  context: Record<string, unknown>;
}

export interface HelperRequestBody {
  model: string;
  max_tokens: number;
  system: ReturnType<typeof buildSystemBlocks>;
  messages: { role: 'user' | 'assistant'; content: string }[];
}

/** The messages array alternates user/assistant and ends on this question's user turn. */
export function buildHelperRequest(input: HelperRequestInput): HelperRequestBody {
  const messages: HelperRequestBody['messages'] = [];
  for (const t of input.history) {
    if (t.role === 'user') messages.push({ role: 'user', content: t.sent ?? t.text });
    else if (t.role === 'assistant') messages.push({ role: 'assistant', content: t.text });
  }
  // Drop any dangling user turn (a failed request) so roles keep alternating.
  while (messages.length > 0 && messages[messages.length - 1].role === 'user') messages.pop();
  messages.push({ role: 'user', content: formatUserTurn(input.question, input.context) });
  return {
    model: input.model || DEFAULT_CLAUDE_MODEL,
    max_tokens: HELPER_MAX_TOKENS,
    system: buildSystemBlocks(input.guide, input.route),
    messages,
  };
}

function httpErrorMessage(status: number, detail: string): string {
  if (status === 401) return 'Invalid Anthropic API key (HTTP 401). Check it on the Regulation check page.';
  if (status === 429) return 'Anthropic API rate limit exceeded (HTTP 429). Wait a moment and try again.';
  if (status === 403) return `Anthropic API access forbidden (HTTP 403): ${detail}`;
  return `Anthropic API error (HTTP ${status}): ${detail}`;
}

/** Ask the model. Throws an Error whose message never contains the key. */
export async function askHelper(
  input: HelperRequestInput & { apiKey: string; signal?: AbortSignal; fetchImpl?: typeof fetch }
): Promise<string> {
  const apiKey = input.apiKey.trim();
  if (!apiKey) throw new Error('No Anthropic API key is set.');
  const body = buildHelperRequest(input);
  const doFetch = input.fetchImpl ?? fetch;

  let response: Response;
  try {
    response = await doFetch(ANTHROPIC_API_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': ANTHROPIC_API_VERSION,
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify(body),
      signal: input.signal,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Network request failed';
    throw new Error(`Could not reach api.anthropic.com: ${sanitizeKey(msg, apiKey)}`);
  }

  if (!response.ok) {
    let raw = '';
    try { raw = await response.text(); } catch { /* ignore */ }
    let detail = raw;
    try { detail = JSON.parse(raw)?.error?.message || raw; } catch { /* keep raw text */ }
    throw new Error(sanitizeKey(httpErrorMessage(response.status, sanitizeKey(detail, apiKey).slice(0, 300)), apiKey));
  }

  let data: { content?: unknown; stop_reason?: string };
  try {
    data = await response.json();
  } catch {
    throw new Error('Anthropic returned a response that could not be read.');
  }
  if (data?.stop_reason === 'refusal') throw new Error('The model declined to answer that question.');
  const text = extractLastTextBlock(data?.content).trim();
  if (!text) throw new Error('The model returned no text.');
  return sanitizeKey(text, apiKey);
}
