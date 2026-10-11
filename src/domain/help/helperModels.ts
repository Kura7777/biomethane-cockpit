/**
 * The models the desk helper can answer with (Claude and Gemini), and what each is for. The choice is
 * one desk setting (helper.model on #/pricing → Desk assumptions), also switchable on the Ask the desk page.
 *
 * API differences that matter here (claude-api skill, shared/models.md and tool-use-concepts.md):
 *  - Haiku 5.5 has no server-side fallback (a `fallbacks` list returns 400);
 *  - web_search_20260209 (dynamic filtering) is for Opus 5.5 / Sonnet 5.5; Haiku 5.5 uses web_search_20250305.
 * Costs in the text are stated relative to each other; the list prices are desk assumptions on #/pricing
 * (helper.price.*), read by helperCost.ts.
 */
import { getAssumption } from '../assumptions/registry';

export type HelperProvider = 'anthropic' | 'google';

export interface HelperModel {
  /** The helper.model setting value. */
  value: number;
  provider: HelperProvider;
  id: string;
  name: string;
  tagline: string;
  useFor: string;
  speedAndCost: string;
  serverFallback: boolean;
  /** Anthropic only: the web search tool version this model takes. */
  webSearchTool: 'web_search_20260209' | 'web_search_20250305' | null;
  /** Anthropic only: how hard the model thinks (output_config.effort). Gemini keeps its defaults. */
  effort: 'low' | 'medium' | null;
  /** Whether the helper can use Google Search grounding together with the desk tools (Gemini only). */
  googleSearch: boolean;
  /** Assumption keys for this model's list prices (registry.ts, HELPER category). */
  price: { input: string; output: string; cacheRead: string };
}

const CLAUDE_COMMON = { provider: 'anthropic' as const, googleSearch: false };
const GEMINI_COMMON = { provider: 'google' as const, serverFallback: false, webSearchTool: null, effort: null };

export const HELPER_MODELS: readonly HelperModel[] = [
  {
    ...CLAUDE_COMMON,
    value: 2,
    id: 'claude-opus-5-5',
    name: 'Opus 5.5',
    tagline: 'Deepest reasoning',
    useFor: 'Regulatory analysis, comparing destinations or legal regimes, questions that need several look-ups, and anything you will act on.',
    speedAndCost: 'Slowest; highest cost per question.',
    serverFallback: true,
    webSearchTool: 'web_search_20260209',
    effort: 'medium',
    price: { input: 'helper.price.opus55.inputUsdPerMTok', output: 'helper.price.opus55.outputUsdPerMTok', cacheRead: 'helper.price.anthropic.cacheReadX.opusSonnet' },
  },
  {
    ...CLAUDE_COMMON,
    value: 1,
    id: 'claude-sonnet-5-5',
    name: 'Sonnet 5.5',
    tagline: 'Balanced',
    useFor: 'Everyday desk questions: explaining a rule, checking a route, reading marks or a valuation. Close to Opus on most questions.',
    speedAndCost: 'Faster; about half the cost of Opus.',
    serverFallback: true,
    webSearchTool: 'web_search_20260209',
    effort: 'low',
    price: { input: 'helper.price.sonnet55.inputUsdPerMTok', output: 'helper.price.sonnet55.outputUsdPerMTok', cacheRead: 'helper.price.anthropic.cacheReadX.opusSonnet' },
  },
  {
    ...CLAUDE_COMMON,
    value: 0,
    id: 'claude-haiku-5-5',
    name: 'Haiku 5.5',
    tagline: 'Fast and cheap',
    useFor: 'Quick look-ups: what a term means, one mark, one route. Less reliable on multi-step analysis, so check its answers on anything you trade on.',
    speedAndCost: 'Fastest; a small fraction of the cost of Opus.',
    serverFallback: false,
    webSearchTool: 'web_search_20250305',
    effort: 'low',
    price: { input: 'helper.price.haiku55.inputUsdPerMTok', output: 'helper.price.haiku55.outputUsdPerMTok', cacheRead: 'helper.price.anthropic.cacheReadX.haiku' },
  },
  {
    ...GEMINI_COMMON,
    value: 4,
    id: 'gemini-2.5-pro',
    name: 'Gemini 2.5 Pro',
    tagline: 'Google, strongest',
    useFor: 'A second opinion from Google on regulatory or multi-step questions. Uses the desk’s own data and look-ups; it does not search the web.',
    speedAndCost: 'Slower; mid cost, well below Opus.',
    googleSearch: false,
    price: { input: 'helper.price.gemini25pro.inputUsdPerMTok', output: 'helper.price.gemini25pro.outputUsdPerMTok', cacheRead: 'helper.price.gemini.cachedInputFraction' },
  },
  {
    ...GEMINI_COMMON,
    value: 3,
    id: 'gemini-3.5-flash-lite',
    name: 'Gemini 3.5 Flash-Lite',
    tagline: 'Google, fast and cheap',
    useFor: 'Quick look-ups and everyday questions from Google’s cheapest current model. Uses the desk’s own data and look-ups; it does not search the web.',
    speedAndCost: 'Fast; a few times the cost of Haiku, far below Opus.',
    googleSearch: false,
    price: { input: 'helper.price.gemini35flashlite.inputUsdPerMTok', output: 'helper.price.gemini35flashlite.outputUsdPerMTok', cacheRead: 'helper.price.gemini.cachedInputFraction' },
  },
];

export const DEFAULT_HELPER_MODEL = HELPER_MODELS[2];

/** The model for a helper.model value (rounded, so an odd value typed on #/pricing still picks one). */
export function helperModelFor(value: number): HelperModel {
  return HELPER_MODELS.find(m => m.value === Math.round(value)) ?? DEFAULT_HELPER_MODEL;
}

export function helperModelById(id: string): HelperModel {
  return HELPER_MODELS.find(m => m.id === id) ?? DEFAULT_HELPER_MODEL;
}

/** The model the desk has chosen right now. */
export function currentHelperModel(): HelperModel {
  return helperModelFor(getAssumption('helper.model'));
}
