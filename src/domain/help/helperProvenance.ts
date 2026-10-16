/**
 * The provenance envelope every valuation tool returns: which desk marks (and gas index / FX) the number
 * was built on, the price side used, whether each is simulated, when it was observed and how old it is.
 * The model must repeat the side, the date and "simulated / indicative" when any input is simulated.
 */
import type { MarkEntry, MarkProvenance } from '../markets/types';
import { MARKETS } from '../markets/registry';
import { isSimulatedMark } from '../marks/applyMarks';
import { selectMarkSide } from '../netback/engine';
import type { MarksState } from '../netback/types';

export type EnvelopeSide = 'bid' | 'offer' | 'mid';

export interface MarkInput {
  id: string;
  name: string | null;
  /** Side the desk asked for (Pricing desk sides) and the side the price really came from. */
  sideRequested: EnvelopeSide;
  sideUsed: EnvelopeSide | null;
  /** The price at the desk side (the number the netback uses). */
  priceAtDeskSide: number | null;
  bid: number | null;
  offer: number | null;
  mid: number | null;
  /** The mid is not a stored mid: it is the bid/offer midpoint (or a single side). */
  midDerived: boolean;
  unit: string | null;
  simulated: boolean;
  source: string | null;
  observedAt: string | null;
  ageDays: number | null;
}

export interface HelperInputs {
  marks: MarkInput[];
  gasIndex: MarkInput | null;
  fx: { gbpEur: number | null; chfEur: number | null; simulated: boolean; observedAt: string | null; ageDays: number | null } | null;
  pricingSides: { certificateSide: EnvelopeSide; moleculeSide: EnvelopeSide };
}

const MS_PER_DAY = 86_400_000;

/** Whole days between an ISO date or timestamp and `now`; null when there is no usable date. */
export function ageInDays(date: string | null | undefined, now: Date): number | null {
  if (!date) return null;
  const t = Date.parse(date);
  if (!Number.isFinite(t)) return null;
  return Math.floor((now.getTime() - t) / MS_PER_DAY);
}

function observed(e: { provenance?: MarkProvenance | null; updatedAt?: string | null } | undefined | null): string | null {
  return e?.provenance?.observedAt ?? e?.updatedAt ?? null;
}

/** Stored mid, else the bid/offer midpoint, else the single side. `derived` says which. */
export function midOf(e: { bid: number | null; offer: number | null; mid: number | null } | undefined | null): { value: number | null; derived: boolean } {
  if (!e) return { value: null, derived: false };
  if (e.mid !== null && e.mid !== undefined) return { value: e.mid, derived: false };
  if (e.bid !== null && e.offer !== null) return { value: (e.bid + e.offer) / 2, derived: true };
  const single = e.bid ?? e.offer ?? null;
  return { value: single, derived: single !== null };
}

export function markInput(
  id: string,
  entry: MarkEntry | MarksState['gasIndex'] | undefined,
  side: EnvelopeSide,
  now: Date,
  unit: string | null,
  name: string | null,
): MarkInput {
  const sel = selectMarkSide(entry ? { bid: entry.bid, offer: entry.offer, mid: entry.mid } : undefined, side);
  const m = midOf(entry);
  const source = entry && 'source' in entry ? entry.source : null;
  return {
    id,
    name,
    sideRequested: side,
    sideUsed: sel.sideUsed,
    priceAtDeskSide: sel.price,
    bid: entry?.bid ?? null,
    offer: entry?.offer ?? null,
    mid: m.value,
    midDerived: m.derived,
    unit,
    // A missing mark is reported as missing (mid null), not as simulated.
    simulated: entry ? isSimulatedMark({ source, provenance: entry.provenance ?? null, bid: entry.bid, offer: entry.offer, mid: entry.mid }) : false,
    source: source ?? entry?.provenance?.sourceName ?? null,
    observedAt: observed(entry),
    ageDays: ageInDays(observed(entry), now),
  };
}

/** The envelope for a valuation: the certificate marks used, plus the gas index and FX that fed the netback. */
export function buildInputs(marks: MarksState, marketIds: string[], now: Date, opts: { gas?: boolean; fx?: boolean } = {}): HelperInputs {
  const sides = marks.pricingSides ?? { certificateSide: 'bid' as const, moleculeSide: 'bid' as const };
  const ids = [...new Set(marketIds)];
  const list = ids.map(id => {
    const m = MARKETS.find(x => x.id === id);
    return markInput(id, marks.marks?.[id], sides.certificateSide, now, m?.unitLabel ?? null, m?.name ?? null);
  });
  const fx = marks.fx;
  const gas = (opts.gas ?? true) ? markInput('GAS_TTF', marks.gasIndex, sides.moleculeSide, now, '€/MWh', 'TTF gas index') : null;
  const needsFx = opts.fx ?? ids.some(id => MARKETS.find(x => x.id === id)?.unitOfAccount.startsWith('GBP'));
  return {
    marks: list,
    gasIndex: gas,
    fx: fx && needsFx
      ? {
          gbpEur: fx.gbpEur,
          chfEur: fx.chfEur,
          simulated: isSimulatedMark({ source: null, provenance: fx.provenance ?? null, bid: fx.gbpEur, offer: null, mid: null }),
          observedAt: observed(fx),
          ageDays: ageInDays(observed(fx), now),
        }
      : null,
    pricingSides: { certificateSide: sides.certificateSide, moleculeSide: sides.moleculeSide },
  };
}

/** Marks older than this many days are called out in the caveat (matches the app's STALE_WARNING band). */
const STALE_WARNING_DAYS = 7;

/** One line the model must carry into the answer: simulated, missing and stale inputs, then tool-specific notes. */
export function caveatFor(inputs: HelperInputs, notes: string[] = []): string {
  const parts: string[] = [];
  const all = [...inputs.marks, ...(inputs.gasIndex ? [inputs.gasIndex] : [])];
  const sim = all.filter(m => m.simulated).map(m => m.id);
  if (sim.length > 0) parts.push(`Built on SIMULATED marks (${sim.join(', ')}) — indicative only`);
  const missing = inputs.marks.filter(m => m.mid === null).map(m => m.id);
  if (missing.length > 0) parts.push(`No desk mark for ${missing.join(', ')}`);
  const stale = all.filter(m => !m.simulated && m.ageDays !== null && m.ageDays >= STALE_WARNING_DAYS);
  if (stale.length > 0) parts.push(`Oldest real mark is ${Math.max(...stale.map(m => m.ageDays as number))} days old`);
  const fallback = inputs.marks.filter(m => m.sideUsed !== null && m.sideUsed !== m.sideRequested).map(m => m.id);
  if (fallback.length > 0) parts.push(`Desk side not quoted for ${fallback.join(', ')}: another side was used`);
  parts.push(...notes);
  return parts.join('; ') + '.';
}
