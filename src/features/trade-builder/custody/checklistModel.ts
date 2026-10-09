import { CustodyPack } from '../../../domain/consignment/types';
import { CustodyParts } from '../../../domain/consignment/custody';
import { GateChecklistItem, GateChecklistStatus, GateResult } from '../../../domain/eligibility/types';

/**
 * Pure view-model for the chain-of-custody checklist: the verdict line (with the law-status
 * advisory beside it) and where each open row is fixed. Kept free of React so it can be tested.
 */

export type ChecklistTone = 'pos' | 'neg' | 'warn';

export interface ChecklistSummary {
  tone: ChecklistTone;
  /** e.g. "PASS — not yet law", "OPEN ITEMS", "BLOCKED". */
  label: string;
  counts: Record<GateChecklistStatus, number>;
  /** The law-status row's text while the obligation is not yet law, shown beside the verdict. */
  lawNote: string | null;
}

const LAW_ITEM_ID = 'legislative-status';

export function summariseChecklist(gate: Pick<GateResult, 'verdict' | 'checklist'>): ChecklistSummary {
  const items = gate.checklist ?? [];
  const counts: Record<GateChecklistStatus, number> = { PASS: 0, FAIL: 0, WARN: 0, TODO: 0 };
  for (const i of items) counts[i.status] += 1;

  const lawItem = items.find(i => i.id === LAW_ITEM_ID && i.status !== 'PASS');
  // The law row is advisory: a fully documented deal is PASS, but never read as "law in force".
  const lawNote = lawItem ? lawItem.detail : null;

  if (gate.verdict === 'PASS') {
    return { tone: lawItem ? 'warn' : 'pos', label: lawItem ? 'PASS — not yet law' : 'PASS', counts, lawNote };
  }
  if (gate.verdict === 'HARD_BLOCK') return { tone: 'neg', label: 'BLOCKED', counts, lawNote };
  if (gate.verdict === 'CONDITIONAL') return { tone: 'warn', label: 'OPEN ITEMS', counts, lawNote };
  return { tone: 'warn', label: 'UNRESOLVED', counts, lawNote };
}

/** Items that link to the corridor map rather than to a form field. */
const MAP_ITEMS: Record<string, 'GO' | 'POS'> = {
  'go-route-nl': 'GO',
  'registry-transfer': 'GO',
  'cross-border-pos': 'POS',
};

export function corridorFilterFor(itemId: string): 'GO' | 'POS' | null {
  return MAP_ITEMS[itemId] ?? null;
}

/** DOM ids of the fields the checklist deep-links to. Ids that start "cust-" live in the custody form. */
export const FIELD_IDS = {
  origin: 'tb-field-origin',
  scheme: 'tb-field-scheme',
  cocModel: 'tb-field-coc-model',
  udb: 'tb-field-udb',
  goMwh: 'cust-go-mwh',
  goProdEnd: 'cust-go-prod-end',
  goSupport: 'cust-go-support',
  posMwh: 'cust-pos-mwh',
  posCi: 'cust-pos-ci',
  posSupport: 'cust-pos-support',
  claimUnused: 'cust-claim-unused',
  claimPrtr: 'cust-claim-prtr',
  claimOwn: 'cust-claim-own',
  claimCounterparty: 'cust-claim-cpty',
  booking: 'cust-booking',
} as const;

/**
 * The field that fixes a checklist row, or null when the row is information or has no field
 * (law status, UDB info, route rows that link to the map).
 */
export function fieldTargetFor(item: GateChecklistItem, custody: CustodyPack | null, parts: CustodyParts): string | null {
  switch (item.id) {
    case 'origin-eu-eea':
    case 'origin':
      return FIELD_IDS.origin;
    case 'coc-model':
      return FIELD_IDS.cocModel;
    case 'udb-recording':
      return parts.paired ? null : FIELD_IDS.udb;
    case 'certified-chain':
      if (custody?.claims.ownTraderCertified == null) return FIELD_IDS.claimOwn;
      if (custody?.claims.counterpartyCertified == null) return FIELD_IDS.claimCounterparty;
      return FIELD_IDS.scheme;
    case 'go-pos-pairing':
      return custody?.go?.energyMWh == null ? FIELD_IDS.goMwh : FIELD_IDS.posMwh;
    case 'no-operating-aid':
      return parts.go ? FIELD_IDS.goSupport : FIELD_IDS.posSupport;
    case 'spanish-prtr-grant':
      return FIELD_IDS.claimPrtr;
    case 'ghg-saving':
      return FIELD_IDS.posCi;
    case 'booking-deadlines':
      return custody?.go?.productionEnd ? FIELD_IDS.booking : FIELD_IDS.goProdEnd;
    case 'no-double-claim':
      return FIELD_IDS.claimUnused;
    default:
      return null;
  }
}

/** Scroll to a field and focus it. The field may not be mounted yet (another step), so retry briefly. */
export function focusFieldWhenReady(id: string, tries = 20): void {
  if (typeof document === 'undefined') return;
  const el = document.getElementById(id);
  if (el) {
    const target = el.matches('input,select,textarea,button') ? el : el.querySelector<HTMLElement>('input,select,textarea,button');
    el.scrollIntoView({ block: 'center', behavior: 'smooth' });
    (target ?? el).focus({ preventScroll: true });
    return;
  }
  if (tries > 0) setTimeout(() => focusFieldWhenReady(id, tries - 1), 50);
}
