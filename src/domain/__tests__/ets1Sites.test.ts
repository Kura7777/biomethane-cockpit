import { describe, it, expect } from 'vitest';
import {
  ETS1_SITES,
  ETS1_LATEST_YEAR,
  classifySector,
  groupSitesByCompany,
  ets1AvoidedValuePerMWh,
  biomethaneMWhToAbate,
} from '../ets1/sites';
import { ETS_NATURAL_GAS_TCO2_PER_MWH } from '../netback/engine';
import { MarksState } from '../netback/types';

describe('ETS1 industrial sites (EUTL)', () => {
  it('loads thousands of stationary installations with positive verified emissions and no UK sites', () => {
    expect(ETS1_SITES.length).toBeGreaterThan(7000);
    expect(ETS1_LATEST_YEAR).toBeGreaterThanOrEqual(2023);
    expect(ETS1_SITES.every(s => s.verifiedLatestTco2 > 0)).toBe(true);
    expect(ETS1_SITES.some(s => s.country === 'GB')).toBe(false);
    expect(new Set(ETS1_SITES.map(s => s.id)).size).toBe(ETS1_SITES.length);
  });

  it('classifies sectors from activity and NACE codes', () => {
    expect(classifySector(20, '10.81')).toBe('FOOD_BEVERAGE');
    expect(classifySector(20, '21.10')).toBe('PHARMA');
    expect(classifySector(29, '23.51')).toBe('CEMENT_LIME');
    expect(classifySector(24, '24.10')).toBe('METALS');
    expect(classifySector(31, '23.13')).toBe('GLASS_CERAMICS');
    expect(classifySector(20, '35.11')).toBe('POWER_HEAT');
    expect(classifySector(21, '19.20')).toBe('REFINING_OIL_GAS');
  });

  it('groups sites by parent company (else operator) and sums emissions', () => {
    const companies = groupSitesByCompany(ETS1_SITES);
    const total = ETS1_SITES.reduce((s, x) => s + x.verifiedLatestTco2, 0);
    expect(companies.reduce((s, c) => s + c.verifiedLatestTco2, 0)).toBe(total);
    expect(companies.length).toBeLessThan(ETS1_SITES.length);
    for (const c of companies.slice(0, 50)) {
      expect(c.fitVerifiedLatestTco2).toBeLessThanOrEqual(c.verifiedLatestTco2);
    }
  });

  it('values avoided allowances through the pricing authority from the EU_ETS1 mark', () => {
    const marks: MarksState = {
      marks: { EU_ETS1: { marketId: 'EU_ETS1', bid: 70, offer: 70, mid: 70, updatedAt: null, source: 'test' } },
      gasIndex: { bid: null, offer: null, mid: null, updatedAt: null },
      fx: { gbpEur: null, chfEur: null, updatedAt: null },
      pricingSides: { certificateSide: 'mid', moleculeSide: 'mid' },
    };
    expect(ets1AvoidedValuePerMWh(marks)).toBeCloseTo(70 * ETS_NATURAL_GAS_TCO2_PER_MWH, 6);
    expect(ets1AvoidedValuePerMWh({ ...marks, marks: {} })).toBeNull();
  });

  it('converts tonnes to abate into biomethane MWh with the MRR gas factor', () => {
    expect(biomethaneMWhToAbate(ETS_NATURAL_GAS_TCO2_PER_MWH * 1000)).toBeCloseTo(1000, 6);
  });
});

import { EEA_VERIFIED_2023_BY_COUNTRY } from './fixtures/eeaVerified2023';

describe('ETS1 site data reconciles with the official EEA country totals (2023)', () => {
  const byCountry: Record<string, number> = {};
  for (const s of ETS1_SITES) byCountry[s.country] = (byCountry[s.country] ?? 0) + s.verifiedLatestTco2;

  it('matches the EU-wide total within 0.5%', () => {
    const official = Object.values(EEA_VERIFIED_2023_BY_COUNTRY).reduce((a, b) => a + b, 0);
    const app = Object.values(byCountry).reduce((a, b) => a + b, 0);
    expect(Math.abs(app - official) / official).toBeLessThan(0.005);
  });

  it('matches every country within 2% (registry corrections between extractions)', () => {
    for (const [cc, official] of Object.entries(EEA_VERIFIED_2023_BY_COUNTRY)) {
      const app = byCountry[cc] ?? 0;
      expect(Math.abs(app - official) / official, cc).toBeLessThan(0.02);
    }
  });
});

describe('ETS1 placeholder parents', () => {
  it('treats placeholder parent names as no parent, so unrelated operators are not grouped', async () => {
    const { isPlaceholderParent, ETS1_SITES, groupSitesByCompany } = await import('../ets1/sites');
    for (const p of ['xx', 'XX', 'n.a.', 'na', '/', '0', 'no']) expect(isPlaceholderParent(p)).toBe(true);
    for (const p of ['RWE AG', 'ΔΕΗ', '현대자동차', 'ENI', 'CEZ']) expect(isPlaceholderParent(p)).toBe(false);
    const names = groupSitesByCompany(ETS1_SITES).map(c => c.name.trim().toLowerCase());
    for (const junk of ['xx', 'n.a.', 'na', 'nn', '/', '0']) expect(names).not.toContain(junk);
  });
});
