import { BiomethanePlant, PlantDataQuality, RegisterMatch } from './types';
import { buildContactFrequencyIndex, evaluatePlantContactQuality } from './contactQuality';
import { getVerifiedPlantDossier, isTemplateLegalEntityName } from './statutoryDossiers';
import { REGISTRATION_CHECKS } from './registrationChecks.generated';
import { REGISTER_MATCHES } from './registerMatches.generated';
import { PLANT_RESEARCH } from './plantResearch.generated';

/**
 * Plant registry data-quality normalisation.
 *
 * The raw registry was assembled from the GIE/EBA 2026 map, which publishes plant name,
 * location and capacity only. Several enrichment passes then filled the gaps with
 * generated values while leaving `isVerified: true` and `fieldsUnverified: []`:
 *
 *  - country-centroid coordinates shared by up to 151 plants,
 *  - template street addresses ("Via per la Biometanazione", "Biogasvägen 10",
 *    "Industrieweg 14", "Biokaasulaitos", "<Town> AD Facility") — some matched to the
 *    wrong town by truncating the plant name ("Aberdeen" → "Aber, Ceredigion"),
 *  - placeholder regions ("<Country> Grid Injection Zone"),
 *  - rows repeated with identical name, capacity, energy and coordinates,
 *  - unverified commercial outreach contacts (dead domains that bounce, shared switchboards
 *    reused across 5+ plants, third-party operators, and private farmer mailboxes),
 *  - company registration IDs that were generated, not looked up (sequential German HRB
 *    numbers, "12345678", French SIRENs belonging to unrelated sole traders).
 *
 * Registration IDs are therefore kept only when a register check confirmed them
 * (registrationChecks.generated.ts); the raw value is preserved as claimedRegistrationId.
 *
 * This module does not invent replacements. It derives each record's unverified fields
 * from its own provenance and from those detectable defects, so the UI never presents
 * a generated value as audited data.
 */

/** Records that are not biomethane plants at all (OCR artefacts from the source map). */
const NON_PLANT_RECORD = /Map Legend Entry/i;

/** A coordinate shared by this many records is a centroid placeholder, not a site. */
export const CENTROID_PLACEHOLDER_THRESHOLD = 5;

const TEMPLATE_ADDRESS = /Via per la Biometanazione|Biogasvägen 10\b|Industrieweg 14\b|^Biokaasulaitos\b|\bAD Facility\b/i;
const PLACEHOLDER_REGION = /Grid Injection Zone\s*$/i;

/** Provenance wording used when the source map does not publish corporate fields. */
const SOURCE_OMITS_CORPORATE_FIELDS = /not published by this source/i;
const CORPORATE_FIELDS = [
  'operator',
  'legalEntityName',
  'companyRegistrationId',
  'corporateWebsite',
  'contactEmail',
  'contactPhone',
  'headquartersAddress',
  'commissioningYear',
  'supportExpiryDate',
] as const;

/** Fields that `isVerified` attests to (see BiomethanePlant.isVerified). */
const CORE_FIELDS = ['coordinates', 'capacityNm3h', 'annualEnergyGWh', 'primaryFeedstockCategory'] as const;

/** A register unit further than this from the plant is not accepted as the same site. */
export const REGISTER_MATCH_MAX_KM = 25;

/** Great-circle distance in km between two [lat, lon] points. */
export function distanceKm(a: [number, number], b: [number, number]): number {
  const R = 6371;
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b[0] - a[0]);
  const dLon = rad(b[1] - a[1]);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a[0])) * Math.cos(rad(b[0])) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/**
 * A town-name MATCHED can be a different site of the same name. When both coordinates are real and
 * the register unit is further than REGISTER_MATCH_MAX_KM, the match is downgraded to AMBIGUOUS and
 * the distance is shown as evidence.
 */
export function applyRegisterDistanceCheck(
  plantCoordinates: [number, number] | null | undefined,
  coordinatesAreApproximate: boolean,
  match: RegisterMatch | null
): RegisterMatch | null {
  if (!match || match.status !== 'MATCHED' || !match.best?.coordinates) return match;
  if (!plantCoordinates || coordinatesAreApproximate) return match;
  const km = distanceKm(plantCoordinates, match.best.coordinates);
  if (km <= REGISTER_MATCH_MAX_KM) return match;
  const rounded = Math.round(km);
  const best = {
    ...match.best,
    evidence: [`${rounded} km from plant coordinates (over ${REGISTER_MATCH_MAX_KM} km: not accepted as the same site)`, ...match.best.evidence],
  };
  return { ...match, status: 'AMBIGUOUS', best: null, candidates: [best, ...match.candidates].slice(0, 3), distanceKm: rounded };
}

/** The app's energy convention (kWh of biomethane per Nm3) used to turn kW into Nm3/h. */
const KWH_PER_NM3 = 10;

const coordinateKey = (p: BiomethanePlant): string | null => (p.coordinates ? p.coordinates.join(',') : null);

const duplicateKey = (p: BiomethanePlant): string =>
  [p.countryCode, p.name, p.capacityNm3h, p.annualEnergyGWh, coordinateKey(p)].join('|');

export function normalizePlantRegistry(raw: BiomethanePlant[]): BiomethanePlant[] {
  const records = raw.filter(p => !NON_PLANT_RECORD.test(p.name));

  const coordinateCounts = new Map<string, number>();
  for (const p of records) {
    const key = coordinateKey(p);
    if (key) coordinateCounts.set(key, (coordinateCounts.get(key) ?? 0) + 1);
  }

  // Pre-index contact frequencies across all records (for shared switchboard & hotline detection)
  const contactIndex = buildContactFrequencyIndex(records);

  const firstIdByDuplicateKey = new Map<string, string>();
  const firstIdByRegisterUnit = new Map<string, string>();

  return records.map(p => {
    const unverified = new Set<string>(p.fieldsUnverified ?? []);

    const key = coordinateKey(p);
    const approximateCoordinates = key === null || (coordinateCounts.get(key) ?? 0) >= CENTROID_PLACEHOLDER_THRESHOLD;
    if (approximateCoordinates) unverified.add('coordinates');

    const syntheticAddress = TEMPLATE_ADDRESS.test(p.headquartersAddress ?? '');
    if (syntheticAddress) unverified.add('headquartersAddress');

    const placeholderRegion = PLACEHOLDER_REGION.test(p.region ?? '');
    if (placeholderRegion) unverified.add('region');

    if (SOURCE_OMITS_CORPORATE_FIELDS.test(p.provenance ?? '')) {
      for (const field of CORPORATE_FIELDS) unverified.add(field);
    }

    // Evaluate contact quality, dead domains, shared switchboards & GDPR compliance
    const contactQuality = evaluatePlantContactQuality(p, contactIndex);
    // All raw census contact details are unverified leads, indirect switchboards, or dead domains
    if (p.contactEmail) unverified.add('contactEmail');
    if (p.contactPhone) unverified.add('contactPhone');

    // Registration ID: show only what a register confirmed; keep the raw claim for audit
    const registrationCheck = REGISTRATION_CHECKS[p.id] ?? null;
    const registerMatch = applyRegisterDistanceCheck(p.coordinates, approximateCoordinates, REGISTER_MATCHES[p.id] ?? null);
    const research = PLANT_RESEARCH[p.id] ?? null;
    const claimedRegistrationId = p.companyRegistrationId ?? null;
    const companyRegistrationId = registrationCheck?.status === 'CONFIRMED' ? claimedRegistrationId : null;
    if (claimedRegistrationId && !companyRegistrationId) unverified.add('companyRegistrationId');

    const dupKey = duplicateKey(p);
    let duplicateOf = firstIdByDuplicateKey.get(dupKey) ?? null;
    if (duplicateOf === null) firstIdByDuplicateKey.set(dupKey, p.id);

    // The register matcher can find two census rows pointing at the same register unit
    // ("duplicate census record"): propagate that as a duplicate of the first row.
    const unitId = registerMatch?.status === 'MATCHED' ? registerMatch.best?.unitId ?? null : null;
    if (unitId && registerMatch?.best?.evidence.some(e => /duplicate census record/i.test(e))) {
      const first = firstIdByRegisterUnit.get(unitId);
      if (first === undefined) firstIdByRegisterUnit.set(unitId, p.id);
      else if (duplicateOf === null && first !== p.id) duplicateOf = first;
    }

    // French census "capacityNm3h" is kW (energy / (capacity x 8000 h) = 1 for every FR row, ~10 elsewhere).
    // Convert at the app's 10 kWh/Nm3 convention and never claim it as source-verified.
    const capacityConvertedFromKw = p.countryCode === 'FR' && typeof p.capacityNm3h === 'number';
    const capacityNm3h = capacityConvertedFromKw ? Math.round((p.capacityNm3h as number) / KWH_PER_NM3) : p.capacityNm3h;
    if (capacityConvertedFromKw) unverified.add('capacityNm3h');

    const syntheticLegalEntity = isTemplateLegalEntityName(p.legalEntityName);
    if (syntheticLegalEntity) unverified.add('legalEntityName');

    const dataQuality: PlantDataQuality = {
      approximateCoordinates,
      syntheticAddress,
      placeholderRegion,
      duplicateOf,
      contactConfidence: contactQuality.confidence,
      syntheticLegalEntity,
      capacityConvertedFromKw,
    };

    return {
      ...p,
      capacityNm3h,
      companyRegistrationId,
      claimedRegistrationId,
      registrationCheck,
      registerMatch,
      research,
      fieldsUnverified: [...unverified],
      isVerified: Boolean(p.isVerified) && duplicateOf === null && !CORE_FIELDS.some(f => unverified.has(f)),
      dataQuality,
      contactQuality,
      verifiedDossier: getVerifiedPlantDossier({ ...p, capacityNm3h, companyRegistrationId, registrationCheck, registerMatch, contactQuality, research }),
    };
  });
}


/**
 * Support-scheme expiry year, ONLY when the record carries a sourced date. A date on a plant whose
 * source does not publish support terms (GIE/EBA map) is unverified and never counts; nothing is
 * defaulted (no "2027 if unknown").
 */
export function sourcedSupportExpiryYear(p: Pick<BiomethanePlant, 'supportExpiryDate' | 'fieldsUnverified'>): number | null {
  if (!p.supportExpiryDate) return null;
  if ((p.fieldsUnverified ?? []).includes('supportExpiryDate')) return null;
  const y = parseInt(p.supportExpiryDate.substring(0, 4), 10);
  return Number.isFinite(y) ? y : null;
}
