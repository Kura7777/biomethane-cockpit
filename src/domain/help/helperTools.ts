/**
 * The desk helper's tools: read-only lookups into the app's own data, run in the browser when the
 * model asks for them. None of them changes desk data. Each returns compact JSON for the model.
 */
import type Anthropic from '@anthropic-ai/sdk';
import type { MarksState, CostInputs } from '../netback/types';
import type { MarkEntry } from '../markets/types';
import { MARKETS } from '../markets/registry';
import { isSimulatedMark } from '../marks/applyMarks';
import { getGoRoute, getPosRoute, normalizeCountryCode } from '../routes';
import { compareDestinations } from '../arbitrage/destinationComparison';
import { FEEDSTOCK_REGISTRY } from '../consignment/feedstocks';
import { LEGAL_CITATIONS, getCitationById } from '../citations/registry';
import { loadPlantsAsync } from '../plants/registry';
import { getPlantCompliance, aidStatus } from '../plants/compliance';

export interface HelperToolContext {
  marks: MarksState;
  costs: CostInputs;
}

type Schema = Anthropic.Beta.BetaTool['input_schema'];
const obj = (properties: Record<string, unknown>, required: string[]): Schema =>
  ({ type: 'object', properties, required, additionalProperties: false }) as Schema;

/** Tool definitions, in a fixed order so the prompt-cache prefix stays identical between requests. */
export const HELPER_TOOLS: Anthropic.Beta.BetaTool[] = [
  {
    name: 'get_marks',
    description: 'Current desk marks (bid / mid / offer, unit, source, and whether the mark is simulated) for one or more markets. Use before quoting any price. Market ids look like NL_GGE, DE_THG, NL_ERE, FR_CPB.',
    strict: true,
    input_schema: obj({ marketIds: { type: 'array', items: { type: 'string' }, description: 'Market ids from the knowledge pack' } }, ['marketIds']),
  },
  {
    name: 'get_route',
    description: 'Audited certificate routes between two countries: whether a Guarantee of Origin (GO) can transfer from origin to destination registry (AIB / ERGaR), and whether a Proof of Sustainability (PoS) on mass balance is accepted by the destination\'s compliance schemes. Countries as ISO codes (ES, NL, DE, DK...).',
    strict: true,
    input_schema: obj({ origin: { type: 'string' }, destination: { type: 'string' } }, ['origin', 'destination']),
  },
  {
    name: 'price_destinations',
    description: 'Value biomethane from an origin country into the destination markets the desk compares (e.g. NL GGE, DE THG), with the same eligibility and netback engines as the Trade Builder: verdict, net €/MWh after desk costs and margin, the CI used, and open custody items. Uses the desk\'s current marks and costs. Feedstock keys: ' + Object.keys(FEEDSTOCK_REGISTRY).join(', ') + '.',
    strict: true,
    input_schema: obj({ origin: { type: 'string', description: 'ISO country code' }, feedstock: { type: 'string', description: 'Feedstock key' } }, ['origin', 'feedstock']),
  },
  {
    name: 'search_plants',
    description: 'Find biomethane plants in the app by name, operator, region or country. Returns up to 10 matches with ids for get_plant.',
    strict: true,
    input_schema: obj({ query: { type: 'string' }, country: { type: ['string', 'null'], description: 'Optional ISO country code filter' } }, ['query', 'country']),
  },
  {
    name: 'get_plant',
    description: 'One plant\'s details plus its researched compliance data (GO registration, certification, PRTR and other aid, start date, feedstock used for CI), each with its source.',
    strict: true,
    input_schema: obj({ plantId: { type: 'string' } }, ['plantId']),
  },
  {
    name: 'search_sources',
    description: 'Search the app\'s library of legal sources (EU directives and regulations, national quota laws, registry rules): title, summary, desk rule and official URL.',
    strict: true,
    input_schema: obj({ query: { type: 'string' } }, ['query']),
  },
];

export const HELPER_TOOL_LABELS: Record<string, string> = {
  get_marks: 'Reading desk marks',
  get_route: 'Checking certificate routes',
  price_destinations: 'Pricing destinations',
  search_plants: 'Searching plants',
  get_plant: 'Reading plant data',
  search_sources: 'Searching legal sources',
  web_search: 'Searching the web',
};

function midOf(e: MarkEntry | undefined): number | null {
  if (!e) return null;
  if (e.mid !== null && e.mid !== undefined) return e.mid;
  if (e.bid !== null && e.offer !== null) return (e.bid + e.offer) / 2;
  return e.bid ?? e.offer ?? null;
}

const str = (v: unknown): string => (typeof v === 'string' ? v : '');
const strArr = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []);

/** Validates the input, runs the lookup and returns JSON text. Throws on bad input so the caller can flag is_error. */
export async function runHelperTool(name: string, input: unknown, ctx: HelperToolContext): Promise<string> {
  const args = (input && typeof input === 'object' ? input : {}) as Record<string, unknown>;

  switch (name) {
    case 'get_marks': {
      const ids = strArr(args.marketIds).slice(0, 12);
      if (ids.length === 0) throw new Error('marketIds must be a non-empty array of market ids');
      return JSON.stringify(ids.map(id => {
        const m = MARKETS.find(x => x.id === id);
        const e = ctx.marks.marks[id];
        if (!m) return { marketId: id, error: 'unknown market id' };
        return {
          marketId: id, name: m.name, unit: m.unitLabel,
          bid: e?.bid ?? null, mid: midOf(e), offer: e?.offer ?? null,
          source: e?.source ?? null, updatedAt: e?.updatedAt ?? null,
          simulated: isSimulatedMark(e),
        };
      }));
    }
    case 'get_route': {
      const origin = normalizeCountryCode(str(args.origin));
      const dest = normalizeCountryCode(str(args.destination));
      if (!origin || !dest) throw new Error('origin and destination must be ISO country codes');
      const go = getGoRoute(origin, dest);
      const pos = getPosRoute(origin, dest);
      return JSON.stringify({
        origin, destination: dest,
        goRoute: { status: go.status, via: go.via, reason: go.reason, conditions: go.conditions ?? [], workaround: go.workaround ?? null, sources: (go.sources ?? []).slice(0, 3).map(s => s.url) },
        posRoute: {
          status: pos.status,
          schemes: pos.schemes.slice(0, 4).map(s => ({ scheme: s.schemeName ?? s.schemeId, status: s.status, conditions: s.conditions ?? null, reason: s.reason })),
        },
      });
    }
    case 'price_destinations': {
      const origin = normalizeCountryCode(str(args.origin));
      const feedstock = str(args.feedstock);
      if (!origin) throw new Error('origin must be an ISO country code');
      if (!FEEDSTOCK_REGISTRY[feedstock]) throw new Error(`unknown feedstock "${feedstock}"; use one of ${Object.keys(FEEDSTOCK_REGISTRY).join(', ')}`);
      const rows = compareDestinations({ origin, marks: ctx.marks, costs: ctx.costs, feedstockKey: feedstock });
      if (rows.length === 0) return JSON.stringify({ origin, note: 'No destination comparison is configured for this origin.' });
      return JSON.stringify(rows.map(r => ({
        market: r.marketId, name: r.shortName, verdict: r.verdict, blocked: r.blocked, reason: r.reason,
        netEurPerMwh: r.netNetbackEurPerMwh === null ? null : Math.round(r.netNetbackEurPerMwh * 100) / 100,
        ciUsed: r.ciLabel, notYetLaw: r.notYetLaw, openCustodyItems: r.openItems,
      })));
    }
    case 'search_plants': {
      const q = str(args.query).trim().toLowerCase();
      const country = args.country ? normalizeCountryCode(str(args.country)) : '';
      if (!q && !country) throw new Error('give a query or a country');
      const plants = await loadPlantsAsync();
      const hits = plants.filter(p =>
        (!country || p.countryCode === country) &&
        (!q || [p.name, p.operator, p.operatingCompany, p.region, p.legalEntityName, p.country].some(v => (v ?? '').toLowerCase().includes(q)))
      ).slice(0, 10);
      return JSON.stringify(hits.map(p => ({
        id: p.id, name: p.name, country: p.countryCode, status: p.status, feedstock: p.primaryFeedstockCategory,
        capacityEstimateGWhPerYear: p.annualEnergyGWh ?? null,
      })));
    }
    case 'get_plant': {
      const id = str(args.plantId);
      const plants = await loadPlantsAsync();
      const p = plants.find(x => x.id === id);
      if (!p) throw new Error(`no plant with id "${id}"; use search_plants first`);
      const c = getPlantCompliance(p.id);
      const val = (sv: { value: unknown; sourceUrl?: string } | null | undefined) => (sv ? { value: sv.value, source: sv.sourceUrl ?? null } : null);
      return JSON.stringify({
        id: p.id, name: p.name, country: p.countryCode, status: p.status, operator: p.operator,
        feedstock: p.primaryFeedstockCategory, feedstockDetails: p.feedstockDetails,
        capacityEstimateGWhPerYear: p.annualEnergyGWh ?? null, capacityNote: 'Capacity-based estimate, not actual output',
        compliance: c ? {
          gdoRegistered: val(c.gdoRegistered), injection: val(c.injection), operatingSince: val(c.operatingSince),
          actualProduction: val(c.actualProductionGWh), certification: val(c.certification), prtrGrant: val(c.prtrGrant),
          otherAid: val(c.otherAid), aidClass: aidStatus(c), reportedCI: val(c.reportedCI), feedstockMix: val(c.feedstockMix),
        } : null,
      });
    }
    case 'search_sources': {
      const q = str(args.query).trim();
      if (!q) throw new Error('query is required');
      // Score each source by how many query words it contains, so multi-word questions still match.
      const words = q.toLowerCase().split(/[^a-z0-9äöüéèàçñ]+/i).filter(w => w.length > 2);
      const scored = LEGAL_CITATIONS.map(c => {
        const hay = `${c.shortTitle} ${c.officialTitle} ${c.jurisdictionName} ${c.summary} ${c.deskRuleSummary}`.toLowerCase();
        return { c, score: words.reduce((n, w) => n + (hay.includes(w) ? 1 : 0), 0) };
      }).filter(x => x.score > 0).sort((a, b) => b.score - a.score);
      const exact = getCitationById(q);
      const list = [...(exact ? [exact] : []), ...scored.map(x => x.c).filter(c => c !== exact)].slice(0, 5);
      return JSON.stringify(list.map(c => ({
        id: c.id, title: c.shortTitle, jurisdiction: c.jurisdictionName, status: c.status,
        summary: c.summary, deskRule: c.deskRuleSummary, url: c.officialUrl,
      })));
    }
    default:
      throw new Error(`unknown tool "${name}"`);
  }
}
