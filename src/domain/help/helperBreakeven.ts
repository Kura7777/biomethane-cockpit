/**
 * solve_deal_breakeven: what a producer can be paid, and what CI a deal can carry, on the SAME destination
 * rows price_destinations uses (compareDestinations), so the two tools cannot diverge. The CI limit is a
 * bisection over that engine, not a formula of its own. Producer payable and desk margin follow the netback
 * engine's producer-pricing logic (computeNetback, FIXED_PRICE / INDEX_LINKED).
 */
import { compareDestinations, type DestinationRow } from '../arbitrage/destinationComparison';
import { CI_COMPARATOR_ROAD_TRANSPORT } from '../markets/constants';
import { getAssumption } from '../assumptions/registry';
import type { CostInputs, MarksState } from '../netback/types';
import { buildInputs, caveatFor, type HelperInputs } from './helperProvenance';

export interface BreakevenArgs {
  origin: string;
  feedstockKey: string;
  customCi: number | null;
  producerPriceEur: number | null;
  targetMarginEur: number | null;
  producerSharePct: number | null;
  volumeMWh: number | null;
}

export interface BreakevenRow {
  marketId: string;
  marketName: string;
  country: string;
  verdict: string;
  notYetLaw: boolean;
  openCustodyItems: number;
  netNetbackEurPerMwh: number;
  /** Highest producer price that still leaves the target desk margin: net netback minus target margin. */
  maxPlantGatePriceEur: number;
  producerPayableEur: number | null;
  producerPayableBasis: string;
  deskMarginEur: number | null;
  deskNetAfterProducerShareEur: number | null;
  /** Highest CI (gCO2e/MJ) at which net netback still covers producer price + target margin; null when no producer price was given or none works. */
  maxCiForProducerPriceGCo2PerMj: number | null;
  maxCiNote: string | null;
  deepLink: string;
}

export interface BlockedMarket { marketId: string; marketName: string; verdict: string; reason: string | null }

const round2 = (n: number): number => Math.round(n * 100) / 100;

/** The engine's producer payable and desk margin (computeNetback: FIXED_PRICE / INDEX_LINKED), for a given net netback. */
export function producerTerms(net: number, producerPricing: CostInputs['producerPricing']): { payable: number | null; margin: number | null; basis: string } {
  if (producerPricing?.mode === 'FIXED_PRICE' && producerPricing.fixedPriceEurPerMwh !== null && producerPricing.fixedPriceEurPerMwh !== undefined) {
    const payable = producerPricing.fixedPriceEurPerMwh;
    return { payable, margin: Number((net - payable).toFixed(2)), basis: 'desk fixed producer price (Pricing desk)' };
  }
  if (producerPricing?.mode === 'INDEX_LINKED' && producerPricing.indexLinkedShare !== null && producerPricing.indexLinkedShare !== undefined) {
    const payable = Number((net * producerPricing.indexLinkedShare).toFixed(2));
    return { payable, margin: Number((net - payable).toFixed(2)), basis: `desk index-linked producer share ${(producerPricing.indexLinkedShare * 100).toFixed(1)}% of net netback (Pricing desk)` };
  }
  return { payable: null, margin: null, basis: 'producer pricing not set on the Pricing desk' };
}

/** Highest CI at which `netAt(ci)` still reaches `gate`, by bisection; null when no CI in range works. */
export function bisectMaxCi(netAt: (ci: number) => number | null, gate: number): { ci: number | null; note: string | null } {
  const hi0 = CI_COMPARATOR_ROAD_TRANSPORT;
  // Search floor: well below any feedstock default CI in the registry (deep-negative manure).
  const lo0 = -2 * hi0;
  const ok = (ci: number) => { const v = netAt(ci); return v !== null && v >= gate; };
  if (!ok(lo0)) return { ci: null, note: 'Not reachable at any CI: net netback stays below producer price plus target margin (or the route is blocked).' };
  if (ok(hi0)) return { ci: hi0, note: `Not binding: covered even at the ${hi0} gCO2e/MJ comparator.` };
  let lo = lo0;
  let hi = hi0;
  for (let i = 0; i < 24 && hi - lo > 0.05; i++) {
    const mid = (lo + hi) / 2;
    if (ok(mid)) lo = mid; else hi = mid;
  }
  return { ci: Math.floor(lo * 10) / 10, note: null };
}

export function solveDealBreakeven(
  args: BreakevenArgs,
  marks: MarksState,
  costs: CostInputs,
  now: Date,
): { result: Record<string, unknown>; inputs: HelperInputs } {
  const targetMargin = args.targetMarginEur ?? 0;
  const volume = args.volumeMWh ?? getAssumption('deal.defaultVolumeMwh');
  const reportedCi = args.customCi !== null ? { value: args.customCi, sourceUrl: '' } : null;
  const compare = (ci: { value: number; sourceUrl: string } | null): DestinationRow[] =>
    compareDestinations({ origin: args.origin, marks, costs, feedstockKey: args.feedstockKey, reportedCi: ci, volumeMWh: volume });

  const rows = compare(reportedCi);
  const ciUsed = rows[0]?.ci ?? args.customCi;
  const ciSource = args.customCi !== null ? 'CI supplied by the trader' : (rows[0]?.ciLabel ?? 'feedstock default CI');

  const blocked: BlockedMarket[] = rows
    .filter(r => r.blocked || r.netNetbackEurPerMwh === null)
    .map(r => ({ marketId: r.marketId, marketName: r.shortName, verdict: r.verdict, reason: r.reason }));

  const ranked: BreakevenRow[] = rows
    .filter(r => !r.blocked && r.netNetbackEurPerMwh !== null)
    .map(r => {
      const net = round2(r.netNetbackEurPerMwh as number);
      const terms = args.producerPriceEur !== null
        ? { payable: args.producerPriceEur, margin: Number((net - args.producerPriceEur).toFixed(2)), basis: 'producer asking price supplied by the trader' }
        : producerTerms(net, costs.producerPricing);
      let afterShare: number | null = terms.margin;
      if (terms.margin !== null && args.producerSharePct !== null && terms.margin > 0) {
        afterShare = round2(terms.margin * (1 - args.producerSharePct / 100));
      }
      let maxCi: { ci: number | null; note: string | null } = { ci: null, note: null };
      if (args.producerPriceEur !== null) {
        const gate = args.producerPriceEur + targetMargin;
        maxCi = bisectMaxCi(ci => compare({ value: ci, sourceUrl: '' }).find(x => x.marketId === r.marketId)?.netNetbackEurPerMwh ?? null, gate);
      } else {
        maxCi = { ci: null, note: 'Give a producer asking price to solve the CI limit.' };
      }
      return {
        marketId: r.marketId,
        marketName: r.marketName,
        country: r.country,
        verdict: r.verdict,
        notYetLaw: r.notYetLaw,
        openCustodyItems: r.openItems,
        netNetbackEurPerMwh: net,
        maxPlantGatePriceEur: round2(net - targetMargin),
        producerPayableEur: terms.payable,
        producerPayableBasis: terms.basis,
        deskMarginEur: terms.margin,
        deskNetAfterProducerShareEur: afterShare,
        maxCiForProducerPriceGCo2PerMj: maxCi.ci,
        maxCiNote: maxCi.note,
        // The producer price is not a Trade Builder input, so it is not carried in the link.
        deepLink: `[[go:/trade?origin=${args.origin}&market=${r.marketId}&feedstock=${args.feedstockKey}&ci=${ciUsed}&volume=${volume}|Open in Trade Builder]]`,
      };
    })
    .sort((a, b) => b.netNetbackEurPerMwh - a.netNetbackEurPerMwh);

  const inputs = buildInputs(marks, rows.map(r => r.marketId), now);
  const notYetLawIds = ranked.filter(r => r.notYetLaw).map(r => r.marketId);
  const notes = [
    args.customCi !== null ? 'CI supplied by the trader, no custody pack' : 'default-feedstock CI, no custody pack',
    ...(notYetLawIds.length > 0 ? [`${notYetLawIds.join(', ')} not yet law`] : []),
  ];
  const topInForce = ranked.find(r => !r.notYetLaw) ?? null;

  return {
    inputs,
    result: {
      origin: args.origin,
      feedstock: args.feedstockKey,
      ciUsed,
      ciSource,
      volumeMWh: volume,
      producerAskingPriceEur: args.producerPriceEur,
      targetDeskMarginEur: targetMargin,
      marketsComparedNote: 'Only the markets the desk compares for this origin are valued (NL GGE, DE THG and transport markets in the origin country); other registry markets are not evaluated here.',
      rankedDestinations: ranked,
      topInForce: topInForce ? topInForce.marketId : null,
      blockedMarkets: blocked,
      inputs,
      caveat: caveatFor(inputs, notes),
    },
  };
}
