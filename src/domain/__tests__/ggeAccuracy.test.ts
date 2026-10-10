import { describe, it, expect } from 'vitest';
import { PLANT_RESEARCH } from '../plants/plantResearch.generated';
import { BIOMETHANE_PLANTS } from '../plants/plantsData';
import {
  aidStatus,
  getPlantComplianceDefaults,
  plantFeedstockForCi,
  researchedOperatingSince,
  researchedPlantEntity,
} from '../plants/compliance';
import { evaluateEligibility } from '../eligibility/engine';
import { getMarketById } from '../markets/registry';
import { compareDestinations, bestDestination } from '../arbitrage/destinationComparison';
import { compareDestinationsForPlant } from '../arbitrage/plantDestinations';
import { feedstockKeyForPlant } from '../trade/dealDefaults';
import { FEEDSTOCK_REGISTRY, REFERENCE_CONSIGNMENTS } from '../consignment/feedstocks';
import { emptyCustodyPack } from '../consignment/custody';
import { feedstockDefaultCi } from '../assumptions/registry';
import { buildConsignmentLadder } from '../briefing/morningBrief';
import type { Consignment } from '../consignment/types';
import type { MarksState } from '../netback/types';

const NOW = new Date('2026-10-10T12:00:00Z');
const marks = {
  marks: {
    NL_GGE: { bid: 0.37, offer: 0.39, mid: 0.38, provenance: null },
    DE_THG: { bid: 100, offer: 110, mid: 105, provenance: null },
  },
  gasIndex: { bid: 30, offer: 30.5, mid: 30.25, provenance: null },
  pricingSides: { certificateSide: 'mid', moleculeSide: 'mid' },
} as unknown as MarksState;
const costs = { transferCosts: 1, certificationCosts: 1, logistics: 1, otherCosts: 0 };
const olvega = BIOMETHANE_PLANTS.find(p => p.id === 'plant_es_11')!;

const idsWhere = (pick: (c: NonNullable<(typeof PLANT_RESEARCH)[string]['compliance']>) => boolean) =>
  Object.entries(PLANT_RESEARCH).filter(([, r]) => r.compliance && pick(r.compliance)).map(([id]) => id).sort();

describe('aid class and other-programme PRTR (structured fields, no text parsing)', () => {
  it('classifies the researched aid exactly', () => {
    expect(idsWhere(c => c.aidClass === 'OPERATING')).toEqual(['plant_es_12', 'plant_es_17', 'plant_es_19', 'plant_es_7']);
    expect(idsWhere(c => c.aidClass === 'INVESTMENT_ONLY')).toEqual(['plant_es_10', 'plant_es_11', 'plant_es_24', 'plant_es_26', 'plant_es_3']);
    expect(idsWhere(c => Boolean(c.otherPrtrFunded))).toEqual(['plant_es_11', 'plant_es_26', 'plant_es_3']);
    expect(aidStatus(PLANT_RESEARCH['plant_es_7'].compliance)).toBe('OPERATING');
  });

  const consignmentFor = (plantId: string): Consignment => ({
    ...REFERENCE_CONSIGNMENTS.SPANISH_MANURE,
    custody: { ...emptyCustodyPack(), ...getPlantComplianceDefaults(plantId, 'ES', NOW) },
  });
  const checklist = (c: Consignment) =>
    evaluateEligibility(c, getMarketById('NL_GGE')!).gates.find(g => g.gate === 'CHAIN_OF_CUSTODY')!.checklist!;

  it('BioVO (REER aid mid-text) pre-fills Operating aid, so the checklist FAILs with the REER note', () => {
    const d = getPlantComplianceDefaults('plant_es_7', 'ES', NOW);
    expect(d.go!.supportType).toBe('OPERATING');
    expect(d.pos!.supportDeclared).toBe('OPERATING');
    const aid = checklist(consignmentFor('plant_es_7')).find(i => i.id === 'no-operating-aid')!;
    expect(aid.status).toBe('FAIL');
    expect(aid.detail).toMatch(/confirm the REER unit is not fed by this digester/);
  });

  it('a PRTR grant under another programme is a WARN until the grant terms are checked', () => {
    const item = (x: Consignment) => checklist(x).find(i => i.id === 'spanish-prtr-grant')!;
    const c = consignmentFor('plant_es_11');
    expect(item(c).status).toBe('WARN');
    expect(item(c).detail).toMatch(/another programme; Orden TED\/706 Art 5\.3 is specific to the biogas programme/);
    const checked = { ...c, custody: { ...c.custody!, claims: { ...c.custody!.claims, prtrLegalCheckDone: true } } };
    expect(item(checked).status).not.toBe('WARN');
    // A plant with no such grant keeps the old "confirm" TODO
    expect(item(consignmentFor('plant_es_22')).status).toBe('TODO');
  });
});

describe('mixed feedstock: the default CI follows the conservative category', () => {
  it('every feedstockForCi is a registry key, marked mixed, with a reason', () => {
    for (const [id, r] of Object.entries(PLANT_RESEARCH)) {
      const c = r.compliance;
      if (!c?.feedstockForCi) continue;
      expect(FEEDSTOCK_REGISTRY[c.feedstockForCi], id).toBeDefined();
      expect(c.feedstockMixed, id).toBe(true);
      expect(c.feedstockCiNote, id).toBeTruthy();
    }
  });

  it('Ólvega (~30% manure) values NL GGE at the waste default, not manure −100', () => {
    expect(olvega.canonicalFeedstockKey?.toLowerCase()).toBe('manure');
    expect(plantFeedstockForCi('plant_es_11')).toEqual({ key: 'food_waste', mixed: true });
    expect(feedstockKeyForPlant(olvega)).toBe('food_waste');
    const gge = compareDestinationsForPlant({ origin: 'ES', plant: olvega, marks, costs }).find(r => r.marketId === 'NL_GGE')!;
    const asManure = compareDestinations({ origin: 'ES', marks, costs, feedstockKey: 'manure' }).find(r => r.marketId === 'NL_GGE')!;
    expect(gge.ci).toBe(feedstockDefaultCi('food_waste'));
    expect(gge.ci).not.toBe(feedstockDefaultCi('manure'));
    expect(gge.ciLabel).toBe(`CI ${feedstockDefaultCi('food_waste')} g (food waste default, mixed feedstock)`);
    expect(gge.netNetbackEurPerMwh).toBeLessThan(asManure.netNetbackEurPerMwh!);
  });

  it('a manure-majority mix keeps manure, and a single-category plant is untouched', () => {
    expect(plantFeedstockForCi('plant_es_10')).toEqual({ key: 'manure', mixed: true });
    expect(plantFeedstockForCi('plant_es_18')).toBeNull();
  });
});

describe('drawer header and optimal route', () => {
  it('Ólvega: researched start of operation and entity replace the unverified registry values', () => {
    expect(researchedOperatingSince('plant_es_11')!.value).toBe('2023-04');
    expect(researchedPlantEntity('plant_es_11')!.name).toBe('Biolvegas S.L.');
    expect(researchedOperatingSince('plant_gb_1')).toBeNull();
  });

  it('optimal route is the highest-value non-blocked row of the same comparison, with open items named', () => {
    const rows = compareDestinationsForPlant({ origin: 'ES', plant: olvega, marks, costs });
    const best = bestDestination(rows)!;
    const open = rows.filter(r => !r.blocked);
    expect(best.row.netNetbackEurPerMwh).toBe(Math.max(...open.map(r => r.netNetbackEurPerMwh!)));
    if (best.row.marketId === 'NL_GGE') expect(best.label).toMatch(/^NL GGE \(open items(, not yet law)?\)$/);
    expect(bestDestination(rows.map(r => ({ ...r, blocked: true })))).toBeNull();
  });
});

describe('Morning brief sample: Spanish manure benchmark', () => {
  it('reaches NL GGE on the ladder, with the CI from the manure default and delivery in 2027', () => {
    const c = REFERENCE_CONSIGNMENTS.SPANISH_MANURE;
    expect(c).toMatchObject({ originCountry: 'ES', injectionCountry: 'ES', feedstock: 'manure', chainOfCustody: 'MASS_BALANCE', certificationScheme: 'ISCC_EU' });
    expect(c.carbonIntensity).toBe(feedstockDefaultCi('manure'));
    expect(c.deliveryPeriod!.complianceYear).toBe(2027);
    expect(buildConsignmentLadder(c, marks, costs).map(r => r.marketId)).toContain('NL_GGE');
    // The existing samples' ladders are untouched: Danish manure cannot reach NL GGE, so it is not listed
    expect(buildConsignmentLadder(REFERENCE_CONSIGNMENTS.DANISH_MANURE, marks, costs).map(r => r.marketId)).not.toContain('NL_GGE');
  });
});
