/**
 * Desk helper — the Claude call, on the official Anthropic TypeScript SDK in the browser with the
 * trader's own key (the same stored key as the Regulation check; it is only ever sent in the
 * x-api-key header). A streaming manual tool loop: text streams as it is written, the model can call
 * the app's read-only tools (helperTools.ts) and the server-side web search, and the loop stops on
 * end_turn, refusal or the round cap. Pattern: claude-api skill, typescript/claude-api/tool-use.md
 * → Streaming Manual Loop.
 */
import Anthropic from '@anthropic-ai/sdk';
import { sanitizeKey } from '../regcheck/claudeClient';
import { buildSystemBlocks, formatUserTurn, HELPER_MAX_TOKENS, type HelperSource, type HelperTurn } from './helperLogic';
import { HELPER_TOOLS, HELPER_TOOL_LABELS, runHelperTool, type HelperToolContext } from './helperTools';
import { helperModelById } from './helperModels';
import type { PageGuide } from './pageGuides';

/** Most model ↔ tool round trips per question before the helper stops and answers with what it has. */
export const HELPER_MAX_TOOL_ROUNDS = 8;
/** Web searches the server may run per question. */
export const HELPER_WEB_SEARCH_MAX_USES = 5;
const FALLBACK_BETA = 'server-side-fallback-2026-07-01';

export interface HelperRequestInput {
  model: string;
  webSearch: boolean;
  route: string;
  guide: PageGuide | undefined;
  /** Earlier turns of this page's conversation (user and assistant text only). */
  history: HelperTurn[];
  question: string;
  context: Record<string, unknown>;
}

/**
 * The request parameters that do not change during one question's tool loop (everything but messages).
 * Per model: Haiku 5.5 takes the basic web search tool and no server-side fallback (helperModels.ts).
 */
export function buildHelperRequestBase(input: Pick<HelperRequestInput, 'model' | 'webSearch' | 'route' | 'guide'>) {
  const model = helperModelById(input.model);
  const tools: Anthropic.Beta.BetaToolUnion[] = [...HELPER_TOOLS];
  if (input.webSearch) tools.push({ type: model.webSearchTool, name: 'web_search', max_uses: HELPER_WEB_SEARCH_MAX_USES });
  return {
    model: model.id,
    max_tokens: HELPER_MAX_TOKENS,
    // Thinking stays adaptive (the default on the 5.5 models); effort is set explicitly.
    output_config: { effort: 'medium' as const },
    system: buildSystemBlocks(input.guide, input.route),
    tools,
    ...(model.serverFallback ? { betas: [FALLBACK_BETA], fallbacks: 'default' as const } : {}),
  };
}

/** The conversation for one question: earlier turns (text only), then the question with the live page context. */
export function buildHelperMessages(history: HelperTurn[], question: string, context: Record<string, unknown>): Anthropic.Beta.BetaMessageParam[] {
  const messages: Anthropic.Beta.BetaMessageParam[] = [];
  for (const t of history) {
    if (t.role === 'user') messages.push({ role: 'user', content: t.sent ?? t.text });
    else if (t.role === 'assistant' && t.text.trim()) messages.push({ role: 'assistant', content: t.text });
  }
  // Drop a dangling user turn (a failed or stopped request) so roles keep alternating.
  while (messages.length > 0 && messages[messages.length - 1].role === 'user') messages.pop();
  messages.push({ role: 'user', content: formatUserTurn(question, context) });
  return messages;
}

export interface HelperAnswer {
  text: string;
  sources: HelperSource[];
}

export interface HelperStreamCallbacks {
  /** A new piece of answer text. */
  onText: (delta: string) => void;
  /** What the helper is doing right now ("Searching the web"), or null when it is writing. */
  onStatus: (status: string | null) => void;
}

function friendlyError(err: unknown, apiKey: string): Error {
  if (err instanceof Anthropic.APIUserAbortError) return new Error('Stopped.');
  if (err instanceof Anthropic.AuthenticationError) return new Error('Invalid Anthropic API key (HTTP 401). Check it on the Regulation check page.');
  if (err instanceof Anthropic.PermissionDeniedError) return new Error(sanitizeKey(`Anthropic API access forbidden (HTTP 403): ${err.message}`, apiKey));
  if (err instanceof Anthropic.RateLimitError) return new Error('Anthropic API rate limit reached (HTTP 429). Wait a moment and try again.');
  if (err instanceof Anthropic.APIConnectionError) return new Error('Could not reach api.anthropic.com. Check your connection.');
  if (err instanceof Anthropic.APIError) return new Error(sanitizeKey(`Anthropic API error${err.status ? ` (HTTP ${err.status})` : ''}: ${err.message}`.slice(0, 400), apiKey));
  return new Error(sanitizeKey(err instanceof Error ? err.message : 'The helper could not answer.', apiKey));
}

/** Web pages the answer cited (from web-search citations), de-duplicated, http(s) only. */
function collectSources(content: Anthropic.Beta.BetaContentBlock[], into: Map<string, HelperSource>) {
  for (const block of content) {
    if (block.type !== 'text' || !block.citations) continue;
    for (const c of block.citations) {
      if (c.type === 'web_search_result_location' && /^https?:\/\//i.test(c.url) && !into.has(c.url)) {
        into.set(c.url, { title: c.title || c.url, url: c.url });
      }
    }
  }
}

/**
 * Ask the helper one question. Streams text through `onText`, runs tool calls through the app's
 * read-only tools, and resolves with the full answer and its web sources. Throws an Error whose
 * message never contains the key.
 */
export async function askHelperStream(
  input: HelperRequestInput & { apiKey: string; toolCtx: HelperToolContext; signal?: AbortSignal; /** Tests only. */ fetchImpl?: typeof fetch } & HelperStreamCallbacks,
): Promise<HelperAnswer> {
  const apiKey = input.apiKey.trim();
  if (!apiKey) throw new Error('No Anthropic API key is set.');
  const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true, maxRetries: 1, ...(input.fetchImpl ? { fetch: input.fetchImpl } : {}) });
  const base = buildHelperRequestBase(input);
  const messages = buildHelperMessages(input.history, input.question, input.context);
  const sources = new Map<string, HelperSource>();
  let text = '';

  try {
    for (let round = 0; round < HELPER_MAX_TOOL_ROUNDS; round++) {
      input.onStatus(round === 0 ? 'Thinking' : 'Writing');
      const stream = client.beta.messages.stream({ ...base, messages }, { signal: input.signal });

      for await (const event of stream) {
        if (event.type === 'content_block_start') {
          const b = event.content_block;
          if (b.type === 'tool_use' || b.type === 'server_tool_use') input.onStatus(HELPER_TOOL_LABELS[b.name] ?? `Looking up ${b.name}`);
          else if (b.type === 'text') {
            input.onStatus(null);
            if (text && !text.endsWith('\n')) { text += '\n\n'; input.onText('\n\n'); }
          }
        } else if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
          text += event.delta.text;
          input.onText(event.delta.text);
        }
      }
      const message = await stream.finalMessage();
      collectSources(message.content, sources);

      if (message.stop_reason === 'refusal') {
        if (!text.trim()) throw new Error('The model declined to answer that question.');
        break;
      }
      // A long server-tool turn (web search) can pause; send it back to continue.
      if (message.stop_reason === 'pause_turn') {
        messages.push({ role: 'assistant', content: message.content });
        continue;
      }
      const toolUses = message.content.filter((b): b is Anthropic.Beta.BetaToolUseBlock => b.type === 'tool_use');
      if (toolUses.length === 0) break; // end_turn, or max_tokens on a plain answer
      if (message.stop_reason === 'max_tokens') break; // never run a tool on a truncated input

      messages.push({ role: 'assistant', content: message.content });
      // Parallel tool calls: run them together and return every result in one user message.
      const results: Anthropic.Beta.BetaToolResultBlockParam[] = await Promise.all(toolUses.map(async tu => {
        try {
          return { type: 'tool_result' as const, tool_use_id: tu.id, content: await runHelperTool(tu.name, tu.input, input.toolCtx) };
        } catch (err) {
          return { type: 'tool_result' as const, tool_use_id: tu.id, is_error: true, content: err instanceof Error ? err.message : 'tool failed' };
        }
      }));
      messages.push({ role: 'user', content: results });
    }
  } catch (err) {
    throw friendlyError(err, apiKey);
  } finally {
    input.onStatus(null);
  }

  if (!text.trim()) throw new Error('The model returned no text.');
  return { text: sanitizeKey(text, apiKey).trim(), sources: [...sources.values()].slice(0, 8) };
}
