import { describe, it, expect } from 'vitest';
import { verifyQuoteAgainstVault, extractQuoteProofsFromText } from '../verifier';
import { queryAuditor } from '../geminiClient';
import { TradeAuditContext, normalizeAuditorTab, normalizeTradeAuditContext } from '../types';

describe('Closed-Domain Statutory Compliance Auditor', () => {
  it('strictly verifies verbatim quotes against the local knowledge vault', () => {
    const validQuote = 'Greenhouse gas emissions savings from biofuels, bioliquids and biomass fuels shall be at least 70%';
    const check = verifyQuoteAgainstVault(validQuote);
    expect(check.verified).toBe(true);
    expect(check.matchedDoc?.id).toBe('red_iii_directive');
  });

  it('rejects hallucinated or unverified quotes that do not exist in the vault', () => {
    const fakeQuote = 'All biomethane producers in Europe shall receive a bonus of 500 euros per megawatt hour.';
    const check = verifyQuoteAgainstVault(fakeQuote);
    expect(check.verified).toBe(false);
  });

  it('extracts and flags quote proofs from raw text', () => {
    const sampleText = 'According to "Article 29(10)(d): Greenhouse gas emissions savings from biofuels, bioliquids and biomass fuels shall be at least 70% for electricity, heating and cooling" installations must comply.';
    const proofs = extractQuoteProofsFromText(sampleText);
    expect(proofs.length).toBeGreaterThan(0);
    expect(proofs[0].isVerbatimVerified).toBe(true);
  });

  it('normalizes legacy and alternate auditor tabs accurately', () => {
    expect(normalizeAuditorTab('gates')).toBe('GATE_BREAKDOWN');
    expect(normalizeAuditorTab('breakdown')).toBe('GATE_BREAKDOWN');
    expect(normalizeAuditorTab('efet')).toBe('EFET_SCHEDULE');
    expect(normalizeAuditorTab('remedies')).toBe('EFET_SCHEDULE');
    expect(normalizeAuditorTab('qa')).toBe('DOSSIER_QA');
    expect(normalizeAuditorTab('search')).toBe('DOSSIER_QA');
    expect(normalizeAuditorTab('settings')).toBe('SETTINGS');
    expect(normalizeAuditorTab('api')).toBe('SETTINGS');
    expect(normalizeAuditorTab(undefined)).toBe('GATE_BREAKDOWN');
  });

  it('normalizes raw deal context with legacy property names without data loss', () => {
    const raw = {
      originCountry: 'nl',
      destinationMarket: 'MARITIME_FUELEU',
      feedstock: 'manure',
      ghgIntensity: -100,
      volumeMWh: 35000,
    };
    const norm = normalizeTradeAuditContext(raw);
    expect(norm.originCountry).toBe('NL');
    expect(norm.targetMarketId).toBe('MARITIME_FUELEU');
    expect(norm.feedstockCategory).toBe('manure');
    expect(norm.carbonIntensity).toBe(-100);
    expect(norm.annualVolumeMWh).toBe(35000);
  });

  it('deterministic offline audit flags Great Britain gas grid injection to EU UDB markets as REJECTED', async () => {
    const invalidGbTrade: TradeAuditContext = {
      originCountry: 'GB',
      targetMarketId: 'DE_THG',
      feedstockCategory: 'MANURE_SLURRY',
      carbonIntensity: -80,
      annualVolumeMWh: 50000,
      deliveredValueEurMwh: 85.0
    };

    const res = await queryAuditor('Audit trade', invalidGbTrade);
    expect(res.verdict).toBe('REJECTED');
    const udbCheck = res.checks.find(c => c.gateName.includes('UDB'));
    expect(udbCheck?.status).toBe('FAIL');
  });

  it('deterministic offline audit flags High CI crops (> 32.9) into transport quota markets as REJECTED', async () => {
    const highCiTrade: TradeAuditContext = {
      originCountry: 'DE',
      targetMarketId: 'DE_THG',
      feedstockCategory: 'ENERGY_CROPS',
      carbonIntensity: 45.0, // Fails 65% savings threshold
      annualVolumeMWh: 30000,
      deliveredValueEurMwh: 72.0
    };

    const res = await queryAuditor('Audit trade', highCiTrade);
    expect(res.verdict).toBe('REJECTED');
    const ghgCheck = res.checks.find(c => c.gateName.includes('GHG'));
    expect(ghgCheck?.status).toBe('FAIL');
  });

  it('deterministic offline audit approves compliant negative-CI Danish manure to German THG', async () => {
    const compliantTrade: TradeAuditContext = {
      originCountry: 'DK',
      targetMarketId: 'DE_THG',
      feedstockCategory: 'MANURE_SLURRY',
      carbonIntensity: -85.0,
      annualVolumeMWh: 100000,
      deliveredValueEurMwh: 92.5
    };

    const res = await queryAuditor('Audit trade', compliantTrade);
    expect(res.verdict).toBe('APPROVED');
    expect(res.checks.every(c => c.status === 'PASS')).toBe(true);
  });

  it('deterministic offline audit flags delivered netbacks exceeding French CPB €100.00 ceiling', async () => {
    const overCeilingTrade: TradeAuditContext = {
      originCountry: 'FR',
      targetMarketId: 'FR_CPB',
      feedstockCategory: 'AGRICULTURAL_RESIDUES',
      carbonIntensity: 12.0,
      annualVolumeMWh: 40000,
      deliveredValueEurMwh: 108.50 // Exceeds €100.00/MWh ceiling
    };

    const res = await queryAuditor('Audit trade', overCeilingTrade);
    const ceilingCheck = res.checks.find(c => c.gateName.includes('Ceiling'));
    expect(ceilingCheck?.status).toBe('FLAG');
  });

  it('enforces UK_RGGO Great Britain gas grid boundary (non-UK origin blocked)', async () => {
    const nonUkRggoTrade: TradeAuditContext = {
      originCountry: 'NL',
      targetMarketId: 'UK_RGGO',
      feedstockCategory: 'AGRICULTURAL_RESIDUES',
      carbonIntensity: 15.0,
      annualVolumeMWh: 20000,
      deliveredValueEurMwh: 45.0
    };

    const res = await queryAuditor('Audit trade', nonUkRggoTrade);
    expect(res.verdict).toBe('REJECTED');
    const rggoCheck = res.checks.find(c => c.gateName.includes('RGGO'));
    expect(rggoCheck?.status).toBe('FAIL');
  });

  it('exempts voluntary Scope 1 markets from RED III 65% transport GHG threshold', async () => {
    const voluntaryCropTrade: TradeAuditContext = {
      originCountry: 'DE',
      targetMarketId: 'VOL_SCOPE1',
      feedstockCategory: 'ENERGY_CROPS',
      carbonIntensity: 42.0,
      annualVolumeMWh: 15000,
      deliveredValueEurMwh: 65.0
    };

    const res = await queryAuditor('Audit trade', voluntaryCropTrade);
    expect(res.verdict).toBe('APPROVED');
    const ghgCheck = res.checks.find(c => c.gateName.includes('GHG'));
    expect(ghgCheck?.status).toBe('PASS');
  });
});
