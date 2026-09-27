import { FUEL_EU_SHIPPING_COUNTERPARTIES } from './shippingTargetsData';
import { GROUP_CONTACTS } from './groupContactsData';
import { GroupEntityType, GroupContact, FuelCostBearerType } from './types';

/**
 * Commercial-group roll-up of FUEL_EU_SHIPPING_COUNTERPARTIES, computed at module load so it can
 * never drift from the per-company dataset (each row already carries its group_id/group_name/
 * entityType/parent_group_id/fuelCostBearer — see scripts/build_fueleu_shipping_targets.ts and
 * scripts/build_fueleu_group_map.py).
 *
 * sumOfCompanyBalances2026 nets member balances (what the group's internal pool position would be
 * if every member's compliance balance were pooled together under Article 21). Penalties are NOT
 * netted this way — a penalty is a per-ship/per-company statutory liability under Art. 23(2), so
 * sumOfCompanyPenalties2026 is a plain sum of what each member individually owes if it does nothing.
 */
export interface FuelEuShippingGroup {
  id: string;
  name: string;
  entityType: GroupEntityType;
  parentGroupId?: string;
  memberCompanyCount: number;
  memberCompanyImos: string[];
  vessels: number;
  vlsfoTonnes: number;
  mgoTonnes: number;
  lngTonnes: number;
  /** Sum of each member's ets_exposure_2026_tco2 (MRV ets_co2_t + estimated CH4 CO2e; N2O omitted) — used as an in-scope-CO2 proxy since the dataset does not carry a separate per-row in-scope-CO2 field. */
  inScopeCo2Tco2e: number;
  sumOfCompanyBalances2026: number;
  sumOfCompanyPenalties2026: number;
  surplusMemberCount: number;
  lngShipCount: number;
  fuelCostBearerMix: Record<FuelCostBearerType, number>;
  contacts: GroupContact[];
}

function buildGroups(): FuelEuShippingGroup[] {
  const byId = new Map<string, FuelEuShippingGroup>();

  for (const c of FUEL_EU_SHIPPING_COUNTERPARTIES) {
    let g = byId.get(c.group_id);
    if (!g) {
      g = {
        id: c.group_id,
        name: c.group_name,
        entityType: c.entityType,
        parentGroupId: c.parent_group_id || undefined,
        memberCompanyCount: 0,
        memberCompanyImos: [],
        vessels: 0,
        vlsfoTonnes: 0,
        mgoTonnes: 0,
        lngTonnes: 0,
        inScopeCo2Tco2e: 0,
        sumOfCompanyBalances2026: 0,
        sumOfCompanyPenalties2026: 0,
        surplusMemberCount: 0,
        lngShipCount: 0,
        fuelCostBearerMix: { OWNER_OPERATOR: 0, TIME_CHARTERER: 0, MIXED: 0 },
        contacts: GROUP_CONTACTS[c.group_id] ?? [],
      };
      byId.set(c.group_id, g);
    }
    g.memberCompanyCount += 1;
    g.memberCompanyImos.push(c.company_imo);
    g.vessels += c.vessels_in_scope;
    g.vlsfoTonnes += c.vlsfo_tonnes;
    g.mgoTonnes += c.mgo_tonnes;
    g.lngTonnes += c.lng_tonnes;
    g.inScopeCo2Tco2e += c.ets_exposure_2026_tco2;
    g.sumOfCompanyBalances2026 += c.compliance_balance_2026_tco2e;
    g.sumOfCompanyPenalties2026 += c.penalty_2026_y1_eur;
    if (c.compliance_balance_2026_tco2e > 0) g.surplusMemberCount += 1;
    g.lngShipCount += c.lngShipCount;
    g.fuelCostBearerMix[c.fuelCostBearer.typicalBearer] += 1;
  }

  return Array.from(byId.values()).sort((a, b) => b.sumOfCompanyPenalties2026 - a.sumOfCompanyPenalties2026);
}

export const FUEL_EU_SHIPPING_GROUPS: FuelEuShippingGroup[] = buildGroups();

export function getGroupById(id: string): FuelEuShippingGroup | undefined {
  return FUEL_EU_SHIPPING_GROUPS.find(g => g.id === id);
}
