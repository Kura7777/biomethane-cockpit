import { describe, it, expect } from 'vitest';
import { validate, regenerate } from '../../../scripts/lib/plantResearchWriter';
import { PLANT_RESEARCH } from '../plants/plantResearch.generated';
import { BIOMETHANE_PLANTS } from '../plants/plantsData';
import { PlantResearch, SourcedValue } from '../plants/types';
import { getVerifiedPlantDossier } from '../plants/statutoryDossiers';
import fs from 'node:fs';
import path from 'node:path';

describe('Plant Research Infrastructure & Data Integrity', () => {
  describe('Writer validate() rules', () => {
    const validReadyPlant: PlantResearch = {
      plantId: 'test_plant_1',
      status: 'ACTIVE',
      legalEntity: {
        value: 'Test Biomethane SPV S.L.',
        sourceUrl: 'https://example.com/borme',
        retrievedAt: '2026-09-26T10:00:00Z',
      },
      registrationId: {
        value: 'CIF B12345678',
        sourceUrl: 'https://example.com/vies',
        retrievedAt: '2026-09-26T10:00:00Z',
      },
      registerSource: 'BORME',
      parentGroup: null,
      siteAddress: null,
      siteCoordinates: null,
      website: {
        value: 'https://example.com',
        sourceUrl: 'https://example.com/notice',
        retrievedAt: '2026-09-26T10:00:00Z',
      },
      plantLink: {
        value: 'https://example.com/plant',
        sourceUrl: 'https://example.com/plant',
        retrievedAt: '2026-09-26T10:00:00Z',
      },
      contacts: [
        {
          type: 'GENERIC_EMAIL',
          value: 'contact@example.com',
          sourceUrl: 'https://example.com/contact',
          retrievedAt: '2026-09-26T10:00:00Z',
          note: 'Contact us at contact@example.com',
        },
      ],
      tier: 'READY',
      injectionOrOfftakeNotes: [],
      openQuestions: [],
      researchedAt: '2026-09-26T10:00:00Z',
    };

    it('passes validation for a fully formed READY plant', () => {
      expect(() => validate(validReadyPlant)).not.toThrow();
    });

    it('rejects a record missing plantId', () => {
      const bad = { ...validReadyPlant, plantId: '' };
      expect(() => validate(bad)).toThrow(/missing plantId/i);
    });

    it('rejects a SourcedValue missing sourceUrl', () => {
      const bad: PlantResearch = {
        ...validReadyPlant,
        legalEntity: {
          value: 'SPV',
          sourceUrl: '',
          retrievedAt: '2026-09-26T10:00:00Z',
        },
      };
      expect(() => validate(bad)).toThrow(/lacks sourceUrl/i);
    });

    it('rejects a SourcedValue missing retrievedAt', () => {
      const bad: PlantResearch = {
        ...validReadyPlant,
        legalEntity: {
          value: 'SPV',
          sourceUrl: 'https://example.com',
          retrievedAt: '',
        },
      };
      expect(() => validate(bad)).toThrow(/lacks retrievedAt/i);
    });

    it('rejects a contact missing sourceUrl', () => {
      const bad: PlantResearch = {
        ...validReadyPlant,
        contacts: [
          {
            type: 'GENERIC_EMAIL',
            value: 'info@test.com',
            sourceUrl: '',
            retrievedAt: '2026-09-26T10:00:00Z',
          },
        ],
      };
      expect(() => validate(bad)).toThrow(/lacks sourceUrl/i);
    });

    it('rejects READY tier without plantLink', () => {
      const bad: PlantResearch = {
        ...validReadyPlant,
        plantLink: null,
      };
      expect(() => validate(bad)).toThrow(/READY tier requires a plant link/i);
    });

    it('rejects READY tier without website', () => {
      const bad: PlantResearch = {
        ...validReadyPlant,
        website: null,
      };
      expect(() => validate(bad)).toThrow(/READY tier requires website/i);
    });

    it('rejects READY tier without at least one non-person contact', () => {
      const bad: PlantResearch = {
        ...validReadyPlant,
        contacts: [],
      };
      expect(() => validate(bad)).toThrow(/READY tier requires at least one non-person contact/i);
    });

    it('enforces GDPR open question when NAMED_PERSON contact is provided', () => {
      const plantWithPerson: PlantResearch = {
        ...validReadyPlant,
        contacts: [
          ...validReadyPlant.contacts,
          {
            type: 'NAMED_PERSON',
            value: 'juan.garcia@example.com',
            personName: 'Juan Garcia',
            role: 'Plant Manager',
            sourceUrl: 'https://example.com/team',
            retrievedAt: '2026-09-26T10:00:00Z',
            note: 'juan.garcia@example.com',
          },
        ],
        openQuestions: [],
      };

      // Fails without GDPR question
      expect(() => validate(plantWithPerson)).toThrow(/GDPR/i);

      // Passes with GDPR question
      plantWithPerson.openQuestions = ['GDPR: confirm lawful basis before emailing a named person'];
      expect(() => validate(plantWithPerson)).not.toThrow();
    });

    it('rejects third-party directory SourcedValue without required note', () => {
      const bad = {
        ...validReadyPlant,
        legalEntity: {
          value: 'SPV',
          sourceUrl: 'https://www.infocif.es/empresa/test',
          retrievedAt: '2026-09-26T10:00:00Z',
          note: 'Some info',
        },
      };
      expect(() => validate(bad)).toThrow(/third-party directory/i);
    });

    it('rejects READY tier when legalEntity or plantLink is sourced from a third-party directory', () => {
      const badReady = {
        ...validReadyPlant,
        legalEntity: {
          value: 'SPV',
          sourceUrl: 'https://www.infocif.es/empresa/test',
          retrievedAt: '2026-09-26T10:00:00Z',
          note: 'third-party directory — confirm',
        },
      };
      expect(() => validate(badReady)).toThrow(/cannot have legalEntity sourced only from a third-party directory/i);
    });

    it('rejects invalid date strings in retrievedAt or researchedAt', () => {
      const badDate = {
        ...validReadyPlant,
        researchedAt: 'invalid-date',
      };
      expect(() => validate(badDate)).toThrow(/not a valid date/i);
    });

    it('rejects UNRESOLVED plant that claims a confirmed legalEntity', () => {
      const badUnresolved: PlantResearch = {
        ...validReadyPlant,
        tier: 'UNRESOLVED',
        legalEntity: {
          value: 'Real SPV',
          sourceUrl: 'https://example.com',
          retrievedAt: '2026-09-26T10:00:00Z',
        },
      };
      expect(() => validate(badUnresolved)).toThrow(/should be ENTITY_ONLY or READY, not UNRESOLVED/i);
    });
  });

  describe('Spain (ES) Plant Research Records', () => {
    it('has all 26 Spanish plants in data/plant_research/es.json', () => {
      const esPath = path.resolve(__dirname, '../../../data/plant_research/es.json');
      expect(fs.existsSync(esPath)).toBe(true);
      const content = JSON.parse(fs.readFileSync(esPath, 'utf-8'));
      expect(content.countryCode).toBe('ES');
      expect(content.plants).toHaveLength(26);
    });

    it('every Spanish record passes validate() without errors', () => {
      const esPath = path.resolve(__dirname, '../../../data/plant_research/es.json');
      const content = JSON.parse(fs.readFileSync(esPath, 'utf-8'));
      for (const plant of content.plants) {
        expect(() => validate(plant)).not.toThrow();
      }
    });

    it('has effective tiers matching machine verification for Spain (5 READY, 19 ENTITY_ONLY, 2 UNRESOLVED)', () => {
      const ready = Object.values(PLANT_RESEARCH).filter(p => p.plantId.startsWith('plant_es_') && p.effectiveTier === 'READY');
      const entityOnly = Object.values(PLANT_RESEARCH).filter(p => p.plantId.startsWith('plant_es_') && p.effectiveTier === 'ENTITY_ONLY');
      const unresolved = Object.values(PLANT_RESEARCH).filter(p => p.plantId.startsWith('plant_es_') && p.effectiveTier === 'UNRESOLVED');

      expect(ready).toHaveLength(5);
      expect(entityOnly).toHaveLength(19);
      expect(unresolved).toHaveLength(2);

      const unresolvedIds = unresolved.map(p => p.plantId).sort();
      expect(unresolvedIds).toEqual(['plant_es_13', 'plant_es_16']);
    });

    it('no NAMED_PERSON contact appears without the GDPR open question across all records', () => {
      for (const plant of Object.values(PLANT_RESEARCH)) {
        const hasNamed = plant.contacts.some(c => c.type === 'NAMED_PERSON');
        if (hasNamed) {
          const hasGdpr = plant.openQuestions.some(q => /GDPR/i.test(q));
          expect(hasGdpr).toBe(true);
        }
      }
    });

    it('ensures all READY plants have valid coordinates and non-empty site address', () => {
      for (const plant of Object.values(PLANT_RESEARCH)) {
        if (!plant.plantId.startsWith('plant_es_') || plant.effectiveTier !== 'READY') continue;
        expect(plant.siteCoordinates?.value).toBeDefined();
        expect(plant.siteCoordinates!.value[0]).toBeGreaterThan(35); // Spain latitude range
        expect(plant.siteCoordinates!.value[0]).toBeLessThan(45);
        expect(plant.siteAddress?.value).toBeTruthy();
      }
    });

    it('attaches research to BiomethanePlant objects loaded via dataQuality', () => {
      const esPlants = BIOMETHANE_PLANTS.filter(p => p.countryCode === 'ES');
      expect(esPlants).toHaveLength(26);

      for (const p of esPlants) {
        expect(p.research).toBeDefined();
        expect(p.research?.plantId).toBe(p.id);
      }
    });

    it('sets researchConfirmedEntity on dossier without modifying verificationStatus', () => {
      const es1 = BIOMETHANE_PLANTS.find(p => p.id === 'plant_es_1');
      expect(es1).toBeDefined();
      expect(es1?.research?.registrationId?.value).toBe('CIF B95927380');
      expect(es1?.verifiedDossier?.researchConfirmedEntity).toBe(true);
      expect(es1?.verifiedDossier?.officialLegalEntity).toBe('Biored Almazán, S.L.');
      expect(es1?.verifiedDossier?.statutoryRegistrationId).toBeNull();
      // verificationStatus must not be mutated to REGISTER_CONFIRMED by desk research
      expect(es1?.verifiedDossier?.verificationStatus).toBe('UNVERIFIED');
    });

    it('does not set researchConfirmedEntity if registrationId sourceUrl is a third-party directory', () => {
      const es1 = BIOMETHANE_PLANTS.find(p => p.id === 'plant_es_1')!;
      const dossier = getVerifiedPlantDossier({
        id: es1.id,
        name: es1.name,
        countryCode: es1.countryCode,
        research: {
          ...es1.research!,
          registrationId: {
            value: 'CIF B95927380',
            sourceUrl: 'https://www.infocif.es/empresa/biored-almazan',
            retrievedAt: '2026-09-26T10:00:00Z',
            note: 'third-party directory — confirm',
          },
        },
      });
      expect(dossier.researchConfirmedEntity).toBe(false);
    });

    it('preserves UNRESOLVED status on dossiers for phantom entries', () => {
      const es13 = BIOMETHANE_PLANTS.find(p => p.id === 'plant_es_13');
      expect(es13).toBeDefined();
      expect(es13?.research?.tier).toBe('UNRESOLVED');
      expect(es13?.verifiedDossier?.researchConfirmedEntity).toBe(false);
      expect(es13?.research?.openQuestions.length).toBeGreaterThan(0);
    });
  });

  describe('United Kingdom (GB) Plant Research Records', () => {
    it('has top 40 UK plants in data/plant_research/gb.json', () => {
      const gbPath = path.resolve(__dirname, '../../../data/plant_research/gb.json');
      expect(fs.existsSync(gbPath)).toBe(true);
      const content = JSON.parse(fs.readFileSync(gbPath, 'utf-8'));
      expect(content.countryCode).toBe('GB');
      expect(content.plants).toHaveLength(40);
    });

    it('every UK record passes validate() without errors', () => {
      const gbPath = path.resolve(__dirname, '../../../data/plant_research/gb.json');
      const content = JSON.parse(fs.readFileSync(gbPath, 'utf-8'));
      for (const plant of content.plants) {
        expect(() => validate(plant)).not.toThrow();
      }
    });

    it('has effective tiers matching verification (4 READY, 28 ENTITY_ONLY, 8 UNRESOLVED)', () => {
      const ready = Object.values(PLANT_RESEARCH).filter(p => p.plantId.startsWith('plant_uk_') && p.effectiveTier === 'READY');
      const entityOnly = Object.values(PLANT_RESEARCH).filter(p => p.plantId.startsWith('plant_uk_') && p.effectiveTier === 'ENTITY_ONLY');
      const unresolved = Object.values(PLANT_RESEARCH).filter(p => p.plantId.startsWith('plant_uk_') && p.effectiveTier === 'UNRESOLVED');

      expect(ready).toHaveLength(4);
      expect(entityOnly).toHaveLength(28);
      expect(unresolved).toHaveLength(8);

      expect(unresolved.map(p => p.plantId)).toContain('plant_uk_45');
    });

    it('attaches research to top UK plants via dataQuality without modifying verificationStatus', () => {
      const gbResearched = BIOMETHANE_PLANTS.filter(p => p.countryCode === 'GB' && p.research);
      expect(gbResearched).toHaveLength(40);

      const uk10 = BIOMETHANE_PLANTS.find(p => p.id === 'plant_uk_10')!;
      expect(uk10).toBeDefined();
      expect(uk10.research?.effectiveTier).toBe('ENTITY_ONLY');
      expect(uk10.verifiedDossier?.researchConfirmedEntity).toBe(true);
      expect(uk10.verifiedDossier?.verificationStatus).toBe('UNVERIFIED');

      const uk123 = BIOMETHANE_PLANTS.find(p => p.id === 'plant_uk_123')!;
      expect(uk123).toBeDefined();
      expect(uk123.research?.effectiveTier).toBe('READY');
    });
  });

  describe('Automated Source Verification Engine & Rules', () => {
    it('decodes Cloudflare protected emails', async () => {
      const { decodeCloudflareEmail } = await import('../../../scripts/verify_research_sources');
      // Hex representation with key 0x12: 't' (0x74 ^ 0x12 = 0x66), 'e' (0x65 ^ 0x12 = 0x77)...
      const email = 'info@test.com';
      const key = 0x2a;
      let hex = key.toString(16).padStart(2, '0');
      for (let i = 0; i < email.length; i++) {
        hex += (email.charCodeAt(i) ^ key).toString(16).padStart(2, '0');
      }
      expect(decodeCloudflareEmail(hex)).toBe(email);
    });

    it('normalises obfuscated emails like [at] and (at)', async () => {
      const { normalizeHtmlText } = await import('../../../scripts/verify_research_sources');
      const html = '<p>Contact us at info [at] biomethane [dot] com or support(at)biomethane(dot)com</p>';
      const normalized = normalizeHtmlText(html);
      expect(normalized).toContain('info@biomethane.com');
      expect(normalized).toContain('support@biomethane.com');
    });

    it('normalises phone numbers stripping non-digits and international prefixes', async () => {
      const { normalizePhoneDigits } = await import('../../../scripts/verify_research_sources');
      expect(normalizePhoneDigits('+44 1483 375 920')).toBe('1483375920');
      expect(normalizePhoneDigits('01483 375920')).toBe('1483375920');
      expect(normalizePhoneDigits('+34 981 123 456')).toBe('981123456');
    });

    it('matches registration IDs stripping common prefixes', async () => {
      const { matchCifOnPage } = await import('../../../scripts/verify_research_sources');
      const pageText = 'Company registered under Company No. 12568943 in England and Wales';
      expect(matchCifOnPage('12568943', pageText)).toBe(true);
      expect(matchCifOnPage('Company No. 12568943', pageText)).toBe(true);
      expect(matchCifOnPage('CRN 12568943', pageText)).toBe(true);
    });

    it('computeEffectiveTier strictly requires legalEntity, plantLink, and commercial contact', async () => {
      const { computeEffectiveTier } = await import('../../../scripts/verify_research_sources');

      const verified = { status: 'VERIFIED' as const, checkedAt: '' };
      const failed = { status: 'PAGE_NOT_FOUND' as const, checkedAt: '' };

      // Case 1: All verified with commercial contact -> READY
      expect(
        computeEffectiveTier(verified, verified, verified, [{ contactScope: 'PARENT_COMMERCIAL' }])
      ).toBe('READY');

      // Case 2: All verified with plant operator contact -> READY
      expect(
        computeEffectiveTier(verified, verified, verified, [{ contactScope: 'PLANT_OPERATOR' }])
      ).toBe('READY');

      // Case 3: Plant link failed -> ENTITY_ONLY
      expect(
        computeEffectiveTier(verified, verified, failed, [{ contactScope: 'PARENT_COMMERCIAL' }])
      ).toBe('ENTITY_ONLY');

      // Case 4: Only GENERAL_OR_PRESS contact verified -> ENTITY_ONLY
      expect(
        computeEffectiveTier(verified, verified, verified, [{ contactScope: 'GENERAL_OR_PRESS' }])
      ).toBe('ENTITY_ONLY');

      // Case 5: No contact verified -> ENTITY_ONLY
      expect(
        computeEffectiveTier(verified, verified, verified, [])
      ).toBe('ENTITY_ONLY');

      // Case 6: Legal entity failed but registration ID verified -> ENTITY_ONLY
      expect(
        computeEffectiveTier(failed, verified, verified, [{ contactScope: 'PARENT_COMMERCIAL' }])
      ).toBe('ENTITY_ONLY');

      // Case 7: Both legal entity and registration ID failed -> UNRESOLVED
      expect(
        computeEffectiveTier(failed, failed, verified, [{ contactScope: 'PARENT_COMMERCIAL' }])
      ).toBe('UNRESOLVED');
    });

    it('regenerating plantResearch produces identical output (determinism)', () => {
      const generatedPath = path.resolve(__dirname, '../plants/plantResearch.generated.ts');
      const before = fs.readFileSync(generatedPath, 'utf-8');
      regenerate();
      const after = fs.readFileSync(generatedPath, 'utf-8');
      expect(after).toBe(before);
    });
  });
});

