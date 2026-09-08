import { describe, it, expect } from 'vitest';
import { BIOMETHANE_PLANTS } from '../plants/plantsData';
import { buildDealUrl, parseDealParams } from '../trade/dealParams';

describe('Origination Pipeline & Fleet Enrichment Integrity', () => {
  it('enriches French fleet from authentic ODRE open data with variable commissioning dates', () => {
    const frPlants = BIOMETHANE_PLANTS.filter(p => p.countryCode === 'FR');
    expect(frPlants.length).toBeGreaterThanOrEqual(800);

    // Commissioning years must vary (not constant 2021)
    const commYears = new Set(frPlants.map(p => p.commissioningYear).filter(Boolean));
    expect(commYears.size).toBeGreaterThanOrEqual(5);

    // TSO/DSO network operators must be authentic French operators
    const networkOps = new Set(frPlants.map(p => p.networkOperator).filter(Boolean));
    expect(networkOps.has('GRDF') || networkOps.has('GRTgaz') || networkOps.has('Teréga')).toBe(true);

    // Provenance must cite ODRE / GRTgaz
    const sample = frPlants[0];
    expect(sample.provenance).toContain('ODRE');
    expect(sample.isVerified).toBe(true);
  });

  it('correctly models German Post-EEG 2027 subsidy cliff attributes', () => {
    const dePlants = BIOMETHANE_PLANTS.filter(p => p.countryCode === 'DE');
    expect(dePlants.length).toBe(282);

    // Every German plant must have EEG scheme
    const eegPlants = dePlants.filter(p => p.supportScheme === 'EEG');
    expect(eegPlants.length).toBe(282);

    // Must have expiry dates
    const withExpiry = dePlants.filter(p => Boolean(p.supportExpiryDate));
    expect(withExpiry.length).toBe(282);

    // Manure assets must have negative carbon intensity
    const manurePlants = dePlants.filter(p => (p.primaryFeedstockCategory || '').toLowerCase().includes('manure'));
    expect(manurePlants.length).toBeGreaterThan(20);
    for (const p of manurePlants) {
      expect(p.verifiedCarbonIntensity).toBeLessThan(-50);
    }
  });

  it('1-click deal structuring generates compliant trade URLs for Trade Builder', () => {
    const deManurePlant = BIOMETHANE_PLANTS.find(p => p.countryCode === 'DE' && (p.primaryFeedstockCategory || '').toLowerCase().includes('manure'))!;
    expect(deManurePlant).toBeDefined();

    const url = buildDealUrl({
      plantId: deManurePlant.id,
      plantName: deManurePlant.name,
      originCountry: 'DE',
      volume: 54000,
      feedstock: 'manure',
      ci: deManurePlant.verifiedCarbonIntensity ?? -84.2,
      marketId: 'DE_THG',
      scheme: 'ISCC_EU',
    });

    expect(url).toContain('/trade?');
    expect(url).toContain('originCountry=DE');
    expect(url).toContain('feedstock=manure');
    expect(url).toContain('marketId=DE_THG');

    // Parse back
    const searchParams = new URLSearchParams(url.split('?')[1]);
    const parsed = parseDealParams(searchParams);
    expect(parsed.originCountry).toBe('DE');
    expect(parsed.feedstock).toBe('manure');
    expect(parsed.marketId).toBe('DE_THG');
    expect(parsed.ci).toBeLessThan(-50);
  });
});
