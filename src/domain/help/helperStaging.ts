/**
 * parse_and_stage_marks, structured branch: marks the model already pulled out of chat text.
 * The model's own unit label is never trusted. A quoted unit is required, run through the broker-run
 * parser's unit conversion into the market's unit of account (with the desk FX), and every row is checked
 * for non-finite or non-positive numbers, crossed markets, dates and magnitude against the desk mark.
 */
import { convertQuotedPrice, resolveMarketId, type BrokerParseResult, type ParsedBrokerMark } from '../markets/brokerRunParser';
import { MARKETS } from '../markets/registry';
import { isSimulatedMark } from '../marks/applyMarks';
import type { MarksState } from '../netback/types';
import { midOf } from './helperProvenance';

/** Same limit as the app's STALE_CRITICAL band (markets/types.ts): a quote older than this is not staged. */
export const STAGE_MAX_AGE_DAYS = 30;
/** A converted price this many times above, or this fraction below, a real desk mark is rejected as a unit or typo error. */
export const STAGE_MAGNITUDE_FACTOR = 10;

const MS_PER_DAY = 86_400_000;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const isNum = (v: unknown): v is number => typeof v === 'number';

export interface StructuredMarkInput {
  marketId?: unknown;
  bid?: unknown;
  offer?: unknown;
  ask?: unknown;
  mid?: unknown;
  unit?: unknown;
}

function deskMarkMid(marks: MarksState, marketId: string): { mid: number | null; simulated: boolean } {
  if (marketId === 'GAS_TTF') {
    const g = marks.gasIndex;
    return { mid: midOf(g).value, simulated: isSimulatedMark({ source: null, provenance: g?.provenance ?? null, bid: g?.bid ?? null, offer: g?.offer ?? null, mid: g?.mid ?? null }) };
  }
  const e = marks.marks?.[marketId];
  return { mid: midOf(e).value, simulated: e ? isSimulatedMark(e) : false };
}

export function stageStructuredMarks(args: {
  marks: StructuredMarkInput[];
  marksState: MarksState;
  date: string | undefined;
  broker: string;
  now: Date;
}): BrokerParseResult {
  const today = args.now.toISOString().slice(0, 10);
  const fx = args.marksState.fx?.gbpEur ?? null;
  const warnings: string[] = [];
  const errors: string[] = [];

  let effDate = today;
  if (args.date) {
    if (ISO_DATE.test(args.date) && Number.isFinite(Date.parse(args.date))) effDate = args.date;
    else errors.push(`date "${args.date}" is not YYYY-MM-DD`);
  }
  const ageDays = Math.floor((Date.parse(today) - Date.parse(effDate)) / MS_PER_DAY);
  const dateError = errors.length > 0
    ? errors[0]
    : effDate > today ? `date ${effDate} is in the future`
      : ageDays > STAGE_MAX_AGE_DAYS ? `date ${effDate} is ${ageDays} days old (limit ${STAGE_MAX_AGE_DAYS})` : null;

  const marks: ParsedBrokerMark[] = args.marks.map((sm, idx) => {
    const { marketId, marketName } = resolveMarketId(typeof sm.marketId === 'string' ? sm.marketId : '');
    const rowErrors: string[] = [];
    const rowWarnings: string[] = [];
    if (!marketId) rowErrors.push('unrecognised market');
    if (dateError) rowErrors.push(dateError);

    const quoted = {
      bid: isNum(sm.bid) ? sm.bid : null,
      offer: isNum(sm.offer) ? sm.offer : (isNum(sm.ask) ? sm.ask : null),
      mid: isNum(sm.mid) ? sm.mid : null,
    };
    for (const [k, v] of Object.entries(quoted)) {
      if (v !== null && !Number.isFinite(v)) rowErrors.push(`${k} is not a finite number`);
      else if (v !== null && v <= 0) rowErrors.push(`${k} ${v} must be positive`);
    }
    if (quoted.bid === null && quoted.offer === null && quoted.mid === null) rowErrors.push('no price given');

    let bid: number | null = null;
    let ask: number | null = null;
    let mid: number | null = null;
    let unit = marketId ? (MARKETS.find(m => m.id === marketId)?.unitOfAccount ?? '') : '';
    if (marketId && rowErrors.length === 0) {
      const unitText = typeof sm.unit === 'string' ? sm.unit : '';
      const conv = (v: number | null): number | null => {
        if (v === null) return null;
        const r = convertQuotedPrice(v, unitText, marketId, fx);
        if (r.error) { if (!rowErrors.includes(r.error)) rowErrors.push(r.error); return null; }
        if (r.marketUnit) unit = r.marketUnit;
        return r.market;
      };
      bid = conv(quoted.bid);
      ask = conv(quoted.offer);
      mid = conv(quoted.mid);
      if (rowErrors.length === 0) {
        if (bid !== null && ask !== null && bid > ask) rowWarnings.push(`Crossed market: bid ${bid} is above offer ${ask}; no mid was invented`);
        else if (mid === null && bid !== null && ask !== null) mid = Number(((bid + ask) / 2).toFixed(6));
        if (mid !== null && bid !== null && ask !== null && bid <= ask && (mid < bid || mid > ask)) rowWarnings.push(`Mid ${mid} is outside bid ${bid} / offer ${ask}`);
        const rep = mid ?? bid ?? ask;
        const desk = deskMarkMid(args.marksState, marketId);
        if (rep !== null && desk.mid !== null && desk.mid > 0 && !desk.simulated) {
          if (rep > desk.mid * STAGE_MAGNITUDE_FACTOR || rep < desk.mid / STAGE_MAGNITUDE_FACTOR) {
            rowErrors.push(`Implausible: ${rep} ${unit} is more than ${STAGE_MAGNITUDE_FACTOR}x away from the desk mark ${desk.mid}. Check the unit.`);
          }
        } else if (rep !== null) {
          rowWarnings.push(desk.mid === null ? 'No desk mark to sanity-check the magnitude against' : 'Desk mark is simulated, so the magnitude could not be sanity-checked');
        }
      }
    }
    const isValid = rowErrors.length === 0 && !!marketId;
    return {
      id: `staged_${args.now.getTime()}_${idx + 1}`,
      rawLine: `${marketId ?? sm.marketId}: bid ${quoted.bid ?? '—'} / offer ${quoted.offer ?? '—'} / mid ${quoted.mid ?? '—'} (${typeof sm.unit === 'string' && sm.unit ? sm.unit : 'no unit'})`,
      marketId,
      marketName,
      productRaw: typeof sm.marketId === 'string' ? sm.marketId : '',
      midPrice: isValid ? mid : null,
      bid: isValid ? bid : null,
      ask: isValid ? ask : null,
      unit,
      assessmentDate: effDate,
      brokerSource: args.broker,
      isValid,
      validationErrors: rowErrors,
      validationWarnings: rowWarnings,
    };
  });

  return {
    marks,
    quotes: [],
    errors: [],
    warnings: [],
    brokerDetected: args.broker,
    inferredSource: 'GENERIC_OTC',
    totalLines: marks.length,
    rawLineCount: marks.length,
    validCount: marks.filter(m => m.isValid).length,
    parsedQuoteCount: 0,
    skippedLines: marks.filter(m => !m.isValid).map(m => `${m.rawLine} — ${m.validationErrors.join('; ')}`),
    extractedDate: effDate,
    chatExtractedLabel: `chat-extracted from ${args.broker} text`,
  };
}
