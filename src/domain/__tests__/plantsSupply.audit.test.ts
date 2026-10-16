import { describe, it, expect } from 'vitest';
import { BIOMETHANE_PLANTS } from '../plants/plantsData';
import {
  applyRegisterDistanceCheck,
  distanceKm,
  sourcedSupportExpiryYear,
} from '../plants/dataQuality';
import { legalEntityForHandoff, isTemplateLegalEntityName } from '../plants/statutoryDossiers';
import { buildCsv } from '../companies/csv';

describe('plants supply fixes (aud-sd)', () => {
  it('FR capacity is converted kW -> Nm3/h at 10 kWh/Nm3 and not shown verified', () => {
    const fr = BIOMETHANE_PLANTS.filter(p => p.countryCode === 'FR' && p.capacityNm3h && p.annualEnergyGWh);
    expect(fr.length).toBeGreaterThan(700);
    for (const p of fr.slice(0, 50)) {
      expect(p.dataQuality?.capacityConvertedFromKw).toBe(true);
      expect(p.isVerified).toBe(false);
      // energy = capacity x 8000 h x 10 kWh/Nm3 holds again, like every other country (about 10x before)
      const ratio = (p.annualEnergyGWh as number) / ((p.capacityNm3h as number) * 0.08);
      expect(ratio).toBeGreaterThan(0.9);
      expect(ratio).toBeLessThan(1.1);
    }
    expect(BIOMETHANE_PLANTS.filter(p => p.countryCode === 'DE').every(p => !p.dataQuality?.capacityConvertedFromKw)).toBe(true);
  });

  it('template legal entities are recognised and never handed to the Trade Builder', () => {
    expect(isTemplateLegalEntityName('Bioenergie Schwedt Verwaltungs GmbH')).toBe(true);
    expect(isTemplateLegalEntityName('Societa Agricola Biometano Lodi S.r.l.')).toBe(true);
    expect(isTemplateLegalEntityName('Attero (Locatie Wijster)')).toBe(true);
    expect(isTemplateLegalEntityName('A2A Ambiente (Impianto di Cremona)')).toBe(true);
    expect(isTemplateLegalEntityName('Biomethan Könnern GmbH')).toBe(false);
    const flagged = BIOMETHANE_PLANTS.filter(p => p.dataQuality?.syntheticLegalEntity);
    expect(flagged.length).toBeGreaterThan(100);
    for (const p of flagged) expect(legalEntityForHandoff(p)).toBeUndefined();
  });

  it('a register MATCHED further than 25 km becomes AMBIGUOUS with the distance', () => {
    const match = {
      status: 'MATCHED' as const, matchKind: 'OPERATOR_REGISTER' as const, source: 'x', checkedAt: '2026-09-26',
      best: { operatorName: 'X', operatorRegisterId: null, unitId: 'U1', idLabel: 'i', nameLabel: 'n', town: 'Altenhof', coordinates: [53.9, 12.3] as [number, number], capacity: null, evidence: ['same town: Altenhof'] },
      candidates: [],
    };
    const out = applyRegisterDistanceCheck([54.43, 9.87], false, match)!;
    expect(out.status).toBe('AMBIGUOUS');
    expect(out.best).toBeNull();
    expect(out.distanceKm).toBeGreaterThan(150);
    expect(out.candidates[0].evidence[0]).toContain('km from plant coordinates');
    // close match untouched, approximate plant coordinates untouched
    expect(applyRegisterDistanceCheck([53.9, 12.31], false, match)!.status).toBe('MATCHED');
    expect(applyRegisterDistanceCheck([54.43, 9.87], true, match)!.status).toBe('MATCHED');
    expect(distanceKm([0, 0], [0, 1])).toBeCloseTo(111.2, 0);
  });

  it('subsidy cliff counts only sourced expiry dates (the 282 DE dates are unsourced)', () => {
    expect(sourcedSupportExpiryYear({ supportExpiryDate: '2027-12-31', fieldsUnverified: [] })).toBe(2027);
    expect(sourcedSupportExpiryYear({ supportExpiryDate: '2027-12-31', fieldsUnverified: ['supportExpiryDate'] })).toBeNull();
    expect(sourcedSupportExpiryYear({ supportExpiryDate: null, fieldsUnverified: [] })).toBeNull();
    const dated = BIOMETHANE_PLANTS.filter(p => p.supportExpiryDate);
    expect(dated.length).toBeGreaterThan(0);
    expect(dated.filter(p => sourcedSupportExpiryYear(p) !== null)).toHaveLength(0);
  });

  it('shared CSV helper guards formulas, quotes and keeps # (no data: URI)', () => {
    const csv = buildCsv(['a', 'b'], [['-Josef Straub', 'x,"y" #1'], [1, null]]);
    expect(csv).toContain("'-Josef Straub");
    expect(csv).toContain('"x,""y"" #1"');
  });
});
