import React from 'react';
import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { getMarketById } from '../../../domain/markets/registry';
import { evaluateEligibility } from '../../../domain/eligibility/engine';
import { Consignment, CustodyPack } from '../../../domain/consignment/types';
import { custodyPartsForMarket, emptyCustodyPack } from '../../../domain/consignment/custody';
import { CocChecklistPanel } from '../custody/CocChecklistPanel';
import { CustodyPackForm } from '../custody/CustodyPackForm';
import { fieldTargetFor, summariseChecklist } from '../custody/checklistModel';

const GGE = getMarketById('NL_GGE')!;
const THG = getMarketById('DE_THG')!;
const DE_GO = getMarketById('DE_GO')!;

const base: Consignment = {
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
  deliveryPeriod: {
    type: 'CUSTOM', startDate: '2027-03-01', endDate: '2027-03-31', complianceYear: 2027,
    productionStartDate: '2027-03-01', productionEndDate: '2027-03-31',
  },
};

const fullPack: CustodyPack = {
  go: {
    registry: 'Enagás GdO', issuingCountry: 'ES', seriesNumber: 'ES-GO-1', issueDate: '2027-04-05',
    productionStart: '2027-03-01', productionEnd: '2027-03-31', energyMWh: 1000, energyBasis: 'HHV',
    supportType: 'NONE', gridInjected: true,
  },
  pos: {
    posNumber: 'POS-1', udbNumber: null, scheme: 'ISCC_EU', feedstock: 'Manure', feedstockOriginCountry: 'ES',
    feedstockShares: [], ciTotal: -40, ciSteps: null, supportDeclared: 'NONE', mwh: 900,
  },
  claims: { notUsedElsewhere: true, prtrGrant: 'NONE', prtrLegalCheckDone: false, ownTraderCertified: true, counterpartyCertified: true },
  structure: 'BUNDLE_AT_ORIGIN',
  plannedBookingDate: '2027-06-01',
};

const gateFor = (custody: CustodyPack | null, market = GGE) =>
  evaluateEligibility({ ...base, custody }, market).gates.find(g => g.gate === 'CHAIN_OF_CUSTODY')!;

describe('checklist summary', () => {
  it('reads a fully documented NL GGE deal as PASS — not yet law', () => {
    const s = summariseChecklist(gateFor(fullPack));
    expect(s.label).toBe('PASS — not yet law');
    expect(s.lawNote).toContain('Senate vote pending');
    expect(s.counts.FAIL).toBe(0);
  });

  it('is open (TODOs) while the pack is empty and blocked when a row fails', () => {
    expect(summariseChecklist(gateFor(null)).label).toBe('OPEN ITEMS');
    const aided = { ...fullPack, go: { ...fullPack.go!, supportType: 'OPERATING' as const } };
    expect(summariseChecklist(gateFor(aided)).label).toBe('BLOCKED');
  });
});

describe('checklist rows link to the field that fixes them', () => {
  const parts = custodyPartsForMarket(GGE);
  const items = gateFor(null).checklist!;
  const target = (id: string, custody: CustodyPack | null = null) => fieldTargetFor(items.find(i => i.id === id)!, custody, parts);

  it('maps each TODO row of an empty pack to a custody field', () => {
    expect(target('go-pos-pairing')).toBe('cust-go-mwh');
    expect(target('no-operating-aid')).toBe('cust-go-support');
    expect(target('spanish-prtr-grant')).toBe('cust-claim-prtr');
    expect(target('booking-deadlines')).toBe('cust-go-prod-end');
    expect(target('no-double-claim')).toBe('cust-claim-unused');
    expect(target('certified-chain')).toBe('cust-claim-own');
  });

  it('moves on to the next empty field once the first is filled', () => {
    expect(target('go-pos-pairing', { ...emptyCustodyPack(), go: { ...fullPack.go! } })).toBe('cust-pos-mwh');
    expect(target('booking-deadlines', fullPack)).toBe('cust-booking');
  });

  it('gives the information rows no field', () => {
    expect(target('legislative-status')).toBeNull();
    expect(target('udb-recording')).toBeNull();
  });
});

describe('CocChecklistPanel', () => {
  it('renders one row per item with its status chip, the verdict and a fix link for open rows', () => {
    const gate = gateFor(null);
    const html = renderToStaticMarkup(
      <CocChecklistPanel gate={gate} origin="ES" targetCountry="NL" custody={null} parts={custodyPartsForMarket(GGE)} onFix={() => {}} />
    );
    for (const item of gate.checklist!) expect(html).toContain(`data-testid="cl-row-${item.id}"`);
    expect(html).toContain('data-testid="coc-verdict"');
    expect(html).toContain('OPEN ITEMS');
    expect(html).toContain('data-testid="cl-fix-go-pos-pairing"');
    expect(html).toContain('data-testid="cl-status-todo"');
  });

  it('shows PASS — not yet law beside a complete deal and a passing GO route needs no fix link', () => {
    const html = renderToStaticMarkup(
      <CocChecklistPanel gate={gateFor(fullPack)} origin="ES" targetCountry="NL" custody={fullPack} parts={custodyPartsForMarket(GGE)} onFix={() => {}} />
    );
    expect(html).toContain('PASS — not yet law');
    expect(html).not.toContain('data-testid="cl-fix-go-route-nl"');
  });
});

describe('CustodyPackForm shows the parts the market asks for', () => {
  const render = (market: typeof GGE) =>
    renderToStaticMarkup(
      <CustodyPackForm market={market} origin="ES" custody={null} onChange={() => {}} onOpenPoS={() => {}} />
    );

  it('NL GGE: GO, PoS, claims, structure and booking date', () => {
    const html = render(GGE);
    expect(html).toContain('Guarantee of Origin (GO)');
    expect(html).toContain('Proof of Sustainability (PoS)');
    expect(html).toContain('Bundle at origin (PVB)');
    expect(html).toContain('Delivered TTF');
    expect(html).toContain('id="cust-booking"');
    expect(html).toContain('id="cust-claim-prtr"');
  });

  it('a PoS-only market hides the GO part and the structure', () => {
    const html = render(THG);
    expect(html).not.toContain('Guarantee of Origin (GO)');
    expect(html).toContain('Proof of Sustainability (PoS)');
    expect(html).not.toContain('Deal structure');
  });

  it('a GO market hides the PoS part', () => {
    const html = render(DE_GO);
    expect(html).toContain('Guarantee of Origin (GO)');
    expect(html).not.toContain('Proof of Sustainability (PoS)');
  });

  it('lists what a partly parsed PoS still needs', () => {
    const html = renderToStaticMarkup(
      <CustodyPackForm
        market={GGE}
        origin="ES"
        custody={{ ...emptyCustodyPack(), pos: { ...fullPack.pos!, feedstockOriginCountry: null, mwh: null } }}
        onChange={() => {}}
        onOpenPoS={() => {}}
      />
    );
    expect(html).toContain('Enter manually: feedstock origin, MWh.');
  });
});
