import { ETS_NATURAL_GAS_TCO2_PER_MWH } from '../netback/engine';
import { toNcvMWh, GasVolumeBasis } from './calculator';
import { Ets2CountryProfile } from './countries';
import { ETS2_SUPPLIER_RESEARCH, DEHST_NEHS_COMPLIANCE_LIST } from './supplierResearch';

/**
 * ETS2 company directory — who is exposed, per company and country.
 *
 * Under ETS2 the regulated entity is the fuel supplier that releases gas for consumption
 * (Directive 2003/87/EC Art. 3(ae), as amended by 2023/959). Suppliers buy allowances and pass
 * the cost on, so they are the first buyers of zero-rated biomethane; their commercial and
 * small-industry customers are the second.
 *
 * Every company here carries at least one source. Market shares are only filled where a regulator
 * report (or a report quoting one) states them. Rows can be added by importing JSON.
 */

export type Ets2CompanyRole = 'REGULATED_SUPPLIER' | 'EXPOSED_END_USER';
export type Ets2EvidenceType = 'PERMIT_REGISTER' | 'NATIONAL_ETS_REGISTER' | 'REGULATOR_MARKET_REPORT' | 'COMPANY_DISCLOSURE' | 'SECONDARY_SOURCE';
export type Ets2Confidence = 'HIGH' | 'MEDIUM' | 'LOW';
export type Ets2ContactKind = 'SWITCHBOARD' | 'GENERAL_EMAIL' | 'B2B_SALES' | 'SUSTAINABILITY' | 'PRESS' | 'PERSON';

export interface Ets2Evidence {
  type: Ets2EvidenceType;
  url: string;
  /** What the source says, verbatim or closely summarised. */
  note: string;
  checkedAt: string;
}

export interface Ets2Contact {
  kind: Ets2ContactKind;
  name?: string;
  role?: string;
  email?: string;
  phone?: string;
  sourceUrl: string;
}

export interface Ets2Company {
  id: string;
  name: string;
  countryIso: string;
  role: Ets2CompanyRole;
  /** Market share in percent, as the source states it. */
  marketSharePct: number | null;
  /** What the share is a share of (e.g. "final retail gas sales, 2025"). */
  shareBasis: string | null;
  /** Company-disclosed or register-reported gas volume, TWh/yr. */
  gasVolumeTWh: number | null;
  gasVolumeBasis: GasVolumeBasis;
  confidence: Ets2Confidence;
  /** End-user sector, for exposed end users (e.g. "Pharmaceuticals"). */
  sector?: string;
  evidence: Ets2Evidence[];
  contacts: Ets2Contact[];
  notes: string | null;
}

const CHECKED = '2026-09-28';

/**
 * Seed list of ETS2 regulated gas suppliers across 11 countries (curated desk research, see
 * supplierResearch.ts for the curation rules and every source).
 */
export const ETS2_SEED_COMPANIES: Ets2Company[] = ETS2_SUPPLIER_RESEARCH;

const CLEAN_HEAT_SOURCE: Pick<Ets2Evidence, 'type' | 'url' | 'checkedAt'> = {
  type: 'SECONDARY_SOURCE',
  url: 'https://sustainabilitymag.com/news/who-are-the-pharma-firms-joining-the-clean-heat-program',
  checkedAt: CHECKED,
};
const CLEAN_HEAT_PARTNER: Ets2Evidence = {
  type: 'SECONDARY_SOURCE',
  url: 'https://www.contractpharma.com/breaking-news/sanofi-ucb-opella-join-clean-heat-program/',
  note: 'Clean Heat Program (ERM / Secaro): 3Degrees signed as partner for short- and long-term biomethane procurement in the EU and US.',
  checkedAt: CHECKED,
};

function endUser(id: string, name: string, countryIso: string, sector: string, note: string, notes: string): Ets2Company {
  return {
    id,
    name,
    countryIso,
    role: 'EXPOSED_END_USER',
    marketSharePct: null,
    shareBasis: null,
    gasVolumeTWh: null,
    gasVolumeBasis: 'GCV',
    confidence: 'HIGH',
    sector,
    evidence: [{ ...CLEAN_HEAT_SOURCE, note }, CLEAN_HEAT_PARTNER],
    contacts: [],
    notes,
  };
}

/**
 * Warm leads: founding members of the Clean Heat Program, which replaces fossil process heat at
 * pharma manufacturing sites and has 3Degrees as a biomethane procurement partner. They are
 * programme members, not confirmed 3Degrees clients. Country is headquarters; ETS2 applies to
 * their EU sites only (the UK is outside ETS2).
 */
export const CLEAN_HEAT_PROGRAM_LEADS: Ets2Company[] = [
  endUser('gb-astrazeneca', 'AstraZeneca', 'GB', 'Pharmaceuticals', 'Founding member of the Clean Heat Program (joined December 2025).', 'UK HQ — target its EU manufacturing sites. Warm lead via the Clean Heat Program.'),
  endUser('fr-sanofi', 'Sanofi', 'FR', 'Pharmaceuticals', 'Founding member of the Clean Heat Program alongside UCB and Opella.', 'Warm lead via the Clean Heat Program.'),
  endUser('be-ucb', 'UCB', 'BE', 'Pharmaceuticals', 'Founding member of the Clean Heat Program alongside Sanofi and Opella.', 'Warm lead via the Clean Heat Program.'),
  endUser('fr-opella', 'Opella', 'FR', 'Consumer healthcare', 'Founding member of the Clean Heat Program alongside Sanofi and UCB.', 'Warm lead via the Clean Heat Program.'),
];

/** Where each country publishes (or will publish) the list of ETS2 regulated entities. */
export const ETS2_REGULATED_ENTITY_LISTS: Record<string, { label: string; url: string }> = {
  EU: {
    label: 'EU Transaction Log — ETS2 entity data from 2026/27',
    url: 'https://climate.ec.europa.eu/areas-action/carbon-markets/eu-emissions-trading-system-eu-ets/union-registry_en',
  },
  IE: {
    label: 'EPA — current ETS2 greenhouse gas emissions permits',
    url: 'https://www.epa.ie/our-services/licensing/climate-change/eu-emissions-trading-system-/eu-emissions-trading-system-2-ets2/current-ets2-greenhouse-gas-emissions-permits/',
  },
  DE: {
    label: 'DEHSt nEHS register — public compliance list of all 1,966 BEHG responsible parties (CSV/XLSX export); most move into EU ETS2',
    url: DEHST_NEHS_COMPLIANCE_LIST,
  },
  BE: {
    label: 'Belgian Climate Registry — ETS2 (regional competent authorities)',
    url: 'https://www.climateregistry.be/en/registry/ETS2.htm',
  },
  EE: {
    label: 'Keskkonnaamet — ETS2 regulated entities',
    url: 'https://www.keskkonnaamet.ee/en/new-european-union-emissions-trading-system-eu-ets2-buildings-road-transport-and-additional-sectors',
  },
  SE: {
    label: 'Energimyndigheten — EU ETS2',
    url: 'https://www.energimyndigheten.se/en/climate/the-eu-emissions-trading-system-eu-ets/information-about-the-eu-ets-and-how-emissions-trading-works/the-eu-ets/eu-ets2/',
  },
};

export interface Ets2CompanyExposure {
  company: Ets2Company;
  /** Gas volume used for the estimate (after scoping), TWh, and how it was obtained. */
  volumeTWh: number | null;
  volumeMethod: 'DISCLOSED' | 'SHARE_OF_NATIONAL' | null;
  emissionsMtCo2: number | null;
  /** Volume before scoping, TWh (the disclosed or national-share figure). */
  volumeAllSegmentsTWh: number | null;
  /** ETS2_SEGMENT: volumeTWh, emissions and cost are scoped to the ETS2-covered segment. */
  volumeScope: 'ETS2_SEGMENT' | 'ALL_SEGMENTS';
  /** Share of the all-segment volume applied (0–1); null when no scoping was applied. */
  ets2ScopeShare: number | null;
  ets2CostEurM: number | null;
}

const MWH_PER_TWH = 1_000_000;
const TONNES_PER_MT = 1_000_000;
const EUR_PER_EUR_M = 1_000_000;
const PERCENT = 100;

/**
 * Estimated ETS2 allowance bill per company. Uses the company's own volume where known;
 * otherwise its market share applied to the country's imported building-gas volume, which is
 * an approximation (shares are usually of all retail sales, not buildings alone).
 *
 * Disclosed volumes cover all customer segments, including ETS1 industry and power, which are outside
 * ETS2. Where the country has a sourced ETS2 share of gas demand (see segmentShare.ts) the disclosed
 * volume is multiplied by it (volumeScope 'ETS2_SEGMENT'); otherwise it stays unscoped ('ALL_SEGMENTS',
 * an upper bound). National-share volumes are built on buildings gas already, so they are
 * 'ETS2_SEGMENT' with no share applied (ets2ScopeShare null).
 */
export function computeCompanyExposure(
  companies: Ets2Company[],
  countries: Ets2CountryProfile[],
  ets2PriceEurPerT: number | null
): Ets2CompanyExposure[] {
  const byIso = new Map(countries.map(c => [c.iso, c]));
  return companies.map(company => {
    let volumeTWh: number | null = null;
    let basis: GasVolumeBasis = company.gasVolumeBasis;
    let volumeMethod: Ets2CompanyExposure['volumeMethod'] = null;
    let volumeScope: Ets2CompanyExposure['volumeScope'] = 'ALL_SEGMENTS';
    let ets2ScopeShare: number | null = null;
    let volumeAllSegmentsTWh: number | null = null;
    if (company.gasVolumeTWh !== null) {
      volumeAllSegmentsTWh = company.gasVolumeTWh;
      volumeTWh = company.gasVolumeTWh;
      volumeMethod = 'DISCLOSED';
      const share = byIso.get(company.countryIso)?.ets2SegmentShare ?? null;
      // End users are not scoped: their own volume is what it is.
      if (share !== null && company.role === 'REGULATED_SUPPLIER') {
        volumeTWh = company.gasVolumeTWh * share;
        volumeScope = 'ETS2_SEGMENT';
        ets2ScopeShare = share;
      }
    } else {
      const country = byIso.get(company.countryIso);
      if (company.marketSharePct !== null && country && country.gasBuildingsTWh !== null) {
        volumeTWh = (country.gasBuildingsTWh * company.marketSharePct) / PERCENT;
        basis = country.gasVolumeBasis;
        volumeMethod = 'SHARE_OF_NATIONAL';
        volumeAllSegmentsTWh = volumeTWh;
        volumeScope = 'ETS2_SEGMENT';
      }
    }
    if (volumeTWh === null) {
      return { company, volumeTWh: null, volumeMethod: null, volumeAllSegmentsTWh: null, volumeScope: 'ALL_SEGMENTS', ets2ScopeShare: null, emissionsMtCo2: null, ets2CostEurM: null };
    }
    const tonnes = toNcvMWh(volumeTWh * MWH_PER_TWH, basis) * ETS_NATURAL_GAS_TCO2_PER_MWH;
    return {
      company,
      volumeTWh,
      volumeMethod,
      volumeAllSegmentsTWh,
      volumeScope,
      ets2ScopeShare,
      emissionsMtCo2: tonnes / TONNES_PER_MT,
      ets2CostEurM: ets2PriceEurPerT === null ? null : (tonnes * ets2PriceEurPerT) / EUR_PER_EUR_M,
    };
  });
}

export interface Ets2CompanyImportResult {
  companies: Ets2Company[];
  applied: number;
  errors: string[];
}

function slug(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

/**
 * Merges imported company rows into the seed list (same id or same name+country replaces).
 * Each row needs a name, an ISO country and at least one evidence URL.
 */
export function applyEts2CompanyImport(base: Ets2Company[], json: string): Ets2CompanyImportResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return { companies: base, applied: 0, errors: ['Not valid JSON.'] };
  }
  if (!Array.isArray(parsed)) {
    return { companies: base, applied: 0, errors: ['Expected a JSON array of company rows.'] };
  }
  const errors: string[] = [];
  const merged = new Map(base.map(c => [c.id, c]));
  let applied = 0;
  parsed.forEach((raw, i) => {
    const r = raw as Partial<Ets2Company> & { evidenceUrl?: string; evidenceNote?: string };
    const name = typeof r.name === 'string' ? r.name.trim() : '';
    const iso = typeof r.countryIso === 'string' ? r.countryIso.toUpperCase() : '';
    const evidence: Ets2Evidence[] = Array.isArray(r.evidence)
      ? r.evidence.filter(e => e && typeof e.url === 'string' && e.url)
      : r.evidenceUrl
      ? [{ type: 'SECONDARY_SOURCE', url: r.evidenceUrl, note: r.evidenceNote ?? '', checkedAt: CHECKED }]
      : [];
    if (!name || iso.length !== 2) {
      errors.push(`Row ${i + 1}: name and two-letter countryIso are required.`);
      return;
    }
    if (evidence.length === 0) {
      errors.push(`Row ${i + 1} (${name}): at least one evidence URL is required.`);
      return;
    }
    const id = r.id ?? `${iso.toLowerCase()}-${slug(name)}`;
    const existing = merged.get(id) ?? [...merged.values()].find(c => c.countryIso === iso && c.name.toLowerCase() === name.toLowerCase());
    const company: Ets2Company = {
      id: existing?.id ?? id,
      name,
      countryIso: iso,
      role: r.role === 'EXPOSED_END_USER' ? 'EXPOSED_END_USER' : 'REGULATED_SUPPLIER',
      marketSharePct: typeof r.marketSharePct === 'number' ? r.marketSharePct : existing?.marketSharePct ?? null,
      shareBasis: r.shareBasis ?? existing?.shareBasis ?? null,
      gasVolumeTWh: typeof r.gasVolumeTWh === 'number' ? r.gasVolumeTWh : existing?.gasVolumeTWh ?? null,
      gasVolumeBasis: r.gasVolumeBasis === 'NCV' ? 'NCV' : 'GCV',
      confidence: r.confidence === 'HIGH' || r.confidence === 'LOW' ? r.confidence : 'MEDIUM',
      evidence,
      contacts: Array.isArray(r.contacts) ? r.contacts.filter(c => c && typeof c.sourceUrl === 'string') : existing?.contacts ?? [],
      notes: r.notes ?? existing?.notes ?? null,
    };
    merged.set(company.id, company);
    applied++;
  });
  return { companies: [...merged.values()], applied, errors };
}
