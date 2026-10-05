export type RegcheckItemStatus = 'STILL_CORRECT' | 'CHANGED' | 'UNCLEAR';

export interface RegcheckEvidence {
  url: string;
  quote: string;
  date: string | null;
  publisher: string;
}

export interface RegcheckItem {
  watchId: string;
  status: RegcheckItemStatus;
  finding: string;
  evidence: RegcheckEvidence[];
}

export interface RegcheckNewItem {
  title: string;
  finding: string;
  appImpact: string;
  evidence: RegcheckEvidence[];
}

export interface RegcheckReport {
  checkedAt: string; // ISO 8601
  model: string;
  items: RegcheckItem[];
  newItems: RegcheckNewItem[];
  summary: string;
}

export interface WatchSource {
  label: string;
  url: string;
}

export type WatchItemType = 'fact' | 'open_question';

export interface WatchItem {
  id: string;
  topic: string;
  claim: string;
  appImpact: string;
  sources: WatchSource[];
  watchType?: WatchItemType;
}

function isNonEmptyString(val: unknown): val is string {
  return typeof val === 'string' && val.trim().length > 0;
}

export function isRegcheckEvidence(obj: unknown): obj is RegcheckEvidence {
  if (typeof obj !== 'object' || obj === null) return false;
  const o = obj as Record<string, unknown>;
  const hasUrl = typeof o.url === 'string' && o.url.length > 0;
  const hasQuote = typeof o.quote === 'string';
  const hasPublisher = typeof o.publisher === 'string';
  const hasValidDate = o.date === null || typeof o.date === 'string';
  return hasUrl && hasQuote && hasPublisher && hasValidDate;
}

export function isRegcheckItem(obj: unknown): obj is RegcheckItem {
  if (typeof obj !== 'object' || obj === null) return false;
  const o = obj as Record<string, unknown>;
  const validStatus = o.status === 'STILL_CORRECT' || o.status === 'CHANGED' || o.status === 'UNCLEAR';
  const hasWatchId = isNonEmptyString(o.watchId);
  const hasFinding = typeof o.finding === 'string';
  const hasEvidence = Array.isArray(o.evidence) && o.evidence.every(isRegcheckEvidence);
  return validStatus && hasWatchId && hasFinding && hasEvidence;
}

export function isRegcheckNewItem(obj: unknown): obj is RegcheckNewItem {
  if (typeof obj !== 'object' || obj === null) return false;
  const o = obj as Record<string, unknown>;
  const hasTitle = isNonEmptyString(o.title);
  const hasFinding = typeof o.finding === 'string';
  const hasAppImpact = typeof o.appImpact === 'string';
  const hasEvidence = Array.isArray(o.evidence) && o.evidence.every(isRegcheckEvidence);
  return hasTitle && hasFinding && hasAppImpact && hasEvidence;
}

export function isRegcheckReport(obj: unknown): obj is RegcheckReport {
  if (typeof obj !== 'object' || obj === null) return false;
  const o = obj as Record<string, unknown>;
  if (!isNonEmptyString(o.checkedAt)) return false;
  if (!isNonEmptyString(o.model)) return false;
  if (typeof o.summary !== 'string') return false;
  if (!Array.isArray(o.items) || !o.items.every(isRegcheckItem)) return false;
  if (!Array.isArray(o.newItems) || !o.newItems.every(isRegcheckNewItem)) return false;
  return true;
}
