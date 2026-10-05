import { describe, it, expect } from 'vitest';
import { REGISTRY_DIRECTORY, getRegistryByCountry } from '../registries/registryDirectory';
import { HUB_MEMBERSHIP } from '../registries/hubConnectivity';

describe('Registry directory — pinning key sourced facts (registries.md, accessed 2026-09-28)', () => {
  it('has exactly one entry per country, each with a resolvable country code', () => {
    const codes = REGISTRY_DIRECTORY.map(r => r.countryCode);
    expect(new Set(codes).size).toBe(codes.length);
    expect(codes.length).toBe(22);
  });

  it('every entry carries at least one source URL', () => {
    for (const entry of REGISTRY_DIRECTORY) {
      expect(entry.sources.length).toBeGreaterThan(0);
      for (const source of entry.sources) {
        expect(source.url).toMatch(/^https?:\/\//);
        expect(source.claim.length).toBeGreaterThan(5);
        expect(source.accessed.length).toBeGreaterThan(0);
      }
    }
  });

  it('every entry marks the UDB gas module as not yet live', () => {
    for (const entry of REGISTRY_DIRECTORY) {
      expect(entry.udbStatus).toBe('NOT_LIVE_EXPECTED_END_2026');
    }
  });

  it('dena (Germany): aibGasScheme is false, ergar is true', () => {
    const dena = getRegistryByCountry('DE')!;
    expect(dena).toBeDefined();
    expect(dena.aibGasScheme).toBe(false);
    expect(dena.ergar).toBe(true);
  });

  it('GGCS (United Kingdom): ergar is true — not domestic-only', () => {
    const ggcs = getRegistryByCountry('GB')!;
    expect(ggcs).toBeDefined();
    expect(ggcs.ergar).toBe(true);
    expect(ggcs.aibGasScheme).toBe(false);
  });

  it('Pronovo (Switzerland): ergar is true', () => {
    const pronovo = getRegistryByCountry('CH')!;
    expect(pronovo).toBeDefined();
    expect(pronovo.ergar).toBe(true);
    expect(pronovo.aibGasScheme).toBe(true);
  });

  it("Sweden's AIB issuing body is the Swedish Energy Agency, not Energigas Sverige", () => {
    const sweden = getRegistryByCountry('SE')!;
    expect(sweden).toBeDefined();
    expect(sweden.operator).toContain('Swedish Energy Agency');
    expect(sweden.operator).not.toMatch(/^Energigas Sverige$/);
  });

  it('Spain: not an ERGaR participant (research 2026-10-04)', () => {
    expect(getRegistryByCountry('ES')!.ergar).toBe(false);
  });

  it('hub flags are tri-state, and a false ERGaR flag carries an ergar.org source (except PL)', () => {
    for (const e of REGISTRY_DIRECTORY) {
      expect([true, false, 'unverified']).toContain(e.aibGasScheme);
      expect([true, false, 'unverified']).toContain(e.ergar);
      if (e.ergar === false && e.countryCode in HUB_MEMBERSHIP && e.countryCode !== 'PL') {
        expect(e.sources.some(s => s.url.includes('ergar.org')), e.countryCode).toBe(true);
      }
    }
  });

  it('directory hub flags agree with HUB_MEMBERSHIP', () => {
    for (const e of REGISTRY_DIRECTORY) {
      const m = HUB_MEMBERSHIP[e.countryCode];
      if (!m) continue;
      expect(e.ergar, `${e.countryCode} ergar`).toBe(m.ergar);
      expect(e.aibGasScheme, `${e.countryCode} aib`).toBe(m.aib === 'CONNECTED');
    }
  });

  it('Poland is marked as an immature market with no confirmed cross-border routes', () => {
    const poland = getRegistryByCountry('PL')!;
    expect(poland.aibGasScheme).toBe(false);
    expect(poland.ergar).toBe(false);
    expect(poland.crossBorderRoutes.length).toBe(0);
    expect(poland.verificationLevel).toBe('UNVERIFIED');
  });

  it('verification levels only use the three allowed values', () => {
    for (const entry of REGISTRY_DIRECTORY) {
      expect(['VERIFIED', 'PARTIAL', 'UNVERIFIED']).toContain(entry.verificationLevel);
    }
  });
});
