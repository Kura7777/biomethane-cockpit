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

/** One key per regulation a company can be exposed to. */
export type MarketKey = 'FUELEU' | 'ETS_MARITIME' | 'ETS1' | 'ETS2';

export const MARKET_KEYS: MarketKey[] = ['FUELEU', 'ETS_MARITIME', 'ETS1', 'ETS2'];

export const MARKET_LABEL: Record<MarketKey, string> = {
  FUELEU: 'FuelEU Maritime',
  ETS_MARITIME: 'EU ETS maritime',
  ETS1: 'EU ETS1 installations',
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
  /**
   * Stable id. Unlinked: the normalised name of the first record that created it. Linked: the
   * lexicographically smallest id among the merged profiles, so it never depends on link order.
   */
  id: string;
  /** Every pre-link profile id merged into this one (including its own), sorted. */
  memberIds: string[];
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

/** The ETS2 companies the desk knows before any trader import. */
export const DEFAULT_ETS2_COMPANIES: Ets2Company[] = [...ETS2_SEED_COMPANIES, ...CLEAN_HEAT_PROGRAM_LEADS];

function ets2Records(companies: Ets2Company[]): SourceRecord[] {
  return companies.map(c => ({
    name: c.name,
    aliases: [],
    countries: [c.countryIso],
    add: p => p.ets2.push(c),
  }));
}

/** Union-find over strings; the root is always the smallest member, so results never depend on call order. */
function makeUnion() {
  const parent = new Map<string, string>();
  const find = (x: string): string => {
    let r = x;
    while (parent.has(r) && parent.get(r) !== r) r = parent.get(r) as string;
    let c = x;
    while (c !== r) {
      const next = parent.get(c) as string;
      parent.set(c, r);
      c = next;
    }
    return r;
  };
  return {
    find,
    has: (x: string) => parent.has(x),
    add: (x: string) => { if (!parent.has(x)) parent.set(x, x); },
    union: (a: string, b: string) => {
      if (!parent.has(a)) parent.set(a, a);
      if (!parent.has(b)) parent.set(b, b);
      const ra = find(a);
      const rb = find(b);
      if (ra === rb) return;
      if (ra < rb) parent.set(rb, ra);
      else parent.set(ra, rb);
    },
  };
}

export interface CompanyLink {
  a: string;
  b: string;
}

interface Prepared {
  rec: SourceRecord;
  name: string;
  key: string;
}

/**
 * Groups records that are the same company by name, independent of processing order. An ETS1
 * operator name merges into the group that lists it. If another record already carries that name, the
 * two merge only when one group lists it and it shares the group's brand (first word); a name listed
 * by several groups is ambiguous and merges nothing. Returns the group structure for the record keys.
 */
function groupByName(items: Prepared[]) {
  const uf = makeUnion();
  const ownKeys = new Set(items.map(i => i.key));
  const claims = new Map<string, Set<string>>();
  for (const it of items) {
    uf.add(it.key);
    for (const n of it.rec.aliases) {
      const k = normalizeCompanyName(n);
      if (!k || k === it.key) continue;
      if (!claims.has(k)) claims.set(k, new Set());
      (claims.get(k) as Set<string>).add(it.key);
    }
  }
  const brand = (k: string) => k.split(' ')[0];
  for (const [alias, owners] of claims) {
    const sorted = [...owners].sort();
    if (!ownKeys.has(alias)) {
      // Only a name: it belongs to the (smallest) group that lists it.
      uf.union(sorted[0], alias);
    } else if (sorted.length === 1 && brand(sorted[0]) === brand(alias)) {
      // A company of its own that one group lists as an operator under the same brand
      // ("ThyssenKrupp Steel Europe" under "thyssenkrupp"): one row. A different brand
      // ("E.ON" listed by a small utility) is left alone rather than swallowed.
      uf.union(sorted[0], alias);
    }
  }
  return uf;
}

/**
 * Builds the directory. `links` are trader-confirmed pairs of profile ids to treat as one company;
 * `ets2Companies` defaults to the seed research and may include the trader's own imports.
 */
export function buildCompanyDirectory(links: CompanyLink[] = [], ets2Companies: Ets2Company[] = DEFAULT_ETS2_COMPANIES): CompanyProfile[] {
  // ETS1 first, so its operator names become aliases the other datasets can match onto.
  const items: Prepared[] = [...ets1Records(), ...fuelEuRecords(), ...ets2Records(ets2Companies)].flatMap(rec => {
    // A record whose name is only punctuation (the EUTL has a parent called "/") is keyed on its first alias.
    const name = [rec.name, ...rec.aliases].find(n => normalizeCompanyName(n) !== '') ?? '';
    const key = normalizeCompanyName(name);
    return key ? [{ rec, name, key }] : [];
  });
  const groups = groupByName(items);

  // A group is named and identified by its first record in placement order (ETS1 by emissions, then
  // FuelEU, then ETS2): fixed by the data, never by which links the trader has made.
  const base = new Map<string, CompanyProfile>();
  for (const { rec, name, key } of items) {
    const root = groups.find(key);
    let p = base.get(root);
    if (!p) {
      p = { id: key, memberIds: [key], name, names: [], countries: [], fueleu: [], ets1: [], ets2: [], markets: [] };
      base.set(root, p);
    }
    for (const n of [rec.name, ...rec.aliases]) if (n && !p.names.includes(n)) p.names.push(n);
    for (const c of rec.countries) if (c && !p.countries.includes(c)) p.countries.push(c);
    rec.add(p);
  }

  // Apply trader-confirmed links: the merged profile's id is the smallest member id.
  const profiles = [...base.values()];
  const byId = new Map(profiles.map(p => [p.id, p]));
  const linkUf = makeUnion();
  for (const p of profiles) linkUf.add(p.id);
  for (const l of links) if (byId.has(l.a) && byId.has(l.b)) linkUf.union(l.a, l.b);
  const members = new Map<string, CompanyProfile[]>();
  for (const p of profiles) {
    const root = linkUf.find(p.id);
    if (!members.has(root)) members.set(root, []);
    (members.get(root) as CompanyProfile[]).push(p);
  }
  const out: CompanyProfile[] = [];
  for (const [root, group] of members) {
    if (group.length === 1) {
      out.push(group[0]);
      continue;
    }
    group.sort((x, y) => (x.id < y.id ? -1 : x.id > y.id ? 1 : 0));
    const head = group[0]; // its id is the root
    const merged: CompanyProfile = { ...head, id: root, memberIds: group.map(g => g.id), names: [], countries: [], fueleu: [], ets1: [], ets2: [] };
    for (const g of group) {
      for (const n of g.names) if (!merged.names.includes(n)) merged.names.push(n);
      for (const c of g.countries) if (!merged.countries.includes(c)) merged.countries.push(c);
      merged.fueleu.push(...g.fueleu);
      merged.ets1.push(...g.ets1);
      merged.ets2.push(...g.ets2);
    }
    out.push(merged);
  }

  for (const p of out) {
    // Ships reporting under EU MRV with CO₂ in ETS scope face both FuelEU and EU ETS maritime.
    const present: Record<MarketKey, boolean> = {
      FUELEU: p.fueleu.length > 0,
      ETS_MARITIME: p.fueleu.some(f => f.etsCo2Tco2 > 0),
      ETS1: p.ets1.length > 0,
      ETS2: p.ets2.length > 0,
    };
    p.markets = MARKET_KEYS.filter(k => present[k]);
  }
  return out;
}

/** The three sectors a company can sit in: FuelEU and EU ETS maritime are one (shipping). */
export type SectorKey = 'SHIPPING' | 'ETS1' | 'ETS2';

export const SECTOR_KEYS: SectorKey[] = ['SHIPPING', 'ETS1', 'ETS2'];

export const SECTOR_NAME: Record<SectorKey, string> = {
  SHIPPING: 'Shipping',
  ETS1: 'ETS1 installations',
  ETS2: 'ETS2',
};

export function sectorsOf(p: Pick<CompanyProfile, 'markets'>): SectorKey[] {
  return SECTOR_KEYS.filter(s => (s === 'SHIPPING' ? p.markets.includes('FUELEU') || p.markets.includes('ETS_MARITIME') : p.markets.includes(s)));
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
