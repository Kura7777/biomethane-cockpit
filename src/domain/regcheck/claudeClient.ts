import { REGCHECK_WATCHLIST } from './watchlist';
import type { RegcheckReport, WatchItem } from './types';
import { isRegcheckReport } from './types';
import {
  getStoredAnthropicApiKey,
  setStoredAnthropicApiKey,
  clearStoredAnthropicApiKey,
  ANTHROPIC_API_KEY_STORAGE_KEY
} from './storage';

export {
  getStoredAnthropicApiKey,
  setStoredAnthropicApiKey,
  clearStoredAnthropicApiKey,
  ANTHROPIC_API_KEY_STORAGE_KEY
};

export const DEFAULT_CLAUDE_MODEL = 'claude-sonnet-5-5';
export const THOROUGH_CLAUDE_MODEL = 'claude-opus-5-5';

export type ClaudeModelChoice = typeof DEFAULT_CLAUDE_MODEL | typeof THOROUGH_CLAUDE_MODEL;

export const ANTHROPIC_API_VERSION = '2023-06-01';
export const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';

/**
 * Server tool definitions per Anthropic Messages API documentation.
 * Uses official server-side tool type names with max_uses quotas.
 */
export const ANTHROPIC_SERVER_TOOLS = [
  {
    type: 'web_search_20260318',
    name: 'web_search',
    max_uses: 25,
  },
  {
    type: 'web_fetch_20260318',
    name: 'web_fetch',
    max_uses: 25,
  }
];

export interface RunCheckOptions {
  apiKey?: string;
  model?: ClaudeModelChoice;
  customWatchlist?: WatchItem[];
  signal?: AbortSignal;
}

export function buildPrompt(watchlist: WatchItem[], todayIso: string): string {
  const watchlistText = watchlist.map((item, idx) => {
    const sourcesText = item.sources.map(s => `  - ${s.label}: ${s.url}`).join('\n');
    return `${idx + 1}. [ID: ${item.id}] [Type: ${item.watchType || 'fact'}]
Topic: ${item.topic}
App Claim: ${item.claim}
App Impact: ${item.appImpact}
Official Sources to Check:
${sourcesText}`;
  }).join('\n\n');

  return `Today's date is: ${todayIso}.

You are the Senior Statutory Auditor and Regulatory Verification Engine for the European Biomethane Trading Desk.
Your task is to independently verify whether the trading desk app's regulatory and registry facts are still correct by researching official web sources.

Here is the current Watch List of facts and active open questions:
================================================================
${watchlistText}
================================================================

RULES:
1. CHECK EACH ENTRY against its official primary sources using your web search and web fetch tools.
2. REPORT EXACT STATUS for each item:
   - 'STILL_CORRECT': The official source confirms the app's claim remains legally and operationally in force.
   - 'CHANGED': An official source or named reputable statutory publication indicates the law, rule, or operational status has changed. You MUST provide verbatim quote, date, URL, and publisher.
   - 'UNCLEAR': Public sources are ambiguous, contradictory, or inaccessible.
3. ONLY report CHANGED if an official page or a named reputable publication explicitly says so.
4. IGNORE COMMENTARY or unverified opinion pieces.
5. NEVER infer registry routes or statutory permissions that the source does not explicitly state.
6. REPORT NEW ITEMS: If you discover new biomethane regulatory, tax, or registry changes not listed above (e.g. new AIB connections, national decrees, RED III transposition updates), add them to "newItems" following the exact same evidence rules.
7. FOR EVERY ITEM (items and newItems), you MUST supply evidence:
   - url: full https URL
   - quote: exact verbatim excerpt from the source
   - date: publication date (YYYY-MM-DD or null if not found)
   - publisher: official organization name (e.g. "AIB", "VertiCer", "dena", "Energinet", "DG ENER")

OUTPUT FORMAT:
Output STRICT JSON ONLY. Do not prefix or suffix your response with conversational remarks.
Your JSON must strictly match this schema:

{
  "checkedAt": "${todayIso}",
  "model": "MODEL_NAME",
  "items": [
    {
      "watchId": "id_from_watchlist",
      "status": "STILL_CORRECT" | "CHANGED" | "UNCLEAR",
      "finding": "Specific concise explanation of what the source confirms or changes",
      "evidence": [
        {
          "url": "https://...",
          "quote": "Verbatim quote from the page",
          "date": "2026-09-01" | null,
          "publisher": "Name of Authority"
        }
      ]
    }
  ],
  "newItems": [
    {
      "title": "Title of new regulatory development",
      "finding": "What changed or was enacted",
      "appImpact": "Impact on trading routes or desk assumptions",
      "evidence": [
        {
          "url": "https://...",
          "quote": "Verbatim quote",
          "date": "2026-10-01" | null,
          "publisher": "Name of Authority"
        }
      ]
    }
  ],
  "summary": "Concise executive summary of check results (e.g. '17 still correct · 1 changed · 1 unclear · 1 new')"
}`;
}

export function extractLastTextBlock(content: unknown): string {
  if (!Array.isArray(content)) return '';
  for (let i = content.length - 1; i >= 0; i--) {
    const block = content[i];
    if (block && typeof block === 'object' && block.type === 'text' && typeof block.text === 'string') {
      return block.text;
    }
  }
  return '';
}

export function extractJsonFromText(rawText: string): unknown {
  const trimmed = rawText.trim();
  if (!trimmed) {
    throw new Error('Response contained no text content.');
  }

  // Look for markdown ```json ... ``` code fence
  const codeBlockMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  const target = codeBlockMatch ? codeBlockMatch[1].trim() : trimmed;

  try {
    return JSON.parse(target);
  } catch {
    // Fall back to scanning outermost { ... }
    const firstBrace = target.indexOf('{');
    const lastBrace = target.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace > firstBrace) {
      const candidate = target.substring(firstBrace, lastBrace + 1);
      return JSON.parse(candidate);
    }
    throw new Error('Could not locate a valid JSON object in model response.');
  }
}

function sanitizeKey(msg: string, key?: string): string {
  if (!key) return msg;
  const clean = key.trim();
  if (clean.length < 4) return msg;
  return msg.split(clean).join('[REDACTED_API_KEY]');
}

export async function runRegulationCheck(options: RunCheckOptions = {}): Promise<RegcheckReport> {
  const apiKey = (options.apiKey ?? getStoredAnthropicApiKey()).trim();
  if (!apiKey) {
    throw new Error('Anthropic API key is not configured. Please enter your API key in Settings.');
  }

  const model = options.model || DEFAULT_CLAUDE_MODEL;
  const watchlist = options.customWatchlist || REGCHECK_WATCHLIST;
  const todayIso = new Date().toISOString().split('T')[0];

  const prompt = buildPrompt(watchlist, todayIso);

  const payload = {
    model,
    max_tokens: 8192,
    tools: ANTHROPIC_SERVER_TOOLS,
    messages: [
      {
        role: 'user',
        content: prompt
      }
    ]
  };

  let response: Response;
  try {
    response = await fetch(ANTHROPIC_API_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': ANTHROPIC_API_VERSION,
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify(payload),
      signal: options.signal
    });
  } catch (err: any) {
    const errorMsg = sanitizeKey(err?.message || 'Network request failed', apiKey);
    throw new Error(`Network failure while connecting to api.anthropic.com: ${errorMsg}`);
  }

  if (!response.ok) {
    let errBody = '';
    try {
      errBody = await response.text();
    } catch {
      // Ignore
    }

    let parsedMsg = errBody;
    try {
      const errJson = JSON.parse(errBody);
      parsedMsg = errJson?.error?.message || errBody;
    } catch {
      // Ignore
    }

    parsedMsg = sanitizeKey(parsedMsg, apiKey);

    if (response.status === 401) {
      throw new Error(`Invalid Anthropic API key (HTTP 401). Please verify your key at console.anthropic.com.`);
    }
    if (response.status === 429) {
      throw new Error(`Anthropic API rate limit exceeded (HTTP 429). Please wait a moment before trying again.`);
    }
    if (response.status === 403) {
      throw new Error(`Anthropic API access forbidden (HTTP 403): ${parsedMsg}`);
    }

    throw new Error(`Anthropic API error (HTTP ${response.status}): ${parsedMsg}`);
  }

  let data: any;
  try {
    data = await response.json();
  } catch (err: any) {
    throw new Error('Failed to parse response body as JSON from api.anthropic.com.');
  }

  if (data?.stop_reason === 'refusal') {
    throw new Error('The model refused to process the regulatory audit request.');
  }

  const lastText = extractLastTextBlock(data?.content);
  if (!lastText) {
    throw new Error('Model response did not contain any text content blocks.');
  }

  let parsedReportObj: unknown;
  try {
    parsedReportObj = extractJsonFromText(lastText);
  } catch (parseErr: any) {
    throw new Error(`Failed to extract JSON from model response: ${parseErr.message}\n\nRaw text:\n${lastText.slice(0, 1000)}`);
  }

  // Set the actual model in the report if not present
  if (typeof parsedReportObj === 'object' && parsedReportObj !== null) {
    (parsedReportObj as any).model = model;
  }

  if (!isRegcheckReport(parsedReportObj)) {
    throw new Error(`Model response JSON does not conform to the expected RegcheckReport schema.\n\nRaw text:\n${lastText.slice(0, 1000)}`);
  }

  return parsedReportObj;
}
