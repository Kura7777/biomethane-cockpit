import { buildCompanyDirectory, CompanyLink, CompanyProfile } from '../../domain/companies/directory';
import { computeOpportunities, StackSpec } from '../../domain/companies/opportunities';
import { MarksState } from '../../domain/netback/types';
import { ETS2_COUNTRIES } from '../../domain/ets2/countries';

/** Same key the Clients screen stores the trader's confirmed links under. */
const LINKS_KEY = 'biomethane_company_links_v1';

function readLinks(): CompanyLink[] {
  try {
    const raw = localStorage.getItem(LINKS_KEY);
    return raw ? (JSON.parse(raw) as CompanyLink[]) : [];
  } catch {
    return [];
  }
}

interface Lookup {
  byEts1Key: Map<string, CompanyProfile>;
  byEts2Id: Map<string, CompanyProfile>;
}

let cache: { linksJson: string; lookup: Lookup } | null = null;

/** Directory lookups for screens that start from one dataset (ETS1 groups, ETS2 suppliers). */
export function companyLookup(): Lookup {
  const links = readLinks();
  const linksJson = JSON.stringify(links);
  if (cache && cache.linksJson === linksJson) return cache.lookup;
  const byEts1Key = new Map<string, CompanyProfile>();
  const byEts2Id = new Map<string, CompanyProfile>();
  for (const p of buildCompanyDirectory(links)) {
    for (const c of p.ets1) byEts1Key.set(c.key, p);
    for (const e of p.ets2) byEts2Id.set(e.id, p);
  }
  cache = { linksJson, lookup: { byEts1Key, byEts2Id } };
  return cache.lookup;
}

/** The first play of this company whose value stack pays in two or more regimes on the same MWh. */
export function stackedPlay(profile: CompanyProfile, marks: MarksState, year: number): { title: string; spec: StackSpec } | null {
  if (profile.markets.length < 2) return null;
  const hit = computeOpportunities(profile, marks, ETS2_COUNTRIES, year).find(o => o.stack?.isStack);
  return hit && hit.stack ? { title: hit.title, spec: hit.stack } : null;
}
