import { describe, it, expect } from 'vitest';
import { getCertificateRoute, getCertificateRoutesFrom, CERT_ROUTE_LABELS, POSSIBLE_STATUSES } from '../registries/certificateRoutes';
import { AUDITED_COUNTRIES } from '../routes';

const status = (o: string, t: string) => getCertificateRoute(o, t).status;

describe('Certificate routes (audited route matrix, research 2026-10-04)', () => {
  it('Denmark: ERGaR routes published by the registry', () => {
    const dkde = getCertificateRoute('DK', 'DE');
    expect(POSSIBLE_STATUSES).toContain(dkde.status);
    expect(dkde.hubs).toEqual(['ERGAR']);
    expect(dkde.grade).toBe('PUBLISHED');
    expect(POSSIBLE_STATUSES).toContain(status('DK', 'CH'));
    expect(getCertificateRoute('DK', 'CH').grade).toBe('PUBLISHED');
    expect(POSSIBLE_STATUSES).toContain(status('DK', 'SK'));
    expect(POSSIBLE_STATUSES).toContain(status('DK', 'LT'));
  });

  it('routes outside the Energinet table / VertiCer (left ERGaR 1 Jul 2026) are not possible', () => {
    for (const [o, t] of [['DK', 'AT'], ['DK', 'GB'], ['DE', 'DK'], ['GB', 'DK'], ['NL', 'DE']]) {
      expect(status(o, t), `${o}->${t}`).toBe('NOT_POSSIBLE');
    }
  });

  it('DK to CZ/ES: not possible, workaround is ex-domain cancellation', () => {
    for (const t of ['CZ', 'ES']) {
      const r = getCertificateRoute('DK', t);
      expect(r.status).toBe('NOT_POSSIBLE');
      expect(r.workaround ?? '').toMatch(/ex-domain/i);
    }
  });

  it('AIB routes: Sweden AIB gas since 1 Sep 2026, CZ to ES observed', () => {
    expect(POSSIBLE_STATUSES).toContain(status('SE', 'CZ'));
    expect(POSSIBLE_STATUSES).toContain(status('CZ', 'SE'));
    expect(getCertificateRoute('SE', 'CZ').hubs).toEqual(['AIB']);
    expect(status('CZ', 'ES')).toBe('POSSIBLE_OBSERVED');
  });

  it('no shared hub: ES to DE and CZ to DE are not possible', () => {
    expect(status('ES', 'DE')).toBe('NOT_POSSIBLE');
    expect(status('CZ', 'DE')).toBe('NOT_POSSIBLE');
  });

  it('origin-side conditions carry through to the route', () => {
    const itfr = getCertificateRoute('IT', 'FR');
    expect(itfr.status).toBe('POSSIBLE_CONDITIONAL');
    const itText = itfr.conditions.join(' ');
    expect(itText).toMatch(/ETS/);
    expect(itText).toMatch(/unsupported production/i);

    const atfr = getCertificateRoute('AT', 'FR');
    expect(atfr.status).toBe('POSSIBLE_CONDITIONAL');
    expect(atfr.conditions.join(' ')).toMatch(/unsupported production/i);
  });

  it('Belgium: as origin not possible (Flanders/Wallonia national non-EECS GOs); as destination open via Brussels only for AIB gas members', () => {
    // Brussels (BRUGEL) is AIB-gas connected on paper but has never recorded a gas transfer, so it is OPEN, never possible.
    const aibGasMembers = ['AT', 'CZ', 'EE', 'ES', 'FI', 'FR', 'HU', 'IT', 'LT', 'LV', 'NL', 'PT', 'SE', 'SK'];
    for (const c of AUDITED_COUNTRIES.filter(x => x !== 'BE')) {
      expect(status('BE', c), `BE->${c}`).toBe('NOT_POSSIBLE');
      expect(status(c, 'BE'), `${c}->BE`).toBe(aibGasMembers.includes(c) ? 'AWAITING_REGISTRY' : 'NOT_POSSIBLE');
    }
  });

  it('unaudited or hubless countries return a reasoned NOT_POSSIBLE or NO_DATA', () => {
    for (const c of ['PL', 'NO', 'IE', 'RO', 'GR', 'SI', 'HR', 'BG', 'LU']) {
      for (const [o, t] of [['DK', c], [c, 'DK'], ['DE', c], [c, 'CZ']]) {
        const r = getCertificateRoute(o, t);
        expect(['NOT_POSSIBLE', 'NO_DATA'], `${o}->${t}: ${r.status}`).toContain(r.status);
        expect(r.reason.length, `${o}->${t}`).toBeGreaterThan(0);
      }
    }
  });

  it('PoS summary attached for display', () => {
    expect(getCertificateRoute('DK', 'CZ').pos?.status).toBe('POSSIBLE');
    expect(getCertificateRoute('DK', 'NL').pos?.status).toBe('NOT_POSSIBLE');
    expect(getCertificateRoute('DK', 'DE').pos?.status).toBe('POSSIBLE');
    expect(getCertificateRoute('DE', 'IT').pos?.status).toBe('NOT_POSSIBLE');
  });

  it('every label exists', () => {
    for (const s of Object.keys(CERT_ROUTE_LABELS) as (keyof typeof CERT_ROUTE_LABELS)[]) {
      expect(typeof CERT_ROUTE_LABELS[s]).toBe('string');
      expect(CERT_ROUTE_LABELS[s].length).toBeGreaterThan(0);
    }
    expect(Object.keys(CERT_ROUTE_LABELS)).toHaveLength(7);
  });

  it('every audited route has a reason, and every researched route has https sources', () => {
    const isos = [...AUDITED_COUNTRIES] as string[];
    for (const o of isos) {
      for (const r of getCertificateRoutesFrom(o, isos)) {
        expect(r.reason.length, `${o}->${r.target}`).toBeGreaterThan(0);
        if (r.status !== 'NO_DATA') {
          expect(r.sources.length, `${o}->${r.target}`).toBeGreaterThan(0);
          for (const s of r.sources) expect(s.url).toMatch(/^https:\/\//);
        }
      }
    }
  });

  it('destination use only for researched destinations', () => {
    expect(getCertificateRoute('DK', 'DE').destinationUse).toContain('GEG');
  });
});
