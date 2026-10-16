import { describe, it, expect, afterEach } from 'vitest';
import { FUEL_EU_SHIPPING_COUNTERPARTIES } from '../fueleu/shippingTargetsData';
import { handoffVolumeMwh } from '../fueleu/uiHelpers';
import { resolveCounterpartyContacts } from '../fueleu/groups';
import { setAssumption, resetAllAssumptions } from '../assumptions/registry';

describe('FuelEU demand hand-offs (aud-sd)', () => {
  afterEach(() => resetAllAssumptions());

  it('hand-off volume has no 1,000 MWh floor and no default for zero need', () => {
    expect(handoffVolumeMwh(250)).toBe(250);
    expect(handoffVolumeMwh(0)).toBeUndefined();
    expect(handoffVolumeMwh(-5)).toBeUndefined();
    expect(handoffVolumeMwh(null)).toBeUndefined();
  });

  it('physical client savings and desk margin follow the desk assumptions, not the baked dataset', () => {
    const c = FUEL_EU_SHIPPING_COUNTERPARTIES.find(x => x.compliance_balance_2026_tco2e < 0 && x.bio_lng_required_neg100_mwh > 0)!;
    const before = c.desk_margin_physical_eur;
    setAssumption('fueleu.physicalDeskMarginEurPerMwh', 30);
    expect(c.desk_margin_physical_eur).toBe(Math.round(c.bio_lng_required_neg100_mwh * 30));
    expect(c.desk_margin_physical_eur).not.toBe(before);
    const s0 = c.client_savings_physical_eur;
    setAssumption('fueleu.bioLngPremiumEurPerMwh', 0);
    expect(c.client_savings_physical_eur).toBeGreaterThanOrEqual(s0);
    expect(c.client_savings_physical_eur).toBe(Math.round(c.penalty_2026_y1_eur));
  });

  it('sourced group contacts reach the counterparty (Maersk press contact has an e-mail)', () => {
    const maersk = FUEL_EU_SHIPPING_COUNTERPARTIES.find(x => x.group_id === 'maersk')!;
    const contacts = resolveCounterpartyContacts(maersk);
    expect(contacts.length).toBeGreaterThan(0);
    expect(contacts[0].email).toContain('@maersk.com');
    const msc = FUEL_EU_SHIPPING_COUNTERPARTIES.find(x => x.group_id === 'msc')!;
    expect(resolveCounterpartyContacts(msc)).toEqual([]);
  });
});
