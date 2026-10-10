/**
 * Worked examples for formula terms in the glossary, computed live from what the desk holds:
 * the marks on #/pricing, the regulatory constants and the feedstock default CIs (Desk assumptions).
 * Nothing is typed in here: change a mark or an assumption and the example follows.
 */
import type { MarksState, CostInputs } from '../netback/types';
import type { MarkEntry } from '../markets/types';
import { CI_COMPARATOR_ROAD_TRANSPORT, MJ_PER_MWH } from '../markets/constants';
import {
  NL_GGE_BUYOUT_EUR_PER_TCO2E,
  NL_GGE_FOSSIL_COMPARATOR_GCO2E_MJ,
  NL_GGE_START_YEAR,
  RED3_TRANSPORT_MAX_CI,
  RED_HEAT_THRESHOLD_POST_2021,
  RED_HEAT_THRESHOLD_POST_2026,
} from '../regulatory/constants';
import { feedstockDefaultCi } from '../assumptions/registry';
import { isSimulatedMark } from '../marks/applyMarks';
import { compareDestinations } from '../arbitrage/destinationComparison';

export interface TermExample {
  lines: string[];
  /** Where the inputs come from, shown under the example. */
  inputs: string;
}

export interface TermExampleContext {
  marks: MarksState;
  costs: CostInputs;
}

const KG_PER_T = 1000;
const GJ_PER_MWH = MJ_PER_MWH / 1000;

function midOf(e: MarkEntry | undefined): number | null {
  if (!e) return null;
  if (e.mid !== null && e.mid !== undefined) return e.mid;
  if (e.bid !== null && e.offer !== null) return (e.bid + e.offer) / 2;
  return e.bid ?? e.offer ?? null;
}

function markLine(ctx: TermExampleContext, marketId: string): { mid: number | null; tag: string } {
  const e = ctx.marks.marks[marketId];
  return { mid: midOf(e), tag: isSimulatedMark(e) ? ' (simulated mark)' : '' };
}

const fmt = (n: number, dp = 2) => n.toLocaleString('en-GB', { minimumFractionDigits: dp, maximumFractionDigits: dp });
const ci = (n: number) => (n < 0 ? `−${Math.abs(n)}` : String(n));

const INPUTS = 'Live: desk marks on #/pricing, feedstock default CIs under Desk assumptions, and the regulatory constants.';

export function termExample(id: string, ctx: TermExampleContext): TermExample | null {
  const manureCi = feedstockDefaultCi('manure');
  const wasteCi = feedstockDefaultCi('food_waste');
  if (manureCi === null || wasteCi === null) return null;

  switch (id) {
    case 'gge': {
      const perMwh = (NL_GGE_FOSSIL_COMPARATOR_GCO2E_MJ - manureCi) * GJ_PER_MWH;
      const m = markLine(ctx, 'NL_GGE');
      const buyoutT = NL_GGE_BUYOUT_EUR_PER_TCO2E[NL_GGE_START_YEAR];
      const lines = [
        `Manure gas at the default CI of ${ci(manureCi)} gCO₂e/MJ: (${NL_GGE_FOSSIL_COMPARATOR_GCO2E_MJ} − (${ci(manureCi)})) × ${GJ_PER_MWH} = ${fmt(perMwh, 1)} GGE per MWh (lower heating value).`,
      ];
      if (m.mid !== null) lines.push(`At the NL GGE mark of €${fmt(m.mid, 3)}/GGE${m.tag}: ${fmt(perMwh, 1)} × €${fmt(m.mid, 3)} = €${fmt(perMwh * m.mid)}/MWh.`);
      else lines.push('No NL GGE mark is set on #/pricing.');
      if (buyoutT !== undefined) lines.push(`Ceiling at the ${NL_GGE_START_YEAR} buy-out (€${buyoutT}/t = €${fmt(buyoutT / KG_PER_T, 3)}/GGE): €${fmt(perMwh * buyoutT / KG_PER_T)}/MWh.`);
      return { lines, inputs: INPUTS };
    }
    case 'thg-quote': {
      const tPerMwh = (CI_COMPARATOR_ROAD_TRANSPORT - manureCi) * GJ_PER_MWH / KG_PER_T;
      const m = markLine(ctx, 'DE_THG');
      const lines = [
        `Manure gas at ${ci(manureCi)} gCO₂e/MJ against the ${CI_COMPARATOR_ROAD_TRANSPORT} transport comparator: (${CI_COMPARATOR_ROAD_TRANSPORT} − (${ci(manureCi)})) × ${GJ_PER_MWH} ÷ ${KG_PER_T} = ${fmt(tPerMwh, 4)} tCO₂e saved per MWh.`,
      ];
      if (m.mid !== null) lines.push(`At the DE THG mark of €${fmt(m.mid)}/t${m.tag}: ${fmt(tPerMwh, 4)} × €${fmt(m.mid)} = €${fmt(tPerMwh * m.mid)}/MWh.`);
      else lines.push('No DE THG mark is set on #/pricing.');
      return { lines, inputs: INPUTS };
    }
    case 'ere': {
      const kgPerMwh = (CI_COMPARATOR_ROAD_TRANSPORT - manureCi) * GJ_PER_MWH;
      const m = markLine(ctx, 'NL_ERE');
      const lines = [
        `Manure gas at ${ci(manureCi)} gCO₂e/MJ: (${CI_COMPARATOR_ROAD_TRANSPORT} − (${ci(manureCi)})) × ${GJ_PER_MWH} = ${fmt(kgPerMwh, 1)} ERE (kg CO₂e) per MWh.`,
      ];
      if (m.mid !== null) lines.push(`At the NL ERE mark of €${fmt(m.mid, 3)}/ERE${m.tag}: ${fmt(kgPerMwh, 1)} × €${fmt(m.mid, 3)} = €${fmt(kgPerMwh * m.mid)}/MWh.`);
      else lines.push('No NL ERE mark is set on #/pricing.');
      lines.push('Dutch-produced green gas only: foreign gas cannot be booked into ERE.');
      return { lines, inputs: INPUTS };
    }
    case 'ghg-threshold': {
      const transport = (CI_COMPARATOR_ROAD_TRANSPORT - wasteCi) / CI_COMPARATOR_ROAD_TRANSPORT;
      const heat = (NL_GGE_FOSSIL_COMPARATOR_GCO2E_MJ - wasteCi) / NL_GGE_FOSSIL_COMPARATOR_GCO2E_MJ;
      const transportMin = 1 - RED3_TRANSPORT_MAX_CI / CI_COMPARATOR_ROAD_TRANSPORT;
      const heatVerdict = heat >= RED_HEAT_THRESHOLD_POST_2026 ? 'passes both heat tiers'
        : heat >= RED_HEAT_THRESHOLD_POST_2021 ? `passes ${fmt(RED_HEAT_THRESHOLD_POST_2021 * 100, 0)}% but not ${fmt(RED_HEAT_THRESHOLD_POST_2026 * 100, 0)}%, so the checklist warns`
        : `fails ${fmt(RED_HEAT_THRESHOLD_POST_2021 * 100, 0)}%`;
      return {
        lines: [
          `Food-waste gas at the default CI of ${ci(wasteCi)} gCO₂e/MJ.`,
          `Transport: (${CI_COMPARATOR_ROAD_TRANSPORT} − ${ci(wasteCi)}) ÷ ${CI_COMPARATOR_ROAD_TRANSPORT} = ${fmt(transport * 100, 1)}% saving, ${transport >= transportMin ? 'above' : 'below'} the ${fmt(transportMin * 100, 0)}% minimum.`,
          `Heat (Dutch GGE, ${NL_GGE_FOSSIL_COMPARATOR_GCO2E_MJ} comparator): (${NL_GGE_FOSSIL_COMPARATOR_GCO2E_MJ} − ${ci(wasteCi)}) ÷ ${NL_GGE_FOSSIL_COMPARATOR_GCO2E_MJ} = ${fmt(heat * 100, 1)}%, which ${heatVerdict}.`,
        ],
        inputs: INPUTS,
      };
    }
    case 'buy-out': {
      const buyoutT = NL_GGE_BUYOUT_EUR_PER_TCO2E[NL_GGE_START_YEAR];
      if (buyoutT === undefined) return null;
      const perMwh = (NL_GGE_FOSSIL_COMPARATOR_GCO2E_MJ - manureCi) * GJ_PER_MWH;
      return {
        lines: [
          `Dutch GGE ${NL_GGE_START_YEAR}: €${buyoutT} per tonne = €${fmt(buyoutT / KG_PER_T, 3)} per GGE (1 GGE = 1 kg).`,
          `Manure gas at ${ci(manureCi)} gCO₂e/MJ yields ${fmt(perMwh, 1)} GGE per MWh, so a supplier would pay at most ${fmt(perMwh, 1)} × €${fmt(buyoutT / KG_PER_T, 3)} = €${fmt(perMwh * buyoutT / KG_PER_T)}/MWh for it.`,
        ],
        inputs: INPUTS,
      };
    }
    case 'netback': {
      const rows = compareDestinations({ origin: 'ES', marks: ctx.marks, costs: ctx.costs, feedstockKey: 'manure' });
      const pick = (id2: string) => rows.find(r => r.marketId === id2);
      const lines = [`Spanish manure gas (${pick('NL_GGE')?.ciLabel ?? `CI ${ci(manureCi)} g`}), after desk costs and margin:`];
      for (const r of [pick('NL_GGE'), pick('DE_THG')]) {
        if (!r) continue;
        const v = r.netNetbackEurPerMwh;
        lines.push(`${r.shortName}: ${v === null ? 'not priced' : `€${fmt(v)}/MWh`}${r.blocked ? ' (blocked)' : r.openItems > 0 ? ` (${r.openItems} custody items still open)` : ''}.`);
      }
      lines.push('The full breakdown for any plant is under "Where can this gas go?" on the map and in the plant drawer.');
      return { lines, inputs: 'Live: the same netback engine as the Trade Builder, with desk marks and costs from #/pricing.' };
    }
    default:
      return null;
  }
}

export const TERMS_WITH_EXAMPLES = ['gge', 'thg-quote', 'ere', 'ghg-threshold', 'buy-out', 'netback'] as const;
