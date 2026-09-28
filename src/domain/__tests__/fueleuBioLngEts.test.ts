import { describe, it, expect } from 'vitest';
import { calculateMarineBunkerQuotation, lngEtsNonCo2Co2eTonnes } from '../fueleu/calculator';

// EU ETS zero-rates only the CO2 from sustainable biomass; methane slip and N2O are surrendered for
// Bio-LNG exactly as for fossil LNG in the same engine, from 2026.
describe('Bio-LNG bunker quote: ETS on methane slip', () => {
  const base = { bioLngCi: -100, lngEngineType: 'LNG_OTTO_MS' as const, euaPriceEurPerTonne: 70, bioLngVolumeTonnes: 1000 };

  it('charges Bio-LNG ETS on its own slip and N2O from 2026', () => {
    const q = calculateMarineBunkerQuotation({ ...base, targetYear: 2026 });
    expect(q.bioLngEtsLiabilityEur).toBeCloseTo(lngEtsNonCo2Co2eTonnes(1, 'LNG_OTTO_MS') * 70, 2);
    expect(q.bioLngEtsLiabilityEur).toBeGreaterThan(0);
    expect(q.netSavingsPerTonneBioLngEur).toBeCloseTo(
      q.totalConventionalAlternativeCostEur - q.allInBioLngPriceEurPerTonne - q.bioLngEtsLiabilityEur + q.fuelEuSurplusValueEurPerTonne, 1);
  });

  it('has no Bio-LNG ETS before CH4/N2O enter the ETS (2025)', () => {
    const q = calculateMarineBunkerQuotation({ ...base, targetYear: 2025 });
    expect(q.bioLngEtsLiabilityEur).toBe(0);
  });
});
