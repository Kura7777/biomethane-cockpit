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
  | 'OTHER_INDUSTRY';

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
  OTHER_INDUSTRY: 'Other industry & services',
};

/**
 * Heuristic fit: HIGH where gas mostly feeds process heat or steam (food, pharma, paper, glass,
 * light industry); MEDIUM where gas is significant but competes with other fuels or feedstock use
 * (chemicals, power & heat, refining); LOW where emissions are mostly process CO₂ or coal
 * (cement, lime, metals).
 */
export const SECTOR_FIT: Record<Ets1Sector, BiomethaneFit> = {
  FOOD_BEVERAGE: 'HIGH',
  PHARMA: 'HIGH',
  PAPER: 'HIGH',
  GLASS_CERAMICS: 'HIGH',
  OTHER_INDUSTRY: 'HIGH',
  CHEMICALS: 'MEDIUM',
  POWER_HEAT: 'MEDIUM',
  REFINING_OIL_GAS: 'MEDIUM',
  CEMENT_LIME: 'LOW',
  METALS: 'LOW',
};

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
  if (REFINING_ACTIVITIES.has(act) || division === '19' || division === '06' || division === '09') return 'REFINING_OIL_GAS';
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
  fit: BiomethaneFit;
  verifiedLatestTco2: number;
  verifiedPreviousTco2: number | null;
}

/**
 * The EUTL parent-company field sometimes holds a placeholder ("xx", "n.a.", "/", "0") rather than
 * a name. Grouping on it would lump unrelated operators into one fake company, so a parent that is
 * at most two Latin letters/digits once punctuation is removed counts as no parent. Names in other
 * scripts (Greek, Korean) are real and kept.
 */
export function isPlaceholderParent(parent: string): boolean {
  const core = parent.replace(/[^\p{L}\p{N}]/gu, '');
  return core.length <= 2 && /^[A-Za-z0-9]*$/.test(core);
}

export const ETS1_SITES: Ets1Site[] = ETS1_INSTALLATION_ROWS.map(
  ([id, name, operator, parent, country, city, activityId, nace, latest, previous]) => {
    const sector = classifySector(activityId, nace);
    return {
      id,
      name,
      operator,
      parentCompany: parent && !isPlaceholderParent(parent) ? parent : null,
      country,
      city,
      activityId,
      nace,
      sector,
      fit: SECTOR_FIT[sector],
      verifiedLatestTco2: latest,
      verifiedPreviousTco2: previous,
    };
  }
);

export interface Ets1Company {
  /** Grouping key: parent company where known, else the operator. */
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
}

const FIT_RANK: Record<BiomethaneFit, number> = { HIGH: 3, MEDIUM: 2, LOW: 1 };

export function groupSitesByCompany(sites: Ets1Site[]): Ets1Company[] {
  const map = new Map<string, Ets1Company>();
  for (const s of sites) {
    const key = (s.parentCompany ?? s.operator).trim().toLowerCase();
    let c = map.get(key);
    if (!c) {
      c = {
        key,
        name: s.parentCompany ?? s.operator,
        parentCompany: s.parentCompany,
        operators: [],
        sites: [],
        countries: [],
        sectors: [],
        fit: s.fit,
        verifiedLatestTco2: 0,
        fitVerifiedLatestTco2: 0,
      };
      map.set(key, c);
    }
    c.sites.push(s);
    if (!c.operators.includes(s.operator)) c.operators.push(s.operator);
    if (!c.countries.includes(s.country)) c.countries.push(s.country);
    if (!c.sectors.includes(s.sector)) c.sectors.push(s.sector);
    if (FIT_RANK[s.fit] > FIT_RANK[c.fit]) c.fit = s.fit;
    c.verifiedLatestTco2 += s.verifiedLatestTco2;
    if (s.fit !== 'LOW') c.fitVerifiedLatestTco2 += s.verifiedLatestTco2;
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
