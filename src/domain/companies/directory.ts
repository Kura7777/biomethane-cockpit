import { FUEL_EU_SHIPPING_GROUPS, FuelEuShippingGroup } from '../fueleu/groups';
import { FUEL_EU_SHIPPING_COUNTERPARTIES } from '../fueleu/shippingTargetsData';
import { ETS1_SITES, groupSitesByCompany, Ets1Company } from '../ets1/sites';
import { ETS2_SEED_COMPANIES, CLEAN_HEAT_PROGRAM_LEADS, Ets2Company } from '../ets2/companies';
import { normalizeCompanyName, leadingToken } from './normalize';

/**
 * One directory of every company the desk knows, with its exposure in each market:
 *   - FuelEU Maritime: shipping groups from EU MRV (3,400+),
 *   - EU ETS1: installation operators / parent groups from the EUTL (4,700+),
 *   - EU ETS2: gas suppliers (regulated entities) and exposed end users from desk research.
 *
 * Records merge automatically only on an identical normalised name (or an ETS1 operator alias).
 * Anything looser is offered as a suggestion; the trader confirms links, which are passed in.
 */

export type MarketKey = 'FUELEU' | 'ETS1' | 'ETS2';

export const MARKET_LABEL: Record<MarketKey, string> = {
  FUELEU: 'FuelEU Maritime',
  ETS1: 'EU ETS1 sites',
  ETS2: 'EU ETS2',
};

export interface FuelEuExposure {
  group: FuelEuShippingGroup;
  /** Sum of member deficits only (negative balances), tCO₂e, 2026 estimate. */
  deficit2026Tco2e: number;
  penalty2026Eur: number;
  /** −100 gCO₂e/MJ bio-LNG that would close the members' 2026 deficits, MWh. */
  bioLngToCloseMWh: number;
  etsCo2Tco2: number;
}

export interface CompanyProfile {
  /** Stable id: the normalised name of the first record that created it. */
  id: string;
  name: string;
  /** Every name the company appears under across datasets. */
  names: string[];
  countries: string[];
  fueleu: FuelEuExposure[];
  ets1: Ets1Company[];
  ets2: Ets2Company[];
  markets: MarketKey[];
}

interface SourceRecord {
  name: string;
  aliases: string[];
  countries: string[];
  add: (p: CompanyProfile) => void;
}

function fuelEuRecords(): SourceRecord[] {
  const byGroup = new Map<string, { deficit: number; bioLng: number }>();
  for (const c of FUEL_EU_SHIPPING_COUNTERPARTIES) {
    const agg = byGroup.get(c.group_id) ?? { deficit: 0, bioLng: 0 };
    if (c.compliance_balance_2026_tco2e < 0) {
      agg.deficit += -c.compliance_balance_2026_tco2e;
      agg.bioLng += c.bio_lng_required_neg100_mwh;
    }
    byGroup.set(c.group_id, agg);
  }
  return FUEL_EU_SHIPPING_GROUPS.map(group => {
    const agg = byGroup.get(group.id) ?? { deficit: 0, bioLng: 0 };
    const exposure: FuelEuExposure = {
      group,
      deficit2026Tco2e: agg.deficit,
      penalty2026Eur: group.sumOfCompanyPenalties2026,
      bioLngToCloseMWh: agg.bioLng,
      etsCo2Tco2: group.inScopeCo2Tco2e,
    };
    return { name: group.name, aliases: [], countries: [], add: p => p.fueleu.push(exposure) };
  });
}

function ets1Records(): SourceRecord[] {
  return groupSitesByCompany(ETS1_SITES).map(c => ({
    name: c.name,
    aliases: c.operators,
    countries: c.countries,
    add: p => p.ets1.push(c),
  }));
}

function ets2Records(): SourceRecord[] {
  return [...ETS2_SEED_COMPANIES, ...CLEAN_HEAT_PROGRAM_LEADS].map(c => ({
    name: c.name,
    aliases: [],
    countries: [c.countryIso],
    add: p => p.ets2.push(c),
  }));
}

/** Union-find over profile ids, for trader-confirmed links. */
function makeUnion(ids: string[]) {
  const parent = new Map(ids.map(id => [id, id]));
  const find = (x: string): string => {
    let r = x;
    while (parent.get(r) !== r) r = parent.get(r) as string;
    parent.set(x, r);
    return r;
  };
  return {
    find,
    union: (a: string, b: string) => {
      if (!parent.has(a) || !parent.has(b)) return;
      const ra = find(a);
      const rb = find(b);
      if (ra !== rb) parent.set(rb, ra);
    },
  };
}

export interface CompanyLink {
  a: string;
  b: string;
}

/**
 * Builds the directory. `links` are trader-confirmed pairs of profile ids to treat as one company.
 */
export function buildCompanyDirectory(links: CompanyLink[] = []): CompanyProfile[] {
  const profiles = new Map<string, CompanyProfile>();
  const aliasIndex = new Map<string, string>();

  const place = (rec: SourceRecord) => {
    // A record whose name is only punctuation (the EUTL has a parent called "/") is keyed on its first alias.
    const name = [rec.name, ...rec.aliases].find(n => normalizeCompanyName(n) !== '') ?? '';
    const key = normalizeCompanyName(name);
    if (!key) return;
    const target = aliasIndex.get(key) ?? key;
    let p = profiles.get(target);
    if (!p) {
      p = { id: target, name, names: [], countries: [], fueleu: [], ets1: [], ets2: [], markets: [] };
      profiles.set(target, p);
    }
    for (const n of [rec.name, ...rec.aliases]) {
      if (n && !p.names.includes(n)) p.names.push(n);
      const nk = normalizeCompanyName(n);
      if (nk && !aliasIndex.has(nk)) aliasIndex.set(nk, target);
    }
    for (const c of rec.countries) if (c && !p.countries.includes(c)) p.countries.push(c);
    rec.add(p);
  };

  // ETS1 first, so its operator names become aliases the other datasets can match onto.
  for (const r of ets1Records()) place(r);
  for (const r of fuelEuRecords()) place(r);
  for (const r of ets2Records()) place(r);

  // Apply trader-confirmed links.
  const ids = [...profiles.keys()];
  const uf = makeUnion(ids);
  for (const l of links) uf.union(l.a, l.b);
  const merged = new Map<string, CompanyProfile>();
  for (const id of ids) {
    const root = uf.find(id);
    const src = profiles.get(id) as CompanyProfile;
    const dst = merged.get(root);
    if (!dst) {
      merged.set(root, { ...src, id: root, names: [...src.names], countries: [...src.countries], fueleu: [...src.fueleu], ets1: [...src.ets1], ets2: [...src.ets2] });
      continue;
    }
    for (const n of src.names) if (!dst.names.includes(n)) dst.names.push(n);
    for (const c of src.countries) if (!dst.countries.includes(c)) dst.countries.push(c);
    dst.fueleu.push(...src.fueleu);
    dst.ets1.push(...src.ets1);
    dst.ets2.push(...src.ets2);
  }

  const out = [...merged.values()];
  for (const p of out) {
    p.markets = [
      ...(p.fueleu.length ? (['FUELEU'] as MarketKey[]) : []),
      ...(p.ets1.length ? (['ETS1'] as MarketKey[]) : []),
      ...(p.ets2.length ? (['ETS2'] as MarketKey[]) : []),
    ];
  }
  return out;
}

/**
 * Other profiles that share the first distinctive word of the name — candidates the trader may
 * link (e.g. "ENGIE (France)" and "ENGIE Electrabel (Belgium)"). Never merged automatically.
 */
export function suggestRelated(profile: CompanyProfile, all: CompanyProfile[], limit = 8): CompanyProfile[] {
  const tokens = new Set(profile.names.map(leadingToken).filter((t): t is string => t !== null));
  if (tokens.size === 0) return [];
  return all
    .filter(p => p.id !== profile.id && p.names.some(n => {
      const t = leadingToken(n);
      return t !== null && tokens.has(t);
    }))
    .slice(0, limit);
}
