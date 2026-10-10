import { MARKETS } from '../markets/registry';
import { evaluateEligibility } from '../eligibility/engine';
import { OverallVerdict } from '../eligibility/types';
import { computeNetback } from '../netback/engine';
import { CostInputs, MarksState } from '../netback/types';
import { FEEDSTOCK_REGISTRY } from '../consignment/feedstocks';
import { getAssumption } from '../assumptions/registry';
import { PRODUCING_ORIGINS, getRouteTransitTariff } from './origins';
import { buildArbitrageConsignment, originIsEuGrid } from './engine';

/**
 * "Where can this gas go?" for one origin: NL GGE next to DE THG and any transport market in the
 * origin's own country, each with the eligibility verdict and the netback per MWh. It runs the same
 * eligibility and netback engines as the Trade Builder, on a deal with no custody pack entered yet,
 * so an NL GGE row for a plant that could qualify reads "open items", not "eligible".
 */
export interface DestinationRow {
  marketId: string;
  marketName: string;
  shortName: string;
  country: string;
  verdict: OverallVerdict;
  blocked: boolean;
  /** Why it is blocked (the failing check, e.g. the GO route) or what is still open; null when clear. */
  reason: string | null;
  netNetbackEurPerMwh: number | null;
  /** The CI (gCO2e/MJ) the row was valued with. */
  ci: number;
  /** Where that CI came from, e.g. "CI −100 g (manure default)" or "CI −42 g (published, source)". */
  ciLabel: string;
}

/** A carbon intensity the plant itself publishes (sourced); used instead of the feedstock default. */
export interface ReportedCi {
  value: number;
  sourceUrl: string;
}

function signedCi(ci: number): string {
  return `${ci < 0 ? '−' : ''}${Math.abs(ci)}`;
}

const COMPARED_MARKETS = ['NL_GGE', 'DE_THG'];

export function compareDestinations(args: {
  origin: string;
  marks: MarksState;
  costs: CostInputs;
  feedstockKey?: string;
  /** The plant's own sourced CI, if it publishes one; else the feedstock's default CI is used. */
  reportedCi?: ReportedCi | null;
  volumeMWh?: number;
}): DestinationRow[] {
  const profile = PRODUCING_ORIGINS[args.origin];
  if (!profile) return [];
  const feedstockKey = args.feedstockKey && FEEDSTOCK_REGISTRY[args.feedstockKey] ? args.feedstockKey : 'manure';
  const feedstock = FEEDSTOCK_REGISTRY[feedstockKey];
  const ci = args.reportedCi ? args.reportedCi.value : getAssumption(`feedstock.defaultCi.${feedstock.id}`);
  const ciLabel = args.reportedCi
    ? `CI ${signedCi(ci)} g (published, source)`
    : `CI ${signedCi(ci)} g (${feedstockKey.replace(/_/g, ' ')} default)`;
  const consignment = buildArbitrageConsignment({
    originCountry: profile.countryCode,
    originCountryName: profile.countryName,
    feedstockKey,
    feedstockName: feedstock.name,
    annexClassification: feedstock.annexClassification,
    carbonIntensity: ci,
    scheme: 'ISCC_EU',
    chainOfCustody: 'MASS_BALANCE',
    isEUGrid: originIsEuGrid(profile),
    volumeMWh: args.volumeMWh ?? getAssumption('deal.defaultVolumeMwh'),
    complianceYear: null,
  });

  const ids = [
    ...COMPARED_MARKETS,
    ...MARKETS.filter(m => m.status === 'ACTIVE' && m.sector === 'TRANSPORT' && m.country === profile.countryCode).map(m => m.id),
  ].filter((id, i, all) => all.indexOf(id) === i);

  return ids.flatMap(id => {
    const market = MARKETS.find(m => m.id === id);
    if (!market) return [];
    const eligibility = evaluateEligibility(consignment, market);
    const costs: CostInputs = { ...args.costs, logistics: getRouteTransitTariff(profile.countryCode, market.country) };
    const nb = computeNetback(market, consignment, args.marks, costs, args.marks.pricingSides);
    const blocked = eligibility.overallVerdict === 'HARD_BLOCK' || eligibility.overallVerdict === 'UNKNOWN';

    // The reason comes from the failing checklist row when there is one (e.g. "No GO route DK → NL").
    const coc = eligibility.gates.find(g => g.gate === 'CHAIN_OF_CUSTODY');
    const failed = coc?.checklist?.find(i => i.status === 'FAIL');
    const open = coc?.checklist?.filter(i => i.status === 'TODO' || i.status === 'WARN' && i.id !== 'legislative-status') ?? [];
    let reason: string | null = null;
    if (blocked) {
      reason = failed?.detail ?? eligibility.gates.find(g => g.verdict === 'HARD_BLOCK')?.reason ?? eligibility.summary;
    } else if (eligibility.overallVerdict !== 'ELIGIBLE') {
      reason = open.length > 0 ? `${open.length} custody item${open.length === 1 ? '' : 's'} still to enter: ${open.map(i => i.label).join(', ')}.` : eligibility.summary;
    }

    return [{
      marketId: market.id,
      marketName: market.name,
      shortName: market.shortName,
      country: market.country,
      verdict: eligibility.overallVerdict,
      blocked,
      reason,
      netNetbackEurPerMwh: blocked ? null : nb.netNetback,
      ci,
      ciLabel,
    }];
  });
}
