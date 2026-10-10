import type { Claims, CustodyPack, GoRecord, PosRecord, SupportType } from '../consignment/types';
import { emptyClaims, emptyGoRecord, emptyPosRecord } from '../consignment/custody';
import { PLANT_RESEARCH } from './plantResearch.generated';
import type { BiomethanePlant, PlantCompliance, SourcedValue } from './types';

/**
 * What the compliance research says about a plant, turned into the things a desk acts on: the
 * GGE-readiness line, certificate-expiry warnings, honest labels for the map's capacity figure, and
 * a pre-filled custody pack for a deal. Nothing here invents a value: an unresearched or unpublished
 * fact stays UNKNOWN (amber), and a CI is only ever filled from a sourced `reportedCI`.
 */

/** Registry that issues a country's gas GOs, as it appears on the GO. Only countries researched so far. */
const GO_REGISTRY_BY_COUNTRY: Record<string, string> = { ES: 'Enagás GTS' };

/** Spanish GOs quantify energy on PCS (gross calorific value) — Orden TED/1026/2022 §5.1. */
const GO_ENERGY_BASIS_BY_COUNTRY: Record<string, GoRecord['energyBasis']> = { ES: 'HHV' };

export const CAPACITY_ESTIMATE_LABEL = 'Capacity-based estimate';

/** Days before expiry at which the Statutory tab starts warning. */
export const CERT_EXPIRY_WARN_DAYS = 90;

export function getPlantCompliance(plantId: string): PlantCompliance | null {
  return PLANT_RESEARCH[plantId]?.compliance ?? null;
}

// --- certificate expiry ------------------------------------------------------------------------

export type CertExpiryState = 'VALID' | 'EXPIRING' | 'EXPIRED';

export interface CertExpiry {
  state: CertExpiryState;
  validUntil: string;
  /** Negative once expired. */
  daysLeft: number;
}

export function certificateExpiry(compliance: PlantCompliance | null | undefined, now: Date = new Date()): CertExpiry | null {
  const cert = compliance?.certification?.value;
  if (!cert) return null;
  // validUntil is a date; the certificate holds through the end of that day.
  const end = Date.parse(`${cert.validUntil}T23:59:59Z`);
  if (isNaN(end)) return null;
  const daysLeft = Math.floor((end - now.getTime()) / 86_400_000);
  // The scheme database's own status wins when it says expired (e.g. lapsed before the date was read).
  const expired = daysLeft < 0 || /expired|withdrawn|suspended/i.test(cert.status);
  const state: CertExpiryState = expired ? 'EXPIRED' : daysLeft <= CERT_EXPIRY_WARN_DAYS ? 'EXPIRING' : 'VALID';
  return { state, validUntil: cert.validUntil, daysLeft };
}

// --- aid -----------------------------------------------------------------------------------------

export type AidStatus = 'OPERATING' | 'INVESTMENT_ONLY' | 'NONE_FOUND';

/**
 * The researched aid class, set by hand next to the `otherAid` text. OPERATING is often entity-level
 * electricity support, to be confirmed against the digester. No record means none was found, not
 * that none exists.
 */
export function aidStatus(compliance: PlantCompliance | null | undefined): AidStatus {
  return compliance?.aidClass ?? 'NONE_FOUND';
}

/** True when the plant has a PRTR-funded grant under another programme and the biogas grant is not confirmed. */
function otherPrtrOnly(compliance: PlantCompliance): boolean {
  return Boolean(compliance.otherPrtrFunded) && compliance.prtrGrant?.value !== 'YES';
}

function supportTypeFor(compliance: PlantCompliance): SupportType {
  switch (aidStatus(compliance)) {
    case 'OPERATING': return 'OPERATING';
    case 'INVESTMENT_ONLY': return 'INVESTMENT';
    // Nothing found in public records is not a statement that there is no aid: the GO's support
    // field still has to be read, so the custody form starts at UNKNOWN.
    default: return 'UNKNOWN';
  }
}

// --- GGE readiness -------------------------------------------------------------------------------

/** OK = confirmed in a source; WARN = usable but needs attention; FLAG = problem; UNKNOWN = not found. */
export type ReadinessStatus = 'OK' | 'WARN' | 'FLAG' | 'UNKNOWN';

export interface ReadinessItem {
  id: 'grid' | 'certified' | 'aid' | 'prtr' | 'ci';
  label: string;
  status: ReadinessStatus;
  detail: string;
}

export interface GgeReadiness {
  items: ReadinessItem[];
  /** e.g. "3 of 5 confirmed · 1 flag". */
  summary: string;
  excluded: boolean;
}

export function ggeReadiness(compliance: PlantCompliance | null | undefined, now: Date = new Date()): GgeReadiness | null {
  if (!compliance) return null;
  if (compliance.excluded) return { items: [], summary: 'Excluded — not shortlisted', excluded: true };

  const items: ReadinessItem[] = [];

  const inj = compliance.injection?.value;
  items.push(
    inj === 'TSO' || inj === 'DSO'
      ? { id: 'grid', label: 'Grid-injected', status: 'OK', detail: `Injects into the ${inj === 'TSO' ? 'transmission' : 'distribution'} grid.` }
      : inj === 'OFF_GRID'
        ? { id: 'grid', label: 'Grid-injected', status: 'FLAG', detail: 'No grid injection: the GO needs grid-injected gas.' }
        : { id: 'grid', label: 'Grid-injected', status: 'UNKNOWN', detail: 'Injection not confirmed in a source.' },
  );

  const expiry = certificateExpiry(compliance, now);
  const cert = compliance.certification?.value;
  if (!cert || !expiry) {
    items.push({ id: 'certified', label: 'Certified', status: 'UNKNOWN', detail: 'No ISCC / REDcert / SURE certificate found for this plant.' });
  } else if (expiry.state === 'EXPIRED') {
    items.push({ id: 'certified', label: 'Certified', status: 'FLAG', detail: `${cert.certificateNumber} expired ${expiry.validUntil}.` });
  } else if (expiry.state === 'EXPIRING') {
    items.push({ id: 'certified', label: 'Certified', status: 'WARN', detail: `${cert.certificateNumber} expires ${expiry.validUntil} (${expiry.daysLeft} days).` });
  } else {
    items.push({ id: 'certified', label: 'Certified', status: 'OK', detail: `${cert.certificateNumber} valid to ${expiry.validUntil}.` });
  }

  const aid = aidStatus(compliance);
  items.push(
    aid === 'OPERATING'
      ? { id: 'aid', label: 'No operating aid', status: 'FLAG', detail: compliance.aidNote || 'Operating aid found (often entity-level electricity support): confirm it is not fed by this digester.' }
      : aid === 'INVESTMENT_ONLY'
        ? { id: 'aid', label: 'No operating aid', status: 'OK', detail: 'Investment aid or loans only (allowed on the Dutch side). Confirm the GO support field.' }
        : { id: 'aid', label: 'No operating aid', status: 'OK', detail: 'None found in public records. Confirm the GO support field.' },
  );

  const prtr = compliance.prtrGrant;
  if (prtr?.value === 'YES') {
    items.push({ id: 'prtr', label: 'PRTR', status: 'WARN', detail: 'PRTR biogas grant received: legal check of Orden TED/706/2022 Art. 5.3 needed before selling GO + PoS.' });
  } else if (otherPrtrOnly(compliance)) {
    items.push({ id: 'prtr', label: 'PRTR', status: 'WARN', detail: 'PRTR-funded grant (other programme): check its terms.' });
  } else if (prtr?.value === 'NO') {
    items.push({ id: 'prtr', label: 'PRTR', status: 'OK', detail: 'No PRTR biogas grant.' });
  } else {
    items.push({
      id: 'prtr',
      label: 'PRTR',
      status: 'UNKNOWN',
      detail: prtr?.bdnsResult === 'NO_RECORD' ? 'Not found (partial register): the public grants register covers only part of the programme.' : 'Not known.',
    });
  }

  items.push(
    hasSourcedCi(compliance)
      ? { id: 'ci', label: 'CI published', status: 'OK', detail: `${compliance.reportedCI!.value} gCO2e/MJ, sourced.` }
      : { id: 'ci', label: 'CI published', status: 'UNKNOWN', detail: 'No carbon intensity published: ask the plant for its PoS.' },
  );

  const ok = items.filter(i => i.status === 'OK').length;
  const flags = items.filter(i => i.status === 'FLAG').length;
  const summary = `${ok} of ${items.length} confirmed${flags ? ` · ${flags} flag${flags === 1 ? '' : 's'}` : ''}`;
  return { items, summary, excluded: false };
}

// --- energy labels -------------------------------------------------------------------------------

/** True when `annualEnergyGWh` comes straight from the GIE/EBA map: capacity-based, not measured. */
export function isMapCapacityEstimate(plant: Pick<BiomethanePlant, 'provenance'>): boolean {
  return /^GIE\/EBA European Biomethane Map/i.test(plant.provenance ?? '');
}

export interface PlantEnergyFigure {
  gwh: number;
  /** Set when the figure is a measured year, not the map's capacity. */
  year: number | null;
  /** "Capacity-based estimate", or null when the figure needs no caveat. */
  label: string | null;
  source: SourcedValue<unknown> | null;
}

/**
 * The energy figure to show for a plant. A researched actual production (with year and source) wins;
 * otherwise the map's annualEnergyGWh, labelled as a capacity-based estimate. This is display only —
 * calculations keep reading `annualEnergyGWh`.
 */
export function plantEnergyFigure(plant: Pick<BiomethanePlant, 'id' | 'provenance' | 'annualEnergyGWh'>): PlantEnergyFigure | null {
  const actual = getPlantCompliance(plant.id)?.actualProductionGWh;
  if (actual && typeof actual.value?.value === 'number') {
    return { gwh: actual.value.value, year: actual.value.year, label: null, source: actual };
  }
  if (typeof plant.annualEnergyGWh !== 'number' || !(plant.annualEnergyGWh > 0)) return null;
  return { gwh: plant.annualEnergyGWh, year: null, label: isMapCapacityEstimate(plant) ? CAPACITY_ESTIMATE_LABEL : null, source: null };
}

// --- deal defaults ------------------------------------------------------------------------------

function hasSourcedCi(c: PlantCompliance): boolean {
  const ci = c.reportedCI;
  return Boolean(ci && typeof ci.value === 'number' && ci.sourceUrl?.trim());
}

/**
 * Pre-fills a custody pack from compliance research. Pure so it can be tested with any block.
 * Only facts the research states are written; everything else stays null/UNKNOWN for the trader to
 * enter. The PoS CI is filled only from a sourced `reportedCI`. Energy volumes are never filled.
 */
export function complianceDefaults(compliance: PlantCompliance, country: string, now: Date = new Date()): Partial<CustodyPack> {
  if (compliance.excluded) return {};
  const iso = country.toUpperCase();
  const support = supportTypeFor(compliance);

  const inj = compliance.injection?.value;
  const go: GoRecord = {
    ...emptyGoRecord(iso),
    registry: GO_REGISTRY_BY_COUNTRY[iso] ?? '',
    issuingCountry: iso,
    energyBasis: GO_ENERGY_BASIS_BY_COUNTRY[iso] ?? 'UNKNOWN',
    supportType: support,
    ...(support === 'OPERATING' && compliance.aidNote ? { supportNote: compliance.aidNote } : {}),
    gridInjected: inj === 'TSO' || inj === 'DSO' ? true : inj === 'OFF_GRID' ? false : null,
  };

  const pos: PosRecord = {
    ...emptyPosRecord(),
    scheme: compliance.certification?.value?.scheme ?? null,
    supportDeclared: support,
    ciTotal: hasSourcedCi(compliance) ? compliance.reportedCI!.value : null,
  };

  const expiry = certificateExpiry(compliance, now);
  const claims: Claims = {
    ...emptyClaims(),
    prtrGrant: compliance.prtrGrant?.value === 'YES' ? 'YES' : compliance.prtrGrant?.value === 'NO' ? 'NONE' : 'UNKNOWN',
    ...(otherPrtrOnly(compliance) ? { prtrOtherProgramme: true } : {}),
    // The counterparty is certified only while its scheme certificate is in date.
    counterpartyCertified: expiry ? expiry.state !== 'EXPIRED' : null,
  };

  return { go, pos, claims };
}

/**
 * The custody pack a deal from this plant starts with: scheme, support type, PRTR status,
 * grid-injected, issuing country and registry. Empty for a plant with no compliance research or one
 * marked excluded.
 */
export function getPlantComplianceDefaults(plantId: string, countryCode?: string, now: Date = new Date()): Partial<CustodyPack> {
  const compliance = getPlantCompliance(plantId);
  if (!compliance) return {};
  const country = countryCode ?? plantId.split('_')[1] ?? '';
  return complianceDefaults(compliance, country, now);
}

// --- counterparty entity ------------------------------------------------------------------------

export interface ResearchedEntity {
  name: string;
  /** Page the name was read from (company register, ISCC certificate …). */
  url: string;
  note?: string;
}

/**
 * The company that actually operates a plant, as researched: the injecting entity the compliance
 * research found at the site (when the app's record points at a different company), else the
 * registered legal entity from the counterparty research. Null when nothing is researched.
 */
export function researchedPlantEntity(plantId: string): ResearchedEntity | null {
  const research = PLANT_RESEARCH[plantId];
  const corrected = research?.compliance?.correctedEntity;
  if (corrected?.value?.name) return { name: corrected.value.name, url: corrected.sourceUrl, note: corrected.note };
  const legal = research?.legalEntity;
  if (legal?.value) return { name: legal.value, url: legal.sourceUrl, note: legal.note };
  return null;
}

const norm = (s: string | null | undefined) => (s ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');

/**
 * Seller / counterparty name for a deal from a plant. A name the trader typed or a deal link set
 * explicitly wins; but the registry names that deal links fall back to (legalEntityName, operator,
 * plant name, generic placeholders) are replaced by the researched legal entity, with its source.
 */
export function resolveCounterparty(
  plant: Pick<BiomethanePlant, 'id' | 'name' | 'legalEntityName' | 'operator' | 'operatingCompany'> | null | undefined,
  requested?: string | null,
): { name: string | null; source: ResearchedEntity | null } {
  const asked = requested?.trim() || null;
  const researched = plant ? researchedPlantEntity(plant.id) : null;
  if (!plant || !researched) {
    return { name: asked ?? plant?.legalEntityName ?? plant?.operator ?? null, source: null };
  }
  const registryNames = [plant.legalEntityName, plant.operator, plant.operatingCompany, plant.name, `${plant.name} Producer`, 'European Biomethane Producer', 'Operating Entity']
    .map(norm)
    .filter(Boolean);
  const isRegistryFallback = !asked || registryNames.includes(norm(asked)) || norm(asked) === norm(researched.name);
  return isRegistryFallback ? { name: researched.name, source: researched } : { name: asked, source: null };
}

/**
 * The FEEDSTOCK_REGISTRY key to take a default CI from for a plant whose feedstock mix is researched,
 * and whether the mix is mixed. Null when the research sets none (the plant's registry feedstock applies).
 */
export function plantFeedstockForCi(plantId: string | null | undefined): { key: string; mixed: boolean } | null {
  const c = plantId ? getPlantCompliance(plantId) : null;
  return c?.feedstockForCi ? { key: c.feedstockForCi, mixed: Boolean(c.feedstockMixed) } : null;
}

/** Researched start of operation (YYYY-MM) and the source it came from, in place of the registry's unverified commissioning year. */
export function researchedOperatingSince(plantId: string): { value: string; sourceUrl: string } | null {
  const sv = getPlantCompliance(plantId)?.operatingSince;
  return sv?.value ? { value: String(sv.value), sourceUrl: sv.sourceUrl } : null;
}

/** The plant's published CI with its source, or null. A CI is never taken from anything unsourced. */
export function reportedCiForPlant(plantId: string): { value: number; sourceUrl: string } | null {
  const c = getPlantCompliance(plantId);
  return c && hasSourcedCi(c) ? { value: c.reportedCI!.value, sourceUrl: c.reportedCI!.sourceUrl } : null;
}

