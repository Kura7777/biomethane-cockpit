import { describe, it, expect } from 'vitest';
import { computeEts2Exposure, ets2AvoidedValuePerNcvMWh, Ets2ExposureInputs } from '../ets2/calculator';
import { ETS2_COUNTRIES, applyEts2CountryImport, rankEts2CountryExposure } from '../ets2/countries';
import { ETS_NATURAL_GAS_TCO2_PER_MWH } from '../netback/engine';
import { HHV_TO_LHV_FACTOR } from '../offtake/engine';

const base: Ets2ExposureInputs = {
  annualGasMWh: 10_000,
  volumeBasis: 'NCV',
  ets2PriceEurPerT: 50,
  existingCarbonPriceEurPerT: null,
  passThroughShare: 1,
  biomethaneShare: 1,
  biomethanePremiumEurPerMWh: 5,
};

describe('ETS2 exposure calculator', () => {
  it('prices emissions with the MRR natural gas factor on an NCV basis', () => {
    const r = computeEts2Exposure(base);
    expect(r.emissionsTco2).toBeCloseTo(10_000 * ETS_NATURAL_GAS_TCO2_PER_MWH, 6);
    expect(r.supplierAllowanceCostEur).toBeCloseTo(10_000 * ETS_NATURAL_GAS_TCO2_PER_MWH * 50, 6);
    expect(r.clientEts2CostEur).toBeCloseTo(r.supplierAllowanceCostEur as number, 6);
  });

  it('converts invoice (GCV) volumes to NCV before applying the emission factor', () => {
    const r = computeEts2Exposure({ ...base, volumeBasis: 'GCV' });
    expect(r.ncvMWh).toBeCloseTo(10_000 * HHV_TO_LHV_FACTOR, 6);
    expect(r.emissionsTco2).toBeCloseTo(10_000 * HHV_TO_LHV_FACTOR * ETS_NATURAL_GAS_TCO2_PER_MWH, 6);
  });

  it('takes the avoided value per MWh from the single pricing authority', () => {
    expect(ets2AvoidedValuePerNcvMWh(50)).toBeCloseTo(ETS_NATURAL_GAS_TCO2_PER_MWH * 50, 6);
    const r = computeEts2Exposure(base);
    expect(r.breakevenPremiumEurPerMWh).toBeCloseTo(ETS_NATURAL_GAS_TCO2_PER_MWH * 50, 6);
  });

  it('nets the biomethane premium against avoided allowances', () => {
    const r = computeEts2Exposure(base);
    const avoided = 10_000 * ETS_NATURAL_GAS_TCO2_PER_MWH * 50;
    expect(r.avoidedCostEur).toBeCloseTo(avoided, 6);
    expect(r.netSavingEur).toBeCloseTo(avoided - 10_000 * 5, 6);
  });

  it('scales client cost and savings by pass-through and switched share', () => {
    const r = computeEts2Exposure({ ...base, passThroughShare: 0.5, biomethaneShare: 0.25 });
    expect(r.clientEts2CostEur).toBeCloseTo((r.supplierAllowanceCostEur as number) / 2, 6);
    expect(r.biomethaneMWh).toBe(2_500);
    expect(r.avoidedCostEur).toBeCloseTo(2_500 * ETS_NATURAL_GAS_TCO2_PER_MWH * 50 / 2, 6);
  });

  it('reports the change versus an existing national carbon price, which can be negative', () => {
    const r = computeEts2Exposure({ ...base, existingCarbonPriceEurPerT: 60 });
    expect(r.incrementalCostEur).toBeCloseTo(10_000 * ETS_NATURAL_GAS_TCO2_PER_MWH * (50 - 60), 6);
    expect(r.incrementalCostEur as number).toBeLessThan(0);
  });

  it('shows nothing rather than a default when the volume or price is missing', () => {
    const noPrice = computeEts2Exposure({ ...base, ets2PriceEurPerT: null });
    expect(noPrice.clientEts2CostEur).toBeNull();
    expect(noPrice.missingInputs).toContain('ETS2 price scenario');
    const noGas = computeEts2Exposure({ ...base, annualGasMWh: null });
    expect(noGas.emissionsTco2).toBeNull();
  });

  it('leaves the net saving unset until a premium is quoted', () => {
    const r = computeEts2Exposure({ ...base, biomethanePremiumEurPerMWh: null });
    expect(r.netSavingEur).toBeNull();
    expect(r.avoidedCostEur).not.toBeNull();
    expect(r.missingInputs).toContain('biomethane premium quote');
  });
});

describe('ETS2 country exposure', () => {
  it('lists all 27 EU member states with no volume invented', () => {
    expect(ETS2_COUNTRIES).toHaveLength(27);
    expect(ETS2_COUNTRIES.every(c => c.gasBuildingsTWh === null)).toBe(true);
  });

  it('rejects imported volumes without a source URL', () => {
    const res = applyEts2CountryImport(ETS2_COUNTRIES, JSON.stringify([{ iso: 'IT', gasBuildingsTWh: 100 }]));
    expect(res.applied).toBe(0);
    expect(res.errors[0]).toMatch(/gasSourceUrl/);
  });

  it('ranks imported countries by emissions and computes cost at the scenario price', () => {
    const json = JSON.stringify([
      { iso: 'IT', gasBuildingsTWh: 200, gasVolumeBasis: 'NCV', gasSourceUrl: 'https://example.org/it' },
      { iso: 'NL', gasBuildingsTWh: 100, gasVolumeBasis: 'NCV', gasSourceUrl: 'https://example.org/nl' },
    ]);
    const { countries, applied } = applyEts2CountryImport(ETS2_COUNTRIES, json);
    expect(applied).toBe(2);
    const rows = rankEts2CountryExposure(countries, 50);
    expect(rows[0].profile.iso).toBe('IT');
    expect(rows[0].rank).toBe(1);
    expect(rows[1].profile.iso).toBe('NL');
    expect(rows[0].ets2CostEurM).toBeCloseTo(200 * ETS_NATURAL_GAS_TCO2_PER_MWH * 50, 6);
    expect(rows[2].rank).toBeNull();
  });
});

import { ETS2_SEED_COMPANIES, applyEts2CompanyImport, computeCompanyExposure } from '../ets2/companies';

describe('ETS2 company directory', () => {
  it('sources every seeded company, and only disclosed volumes carry a volume', () => {
    expect(ETS2_SEED_COMPANIES.length).toBeGreaterThan(40);
    for (const c of ETS2_SEED_COMPANIES) {
      expect(c.evidence.length, c.name).toBeGreaterThan(0);
      expect(c.evidence.every(e => e.url.startsWith('https://')), c.name).toBe(true);
      if (c.gasVolumeTWh !== null) {
        expect(c.evidence.some(e => e.type === 'COMPANY_DISCLOSURE' || e.type === 'REGULATOR_MARKET_REPORT' || e.type === 'SECONDARY_SOURCE'), c.name).toBe(true);
      }
      if (c.marketSharePct !== null) expect(c.shareBasis, c.name).not.toBeNull();
    }
    expect(new Set(ETS2_SEED_COMPANIES.map(c => c.id)).size).toBe(ETS2_SEED_COMPANIES.length);
  });

  it('does not use a customer-count share as a volume share', () => {
    const total = ETS2_SEED_COMPANIES.find(c => c.id === 'es-totalenergies')!;
    expect(total.marketSharePct).toBeNull();
  });

  it('uses disclosed volumes directly and leaves share-only companies blank until the country volume is loaded', () => {
    const rows = computeCompanyExposure(ETS2_SEED_COMPANIES, ETS2_COUNTRIES, 50);
    const engie = rows.find(r => r.company.id === 'fr-engie')!;
    expect(engie.volumeMethod).toBe('DISCLOSED');
    expect(engie.ets2CostEurM).toBeCloseTo(120 * 0.901 * ETS_NATURAL_GAS_TCO2_PER_MWH * 50, 6);
    const edison = rows.find(r => r.company.id === 'it-edison')!;
    expect(edison.ets2CostEurM).toBeNull();
  });

  it('estimates exposure as market share of the national building-gas volume', () => {
    const { countries } = applyEts2CountryImport(
      ETS2_COUNTRIES,
      JSON.stringify([{ iso: 'IT', gasBuildingsTWh: 100, gasVolumeBasis: 'NCV', gasSourceUrl: 'https://example.org/it' }])
    );
    const edison = computeCompanyExposure(ETS2_SEED_COMPANIES, countries, 50).find(r => r.company.id === 'it-edison')!;
    expect(edison.volumeMethod).toBe('SHARE_OF_NATIONAL');
    expect(edison.volumeTWh).toBeCloseTo(16.8, 6);
    expect(edison.ets2CostEurM).toBeCloseTo(16.8 * ETS_NATURAL_GAS_TCO2_PER_MWH * 50, 6);
  });

  it('prefers a disclosed company volume over the share estimate', () => {
    const { companies } = applyEts2CompanyImport(
      ETS2_SEED_COMPANIES,
      JSON.stringify([{ id: 'it-edison', name: 'Edison', countryIso: 'IT', gasVolumeTWh: 40, gasVolumeBasis: 'NCV', evidenceUrl: 'https://example.org/edison' }])
    );
    const edison = computeCompanyExposure(companies, ETS2_COUNTRIES, 50).find(r => r.company.id === 'it-edison')!;
    expect(edison.volumeMethod).toBe('DISCLOSED');
    expect(edison.volumeTWh).toBe(40);
  });

  it('rejects imported companies without evidence', () => {
    const res = applyEts2CompanyImport(ETS2_SEED_COMPANIES, JSON.stringify([{ name: 'Acme Gas', countryIso: 'NL' }]));
    expect(res.applied).toBe(0);
    expect(res.errors[0]).toMatch(/evidence/);
  });
});
