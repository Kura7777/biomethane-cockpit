import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { validate, validateCompliance, loadCompliance, COMPLIANCE_VALUE_FIELDS } from '../../../scripts/lib/plantResearchWriter';
import { PLANT_RESEARCH } from '../plants/plantResearch.generated';
import { BIOMETHANE_PLANTS } from '../plants/plantsData';
import type { PlantCompliance, SourcedValue } from '../plants/types';
import {
  certificateExpiry,
  complianceDefaults,
  getPlantComplianceDefaults,
  ggeReadiness,
  isMapCapacityEstimate,
  plantEnergyFigure,
  reportedCiForPlant,
  resolveCounterparty,
  CAPACITY_ESTIMATE_LABEL,
} from '../plants/compliance';
import { goBasisVolumeMwh, volumeUnitLabel } from '../consignment/custody';
import { getMarketById } from '../markets/registry';

const NOW = new Date('2026-10-10T12:00:00Z');
const sv = <T,>(value: T, extra: Record<string, unknown> = {}): SourcedValue<T> =>
  ({ value, sourceUrl: 'https://example.com/source', retrievedAt: '2026-10-09T21:30:00Z', note: 'verbatim quote', ...extra });

const blank = (over: Partial<PlantCompliance> = {}): PlantCompliance => ({
  gdoRegistered: null, injection: null, operatingSince: null, actualProductionGWh: null, capacityNm3h: null,
  feedstockMix: null, certification: null, prtrGrant: null, otherAid: null, reportedCI: null, currentOfftake: null,
  openQuestions: [], researchedAt: '2026-10-09T21:30:00Z', ...over,
});

const cert = (validUntil: string, status = 'VALID') => sv({ scheme: 'ISCC_EU', certificateNumber: 'EU-ISCC-Cert-TEST', validUntil, status });

describe('compliance block: writer validation', () => {
  it('accepts a well-formed block and a block of nulls', () => {
    expect(() => validateCompliance('p', blank())).not.toThrow();
    expect(() => validateCompliance('p', blank({ injection: sv('DSO' as const), certification: cert('2027-03-16') }))).not.toThrow();
  });

  it('rejects a value without a source link or retrieval date', () => {
    expect(() => validateCompliance('p', blank({ operatingSince: { ...sv('2025-04'), sourceUrl: '' } }))).toThrow(/sourceUrl/);
    expect(() => validateCompliance('p', blank({ operatingSince: { ...sv('2025-04'), retrievedAt: '' } }))).toThrow(/retrievedAt/);
  });

  it('keeps "no PRTR grant found" as UNKNOWN: NO with a NO_RECORD register result is rejected', () => {
    expect(() => validateCompliance('p', blank({ prtrGrant: sv('NO' as const, { bdnsResult: 'NO_RECORD' }) }))).toThrow(/UNKNOWN/);
    expect(() => validateCompliance('p', blank({ prtrGrant: sv('UNKNOWN' as const, { bdnsResult: 'NO_RECORD' }) }))).not.toThrow();
  });

  it('rejects unknown enum values and malformed typed values', () => {
    expect(() => validateCompliance('p', blank({ injection: sv('PIPELINE' as never) }))).toThrow(/injection/);
    expect(() => validateCompliance('p', blank({ gdoRegistered: sv('MAYBE' as never) }))).toThrow(/gdoRegistered/);
    expect(() => validateCompliance('p', blank({ certification: sv({ scheme: 'ISCC_EU', certificateNumber: '', validUntil: 'nope', status: 'VALID' }) }))).toThrow(/certification/);
    expect(() => validateCompliance('p', blank({ actualProductionGWh: sv({ value: 12, year: 2025.5 }) }))).toThrow(/actualProductionGWh/);
    expect(() => validateCompliance('p', blank({ reportedCI: sv('-40' as never) }))).toThrow(/reportedCI/);
  });

  it('requires a reason on an excluded record', () => {
    expect(() => validateCompliance('p', blank({ excluded: true }))).toThrow(/excludedReason/);
    expect(() => validateCompliance('p', blank({ excluded: true, excludedReason: 'duplicate' }))).not.toThrow();
  });

  it('is run by validate() on a research record', () => {
    const base = PLANT_RESEARCH['plant_es_11'];
    expect(() => validate({ ...base, compliance: blank({ prtrGrant: sv('NO' as const, { bdnsResult: 'NO_RECORD' }) }) })).toThrow(/UNKNOWN/);
  });

  it('refuses a compliance file that points at a plant with no research record', () => {
    const dir = path.join(__dirname, '..', '..', '..', 'data', 'plant_research');
    const tmp = path.join(dir, 'zz.compliance.json');
    fs.writeFileSync(tmp, JSON.stringify({ researchedAt: '2026-10-09T00:00:00Z', plants: { plant_zz_1: blank() } }));
    try {
      expect(() => loadCompliance('zz', [])).toThrow(/no matching research record/);
    } finally {
      fs.unlinkSync(tmp);
    }
  });
});

describe('compliance data as generated from data/plant_research/es.compliance.json', () => {
  const es = Object.values(PLANT_RESEARCH).filter(r => r.plantId.startsWith('plant_es_'));
  const nonNull = (f: keyof PlantCompliance) => es.filter(r => r.compliance && r.compliance[f] != null).length;

  it('attaches a compliance block to all 26 Spanish plants and none to other countries', () => {
    expect(es).toHaveLength(26);
    expect(es.every(r => r.compliance)).toBe(true);
    expect(Object.values(PLANT_RESEARCH).filter(r => !r.plantId.startsWith('plant_es_')).every(r => !r.compliance)).toBe(true);
  });

  it('imports the researched values (non-null counts per field)', () => {
    const counts = Object.fromEntries(COMPLIANCE_VALUE_FIELDS.map(f => [f, nonNull(f)]));
    expect(counts.gdoRegistered).toBe(26);
    expect(counts.injection).toBe(26);
    expect(counts.certification).toBe(19);
    expect(counts.prtrGrant).toBe(24);
    expect(counts.otherAid).toBe(9);
    expect(counts.currentOfftake).toBe(5);
    expect(counts.actualProductionGWh).toBe(0);
    expect(counts.reportedCI).toBe(0);
  });

  it('never turns a missing PRTR grant into NO', () => {
    for (const r of es) {
      const g = r.compliance!.prtrGrant;
      if (g?.bdnsResult === 'NO_RECORD') expect(g.value).toBe('UNKNOWN');
      expect(g?.value).not.toBe('NO');
    }
  });

  it('marks plants 13, 16 (not a plant) and 6, 21 (duplicates) as excluded but keeps them in the app data', () => {
    for (const id of ['plant_es_6', 'plant_es_13', 'plant_es_16', 'plant_es_21']) {
      expect(PLANT_RESEARCH[id].compliance!.excluded).toBe(true);
      expect(PLANT_RESEARCH[id].compliance!.excludedReason).toBeTruthy();
      expect(BIOMETHANE_PLANTS.some(p => p.id === id)).toBe(true);
    }
    expect(es.filter(r => r.compliance!.excluded)).toHaveLength(4);
  });

  it('records the real injecting entity at Artajona and Manlleu with its PRTR grant', () => {
    expect(PLANT_RESEARCH['plant_es_17'].compliance!.correctedEntity!.value).toMatchObject({ name: 'Cycle 0 SVP1 S.L.', prtrGrantEur: 773632.75 });
    expect(PLANT_RESEARCH['plant_es_23'].compliance!.correctedEntity!.value).toMatchObject({ name: 'Cycle 0 Maians S.L.', prtrGrantEur: 476520.35 });
  });

  it('keeps the file as a candidate list for plants missing from the app, not as plant records', () => {
    const file = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', '..', 'data', 'plant_research', 'es.compliance.json'), 'utf8'));
    const names = file.global.missingFromApp.map((c: { name: string }) => c.name);
    expect(names).toEqual(expect.arrayContaining([expect.stringMatching(/Lleida/), expect.stringMatching(/Navia/), 'EcoGalia']));
    expect(file.global.missingFromApp.every((c: { recordType: string }) => c.recordType === 'CANDIDATE')).toBe(true);
    expect(BIOMETHANE_PLANTS.some(p => /Navia|EcoGalia/.test(p.name))).toBe(false);
  });
});

describe('certificate expiry', () => {
  it('flags an expired certificate, a lapsing one, and passes a valid one', () => {
    expect(certificateExpiry(blank({ certification: cert('2026-07-22') }), NOW)!.state).toBe('EXPIRED');
    expect(certificateExpiry(blank({ certification: cert('2026-12-19') }), NOW)!.state).toBe('EXPIRING');
    expect(certificateExpiry(blank({ certification: cert('2027-06-01') }), NOW)!.state).toBe('VALID');
    expect(certificateExpiry(blank(), NOW)).toBeNull();
  });

  it('reads the real Lorca (expires 2026-12) and Elena (lapsed) records', () => {
    expect(certificateExpiry(PLANT_RESEARCH['plant_es_22'].compliance, NOW)!.state).toBe('EXPIRING');
    expect(certificateExpiry(PLANT_RESEARCH['plant_es_4'].compliance, NOW)!.state).toBe('EXPIRED');
  });
});

describe('GGE readiness', () => {
  it('Ólvega: grid, certificate and aid read, PRTR "not found (partial register)", CI unpublished', () => {
    const r = ggeReadiness(PLANT_RESEARCH['plant_es_11'].compliance, NOW)!;
    const by = Object.fromEntries(r.items.map(i => [i.id, i]));
    expect(by.grid.status).toBe('OK');
    expect(by.certified.status).toBe('OK');
    expect(by.aid.status).toBe('OK');
    expect(by.prtr.status).toBe('UNKNOWN');
    expect(by.prtr.detail).toMatch(/not found \(partial register\)/i);
    expect(by.ci.status).toBe('UNKNOWN');
  });

  it('flags operating aid, an expired certificate and an off-grid plant', () => {
    const coren = ggeReadiness(PLANT_RESEARCH['plant_es_12'].compliance, NOW)!;
    expect(coren.items.find(i => i.id === 'aid')!.status).toBe('FLAG');
    const elena = ggeReadiness(PLANT_RESEARCH['plant_es_4'].compliance, NOW)!;
    expect(elena.items.find(i => i.id === 'certified')!.status).toBe('FLAG');
    expect(ggeReadiness(blank({ injection: sv('OFF_GRID' as const) }), NOW)!.items.find(i => i.id === 'grid')!.status).toBe('FLAG');
  });

  it('a PRTR grant needs the Art. 5.3 legal check (warn), and an excluded plant has no readiness line', () => {
    expect(ggeReadiness(PLANT_RESEARCH['plant_es_7'].compliance, NOW)!.items.find(i => i.id === 'prtr')!.status).toBe('WARN');
    const ex = ggeReadiness(PLANT_RESEARCH['plant_es_13'].compliance, NOW)!;
    expect(ex.excluded).toBe(true);
    expect(ex.items).toEqual([]);
  });
});

describe('getPlantComplianceDefaults', () => {
  it('pre-fills the custody pack for a Spanish manure plant (Ólvega)', () => {
    const d = getPlantComplianceDefaults('plant_es_11', 'ES', NOW);
    expect(d.go).toMatchObject({ registry: 'Enagás GTS', issuingCountry: 'ES', gridInjected: true, supportType: 'INVESTMENT', energyBasis: 'HHV', energyMWh: null });
    expect(d.pos).toMatchObject({ scheme: 'ISCC_EU', supportDeclared: 'INVESTMENT', ciTotal: null, mwh: null });
    expect(d.claims).toMatchObject({ prtrGrant: 'UNKNOWN', counterpartyCertified: true, prtrLegalCheckDone: false });
  });

  it('maps the researched facts: operating aid, PRTR grant, expired certificate, off-grid', () => {
    expect(getPlantComplianceDefaults('plant_es_12', 'ES', NOW).go!.supportType).toBe('OPERATING');
    expect(getPlantComplianceDefaults('plant_es_7', 'ES', NOW).claims!.prtrGrant).toBe('YES');
    expect(getPlantComplianceDefaults('plant_es_4', 'ES', NOW).claims!.counterpartyCertified).toBe(false);
    expect(complianceDefaults(blank({ injection: sv('OFF_GRID' as const) }), 'ES', NOW).go!.gridInjected).toBe(false);
  });

  it('leaves what is not known unset: no aid record is UNKNOWN support, not NONE', () => {
    const d = complianceDefaults(blank(), 'ES', NOW);
    expect(d.go).toMatchObject({ supportType: 'UNKNOWN', gridInjected: null });
    expect(d.claims).toMatchObject({ prtrGrant: 'UNKNOWN', counterpartyCertified: null });
  });

  it('returns nothing for an excluded plant or a plant with no compliance research', () => {
    expect(getPlantComplianceDefaults('plant_es_13', 'ES', NOW)).toEqual({});
    expect(getPlantComplianceDefaults('plant_gb_1', 'GB', NOW)).toEqual({});
    expect(getPlantComplianceDefaults('plant_does_not_exist', undefined, NOW)).toEqual({});
  });

  it('never fills a CI for any Spanish plant while no plant publishes one', () => {
    for (const r of Object.values(PLANT_RESEARCH).filter(x => x.compliance)) {
      expect(getPlantComplianceDefaults(r.plantId, 'ES', NOW).pos?.ciTotal ?? null).toBeNull();
      expect(reportedCiForPlant(r.plantId)).toBeNull();
    }
  });

  it('no CI default without a source: only a sourced reportedCI fills it', () => {
    const sourced = blank({ reportedCI: sv(-42) });
    expect(complianceDefaults(sourced, 'ES', NOW).pos!.ciTotal).toBe(-42);
    const unsourced = blank({ reportedCI: { ...sv(-42), sourceUrl: '' } });
    expect(complianceDefaults(unsourced, 'ES', NOW).pos!.ciTotal).toBeNull();
    const notANumber = blank({ reportedCI: sv('-42' as never) });
    expect(complianceDefaults(notANumber, 'ES', NOW).pos!.ciTotal).toBeNull();
    // The feedstock/nameplate facts never become a CI either
    expect(complianceDefaults(blank({ feedstockMix: sv('manure'), nominalCapacityGWh: sv(25) }), 'ES', NOW).pos!.ciTotal).toBeNull();
  });
});

describe('capacity label', () => {
  it('labels the map\'s figure a capacity-based estimate and leaves register-audited plants alone', () => {
    const olvega = BIOMETHANE_PLANTS.find(p => p.id === 'plant_es_11')!;
    expect(isMapCapacityEstimate(olvega)).toBe(true);
    expect(plantEnergyFigure(olvega)).toMatchObject({ gwh: olvega.annualEnergyGWh, label: CAPACITY_ESTIMATE_LABEL, year: null });
    const audited = BIOMETHANE_PLANTS.find(p => /Statutory|Register|Audit/i.test(p.provenance) && !isMapCapacityEstimate(p) && p.annualEnergyGWh)!;
    expect(plantEnergyFigure(audited)!.label).toBeNull();
  });

  it('shows researched actual production with its year and source instead, without changing annualEnergyGWh', () => {
    const olvega = BIOMETHANE_PLANTS.find(p => p.id === 'plant_es_11')!;
    const before = olvega.annualEnergyGWh;
    const actual = sv({ value: 21.5, year: 2025 });
    const saved = PLANT_RESEARCH['plant_es_11'].compliance!.actualProductionGWh;
    PLANT_RESEARCH['plant_es_11'].compliance!.actualProductionGWh = actual;
    try {
      expect(plantEnergyFigure(olvega)).toMatchObject({ gwh: 21.5, year: 2025, label: null, source: actual });
    } finally {
      PLANT_RESEARCH['plant_es_11'].compliance!.actualProductionGWh = saved;
    }
    expect(olvega.annualEnergyGWh).toBe(before);
  });
});

describe('researched counterparty entity', () => {
  const olvega = BIOMETHANE_PLANTS.find(p => p.id === 'plant_es_11')!;

  it('uses Biolvegas S.L. (research) instead of the census name, with its source', () => {
    expect(olvega.legalEntityName).toBe('Bioenergía de Ólvega SL');
    const r = resolveCounterparty(olvega, 'Bioenergía de Ólvega SL');
    expect(r.name).toBe('Biolvegas S.L.');
    expect(r.source!.url).toMatch(/^https?:\/\//);
    expect(resolveCounterparty(olvega, undefined).name).toBe('Biolvegas S.L.');
    // A deal link that already carries the researched name still shows where it came from
    expect(resolveCounterparty(olvega, 'Biolvegas S.L.').source!.url).toBe(r.source!.url);
    expect(resolveCounterparty(olvega, `${olvega.name} Producer`).name).toBe('Biolvegas S.L.');
  });

  it('a name the trader chose wins, and a plant with no research keeps the old fallback', () => {
    expect(resolveCounterparty(olvega, 'Nortegas Renove S.L.U.')).toEqual({ name: 'Nortegas Renove S.L.U.', source: null });
    const gb = BIOMETHANE_PLANTS.find(p => p.countryCode === 'DK')!;
    expect(resolveCounterparty(gb, null).name).toBe(gb.legalEntityName ?? gb.operator ?? null);
  });

  it('shows the entity found at the site for Artajona (plant_es_17)', () => {
    const p = BIOMETHANE_PLANTS.find(x => x.id === 'plant_es_17')!;
    expect(resolveCounterparty(p, p.legalEntityName).name).toBe('Cycle 0 SVP1 S.L.');
  });
});

describe('deal volume on the GO basis', () => {
  const GGE = getMarketById('NL_GGE')!;
  const THG = getMarketById('DE_THG')!;
  const custody = { go: { energyMWh: 1000, energyBasis: 'HHV' }, pos: { mwh: 900 } } as never;

  it('is the GO MWh (1,000 HHV), not the PoS 900 LHV, on a paired market only', () => {
    expect(goBasisVolumeMwh(GGE, custody)).toBe(1000);
    expect(goBasisVolumeMwh(THG, custody)).toBeNull();
    expect(goBasisVolumeMwh(GGE, { go: { energyMWh: null } } as never)).toBeNull();
    expect(goBasisVolumeMwh(GGE, null)).toBeNull();
  });

  it('labels the unit with the GO energy basis', () => {
    expect(volumeUnitLabel(GGE, custody)).toBe('MWh (GO, HHV)');
    expect(volumeUnitLabel(GGE, { go: { energyBasis: 'LHV' } } as never)).toBe('MWh (GO, LHV)');
    expect(volumeUnitLabel(GGE, { go: { energyBasis: 'UNKNOWN' } } as never)).toBe('MWh (GO)');
    expect(volumeUnitLabel(THG, custody)).toBe('MWh');
  });
});
