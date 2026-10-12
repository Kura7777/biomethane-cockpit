/**
 * Desk helper — the Gemini call. Same contract as askHelperStream (helperClient.ts): streams text
 * through onText, runs the app's read-only tools in a manual loop, resolves with the answer, its web
 * sources and its estimated cost. Plain REST with fetch (models/{id}:streamGenerateContent?alt=sse);
 * the trader's Gemini key goes in the x-goog-api-key header only, never in the URL, body or an error.
 *
 * Read on 2026-10-11 (ai.google.dev/gemini-api/docs): Google documents generateContent / streamGenerateContent
 * as current v1beta methods. Google Search grounding combined with function calling is supported and enabled
 * (HelperModel.googleSearch), and groundingMetadata sources are parsed and returned with the answer.
 */
import { sanitizeKey } from '../regcheck/claudeClient';
import { geminiKeyFingerprint } from '../regcheck/storage';
import { buildHelperHistory, buildSystemBlocks, HELPER_MAX_TOKENS, type HelperSource } from './helperLogic';
import { addUsage, EMPTY_USAGE, estimateCostUsd } from './helperCost';
import { HELPER_TOOLS, HELPER_TOOL_LABELS, runHelperTool, type HelperToolContext } from './helperTools';
import { helperModelById } from './helperModels';
import { HELPER_MAX_TOOL_ROUNDS, type HelperAnswer, type HelperRequestInput, type HelperStreamCallbacks } from './helperClient';

export const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta';

// ── Request building ────────────────────────────────────────────────────────

type JsonSchema = Record<string, unknown>;

const GEMINI_TYPES: Record<string, string> = { object: 'OBJECT', string: 'STRING', number: 'NUMBER', integer: 'INTEGER', boolean: 'BOOLEAN', array: 'ARRAY' };

/** A JSON Schema as Gemini's Schema subset: types, properties, required, enum, items, descriptions. Everything else (additionalProperties, strict...) is dropped. */
export function toGeminiSchema(schema: JsonSchema): JsonSchema {
  const out: JsonSchema = {};
  const type = schema.type;
  const types = (Array.isArray(type) ? type : [type]).filter((t): t is string => typeof t === 'string');
  const main = types.find(t => t !== 'null');
  if (main && GEMINI_TYPES[main]) out.type = GEMINI_TYPES[main];
  if (types.includes('null')) out.nullable = true;
  if (typeof schema.description === 'string') out.description = schema.description;
  if (Array.isArray(schema.enum)) out.enum = schema.enum;
  if (schema.properties && typeof schema.properties === 'object') {
    out.properties = Object.fromEntries(Object.entries(schema.properties as Record<string, JsonSchema>).map(([k, v]) => [k, toGeminiSchema(v)]));
  }
  if (Array.isArray(schema.required) && schema.required.length > 0) out.required = schema.required;
  if (schema.items && typeof schema.items === 'object') out.items = toGeminiSchema(schema.items as JsonSchema);
  return out;
}

/** The six-plus desk tools as Gemini functionDeclarations, in the same fixed order. */
export function geminiFunctionDeclarations() {
  return HELPER_TOOLS.map(t => ({ name: t.name, description: t.description ?? '', parameters: toGeminiSchema(t.input_schema as unknown as JsonSchema) }));
}

interface GeminiPart {
  text?: string;
  thought?: boolean;
  thoughtSignature?: string;
  functionCall?: { name: string; args?: Record<string, unknown>; id?: string };
  functionResponse?: { name: string; id?: string; response: Record<string, unknown> };
  toolCall?: { toolType?: string; args?: Record<string, unknown>; id?: string };
  toolResponse?: { toolType?: string; response?: Record<string, unknown>; id?: string };
}
interface GeminiContent { role: 'user' | 'model'; parts: GeminiPart[] }

/** The conversation in Gemini's shape: roles user and model. Same history rules as the Claude client. */
export function buildGeminiContents(history: HelperRequestInput['history'], question: string, context: Record<string, unknown>): GeminiContent[] {
  return buildHelperHistory(history, question, context).map(m => ({ role: m.role === 'user' ? 'user' : 'model', parts: [{ text: m.text }] }));
}

/** The request body for one round (everything but the key, which travels in a header). */
export function buildGeminiRequestBody(input: Pick<HelperRequestInput, 'model' | 'webSearch' | 'route' | 'guide'>, contents: GeminiContent[], lastRound: boolean) {
  const model = helperModelById(input.model, 'google');
  const tools: Record<string, unknown>[] = [{ functionDeclarations: geminiFunctionDeclarations() }];
  const hasGoogleSearch = Boolean(input.webSearch && model.googleSearch);
  if (hasGoogleSearch) tools.push({ googleSearch: {} });

  const toolConfig: Record<string, unknown> = {};
  if (hasGoogleSearch) {
    toolConfig.includeServerSideToolInvocations = true;
  }
  if (lastRound) {
    toolConfig.functionCallingConfig = { mode: 'NONE' };
  }

  const isPro = model.id.includes('pro');
  const generationConfig: Record<string, unknown> = {
    maxOutputTokens: HELPER_MAX_TOKENS,
  };
  // Turn off internal thinking traces on Flash models to ensure instant deterministic text streaming
  // and prevent missing thought signatures from breaking stateless multi-turn chat history.
  if (!isPro) {
    generationConfig.thinkingConfig = { thinkingBudget: 0 };
  }

  return {
    systemInstruction: { parts: [{ text: buildSystemBlocks(input.guide, input.route).map(b => b.text).join('\n\n') }] },
    contents,
    tools,
    ...(Object.keys(toolConfig).length > 0 ? { toolConfig } : {}),
    generationConfig,
  };
}

// ── Response handling ───────────────────────────────────────────────────────

interface GeminiChunk {
  candidates?: { content?: { parts?: GeminiPart[] }; finishReason?: string; finishMessage?: string; groundingMetadata?: { groundingChunks?: { web?: { uri?: string; title?: string } }[] } }[];
  usageMetadata?: { promptTokenCount?: number; cachedContentTokenCount?: number; candidatesTokenCount?: number; thoughtsTokenCount?: number; toolUsePromptTokenCount?: number };
  error?: { message?: string };
}

/** Server-sent events: each "data: {json}" line is one chunk. */
async function* readSse(res: Response): AsyncGenerator<GeminiChunk> {
  if (!res.body) throw new Error('Gemini sent an empty response.');
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = '';
  const parse = (line: string): GeminiChunk | null => {
    const t = line.trim();
    if (!t.startsWith('data:')) return null;
    try { return JSON.parse(t.slice(5).trim()) as GeminiChunk; } catch { return null; }
  };
  for (;;) {
    const { done, value } = await reader.read();
    buf += decoder.decode(value, { stream: !done });
    const lines = buf.split(/\r?\n/);
    buf = done ? '' : (lines.pop() ?? '');
    for (const line of lines) {
      const chunk = parse(line);
      if (chunk) yield chunk;
    }
    if (done) break;
  }
  const rest = parse(buf);
  if (rest) yield rest;
}

async function failFromResponse(res: Response, apiKey: string): Promise<never> {
  let message = '';
  try {
    const body = JSON.parse(await res.text()) as { error?: { message?: string } };
    message = body?.error?.message ?? '';
  } catch { /* not JSON */ }
  const keyRejected = res.status === 401 || res.status === 403 || (res.status === 400 && /api key/i.test(message));
  if (keyRejected) {
    throw new Error(`Google did not accept the Gemini key saved on this device (${geminiKeyFingerprint(apiKey)}, HTTP ${res.status}). Keys are saved per device: re-enter it on the Regulation check page and compare the last four characters with Google AI Studio.`);
  }
  if (res.status === 429) throw new Error('Gemini API rate limit or quota reached (HTTP 429). Wait a moment and try again.');
  throw new Error(sanitizeKey(`Gemini API error (HTTP ${res.status}): ${message}`.slice(0, 400), apiKey));
}

function friendlyError(err: unknown, apiKey: string): Error {
  if (err instanceof Error && err.name === 'AbortError') return new Error('Stopped.');
  if (err instanceof TypeError) return new Error('Could not reach generativelanguage.googleapis.com. Check your connection.');
  return new Error(sanitizeKey(err instanceof Error ? err.message : 'The helper could not answer.', apiKey));
}

/** Tool output is JSON text; Gemini wants an object in functionResponse.response. */
function toolResponse(output: string): Record<string, unknown> {
  try { return { result: JSON.parse(output) }; } catch { return { result: output }; }
}

/**
 * Ask the helper one question on Gemini. Streams text through `onText`, runs tool calls through the
 * app's read-only tools, and resolves with the full answer, its web sources and its estimated cost.
 * Throws an Error whose message never contains the key.
 */
export async function askGeminiStream(
  input: HelperRequestInput & { apiKey: string; toolCtx: HelperToolContext; signal?: AbortSignal; /** Tests only. */ fetchImpl?: typeof fetch } & HelperStreamCallbacks,
): Promise<HelperAnswer> {
  const apiKey = input.apiKey.trim();
  if (!apiKey) throw new Error('No Gemini API key is set.');
  const model = helperModelById(input.model, 'google');
  const doFetch = input.fetchImpl ?? ((url: string, init?: RequestInit) => fetch(url, init));
  const url = `${GEMINI_API_BASE}/models/${model.id}:streamGenerateContent?alt=sse`;
  const contents = buildGeminiContents(input.history, input.question, input.context);
  const sources = new Map<string, HelperSource>();
  let usage = EMPTY_USAGE;
  let text = '';
  let truncated = false;
  let lastFinishReason: string | undefined;
  let lastFinishMessage: string | undefined;

  try {
    for (let round = 0; round < HELPER_MAX_TOOL_ROUNDS; round++) {
      input.onStatus(round === 0 ? 'Thinking' : 'Writing');
      const res = await doFetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
        body: JSON.stringify(buildGeminiRequestBody(input, contents, round === HELPER_MAX_TOOL_ROUNDS - 1)),
        signal: input.signal,
      });
      if (!res.ok) await failFromResponse(res, apiKey);

      const parts: GeminiPart[] = [];
      let roundHasText = false;
      let meta: GeminiChunk['usageMetadata'];
      for await (const chunk of readSse(res)) {
        if (chunk.error?.message) throw new Error(sanitizeKey(`Gemini API error: ${chunk.error.message}`.slice(0, 400), apiKey));
        if (chunk.usageMetadata) meta = chunk.usageMetadata;
        const cand = chunk.candidates?.[0];
        if (!cand) continue;
        if (cand.finishReason) {
          lastFinishReason = cand.finishReason;
          if (cand.finishReason === 'MAX_TOKENS') truncated = true;
        }
        if (cand.finishMessage) {
          lastFinishMessage = cand.finishMessage;
        }
        for (const g of cand.groundingMetadata?.groundingChunks ?? []) {
          const uri = g.web?.uri;
          if (uri && /^https?:\/\//i.test(uri) && !sources.has(uri)) sources.set(uri, { title: g.web?.title || uri, url: uri });
        }
        for (const part of cand.content?.parts ?? []) {
          // Always preserve every part (including thoughts and thought signatures) in model history for multi-step continuity
          parts.push(part);
          if (part.thought) {
            // Thinking traces are internal reasoning; do not show to user as answer text
            continue;
          }
          if (part.toolCall) {
            input.onStatus('Searching the web');
          } else if (part.toolResponse) {
            // Server-side tool response
          } else if (part.functionCall) {
            input.onStatus(HELPER_TOOL_LABELS[part.functionCall.name] ?? `Looking up ${part.functionCall.name}`);
          } else if (part.text) {
            input.onStatus(null);
            if (!roundHasText && text && !text.endsWith('\n')) { text += '\n\n'; input.onText('\n\n'); }
            roundHasText = true;
            text += part.text;
            input.onText(part.text);
          }
        }
      }
      if (meta) {
        const cached = meta.cachedContentTokenCount ?? 0;
        usage = addUsage(usage, {
          inputTokens: Math.max(0, (meta.promptTokenCount ?? 0) - cached) + (meta.toolUsePromptTokenCount ?? 0),
          cacheReadTokens: cached,
          outputTokens: (meta.candidatesTokenCount ?? 0) + (meta.thoughtsTokenCount ?? 0),
        });
      }

      const calls = parts.filter(p => p.functionCall);
      if (calls.length === 0 || truncated) break; // a plain answer, or never run a tool on a truncated call

      // Replay the model's turn exactly as received (thought signatures included), then answer every call together.
      contents.push({ role: 'model', parts });
      const answers = await Promise.all(calls.map(async (p): Promise<GeminiPart> => {
        const call = p.functionCall!;
        const id = call.id ? { id: call.id } : {};
        try {
          return { functionResponse: { name: call.name, ...id, response: toolResponse(await runHelperTool(call.name, call.args ?? {}, input.toolCtx)) } };
        } catch (err) {
          return { functionResponse: { name: call.name, ...id, response: { error: err instanceof Error ? err.message : 'tool failed' } } };
        }
      }));
      contents.push({ role: 'user', parts: answers });
    }
  } catch (err) {
    throw friendlyError(err, apiKey);
  } finally {
    input.onStatus(null);
  }

  if (!text.trim()) {
    if (lastFinishReason === 'SAFETY') {
      throw new Error('Google Gemini safety filters blocked the response for this query. Try rephrasing the question.');
    }
    if (lastFinishReason === 'RECITATION') {
      throw new Error('Google Gemini stopped output due to a recitation/source filter.');
    }
    const detail = lastFinishMessage ? ` (${lastFinishMessage})` : (lastFinishReason && lastFinishReason !== 'STOP' ? ` (${lastFinishReason})` : '');
    throw new Error(truncated ? 'Gemini ran out of room before it wrote an answer. Ask a narrower question or try again.' : `The model returned no text${detail}.`);
  }
  return { text: sanitizeKey(text, apiKey).trim(), sources: [...sources.values()].slice(0, 8), usage, costUsd: estimateCostUsd(model, usage) };
}
