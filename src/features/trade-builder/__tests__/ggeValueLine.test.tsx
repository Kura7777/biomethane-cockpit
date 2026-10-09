import React from 'react';
import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { StaticRouter } from 'react-router-dom/server';
import { getMarketById } from '../../../domain/markets/registry';
import { computeNetback } from '../../../domain/netback/engine';
import { computeGgeBreakdown } from '../../../domain/netback/gge';
import { Consignment } from '../../../domain/consignment/types';
import { emptyCustodyPack } from '../../../domain/consignment/custody';
import { MarksState } from '../../../domain/netback/types';
import { GgeValueLine } from '../GgeValueLine';

const GGE = getMarketById('NL_GGE')!;

const consignment: Consignment = {
  id: 'C1',
  name: 'Biometano Ólvega',
  originCountry: 'ES',
  originCountryName: 'Spain',
  feedstock: 'manure',
  feedstockName: 'Manure & slurry',
  annexClassification: 'IX_A',
  carbonIntensity: -40,
  commissioningDateRange: 'POST_2021_TO_2025',
  certificationScheme: 'ISCC_EU',
  chainOfCustody: 'MASS_BALANCE',
  injectionCountry: 'ES',
  injectionIsEU: true,
  udbStatus: 'PENDING',
  posStatus: 'ISSUED',
  volumeMWh: 1000,
  deliveryPeriod: { type: 'CALENDAR', startDate: '2027-01-01', endDate: '2027-12-31', complianceYear: 2027 },
  custody: { ...emptyCustodyPack(), go: null, pos: null },
};

const marks = {
  marks: { NL_GGE: { bid: 0.37, offer: 0.39, mid: 0.38, provenance: null } },
  gasIndex: { bid: 30, offer: 30.5, mid: 30.25, provenance: null },
  pricingSides: { certificateSide: 'mid', moleculeSide: 'mid' },
} as unknown as MarksState;

const costs = { transferCosts: 0, certificationCosts: 0, logistics: 0, otherCosts: 0 };

describe('GGE value line', () => {
  it('reads the same figures the engine uses: 388.8 GGE per GO MWh at the Spanish LHV factor', () => {
    const gge = computeGgeBreakdown(GGE, consignment, 0.38);
    expect(gge.ggePerGoMwh).toBeCloseTo(388.8, 5);
    expect(gge.lhvFactor).toBe(0.9);
    expect(gge.lhvOpen).toBe(true);
    expect(gge.buyoutEurPerGge).toBe(0.45);
    expect(gge.aboveBuyout).toBe(false);
    const nb = computeNetback(GGE, consignment, marks, costs, 'mid');
    expect(nb.certificateValue!.valueEurPerMWh).toBeCloseTo(0.38 * gge.ggePerGoMwh, 2);
  });

  it('flags a mark above that year’s buy-out', () => {
    expect(computeGgeBreakdown(GGE, consignment, 0.5).aboveBuyout).toBe(true);
  });

  it('renders GGE per MWh, the LHV factor with its OPEN chip, the mark vs buy-out and the value', () => {
    const gge = computeGgeBreakdown(GGE, consignment, 0.38);
    const nb = computeNetback(GGE, consignment, marks, costs, 'mid');
    const html = renderToStaticMarkup(
      <StaticRouter location="/trade">
        <GgeValueLine gge={gge} valueEurPerMwh={nb.certificateValue!.valueEurPerMWh} costLines={nb.routeCostLines ?? []} variant="ticket" />
      </StaticRouter>
    );
    expect(html).toContain('388.8');
    expect(html).toContain('OPEN');
    expect(html).toContain('Mark vs 2027 buy-out');
    expect(html).toContain('€0.380 vs €0.450');
    expect(html).toContain('Edit on');
    expect(html).toContain('/pricing?tab=assumptions');
    // Bundle at origin by default: GO fees show (with OPEN placeholders), no TTF spread line
    expect(html).toContain('Enagás GdO export fee');
    expect(html).not.toContain('→ TTF');
  });

  it('adds the PVB–TTF spread cost line for structure B', () => {
    const deliveredTtf: Consignment = { ...consignment, custody: { ...emptyCustodyPack(), structure: 'BUNDLE_DELIVERED_TTF' } };
    const nb = computeNetback(GGE, deliveredTtf, marks, costs, 'mid');
    const html = renderToStaticMarkup(
      <StaticRouter location="/trade">
        <GgeValueLine gge={computeGgeBreakdown(GGE, deliveredTtf, 0.38)} valueEurPerMwh={nb.certificateValue!.valueEurPerMWh} costLines={nb.routeCostLines ?? []} variant="grid" />
      </StaticRouter>
    );
    expect(html).toContain('ES → TTF');
  });
});
