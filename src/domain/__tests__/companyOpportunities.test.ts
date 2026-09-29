import { describe, it, expect } from 'vitest';
import { buildCompanyDirectory, CompanyProfile } from '../companies/directory';
import { computeRegulationExposure, computeOpportunities, ETS1_FIRST_DEAL_SHARE } from '../companies/opportunities';
import { computeValueStack } from '../valueStack/engine';
import { ETS2_COUNTRIES } from '../ets2/countries';
import { ETS_NATURAL_GAS_TCO2_PER_MWH } from '../netback/engine';
import { HHV_TO_LHV_FACTOR } from '../offtake/engine';
import { biomethaneMWhToAbate } from '../ets1/sites';
import { FUELEU_ANNEX_II } from '../fueleu/calculator';
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
const sum = (p: CompanyProfile, f: (x: CompanyProfile['fueleu'][number]) => number) => p.fueleu.reduce((s, x) => s + f(x), 0);

describe('regulation exposure', () => {
  it('prices ETS maritime and ETS1 at the EUA mark and adds only today\'s regimes to the total', () => {
    const ctv = directory.find(p => p.id === 'cementos tudela veguin')!;
    const x = computeRegulationExposure(ctv, marks, ETS2_COUNTRIES);
    const maritimeT = sum(ctv, f => f.etsCo2Tco2);
    const ets1T = ctv.ets1.reduce((s, c) => s + c.verifiedLatestTco2, 0);
    expect(x.etsMaritimeEur).toBeCloseTo(maritimeT * 70, 6);
    expect(x.ets1BillEur).toBeCloseTo(ets1T * 70, 6);
    expect(x.costAtStakeNowEur).toBeCloseTo((x.fuelEuPenaltyEur ?? 0) + maritimeT * 70 + ets1T * 70, 6);
    expect(x.ets2Standing).toBe('NONE');
  });

  it('keeps ETS2 out of the "now" total and marks end users as unquantified', () => {
    const sanofi = directory.find(p => p.id === 'sanofi')!;
    const x = computeRegulationExposure(sanofi, marks, ETS2_COUNTRIES);
    expect(x.ets2Standing).toBe('END_USER');
    expect(x.costAtStakeNowEur).toBeCloseTo(x.ets1BillEur ?? 0, 6);
  });
});

describe('opportunities', () => {
  it('shipping without LNG ships: pooling is the only route, worth the full penalty', () => {
    const p = directory.find(q => q.fueleu.length && sum(q, f => f.deficit2026Tco2e) > 0 && sum(q, f => f.group.lngShipCount) === 0 && !q.ets1.length && !q.ets2.length)!;
    const ops = computeOpportunities(p, marks, ETS2_COUNTRIES, YEAR);
    expect(ops.map(o => o.id)).toEqual(['ship-pool']);
    expect(ops[0].valueEur).toBeCloseTo(sum(p, f => f.penalty2026Eur), 6);
    expect(ops[0].caveats.join(' ')).toMatch(/no EU ETS saving/);
  });

  it('shipping with LNG ships: bio-LNG capped at current LNG burn, the rest pooled, values add up to the penalty', () => {
    const p = directory.find(q => {
      const need = sum(q, f => f.bioLngToCloseMWh);
      const burn = sum(q, f => f.group.lngTonnes) * lngMWhPerT;
      return sum(q, f => f.group.lngShipCount) > 0 && need > burn && burn > 0 && sum(q, f => f.deficit2026Tco2e) > 0;
    });
    expect(p).toBeDefined();
    const ops = computeOpportunities(p!, marks, ETS2_COUNTRIES, YEAR);
    const bio = ops.find(o => o.id === 'ship-bio-lng')!;
    const pool = ops.find(o => o.id === 'ship-pool')!;
    expect(bio.volumeMWh).toBeCloseTo(sum(p!, f => f.group.lngTonnes) * lngMWhPerT, 3);
    expect((bio.volumeMWh ?? 0) + (pool.volumeMWh ?? 0)).toBeCloseTo(sum(p!, f => f.bioLngToCloseMWh), 3);
    expect((bio.valueEur ?? 0) + (pool.valueEur ?? 0)).toBeCloseTo(sum(p!, f => f.penalty2026Eur), 3);
  });

  it('ETS1: sized at 10% of fit-site emissions and valued by the value-stack engine', () => {
    const edison = directory.find(p => p.id === 'edison')!;
    const op = computeOpportunities(edison, marks, ETS2_COUNTRIES, YEAR).find(o => o.id === 'ets1-biomethane')!;
    const fitT = edison.ets1.reduce((s, c) => s + c.fitVerifiedLatestTco2, 0);
    const volume = Math.round(biomethaneMWhToAbate(fitT * ETS1_FIRST_DEAL_SHARE) / HHV_TO_LHV_FACTOR);
    expect(op.volumeMWh).toBe(volume);
    const stack = computeValueStack({ client: 'ETS1_SITE', volumeMWh: volume, carbonIntensity: -100, deliveryYear: YEAR, intraEuShare: null, smallSiteShare: 0, ets2PassThrough: null, greenTariffPremiumEurPerMWh: null, offerPremiumEurPerMWh: null }, marks);
    expect(op.valueEur).toBeCloseTo(stack.stackAnnualEur as number, 6);
    // Cross-check: the saving is 10% of the fit-site allowance bill.
    expect(op.valueEur! / (fitT * ETS1_FIRST_DEAL_SHARE * 70)).toBeCloseTo(1, 3);
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
    const sanofi = directory.find(p => p.id === 'sanofi')!;
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
  it('flags companies whose fit emissions are mostly power & heat plants (fuel unknown)', () => {
    const pge = directory.find(p => p.id.startsWith('pge polska grupa energetyczna'))!;
    const op = computeOpportunities(pge, marks, ETS2_COUNTRIES, YEAR).find(o => o.id === 'ets1-biomethane')!;
    expect(op.title).toMatch(/check fuel/);
    expect(op.caveats[0]).toMatch(/coal or lignite|Coal- or lignite/);
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
  it('a ship burning bio-LNG stacks FuelEU and EU ETS maritime on the same MWh, as a range until the intra-EU share is known', async () => {
    const { shipStackSpec } = await import('../companies/opportunities');
    const spec = shipStackSpec(10_000, marks, YEAR);
    expect(spec.isStack).toBe(true);
    expect(spec.pricedRegimes).toEqual(['FuelEU Maritime', 'EU ETS (maritime)']);
    // ETS maritime covers 50% of extra-EU voyages, 100% of intra-EU ones.
    const ets = 70 * ETS_NATURAL_GAS_TCO2_PER_MWH;
    expect((spec.eurPerMWhHigh as number) - (spec.eurPerMWhLow as number)).toBeCloseTo(ets / 2, 6);
  });

  it('an ETS1 group is one priced regime plus claims — not badged as a stack', async () => {
    const { ets1StackSpec } = await import('../companies/opportunities');
    const spec = ets1StackSpec(100_000, marks, YEAR)!;
    expect(spec.isStack).toBe(false);
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
