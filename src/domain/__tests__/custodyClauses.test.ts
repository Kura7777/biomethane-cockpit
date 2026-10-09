import { describe, it, expect } from 'vitest';
import { getMarketById } from '../markets/registry';
import { evaluateEligibility } from '../eligibility/engine';
import { computeNetback } from '../netback/engine';
import { MarksState } from '../netback/types';
import { Consignment, CustodyPack } from '../consignment/types';
import { TradeAssessment } from '../trade/types';
import { buildCustodyClauses } from '../trade/custodyClauses';
import { environmentalAttributeLabel } from '../trade/legalPackage';
import {
  generateCommercialTermSheetPdf,
  generateEfetBiomethaneAnnexPdf,
  generateStatutoryAuditMemoPdf,
} from '../trade/legalPackagePdf';

const pack: CustodyPack = {
  go: {
    registry: 'Enagás GdO', issuingCountry: 'ES', seriesNumber: 'ES-GO-1', issueDate: '2027-04-05',
    productionStart: '2027-03-01', productionEnd: '2027-03-31', energyMWh: 1000, energyBasis: 'HHV',
    supportType: 'NONE', gridInjected: true,
  },
  pos: {
    posNumber: 'POS-1', udbNumber: null, scheme: 'ISCC_EU', feedstock: 'Manure', feedstockOriginCountry: 'ES',
    feedstockShares: [], ciTotal: -40, ciSteps: null, supportDeclared: 'NONE', mwh: 900,
  },
  claims: { notUsedElsewhere: true, prtrGrant: 'YES', prtrLegalCheckDone: true, ownTraderCertified: true, counterpartyCertified: true },
  structure: 'BUNDLE_AT_ORIGIN',
  plannedBookingDate: '2027-06-01',
};

const consignment: Consignment = {
  id: 'C1',
  name: 'Biometano Ólvega',
  originCountry: 'ES',
  originCountryName: 'Spain',
  originPlantName: 'Biometano Ólvega',
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
  counterparty: 'Dutch Supplier B.V.',
  deliveryPeriod: {
    type: 'CUSTOM', startDate: '2027-03-01', endDate: '2027-03-31', complianceYear: 2027,
    productionStartDate: '2027-03-01', productionEndDate: '2027-03-31',
  },
  custody: pack,
};

const marks = {
  marks: { NL_GGE: { bid: 0.37, offer: 0.39, mid: 0.38, provenance: null }, DE_THG: { bid: 100, offer: 110, mid: 105, provenance: null } },
  gasIndex: { bid: 30, offer: 30.5, mid: 30.25, provenance: null },
  pricingSides: { certificateSide: 'mid', moleculeSide: 'mid' },
} as unknown as MarksState;

function assess(marketId: string, c: Consignment = consignment): TradeAssessment {
  const market = getMarketById(marketId)!;
  const costs = { transferCosts: 0, certificationCosts: 0, logistics: 0, otherCosts: 0 };
  return {
    id: 'DEAL-TEST',
    createdAt: '2026-10-09T10:00:00.000Z',
    consignment: c,
    targetMarketId: marketId,
    targetMarketName: market.name,
    eligibility: evaluateEligibility(c, market),
    netback: computeNetback(market, c, marks, costs, 'mid'),
    marks,
    costs,
    userNotes: '',
  };
}

describe('chain-of-custody clauses (legal pack)', () => {
  it('NL GGE: the five warranties, the 5-year indemnity at the buy-out, retention, deliverables and timing', () => {
    const clauses = buildCustodyClauses(assess('NL_GGE'))!;
    expect(clauses.variant).toBe('PAIRED_GO_POS');
    expect(clauses.warranties.map(w => w.ref)).toEqual(['R6', 'R11', 'S3', 'R25', 'R14']);
    expect(clauses.warranties.find(w => w.ref === 'R25')!.text).toMatch(/Spanish transport or quota.*ERE.*THG.*ETS 1/);
    expect(clauses.warranties.find(w => w.ref === 'R14')!.text).toMatch(/country of origin of the feedstock.*each step.*support/);
    expect(clauses.indemnity).toContain('within 5 years of booking');
    expect(clauses.indemnity).toContain('€450 per tonne CO2e');
    expect(clauses.retention).toContain('at least 5 years');
    expect(clauses.deliverables.join(' ')).toMatch(/EECS Guarantee of Origin.*support and grid-injection/);
    expect(clauses.deliverables.join(' ')).toMatch(/mass-balance statement/i);
    // Effective booking deadline from the checklist: GO for March 2027 expires 31 March 2028
    expect(clauses.timing).toContain("Buyer's VertiCer account before the effective booking deadline, 2028-03-31");
    expect(clauses.riskDisclosure.join(' ')).toContain('Senate vote is pending');
    expect(clauses.internalExposure).toContain('GGE');
  });

  it('asks for the PRTR warranty only for a Spanish plant that may have a grant', () => {
    const noGrant = buildCustodyClauses(assess('NL_GGE', { ...consignment, custody: { ...pack, claims: { ...pack.claims, prtrGrant: 'NONE' } } }))!;
    expect(noGrant.warranties.map(w => w.ref)).not.toContain('S3');
    const unknown = buildCustodyClauses(assess('NL_GGE', { ...consignment, custody: { ...pack, claims: { ...pack.claims, prtrGrant: 'UNKNOWN' } } }))!;
    expect(unknown.warranties.find(w => w.ref === 'S3')!.text).toContain('Seller to confirm');
    const dutch = { ...consignment, originCountry: 'NL', injectionCountry: 'NL' };
    expect(buildCustodyClauses(assess('NL_GGE', dutch))!.warranties.map(w => w.ref)).not.toContain('S3');
  });

  it('shows the effective deadline as to be agreed until the production dates are entered', () => {
    const noDates = { ...consignment, deliveryPeriod: { ...consignment.deliveryPeriod!, productionEndDate: null, endDate: null, complianceYear: null }, custody: { ...pack, go: { ...pack.go!, productionEnd: '' } } };
    expect(buildCustodyClauses(assess('NL_GGE', noDates))!.timing).toContain('[TO BE AGREED]');
  });

  it('DE THG: only the PoS-relevant subset (no GO, no NEa indemnity, no timing)', () => {
    const clauses = buildCustodyClauses(assess('DE_THG'))!;
    expect(clauses.variant).toBe('POS_ONLY');
    expect(clauses.warranties.map(w => w.ref)).toEqual(['PoS', 'Claims']);
    expect(clauses.indemnity).toBeNull();
    expect(clauses.timing).toBeNull();
    expect(clauses.deliverables.join(' ')).not.toMatch(/Guarantee of Origin/);
  });

  it('leaves every other market without these clauses', () => {
    expect(buildCustodyClauses(assess('NL_ERE'))).toBeNull();
    expect(buildCustodyClauses(assess('FR_GO'))).toBeNull();
  });

  it('labels the NL GGE attribute as GO and PoS delivered together', () => {
    expect(environmentalAttributeLabel(getMarketById('NL_GGE'), 'NL_GGE', 'PENDING')).toContain('Guarantee of Origin (GO) and Proof of Sustainability (PoS)');
  });
});

describe('legal pack PDFs with the custody clauses', () => {
  const text = (doc: { output: (t?: string) => string }) => doc.output();

  it('prints the clauses in the confirmation and the term sheet, and the exposure only in the internal memo', () => {
    const a = assess('NL_GGE');
    const confirmation = generateEfetBiomethaneAnnexPdf(a);
    const termSheet = generateCommercialTermSheetPdf(a);
    const memo = generateStatutoryAuditMemoPdf(a);

    expect(text(confirmation)).toContain('Seller warranties');
    expect(text(confirmation)).toContain('Indemnity');
    expect(text(confirmation)).toContain('Deliverables');
    expect(text(confirmation)).not.toContain('Claw-back exposure');
    expect(text(termSheet)).toContain('Seller warranties');
    expect(text(termSheet)).not.toContain('Claw-back exposure');
    expect(text(memo)).toContain('Claw-back exposure');
    expect(memo.getNumberOfPages()).toBe(3);
    expect(text(memo)).toContain('PAGE 3 OF 3');
  });

  it('keeps a normal deal as it was: no custody section, two-page memo', () => {
    const a = assess('NL_ERE');
    expect(text(generateEfetBiomethaneAnnexPdf(a))).not.toContain('Seller warranties');
    expect(text(generateStatutoryAuditMemoPdf(a))).toContain('PAGE 2 OF 2');
  });

  it('a THG confirmation carries only the PoS subset', () => {
    const t = text(generateEfetBiomethaneAnnexPdf(assess('DE_THG')));
    expect(t).toContain('Seller warranties');
    expect(t).not.toContain('Indemnity');
  });
});
