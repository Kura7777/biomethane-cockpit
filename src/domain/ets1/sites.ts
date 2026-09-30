import { getMarketById } from '../markets/registry';
import { MarksState } from '../netback/types';
import { Consignment } from '../consignment/types';
import { computeCertificateValue, ETS_NATURAL_GAS_TCO2_PER_MWH } from '../netback/engine';
import {
  ETS1_INSTALLATION_ROWS,
  ETS1_LATEST_YEAR,
  ETS1_PREVIOUS_YEAR,
  ETS1_SOURCE_URL,
} from './installationsData.generated';

export { ETS1_LATEST_YEAR, ETS1_PREVIOUS_YEAR, ETS1_SOURCE_URL };

/**
 * EU ETS1 industrial sites — every stationary installation with verified emissions in the
 * latest EUTL year, grouped by operator company.
 *
 * How biomethane helps: RED III-compliant biomethane, mass-balanced through the grid and
 * evidenced via the Union Database, is zero-rated in the site's emissions report, so each MWh
 * that replaces natural gas avoids 0.202 t of allowances (MRR 2018/2066 Annex VI).
 *
 * What the data cannot say: the EUTL does not split emissions by fuel. A site's verified total
 * includes coal, oil and process emissions, so gas use is never derived here. The sector and
 * biomethane-fit grouping below is a heuristic from NACE and activity codes, and says so.
 */

export type Ets1Sector =
  | 'FOOD_BEVERAGE'
  | 'PHARMA'
  | 'PAPER'
  | 'GLASS_CERAMICS'
  | 'CHEMICALS'
  | 'REFINING_OIL_GAS'
  | 'POWER_HEAT'
  | 'CEMENT_LIME'
  | 'METALS'
  | 'WASTE_ENERGY'
  | 'OTHER_INDUSTRY'
  | 'UNCLASSIFIED';

export type BiomethaneFit = 'HIGH' | 'MEDIUM' | 'LOW';

export const SECTOR_LABEL: Record<Ets1Sector, string> = {
  FOOD_BEVERAGE: 'Food & beverage',
  PHARMA: 'Pharmaceuticals',
  PAPER: 'Pulp & paper',
  GLASS_CERAMICS: 'Glass, ceramics & minerals',
  CHEMICALS: 'Chemicals',
  REFINING_OIL_GAS: 'Refining, oil & gas',
  POWER_HEAT: 'Power & district heat',
  CEMENT_LIME: 'Cement & lime',
  METALS: 'Metals',
  WASTE_ENERGY: 'Waste treatment & energy from waste',
  OTHER_INDUSTRY: 'Other industry & services',
  UNCLASSIFIED: 'Unclassified (no industry code)',
};

/**
 * Heuristic fit. Biomethane only replaces natural gas that a site actually burns for heat or
 * steam, so the question per site is "how much of its verified tonnage is gas combustion?".
 * The EUTL does not say, so this is a sector-level guess, refined by the site name:
 *
 * - HIGH: gas mostly feeds process heat or steam (food, pharma, paper, glass, light industry).
 * - MEDIUM: gas is significant but competes with other fuels or feedstock use (chemicals,
 *   refining), or a power / heat plant whose own name says it burns gas (see resolveFit).
 * - LOW: emissions are mostly process CO2 or solid fuel (cement, lime, integrated iron & steel,
 *   other metals), waste incineration, and power & heat by default. Power and heat is 2/3 of
 *   all ETS1 tonnage and most of it is coal, lignite and biomass; counting it as fit made the
 *   ranking a list of coal utilities. It is MEDIUM only on explicit gas evidence in the name,
 *   so gas plants with neutral names (e.g. "Kraftwerk Irsching") are understated. That is the
 *   deliberate direction of error: better to miss a gas plant than to pitch a lignite station.
 */
export const SECTOR_FIT: Record<Ets1Sector, BiomethaneFit> = {
  FOOD_BEVERAGE: 'HIGH',
  PHARMA: 'HIGH',
  PAPER: 'HIGH',
  GLASS_CERAMICS: 'HIGH',
  OTHER_INDUSTRY: 'HIGH',
  CHEMICALS: 'MEDIUM',
  REFINING_OIL_GAS: 'MEDIUM',
  // No industry code and no clue in the name: never graded high.
  UNCLASSIFIED: 'MEDIUM',
  // Mostly coal, lignite, biomass and waste heat; upgraded to MEDIUM only on gas evidence in the name.
  POWER_HEAT: 'LOW',
  CEMENT_LIME: 'LOW',
  METALS: 'LOW',
  // Incinerators burn waste, not gas: biomethane only displaces support firing.
  WASTE_ENERGY: 'LOW',
};

/** Name says the plant burns gas: CCGT / GuD / combined cycle, gas turbines, or "gas" / "gaz" / "Erdgas". */
const GAS_NAME = new RegExp(
  [
    '\\bgud\\b', 'ccgt', 'combined[- ]cycle', 'ciclos? combinados?', 'cicli? combinati?', 'cycle combin[eé]', 'turbogas',
    'gas[- ]?turbin', 'turbina a gas', 'gaskraft', 'gaskessel', 'erdgas', '(^|[^a-z])gas([^a-z]|$)', '(^|[^a-z])gaz([^a-z]|$)',
    'gasmotor', 'gasheiz',
  ].join('|'),
  'i'
);

/** Name says the plant burns coal or lignite. Overrides gas words (dual-fuel stations stay LOW). */
const COAL_NAME = new RegExp(
  [
    'braunkohle', 'steinkohle', 'kohle(kraft|werk)', '(^|[^a-z])kohle([^a-z]|$)', 'lignit', 'lignite', 'w[eę]gl', 'coal', 'carb[oó]n(?![a-z])',
    'uhl[ií]', 'hn[eě]d[eé]', 'carbone', 'carv[aã]o',
  ].join('|'),
  'i'
);

/** Integrated iron & steel and steel-named sites: process CO2 and coke / blast-furnace gas, not natural gas heat. */
const STEEL_NAME = /stahl|steel|acier|acciaio|siderurg|sider[uú]rgic|h[uü]tte|hutn|\bhuta\b|arcelor|voestalpine|salzgitter|thyssen|\bilva\b|ovako|gichtgas|hochofen|kokerei|blast[- ]furnace|coke[- ]oven/i;

/**
 * Site-level fit: the sector default, adjusted by name. Coal / lignite names and steel names are
 * LOW in the power and generic sectors; a power or heat site is MEDIUM only when its name (or
 * operator) shows gas. Heuristic — the EUTL has no fuel data.
 */
export function resolveFit(sector: Ets1Sector, name: string, operator: string): BiomethaneFit {
  const text = `${name} ${operator}`;
  if (sector === 'POWER_HEAT') {
    if (COAL_NAME.test(text) || STEEL_NAME.test(text)) return 'LOW';
    return GAS_NAME.test(text) ? 'MEDIUM' : 'LOW';
  }
  if ((sector === 'OTHER_INDUSTRY' || sector === 'UNCLASSIFIED') && STEEL_NAME.test(text)) return 'LOW';
  return SECTOR_FIT[sector];
}

// EUTL activity codes (Annex I, 2013+ numbering, and 2005–12 numbering).
const CEMENT_LIME_ACTIVITIES = new Set([29, 30, 6]);
const METAL_ACTIVITIES = new Set([22, 23, 24, 25, 26, 27, 28, 3, 4, 5]);
const REFINING_ACTIVITIES = new Set([21, 2]);
const CHEMICAL_ACTIVITIES = new Set([37, 38, 39, 40, 41, 42, 43, 44]);
const PAPER_ACTIVITIES = new Set([35, 36, 9]);
const GLASS_CERAMIC_ACTIVITIES = new Set([31, 32, 33, 34, 7, 8]);

export function classifySector(activityId: number | null, nace: string): Ets1Sector {
  const division = nace.slice(0, 2);
  const act = activityId ?? -1;
  if (CEMENT_LIME_ACTIVITIES.has(act) || nace.startsWith('23.51') || nace.startsWith('23.52')) return 'CEMENT_LIME';
  if (METAL_ACTIVITIES.has(act) || division === '24') return 'METALS';
  if (division === '10' || division === '11' || division === '12') return 'FOOD_BEVERAGE';
  if (division === '21') return 'PHARMA';
  // Gas pipelines (49.5) and oil / LNG terminals and storage (52.1, 52.2) are oil & gas infrastructure.
  if (REFINING_ACTIVITIES.has(act) || division === '19' || division === '06' || division === '09' || nace.startsWith('49.5') || nace.startsWith('52.1') || nace.startsWith('52.2')) return 'REFINING_OIL_GAS';
  if (division === '38') return 'WASTE_ENERGY';
  if (PAPER_ACTIVITIES.has(act) || division === '17') return 'PAPER';
  if (GLASS_CERAMIC_ACTIVITIES.has(act) || division === '23') return 'GLASS_CERAMICS';
  if (CHEMICAL_ACTIVITIES.has(act) || division === '20') return 'CHEMICALS';
  if (division === '35') return 'POWER_HEAT';
  return 'OTHER_INDUSTRY';
}

export interface Ets1Site {
  id: string;
  name: string;
  operator: string;
  parentCompany: string | null;
  country: string;
  city: string;
  activityId: number | null;
  nace: string;
  sector: Ets1Sector;
  /** How the sector was found: the site's own NACE code, the operator's other sites, the site name, or not at all. */
  sectorBasis: SectorBasis;
  fit: BiomethaneFit;
  verifiedLatestTco2: number;
  verifiedPreviousTco2: number | null;
  /**
   * Free allowances allocated for ETS1_LATEST_YEAR, in tCO2e: Art 10a(1) allocation plus the
   * new-entrant reserve (Art 10a(7)), from the Commission's verified-emissions workbook. Null when
   * the registry shows no figure (n/a): unknown, not zero. Zero means none allocated.
   */
  freeAllocLatestTco2: number | null;
  /**
   * True when the registry extract had no ETS1_LATEST_YEAR figure for this open installation yet
   * (national verification uploads lag; mostly PL, DK, FR, BG), so verifiedLatestTco2 is the
   * ETS1_PREVIOUS_YEAR value and verifiedPreviousTco2 the year before that. False otherwise.
   */
  verifiedLatestIsPriorYear: boolean;
}

/**
 * The EUTL parent-company field sometimes holds a placeholder ("xx", "n.a.", "/", "0") or a
 * commercial-register number ("HRB 74963", "RO 1860712", "34853 f") rather than a name. Grouping
 * on it would lump unrelated operators into one fake company, so such a parent counts as no parent
 * and the site falls back to its operator. A parent that is at most two Latin letters/digits once
 * punctuation is removed is a placeholder; so is anything that starts with a German register
 * prefix (HRA / HRB followed by a number), and anything made mostly of digits (at least five, and
 * at least half of its letters and digits). Names in other scripts (Greek, Korean) are real.
 */
export function isPlaceholderParent(parent: string): boolean {
  const core = parent.replace(/[^\p{L}\p{N}]/gu, '');
  if (core.length <= 2 && /^[A-Za-z0-9]*$/.test(core)) return true;
  if (/^\s*(hrb|hra)\s*[-.:]?\s*\d/i.test(parent)) return true;
  const digits = (core.match(/\p{N}/gu) ?? []).length;
  return digits >= 5 && digits * 2 >= core.length;
}

/**
 * Display clean-up for a company name before grouping: drops a trailing registration number
 * (Swedish "556040-6034", German "HRB 5802 Amtsgericht Hannover") and a trailing postal address
 * after " / ". The name itself is otherwise left as the registry has it.
 */
export function cleanCompanyName(name: string): string {
  return name
    .replace(/\s*[,;(]?\s*\b(hr[ab]|amtsgericht)\b.*$/i, '')
    .replace(/\s*,?\s*\(?\b\d{6}[- ]\d{4}\)?\s*$/, '')
    .replace(/\s+\/\s+\d.*$/, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export type SectorBasis = 'SITE_CODE' | 'OPERATOR_CODE' | 'SITE_NAME' | 'NONE';

/**
 * Power and heat plants named in the registry's languages. Used only when a site has no NACE code
 * and a generic combustion activity, where the classifier would otherwise call it "other industry".
 */
const POWER_HEAT_NAME = new RegExp(
  [
    'elektrowni', 'elektrociep', 'ciep[lł]owni', 'kraftwerk', 'heizwerk', 'kraftw[aä]rme', '\\bkwk\\b', '\\bbhkw\\b',
    'centrale [eé]lectrique', 'centrale thermique', 'centrale termoelettrica', 'termoelettric', 'central t[eé]rmica',
    'ciclo combinado', 'cogenera', 'teplárn', 'tepl[aá]re[nň]', 'elektr[aá]r', 'power station', 'power plant',
    '\\bchp\\b', 'fjernvarme', 'fj[aä]rrv[aä]rme', 'kaukol[aä]mp', 'voimalaito', 'l[aä]mp[oö]keskus', 'v[aä]rmeverk',
    'kraftv[aä]rmeverk', 'warmtekracht', 'thermal power', 'district heat',
    '\\bgud\\b', 'termoficare', 'er[őo]m[űu]', 'kombin[aá]lt ciklus', 'kogenerac', 'j[eė]gain', '\\bpower\\b',
  ].join('|'),
  'i'
);

type RawRow = (typeof ETS1_INSTALLATION_ROWS)[number];

/** For each operator, the sector carrying most emissions among its sites that do have a NACE code. */
function operatorSectors(rows: readonly RawRow[]): Map<string, Ets1Sector> {
  const byOperator = new Map<string, Map<Ets1Sector, number>>();
  for (const [, , operator, , , , activityId, nace, latest] of rows) {
    if (!nace) continue;
    const sector = classifySector(activityId, nace);
    const m = byOperator.get(operator) ?? new Map<Ets1Sector, number>();
    m.set(sector, (m.get(sector) ?? 0) + latest);
    byOperator.set(operator, m);
  }
  const out = new Map<string, Ets1Sector>();
  for (const [operator, m] of byOperator) {
    const best = [...m.entries()].sort((a, b) => b[1] - a[1])[0];
    if (best) out.set(operator, best[0]);
  }
  return out;
}

const OPERATOR_SECTOR = operatorSectors(ETS1_INSTALLATION_ROWS);

/**
 * Sector for one site. The site's own codes win; when it has no NACE code and only a generic
 * combustion activity, the operator's other sites decide, then the site name, else it is left
 * unclassified rather than guessed as "other industry" (which would grade it a high fit).
 */
export function resolveSector(activityId: number | null, nace: string, operator: string, name: string): { sector: Ets1Sector; basis: SectorBasis } {
  const own = classifySector(activityId, nace);
  if (nace || own !== 'OTHER_INDUSTRY') return { sector: own, basis: 'SITE_CODE' };
  const inherited = OPERATOR_SECTOR.get(operator);
  if (inherited) return { sector: inherited, basis: 'OPERATOR_CODE' };
  if (POWER_HEAT_NAME.test(name) || POWER_HEAT_NAME.test(operator)) return { sector: 'POWER_HEAT', basis: 'SITE_NAME' };
  return { sector: 'UNCLASSIFIED', basis: 'NONE' };
}

export const ETS1_SITES: Ets1Site[] = ETS1_INSTALLATION_ROWS.map(
  ([id, name, operator, parent, country, city, activityId, nace, latest, previous, freeAlloc, priorYear]) => {
    const { sector, basis } = resolveSector(activityId, nace, operator, name);
    return {
      id,
      name,
      operator,
      parentCompany: parent && !isPlaceholderParent(parent) ? cleanCompanyName(parent) || null : null,
      country,
      city,
      activityId,
      nace,
      sector,
      sectorBasis: basis,
      fit: resolveFit(sector, name, operator),
      verifiedLatestTco2: latest,
      verifiedPreviousTco2: previous,
      freeAllocLatestTco2: freeAlloc,
      verifiedLatestIsPriorYear: priorYear === 1,
    };
  }
);

export interface Ets1Company {
  /** Grouping key: the normalised parent company where known, else the operator (see companyKey). */
  key: string;
  name: string;
  parentCompany: string | null;
  operators: string[];
  sites: Ets1Site[];
  countries: string[];
  sectors: Ets1Sector[];
  /** Best fit among its sites. */
  fit: BiomethaneFit;
  verifiedLatestTco2: number;
  /** Emissions at HIGH/MEDIUM-fit sites only — where biomethane can realistically replace gas. */
  fitVerifiedLatestTco2: number;
  /**
   * Free allowances allocated for ETS1_LATEST_YEAR across all sites, in tCO2e. Sites with no
   * registry figure are left out of the sum; null only when every site is unknown.
   * The sum is Art 10a(1) allocation plus the new-entrant reserve (see the generator): the
   * allowances the operator receives free against its own verified emissions.
   */
  freeAllocLatestTco2: number | null;
  /** The same sum over HIGH/MEDIUM-fit sites only. Null when none of those sites has a figure. */
  fitFreeAllocLatestTco2: number | null;
}

const FIT_RANK: Record<BiomethaneFit, number> = { HIGH: 3, MEDIUM: 2, LOW: 1 };

/**
 * Legal-form words dropped from the end of a name before comparing ("A2A S.p.A." = "A2A SPA" = "A2A").
 * Only trailing tokens are dropped, so a name never loses its identifying words.
 */
const LEGAL_FORM_TOKENS = new Set([
  'sa', 'spa', 'srl', 'ag', 'gmbh', 'kg', 'co', 'se', 'bv', 'nv', 'ab', 'oy', 'oyj', 'as', 'asa', 'aps', 'ltd', 'limited',
  'llc', 'sas', 'sarl', 'plc', 'sl', 'slu', 'sau', 'sp', 'z', 'zoo', 'oo', 'sro', 'doo', 'dd', 'ad', 'ead', 'ood',
  'and', 'und', 'et', 'inc', 'corp', 'aktiengesellschaft', 'aktiebolag', 'ltda', 'unipessoal',
]);

/** Accent-, case-, punctuation- and legal-form-insensitive comparison key for a company name. */
export function companyKey(name: string): string {
  const base = cleanCompanyName(name)
    .replace(/\([^)]*\)/g, ' ')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/\./g, '');
  const tokens = base.split(/[^\p{L}\p{N}]+/u).filter(Boolean);
  while (tokens.length > 1 && LEGAL_FORM_TOKENS.has(tokens[tokens.length - 1])) tokens.pop();
  return tokens.join(' ');
}

/**
 * Names made of a generic municipal or utility term. Many unrelated local companies share them
 * ("Przedsiębiorstwo Energetyki Cieplnej" exists in dozens of Polish towns), so these are grouped by
 * exact spelling within a country only, never by normalised name.
 */
const GENERIC_NAME = /energetyki cieplnej|stadtwerke|stadtwerk|przedsiebiorstwo|miejsk|zaklad|gemeinde|municipal|ayuntamiento|comune di|kommune|kaupunki|teplarn|tepelne|termoficare|district heating|fernwaerme|fernwarme|fjernvarme/;

/** "ELECTRICITE DE FRANCE (EDF)" gives the acronym "edf"; only short all-capital tags count. */
function parentheticalAcronym(name: string): string | null {
  const m = name.match(/\(([A-Z0-9]{2,8})\)\s*$/);
  return m ? m[1].toLowerCase() : null;
}

/**
 * Groups sites into companies: the parent company where the registry names a real one, else the
 * operator. Names that differ only by case, accents, punctuation or legal form ("Enel S.p.A." /
 * "ENEL SPA") share a key, and a bare acronym joins the one full name that carries it in
 * brackets ("EDF" with "ELECTRICITE DE FRANCE (EDF)") — provided exactly one full name does.
 * Anything looser (shared first word, similar spelling) is deliberately not merged: two genuinely
 * different companies must never be combined. Generic names ("Przedsiębiorstwo Energetyki
 * Cieplnej", "Stadtwerke") belong to different municipal companies in different places, so a
 * spelling variant with no registry parent only merges within its own country, or into a group
 * whose registry-declared parent name is the same and already operates in that country.
 */
export function groupSitesByCompany(sites: Ets1Site[]): Ets1Company[] {
  const rawName = (s: Ets1Site) => cleanCompanyName(s.parentCompany ?? s.operator);

  const acronymTargets = new Map<string, Set<string>>();
  for (const s of sites) {
    const raw = rawName(s);
    const acr = parentheticalAcronym(raw);
    if (!acr) continue;
    const set = acronymTargets.get(acr) ?? new Set<string>();
    set.add(companyKey(raw));
    acronymTargets.set(acr, set);
  }
  const resolveKey = (raw: string): string => {
    const key = companyKey(raw);
    const targets = acronymTargets.get(key);
    return targets && targets.size === 1 && !targets.has(key) ? [...targets][0] : key;
  };

  const parentCountries = new Map<string, Set<string>>();
  for (const s of sites) {
    if (!s.parentCompany) continue;
    const k = resolveKey(rawName(s));
    const set = parentCountries.get(k) ?? new Set<string>();
    set.add(s.country);
    parentCountries.set(k, set);
  }
  const groupKey = (s: Ets1Site): string => {
    const raw = rawName(s);
    // Generic municipal names are shared by unrelated local companies: exact spelling only.
    if (GENERIC_NAME.test(companyKey(raw))) return `${raw.toLowerCase()}|${s.country}`;
    const k = resolveKey(raw);
    return s.parentCompany || parentCountries.get(k)?.has(s.country) ? k : `${k}|${s.country}`;
  };

  const map = new Map<string, Ets1Company>();
  const nameEmissions = new Map<string, Map<string, number>>();
  const parentEmissions = new Map<string, Map<string, number>>();
  const known = new Map<string, { all: boolean; fit: boolean }>();
  const bump = (m: Map<string, Map<string, number>>, key: string, name: string, t: number) => {
    const inner = m.get(key) ?? new Map<string, number>();
    inner.set(name, (inner.get(name) ?? 0) + t);
    m.set(key, inner);
  };
  const top = (m: Map<string, number> | undefined) => (m ? [...m.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null : null);

  for (const s of sites) {
    const raw = rawName(s);
    const key = groupKey(s);
    let c = map.get(key);
    if (!c) {
      c = {
        key,
        name: raw,
        parentCompany: null,
        operators: [],
        sites: [],
        countries: [],
        sectors: [],
        fit: s.fit,
        verifiedLatestTco2: 0,
        fitVerifiedLatestTco2: 0,
        freeAllocLatestTco2: null,
        fitFreeAllocLatestTco2: null,
      };
      map.set(key, c);
      known.set(key, { all: false, fit: false });
    }
    c.sites.push(s);
    if (!c.operators.includes(s.operator)) c.operators.push(s.operator);
    if (!c.countries.includes(s.country)) c.countries.push(s.country);
    if (!c.sectors.includes(s.sector)) c.sectors.push(s.sector);
    if (FIT_RANK[s.fit] > FIT_RANK[c.fit]) c.fit = s.fit;
    c.verifiedLatestTco2 += s.verifiedLatestTco2;
    bump(nameEmissions, key, raw, s.verifiedLatestTco2);
    if (s.parentCompany) bump(parentEmissions, key, cleanCompanyName(s.parentCompany), s.verifiedLatestTco2);
    const isFit = s.fit !== 'LOW';
    if (isFit) c.fitVerifiedLatestTco2 += s.verifiedLatestTco2;
    if (s.freeAllocLatestTco2 !== null) {
      c.freeAllocLatestTco2 = (c.freeAllocLatestTco2 ?? 0) + s.freeAllocLatestTco2;
      known.get(key)!.all = true;
      if (isFit) c.fitFreeAllocLatestTco2 = (c.fitFreeAllocLatestTco2 ?? 0) + s.freeAllocLatestTco2;
    }
  }
  // Display name: the spelling carrying most emissions (the bracketed-acronym form wins a tie).
  for (const c of map.values()) {
    c.name = top(nameEmissions.get(c.key)) ?? c.name;
    c.parentCompany = top(parentEmissions.get(c.key));
  }
  return [...map.values()].sort((a, b) => b.verifiedLatestTco2 - a.verifiedLatestTco2);
}

/**
 * Avoided allowance value of one NCV MWh of zero-rated biomethane at an installation, from the
 * EU_ETS1 desk mark via computeCertificateValue (the single pricing authority). Null without a mark.
 */
export function ets1AvoidedValuePerMWh(marks: MarksState): number | null {
  const market = getMarketById('EU_ETS1');
  if (!market) return null;
  const consignment: Consignment = {
    id: 'ets1-site',
    name: 'ETS1 site',
    originCountry: 'EU',
    originCountryName: 'European Union',
    feedstock: 'manure',
    feedstockName: 'Manure',
    annexClassification: 'IX_A',
    carbonIntensity: 0,
    commissioningDateRange: 'POST_2021_TO_2025',
    certificationScheme: 'ISCC_EU',
    chainOfCustody: 'MASS_BALANCE',
    injectionCountry: 'EU',
    injectionIsEU: true,
    udbStatus: 'RECORDED',
    posStatus: 'ISSUED',
    volumeMWh: null,
  };
  return computeCertificateValue(market, consignment, marks, 'mid')?.valueEurPerMWh ?? null;
}

/**
 * NCV MWh of biomethane needed to cut a given tonnage of emissions, assuming it replaces
 * natural gas the site actually burns (only meaningful at HIGH/MEDIUM-fit sites).
 */
export function biomethaneMWhToAbate(tco2: number): number {
  return tco2 / ETS_NATURAL_GAS_TCO2_PER_MWH;
}
