/**
 * Certificate (GO) transfer routes between two countries, from the audited route matrix
 * (research of 2026-10-04, src/domain/routes). Pure logic, no React.
 *
 * This answers one question: can a biomethane Guarantee of Origin move electronically between the
 * two registries today? The PoS summary is attached for display only; compliance use is decided by
 * the CROSS_BORDER_POS eligibility gate.
 */
import { DESTINATION_USE, type HubSource } from './hubConnectivity';
import {
  AUDITED_COUNTRIES,
  ROUTE_AUDIT_ACCESSED,
  getGoRoute,
  getPosRoute,
  type EvidenceGrade,
  type PosRouteStatus,
} from '../routes';

export type CertRouteStatus =
  | 'POSSIBLE_OBSERVED'
  | 'POSSIBLE_PUBLISHED'
  | 'POSSIBLE_RULE'
  | 'POSSIBLE_CONDITIONAL'
  | 'AWAITING_REGISTRY'
  | 'NOT_POSSIBLE'
  | 'NO_DATA';

export interface CertificatePosSummary {
  status: PosRouteStatus;
  schemeName: string | null;
  conditions: string | null;
  reason: string;
}

export interface CertificateRoute {
  origin: string;
  target: string;
  status: CertRouteStatus;
  hubs: ('AIB' | 'ERGAR')[];
  reason: string;
  destinationUse: string | null;
  sources: HubSource[];
  grade: EvidenceGrade | null;
  conditions: string[];
  workaround: string | null;
  openQuestionId: string | null;
  pos: CertificatePosSummary | null;
}

export const CERT_ROUTE_LABELS: Record<CertRouteStatus, string> = {
  POSSIBLE_OBSERVED: 'Possible · observed trades',
  POSSIBLE_PUBLISHED: 'Possible · registry-published',
  POSSIBLE_RULE: 'Possible · hub rules',
  POSSIBLE_CONDITIONAL: 'Possible · conditions apply',
  AWAITING_REGISTRY: 'Awaiting registry answer',
  NOT_POSSIBLE: 'Not possible',
  NO_DATA: 'Not researched',
};

/** Statuses where a GO can move today (used for "live" groupings and counts). */
export const POSSIBLE_STATUSES: CertRouteStatus[] = [
  'POSSIBLE_OBSERVED',
  'POSSIBLE_PUBLISHED',
  'POSSIBLE_RULE',
  'POSSIBLE_CONDITIONAL',
];

const AUDITED = new Set<string>(AUDITED_COUNTRIES);

function normIso(iso: string): string {
  const u = (iso || '').toUpperCase();
  return u === 'UK' ? 'GB' : u;
}

function dedupe(sources: HubSource[]): HubSource[] {
  const seen = new Set<string>();
  return sources.filter(s => {
    const k = `${s.url}|${s.claim}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

function empty(origin: string, target: string, status: CertRouteStatus, reason: string): CertificateRoute {
  return {
    origin,
    target,
    status,
    hubs: [],
    reason,
    destinationUse: DESTINATION_USE[target]?.text ?? null,
    sources: [],
    grade: null,
    conditions: [],
    workaround: null,
    openQuestionId: null,
    pos: null,
  };
}

export function getCertificateRoute(origin: string, target: string): CertificateRoute {
  const o = normIso(origin);
  const t = normIso(target);

  if (o === t) {
    return empty(o, t, 'NOT_POSSIBLE', 'Same country: GOs stay in the home registry.');
  }
  if (!AUDITED.has(o) || !AUDITED.has(t)) {
    const missing = [!AUDITED.has(o) ? o : null, !AUDITED.has(t) ? t : null].filter(Boolean).join(' and ');
    return empty(o, t, 'NO_DATA', `No registry research for ${missing} yet.`);
  }

  const go = getGoRoute(o, t);
  const conditions = go.conditions ?? [];
  let status: CertRouteStatus;
  if (go.status === 'POSSIBLE') {
    if (conditions.length > 0) status = 'POSSIBLE_CONDITIONAL';
    else if (go.grade === 'OBSERVED') status = 'POSSIBLE_OBSERVED';
    else if (go.grade === 'PUBLISHED') status = 'POSSIBLE_PUBLISHED';
    else status = 'POSSIBLE_RULE';
  } else if (go.status === 'NOT_POSSIBLE') {
    status = 'NOT_POSSIBLE';
  } else {
    status = 'AWAITING_REGISTRY';
  }

  const hubs: ('AIB' | 'ERGAR')[] = go.via === 'AIB' ? ['AIB'] : go.via === 'ERGAR' ? ['ERGAR'] : [];
  const sources: HubSource[] = (go.sources ?? []).map(s => ({
    claim: s.quote ? `${s.claim} — "${s.quote}"` : s.claim,
    url: s.url,
    accessed: ROUTE_AUDIT_ACCESSED,
  })) as HubSource[];

  const pos = getPosRoute(o, t);
  const posSummary: CertificatePosSummary | null = pos.summary
    ? { status: pos.summary.status, schemeName: pos.summary.schemeName ?? null, conditions: pos.summary.conditions ?? null, reason: pos.summary.reason }
    : null;

  return {
    origin: o,
    target: t,
    status,
    hubs,
    reason: go.reason,
    destinationUse: DESTINATION_USE[t]?.text ?? null,
    sources: dedupe(sources),
    grade: go.grade ?? null,
    conditions,
    workaround: go.workaround ?? null,
    openQuestionId: go.openQuestionId ?? null,
    pos: posSummary,
  };
}

export function getCertificateRoutesFrom(origin: string, targets: string[]): CertificateRoute[] {
  const o = normIso(origin);
  return targets.filter(t => normIso(t) !== o).map(t => getCertificateRoute(o, t));
}
