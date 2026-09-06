import { MarksState } from '../netback/types';
import { MarkProvenance } from '../markets/types';
import { ParsedBrokerMark } from './brokerParser';

export const MARKS_AUDIT_STORAGE_KEY = 'biomethane_marks_audit_log_v1';

export interface MarkDiffItem {
  marketId: string;
  marketName: string;
  unit: string;
  currentMid: number | null;
  currentBid: number | null;
  currentOffer: number | null;
  currentSource: string | null;
  currentUpdatedAt: string | null;
  newMid: number;
  newBid: number | null;
  newAsk: number | null;
  newSource: string;
  diffEur: number | null;
  diffPct: number | null;
  status: 'PRICE_UP' | 'PRICE_DOWN' | 'UNCHANGED' | 'NEW_MARK' | 'INVALID';
  selected: boolean;
}

export interface MarksAuditDiffSummary {
  marketId: string;
  marketName: string;
  unit: string;
  oldMid: number | null;
  newMid: number;
  oldBid: number | null;
  newBid: number | null;
  oldOffer: number | null;
  newOffer: number | null;
  changePct: number | null;
}

export interface MarksAuditRecord {
  id: string;
  timestamp: string; // ISO string
  brokerSource: string;
  assessmentDate: string;
  trader: string;
  recordsCommitted: number;
  diffSummary: MarksAuditDiffSummary[];
  rawSnippet: string;
}

const INITIAL_BASELINE_AUDIT_RECORD: MarksAuditRecord = {
  id: 'AUDIT-2026-08-15-1044',
  timestamp: '2026-08-15T08:30:00.000Z',
  brokerSource: 'Marex Spectron Daily Biofuels Run',
  assessmentDate: '2026-08-15',
  trader: 'Chris M.',
  recordsCommitted: 2,
  diffSummary: [
    {
      marketId: 'DE_THG',
      marketName: 'German THG-Quote (Double-Counted)',
      unit: 'EUR/kg',
      oldMid: 0.82,
      newMid: 0.85,
      oldBid: 0.80,
      newBid: 0.83,
      oldOffer: 0.84,
      newOffer: 0.87,
      changePct: 3.66,
    },
  ],
  rawSnippet: 'Marex Spectron 15-Aug-2026: THG 0.83/0.87 | NL HBE 18.50/19.00',
};

let memoryFallbackAuditHistory: MarksAuditRecord[] = [INITIAL_BASELINE_AUDIT_RECORD];

export type MarksAuditSyncHandler = (record: MarksAuditRecord) => Promise<any>;
let remoteAuditSyncHandler: MarksAuditSyncHandler | null = null;

export function registerMarksAuditSyncHandler(handler: MarksAuditSyncHandler | null): void {
  remoteAuditSyncHandler = handler;
}

/**
 * Retrieve the historical broker marks audit trail from persistent storage.
 */
export function getMarksAuditHistory(): MarksAuditRecord[] {
  try {
    if (typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem(MARKS_AUDIT_STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    }
  } catch (err) {
    console.warn('Failed to load marks audit log from localStorage', err);
  }
  return memoryFallbackAuditHistory;
}

/**
 * Persist an audit record to the persistent storage.
 */
export function saveMarksAuditRecord(record: MarksAuditRecord, skipRemote = false): void {
  try {
    const existing = getMarksAuditHistory();
    const updated = [record, ...existing].slice(0, 50); // retain last 50 audit runs
    memoryFallbackAuditHistory = updated;
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(MARKS_AUDIT_STORAGE_KEY, JSON.stringify(updated));
    }
    if (!skipRemote && remoteAuditSyncHandler) {
      remoteAuditSyncHandler(record).catch(() => {});
    }
  } catch (err) {
    console.error('Failed to save marks audit record', err);
  }
}

/**
 * Clear the audit history (e.g. for testing or desk reset).
 */
export function clearMarksAuditHistory(): void {
  memoryFallbackAuditHistory = [];
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(MARKS_AUDIT_STORAGE_KEY);
    }
  } catch (err) {
    console.warn('Failed to clear marks audit log', err);
  }
}

/**
 * Calculate the difference between incoming parsed broker marks and current desk marks.
 */
export function calculateMarksDiff(
  parsedMarks: ParsedBrokerMark[],
  currentMarks: MarksState
): MarkDiffItem[] {
  return parsedMarks.map(parsed => {
    if (!parsed.isValid || !parsed.marketId || parsed.midPrice === null) {
      return {
        marketId: parsed.marketId || 'UNKNOWN',
        marketName: parsed.marketName,
        unit: String(parsed.unit),
        currentMid: null,
        currentBid: null,
        currentOffer: null,
        currentSource: null,
        currentUpdatedAt: null,
        newMid: parsed.midPrice ?? 0,
        newBid: parsed.bid,
        newAsk: parsed.ask,
        newSource: parsed.brokerSource,
        diffEur: null,
        diffPct: null,
        status: 'INVALID',
        selected: false,
      };
    }

    // Handle TTF Gas Index special case
    if (parsed.marketId === 'GAS_TTF') {
      const cur = currentMarks.gasIndex;
      const curMid = cur.mid;
      const newMid = parsed.midPrice;
      const diffEur = curMid !== null ? Number((newMid - curMid).toFixed(2)) : null;
      const diffPct = curMid !== null && curMid !== 0 ? Number((((newMid - curMid) / curMid) * 100).toFixed(2)) : null;

      let status: MarkDiffItem['status'] = 'NEW_MARK';
      if (curMid !== null) {
        if (Math.abs(newMid - curMid) < 0.001) status = 'UNCHANGED';
        else if (newMid > curMid) status = 'PRICE_UP';
        else status = 'PRICE_DOWN';
      }

      return {
        marketId: 'GAS_TTF',
        marketName: 'TTF Natural Gas Month+1',
        unit: 'EUR/MWh',
        currentMid: curMid,
        currentBid: cur.bid,
        currentOffer: cur.offer,
        currentSource: cur.provenance?.sourceName || 'Desk Gas Index',
        currentUpdatedAt: cur.updatedAt,
        newMid,
        newBid: parsed.bid,
        newAsk: parsed.ask,
        newSource: parsed.brokerSource,
        diffEur,
        diffPct,
        status,
        selected: true,
      };
    }

    // Compliance Certificate Markets
    const cur = currentMarks.marks[parsed.marketId];
    const curMid = cur?.mid ?? null;
    const newMid = parsed.midPrice;
    const diffEur = curMid !== null ? Number((newMid - curMid).toFixed(3)) : null;
    const diffPct = curMid !== null && curMid !== 0 ? Number((((newMid - curMid) / curMid) * 100).toFixed(2)) : null;

    let status: MarkDiffItem['status'] = 'NEW_MARK';
    if (curMid !== null) {
      if (Math.abs(newMid - curMid) < 0.0001) status = 'UNCHANGED';
      else if (newMid > curMid) status = 'PRICE_UP';
      else status = 'PRICE_DOWN';
    }

    return {
      marketId: parsed.marketId,
      marketName: parsed.marketName,
      unit: String(parsed.unit),
      currentMid: curMid,
      currentBid: cur?.bid ?? null,
      currentOffer: cur?.offer ?? null,
      currentSource: cur?.provenance?.sourceName || cur?.source || null,
      currentUpdatedAt: cur?.updatedAt ?? null,
      newMid,
      newBid: parsed.bid,
      newAsk: parsed.ask,
      newSource: parsed.brokerSource,
      diffEur,
      diffPct,
      status,
      selected: true,
    };
  });
}

/**
 * Generate an audit record from committed mark diffs.
 */
export function buildAuditRecord(
  committedItems: MarkDiffItem[],
  brokerSource: string,
  assessmentDate: string,
  trader: string,
  rawSnippet: string
): MarksAuditRecord {
  const diffSummary: MarksAuditDiffSummary[] = committedItems.map(item => ({
    marketId: item.marketId,
    marketName: item.marketName,
    unit: item.unit,
    oldMid: item.currentMid,
    newMid: item.newMid,
    oldBid: item.currentBid,
    newBid: item.newBid,
    oldOffer: item.currentOffer,
    newOffer: item.newAsk,
    changePct: item.diffPct,
  }));

  return {
    id: `AUDIT-${new Date().toISOString().slice(0, 10)}-${Math.floor(1000 + Math.random() * 9000)}`,
    timestamp: new Date().toISOString(),
    brokerSource,
    assessmentDate,
    trader: trader || 'Desk Trader',
    recordsCommitted: committedItems.length,
    diffSummary,
    rawSnippet: rawSnippet.slice(0, 300),
  };
}
