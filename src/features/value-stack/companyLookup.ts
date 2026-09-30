import { buildCompanyDirectory, CompanyProfile } from '../../domain/companies/directory';
import { computeOpportunities, StackSpec } from '../../domain/companies/opportunities';
import { MarksState } from '../../domain/netback/types';
import { Ets2CountryProfile } from '../../domain/ets2/countries';
import { ETS2_COMPANY_IMPORT_KEY, ETS2_COUNTRY_IMPORT_KEY, readEts2Companies, readEts2Countries, readLinks, readText } from '../clients/deskInputs';

interface Lookup {
  byEts1Key: Map<string, CompanyProfile>;
  byEts2Id: Map<string, CompanyProfile>;
  /** The ETS2 country profiles the directory was built with (the trader's imports included). */
  ets2Countries: Ets2CountryProfile[];
}

let cache: { signature: string; lookup: Lookup } | null = null;

/**
 * Directory lookups for screens that start from one dataset (ETS1 groups, ETS2 suppliers). Built
 * from the same links and ETS2 imports as the Clients page, so both show one directory.
 */
export function companyLookup(): Lookup {
  const links = readLinks();
  const signature = JSON.stringify([links, readText(ETS2_COMPANY_IMPORT_KEY), readText(ETS2_COUNTRY_IMPORT_KEY)]);
  if (cache && cache.signature === signature) return cache.lookup;
  const byEts1Key = new Map<string, CompanyProfile>();
  const byEts2Id = new Map<string, CompanyProfile>();
  for (const p of buildCompanyDirectory(links, readEts2Companies())) {
    for (const c of p.ets1) byEts1Key.set(c.key, p);
    for (const e of p.ets2) byEts2Id.set(e.id, p);
  }
  cache = { signature, lookup: { byEts1Key, byEts2Id, ets2Countries: readEts2Countries() } };
  return cache.lookup;
}

/** The first play of this company whose value stack pays in two or more regimes on the same MWh. */
export function stackedPlay(profile: CompanyProfile, marks: MarksState, year: number, ets2Countries?: Ets2CountryProfile[]): { title: string; spec: StackSpec } | null {
  const hit = computeOpportunities(profile, marks, ets2Countries ?? companyLookup().ets2Countries, year).find(o => o.stack?.isStack);
  return hit && hit.stack ? { title: hit.title, spec: hit.stack } : null;
}
