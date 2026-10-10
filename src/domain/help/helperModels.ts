/**
 * The Claude models the desk helper can answer with, and what each is for. The choice is one desk
 * setting (helper.model on #/pricing → Desk assumptions), also switchable on the Ask the desk page.
 *
 * API differences that matter here (claude-api skill, shared/models.md and tool-use-concepts.md):
 *  - Haiku 5.5 has no server-side fallback (a `fallbacks` list returns 400);
 *  - web_search_20260209 (dynamic filtering) is for Opus 5.5 / Sonnet 5.5; Haiku 5.5 uses web_search_20250305.
 * Costs are stated relative to each other, not as prices: list prices change and are not desk data.
 */
import { getAssumption } from '../assumptions/registry';

export interface HelperModel {
  /** The helper.model setting value. */
  value: number;
  id: string;
  name: string;
  tagline: string;
  useFor: string;
  speedAndCost: string;
  serverFallback: boolean;
  webSearchTool: 'web_search_20260209' | 'web_search_20250305';
}

export const HELPER_MODELS: readonly HelperModel[] = [
  {
    value: 2,
    id: 'claude-opus-5-5',
    name: 'Opus 5.5',
    tagline: 'Deepest reasoning',
    useFor: 'Regulatory analysis, comparing destinations or legal regimes, questions that need several look-ups, and anything you will act on.',
    speedAndCost: 'Slowest; highest cost per question.',
    serverFallback: true,
    webSearchTool: 'web_search_20260209',
  },
  {
    value: 1,
    id: 'claude-sonnet-5-5',
    name: 'Sonnet 5.5',
    tagline: 'Balanced',
    useFor: 'Everyday desk questions: explaining a rule, checking a route, reading marks or a valuation. Close to Opus on most questions.',
    speedAndCost: 'Faster; about half the cost of Opus.',
    serverFallback: true,
    webSearchTool: 'web_search_20260209',
  },
  {
    value: 0,
    id: 'claude-haiku-5-5',
    name: 'Haiku 5.5',
    tagline: 'Fast and cheap',
    useFor: 'Quick look-ups: what a term means, one mark, one route. Less reliable on multi-step analysis, so check its answers on anything you trade on.',
    speedAndCost: 'Fastest; a small fraction of the cost of Opus.',
    serverFallback: false,
    webSearchTool: 'web_search_20250305',
  },
];

export const DEFAULT_HELPER_MODEL = HELPER_MODELS[0];

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
