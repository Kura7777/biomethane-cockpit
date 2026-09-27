/**
 * Shared writer and validator for counterparty plant research.
 * Each research script / data file saves to data/plant_research/<cc>.json;
 * this then validates every record and regenerates src/domain/plants/plantResearch.generated.ts.
 */
import * as fs from 'fs';
import * as path from 'path';
import { PlantResearch, SourcedValue, ResearchContact } from '../../src/domain/plants/types';

export interface CountryResearchFile {
  countryCode: string;
  researchedAt: string;
  plants: PlantResearch[];
}

const ROOT = path.join(__dirname, '..', '..');
const DATA_DIR = path.join(ROOT, 'data', 'plant_research');
const OUT_PATH = path.join(ROOT, 'src', 'domain', 'plants', 'plantResearch.generated.ts');

export const THIRD_PARTY_DIRECTORY_REGEX = /einforma|infocif|librebor|empresia|axesor|kompass/i;

function checkSourcedValue(sv: SourcedValue<any> | null | undefined, fieldName: string, plantId: string): void {
  if (!sv) return;
  if (sv.value === undefined || sv.value === null || (typeof sv.value === 'string' && !sv.value.trim())) {
    throw new Error(`[${plantId}] ${fieldName} has empty value`);
  }
  if (!sv.sourceUrl || typeof sv.sourceUrl !== 'string' || !sv.sourceUrl.trim()) {
    throw new Error(`[${plantId}] ${fieldName} lacks sourceUrl`);
  }
  if (!sv.retrievedAt || typeof sv.retrievedAt !== 'string' || !sv.retrievedAt.trim()) {
    throw new Error(`[${plantId}] ${fieldName} lacks retrievedAt`);
  }
  if (isNaN(Date.parse(sv.retrievedAt))) {
    throw new Error(`[${plantId}] ${fieldName} retrievedAt is not a valid date: ${sv.retrievedAt}`);
  }
  if (THIRD_PARTY_DIRECTORY_REGEX.test(sv.sourceUrl)) {
    if (!sv.note || !/third-party directory/i.test(sv.note)) {
      throw new Error(`[${plantId}] ${fieldName} sourced from third-party directory (${sv.sourceUrl}) must be marked in note as "third-party directory — confirm"`);
    }
  }
}

/**
 * Validates that a PlantResearch record satisfies all data integrity and outreach tier invariants:
 * - Every SourcedValue must have sourceUrl and retrievedAt (ISO date).
 * - Third-party directory sources must be marked in note as "third-party directory — confirm".
 * - Every contact must have type, value, sourceUrl, retrievedAt.
 * - NAMED_PERSON must have personName and require a GDPR open question.
 * - READY requires legalEntity + website + at least one non-person contact + plantLink (none sourced only from third-party directory).
 * - ENTITY_ONLY requires legalEntity, but lacks non-person contact or plantLink.
 * - UNRESOLVED cannot have a confirmed legalEntity.
 */
export function validate(research: PlantResearch): void {
  if (!research.plantId) {
    throw new Error('PlantResearch record missing plantId');
  }
  const id = research.plantId;

  if (!research.status) {
    throw new Error(`[${id}] Missing status`);
  }
  if (!research.tier) {
    throw new Error(`[${id}] Missing tier`);
  }
  if (!research.researchedAt) {
    throw new Error(`[${id}] Missing researchedAt`);
  }
  if (isNaN(Date.parse(research.researchedAt))) {
    throw new Error(`[${id}] researchedAt is not a valid date: ${research.researchedAt}`);
  }

  // Check all sourced values
  checkSourcedValue(research.legalEntity, 'legalEntity', id);
  checkSourcedValue(research.registrationId, 'registrationId', id);
  checkSourcedValue(research.parentGroup, 'parentGroup', id);
  checkSourcedValue(research.siteAddress, 'siteAddress', id);
  checkSourcedValue(research.siteCoordinates, 'siteCoordinates', id);
  checkSourcedValue(research.website, 'website', id);
  checkSourcedValue(research.plantLink, 'plantLink', id);

  for (let i = 0; i < (research.injectionOrOfftakeNotes || []).length; i++) {
    checkSourcedValue(research.injectionOrOfftakeNotes[i], `injectionOrOfftakeNotes[${i}]`, id);
  }

  // Check contacts
  const contacts = research.contacts || [];
  for (let i = 0; i < contacts.length; i++) {
    const c = contacts[i];
    if (!c.type) throw new Error(`[${id}] Contact[${i}] lacks type`);
    if (!c.value || typeof c.value !== 'string' || !c.value.trim()) {
      throw new Error(`[${id}] Contact[${i}] lacks value`);
    }
    if (!c.sourceUrl || typeof c.sourceUrl !== 'string' || !c.sourceUrl.trim()) {
      throw new Error(`[${id}] Contact[${i}] (${c.value}) lacks sourceUrl`);
    }
    if (!c.retrievedAt || typeof c.retrievedAt !== 'string' || !c.retrievedAt.trim()) {
      throw new Error(`[${id}] Contact[${i}] (${c.value}) lacks retrievedAt`);
    }
    if (isNaN(Date.parse(c.retrievedAt))) {
      throw new Error(`[${id}] Contact[${i}] retrievedAt is not a valid date: ${c.retrievedAt}`);
    }
    if (c.contactScope && !['PLANT_OPERATOR', 'PARENT_COMMERCIAL', 'GENERAL_OR_PRESS'].includes(c.contactScope)) {
      throw new Error(`[${id}] Contact[${i}] has invalid contactScope: ${c.contactScope}`);
    }
    if (THIRD_PARTY_DIRECTORY_REGEX.test(c.sourceUrl)) {
      if (!c.note || !/third-party directory/i.test(c.note)) {
        throw new Error(`[${id}] Contact[${i}] sourced from third-party directory must be marked in note as "third-party directory — confirm"`);
      }
    }
    if (c.type === 'NAMED_PERSON' && (!c.personName || !c.personName.trim())) {
      throw new Error(`[${id}] NAMED_PERSON contact[${i}] (${c.value}) lacks personName`);
    }
  }

  const hasNamedPerson = contacts.some(c => c.type === 'NAMED_PERSON');
  if (hasNamedPerson) {
    const hasGdpr = (research.openQuestions || []).some(q => /GDPR/i.test(q));
    if (!hasGdpr) {
      throw new Error(`[${id}] Record has NAMED_PERSON contact but lacks GDPR open question`);
    }
  }

  const hasLegalEntity = Boolean(research.legalEntity && research.legalEntity.value?.trim() && research.legalEntity.sourceUrl?.trim());
  const hasWebsite = Boolean(research.website && research.website.value?.trim() && research.website.sourceUrl?.trim());
  const hasNonPersonContact = contacts.some(c => c.type !== 'NAMED_PERSON' && Boolean(c.value?.trim()) && Boolean(c.sourceUrl?.trim()));
  const hasPlantLink = Boolean(research.plantLink && research.plantLink.value?.trim() && research.plantLink.sourceUrl?.trim());

  if (research.tier === 'READY') {
    if (!hasLegalEntity) {
      throw new Error(`[${id}] READY tier requires legalEntity with sourceUrl`);
    }
    if (THIRD_PARTY_DIRECTORY_REGEX.test(research.legalEntity?.sourceUrl || '')) {
      throw new Error(`[${id}] READY tier cannot have legalEntity sourced only from a third-party directory`);
    }
    if (!hasWebsite) {
      throw new Error(`[${id}] READY tier requires website with sourceUrl`);
    }
    if (!hasNonPersonContact) {
      throw new Error(`[${id}] READY tier requires at least one non-person contact with sourceUrl`);
    }
    if (!hasPlantLink) {
      throw new Error(`[${id}] READY tier requires a plant link with sourceUrl linking site to legal entity`);
    }
    if (THIRD_PARTY_DIRECTORY_REGEX.test(research.plantLink?.sourceUrl || '')) {
      throw new Error(`[${id}] READY tier cannot have plantLink sourced only from a third-party directory`);
    }
  } else if (research.tier === 'ENTITY_ONLY') {
    if (!hasLegalEntity) {
      throw new Error(`[${id}] ENTITY_ONLY tier requires legalEntity with sourceUrl`);
    }
  } else if (research.tier === 'UNRESOLVED') {
    if (hasLegalEntity) {
      throw new Error(`[${id}] Plant with confirmed legalEntity should be ENTITY_ONLY or READY, not UNRESOLVED`);
    }
  } else {
    throw new Error(`[${id}] Invalid tier: ${research.tier}`);
  }

  // Check effectiveTier invariant if present
  if (research.effectiveTier === 'READY') {
    const legalVerified = research.legalEntity?.check?.status === 'VERIFIED';
    const linkVerified = research.plantLink?.check?.status === 'VERIFIED';
    const contactVerified = contacts.some(c => c.check?.status === 'VERIFIED' && (c.contactScope === 'PLANT_OPERATOR' || c.contactScope === 'PARENT_COMMERCIAL'));
    if (!legalVerified || !linkVerified || !contactVerified) {
      throw new Error(`[${id}] effectiveTier READY requires verified legalEntity, verified plantLink, and >=1 verified PLANT_OPERATOR/PARENT_COMMERCIAL contact`);
    }
  }
}

export function writeCountryResearch(file: CountryResearchFile): void {
  fs.mkdirSync(DATA_DIR, { recursive: true });

  // Validate all plants
  for (const plant of file.plants) {
    validate(plant);
  }

  // Sort plants by ID
  const sortedPlants = [...file.plants].sort((a, b) => a.plantId.localeCompare(b.plantId));
  const fileContent: CountryResearchFile = {
    countryCode: file.countryCode.toUpperCase(),
    researchedAt: file.researchedAt,
    plants: sortedPlants,
  };

  const targetPath = path.join(DATA_DIR, `${file.countryCode.toLowerCase()}.json`);
  fs.writeFileSync(targetPath, JSON.stringify(fileContent, null, 2) + '\n', 'utf8');
  regenerate();
}

export function regenerate(): void {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const rawFiles = fs.readdirSync(DATA_DIR)
    .filter(f => f.endsWith('.json') && !f.endsWith('.verification.json'))
    .sort();

  const allPlants: Record<string, PlantResearch> = {};
  const countrySummaries: string[] = [];

  for (const f of rawFiles) {
    const cc = f.replace('.json', '').toLowerCase();
    const rawContent = fs.readFileSync(path.join(DATA_DIR, f), 'utf8');
    const parsed: CountryResearchFile = JSON.parse(rawContent);
    const plants = parsed.plants || [];

    // Check if verification file exists
    const verPath = path.join(DATA_DIR, `${cc}.verification.json`);
    let verMap: Record<string, any> | null = null;
    if (fs.existsSync(verPath)) {
      try {
        const verContent = JSON.parse(fs.readFileSync(verPath, 'utf8'));
        verMap = verContent.plants || null;
      } catch {
        verMap = null;
      }
    }

    for (const p of plants) {
      if (verMap && verMap[p.plantId]) {
        const vr = verMap[p.plantId];
        if (p.tier === 'UNRESOLVED' || !p.legalEntity) {
          p.effectiveTier = 'UNRESOLVED';
        } else {
          p.effectiveTier = vr.effectiveTier || 'UNRESOLVED';
        }

        if (p.legalEntity && vr.legalEntity) {
          p.legalEntity.check = {
            status: vr.legalEntity.status,
            checkedAt: vr.legalEntity.checkedAt,
            httpStatus: vr.legalEntity.httpStatus,
            finalUrl: vr.legalEntity.finalUrl,
            error: vr.legalEntity.error,
          };
        }
        if (p.registrationId && vr.registrationId) {
          p.registrationId.check = {
            status: vr.registrationId.status,
            checkedAt: vr.registrationId.checkedAt,
            httpStatus: vr.registrationId.httpStatus,
            finalUrl: vr.registrationId.finalUrl,
            viesValid: vr.registrationId.viesValid,
            error: vr.registrationId.error,
          };
        }
        if (p.website && vr.website) {
          p.website.check = {
            status: vr.website.status,
            checkedAt: vr.website.checkedAt,
            httpStatus: vr.website.httpStatus,
            finalUrl: vr.website.finalUrl,
            error: vr.website.error,
          };
        }
        if (p.plantLink && vr.plantLink) {
          p.plantLink.check = {
            status: vr.plantLink.status,
            checkedAt: vr.plantLink.checkedAt,
            httpStatus: vr.plantLink.httpStatus,
            finalUrl: vr.plantLink.finalUrl,
            error: vr.plantLink.error,
          };
        }
        if (p.parentGroup && vr.parentGroup) {
          p.parentGroup.check = {
            status: vr.parentGroup.status,
            checkedAt: vr.parentGroup.checkedAt,
            httpStatus: vr.parentGroup.httpStatus,
            error: vr.parentGroup.error,
          };
        }
        if (p.siteAddress && vr.siteAddress) {
          p.siteAddress.check = {
            status: vr.siteAddress.status,
            checkedAt: vr.siteAddress.checkedAt,
            httpStatus: vr.siteAddress.httpStatus,
            error: vr.siteAddress.error,
          };
        }
        if (p.contacts && vr.contacts) {
          for (let i = 0; i < p.contacts.length; i++) {
            const c = p.contacts[i];
            const vc = vr.contacts.find((x: any) => x.value === c.value) || vr.contacts[i];
            if (vc) {
              c.check = {
                status: vc.status,
                checkedAt: vc.checkedAt,
                httpStatus: vc.httpStatus,
                finalUrl: vc.finalUrl,
                error: vc.error,
              };
              if (vc.contactScope && !c.contactScope) {
                c.contactScope = vc.contactScope;
              }
            }
          }
        }
        if (p.injectionOrOfftakeNotes && vr.injectionOrOfftakeNotes) {
          for (let i = 0; i < p.injectionOrOfftakeNotes.length; i++) {
            const vn = vr.injectionOrOfftakeNotes[i];
            if (vn) {
              p.injectionOrOfftakeNotes[i].check = {
                status: vn.status,
                checkedAt: vn.checkedAt,
                httpStatus: vn.httpStatus,
                finalUrl: vn.finalUrl,
              };
            }
          }
        }
      } else {
        p.effectiveTier = 'UNRESOLVED';
      }

      if (p.siteCoordinates === undefined) {
        p.siteCoordinates = null;
      }

      validate(p);
      allPlants[p.plantId] = p;
    }

    const effectiveTierCounts = plants.reduce<Record<string, number>>((acc, p) => {
      const et = p.effectiveTier || 'UNRESOLVED';
      acc[et] = (acc[et] ?? 0) + 1;
      return acc;
    }, {});

    countrySummaries.push(`//   ${parsed.countryCode}: researched ${parsed.researchedAt} — effective tiers: ${JSON.stringify(effectiveTierCounts)}`);
  }

  // Deterministically sort keys
  const sortedPlantIds = Object.keys(allPlants).sort();
  const entries = sortedPlantIds.map(id => `  ${JSON.stringify(id)}: ${JSON.stringify(allPlants[id], null, 2).replace(/\n/g, '\n  ')},`);

  const out = `/* eslint-disable */
// GENERATED by scripts/lib/plantResearchWriter.ts from data/plant_research/*.json — do not edit by hand.
${countrySummaries.join('\n')}
import { PlantResearch } from './types';

export const PLANT_RESEARCH: Record<string, PlantResearch> = {
${entries.join('\n')}
};
`;

  fs.writeFileSync(OUT_PATH, out, 'utf8');
  console.log(`Wrote ${path.relative(ROOT, OUT_PATH)} (${sortedPlantIds.length} plants researched)`);
}
