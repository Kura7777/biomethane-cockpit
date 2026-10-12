import { describe, it, expect, beforeEach } from 'vitest';
import {
  saveDeskRule,
  getDeskRules,
  deleteDeskRule,
  clearDeskRules,
  logDealToJournal,
  getDealJournal,
  searchDeskMemory,
  formatDeskMemoryForPrompt,
  exportDeskMemoryJson,
  importDeskMemoryJson,
} from '../deskMemory';

describe('Persistent Desk Memory & Continuous Learning Engine', () => {
  beforeEach(() => {
    clearDeskRules();
  });

  it('saves and retrieves custom trading rules', () => {
    const saved = saveDeskRule({
      category: 'counterparty',
      subject: 'Shell',
      rule: 'Will not accept biomethane with CI higher than -50 gCO2eq/MJ.',
    });

    expect(saved.id).toBeDefined();
    expect(saved.subject).toBe('Shell');
    expect(saved.category).toBe('counterparty');

    const rules = getDeskRules();
    expect(rules.length).toBe(1);
    expect(rules[0].subject).toBe('Shell');
  });

  it('deletes a custom rule by id', () => {
    const r1 = saveDeskRule({
      category: 'market',
      subject: 'DE_THG',
      rule: 'Surrender deadline strictly April 15 of year N+1.',
    });
    expect(getDeskRules().length).toBe(1);

    const deleted = deleteDeskRule(r1.id);
    expect(deleted).toBe(true);
    expect(getDeskRules().length).toBe(0);
  });

  it('logs deals to the deal journal and searches them', () => {
    logDealToJournal({
      dealTitle: 'DK Manure to DE THG 2026',
      originCountry: 'DK',
      destinationMarket: 'DE_THG',
      feedstock: 'MANURE_SLURRY',
      carbonIntensity: -85,
      volumeMWh: 50000,
      deliveredPriceEurMwh: 92.5,
      netbackMarginEurMwh: 14.2,
      keyRisksOrNotes: 'High margin, requires bilateral UDB batch transfer.',
    });

    const journal = getDealJournal();
    expect(journal.length).toBeGreaterThan(0);
    expect(journal[0].originCountry).toBe('DK');

    const search = searchDeskMemory('manure');
    expect(search.deals.length).toBeGreaterThan(0);
    expect(search.deals[0].dealTitle).toBe('DK Manure to DE THG 2026');
  });

  it('formats desk memory into compact prompt text', () => {
    saveDeskRule({
      category: 'counterparty',
      subject: 'Eni',
      rule: 'Requires certified raw slurry substrate.',
    });

    const formatted = formatDeskMemoryForPrompt('Eni');
    expect(formatted).toContain('CUSTOM TRADING RULES');
    expect(formatted).toContain('Eni');
    expect(formatted).toContain('Requires certified raw slurry substrate');
  });

  it('exports and imports desk memory as JSON', () => {
    saveDeskRule({
      category: 'tariff',
      subject: 'Danish Energinet exit',
      rule: 'Fixed tariff €1.20/MWh at border interconnectors.',
    });

    const json = exportDeskMemoryJson();
    expect(json).toContain('Danish Energinet exit');

    clearDeskRules();
    expect(getDeskRules().length).toBe(0);

    const imported = importDeskMemoryJson(json);
    expect(imported).toBe(true);
    expect(getDeskRules().length).toBe(1);
    expect(getDeskRules()[0].subject).toBe('Danish Energinet exit');
  });
});
