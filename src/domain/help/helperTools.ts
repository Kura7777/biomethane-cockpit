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
import { lookupReference } from './referenceLookup';
import { searchDeskMemory, saveDeskRule, type DeskMemoryRule } from './deskMemory';
import { FUEL_EU_SHIPPING_COUNTERPARTIES } from '../fueleu/shippingTargetsData';
import { FUEL_EU_SHIPPING_GROUPS } from '../fueleu/groups';

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
  {
    name: 'lookup_reference',
    description: 'Full text behind the index in the system prompt: glossary definitions (with why they matter and sources), regulatory knowledge-base documents (law, articles, registries, contracts), market details (legal basis, registry, open points) and watchlist items. Query with a term, a market id, a law or a topic, for example "gge", "RED III Article 29", "NL_GGE", "mass balance".',
    strict: true,
    input_schema: obj({ query: { type: 'string', description: 'A term, id, law or topic' } }, ['query']),
  },
  {
    name: 'get_desk_memory',
    description: 'Query persistent desk memory: custom rules, counterparty traits (e.g. Shell, Eni requirements), tariff notes, and past deal journals recorded on this desk.',
    strict: true,
    input_schema: obj({ query: { type: 'string', description: 'Keyword, market, or counterparty name (or empty string for all)' } }, ['query']),
  },
  {
    name: 'save_desk_memory',
    description: 'Save a custom trading rule, counterparty requirement, tariff note, or market lesson to persistent desk memory when the trader instructs "remember this...", "note this down", or states a policy.',
    strict: true,
    input_schema: obj({
      subject: { type: 'string', description: 'Counterparty name, market code, or topic (e.g. "Shell", "DE_THG", "Danish grid exit")' },
      rule: { type: 'string', description: 'The exact rule, requirement, or commercial lesson to remember' },
      category: { type: 'string', enum: ['counterparty', 'market', 'tariff', 'contract', 'general'], description: 'Category of the rule' }
    }, ['subject', 'rule', 'category']),
  },
  {
    name: 'search_shipping_counterparties',
    description: 'Search official FuelEU Maritime shipping companies and commercial groups (EU MRV 2025 dataset, 14,050 vessels in scope across 3,400+ companies). Returns matches with rank, segment, fleet capability (DUAL_FUEL_LNG vs CONVENTIONAL_ONLY), 2026 compliance deficit (tCO2e), penalty exposure (€), and Bio-LNG requirement (MWh). Filter by query (company name e.g. "Maersk", "MSC", "Grimaldi", "Hapag-Lloyd"), segment (e.g. "Container ship", "Oil tanker", "Bulk carrier", "Ro-pax ship", "Cruise"), and/or fleetCapability ("DUAL_FUEL_LNG" or "CONVENTIONAL_ONLY").',
    strict: true,
    input_schema: obj({
      query: { type: ['string', 'null'], description: 'Company or group name search string' },
      segment: { type: ['string', 'null'], description: 'Vessel segment filter (e.g. "Container ship", "Oil tanker", "Bulk carrier", "Ro-pax ship")' },
      fleetCapability: { type: ['string', 'null'], enum: ['DUAL_FUEL_LNG', 'CONVENTIONAL_ONLY', null], description: 'Optional fleet capability filter' },
      limit: { type: ['number', 'null'], description: 'Max results (default 10, max 25)' }
    }, ['query', 'segment', 'fleetCapability', 'limit']),
  },
  {
    name: 'get_shipping_counterparty',
    description: 'Get full FuelEU Maritime compliance profile and commercial dossier for one shipping company or group by rank (1-3400+) or company/group name. Returns vessels, fuel consumption breakdown (VLSFO, MGO, LNG tonnes), 2026/2030 deficits, Year 1 & Year 2 penalty escalation, Bio-LNG required, ETS exposure, group roll-up, and institutional outreach pitch.',
    strict: true,
    input_schema: obj({
      rankOrName: { type: 'string', description: 'Rank number (e.g. "1") or exact/partial company name (e.g. "Maersk A/S", "MSC", "Carnival")' }
    }, ['rankOrName']),
  },
];

export const HELPER_TOOL_LABELS: Record<string, string> = {
  get_marks: 'Reading desk marks',
  get_route: 'Checking certificate routes',
  price_destinations: 'Pricing destinations',
  search_plants: 'Searching plants',
  get_plant: 'Reading plant data',
  search_sources: 'Searching legal sources',
  lookup_reference: 'Looking up the reference',
  get_desk_memory: 'Checking desk memory & rules',
  save_desk_memory: 'Saving rule to desk memory',
  search_shipping_counterparties: 'Searching FuelEU shipping companies',
  get_shipping_counterparty: 'Reading FuelEU shipping profile',
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
    case 'lookup_reference':
      return lookupReference(str(args.query));
    case 'get_desk_memory': {
      const q = str(args.query);
      const res = searchDeskMemory(q);
      return JSON.stringify({
        query: q,
        rulesFound: res.rules.length,
        rules: res.rules.slice(0, 8),
        dealsFound: res.deals.length,
        deals: res.deals.slice(0, 5),
      });
    }
    case 'save_desk_memory': {
      const subject = str(args.subject);
      const rule = str(args.rule);
      const category = str(args.category) as DeskMemoryRule['category'];
      if (!subject || !rule) throw new Error('subject and rule are required to save desk memory');
      const saved = saveDeskRule({
        subject,
        rule,
        category: category || 'general',
      });
      return JSON.stringify({
        success: true,
        savedRule: saved,
        confirmation: `Successfully recorded rule for "${saved.subject}" in persistent desk memory.`,
      });
    }
    case 'search_shipping_counterparties': {
      const q = str(args.query).trim().toLowerCase();
      const seg = str(args.segment).trim().toLowerCase();
      const cap = str(args.fleetCapability).trim().toUpperCase();
      const limit = Math.min(Math.max(typeof args.limit === 'number' ? Math.floor(args.limit) : 10, 1), 25);

      if (!q && !seg && !cap) {
        // Return top counterparties by deficit penalty
        const top = FUEL_EU_SHIPPING_COUNTERPARTIES.slice(0, limit);
        return JSON.stringify({
          totalFound: FUEL_EU_SHIPPING_COUNTERPARTIES.length,
          results: top.map(c => ({
            rank: c.rank,
            name: c.parent_name,
            group: c.group_name,
            segment: c.segment,
            vessels: c.vessels_in_scope,
            fleetCapability: c.fleetCapability,
            lngVessels: c.lng_vessels_in_scope,
            deficit2026Tco2e: c.compliance_balance_2026_tco2e,
            penalty2026Y1Eur: c.penalty_2026_y1_eur,
            bioLngRequiredMwh: c.bio_lng_required_neg100_mwh,
            strategyTier: c.strategy_tier,
          })),
        });
      }

      const matches = FUEL_EU_SHIPPING_COUNTERPARTIES.filter(c => {
        if (q) {
          const matchName = c.parent_name.toLowerCase().includes(q);
          const matchGroup = c.group_name.toLowerCase().includes(q);
          const matchImo = c.company_imo.includes(q);
          if (!matchName && !matchGroup && !matchImo) return false;
        }
        if (seg) {
          if (!c.segment.toLowerCase().includes(seg)) return false;
        }
        if (cap) {
          if (c.fleetCapability !== cap) return false;
        }
        return true;
      });

      return JSON.stringify({
        query: q || null,
        segmentFilter: seg || null,
        fleetCapabilityFilter: cap || null,
        totalFound: matches.length,
        results: matches.slice(0, limit).map(c => ({
          rank: c.rank,
          name: c.parent_name,
          group: c.group_name,
          segment: c.segment,
          vessels: c.vessels_in_scope,
          fleetCapability: c.fleetCapability,
          lngVessels: c.lng_vessels_in_scope,
          deficit2026Tco2e: c.compliance_balance_2026_tco2e,
          penalty2026Y1Eur: c.penalty_2026_y1_eur,
          bioLngRequiredMwh: c.bio_lng_required_neg100_mwh,
          strategyTier: c.strategy_tier,
        })),
      });
    }
    case 'get_shipping_counterparty': {
      const q = str(args.rankOrName).trim();
      if (!q) throw new Error('rankOrName is required (e.g. rank "1" or company name "Maersk")');

      // 1. Try matching by numerical rank first
      const rankNum = parseInt(q, 10);
      let match = !isNaN(rankNum) && rankNum > 0 && rankNum <= FUEL_EU_SHIPPING_COUNTERPARTIES.length
        ? FUEL_EU_SHIPPING_COUNTERPARTIES[rankNum - 1]
        : undefined;

      // 2. Exact or substring match on parent_name or group_name
      if (!match) {
        const qLower = q.toLowerCase();
        match = FUEL_EU_SHIPPING_COUNTERPARTIES.find(c => c.parent_name.toLowerCase() === qLower)
          || FUEL_EU_SHIPPING_COUNTERPARTIES.find(c => c.parent_name.toLowerCase().includes(qLower))
          || FUEL_EU_SHIPPING_COUNTERPARTIES.find(c => c.group_name.toLowerCase().includes(qLower));
      }

      if (!match) {
        throw new Error(`No shipping counterparty found for "${q}". Try calling search_shipping_counterparties first.`);
      }

      // Check for associated group roll-up details
      const group = FUEL_EU_SHIPPING_GROUPS.find(g => g.id === match!.group_id);

      return JSON.stringify({
        rank: match.rank,
        name: match.parent_name,
        companyImo: match.company_imo,
        segment: match.segment,
        strategyTier: match.strategy_tier,
        vesselsInScope: match.vessels_in_scope,
        fleetCapability: match.fleetCapability,
        lngVesselsInScope: match.lng_vessels_in_scope,
        conventionalVesselsInScope: match.conventional_vessels_in_scope,
        fuelMix: {
          vlsfoTonnes: match.vlsfo_tonnes,
          mgoTonnes: match.mgo_tonnes,
          lngTonnes: match.lng_tonnes,
          totalEnergyMwh: match.total_energy_mwh,
          actualGhgie: match.actual_ghgie,
          targetGhgie2026: 89.34,
        },
        regulatoryExposure: {
          complianceBalance2026Tco2e: match.compliance_balance_2026_tco2e,
          penalty2026Y1Eur: match.penalty_2026_y1_eur,
          penalty2026Y2Eur: match.penalty_2026_y2_eur,
          complianceBalance2030Tco2e: match.compliance_balance_2030_tco2e,
          penalty2030Y1Eur: match.penalty_2030_y1_eur,
          etsExposure2026Tco2: match.ets_exposure_2026_tco2,
        },
        bioLngSolutions: {
          bioLngRequiredNeg100Tonnes: match.bio_lng_required_neg100_t,
          bioLngRequiredNeg100Mwh: match.bio_lng_required_neg100_mwh,
          bioLngRequiredZeroTonnes: match.bio_lng_required_zero_t,
          clientSavingsPhysicalEur: match.client_savings_physical_eur,
        },
        group: {
          id: match.group_id,
          name: match.group_name,
          entityType: match.entityType,
          totalGroupVessels: group?.vessels ?? match.vessels_in_scope,
          totalGroupMembers: group?.memberCompanyCount ?? 1,
          groupPooledBalance2026Tco2e: group?.sumOfCompanyBalances2026 ?? match.compliance_balance_2026_tco2e,
          groupSumPenalties2026Eur: group?.sumOfCompanyPenalties2026 ?? match.penalty_2026_y1_eur,
          contacts: group?.contacts ?? [],
        },
        outreachPitch: match.outreachPitch,
        source: match.source,
      });
    }
    default:
      throw new Error(`unknown tool "${name}"`);
  }
}
