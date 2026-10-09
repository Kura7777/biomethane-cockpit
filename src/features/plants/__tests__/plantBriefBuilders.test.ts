import { describe, it, expect } from 'vitest';
import {
  buildPlantOriginationBrief,
  formatExternalUrl,
  getBestResearchContact
} from '../plantBriefBuilders';
import { BiomethanePlant } from '../../../domain/plants/types';

describe('plantBriefBuilders', () => {
  const mockPlant: BiomethanePlant = {
    id: 'DE-BIO-001',
    name: 'Königs Wusterhausen Biogas',
    country: 'Germany',
    countryCode: 'DE',
    countryFlag: '🇩🇪',
    operator: 'Danpower Energie GmbH',
    legalEntityName: 'Danpower Biogas KW GmbH',
    annualEnergyGWh: 75,
    capacityNm3h: 700,
    primaryFeedstockCategory: 'Agricultural Biomass',
    feedstockDetails: 'Maize silage, cattle manure',
    gridConnectionType: 'Transmission Grid Injection',
    networkOperator: 'ONTRAS Gastransport GmbH',
    upgradingTechnology: 'Amine wash',
    commissioningYear: 2018,
    contactEmail: 'info@danpower.de',
    contactPhone: '+49 3375 12345',
    corporateWebsite: 'www.danpower.de',
    headquartersAddress: 'Potsdamer Str. 1, Berlin',
    latitude: 52.3,
    longitude: 13.6,
  };

  it('builds an authentic origination brief string with all parameters', () => {
    const brief = buildPlantOriginationBrief(mockPlant, -100);
    expect(brief).toContain('=== BIOMETHANE ASSET ORIGINATION BRIEF ===');
    expect(brief).toContain('Facility: Königs Wusterhausen Biogas (DE 🇩🇪)');
    expect(brief).toContain('Plant ID: DE-BIO-001');
    expect(brief).toContain('Annual Capacity: 75 GWh/y (75,000 MWh/y) (700 Nm³/h)');
    expect(brief).toContain('Carbon Intensity: -100 gCO2e/MJ (RED III Annex IX)');
    expect(brief).toContain('Operating Entity: Danpower Energie GmbH');
  });

  it('tags unverified fields accurately', () => {
    const brief = buildPlantOriginationBrief(
      { ...mockPlant, fieldsUnverified: ['legalEntityName', 'contactEmail'] },
      15
    );
    expect(brief).toContain('Legal Entity: Danpower Biogas KW GmbH [UNVERIFIED]');
    expect(brief).toContain('Contact Email: info@danpower.de [UNVERIFIED]');
    expect(brief).not.toContain('Operating Entity: Danpower Energie GmbH [UNVERIFIED]');
  });

  it('formats external URLs correctly', () => {
    expect(formatExternalUrl('www.danpower.de')).toBe('https://www.danpower.de');
    expect(formatExternalUrl('https://danpower.de')).toBe('https://danpower.de');
    expect(formatExternalUrl('http://insecure.de')).toBe('http://insecure.de');
    expect(formatExternalUrl(undefined)).toBe('');
  });

  it('evaluates and prioritizes verified research contacts', () => {
    const researchContacts = {
      contacts: [
        {
          type: 'GENERIC_EMAIL' as const,
          value: 'general@company.com',
          contactScope: 'GENERAL_OR_PRESS' as const,
          check: { status: 'VERIFIED' as const }
        },
        {
          type: 'SALES_OR_ENERGY_EMAIL' as const,
          value: 'origination@company.com',
          contactScope: 'PARENT_COMMERCIAL' as const,
          check: { status: 'VERIFIED' as const }
        },
      ]
    };
    const best = getBestResearchContact(researchContacts);
    expect(best.isVerified).toBe(true);
    expect(best.text).toBe('SALES_OR_ENERGY_EMAIL: origination@company.com');
  });
});
