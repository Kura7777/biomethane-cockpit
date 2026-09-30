import { describe, it, expect } from 'vitest';
import {
  Ets1Site,
  ETS1_SITES,
  ETS1_LATEST_YEAR,
  ETS1_PREVIOUS_YEAR,
  ETS1_SOURCE_URL,
  classifySector,
  cleanCompanyName,
  isPlaceholderParent,
  resolveFit,
  SECTOR_FIT,
  groupSitesByCompany,
  ets1AvoidedValuePerMWh,
  biomethaneMWhToAbate,
} from '../ets1/sites';
import { ETS_NATURAL_GAS_TCO2_PER_MWH } from '../netback/engine';
import { ETS1_INSTALLATION_ROWS } from '../ets1/installationsData.generated';
import { MarksState } from '../netback/types';

describe('ETS1 industrial sites (EUTL)', () => {
  it('loads thousands of stationary installations with positive verified emissions and no UK sites', () => {
    expect(ETS1_SITES.length).toBeGreaterThan(7000);
    expect(ETS1_LATEST_YEAR).toBeGreaterThanOrEqual(2023);
    expect(ETS1_SITES.every(s => s.verifiedLatestTco2 > 0)).toBe(true);
    expect(ETS1_SITES.some(s => s.country === 'GB')).toBe(false);
    expect(new Set(ETS1_SITES.map(s => s.id)).size).toBe(ETS1_SITES.length);
  });

  it('classifies sectors from activity and NACE codes', () => {
    expect(classifySector(20, '10.81')).toBe('FOOD_BEVERAGE');
    expect(classifySector(20, '21.10')).toBe('PHARMA');
    expect(classifySector(29, '23.51')).toBe('CEMENT_LIME');
    expect(classifySector(24, '24.10')).toBe('METALS');
    expect(classifySector(31, '23.13')).toBe('GLASS_CERAMICS');
    expect(classifySector(20, '35.11')).toBe('POWER_HEAT');
    expect(classifySector(21, '19.20')).toBe('REFINING_OIL_GAS');
  });

  it('groups sites by parent company (else operator) and sums emissions', () => {
    const companies = groupSitesByCompany(ETS1_SITES);
    const total = ETS1_SITES.reduce((s, x) => s + x.verifiedLatestTco2, 0);
    expect(companies.reduce((s, c) => s + c.verifiedLatestTco2, 0)).toBe(total);
    expect(companies.length).toBeLessThan(ETS1_SITES.length);
    for (const c of companies.slice(0, 50)) {
      expect(c.fitVerifiedLatestTco2).toBeLessThanOrEqual(c.verifiedLatestTco2);
    }
  });

  it('values avoided allowances through the pricing authority from the EU_ETS1 mark', () => {
    const marks: MarksState = {
      marks: { EU_ETS1: { marketId: 'EU_ETS1', bid: 70, offer: 70, mid: 70, updatedAt: null, source: 'test' } },
      gasIndex: { bid: null, offer: null, mid: null, updatedAt: null },
      fx: { gbpEur: null, chfEur: null, updatedAt: null },
      pricingSides: { certificateSide: 'mid', moleculeSide: 'mid' },
    };
    expect(ets1AvoidedValuePerMWh(marks)).toBeCloseTo(70 * ETS_NATURAL_GAS_TCO2_PER_MWH, 6);
    expect(ets1AvoidedValuePerMWh({ ...marks, marks: {} })).toBeNull();
  });

  it('converts tonnes to abate into biomethane MWh with the MRR gas factor', () => {
    expect(biomethaneMWhToAbate(ETS_NATURAL_GAS_TCO2_PER_MWH * 1000)).toBeCloseTo(1000, 6);
  });
});

import { EEA_VERIFIED_2023_BY_COUNTRY } from './fixtures/eeaVerified2023';

describe('ETS1 site data against the official EEA 2023 country totals', () => {
  // The site data is now 2025 (Commission workbook, extracted 01/04/2026), so it cannot match the 2023
  // totals. It must sit below them (emissions fell, and ~940 installations have no 2025 figure yet) but
  // stay in the same order of magnitude in every large country; a parse error would break this.
  const byCountry: Record<string, number> = {};
  for (const s of ETS1_SITES) byCountry[s.country] = (byCountry[s.country] ?? 0) + s.verifiedLatestTco2;

  it('sits 0-20% below the 2023 EU-wide total', () => {
    const official = Object.values(EEA_VERIFIED_2023_BY_COUNTRY).reduce((a, b) => a + b, 0);
    const app = Object.values(byCountry).reduce((a, b) => a + b, 0);
    expect(app / official).toBeGreaterThan(0.8);
    expect(app / official).toBeLessThan(1.0);
  });

  it('keeps every large country above 50% of its 2023 total', () => {
    for (const [cc, official] of Object.entries(EEA_VERIFIED_2023_BY_COUNTRY)) {
      if (official < 5e6) continue;
      expect((byCountry[cc] ?? 0) / official, cc).toBeGreaterThan(0.5);
    }
  });
});

describe('ETS1 latest year and source', () => {
  it('is 2025 data from the Commission verified-emissions workbook', () => {
    expect(ETS1_LATEST_YEAR).toBe(2025);
    expect(ETS1_PREVIOUS_YEAR).toBe(2024);
    expect(ETS1_SOURCE_URL).toContain('verified_emissions_2025_en.xlsx');
  });
});

function site(over: Partial<Ets1Site>): Ets1Site {
  return {
    id: 'X_1', name: 'Site', operator: 'Op', parentCompany: null, country: 'DE', city: '', activityId: 20, nace: '10.81',
    sector: 'FOOD_BEVERAGE', sectorBasis: 'SITE_CODE', fit: 'HIGH', verifiedLatestTco2: 1000, verifiedPreviousTco2: null,
    freeAllocLatestTco2: null, verifiedLatestIsPriorYear: false, ...over,
  };
}

describe('ETS1 sites not yet reported for the latest year', () => {
  it('flags stand-in rows and keeps Denmark, Bulgaria and Poland in the list', () => {
    const flagged = ETS1_SITES.filter(s => s.verifiedLatestIsPriorYear);
    expect(flagged.length).toBeGreaterThan(300);
    const dk = ETS1_SITES.filter(s => s.country === 'DK');
    expect(dk.reduce((a, s) => a + s.verifiedLatestTco2, 0)).toBeGreaterThan(5e6);
    expect(ETS1_SITES.filter(s => !s.verifiedLatestIsPriorYear).length).toBeGreaterThan(6500);
  });
});

describe('ETS1 free allocation', () => {
  it('sums known sites, leaves unknown sites out, and is null only when every site is unknown', () => {
    const [c] = groupSitesByCompany([
      site({ id: 'A', operator: 'Acme', freeAllocLatestTco2: 400 }),
      site({ id: 'B', operator: 'Acme', freeAllocLatestTco2: null }),
      site({ id: 'C', operator: 'Acme', freeAllocLatestTco2: 0 }),
    ]);
    expect(c.freeAllocLatestTco2).toBe(400);
    const [none] = groupSitesByCompany([site({ operator: 'Ghost' }), site({ id: 'Y', operator: 'Ghost' })]);
    expect(none.freeAllocLatestTco2).toBeNull();
    const [zero] = groupSitesByCompany([site({ operator: 'Zero', freeAllocLatestTco2: 0 })]);
    expect(zero.freeAllocLatestTco2).toBe(0);
  });

  it('sums the fit-only figure over HIGH/MEDIUM sites; null when none of them has a figure', () => {
    const [c] = groupSitesByCompany([
      site({ id: 'A', operator: 'Mix', fit: 'HIGH', freeAllocLatestTco2: 100 }),
      site({ id: 'B', operator: 'Mix', fit: 'MEDIUM', freeAllocLatestTco2: 50 }),
      site({ id: 'C', operator: 'Mix', fit: 'LOW', sector: 'CEMENT_LIME', freeAllocLatestTco2: 9000 }),
    ]);
    expect(c.freeAllocLatestTco2).toBe(9150);
    expect(c.fitFreeAllocLatestTco2).toBe(150);
    const [lowOnly] = groupSitesByCompany([site({ operator: 'Kiln', fit: 'LOW', freeAllocLatestTco2: 500 })]);
    expect(lowOnly.freeAllocLatestTco2).toBe(500);
    expect(lowOnly.fitFreeAllocLatestTco2).toBeNull();
    const [fitUnknown] = groupSitesByCompany([
      site({ id: 'A', operator: 'Q', fit: 'HIGH', freeAllocLatestTco2: null }),
      site({ id: 'B', operator: 'Q', fit: 'LOW', freeAllocLatestTco2: 7 }),
    ]);
    expect(fitUnknown.fitFreeAllocLatestTco2).toBeNull();
  });

  it('is present in the generated data for most sites and is a plausible EU-wide total', () => {
    const known = ETS1_SITES.filter(s => s.freeAllocLatestTco2 !== null);
    expect(known.length / ETS1_SITES.length).toBeGreaterThan(0.7);
    expect(known.every(s => s.freeAllocLatestTco2! >= 0)).toBe(true);
    const total = known.reduce((a, s) => a + s.freeAllocLatestTco2!, 0);
    expect(total).toBeGreaterThan(3e8);
    expect(total).toBeLessThan(6e8);
  });
});

describe('ETS1 placeholder parents', () => {
  it('treats placeholder parent names as no parent, so unrelated operators are not grouped', async () => {
    const { isPlaceholderParent, ETS1_SITES, groupSitesByCompany } = await import('../ets1/sites');
    for (const p of ['xx', 'XX', 'n.a.', 'na', '/', '0', 'no']) expect(isPlaceholderParent(p)).toBe(true);
    for (const p of ['RWE AG', 'ΔΕΗ', '현대자동차', 'ENI', 'CEZ']) expect(isPlaceholderParent(p)).toBe(false);
    const names = groupSitesByCompany(ETS1_SITES).map(c => c.name.trim().toLowerCase());
    for (const junk of ['xx', 'n.a.', 'na', 'nn', '/', '0']) expect(names).not.toContain(junk);
  });
});

describe('ETS1 sector resolution for sites without an industry code', () => {
  it('never grades a site high fit just because its NACE code is missing', async () => {
    const { ETS1_SITES } = await import('../ets1/sites');
    const find = (n: string) => ETS1_SITES.find(s => s.name.includes(n))!;
    // Coal / gas power blocks inherit the operator's power code; a steelworks unit inherits metals.
    expect(find('Kozienice - blok').sector).toBe('POWER_HEAT');
    expect(find('Steel Košice, s.r.o.-FE').sector).toBe('METALS');
    expect(find('Saint Avold Kernaman').sector).toBe('POWER_HEAT');
    expect(find('GuD Herne').sector).toBe('POWER_HEAT');
    for (const s of ETS1_SITES.filter(x => !x.nace && x.activityId === 20)) {
      // "Other industry" only when the operator's own coded sites say so — never as a default.
      expect(s.sectorBasis).not.toBe('SITE_CODE');
      if (s.sector === 'OTHER_INDUSTRY') expect(s.sectorBasis).toBe('OPERATOR_CODE');
    }
  });
});

describe('ETS1 register-number parents (D6)', () => {
  it('treats commercial-register numbers as no parent', () => {
    for (const p of ['HRB 74963', 'HRB140750', 'HRA 7698 Amtsgericht Würzburg', 'RO 1860712', 'LU - 128332', 'PT 510229808', 'NO920493491MVA', '34853 f']) {
      expect(isPlaceholderParent(p), p).toBe(true);
    }
    for (const p of ['A2A S.p.A.', 'COGESTAR 3', 'SICIT 2000 S.p.A.', 'TP 2, s.r.o.', 'Université Rennes 1', 'Stockholm Exergi Holding AB, 556040-6034']) {
      expect(isPlaceholderParent(p), p).toBe(false);
    }
  });

  it('falls back to the operator when the parent is a register number, and never groups on it', () => {
    const cs = groupSitesByCompany(ETS1_SITES);
    expect(cs.some(c => /^hr[ab]\s*\d/i.test(c.name))).toBe(false);
    const junk = ETS1_INSTALLATION_ROWS.filter(r => /^HR[AB]\s*\d/i.test(r[3]));
    expect(junk.length).toBeGreaterThan(10);
    for (const r of junk) expect(ETS1_SITES.find(s => s.id === r[0])!.parentCompany, r[0]).toBeNull();
  });

  it('strips a trailing registration number from a parent name', () => {
    expect(cleanCompanyName('Stockholm Exergi Holding AB, 556040-6034')).toBe('Stockholm Exergi Holding AB');
    expect(cleanCompanyName('HRB 6766 Amtsgericht Hannover')).toBe('');
    expect(cleanCompanyName('Graniti Fiandre S.P.A. / 42014 Castellarano / It')).toBe('Graniti Fiandre S.P.A.');
  });
});

describe('ETS1 company grouping (D6)', () => {
  const names = (sites: Ets1Site[]) => groupSitesByCompany(sites).map(c => c.name);

  it('merges legal-form and spelling variants of one company in one country', () => {
    const cs = groupSitesByCompany([
      site({ id: '1', operator: 'Edison S.p.A.', country: 'IT' }),
      site({ id: '2', operator: 'EDISON SPA', country: 'IT' }),
      site({ id: '3', operator: 'Saint-Gobain', country: 'FR' }),
      site({ id: '4', operator: 'SAINT GOBAIN', country: 'FR' }),
    ]);
    expect(cs).toHaveLength(2);
  });

  it('joins a bare acronym to the one full name that carries it in brackets', () => {
    const cs = groupSitesByCompany([
      site({ id: '1', parentCompany: 'ELECTRICITE DE FRANCE (EDF)', country: 'FR' }),
      site({ id: '2', operator: 'EDF', country: 'FR' }),
    ]);
    expect(cs).toHaveLength(1);
  });

  it('never merges different companies that only share a first word or a generic municipal name', () => {
    expect(names([
      site({ id: '1', operator: 'Enel Produzione S.p.A.', country: 'IT' }),
      site({ id: '2', operator: 'Enel Green Power S.p.A.', country: 'IT' }),
      site({ id: '3', operator: 'Przedsiębiorstwo Energetyki Cieplnej Sp. z o.o.', country: 'PL' }),
      site({ id: '4', operator: 'Przedsiębiorstwo Energetyki Cieplnej S.A.', country: 'PL' }),
      site({ id: '5', operator: 'Stadtwerke Bonn GmbH', country: 'DE' }),
      site({ id: '6', operator: 'Stadtwerke Bonn AG', country: 'DE' }),
    ])).toHaveLength(6);
  });

  it('keeps unparented same-name operators in different countries apart', () => {
    expect(names([
      site({ id: '1', operator: 'Holcim AG', country: 'DE' }),
      site({ id: '2', operator: 'Holcim S.A.', country: 'FR' }),
    ])).toHaveLength(2);
  });

  it('keeps every site and merges some spelling variants in the real data', () => {
    const cs = groupSitesByCompany(ETS1_SITES);
    expect(cs.reduce((a, c) => a + c.sites.length, 0)).toBe(ETS1_SITES.length);
    expect(cs.length).toBeLessThan(new Set(ETS1_SITES.map(s => (s.parentCompany ?? s.operator).trim().toLowerCase())).size);
  });
});

describe('ETS1 biomethane fit (D14, L3)', () => {
  const fitOf = (name: string) => ETS1_SITES.find(s => s.name.includes(name))!;

  it('grades coal and lignite power as LOW, whatever the sector default', () => {
    for (const n of ['PGE GiEK S.A. Oddział Elektrownia Bełchatów', 'Kraftwerk Neurath', 'Kraftwerk Jänschwalde', 'ELEKTROWNIA KOZIENICE']) {
      expect(fitOf(n).sector, n).toBe('POWER_HEAT');
      expect(fitOf(n).fit, n).toBe('LOW');
    }
    expect(resolveFit('POWER_HEAT', 'Kraftwerk Weisweiler Braunkohle GuD', 'RWE')).toBe('LOW');
    expect(resolveFit('POWER_HEAT', 'Elektrownia Węglowa Blok 3', 'X')).toBe('LOW');
  });

  it('grades a power site MEDIUM only when its name says gas', () => {
    expect(fitOf('GuD Herne').fit).toBe('MEDIUM');
    expect(resolveFit('POWER_HEAT', 'CCC - Cartagena', 'Naturgy Ciclos Combinados, S.L.U.')).toBe('MEDIUM');
    expect(resolveFit('POWER_HEAT', 'Aghada CCGT', 'ESB')).toBe('MEDIUM');
    expect(resolveFit('POWER_HEAT', 'Heizkraftwerk Süd', 'SWM')).toBe('LOW');
    expect(resolveFit('POWER_HEAT', 'Heizkraftwerk Süd GuD', 'SWM')).toBe('MEDIUM');
    expect(resolveFit('POWER_HEAT', 'Gichtgaskraftwerk Dillingen', 'Rogesa')).toBe('LOW');
  });

  it('grades integrated iron and steel LOW', () => {
    expect(SECTOR_FIT.METALS).toBe('LOW');
    expect(resolveFit('OTHER_INDUSTRY', 'Integriertes Hüttenwerk Duisburg', 'ThyssenKrupp Steel Europe AG')).toBe('LOW');
    expect(resolveFit('POWER_HEAT', 'Kraftwerk Hallendorf', 'Salzgitter Flachstahl GmbH')).toBe('LOW');
    for (const s of ETS1_SITES.filter(x => /voestalpine|arcelor|thyssenkrupp steel|tata steel/i.test(x.operator) && !/refractor|ogniotrw/i.test(x.name))) {
      expect(s.fit, `${s.operator} / ${s.name}`).toBe('LOW');
    }
  });

  it('keeps process-heat sectors HIGH and refining / chemicals MEDIUM', () => {
    expect(resolveFit('FOOD_BEVERAGE', 'Dairy', 'Arla')).toBe('HIGH');
    expect(resolveFit('GLASS_CERAMICS', 'Float glass', 'Saint-Gobain')).toBe('HIGH');
    expect(resolveFit('CHEMICALS', 'Ammonia', 'Yara')).toBe('MEDIUM');
    expect(resolveFit('REFINING_OIL_GAS', 'Refinery', 'Repsol')).toBe('MEDIUM');
  });

  it('no longer lets coal utilities top the fit-tonnes ranking', () => {
    const top = groupSitesByCompany(ETS1_SITES)
      .sort((a, b) => b.fitVerifiedLatestTco2 - a.fitVerifiedLatestTco2)
      .slice(0, 25)
      .map(c => c.name);
    for (const coal of [/PGE/i, /Lausitz/i, /RWE Power/i, /voestalpine/i, /Oltenia/i]) {
      expect(top.some(n => coal.test(n)), String(coal)).toBe(false);
    }
    const fit = ETS1_SITES.filter(s => s.fit !== 'LOW').reduce((a, s) => a + s.verifiedLatestTco2, 0);
    const total = ETS1_SITES.reduce((a, s) => a + s.verifiedLatestTco2, 0);
    expect(fit / total).toBeLessThan(0.4);
  });
});
