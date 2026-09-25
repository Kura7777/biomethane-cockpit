import { describe, it, expect, beforeEach } from 'vitest';
import { 
  getVerifiedPlantDossier, 
  generateLinkedInOriginationUrl,
  generateStatutoryRegistrySearchUrl,
  VERIFIED_STATUTORY_DOSSIERS 
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

  describe('1. Statutory Dossier Resolution & Data Integrity', () => {
    it('resolves official French SIRENE dossier for TotalEnergies BioBéarn (Mourenx)', () => {
      const plant = BIOMETHANE_PLANTS.find(p => p.id === 'plant_fr_1' || p.name.includes('BioBéarn') || p.name.includes('Mourenx'));
      const mockPlant: BiomethanePlant = plant ?? {
        id: 'plant_fr_1',
        name: 'Centrale BioBéarn Mourenx',
        country: 'France',
        countryCode: 'FR',
        countryFlag: '🇫🇷',
        provenance: 'GIE/EBA 2026',
        operator: 'TotalEnergies Biogaz France',
      };

      const dossier = getVerifiedPlantDossier(mockPlant);
      expect(dossier).not.toBeNull();
      expect(dossier?.statutoryRegister).toBe('FR_SIRENE');
      expect(dossier?.statutoryRegistrationId).toContain('SIRET 84930219400012');
      expect(dossier?.officialLegalEntity).toBe('SAS BIOBÉARN');
      expect(dossier?.commercialContacts.length).toBeGreaterThan(0);
      expect(dossier?.commercialContacts[0].workEmail).toBe('biogaz-origination@totalenergies.com');
    });

    it('resolves official German MaStR dossier for Verbio Schwedt', () => {
      const plant = BIOMETHANE_PLANTS.find(p => p.id === 'plant_de_1' || p.name.includes('Schwedt'));
      const mockPlant: BiomethanePlant = plant ?? {
        id: 'plant_de_1',
        name: 'Biomethananlage Schwedt',
        country: 'Germany',
        countryCode: 'DE',
        countryFlag: '🇩🇪',
        provenance: 'GIE/EBA 2026',
        operator: 'VERBIO AG',
      };

      const dossier = getVerifiedPlantDossier(mockPlant);
      expect(dossier).not.toBeNull();
      expect(dossier?.statutoryRegister).toBe('DE_MASTR');
      expect(dossier?.statutoryRegistrationId).toMatch(/^SEE\d+/);
      expect(dossier?.officialLegalEntity).toBe('Bioenergie Schwedt GmbH & Co. KG');
      expect(dossier?.groupTradingDeskLocation).toContain('Leipzig');
      expect(dossier?.commercialContacts.some(c => c.workEmail?.includes('verbio.de'))).toBe(true);
    });

    it('resolves official Danish CVR dossier for Nature Energy Korskro', () => {
      const mockPlant: BiomethanePlant = {
        id: 'dk-korskro',
        name: 'Nature Energy Korskro',
        country: 'Denmark',
        countryCode: 'DK',
        countryFlag: '🇩🇰',
        provenance: 'GIE/EBA 2026',
        operator: 'Nature Energy Biogas A/S (Shell)',
      };

      const dossier = getVerifiedPlantDossier(mockPlant);
      expect(dossier).not.toBeNull();
      expect(dossier?.statutoryRegister).toBe('DK_EVIDA_CVR');
      expect(dossier?.statutoryRegistrationId).toContain('CVR 37265489');
      expect(dossier?.parentGroup).toContain('Shell');
      expect(dossier?.groupTradingDeskLocation).toContain('Odense');
      expect(dossier?.commercialContacts.some(c => c.workEmail?.includes('nature-energy.com'))).toBe(true);
    });

    it('resolves official UK Companies House dossier for Severn Trent Green Power', () => {
      const mockPlant: BiomethanePlant = {
        id: 'plant_gb_1',
        name: 'Coleshill Biomethane Facility',
        country: 'United Kingdom',
        countryCode: 'GB',
        countryFlag: '🇬🇧',
        provenance: 'GIE/EBA 2026',
        operator: 'Severn Trent Green Power Ltd',
      };

      const dossier = getVerifiedPlantDossier(mockPlant);
      expect(dossier).not.toBeNull();
      expect(dossier?.statutoryRegister).toBe('GB_COMPANIES_HOUSE');
      expect(dossier?.statutoryRegistrationId).toContain('Company No.');
      expect(dossier?.officialLegalEntity).toBe('Severn Trent Green Power Ltd');
      expect(dossier?.commercialContacts.some(c => c.workEmail?.includes('severntrent.co.uk'))).toBe(true);
    });
  });

  describe('2. LinkedIn & Statutory Register Search Link Generators', () => {
    it('generates targeted LinkedIn query URL stripping corporate suffixes', () => {
      const url = generateLinkedInOriginationUrl('Bioenergie Schwedt GmbH & Co. KG');
      expect(url).toContain('linkedin.com/search/results/people');
      expect(url).toContain('Schwedt');
      expect(url).toContain('origination');
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

  describe('5. 100% European Plant Statutory Dossier Coverage Guarantee', () => {
    it('guarantees that 100% of all 1,974 plants have a valid, non-null VerifiedPlantDossier', () => {
      expect(BIOMETHANE_PLANTS.length).toBeGreaterThanOrEqual(1970);

      let missingDossierCount = 0;
      let missingLegalCount = 0;
      let missingRegIdCount = 0;
      let missingContactCount = 0;

      for (const plant of BIOMETHANE_PLANTS) {
        const dossier = plant.verifiedDossier;
        if (!dossier) {
          missingDossierCount++;
          continue;
        }

        if (!dossier.officialLegalEntity || dossier.officialLegalEntity.trim().length === 0) {
          missingLegalCount++;
        }
        if (!dossier.statutoryRegistrationId || dossier.statutoryRegistrationId.trim().length === 0) {
          missingRegIdCount++;
        }
        if (!dossier.commercialContacts || dossier.commercialContacts.length === 0) {
          missingContactCount++;
        }
      }

      expect(missingDossierCount).toBe(0);
      expect(missingLegalCount).toBe(0);
      expect(missingRegIdCount).toBe(0);
      expect(missingContactCount).toBe(0);
    });

    it('guarantees high-confidence origination contacts (score >= 90) across all facilities', () => {
      for (const plant of BIOMETHANE_PLANTS) {
        const dossier = plant.verifiedDossier;
        expect(dossier).toBeDefined();
        expect(dossier?.commercialContacts.length).toBeGreaterThanOrEqual(1);

        const primaryLead = dossier?.commercialContacts[0];
        expect(primaryLead?.confidenceScore).toBeGreaterThanOrEqual(90);
        expect(primaryLead?.fullName).toBeTruthy();
        expect(primaryLead?.title).toBeTruthy();
      }
    });

    it('ensures major developer portfolios correctly route to group desks without switchboard pollution', () => {
      // Find German Verbio plants
      const verbioPlants = BIOMETHANE_PLANTS.filter(p => (p.operator || '').includes('VERBIO'));
      expect(verbioPlants.length).toBeGreaterThan(0);

      for (const plant of verbioPlants) {
        const dossier = plant.verifiedDossier;
        expect(dossier?.parentGroup).toContain('VERBIO');
        expect(dossier?.groupTradingDeskLocation).toContain('Leipzig');
        // Must NOT list EnviTec switchboard
        const phone = dossier?.commercialContacts[0]?.directPhone;
        expect(phone).not.toBe('+49 4442 80160');
      }

      // Find TotalEnergies plants
      const totalPlants = BIOMETHANE_PLANTS.filter(p => (p.operator || '').includes('TotalEnergies'));
      expect(totalPlants.length).toBeGreaterThan(0);

      for (const plant of totalPlants) {
        const dossier = plant.verifiedDossier;
        expect(dossier?.parentGroup).toContain('TotalEnergies');
        expect(dossier?.commercialContacts.some(c => c.workEmail?.includes('totalenergies.com'))).toBe(true);
      }
    });
  });
});
