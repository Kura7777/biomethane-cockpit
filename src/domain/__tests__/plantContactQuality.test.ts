import { describe, it, expect } from 'vitest';
import { BIOMETHANE_PLANTS } from '../plants/plantsData';
import {
  evaluatePlantContactQuality,
  buildContactFrequencyIndex,
  isPersonalEmailDomain,
  isTruncatedInventedMailbox,
  isDeadOrSyntheticDomain,
  isOperatorDomainMismatch,
  isOperatorRegionalMismatch,
  normalizeToSlug,
  SHARED_CONTACT_THRESHOLD,
} from '../plants/contactQuality';
import { getOfficialRegisterForCountry, buildOfficialRegisterSearchUrl } from '../plants/officialRegisters';
import { BiomethanePlant } from '../plants/types';

describe('Plant Contact Quality & Commercial Outreach Guard Audit', () => {
  const index = buildContactFrequencyIndex(BIOMETHANE_PLANTS);

  describe('1. Dead & Synthetic Domain Detection (UNDELIVERABLE)', () => {
    it('detects French dead domains constructed from plant location names', () => {
      const fontaine = BIOMETHANE_PLANTS.find(p => p.name === 'Fontaine-le-Dun');
      expect(fontaine).toBeDefined();
      expect(fontaine?.contactEmail).toBe('contact@fontaine-le-dun.fr');
      expect(fontaine?.contactQuality?.confidence).toBe('UNDELIVERABLE');
      expect(fontaine?.contactQuality?.isDeadDomain).toBe(true);
      expect(fontaine?.fieldsUnverified).toContain('contactEmail');

      const dunkerque = BIOMETHANE_PLANTS.find(p => p.name === 'Dunkerque');
      expect(dunkerque).toBeDefined();
      expect(dunkerque?.contactQuality?.confidence).toBe('UNDELIVERABLE');
    });

    it('correctly normalizes accented French names to match synthetic domains', () => {
      expect(normalizeToSlug('Étoile-sur-Rhône')).toBe('etoilesurrhone');
      expect(normalizeToSlug('Saint-Étienne-du-Rouvray')).toBe('saintetiennedurouvray');
      expect(normalizeToSlug('Fontaine-le-Dun')).toBe('fontaineledun');

      // Accented name with unaccented synthetic domain
      expect(isDeadOrSyntheticDomain('contact@etoile-sur-rhone.fr', 'Étoile-sur-Rhône')).toBe(true);
      expect(isDeadOrSyntheticDomain('contact@saint-etienne-du-rouvray.fr', 'Saint-Étienne-du-Rouvray')).toBe(true);
    });

    it('detects truncated auto-generated mailboxes on authentic corporate domains', () => {
      const mourenx = BIOMETHANE_PLANTS.find(p => p.name === 'Centrale Biogaz de Mourenx');
      expect(mourenx).toBeDefined();
      expect(mourenx?.contactEmail).toBe('contact.centrale-biogaz-de-m@totalenergies.com');
      expect(isTruncatedInventedMailbox(mourenx!.contactEmail!)).toBe(true);
      expect(mourenx?.contactQuality?.confidence).toBe('UNDELIVERABLE');
      expect(mourenx?.contactQuality?.isInventedMailbox).toBe(true);

      const airLiquide = BIOMETHANE_PLANTS.find(p => p.name === 'Air Liquide Biogaz - Contrisson');
      expect(airLiquide).toBeDefined();
      expect(airLiquide?.contactEmail).toBe('contact.air-liquide-biogaz-c@airliquide.com');
      expect(isTruncatedInventedMailbox(airLiquide!.contactEmail!)).toBe(true);
      expect(airLiquide?.contactQuality?.confidence).toBe('UNDELIVERABLE');

      // Expanded boundary tests: truncated word stems (bioma, methanisati, sa, labess)
      expect(isTruncatedInventedMailbox('contact.veolia-energie-bioma@veolia.com')).toBe(true);
      expect(isTruncatedInventedMailbox('contact.vivescia-methanisati@vivescia.com')).toBe(true);
      expect(isTruncatedInventedMailbox('contact.agriopale-energie-sa@agriopale.fr')).toBe(true);
      expect(isTruncatedInventedMailbox('contact.trifyl-biogaz-labess@trifyl.fr')).toBe(true);

      // Authentic mailboxes are not falsely flagged
      expect(isTruncatedInventedMailbox('contact.biomethane@siaap.fr')).toBe(false);
      expect(isTruncatedInventedMailbox('office@energiepark.at')).toBe(false);
      expect(isTruncatedInventedMailbox('info@natureenergy.com')).toBe(false);
    });

    it('helper isDeadOrSyntheticDomain identifies synthetic name domains correctly', () => {
      expect(isDeadOrSyntheticDomain('contact@fontaine-le-dun.fr', 'Fontaine-le-Dun', 'Fontaine-le-Dun SAS', 'https://www.fontaine-le-dun.fr', 'FR')).toBe(true);
      expect(isDeadOrSyntheticDomain('contact@claye-souilly.fr', 'Claye-Souilly', 'Claye-Souilly SAS', 'https://www.claye-souilly.fr', 'FR')).toBe(true);
      expect(isDeadOrSyntheticDomain('office@energiepark.at', 'Bruck an der Leitha', 'Biogas Bruck GmbH', 'https://www.energiepark.at', 'AT')).toBe(false);
    });
  });

  describe('2. Shared Switchboard, Regional Mismatch & TSO Line Detection (INDIRECT)', () => {
    it('detects the German EnviTec telephone switchboard shared across 86 facilities', () => {
      const envitecPhone = '+49 4442 80160';
      const count = index.phoneCounts.get(envitecPhone);
      expect(count).toBe(86);

      const sample = BIOMETHANE_PLANTS.find(p => p.contactPhone === envitecPhone);
      expect(sample).toBeDefined();
      expect(sample?.contactQuality?.confidence).toBe('INDIRECT');
      expect(sample?.contactQuality?.isSharedPhone).toBe(true);
      expect(sample?.contactQuality?.sharedPhoneCount).toBe(86);
      expect(sample?.contactQuality?.reasons.some(r => r.includes('86 different facilities'))).toBe(true);
    });

    it('detects shared email addresses listed across 5+ plants', () => {
      const envitecEmail = 'info@envitec-biogas.de';
      const count = index.emailCounts.get(envitecEmail);
      expect(count).toBeGreaterThanOrEqual(60);

      const sample = BIOMETHANE_PLANTS.find(p => p.contactEmail === envitecEmail);
      expect(sample).toBeDefined();
      expect(sample?.contactQuality?.confidence).toBe('INDIRECT');
      expect(sample?.contactQuality?.isSharedEmail).toBe(true);
      expect(sample?.contactQuality?.sharedEmailCount).toBe(count);
    });

    it('detects TSO and DSO customer switchboards used as plant contacts', () => {
      const ltPlant = BIOMETHANE_PLANTS.find(p => p.countryCode === 'LT');
      expect(ltPlant).toBeDefined();
      expect(ltPlant?.contactEmail).toContain('@ambergrid.lt');
      expect(ltPlant?.contactQuality?.confidence).toBe('INDIRECT');
      expect(ltPlant?.contactQuality?.reasons.some(r => r.includes('gas TSO/DSO'))).toBe(true);
    });

    it('flags operator vs email domain company mismatches', () => {
      // Verbio plant listing EnviTec email
      const schwedt = BIOMETHANE_PLANTS.find(p => p.name === 'Schwedt (Neuer Hafen)');
      expect(schwedt).toBeDefined();
      expect(schwedt?.operator).toContain('VERBIO');
      expect(schwedt?.contactEmail).toBe('info@envitec-biogas.de');
      expect(isOperatorDomainMismatch(schwedt!.operator, schwedt!.contactEmail)).toBe(true);
      expect(schwedt?.contactQuality?.isOperatorMismatch).toBe(true);
      expect(schwedt?.contactQuality?.confidence).toBe('INDIRECT');

      // Verbio Pinnow listing VNG email
      const pinnow = BIOMETHANE_PLANTS.find(p => p.name === 'Pinnow');
      expect(pinnow).toBeDefined();
      expect(pinnow?.operator).toContain('VERBIO');
      expect(pinnow?.contactEmail).toContain('vng.de');
      expect(isOperatorDomainMismatch(pinnow!.operator, pinnow!.contactEmail)).toBe(true);
      expect(pinnow?.contactQuality?.isOperatorMismatch).toBe(true);
      expect(pinnow?.contactQuality?.confidence).toBe('INDIRECT');
    });

    it('flags operator regional discrepancies (Boden in north Sweden listing Gothenburg wastewater company Gryaab)', () => {
      const boden = BIOMETHANE_PLANTS.find(p => p.name.toLowerCase() === 'boden');
      expect(boden).toBeDefined();
      expect(boden?.operator).toContain('Gryaab');
      expect(boden?.operator).toContain('Göteborg');
      expect(isOperatorRegionalMismatch(boden!.name, boden!.operator)).toBe(true);
      expect(isOperatorDomainMismatch(boden!.operator, boden!.contactEmail, boden!.corporateWebsite, boden!.name)).toBe(true);
      expect(boden?.contactQuality?.confidence).toBe('INDIRECT');
      expect(boden?.contactQuality?.isOperatorMismatch).toBe(true);
      expect(boden?.contactQuality?.reasons.some(r => r.includes('regional discrepancy') || r.includes('distant region'))).toBe(true);
    });

    it('flags Stockholm utility SVOA assigned to plants across non-Stockholm regions', () => {
      expect(isOperatorRegionalMismatch('Gotland', 'Stockholm Vatten och Avfall AB')).toBe(true);
      expect(isOperatorRegionalMismatch('Östersund', 'Stockholm Vatten och Avfall AB')).toBe(true);
      expect(isOperatorRegionalMismatch('Gävle', 'Stockholm Vatten och Avfall AB')).toBe(true);
      expect(isOperatorRegionalMismatch('Henriksdal', 'Stockholm Vatten och Avfall AB')).toBe(false);
    });
  });

  describe('3. GDPR Personal Farmer Mailbox Risk Detection', () => {
    it('flags consumer webmail domains as personal email with GDPR Article 6 alerts', () => {
      expect(isPersonalEmailDomain('gmail.com')).toBe(true);
      expect(isPersonalEmailDomain('skynet.be')).toBe(true);
      expect(isPersonalEmailDomain('wanadoo.fr')).toBe(true);
      expect(isPersonalEmailDomain('orange.fr')).toBe(true);
      expect(isPersonalEmailDomain('t-online.de')).toBe(true);
      expect(isPersonalEmailDomain('shell.com')).toBe(false);

      const personalPlant: BiomethanePlant = {
        id: 'test_farmer_1',
        name: 'Hof Bauer Bioenergie',
        country: 'Germany',
        countryCode: 'DE',
        countryFlag: '🇩🇪',
        provenance: 'Official Test',
        contactEmail: 'bauer.schmidt@gmail.com',
        contactPhone: '+49 171 1234567',
      };

      const quality = evaluatePlantContactQuality(personalPlant);
      expect(quality.isPersonalEmail).toBe(true);
      expect(quality.gdprWarning).toBeDefined();
      expect(quality.gdprWarning).toContain('GDPR Article 6 Alert');
      expect(quality.reasons.some(r => r.includes('GDPR Article 6'))).toBe(true);
    });
  });

  describe('4. Unverified Lead Classification', () => {
    it('classifies non-shared company domains as UNVERIFIED_LEAD rather than verified', () => {
      const bruck = BIOMETHANE_PLANTS.find(p => p.id === 'plant_at_1');
      expect(bruck).toBeDefined();
      expect(bruck?.contactEmail).toBe('office@energiepark.at');
      expect(bruck?.contactQuality?.confidence).toBe('UNVERIFIED_LEAD');
      expect(bruck?.contactQuality?.confidenceLabel).toContain('Unverified Lead');
      expect(bruck?.contactQuality?.reasons.some(r => r.includes('not been verified'))).toBe(true);
    });

    it('never labels any plant contact as fully verified', () => {
      for (const p of BIOMETHANE_PLANTS) {
        // Contact confidence MUST strictly be UNDELIVERABLE, INDIRECT, UNVERIFIED_LEAD, or NO_CONTACT
        const conf = p.contactQuality?.confidence;
        expect(['UNDELIVERABLE', 'INDIRECT', 'UNVERIFIED_LEAD', 'NO_CONTACT']).toContain(conf);
        expect(conf).not.toBe('VERIFIED');
      }
    });
  });

  describe('5. Statutory Official National Registers', () => {
    it('resolves correct official register lookup by country code', () => {
      const de = getOfficialRegisterForCountry('DE', 'VERBIO Schwedt');
      expect(de.registerName).toContain('Marktstammdatenregister');
      expect(de.authority).toContain('Bundesnetzagentur');
      expect(de.url).toContain('marktstammdatenregister.de');
      expect(de.mandatoryForOrigination).toBe(true);

      const dk = getOfficialRegisterForCountry('DK', 'Korskro');
      expect(dk.registerName).toContain('Evida');
      expect(dk.authority).toContain('Energinet');
      expect(dk.url).toContain('evida.dk');

      const at = getOfficialRegisterForCountry('AT', 'Bruck');
      expect(at.registerName).toContain('AGCS');
      expect(at.authority).toContain('Clearing');
      expect(at.url).toContain('agcs.at');

      const fr = getOfficialRegisterForCountry('FR', 'Fontaine-le-Dun');
      expect(fr.registerName).toContain('Annuaire des Entreprises');
      expect(fr.searchUrl).toContain('annuaire-entreprises.data.gouv.fr/rechercher?terme=Fontaine-le-Dun');

      const gb = getOfficialRegisterForCountry('GB', 'Aberdeen AD');
      expect(gb.registerName).toContain('Companies House');
      expect(gb.searchUrl).toContain('find-and-update.company-information.service.gov.uk/search?q=Aberdeen%20AD');

      const nl = getOfficialRegisterForCountry('NL', 'Attero');
      expect(nl.registerName).toContain('VertiCer');
      expect(nl.searchUrl).toContain('kvk.nl/zoeken/?source=all&q=Attero');
    });

    it('buildOfficialRegisterSearchUrl generates query URLs for searchable registers', () => {
      expect(buildOfficialRegisterSearchUrl('FR', 'TotalEnergies Biogaz')).toContain('annuaire-entreprises.data.gouv.fr/rechercher?terme=TotalEnergies%20Biogaz');
      expect(buildOfficialRegisterSearchUrl('GB', 'Future Biogas')).toContain('find-and-update.company-information.service.gov.uk/search?q=Future%20Biogas');
    });
  });

  describe('6. Census-Wide Statistical Invariants (All 1,974 Plants)', () => {
    it('every plant record has an evaluated contactQuality attached', () => {
      expect(BIOMETHANE_PLANTS.length).toBe(1974);
      for (const p of BIOMETHANE_PLANTS) {
        expect(p.contactQuality).toBeDefined();
        expect(p.contactQuality?.confidence).toBeDefined();
        expect(p.contactQuality?.officialRegister).toBeDefined();
        expect(p.dataQuality?.contactConfidence).toBe(p.contactQuality?.confidence);
      }
    });

    it('identifies hundreds of dead domains in France and pan-Europe', () => {
      const undeliverable = BIOMETHANE_PLANTS.filter(p => p.contactQuality?.confidence === 'UNDELIVERABLE');
      const frUndeliverable = undeliverable.filter(p => p.countryCode === 'FR');

      expect(undeliverable.length).toBeGreaterThanOrEqual(300);
      expect(frUndeliverable.length).toBeGreaterThanOrEqual(280);

      for (const p of undeliverable) {
        expect(p.fieldsUnverified).toContain('contactEmail');
      }
    });

    it('identifies ~900+ plants on shared switchboards or utility lines', () => {
      const indirect = BIOMETHANE_PLANTS.filter(p => p.contactQuality?.confidence === 'INDIRECT');
      expect(indirect.length).toBeGreaterThanOrEqual(900);

      for (const p of indirect) {
        expect(
          p.contactQuality?.isSharedEmail ||
          p.contactQuality?.isSharedPhone ||
          p.contactQuality?.isOperatorMismatch ||
          p.contactQuality?.isGridOperatorSwitchboard
        ).toBe(true);
      }
    });

    it('leaves a disciplined tranche of unverified leads that require desk verification', () => {
      const undeliverable = BIOMETHANE_PLANTS.filter(p => p.contactQuality?.confidence === 'UNDELIVERABLE');
      const indirect = BIOMETHANE_PLANTS.filter(p => p.contactQuality?.confidence === 'INDIRECT');
      const unverifiedLeads = BIOMETHANE_PLANTS.filter(p => p.contactQuality?.confidence === 'UNVERIFIED_LEAD');
      console.log('REVISED COUNTS:', {
        undeliverable: undeliverable.length,
        indirect: indirect.length,
        unverifiedLeads: unverifiedLeads.length,
      });
      expect(unverifiedLeads.length).toBeGreaterThanOrEqual(200);
      expect(unverifiedLeads.length).toBeLessThanOrEqual(800);
    });

    it('ensures all raw census emails and phones are marked unverified in fieldsUnverified', () => {
      for (const p of BIOMETHANE_PLANTS) {
        if (p.contactEmail) {
          expect(p.fieldsUnverified).toContain('contactEmail');
        }
        if (p.contactPhone) {
          expect(p.fieldsUnverified).toContain('contactPhone');
        }
      }
    });
  });
});
