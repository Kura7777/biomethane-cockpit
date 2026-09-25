import { BiomethanePlant, PlantDataQuality } from './types';
import { buildContactFrequencyIndex, evaluatePlantContactQuality } from './contactQuality';
import { getVerifiedPlantDossier } from './statutoryDossiers';

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
 *    reused across 5+ plants, third-party operators, and private farmer mailboxes).
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
] as const;

/** Fields that `isVerified` attests to (see BiomethanePlant.isVerified). */
const CORE_FIELDS = ['coordinates', 'capacityNm3h', 'annualEnergyGWh', 'primaryFeedstockCategory'] as const;

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

    const dupKey = duplicateKey(p);
    const duplicateOf = firstIdByDuplicateKey.get(dupKey) ?? null;
    if (duplicateOf === null) firstIdByDuplicateKey.set(dupKey, p.id);

    const dataQuality: PlantDataQuality = {
      approximateCoordinates,
      syntheticAddress,
      placeholderRegion,
      duplicateOf,
      contactConfidence: contactQuality.confidence,
    };

    return {
      ...p,
      fieldsUnverified: [...unverified],
      isVerified: Boolean(p.isVerified) && duplicateOf === null && !CORE_FIELDS.some(f => unverified.has(f)),
      dataQuality,
      contactQuality,
      verifiedDossier: getVerifiedPlantDossier(p),
    };
  });
}

