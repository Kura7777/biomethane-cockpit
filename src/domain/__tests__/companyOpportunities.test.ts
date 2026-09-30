import { describe, it, expect } from 'vitest';
import { buildCompanyDirectory, CompanyProfile } from '../companies/directory';
import { computeRegulationExposure, computeOpportunities, biomethaneValueEur, stackAnnualEur, ets1FirstDealShare, ets1StackSpec, shipStackSpec, ets1NetPosition, ets1AbatableTco2, ets1GasShare, biomethaneVolumeMWh, biomethaneEurPerMWh } from '../companies/opportunities';
import { computeValueStack } from '../valueStack/engine';
import { ETS1_LATEST_YEAR } from '../ets1/sites';
import { gasShareOf, defaultGasShare, ETS1_GAS_SHARE_SECTORS } from '../ets1/gasShare';
import { ETS2_COUNTRIES } from '../ets2/countries';
import { ETS_NATURAL_GAS_TCO2_PER_MWH, FUELEU_TARGET_CI_2025 } from '../netback/engine';
import { HHV_TO_LHV_FACTOR } from '../offtake/engine';
import { biomethaneMWhToAbate } from '../ets1/sites';
import { FUELEU_ANNEX_II, bioLngFuelEUIntensity } from '../fueleu/calculator';
import { MarksState } from '../netback/types';

const mark = (id: string, mid: number) => ({ marketId: id, bid: mid, offer: mid, mid, updatedAt: null, source: 'test' });
const marks: MarksState = {
  marks: { EU_ETS1: mark('EU_ETS1', 70), EU_ETS2: mark('EU_ETS2', 50), FUELEU: mark('FUELEU', 250) },
  gasIndex: { bid: null, offer: null, mid: null, updatedAt: null },
  fx: { gbpEur: null, chfEur: null, updatedAt: null },
  pricingSides: { certificateSide: 'mid', moleculeSide: 'mid' },
};
const YEAR = 2026;
const directory = buildCompanyDirectory();
const lngMWhPerT = (FUELEU_ANNEX_II.LNG.lcvMjPerG * 1_000_000) / 3600;
// tCO2e of FuelEU balance one MWh of -100 bio-LNG creates, on the value stack's basis.
const SURPLUS_PER_MWH = ((FUELEU_TARGET_CI_2025 - bioLngFuelEUIntensity(-100)) * 3600) / 1_000_000;
const sum = (p: CompanyProfile, f: (x: CompanyProfile['fueleu'][number]) => number) => p.fueleu.reduce((s, x) => s + f(x), 0);

describe('regulation exposure', () => {
  it('prices ETS maritime and ETS1 at the EUA mark and FuelEU at the pool mark; the total is only the regimes running now', () => {
    const ctv = directory.find(p => p.id === 'cementos tudela veguin')!;
    const x = computeRegulationExposure(ctv, marks, ETS2_COUNTRIES);
    const maritimeT = sum(ctv, f => f.etsCo2Tco2);
    const sites = ctv.ets1.flatMap(c => c.sites);
    const ets1Net = Math.max(0, sites.reduce((s, v) => s + v.verifiedLatestTco2, 0) - sites.reduce((s, v) => s + (v.freeAllocLatestTco2 ?? 0), 0));
    const deficit = sum(ctv, f => f.deficit2026Tco2e);
    expect(x.etsMaritimeEur).toBeCloseTo(maritimeT * 70, 6);
    expect(x.ets1BillEur).toBeCloseTo(ets1Net * 70, 6);
    expect(x.fuelEuCostEur).toBeCloseTo(deficit * 250, 6);
    expect(x.costNowEur).toBeCloseTo(deficit * 250 + maritimeT * 70 + ets1Net * 70, 6);
    // The statutory penalty is kept for the detail view but is not part of what compliance costs.
    expect(x.fuelEuPenaltyEur).toBeGreaterThan(x.fuelEuCostEur as number);
    expect(x.ets2Standing).toBe('NONE');
  });

  it('ETS1 cost is net of free allocation at company level, never negative, and flags unknown allocation and stand-in years', () => {
    const site = (verified: number, free: number | null, prior = false) => ({ verifiedLatestTco2: verified, freeAllocLatestTco2: free, verifiedLatestIsPriorYear: prior }) as never;
    const pos = ets1NetPosition([{ sites: [site(1000, 400), site(500, null, true), site(200, 900)] } as never]);
    expect(pos.grossTco2).toBe(1700);
    expect(pos.freeAllocTco2).toBe(1300);
    expect(pos.netTco2).toBe(400);
    expect(pos.unknownSites).toBe(1);
    expect(pos.priorYearSites).toBe(1);
    // Allocation at one site offsets emissions at another, but the net never goes below zero.
    expect(ets1NetPosition([{ sites: [site(100, 5000)] } as never]).netTco2).toBe(0);
    // The registry's n/a means no allocation was made (0), so no current company is an upper bound.
    const withEts1 = directory.filter(p => p.ets1.length);
    expect(withEts1.every(p => computeRegulationExposure(p, marks, ETS2_COUNTRIES).ets1AllocUnknownSites === 0)).toBe(true);
    const x = computeRegulationExposure(withEts1[0], marks, ETS2_COUNTRIES);
    expect(x.ets1NetTco2).toBeLessThanOrEqual(x.ets1Tco2 as number);
    const stand = directory.find(p => p.ets1.some(c => c.sites.some(v => v.verifiedLatestIsPriorYear)))!;
    expect(computeRegulationExposure(stand, marks, ETS2_COUNTRIES).ets1PriorYearSites).toBeGreaterThan(0);
  });

  it('ETS2 scope: says whether the figure is the ETS2 segment or all segments (an upper bound)', () => {
    const lines = directory.filter(p => p.ets2.length).map(p => computeRegulationExposure(p, marks, ETS2_COUNTRIES).ets2ScopeLines).flat();
    expect(lines.some(l => /ETS2 segment, \d+% of disclosed volume/.test(l))).toBe(true);
  });

  it('a company with no FuelEU deficit is Compliant, not a zero cost; with no pool mark the deficit is unpriced', () => {
    const compliant = directory.find(p => p.fueleu.length && !p.ets1.length && sum(p, f => f.deficit2026Tco2e) === 0);
    if (compliant) {
      const x = computeRegulationExposure(compliant, marks, ETS2_COUNTRIES);
      expect(x.fuelEuState).toBe('COMPLIANT');
      expect(x.fuelEuCostEur).toBe(0);
    }
    const ship = directory.find(p => p.fueleu.length && !p.ets1.length && sum(p, f => f.deficit2026Tco2e) > 0)!;
    const noPool: MarksState = { ...marks, marks: { EU_ETS1: marks.marks['EU_ETS1'], EU_ETS2: marks.marks['EU_ETS2'] } };
    const y = computeRegulationExposure(ship, noPool, ETS2_COUNTRIES);
    expect(y.fuelEuState).toBe('NO_MARK');
    expect(y.fuelEuCostEur).toBeNull();
    expect(y.costNowIncomplete).toBe(true);
    expect(y.fuelEuPenaltyEur).toBeGreaterThan(0);
  });

  it('keeps ETS2 out of the "now" total and marks end users as unquantified', () => {
    const sanofi = directory.find(p => p.id === 'sanofi chimie')!;
    const x = computeRegulationExposure(sanofi, marks, ETS2_COUNTRIES);
    expect(x.ets2Standing).toBe('END_USER');
    expect(x.costNowEur).toBeCloseTo(x.ets1BillEur ?? 0, 6);
  });

  it('ETS2: a supplier with only some countries quantified is PARTIAL and names them; a missing price is not "volume unknown"', () => {
    const endesa = directory.find(p => p.id === 'endesa')!;
    const x = computeRegulationExposure(endesa, marks, ETS2_COUNTRIES);
    expect(['PARTIAL', 'QUANTIFIED']).toContain(x.ets2Standing);
    if (x.ets2Standing === 'PARTIAL') {
      expect(x.ets2CoveredCountries.length).toBeGreaterThan(0);
      expect(x.ets2UncoveredCountries.length).toBeGreaterThan(0);
    }
    const noEts2: MarksState = { ...marks, marks: { EU_ETS1: marks.marks['EU_ETS1'], FUELEU: marks.marks['FUELEU'] } };
    const y = computeRegulationExposure(endesa, noEts2, ETS2_COUNTRIES);
    expect(y.ets2Standing).toBe('NO_ETS2_PRICE');
    expect(y.ets2CostEur).toBeNull();
  });
});

describe('opportunities', () => {
  it('shipping without LNG ships: pooling is the only route, valued at the pool mark not the penalty', () => {
    const p = directory.find(q => q.fueleu.length && sum(q, f => f.deficit2026Tco2e) > 0 && sum(q, f => f.group.lngShipCount) === 0 && !q.ets1.length && !q.ets2.length && sum(q, f => f.bioLngToCloseMWh) > 0)!;
    const ops = computeOpportunities(p, marks, ETS2_COUNTRIES, YEAR);
    expect(ops.map(o => o.id)).toEqual(['ship-pool']);
    expect(ops[0].valueEur).toBeCloseTo(sum(p, f => f.deficit2026Tco2e) * 250, 6);
    expect(ops[0].valueEur).toBeLessThan(sum(p, f => f.penalty2026Eur));
    expect(ops[0].valueLabel).toBe('Compliance at pool price');
    expect(ops[0].caveats.join(' ')).toMatch(/no EU ETS saving/);
  });

  it('a deficit too small to round to a bio-LNG volume is pooled, not called compliant', () => {
    const p = directory.find(q => q.fueleu.length && sum(q, f => f.deficit2026Tco2e) > 0 && sum(q, f => f.bioLngToCloseMWh) === 0);
    if (!p) return;
    const ops = computeOpportunities(p, marks, ETS2_COUNTRIES, YEAR);
    expect(ops.some(o => o.id === 'ship-pool')).toBe(true);
  });

  it('shipping with LNG ships: bio-LNG capped at current LNG burn, the rest pooled; values are at market, pool share = deficit share x pool mark', () => {
    const p = directory.find(q => {
      const need = sum(q, f => f.deficit2026Tco2e) / SURPLUS_PER_MWH;
      const burn = sum(q, f => f.group.lngTonnes) * lngMWhPerT;
      return sum(q, f => f.group.lngShipCount) > 0 && need > burn && burn > 0 && sum(q, f => f.deficit2026Tco2e) > 0;
    });
    expect(p).toBeDefined();
    const ops = computeOpportunities(p!, marks, ETS2_COUNTRIES, YEAR);
    const bio = ops.find(o => o.id === 'ship-bio-lng')!;
    const pool = ops.find(o => o.id === 'ship-pool')!;
    const need = sum(p!, f => f.deficit2026Tco2e) / SURPLUS_PER_MWH;
    expect(bio.volumeMWh).toBeCloseTo(sum(p!, f => f.group.lngTonnes) * lngMWhPerT, 3);
    expect((bio.volumeMWh ?? 0) + (pool.volumeMWh ?? 0)).toBeCloseTo(need, 3);
    expect(pool.valueEur).toBeCloseTo(((sum(p!, f => f.deficit2026Tco2e) * (pool.volumeMWh ?? 0)) / need) * 250, 3);
    expect(bio.valueEur! + pool.valueEur!).toBeLessThan(sum(p!, f => f.penalty2026Eur));
  });

  it('ship-bio-lng: the row, the play and the stack card show the same number', () => {
    const p = directory.find(q => sum(q, f => f.group.lngShipCount) > 0 && sum(q, f => f.bioLngToCloseMWh) > 0 && sum(q, f => f.deficit2026Tco2e) > 0)!;
    const ops = computeOpportunities(p, marks, ETS2_COUNTRIES, YEAR);
    const bio = ops.find(o => o.id === 'ship-bio-lng')!;
    // What ValueStackCard prints: the engine's priced €/MWh rows x the volume (low end while the intra-EU share is open).
    const inputs = bio.stack!.inputs;
    const low = computeValueStack({ ...inputs, intraEuShare: 0 }, marks);
    const cardPerMWh = low.rows.filter(r => r.status === 'COUNTS' && r.eurPerMWh !== null).reduce((a, r) => a + (r.eurPerMWh as number), 0);
    expect(bio.valueEur).toBeCloseTo(cardPerMWh * inputs.volumeMWh!, 4);
    expect(stackAnnualEur(bio.stack!).low).toBeCloseTo(bio.valueEur!, 6);
    // Row = play: the Biomethane potential column is the sum of the NOW plays.
    expect(biomethaneValueEur(ops)).toBeCloseTo(ops.filter(o => o.timing === 'NOW').reduce((a, o) => a + (o.valueEur ?? 0), 0), 6);
    expect(cardPerMWh).toBeGreaterThan(0);
    expect(bio.valueEurHigh ?? bio.valueEur!).toBeGreaterThanOrEqual(bio.valueEur!);
  });

  it('closing the deficit is worth exactly deficit x pool price: the FuelEU part of the bio-LNG play plus the pool play', () => {
    const checked: string[] = [];
    for (const p of directory.filter(q => q.fueleu.length && sum(q, f => f.deficit2026Tco2e) > 0).slice(0, 400)) {
      const ops = computeOpportunities(p, marks, ETS2_COUNTRIES, YEAR);
      const bio = ops.find(o => o.id === 'ship-bio-lng');
      const pool = ops.find(o => o.id === 'ship-pool');
      let fueleu = pool?.valueEur ?? 0;
      if (bio) {
        const rows = computeValueStack(bio.stack!.inputs, marks).rows.filter(r => r.regime === 'FuelEU Maritime');
        fueleu += (rows[0].eurPerMWh as number) * bio.stack!.inputs.volumeMWh!;
      }
      const deficit = sum(p, f => f.deficit2026Tco2e);
      // The bio-LNG volume is rounded to whole MWh, so allow a few euros of rounding.
      expect(Math.abs(fueleu - deficit * 250)).toBeLessThan(0.0005 * deficit * 250 + 30 * 250 * SURPLUS_PER_MWH);
      if (bio) checked.push(p.id);
    }
    expect(checked.length).toBeGreaterThan(0);
  });

  it('EUR per MWh is the potential-weighted value across the NOW plays', () => {
    const basf = directory.find(p => p.id === 'basf')!;
    const ops = computeOpportunities(basf, marks, ETS2_COUNTRIES, YEAR);
    const ets1 = ops.find(o => o.id === 'ets1-biomethane')!;
    expect(biomethaneVolumeMWh(ops)).toBe(ets1.volumeMWh);
    expect(biomethaneEurPerMWh(ops)).toBeCloseTo(ets1.valueEur! / ets1.volumeMWh!, 9);
    // Total value over total volume, not the mean of the per-play rates; FROM_2028 and unsized plays are left out.
    const play = (timing: string, valueEur: number | null, volumeMWh: number | null) => ({ timing, valueEur, volumeMWh }) as never;
    const mixed = [play('NOW', 100, 10), play('NOW', 300, 90), play('FROM_2028', 999, 999), play('NOW', null, 5)];
    expect(biomethaneEurPerMWh(mixed)).toBeCloseTo(4, 9);
    expect(biomethaneVolumeMWh(mixed)).toBe(100);
    expect(biomethaneEurPerMWh([])).toBeNull();
    expect(biomethaneVolumeMWh([])).toBeNull();
  });

  it('ETS1: valued at the full fit-site potential (fit tonnes x EUA, NOT netted for free allocation), first deal shown as a volume only', () => {
    const edison = directory.find(p => p.id === 'basf')!;
    const op = computeOpportunities(edison, marks, ETS2_COUNTRIES, YEAR).find(o => o.id === 'ets1-biomethane')!;
    const fitT = edison.ets1.reduce((s, c) => s + ets1AbatableTco2(c), 0);
    expect(fitT).toBeLessThan(edison.ets1.reduce((s, c) => s + c.fitVerifiedLatestTco2, 0));
    const volume = Math.round(biomethaneMWhToAbate(fitT) / HHV_TO_LHV_FACTOR);
    expect(op.volumeMWh).toBe(volume);
    expect(op.valueEur).toBeCloseTo(fitT * 70, 3);
    expect(op.firstDealMWh).toBe(Math.round(volume * ets1FirstDealShare()));
    expect(ets1FirstDealShare()).toBeCloseTo(0.1, 9);
    // The stack card, on the rounded volume, agrees to within one MWh of value.
    const stack = computeValueStack({ client: 'ETS1_SITE', volumeMWh: volume, carbonIntensity: -100, deliveryYear: YEAR, intraEuShare: null, smallSiteShare: 0, ets2PassThrough: null, greenTariffPremiumEurPerMWh: null, offerPremiumEurPerMWh: null }, marks);
    expect(Math.abs(op.valueEur! - (stack.stackAnnualEur as number))).toBeLessThan(20);
    expect(stackAnnualEur(op.stack!).low).toBeCloseTo(stack.stackAnnualEur as number, 6);
  });

  it('ETS1 tonnes come from the latest EUTL year', () => {
    expect(ETS1_LATEST_YEAR).toBeGreaterThanOrEqual(2023);
  });

  it('ETS2 supplier: allowance cost avoided per MWh from 2028; flags countries already priced today', () => {
    const edison = directory.find(p => p.id === 'edison')!;
    const op = computeOpportunities(edison, marks, ETS2_COUNTRIES, YEAR).find(o => o.id === 'ets2-supplier')!;
    expect(op.timing).toBe('FROM_2028');
    expect(op.valueEurPerMWh).toBeCloseTo(50 * ETS_NATURAL_GAS_TCO2_PER_MWH * HHV_TO_LHV_FACTOR, 6);
    const german = directory.find(p => p.ets2.some(e => e.role === 'REGULATED_SUPPLIER' && e.countryIso === 'DE'))!;
    const deOp = computeOpportunities(german, marks, ETS2_COUNTRIES, YEAR).find(o => o.id === 'ets2-supplier')!;
    expect(deOp.caveats.join(' ')).toMatch(/BEHG/);
  });

  it('exposed end user: corporate order, not a compliance sale', () => {
    const sanofi = directory.find(p => p.id === 'sanofi chimie')!;
    const op = computeOpportunities(sanofi, marks, ETS2_COUNTRIES, YEAR).find(o => o.id === 'ets2-end-user')!;
    expect(op.action?.route).toBe('/corporate');
  });

  it('ranks sized plays first, largest value first', () => {
    for (const p of directory.filter(q => q.markets.length > 2).slice(0, 50)) {
      const ops = computeOpportunities(p, marks, ETS2_COUNTRIES, YEAR);
      const sized = ops.filter(o => o.valueEur !== null);
      expect(ops.slice(0, sized.length)).toEqual(sized);
      for (let i = 1; i < sized.length; i++) expect(sized[i - 1].valueEur!).toBeGreaterThanOrEqual(sized[i].valueEur!);
    }
  });
});

describe('opportunities — fuel caveat', () => {
  it('coal and lignite utilities are low fit, so they are not pitched a biomethane play', () => {
    const pge = directory.find(p => p.id.startsWith('pge polska grupa energetyczna'))!;
    const ops = computeOpportunities(pge, marks, ETS2_COUNTRIES, YEAR);
    expect(ops.some(o => o.id === 'ets1-biomethane')).toBe(false);
    expect(ops.find(o => o.id === 'ets1-low-fit')?.valueEur).toBeNull();
  });

  it('a gas-fired power group is still fit and valued', () => {
    const naturgy = directory.find(p => /naturgy/i.test(p.name) && p.ets1.some(c => c.fitVerifiedLatestTco2 > 0))!;
    const op = computeOpportunities(naturgy, marks, ETS2_COUNTRIES, YEAR).find(o => o.id === 'ets1-biomethane')!;
    expect(op.valueEur).toBeGreaterThan(0);
    expect(op.caveats.join(' ')).not.toMatch(/lignite/);
  });
});

describe('ETS1 gas share (Eurostat)', () => {
  it('share maths on a small fixture: gas CO2 over all combustible-fuel CO2, 2 decimals', () => {
    const fuels = [
      { siec: 'G3000', name: 'Natural gas', tj: 100, efKgPerTj: 56100 },
      { siec: 'O4610', name: 'Refinery gas', tj: 200, efKgPerTj: 57600 },
      { siec: 'O4694', name: 'Petroleum coke', tj: 50, efKgPerTj: 97500 },
    ];
    // 5.61 / (5.61 + 11.52 + 4.875) = 0.2549 -> 0.25
    expect(gasShareOf(fuels)).toBe(0.25);
    expect(gasShareOf([{ siec: 'G3000', name: 'Natural gas', tj: 10, efKgPerTj: 56100 }])).toBe(1);
    expect(gasShareOf([])).toBe(0);
  });

  it('sector shares from the Eurostat table are sensible and registered', () => {
    expect(defaultGasShare('REFINING_OIL_GAS')).toBeCloseTo(0.19, 2);
    expect(defaultGasShare('FOOD_BEVERAGE')).toBeGreaterThan(defaultGasShare('REFINING_OIL_GAS'));
    expect(defaultGasShare('POWER_HEAT')).toBe(1);
    for (const sec of ETS1_GAS_SHARE_SECTORS) expect(ets1GasShare(sec)).toBe(defaultGasShare(sec));
  });

  it('ORLEN is valued on its gas share, not its full fit tonnage', () => {
    const orlen = directory.find(p => /^ORLEN S\.A/.test(p.name) && p.ets1.length)!;
    const gross = orlen.ets1.reduce((s, c) => s + c.fitVerifiedLatestTco2, 0);
    const op = computeOpportunities(orlen, marks, ETS2_COUNTRIES, YEAR).find(o => o.id === 'ets1-biomethane')!;
    const abatable = orlen.ets1.reduce((s, c) => s + ets1AbatableTco2(c), 0);
    expect(abatable).toBeLessThan(gross * 0.5);
    expect(op.valueEur).toBeCloseTo(abatable * 70, 3);
    expect(op.valueEur! / (gross * 70)).toBeCloseTo(abatable / gross, 6);
    expect(op.valueBasis).toMatch(/gas share \d+% of site emissions/);
  });
});

describe('opportunities — oil & gas caveat', () => {
  it('flags companies whose fit emissions are mostly refining / oil & gas installations', () => {
    const equinor = directory.find(p => p.id === 'equinor')!;
    const op = computeOpportunities(equinor, marks, ETS2_COUNTRIES, YEAR).find(o => o.id === 'ets1-biomethane')!;
    expect(op.title).toMatch(/check fuel/);
    expect(op.caveats.join(' ')).toMatch(/offshore/);
  });
});

describe('value stack per play', () => {
  it('a ship burning bio-LNG stacks FuelEU and EU ETS maritime on the same MWh, as a range until the intra-EU share is known', () => {
    const spec = shipStackSpec(10_000, marks, YEAR);
    expect(spec.isStack).toBe(true);
    expect(spec.pricedRegimes).toEqual(['FuelEU Maritime', 'EU ETS (maritime)']);
    // ETS maritime covers 50% of extra-EU voyages, 100% of intra-EU ones.
    const ets = 70 * ETS_NATURAL_GAS_TCO2_PER_MWH;
    expect((spec.eurPerMWhHigh as number) - (spec.eurPerMWhLow as number)).toBeCloseTo(ets / 2, 6);
  });

  it('an ETS1 group is one priced regime plus claims — not badged as a stack, from 2028 either', () => {
    const spec = ets1StackSpec(100_000, marks, YEAR)!;
    expect(spec.isStack).toBe(false);
    // From 2028 the ETS2 small-site row counts, but at zero EUR/MWh: still not a stack.
    const later = ets1StackSpec(100_000, marks, 2028)!;
    expect(later.isStack).toBe(false);
    expect(later.pricedRegimes).toEqual(['EU ETS1 (installation)']);
    expect(spec.pricedRegimes).toEqual(['EU ETS1 (installation)']);
    expect(spec.claims.length).toBeGreaterThan(0);
    expect(spec.eurPerMWhLow).toBeCloseTo(70 * ETS_NATURAL_GAS_TCO2_PER_MWH * HHV_TO_LHV_FACTOR, 6);
  });

  it('the ETS1 play carries its stack, and no play links to the retired value-stack screen', () => {
    const edison = directory.find(p => p.id === 'edison')!;
    const ops = computeOpportunities(edison, marks, ETS2_COUNTRIES, YEAR);
    expect(ops.find(o => o.id === 'ets1-biomethane')?.stack).not.toBeNull();
    for (const p of directory.filter(q => q.markets.length > 1).slice(0, 200)) {
      for (const o of computeOpportunities(p, marks, ETS2_COUNTRIES, YEAR)) expect(o.action?.route).not.toBe('/value-stack');
    }
  });

  it('only plays where the client burns the biomethane itself get a stack (not pooling, not sourcing)', () => {
    const pooled = directory.find(q => q.fueleu.length && sum(q, f => f.deficit2026Tco2e) > 0 && sum(q, f => f.group.lngShipCount) === 0 && !q.ets1.length && !q.ets2.length)!;
    const ops = computeOpportunities(pooled, marks, ETS2_COUNTRIES, YEAR);
    expect(ops.every(o => o.stack === null)).toBe(true);
  });
});
