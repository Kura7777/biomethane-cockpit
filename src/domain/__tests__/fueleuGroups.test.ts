import { describe, it, expect } from 'vitest';
import { FUEL_EU_SHIPPING_GROUPS, getGroupById } from '../fueleu/groups';
import { FUEL_EU_SHIPPING_COUNTERPARTIES } from '../fueleu/shippingTargetsData';
import { FUEL_EU_LNG_SHIPS } from '../fueleu/lngShipsData';

describe('FUEL_EU_SHIPPING_GROUPS — commercial group roll-up', () => {
  it('every dataset row is accounted for in exactly one group, with matching member counts', () => {
    const totalMembers = FUEL_EU_SHIPPING_GROUPS.reduce((sum, g) => sum + g.memberCompanyCount, 0);
    expect(totalMembers).toBe(FUEL_EU_SHIPPING_COUNTERPARTIES.length);

    const seenImos = new Set<string>();
    for (const g of FUEL_EU_SHIPPING_GROUPS) {
      expect(g.memberCompanyImos.length).toBe(g.memberCompanyCount);
      for (const imo of g.memberCompanyImos) {
        expect(seenImos.has(imo), `IMO ${imo} appears in more than one group`).toBe(false);
        seenImos.add(imo);
      }
    }
  });

  it('sumOfCompanyBalances2026 and sumOfCompanyPenalties2026 match a plain sum over member rows', () => {
    for (const g of FUEL_EU_SHIPPING_GROUPS.slice(0, 25)) {
      const members = FUEL_EU_SHIPPING_COUNTERPARTIES.filter(c => c.group_id === g.id);
      const balanceSum = members.reduce((s, c) => s + c.compliance_balance_2026_tco2e, 0);
      const penaltySum = members.reduce((s, c) => s + c.penalty_2026_y1_eur, 0);
      expect(g.sumOfCompanyBalances2026).toBeCloseTo(balanceSum, 3);
      expect(g.sumOfCompanyPenalties2026).toBeCloseTo(penaltySum, 3);
      expect(g.surplusMemberCount).toBe(members.filter(c => c.compliance_balance_2026_tco2e > 0).length);
    }
  });

  it('groups are sorted descending by sumOfCompanyPenalties2026', () => {
    for (let i = 0; i < FUEL_EU_SHIPPING_GROUPS.length - 1; i++) {
      expect(FUEL_EU_SHIPPING_GROUPS[i].sumOfCompanyPenalties2026).toBeGreaterThanOrEqual(
        FUEL_EU_SHIPPING_GROUPS[i + 1].sumOfCompanyPenalties2026
      );
    }
  });

  it('getGroupById returns the matching group and undefined for an unknown id', () => {
    const first = FUEL_EU_SHIPPING_GROUPS[0];
    expect(getGroupById(first.id)).toBe(first);
    expect(getGroupById('not-a-real-group-id')).toBeUndefined();
  });

  it('the msc-cruises group (if present) links to a msc parent', () => {
    const mscCruises = getGroupById('msc-cruises');
    if (mscCruises) {
      expect(mscCruises.parentGroupId).toBe('msc');
    }
  });
});

describe('FUEL_EU_LNG_SHIPS — LNG vessel book', () => {
  it('has 479 rows (the isLng-flagged ships in the EU MRV 2024 ship-level extract)', () => {
    expect(FUEL_EU_LNG_SHIPS.length).toBe(479);
  });

  it('every row has finite, non-negative Bio-LNG-need and extra-surplus figures', () => {
    for (const s of FUEL_EU_LNG_SHIPS) {
      expect(Number.isFinite(s.balance2026Tco2e)).toBe(true);
      expect(s.bioLngNeededTonnes).toBeGreaterThanOrEqual(0);
      expect(s.bioLngNeededMwh).toBeGreaterThanOrEqual(0);
      expect(s.extraSurplusIfFullBioLngTco2e).toBeGreaterThanOrEqual(0);
      expect(s.extraSurplusValueEurAtBid).toBeGreaterThanOrEqual(0);
      // Bio-LNG need is 0 exactly when the ship is already in surplus.
      if (s.balance2026Tco2e >= 0) {
        expect(s.bioLngNeededTonnes).toBe(0);
        expect(s.bioLngNeededMwh).toBe(0);
      } else {
        expect(s.bioLngNeededTonnes).toBeGreaterThan(0);
      }
    }
  });
});
