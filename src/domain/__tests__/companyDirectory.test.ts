import { describe, it, expect } from 'vitest';
import { normalizeCompanyName, leadingToken } from '../companies/normalize';
import { buildCompanyDirectory, suggestRelated } from '../companies/directory';
import { FUEL_EU_SHIPPING_GROUPS } from '../fueleu/groups';
import { ETS1_SITES, groupSitesByCompany } from '../ets1/sites';
import { ETS2_SEED_COMPANIES, CLEAN_HEAT_PROGRAM_LEADS } from '../ets2/companies';

describe('company-name normalisation', () => {
  it('treats legal-form spellings as the same company', () => {
    expect(normalizeCompanyName('ENGIE ITALIA S.p.A')).toBe('engie italia');
    expect(normalizeCompanyName('Engie Italia S.p.A.')).toBe('engie italia');
    expect(normalizeCompanyName('EDISON SPA')).toBe('edison');
    expect(normalizeCompanyName('Edison S.p.A. (Edison Energia)')).toBe('edison');
    expect(normalizeCompanyName('PGNiG Obrót Detaliczny sp. z o.o.')).toBe('pgnig obrot detaliczny');
    expect(normalizeCompanyName('Teplárna Kladno s.r.o.')).toBe('teplarna kladno');
    expect(normalizeCompanyName('Shell Nederland B.V.')).toBe('shell nederland');
  });

  it('keeps letters that accent-stripping would otherwise break', () => {
    expect(normalizeCompanyName('Fritz Winter Eisengießerei GmbH & Co. KG')).toBe('fritz winter eisengiesserei');
    expect(normalizeCompanyName('Ørsted A/S')).toBe('orsted');
  });

  it('strips legal forms only from the end, so the name itself survives', () => {
    expect(normalizeCompanyName('Group Hera')).toBe('group hera');
    expect(normalizeCompanyName('AG')).toBe('ag');
  });

  it('does not merge different companies that share a word', () => {
    expect(normalizeCompanyName('ENGIE Italia')).not.toBe(normalizeCompanyName('ENGIE Deutschland'));
    expect(leadingToken('ENGIE Italia S.p.A.')).toBe('engie');
  });
});

describe('company directory', () => {
  const directory = buildCompanyDirectory();

  it('carries every record from every market exactly once', () => {
    const fueleu = directory.reduce((n, p) => n + p.fueleu.length, 0);
    const ets1 = directory.reduce((n, p) => n + p.ets1.length, 0);
    const ets2 = directory.reduce((n, p) => n + p.ets2.length, 0);
    expect(fueleu).toBe(FUEL_EU_SHIPPING_GROUPS.length);
    expect(ets1).toBe(groupSitesByCompany(ETS1_SITES).length);
    expect(ets2).toBe(ETS2_SEED_COMPANIES.length + CLEAN_HEAT_PROGRAM_LEADS.length);
  });

  it('gives every profile a unique id and markets that match its records', () => {
    expect(new Set(directory.map(p => p.id)).size).toBe(directory.length);
    for (const p of directory) {
      expect(p.markets.includes('FUELEU')).toBe(p.fueleu.length > 0);
      expect(p.markets.includes('ETS1')).toBe(p.ets1.length > 0);
      expect(p.markets.includes('ETS2')).toBe(p.ets2.length > 0);
    }
  });

  it('joins the same company across datasets (Edison: ETS1 operator and ETS2 supplier)', () => {
    const edison = directory.find(p => p.id === 'edison');
    expect(edison?.markets).toEqual(['ETS1', 'ETS2']);
  });

  it('joins a shipping group with its ETS1 sites (Cementos Tudela Veguín)', () => {
    const ctv = directory.find(p => p.id === 'cementos tudela veguin');
    expect(ctv?.markets).toEqual(['FUELEU', 'ETS1']);
  });

  it('merges profiles only when the trader links them, and the link is reversible', () => {
    const before = directory.find(p => p.id === 'engie italia');
    expect(before).toBeDefined();
    const linked = buildCompanyDirectory([{ a: 'engie', b: 'engie italia' }]);
    expect(linked.length).toBe(directory.length - 1);
    const engie = linked.find(p => p.id === 'engie');
    expect(engie?.ets1.length).toBe((directory.find(p => p.id === 'engie')?.ets1.length ?? 0) + (before?.ets1.length ?? 0));
    expect(linked.find(p => p.id === 'engie italia')).toBeUndefined();
  });

  it('ignores links to unknown ids', () => {
    expect(buildCompanyDirectory([{ a: 'engie', b: 'no such company' }]).length).toBe(directory.length);
  });

  it('suggests related profiles by the first distinctive word, never itself', () => {
    const engie = directory.find(p => p.id === 'engie');
    const related = suggestRelated(engie!, directory);
    expect(related.length).toBeGreaterThan(0);
    expect(related.every(p => p.id !== 'engie')).toBe(true);
    expect(related.some(p => p.id === 'engie italia')).toBe(true);
  });
});

describe('company directory — non-Latin names', () => {
  it('keeps Greek-script operators instead of dropping them', () => {
    expect(normalizeCompanyName('ΔΕΗ Α.Ε')).toBe('δεη');
    expect(normalizeCompanyName('ΔΕΗ')).toBe('δεη');
    const d = buildCompanyDirectory();
    expect(d.find(p => p.id === 'δεη')?.markets).toContain('ETS1');
  });
});
