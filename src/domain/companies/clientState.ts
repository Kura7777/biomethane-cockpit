import { CompanyLink, CompanyProfile } from './directory';

/**
 * The trader's own marks on the directory, kept in localStorage: which companies are linked and
 * how far each outreach has got. Parsing is strict about shape: a stored `null`, `{}` or `[1,2]`
 * falls back to empty rather than breaking the screen.
 */

export type Status = 'NOT_CONTACTED' | 'CONTACTED' | 'MEETING' | 'PIPELINE' | 'NOT_A_FIT';

export const STATUS_LABEL: Record<Status, string> = {
  NOT_CONTACTED: 'Not contacted',
  CONTACTED: 'Contacted',
  MEETING: 'Meeting held',
  PIPELINE: 'In pipeline',
  NOT_A_FIT: 'Not a fit',
};

/** Higher is further along. When linked companies carry different statuses, the most advanced one wins. */
const STATUS_RANK: Record<Status, number> = { PIPELINE: 4, MEETING: 3, CONTACTED: 2, NOT_A_FIT: 1, NOT_CONTACTED: 0 };

export const isStatus = (v: unknown): v is Status => typeof v === 'string' && Object.prototype.hasOwnProperty.call(STATUS_RANK, v);

const has = (o: object, k: string) => Object.prototype.hasOwnProperty.call(o, k);

function parseJson(raw: string | null | undefined): unknown {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/** Links: an array of {a, b} string pairs. Anything else is empty; malformed entries are dropped. */
export function parseLinks(raw: string | null | undefined): CompanyLink[] {
  const v = parseJson(raw);
  if (!Array.isArray(v)) return [];
  return v.filter((l): l is CompanyLink => !!l && typeof l === 'object' && typeof (l as CompanyLink).a === 'string' && typeof (l as CompanyLink).b === 'string')
    .map(l => ({ a: l.a, b: l.b }));
}

/** Statuses: a record of id → valid Status. Anything else is empty; invalid values are dropped. */
export function parseStatuses(raw: string | null | undefined): Record<string, Status> {
  const v = parseJson(raw);
  if (!v || typeof v !== 'object' || Array.isArray(v)) return {};
  const out: Record<string, Status> = {};
  for (const [k, s] of Object.entries(v as Record<string, unknown>)) if (isStatus(s)) out[k] = s;
  return out;
}

/** The status shown for a profile: its own, else the most advanced one among the profiles merged into it. */
export function resolveStatus(statuses: Record<string, Status>, profile: Pick<CompanyProfile, 'id' | 'memberIds'>): Status {
  if (has(statuses, profile.id)) return statuses[profile.id];
  let best: Status = 'NOT_CONTACTED';
  for (const id of profile.memberIds) {
    if (has(statuses, id) && STATUS_RANK[statuses[id]] > STATUS_RANK[best]) best = statuses[id];
  }
  return best;
}

/** Stores a status under the profile's id and drops the keys of the profiles merged into it. */
export function withStatus(statuses: Record<string, Status>, profile: Pick<CompanyProfile, 'id' | 'memberIds'>, status: Status): Record<string, Status> {
  const next: Record<string, Status> = {};
  const members = new Set(profile.memberIds);
  for (const [k, v] of Object.entries(statuses)) if (!members.has(k)) next[k] = v;
  next[profile.id] = status;
  return next;
}

/** Links without the ones touching this profile (either end is one of its merged ids). */
export function linksWithout(links: CompanyLink[], profile: Pick<CompanyProfile, 'memberIds'>): CompanyLink[] {
  const members = new Set(profile.memberIds);
  return links.filter(l => !members.has(l.a) && !members.has(l.b));
}
