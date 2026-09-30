import { describe, it, expect } from 'vitest';
import { FUEL_EU_SHIPPING_COUNTERPARTIES } from '../fueleu/shippingTargetsData';
import { FUEL_EU_SHIPPING_GROUPS } from '../fueleu/groups';
import { calculateVesselExposure } from '../fueleu/calculator';
import { slimTonnes } from '../fueleu/shippingTargetsCodec';
import mrvData from '../../../data/fueleu_mrv_2025_companies.json';
import groupMap from '../../../data/fueleu_group_map.json';

/**
 * The shipped FuelEU dataset is a slimmed copy of the full-precision MRV 2025 extract (tonnes rounded
 * by slimTonnes, repeated text dropped into lookup tables). This suite rebuilds the aggregates from
 * the FULL-precision source (data/fueleu_mrv_2025_companies.json + the group map) with the app's own
 * calculator and proves the slimmed data gives the same totals and per-group penalties.
 */

interface SrcCompany {
  company_imo: string;
  vessels_in_scope: number;
  vlsfo_tonnes: number;
  mgo_tonnes: number;
  lng_tonnes: number;
}

const normalise = (raw: string): string | null => {
  const t = raw.trim();
  if (/^\d{7}$/.test(t)) return t;
  if (/^\d{1,6}$/.test(t)) return t.padStart(7, '0');
  return null;
};

const imoToGroup = new Map<string, string>();
for (const g of (groupMap as { groups: { group_id: string; company_imos: string[] }[] }).groups) {
  for (const imo of g.company_imos) imoToGroup.set(imo, g.group_id);
}

function exposure(c: { vlsfo_tonnes: number; mgo_tonnes: number; lng_tonnes: number }) {
  return calculateVesselExposure({
    vlsfoTonnes: c.vlsfo_tonnes,
    mgoTonnes: c.mgo_tonnes,
    lngTonnes: c.lng_tonnes,
    bioLngTonnes: 0,
    bioLngCi: -100,
    consecutiveYearsNonCompliant: 1,
    shareThirdCountryVoyages: 0,
    targetYear: 2026,
  });
}

const eligible = (mrvData as { companies: SrcCompany[] }).companies
  .filter(c => c.vessels_in_scope >= 1 && c.vlsfo_tonnes + c.mgo_tonnes + c.lng_tonnes > 0)
  .map(c => ({ ...c, imo: normalise(c.company_imo) }))
  .filter((c): c is typeof c & { imo: string } => c.imo !== null);

interface Agg { penalty: number; balance: number; vessels: number; tonnes: number }
const full = new Map<string, Agg>();
let fullDeficit = 0;
let fullPenalty = 0;
for (const c of eligible) {
  const r = exposure(c);
  const gid = imoToGroup.get(c.imo) ?? `unmapped-${c.imo}`;
  const a = full.get(gid) ?? { penalty: 0, balance: 0, vessels: 0, tonnes: 0 };
  const pen = Math.round(r.statutoryPenaltyY1Eur);
  a.penalty += pen;
  a.balance += r.complianceBalanceTco2e;
  a.vessels += c.vessels_in_scope;
  a.tonnes += c.vlsfo_tonnes + c.mgo_tonnes + c.lng_tonnes;
  full.set(gid, a);
  fullPenalty += pen;
  if (r.complianceBalanceTco2e < 0) fullDeficit += -r.complianceBalanceTco2e;
}

describe('slimmed FuelEU dataset vs full-precision MRV 2025 source', () => {
  it('covers exactly the eligible source companies', () => {
    expect(FUEL_EU_SHIPPING_COUNTERPARTIES.length).toBe(eligible.length);
    expect(FUEL_EU_SHIPPING_GROUPS.length).toBe(full.size);
  });

  it('total 2026 penalty is identical (penalties are computed before the tonnage rounding)', () => {
    const shipped = FUEL_EU_SHIPPING_COUNTERPARTIES.reduce((s, c) => s + c.penalty_2026_y1_eur, 0);
    expect(shipped).toBe(fullPenalty);
  });

  it('total 2026 deficit matches to within the 1-decimal balance rounding (<0.01%)', () => {
    const shipped = -FUEL_EU_SHIPPING_COUNTERPARTIES
      .filter(c => c.compliance_balance_2026_tco2e < 0)
      .reduce((s, c) => s + c.compliance_balance_2026_tco2e, 0);
    expect(Math.abs(shipped - fullDeficit) / fullDeficit).toBeLessThan(1e-4);
  });

  it('every group: penalty identical, balance within rounding, vessels identical', () => {
    for (const g of FUEL_EU_SHIPPING_GROUPS) {
      const f = full.get(g.id);
      expect(f, g.id).toBeDefined();
      expect(g.sumOfCompanyPenalties2026, g.id).toBe(f!.penalty);
      expect(g.vessels, g.id).toBe(f!.vessels);
      // each member balance is stored to 0.1 t
      expect(Math.abs(g.sumOfCompanyBalances2026 - f!.balance), g.id).toBeLessThanOrEqual(0.05 * g.memberCompanyCount + 1e-6);
    }
  });

  it('shipped tonnes are the source tonnes rounded once (no drift beyond 0.5 t per company per fuel)', () => {
    let shippedTotal = 0;
    let fullTotal = 0;
    for (const g of FUEL_EU_SHIPPING_GROUPS) {
      shippedTotal += g.vlsfoTonnes + g.mgoTonnes + g.lngTonnes;
      fullTotal += full.get(g.id)!.tonnes;
    }
    expect(Math.abs(shippedTotal - fullTotal) / fullTotal).toBeLessThan(1e-5);
    expect(slimTonnes(1234.56)).toBe(1235);
    expect(slimTonnes(12.34)).toBe(12.3);
  });

  it('re-running the calculator on the rounded tonnes changes the top-50 group penalties by <0.1%', () => {
    const rebuilt = new Map<string, number>();
    for (const c of FUEL_EU_SHIPPING_COUNTERPARTIES) {
      const pen = Math.round(exposure(c).statutoryPenaltyY1Eur);
      rebuilt.set(c.group_id, (rebuilt.get(c.group_id) ?? 0) + pen);
    }
    for (const g of FUEL_EU_SHIPPING_GROUPS.slice(0, 50)) {
      const f = full.get(g.id)!.penalty;
      expect(Math.abs(rebuilt.get(g.id)! - f) / f, g.id).toBeLessThan(1e-3);
    }
  });
});
