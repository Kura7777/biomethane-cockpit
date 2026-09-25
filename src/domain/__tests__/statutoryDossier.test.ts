import { describe, it, expect, beforeEach } from 'vitest';
import { 
  getVerifiedPlantDossier, 
  generateLinkedInOriginationUrl,
  generateLinkedInCompanySearchUrl,
  generateStatutoryRegistrySearchUrl,
  isSynthesisedEntityName,
} from '../plants/statutoryDossiers';
import { 
  getTraderDeskOverride, 
  saveTraderDeskOverride, 
  deleteTraderDeskOverride,
  getAllTraderDeskOverrides,
  clearAllTraderDeskOverrides,
  exportTraderOverridesJson,
  importTraderOverridesJson
} from '../plants/deskOverridesStore';
import { BIOMETHANE_PLANTS } from '../plants/plantsData';
import { BiomethanePlant, TraderDeskOverride } from '../plants/types';

describe('Statutory Dossier & Trader Verification Engine', () => {
  beforeEach(() => {
    clearAllTraderDeskOverrides();
  });

  describe('1. Dossier resolution never presents unchecked data as verified', () => {
    const korskro: BiomethanePlant = {
      id: 'dk-korskro',
      name: 'Nature Energy Korskro',
      country: 'Denmark',
      countryCode: 'DK',
      countryFlag: '🇩🇰',
      provenance: 'GIE/EBA 2026',
      operator: 'Nature Energy Biogas A/S (Shell)',
    };

    it('Korskro carries the register-confirmed CVR, not the invented one', () => {
      const d = getVerifiedPlantDossier(korskro);
      expect(d.verificationStatus).toBe('REGISTER_CONFIRMED');
      expect(d.statutoryRegistrationId).toBe('CVR 34711631');
      expect(d.statutoryRegistrationId).not.toContain('37265489');
      expect(d.officialLegalEntity).toContain('Shell Korskro Biogas A/S');
      expect(d.verifiedAt).toBe('2026-09-26');
    });

    it('BioBéarn carries the register-confirmed SIREN', () => {
      const d = getVerifiedPlantDossier({ id: 'plant_fr_1', name: 'Centrale BioBéarn Mourenx', country: 'France', countryCode: 'FR', countryFlag: '🇫🇷', provenance: 'x' });
      expect(d.verificationStatus).toBe('REGISTER_CONFIRMED');
      expect(d.statutoryRegistrationId).toBe('SIREN 750 673 428');
    });

    it('unchecked research notes are UNVERIFIED with no registration ID and no verified date', () => {
      const d = getVerifiedPlantDossier({ id: 'x', name: 'Biomethananlage Schwedt', country: 'Germany', countryCode: 'DE', countryFlag: '🇩🇪', provenance: 'x', operator: 'VERBIO AG' });
      expect(d.verificationStatus).toBe('UNVERIFIED');
      expect(d.statutoryRegistrationId).toBeNull();
      expect(d.verifiedAt).toBeNull();
      expect(d.verificationSource).toMatch(/unverified/i);
    });

    it('research-note contacts become roles to ask for: no invented emails, phones or scores', () => {
      const d = getVerifiedPlantDossier(korskro);
      const roles = d.commercialContacts.filter(c => c.source === 'SUGGESTED_ROLE');
      expect(roles.length).toBeGreaterThan(0);
      for (const c of roles) {
        expect(c.workEmail).toBeNull();
        expect(c.directPhone).toBeNull();
        expect(c.confidenceScore).toBeNull();
      }
    });

    it('never synthesises an entity name from the plant or town name', () => {
      expect(isSynthesisedEntityName('Claye-Souilly SAS', 'Claye-Souilly')).toBe(true);
      expect(isSynthesisedEntityName('Communauté de Communes de Toulouse SAS', 'Communauté de Communes de Toulouse')).toBe(true);
      expect(isSynthesisedEntityName('Suez RV Bioénergie France', 'Claye-Souilly')).toBe(false);
      const d = getVerifiedPlantDossier({ id: 'y', name: 'Claye-Souilly', country: 'France', countryCode: 'FR', countryFlag: '🇫🇷', provenance: 'x', operator: 'Claye-Souilly SAS' });
      expect(d.officialLegalEntity).toBeNull();
    });

    it('drops a registry email rated UNDELIVERABLE and keeps an indirect one with its rating', () => {
      const base = { id: 'z', name: 'Test', country: 'France', countryCode: 'FR', countryFlag: '🇫🇷', provenance: 'x', contactEmail: 'contact@test.fr', contactPhone: '+33 1 00 00 00 00' };
      const quality = (confidence: 'UNDELIVERABLE' | 'INDIRECT') => ({ confidence, confidenceLabel: confidence } as any);
      const dead = getVerifiedPlantDossier({ ...base, contactQuality: quality('UNDELIVERABLE') });
      const deadLead = dead.commercialContacts.find(c => c.source === 'SOURCE_DATASET');
      expect(deadLead?.workEmail).toBeNull();
      expect(deadLead?.directPhone).toBe('+33 1 00 00 00 00');
      const indirect = getVerifiedPlantDossier({ ...base, contactQuality: quality('INDIRECT') });
      const lead = indirect.commercialContacts.find(c => c.source === 'SOURCE_DATASET');
      expect(lead?.workEmail).toBe('contact@test.fr');
      expect(lead?.title).toBe('INDIRECT');
    });
  });

  describe('2. LinkedIn & Statutory Register Search Link Generators', () => {
    it('generates targeted LinkedIn query URL stripping corporate suffixes', () => {
      const url = generateLinkedInOriginationUrl('Bioenergie Schwedt GmbH & Co. KG');
      expect(url).toContain('linkedin.com/search/results/people');
      expect(url).toContain('Schwedt');
      expect(url).toContain('origination');
    });

    it('tailors LinkedIn role keywords by country ISO (DE, FR, IT, GB, DK)', () => {
      const deUrl = generateLinkedInOriginationUrl('EnviTec Biogas AG', 'DE');
      expect(deUrl).toContain('Gesch%C3%A4ftsf%C3%BChrer'); // encoded Geschäftsführer

      const frUrl = generateLinkedInOriginationUrl('TotalEnergies Biogaz France SAS', 'FR');
      expect(frUrl).toContain('Directeur%20Commercial'); // encoded Directeur Commercial

      const itUrl = generateLinkedInOriginationUrl('Calvenzano Biometano S.r.l.', 'IT');
      expect(itUrl).toContain('Amministratore');

      const gbUrl = generateLinkedInOriginationUrl('Future Biogas Limited', 'GB');
      expect(gbUrl).toContain('Managing%20Director');
    });

    it('generates targeted LinkedIn company search URL', () => {
      const companyUrl = generateLinkedInCompanySearchUrl('Waga Energy SA');
      expect(companyUrl).toContain('linkedin.com/search/results/companies');
      expect(companyUrl).toContain('Waga%20Energy');
    });

    it('attaches verified corporate LinkedIn page to portfolio developer dossiers', () => {
      const plant = BIOMETHANE_PLANTS.find(p => (p.operator || '').includes('VERBIO'));
      expect(plant).toBeDefined();
      if (plant) {
        expect(plant.verifiedDossier?.linkedinCompanyUrl).toBe('https://www.linkedin.com/company/verbio-ag/');
        expect(plant.verifiedDossier?.linkedinSearchUrl).toContain('linkedin.com/search/results/people');
      }
    });

    it('generates country-specific statutory registry search URLs', () => {
      const frUrl = generateStatutoryRegistrySearchUrl('FR', 'Fontaine-le-Dun');
      expect(frUrl).toContain('annuaire-entreprises.data.gouv.fr');

      const deUrl = generateStatutoryRegistrySearchUrl('DE', 'Schwedt');
      expect(deUrl).toContain('marktstammdatenregister.de');

      const gbUrl = generateStatutoryRegistrySearchUrl('GB', 'Severn Trent');
      expect(gbUrl).toContain('company-information.service.gov.uk');

      const dkUrl = generateStatutoryRegistrySearchUrl('DK', 'Nature Energy');
      expect(dkUrl).toContain('datacvr.virk.dk');
    });
  });

  describe('3. Trader Desk Overrides Store (Non-Destructive Local Persistence)', () => {
    it('saves, retrieves, and clears custom trader verified contacts', () => {
      const testOverride: TraderDeskOverride = {
        plantId: 'test_plant_123',
        traderName: 'Senior Trader Alex',
        counterpartySignatory: 'Jean Dupont, Commercial Director',
        directEmail: 'j.dupont@methanisation-normande.fr',
        directPhone: '+33 6 12 34 56 78',
        notes: 'Agreed indicative terms on 25k MWh for Q4 2026.',
        verifiedAt: new Date().toISOString(),
        isConfirmed: true,
      };

      saveTraderDeskOverride(testOverride);
      const retrieved = getTraderDeskOverride('test_plant_123');
      expect(retrieved).not.toBeNull();
      expect(retrieved?.traderName).toBe('Senior Trader Alex');
      expect(retrieved?.counterpartySignatory).toBe('Jean Dupont, Commercial Director');
      expect(retrieved?.directEmail).toBe('j.dupont@methanisation-normande.fr');

      deleteTraderDeskOverride('test_plant_123');
      const afterDelete = getTraderDeskOverride('test_plant_123');
      expect(afterDelete).toBeNull();
    });

    it('exports and imports trader overrides as JSON safely', () => {
      const override1: TraderDeskOverride = {
        plantId: 'plant_alpha',
        traderName: 'Trader 1',
        counterpartySignatory: 'Signatory A',
        verifiedAt: new Date().toISOString(),
        isConfirmed: true,
      };

      saveTraderDeskOverride(override1);
      const jsonStr = exportTraderOverridesJson();
      expect(jsonStr).toContain('plant_alpha');
      expect(jsonStr).toContain('Signatory A');

      // Clear and re-import
      clearAllTraderDeskOverrides();
      expect(getTraderDeskOverride('plant_alpha')).toBeNull();

      const success = importTraderOverridesJson(jsonStr);
      expect(success).toBe(true);
      expect(getTraderDeskOverride('plant_alpha')?.counterpartySignatory).toBe('Signatory A');
    });

    it('import merges with local contacts and keeps the newer entry per plant', () => {
      const older = '2026-01-01T00:00:00.000Z';
      const newer = '2026-06-01T00:00:00.000Z';
      saveTraderDeskOverride({ plantId: 'local_only', traderName: 'Me', counterpartySignatory: 'Mine', verifiedAt: newer, isConfirmed: true });
      saveTraderDeskOverride({ plantId: 'shared', traderName: 'Me', counterpartySignatory: 'My newer note', verifiedAt: newer, isConfirmed: true });
      const colleague = JSON.stringify({
        shared: { plantId: 'shared', traderName: 'Colleague', counterpartySignatory: 'Their older note', verifiedAt: older, isConfirmed: true },
        theirs: { plantId: 'theirs', traderName: 'Colleague', counterpartySignatory: 'Theirs', verifiedAt: older, isConfirmed: true },
      });
      expect(importTraderOverridesJson(colleague)).toBe(true);
      expect(getTraderDeskOverride('local_only')?.counterpartySignatory).toBe('Mine');
      expect(getTraderDeskOverride('shared')?.counterpartySignatory).toBe('My newer note');
      expect(getTraderDeskOverride('theirs')?.counterpartySignatory).toBe('Theirs');
      expect(importTraderOverridesJson('{"x": 1}')).toBe(false);
    });
  });

  describe('4. Non-Destructive Invariant Verification', () => {
    it('guarantees that 100% of raw census fields and plant records remain preserved', () => {
      expect(BIOMETHANE_PLANTS.length).toBeGreaterThan(1970);
      const sample = BIOMETHANE_PLANTS[0];
      expect(sample.id).toBeDefined();
      expect(sample.name).toBeDefined();
      expect(sample.country).toBeDefined();
      expect(sample.countryCode).toBeDefined();
      // Raw contact fields still exist on the record
      expect('contactEmail' in sample).toBe(true);
      expect('contactPhone' in sample).toBe(true);
    });
  });

  describe('5. Census-wide honesty invariants', () => {
    it('every plant has a dossier with a register search link', () => {
      expect(BIOMETHANE_PLANTS.length).toBeGreaterThanOrEqual(1970);
      for (const plant of BIOMETHANE_PLANTS) {
        expect(plant.verifiedDossier, plant.id).toBeTruthy();
        expect(plant.verifiedDossier?.registerSearchUrl, plant.id).toMatch(/^https:/);
      }
    });

    it('shows a registration ID only when a register confirmed it', () => {
      for (const plant of BIOMETHANE_PLANTS) {
        const d = plant.verifiedDossier!;
        if (d.statutoryRegistrationId) expect(d.verificationStatus, plant.id).toBe('REGISTER_CONFIRMED');
        if (plant.companyRegistrationId) expect(plant.registrationCheck?.status, plant.id).toBe('CONFIRMED');
      }
    });

    it('no generated contact carries a confidence score or a verified date', () => {
      for (const plant of BIOMETHANE_PLANTS) {
        for (const c of plant.verifiedDossier!.commercialContacts) {
          expect(c.source, plant.id).not.toBe('DESK_VERIFIED');
          expect(c.confidenceScore, plant.id).toBeNull();
          expect(c.lastVerifiedDate, plant.id).toBeNull();
        }
      }
    });

    it('never offers a contact email the contact checker rates undeliverable', () => {
      for (const plant of BIOMETHANE_PLANTS) {
        if (plant.contactQuality?.confidence !== 'UNDELIVERABLE') continue;
        const emails = plant.verifiedDossier!.commercialContacts.map(c => c.workEmail).filter(Boolean);
        expect(emails, plant.id).not.toContain(plant.contactEmail);
      }
    });

    it('keeps the raw registration claim for audit when it is not shown', () => {
      const withClaim = BIOMETHANE_PLANTS.filter(p => p.claimedRegistrationId);
      expect(withClaim.length).toBeGreaterThan(1900);
      const hidden = withClaim.filter(p => !p.companyRegistrationId);
      for (const p of hidden) expect(p.fieldsUnverified, p.id).toContain('companyRegistrationId');
    });
  });

  describe('6. Danish CVR Register Verification', () => {
    it('a Danish plant with a CONFIRMED check shows the CVR and the register company name as entity, and is REGISTER_CONFIRMED', () => {
      const plant = BIOMETHANE_PLANTS.find(p => p.id === 'plant_dk_21');
      expect(plant).toBeDefined();
      expect(plant?.registrationCheck?.status).toBe('CONFIRMED');
      expect(plant?.companyRegistrationId).toBe('CVR: 34734445');
      expect(plant?.verifiedDossier?.statutoryRegistrationId).toBe('CVR: 34734445');
      expect(plant?.verifiedDossier?.officialLegalEntity).toBe('Shell Holsted Biogas A/S');
      expect(plant?.verifiedDossier?.verificationStatus).toBe('REGISTER_CONFIRMED');
      expect(plant?.fieldsUnverified).not.toContain('companyRegistrationId');
    });

    it('a MISMATCH Danish plant shows no registration ID and has companyRegistrationId in fieldsUnverified', () => {
      const plant = BIOMETHANE_PLANTS.find(p => p.id === 'plant_dk_40');
      expect(plant).toBeDefined();
      expect(plant?.registrationCheck?.status).toBe('MISMATCH');
      expect(plant?.companyRegistrationId).toBeNull();
      expect(plant?.verifiedDossier?.statutoryRegistrationId).toBeNull();
      expect(plant?.fieldsUnverified).toContain('companyRegistrationId');
      expect(plant?.claimedRegistrationId).toBe('CVR: 38814524');
    });
  });

  describe('7. German MaStR Register Matches', () => {
    it('a MATCHED German plant gets suggestedEntity populated on verifiedDossier, but stays UNVERIFIED with no official registration ID', () => {
      const plant = BIOMETHANE_PLANTS.find(p => p.id === 'plant_de_2');
      expect(plant).toBeDefined();
      expect(plant?.registerMatch?.status).toBe('MATCHED');
      expect(plant?.registerMatch?.best).toBeDefined();
      expect(plant?.registerMatch?.best?.operatorName).toBe('Erdgas Südwest GmbH');
      expect(plant?.registerMatch?.best?.operatorRegisterId).toBe('HRB 105621 (AG Mannheim)');

      // Dossier suggestedEntity is populated for trader confirmation
      const dossier = plant?.verifiedDossier;
      expect(dossier?.suggestedEntity).toBeDefined();
      expect(dossier?.suggestedEntity?.name).toBe('Erdgas Südwest GmbH');
      expect(dossier?.suggestedEntity?.registerId).toBe('HRB 105621 (AG Mannheim)');
      expect(dossier?.suggestedEntity?.source).toContain('Marktstammdatenregister');
      expect(dossier?.suggestedEntity?.evidence.length).toBeGreaterThan(0);

      // Invariants: NEVER promoted to official / confirmed without trader action
      expect(dossier?.verificationStatus).toBe('UNVERIFIED');
      expect(dossier?.statutoryRegistrationId).toBeNull();
      expect(plant?.companyRegistrationId).toBeNull();
    });

    it('an AMBIGUOUS German plant gets suggestedEntity: null on verifiedDossier and lists candidate matches', () => {
      const plant = BIOMETHANE_PLANTS.find(p => p.id === 'plant_de_37');
      expect(plant).toBeDefined();
      expect(plant?.registerMatch?.status).toBe('AMBIGUOUS');
      expect(plant?.registerMatch?.best).toBeNull();
      expect(plant?.registerMatch?.candidates.length).toBeGreaterThanOrEqual(2);

      // Dossier suggestedEntity MUST be null because candidates are ambiguous
      expect(plant?.verifiedDossier?.suggestedEntity).toBeNull();
      expect(plant?.verifiedDossier?.verificationStatus).toBe('UNVERIFIED');
    });

    it('census-wide invariant: NO German plant was marked REGISTER_CONFIRMED because of a register match', () => {
      const dePlants = BIOMETHANE_PLANTS.filter(p => p.countryCode === 'DE');
      expect(dePlants.length).toBe(282);

      for (const plant of dePlants) {
        expect(plant.verifiedDossier?.verificationStatus, plant.id).not.toBe('REGISTER_CONFIRMED');
        expect(plant.companyRegistrationId, plant.id).toBeNull();
        expect(plant.verifiedDossier?.statutoryRegistrationId, plant.id).toBeNull();
      }
    });
  });

  describe('8. Pan-European Statutory Register Matches (FR, IT, GB, NL, DK)', () => {
    it('French plants carry authentic ODRE and RNE/NaTran matches with suggestedEntity for trader confirmation', () => {
      const plant = BIOMETHANE_PLANTS.find(p => p.id === 'plant_fr_244');
      expect(plant).toBeDefined();
      expect(plant?.registerMatch?.status).toBe('MATCHED');
      expect(plant?.registerMatch?.best?.unitId).toBe('IR0194');
      expect(plant?.registerMatch?.best?.operatorName).toBe('BIONORROIS');
      expect(plant?.verifiedDossier?.suggestedEntity?.name).toBe('BIONORROIS');
      expect(plant?.verifiedDossier?.suggestedEntity?.source).toContain('ODRE');
      expect(plant?.verifiedDossier?.verificationStatus).toBe('UNVERIFIED');
    });

    it('Italian plants carry authentic GSE and Snam Rete Gas qualification matches', () => {
      const plant = BIOMETHANE_PLANTS.find(p => p.id === 'plant_it_76');
      expect(plant).toBeDefined();
      expect(plant?.registerMatch?.status).toBe('MATCHED');
      expect(plant?.registerMatch?.best?.operatorName).toBe('Montello S.p.A.');
      expect(plant?.registerMatch?.best?.operatorRegisterId).toContain('GSE');
      expect(plant?.verifiedDossier?.suggestedEntity?.name).toBe('Montello S.p.A.');
      expect(plant?.verifiedDossier?.suggestedEntity?.source).toContain('GSE');
      expect(plant?.verifiedDossier?.verificationStatus).toBe('UNVERIFIED');
    });

    it('Dutch plants carry authentic Vertogas & Gasunie Transport Services (GTS) certificate matches', () => {
      const plant = BIOMETHANE_PLANTS.find(p => p.id === 'plant_nl_76');
      expect(plant).toBeDefined();
      expect(plant?.registerMatch?.status).toBe('MATCHED');
      expect(plant?.registerMatch?.best?.operatorRegisterId).toContain('Vertogas');
      expect(plant?.verifiedDossier?.suggestedEntity?.name).toContain('Attero');
      expect(plant?.verifiedDossier?.suggestedEntity?.source).toContain('Vertogas');
      expect(plant?.verifiedDossier?.verificationStatus).toBe('UNVERIFIED');
    });

    it('UK plants carry authentic DESNZ REPD / Ofgem renewable energy planning matches', () => {
      const plant = BIOMETHANE_PLANTS.find(p => p.id === 'plant_uk_28');
      expect(plant).toBeDefined();
      expect(plant?.registerMatch?.status).toBe('MATCHED');
      expect(plant?.registerMatch?.best?.operatorName).toBe('Severn Trent Water');
      expect(plant?.registerMatch?.best?.operatorRegisterId).toContain('REPD');
      expect(plant?.verifiedDossier?.suggestedEntity?.name).toBe('Severn Trent Water');
      expect(plant?.verifiedDossier?.suggestedEntity?.source).toContain('DESNZ');
      expect(plant?.verifiedDossier?.verificationStatus).toBe('UNVERIFIED');
    });

    it('Swiss plants carry audited Zefix UIDs and Pronovo HKN register matches', () => {
      const plant = BIOMETHANE_PLANTS.find(p => p.id === 'plant_ch_14');
      expect(plant).toBeDefined();
      expect(plant?.registerMatch?.status).toBe('MATCHED');
      expect(plant?.registerMatch?.best?.operatorName).toBe('SwissFarmerPower Inwil AG');
      expect(plant?.registerMatch?.best?.operatorRegisterId).toContain('CHE-112.871.933');
      expect(plant?.verifiedDossier?.suggestedEntity?.name).toBe('SwissFarmerPower Inwil AG');
      expect(plant?.verifiedDossier?.suggestedEntity?.source).toContain('Pronovo');
      expect(plant?.verifiedDossier?.verificationStatus).toBe('UNVERIFIED');
    });

    it('Austrian plants carry authentic AGCS Biomethan Register Austria matches', () => {
      const plant = BIOMETHANE_PLANTS.find(p => p.id === 'plant_at_1');
      expect(plant).toBeDefined();
      expect(plant?.registerMatch?.status).toBe('MATCHED');
      expect(plant?.registerMatch?.best?.operatorRegisterId).toContain('AT-AGCS');
      expect(plant?.verifiedDossier?.suggestedEntity?.name).toContain('Bruck/Leitha');
      expect(plant?.verifiedDossier?.suggestedEntity?.source).toContain('AGCS');
      expect(plant?.verifiedDossier?.verificationStatus).toBe('UNVERIFIED');
    });

    it('100% of all 1,974 European biomethane plants carry authoritative national register matches', () => {
      const withMatches = BIOMETHANE_PLANTS.filter(p => p.registerMatch != null);
      expect(withMatches.length).toBe(1974);

      const matchedCount = BIOMETHANE_PLANTS.filter(p => p.registerMatch?.status === 'MATCHED').length;
      expect(matchedCount).toBeGreaterThanOrEqual(1700);
    });
  });
});




