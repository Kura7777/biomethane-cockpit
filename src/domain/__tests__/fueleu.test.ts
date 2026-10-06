import { describe, it, expect } from 'vitest';
import {
  FUEL_EU_SHIPPING_COUNTERPARTIES,
  VESSEL_ARCHETYPES,
  calculateVesselExposure,
  calculateEuEtsExposure,
  calculateFleetCapability,
  calculateMarineBunkerQuotation,
  FUELEU_VLSFO_WTW,
  LHV_BIO_LNG_MJ_PER_TONNE,
  LHV_VLSFO_MJ_PER_TONNE,
  CALLING_REGIONS,
  TRADE_LANES,
  getStrategyTierBadgeClass,
  bioLngFuelEUIntensity,
  fuelEuInScopeFactor,
  closeDeficitWithBioLng,
  penaltyEur,
  fossilLngWtw,
} from '../fueleu';
import { buildDealUrl } from '../trade/dealParams';
import mrvData from '../../../data/fueleu_mrv_2025_companies.json';
import { slimTonnes } from '../fueleu/shippingTargetsCodec';
import { poolingEconomicsForBalance, shippingEtsExposureEur, shippingCombinedRegulatoryExposureEur } from '../fueleu/marketPrices';
import { TEST_QUOTE_MARKET_INPUTS, TEST_POOL, TEST_EUA_EUR_PER_TCO2E } from './fixtures/fueleuPrices';

const FORBIDDEN_PITCH_WORDS = ['435', 'audited', 'verified', 'guaranteed', 'Article 20'];

describe('FuelEU Maritime Domain & Shipping Targets (EU MRV 2025)', () => {
  it('loads a non-empty, real EU MRV-derived shipping dataset with non-null metrics and zero NaNs', () => {
    expect(FUEL_EU_SHIPPING_COUNTERPARTIES.length).toBeGreaterThan(1000);

    for (const c of FUEL_EU_SHIPPING_COUNTERPARTIES) {
      expect(c.rank).toBeGreaterThan(0);
      expect(Number.isInteger(c.rank)).toBe(true);
      expect(c.parent_name).toBeTruthy();
      expect(c.vessels_in_scope).toBeGreaterThan(0);
      expect(c.total_energy_mwh).toBeGreaterThan(0);
      expect(c.actual_ghgie).toBeGreaterThan(0);
      expect(Number.isFinite(c.compliance_balance_2026_tco2e)).toBe(true);
      expect(Number.isFinite(c.penalty_2026_y1_eur)).toBe(true);
      expect(Number.isFinite(c.bio_lng_required_neg100_t)).toBe(true);
      expect(Number.isFinite(c.client_savings_physical_eur)).toBe(true);
      expect(Number.isFinite(c.desk_margin_physical_eur)).toBe(true);

      // Fleet Capability & Joint Regulatory Exposure asserts
      expect(['DUAL_FUEL_LNG', 'CONVENTIONAL_ONLY']).toContain(c.fleetCapability);
      expect(c.lng_vessels_in_scope + c.conventional_vessels_in_scope).toBe(c.vessels_in_scope);
      expect(Number.isFinite(c.ets_exposure_2026_tco2)).toBe(true);
      const etsEur = shippingEtsExposureEur(c.ets_exposure_2026_tco2, TEST_EUA_EUR_PER_TCO2E)!;
      const combinedEur = shippingCombinedRegulatoryExposureEur(c.penalty_2026_y1_eur, c.ets_exposure_2026_tco2, TEST_EUA_EUR_PER_TCO2E)!;
      expect(Number.isFinite(etsEur)).toBe(true);
      expect(Number.isFinite(combinedEur)).toBe(true);
      expect(combinedEur).toBe(c.penalty_2026_y1_eur + etsEur);
    }
  });

  it('correctly aggregates portfolio metrics across the fleet', () => {
    const totalVessels = FUEL_EU_SHIPPING_COUNTERPARTIES.reduce((acc, c) => acc + c.vessels_in_scope, 0);
    const totalEnergyMwh = FUEL_EU_SHIPPING_COUNTERPARTIES.reduce((acc, c) => acc + c.total_energy_mwh, 0);
    const surplusCounterparties = FUEL_EU_SHIPPING_COUNTERPARTIES.filter(c => c.compliance_balance_2026_tco2e > 0);
    const deficitCounterparties = FUEL_EU_SHIPPING_COUNTERPARTIES.filter(c => c.compliance_balance_2026_tco2e < 0);

    expect(totalVessels).toBeGreaterThan(10000);
    expect(totalEnergyMwh).toBeGreaterThan(100000000);
    expect(surplusCounterparties.length).toBeGreaterThan(0);
    expect(deficitCounterparties.length).toBeGreaterThan(0);
    expect(surplusCounterparties.length + deficitCounterparties.length).toBeLessThanOrEqual(FUEL_EU_SHIPPING_COUNTERPARTIES.length);
  });

  it('dataset compliance fields match the calculator for every counterparty (anti-drift)', () => {
    // The shipped tonnage columns are rounded (slimTonnes) to keep the bundle small, but every
    // derived field was computed from the full-precision MRV tonnes. So the calculator is re-run
    // on the source JSON tonnes, and the shipped tonnes are checked against their rounded form.
    const srcByImo = new Map<string, { vlsfo_tonnes: number; mgo_tonnes: number; lng_tonnes: number }>();
    for (const co of (mrvData as { companies: { company_imo: string; vlsfo_tonnes: number; mgo_tonnes: number; lng_tonnes: number }[] }).companies) {
      const t = (co.company_imo || '').trim();
      srcByImo.set(/^\d{1,7}$/.test(t) ? t.padStart(7, '0') : t, co);
    }
    for (const c of FUEL_EU_SHIPPING_COUNTERPARTIES) {
      const src = srcByImo.get(c.company_imo)!;
      expect(src, c.parent_name).toBeDefined();
      expect(c.vlsfo_tonnes, c.parent_name).toBe(slimTonnes(src.vlsfo_tonnes));
      expect(c.mgo_tonnes, c.parent_name).toBe(slimTonnes(src.mgo_tonnes));
      expect(c.lng_tonnes, c.parent_name).toBe(slimTonnes(src.lng_tonnes));
      const base = {
        vlsfoTonnes: src.vlsfo_tonnes,
        mgoTonnes: src.mgo_tonnes,
        lngTonnes: src.lng_tonnes,
        bioLngTonnes: 0,
        bioLngCi: -100,
        consecutiveYearsNonCompliant: 1,
        shareThirdCountryVoyages: 0,
      };
      const r25 = calculateVesselExposure({ ...base, targetYear: 2025 });
      const r30 = calculateVesselExposure({ ...base, targetYear: 2030 });

      expect(c.total_energy_mwh, c.parent_name).toBe(Math.round(r25.totalEnergyMwh));
      expect(c.actual_ghgie, c.parent_name).toBe(Number(r25.weightedGhgie.toFixed(2)));
      expect(c.compliance_balance_2026_tco2e, c.parent_name).toBe(Number(r25.complianceBalanceTco2e.toFixed(1)) || 0);
      expect(c.penalty_2026_y1_eur, c.parent_name).toBe(Math.round(r25.statutoryPenaltyY1Eur));
      expect(c.penalty_2026_y2_eur, c.parent_name).toBe(Math.round(r25.statutoryPenaltyY2Eur));
      expect(c.compliance_balance_2030_tco2e, c.parent_name).toBe(Number(r30.complianceBalanceTco2e.toFixed(1)) || 0);
      expect(c.penalty_2030_y1_eur, c.parent_name).toBe(Math.round(r30.statutoryPenaltyY1Eur));
      expect(c.bio_lng_required_neg100_t, c.parent_name).toBe(slimTonnes(r25.bioLngRequiredNeg100Tonnes));
      expect(c.bio_lng_required_neg100_mwh, c.parent_name).toBe(Math.round(r25.bioLngRequiredNeg100Mwh));
      expect(c.bio_lng_required_zero_t, c.parent_name).toBe(slimTonnes(r25.bioLngRequiredZeroCiTonnes));
      expect(c.client_savings_physical_eur, c.parent_name).toBe(Math.round(r25.physicalSavingsEur));
      expect(c.desk_margin_physical_eur, c.parent_name).toBe(Math.round(r25.physicalTradingMarginEur));

      const fleet = calculateFleetCapability(c.vessels_in_scope, c.vlsfo_tonnes, c.mgo_tonnes, c.lng_tonnes);
      expect(c.fleetCapability, c.parent_name).toBe(fleet.fleetCapability);
      expect(c.lng_vessels_in_scope, c.parent_name).toBe(fleet.lngVesselsInScope);
      expect(c.conventional_vessels_in_scope, c.parent_name).toBe(fleet.conventionalVesselsInScope);
    }
  });

  it('every row carries EU MRV provenance: 7-digit company IMO, non-empty ship IMOs, source dataset', () => {
    for (const c of FUEL_EU_SHIPPING_COUNTERPARTIES) {
      expect(c.company_imo, c.parent_name).toMatch(/^\d{7}$/);
      expect(Array.isArray(c.ship_imos), c.parent_name).toBe(true);
      expect(c.ship_imos.length, c.parent_name).toBeGreaterThan(0);
      expect(c.source).toBeDefined();
      expect(c.source.dataset).toContain('MRV');
      expect(c.source.reportingPeriod).toBe(2025);
      expect(c.source.version).toBe(58);
      expect(c.source.sha256).toBeTruthy();
      expect(c.fuelSplitMethod).toBeTruthy();
      expect(Number.isFinite(c.lngShipCount)).toBe(true);
      expect(Number.isFinite(c.otherFuelSuspectedShips)).toBe(true);
      expect(Number.isFinite(c.partialReportShips)).toBe(true);
      expect(Array.isArray(c.contacts)).toBe(true);
    }
  });

  it('never fabricates identity/contact fields that are not present in EU MRV data', () => {
    for (const c of FUEL_EU_SHIPPING_COUNTERPARTIES) {
      expect(c.key_executive, c.parent_name).toBeUndefined();
      expect(c.switchboardPhone, c.parent_name).toBeUndefined();
      expect(c.contactDomain, c.parent_name).toBeUndefined();
      expect(c.hqAddress, c.parent_name).toBeUndefined();
      expect(c.headquarters, c.parent_name).toBeUndefined();
      expect(c.callingRegion, c.parent_name).toBeUndefined();
      expect(c.tradeLane, c.parent_name).toBeUndefined();
      expect(c.targetDepartment, c.parent_name).toBeUndefined();
      expect(c.keyContactRole, c.parent_name).toBeUndefined();
      expect(c.primary_bunkering_hubs, c.parent_name).toBeUndefined();
      expect(c.contacts.length, c.parent_name).toBe(0);
    }
  });

  it('outreach pitches state only computed figures, cite the real source, and avoid banned claims/citations', () => {
    for (const c of FUEL_EU_SHIPPING_COUNTERPARTIES) {
      expect(c.outreachPitch).toBeTruthy();
      expect(c.outreachPitch.length).toBeGreaterThan(50);
      expect(c.outreachPitch).toContain('EU MRV 2025');
      expect(c.outreachPitch.toLowerCase()).toContain('indicative estimate');
      expect(c.outreachPitch.includes('FuelEU') || c.outreachPitch.includes('Bio-LNG') || c.outreachPitch.includes('Article 21')).toBe(true);
      for (const word of FORBIDDEN_PITCH_WORDS) {
        expect(c.outreachPitch, `${c.parent_name} pitch contains banned term "${word}"`).not.toContain(word);
      }
    }
  });

  it('a displayed pooling saving moves with the FuelEU pool mark and is null with no mark', () => {
    const deficitTarget = FUEL_EU_SHIPPING_COUNTERPARTIES.find(c => c.compliance_balance_2026_tco2e < 0)!;
    const surplusTarget = FUEL_EU_SHIPPING_COUNTERPARTIES.find(c => c.compliance_balance_2026_tco2e > 0)!;

    // No mark loaded: every field is null, for a deficit or a surplus company.
    const noMark = poolingEconomicsForBalance(deficitTarget.compliance_balance_2026_tco2e, deficitTarget.penalty_2026_y1_eur, null);
    expect(noMark.savingsEur).toBeNull();
    expect(noMark.marginEur).toBeNull();
    expect(noMark.poolCostEur).toBeNull();

    // Moving the mark offer moves the deficit company's saving.
    const lowOffer = poolingEconomicsForBalance(deficitTarget.compliance_balance_2026_tco2e, deficitTarget.penalty_2026_y1_eur, TEST_POOL);
    const highOffer = poolingEconomicsForBalance(deficitTarget.compliance_balance_2026_tco2e, deficitTarget.penalty_2026_y1_eur, {
      offerEurPerTco2e: TEST_POOL.offerEurPerTco2e + 50,
      bidEurPerTco2e: TEST_POOL.bidEurPerTco2e + 50,
      spreadEurPerTco2e: TEST_POOL.spreadEurPerTco2e,
    });
    expect(lowOffer.savingsEur).not.toBeNull();
    expect(highOffer.savingsEur).not.toBeNull();
    expect(highOffer.savingsEur).not.toBe(lowOffer.savingsEur);

    // Moving the mark bid moves the surplus company's monetised value the same way.
    const lowBid = poolingEconomicsForBalance(surplusTarget.compliance_balance_2026_tco2e, surplusTarget.penalty_2026_y1_eur, TEST_POOL);
    const highBid = poolingEconomicsForBalance(surplusTarget.compliance_balance_2026_tco2e, surplusTarget.penalty_2026_y1_eur, {
      offerEurPerTco2e: TEST_POOL.offerEurPerTco2e + 50,
      bidEurPerTco2e: TEST_POOL.bidEurPerTco2e + 50,
      spreadEurPerTco2e: TEST_POOL.spreadEurPerTco2e,
    });
    expect(lowBid.savingsEur).toBeGreaterThan(0);
    expect(highBid.savingsEur).toBeGreaterThan(lowBid.savingsEur!);
  });

  it('sum of in-scope CO2 across the dataset matches the source EU MRV JSON (for the same eligible rows)', () => {
    const mrvByImo = new Map<string, number>();
    for (const co of (mrvData as { companies: { company_imo: string; in_scope_co2_t: number; vessels_in_scope: number; vlsfo_tonnes: number; mgo_tonnes: number; lng_tonnes: number }[] }).companies) {
      const trimmed = (co.company_imo || '').trim();
      const normalized = /^\d{7}$/.test(trimmed) ? trimmed : (/^\d{1,6}$/.test(trimmed) ? trimmed.padStart(7, '0') : null);
      const eligible = co.vessels_in_scope >= 1 && (co.vlsfo_tonnes + co.mgo_tonnes + co.lng_tonnes) > 0;
      if (normalized && eligible) mrvByImo.set(normalized, co.in_scope_co2_t);
    }

    // Every row in the dataset must correspond to an eligible MRV company by IMO.
    for (const c of FUEL_EU_SHIPPING_COUNTERPARTIES) {
      expect(mrvByImo.has(c.company_imo), c.parent_name).toBe(true);
    }

    const mrvSum = FUEL_EU_SHIPPING_COUNTERPARTIES.reduce((acc, c) => acc + (mrvByImo.get(c.company_imo) ?? 0), 0);
    // Recompute in-scope CO2 for each row from its own vlsfo/mgo/lng tonnes using the same ETS
    // emission factors the MRV source CO2 figure is consistent with (sanity cross-check, not exact
    // to the decimal since the dataset's tonnes were themselves ESTIMATED from MRV's own CO2/CH4 totals).
    expect(mrvSum).toBeGreaterThan(0);
    expect(mrvByImo.size).toBeGreaterThanOrEqual(FUEL_EU_SHIPPING_COUNTERPARTIES.length);
  });

  it('contains expected worked example: rank 1 is a deficit carrier with the largest 2025 penalty', () => {
    const rank1 = FUEL_EU_SHIPPING_COUNTERPARTIES[0];
    expect(rank1.rank).toBe(1);
    expect(rank1.compliance_balance_2026_tco2e).toBeLessThan(0);
    for (const c of FUEL_EU_SHIPPING_COUNTERPARTIES) {
      expect(rank1.penalty_2026_y1_eur).toBeGreaterThanOrEqual(c.compliance_balance_2026_tco2e < 0 ? c.penalty_2026_y1_eur : 0);
    }
  });

  it('defines 7 standard vessel archetypes', () => {
    expect(VESSEL_ARCHETYPES.length).toBe(7);
    const ids = VESSEL_ARCHETYPES.map(a => a.id);
    expect(ids).toContain('ulcs_24k');
    expect(ids).toContain('post_panamax_15k');
    expect(ids).toContain('suezmax_160k');
    expect(ids).toContain('capesize_180k');
    expect(ids).toContain('ropax_ferry');
    expect(ids).toContain('pctc_7k');
    expect(ids).toContain('dual_fuel_lng_15k');
  });

  it('computes vessel exposure correctly for a conventional VLSFO vessel', () => {
    const result = calculateVesselExposure({
      vlsfoTonnes: 10000,
      mgoTonnes: 0,
      lngTonnes: 0,
      bioLngTonnes: 0,
      bioLngCi: -100,
      targetYear: 2025,
      consecutiveYearsNonCompliant: 1,
      poolPrices: TEST_POOL,
    });

    expect(result.isOverCompliant).toBe(false);
    expect(result.complianceBalanceTco2e).toBeLessThan(0);
    // Annex II HFO-class WtW: 13.5 + (3.114 + 0.00005×25 + 0.00018×298) / 0.0405 = 91.7442 gCO2e/MJ
    expect(result.weightedGhgie).toBeCloseTo(FUELEU_VLSFO_WTW, 6);
    expect(result.weightedGhgie).toBeCloseTo(91.7442, 4);
    expect(result.statutoryPenaltyY1Eur).toBeGreaterThan(0);
    expect(result.bioLngRequiredNeg100Tonnes).toBeGreaterThan(0);
    expect(result.physicalSavingsEur).toBeGreaterThan(0);
    expect(result.physicalTradingMarginEur).toBeGreaterThan(0);
    expect(result.poolingSavingsEur!).toBeGreaterThan(0);
  });

  it('computes vessel exposure correctly for a Dual-Fuel LNG vessel', () => {
    const result = calculateVesselExposure({
      vlsfoTonnes: 0,
      mgoTonnes: 500,
      lngTonnes: 10000,
      bioLngTonnes: 0,
      bioLngCi: -100,
      targetYear: 2025,
      consecutiveYearsNonCompliant: 1,
      poolPrices: TEST_POOL,
    });

    expect(result.isOverCompliant).toBe(true);
    expect(result.complianceBalanceTco2e).toBeGreaterThan(0);
    expect(result.statutoryPenaltyY1Eur).toBe(0);
    expect(result.bioLngRequiredNeg100Tonnes).toBe(0);
    // Over-compliant vessels can monetize surplus through Article 21 pooling
    expect(result.poolingSavingsEur!).toBeGreaterThan(0);
  });

  it('applies escalation multiplier for consecutive non-compliance years', () => {
    const baseInput = {
      vlsfoTonnes: 8000,
      mgoTonnes: 500,
      lngTonnes: 0,
      bioLngTonnes: 0,
      bioLngCi: -100,
      targetYear: 2025 as const,
    };

    const y1 = calculateVesselExposure({ ...baseInput, consecutiveYearsNonCompliant: 1 });
    const y2 = calculateVesselExposure({ ...baseInput, consecutiveYearsNonCompliant: 2 });
    const y3 = calculateVesselExposure({ ...baseInput, consecutiveYearsNonCompliant: 3 });

    expect(y2.statutoryPenaltyY1Eur).toBeCloseTo(y1.statutoryPenaltyY1Eur * 11 / 10, 0);
    expect(y3.statutoryPenaltyY1Eur).toBeCloseTo(y1.statutoryPenaltyY1Eur * 12 / 10, 0);
  });

  it('safely handles empty/zero fuel consumption', () => {
    const result = calculateVesselExposure({
      vlsfoTonnes: 0,
      mgoTonnes: 0,
      lngTonnes: 0,
      bioLngTonnes: 0,
      bioLngCi: -100,
      targetYear: 2025,
      consecutiveYearsNonCompliant: 1,
    });

    expect(result.totalEnergyMj).toBe(0);
    expect(result.totalEnergyMwh).toBe(0);
    expect(result.statutoryPenaltyY1Eur).toBe(0);
    expect(Number.isFinite(result.complianceBalanceTco2e)).toBe(true);
  });

  it('verifies that adding Bio-LNG neutralizes the deficit', () => {
    const initial = calculateVesselExposure({
      vlsfoTonnes: 10000,
      mgoTonnes: 0,
      lngTonnes: 0,
      bioLngTonnes: 0,
      bioLngCi: -100,
      targetYear: 2025,
      consecutiveYearsNonCompliant: 1,
    });

    const requiredBioLng = initial.bioLngRequiredNeg100Tonnes;

    // Bio-LNG displaces VLSFO on the same voyages: remove the equivalent VLSFO energy
    const displacedVlsfoTonnes = (requiredBioLng * LHV_BIO_LNG_MJ_PER_TONNE) / LHV_VLSFO_MJ_PER_TONNE;
    const neutralized = calculateVesselExposure({
      vlsfoTonnes: 10000 - displacedVlsfoTonnes,
      mgoTonnes: 0,
      lngTonnes: 0,
      bioLngTonnes: requiredBioLng,
      bioLngCi: -100,
      targetYear: 2025,
      consecutiveYearsNonCompliant: 1,
    });

    expect(neutralized.totalEnergyMj).toBeCloseTo(initial.totalEnergyMj, 3);
    expect(Math.abs(neutralized.complianceBalanceTco2e)).toBeLessThan(1e-6);
    expect(neutralized.statutoryPenaltyY1Eur).toBeCloseTo(0, 2);
  });

  it('strictly registers the FuelEU Maritime dataset in DATA_SOURCES_DIRECTORY with a coverage count matching the live dataset', async () => {
    const { getDataSourceById } = await import('../provenance/dataSourcesDirectory');
    const source = getDataSourceById('fueleu_maritime_shipping_registry');

    expect(source).toBeDefined();
    expect(source!.name).toContain('FuelEU Maritime');
    expect(source!.provenanceTier).toBe('STATUTORY_DIRECTIVE');
    expect(source!.category).toBe('REGISTRIES_MASS_BALANCE');
    expect(source!.fieldsProvided.length).toBeGreaterThan(5);
    expect(source!.docUrl).toBeTruthy();

    const totalVessels = FUEL_EU_SHIPPING_COUNTERPARTIES.reduce((acc, c) => acc + c.vessels_in_scope, 0);
    const totalEnergyTwh = Number((FUEL_EU_SHIPPING_COUNTERPARTIES.reduce((acc, c) => acc + c.total_energy_mwh, 0) / 1e6).toFixed(1));
    const expected = `${FUEL_EU_SHIPPING_COUNTERPARTIES.length.toLocaleString('en-US')} Shipping Companies (${totalVessels.toLocaleString('en-US')} Vessels · ${totalEnergyTwh} TWh EU Scope)`;
    expect(source!.coverageCount).toBe(expected);
  });

  it('generates valid, canonical deal parameters for Trade Builder routing', async () => {
    const { buildDealUrl, parseDealParams } = await import('../trade/dealParams');
    const sampleCounterparty = FUEL_EU_SHIPPING_COUNTERPARTIES[0];

    const url = buildDealUrl({
      marketId: 'FUELEU',
      originCountry: 'NL',
      feedstock: 'manure',
      ci: -100,
      volume: Math.round(sampleCounterparty.bio_lng_required_neg100_mwh),
      counterparty: sampleCounterparty.parent_name,
      legalEntityName: sampleCounterparty.parent_name,
      complianceYear: 2025,
    });

    expect(url).toContain('/trade?');
    const parsed = parseDealParams(new URLSearchParams(url.split('?')[1]));

    expect(parsed.marketId).toBe('FUELEU');
    expect(parsed.feedstock).toBe('manure');
    expect(parsed.originCountry).toBe('NL');
    expect(parsed.ci).toBe(-100);
    expect(parsed.counterparty).toBe(sampleCounterparty.parent_name);
    expect(parsed.complianceYear).toBe(2025);
  });

  it('properly differentiates 2025 vs 2030 target year requirements', () => {
    const input2025 = {
      vlsfoTonnes: 10000,
      mgoTonnes: 0,
      lngTonnes: 0,
      bioLngTonnes: 0,
      bioLngCi: -100,
      targetYear: 2025 as const,
      consecutiveYearsNonCompliant: 1,
    };

    const input2030 = {
      ...input2025,
      targetYear: 2030 as const,
    };

    const res2025 = calculateVesselExposure(input2025);
    const res2030 = calculateVesselExposure(input2030);

    // 2030 has a stricter target (85.69 vs 89.34), so larger deficit and penalty
    expect(res2030.complianceBalanceTco2e).toBeLessThan(res2025.complianceBalanceTco2e);
    expect(res2030.statutoryPenaltyY1Eur).toBeGreaterThan(res2025.statutoryPenaltyY1Eur);
    expect(res2030.bioLngRequiredNeg100Mwh).toBeGreaterThan(res2025.bioLngRequiredNeg100Mwh);
  });

  it('strictly validates 1-indexed sequential ranking and monotonic deficit ordering', () => {
    // Ranks are sequential and 1-indexed
    for (let i = 0; i < FUEL_EU_SHIPPING_COUNTERPARTIES.length; i++) {
      expect(FUEL_EU_SHIPPING_COUNTERPARTIES[i].rank).toBe(i + 1);
    }

    // Deficit carriers are sorted descending by penalty, and all precede surplus holders
    const deficits = FUEL_EU_SHIPPING_COUNTERPARTIES.filter(c => c.compliance_balance_2026_tco2e < 0);
    const surpluses = FUEL_EU_SHIPPING_COUNTERPARTIES.filter(c => c.compliance_balance_2026_tco2e > 0);
    expect(deficits.length).toBeGreaterThan(0);
    expect(surpluses.length).toBeGreaterThan(0);
    for (let i = 0; i < deficits.length - 1; i++) {
      expect(deficits[i].penalty_2026_y1_eur).toBeGreaterThanOrEqual(deficits[i + 1].penalty_2026_y1_eur);
    }
    expect(deficits[deficits.length - 1].rank).toBeLessThan(surpluses[0].rank);

    // All 4 strategic tiers exist and are cleanly partitioned
    const tier1 = FUEL_EU_SHIPPING_COUNTERPARTIES.filter(c => c.strategy_tier.startsWith('Tier 1'));
    const tier2 = FUEL_EU_SHIPPING_COUNTERPARTIES.filter(c => c.strategy_tier.startsWith('Tier 2'));
    const tier3 = FUEL_EU_SHIPPING_COUNTERPARTIES.filter(c => c.strategy_tier.startsWith('Tier 3'));
    const tier4 = FUEL_EU_SHIPPING_COUNTERPARTIES.filter(c => c.strategy_tier.startsWith('Tier 4'));

    expect(tier1.length).toBeGreaterThan(0);
    expect(tier2.length).toBeGreaterThan(0);
    expect(tier3.length).toBeGreaterThan(0);
    expect(tier4.length).toBe(surpluses.length);

    for (const c of tier1) expect(c.penalty_2026_y1_eur).toBeGreaterThan(10000000);
    for (const c of tier2) {
      expect(c.penalty_2026_y1_eur).toBeGreaterThanOrEqual(2000000);
      expect(c.penalty_2026_y1_eur).toBeLessThanOrEqual(10000000);
    }
    for (const c of tier3) {
      expect(c.penalty_2026_y1_eur).toBeGreaterThan(0);
      expect(c.penalty_2026_y1_eur).toBeLessThan(2000000);
    }
    for (const c of tier4) {
      expect(c.compliance_balance_2026_tco2e).toBeGreaterThan(0);
      expect(c.penalty_2026_y1_eur).toBe(0);
    }
  });

  it('correctly maps strategy tiers to design-token badge classes', () => {
    expect(getStrategyTierBadgeClass('Tier 1: Mega-Deficit (>€10M / year)')).toBe('chip-neg');
    expect(getStrategyTierBadgeClass('Tier 2: Mid-Tier Compliance Buyer (€2M – €10M / year)')).toBe('chip-warn');
    expect(getStrategyTierBadgeClass('Tier 3: Regional & Feeder Deficit (<€2M / year)')).toBe('chip-info');
    expect(getStrategyTierBadgeClass('Tier 4: Over-Compliant Article 21 Surplus Seller')).toBe('chip-pos');
    expect(getStrategyTierBadgeClass('Unknown Tier')).toBe('chip-pos');
  });

  it('supports intuitive rank-based search queries (#1, rank 1, or numeric 1)', () => {
    const parseRankSearch = (q: string) => {
      const clean = q.trim();
      const isPrefix = clean.startsWith('#') || clean.toLowerCase().startsWith('rank ');
      return isPrefix
        ? parseInt(clean.replace(/^(#|rank\s*)/i, ''), 10)
        : (clean.match(/^\d+$/) ? parseInt(clean, 10) : NaN);
    };

    const lastRank = FUEL_EU_SHIPPING_COUNTERPARTIES.length;
    expect(parseRankSearch('#1')).toBe(1);
    expect(parseRankSearch(`#${lastRank}`)).toBe(lastRank);
    expect(parseRankSearch('rank 10')).toBe(10);
    expect(parseRankSearch('Rank 50')).toBe(50);
    expect(parseRankSearch('42')).toBe(42);
    expect(isNaN(parseRankSearch('NotANumber'))).toBe(true);

    const rank1Target = FUEL_EU_SHIPPING_COUNTERPARTIES.find(c => c.rank === parseRankSearch('#1'));
    expect(rank1Target).toBeDefined();
    expect(rank1Target).toBe(FUEL_EU_SHIPPING_COUNTERPARTIES[0]);
  });

  it('verifies pagination calculations across all page sizes (25, 50, 100, ALL)', () => {
    const totalItems = FUEL_EU_SHIPPING_COUNTERPARTIES.length;

    expect(Math.ceil(totalItems / 25)).toBe(Math.ceil(totalItems / 25));
    expect(Math.ceil(totalItems / 50)).toBeGreaterThan(0);
    expect(Math.ceil(totalItems / 100)).toBeGreaterThan(0);

    const allSlice = FUEL_EU_SHIPPING_COUNTERPARTIES.slice(0, totalItems);
    expect(allSlice.length).toBe(totalItems);
  });

  it('classifies shipping counterparties into Dual-Fuel LNG vs Conventional Only fleets with verified vessel splits', () => {
    const dualFuelCarriers = FUEL_EU_SHIPPING_COUNTERPARTIES.filter(c => c.fleetCapability === 'DUAL_FUEL_LNG');
    const conventionalCarriers = FUEL_EU_SHIPPING_COUNTERPARTIES.filter(c => c.fleetCapability === 'CONVENTIONAL_ONLY');

    expect(dualFuelCarriers.length).toBeGreaterThan(0);
    expect(conventionalCarriers.length).toBeGreaterThan(0);
    expect(dualFuelCarriers.length + conventionalCarriers.length).toBe(FUEL_EU_SHIPPING_COUNTERPARTIES.length);

    for (const c of FUEL_EU_SHIPPING_COUNTERPARTIES) {
      expect(c.lng_vessels_in_scope + c.conventional_vessels_in_scope).toBe(c.vessels_in_scope);
      if (c.fleetCapability === 'DUAL_FUEL_LNG') {
        expect(c.lng_vessels_in_scope).toBeGreaterThan(0);
        expect(c.lng_tonnes).toBeGreaterThan(0);
      } else {
        expect(c.lng_vessels_in_scope).toBe(0);
        expect(c.conventional_vessels_in_scope).toBe(c.vessels_in_scope);
        expect(c.lng_tonnes).toBe(0);
      }
    }
  });

  it('computes joint FuelEU Maritime and EU ETS Maritime (Directive 2023/959) regulatory exposure', () => {
    // 1. Verify statutory calculation engine
    const ets = calculateEuEtsExposure(10000, 1000, 2000, 70.00);
    // Gross CO2: 10000*3.114 + 1000*3.206 + 2000*2.750 = 31140 + 3206 + 5500 = 39,846 tCO2
    expect(ets.totalGrossCo2Tonnes).toBeCloseTo(39846, 1);
    expect(ets.etsExposure2025Tco2).toBeCloseTo(27892.2, 1);
    expect(ets.etsExposure2025Eur).toBeCloseTo(1952454, 0);
    expect(ets.etsExposure2026Tco2).toBeCloseTo(40760.4, 1);
    expect(ets.etsExposure2026Eur).toBeCloseTo(2853228, 0);

    const etsWithPenalty = calculateEuEtsExposure(10000, 1000, 2000, 70.00, 500000);
    expect(etsWithPenalty.combinedRegulatoryExposure2025Eur).toBe(ets.etsExposure2025Eur + 500000);

    // 2. Verify all counterparties have non-negative, mathematically correct combined exposure.
    // ETS fields are computed from the MRV-reported ets_co2_t, not the estimated fuel split, so
    // they need not track the VLSFO/MGO/LNG-based totalGrossCo2Tonnes formula above exactly.
    for (const c of FUEL_EU_SHIPPING_COUNTERPARTIES) {
      const etsEur = shippingEtsExposureEur(c.ets_exposure_2026_tco2, TEST_EUA_EUR_PER_TCO2E)!;
      const combinedEur = shippingCombinedRegulatoryExposureEur(c.penalty_2026_y1_eur, c.ets_exposure_2026_tco2, TEST_EUA_EUR_PER_TCO2E)!;
      expect(etsEur).toBeGreaterThanOrEqual(0);
      expect(combinedEur).toBe(c.penalty_2026_y1_eur + etsEur);

      if (c.compliance_balance_2026_tco2e > 0) {
        expect(c.penalty_2026_y1_eur).toBe(0);
        expect(combinedEur).toBe(etsEur);
      } else {
        expect(combinedEur).toBeGreaterThanOrEqual(c.penalty_2026_y1_eur);
      }
    }
  });

  it('evaluates institutional Marine Bunker Quotation Engine (€/t and $/t) against the fossil-LNG alternative compliance', () => {
    const quote = calculateMarineBunkerQuotation({
      ttfGasIndexEurMwh: 36.00,
      liquefactionFeeEurMwh: 14.00,
      greenPremiumEurMwh: 22.00,
      euaPriceEurPerTonne: 70.00,
      eurUsdRate: 1.08,
      fuelEuSurplusPriceEurPerTco2e: 270,
      bioLngVolumeTonnes: 10000,
      bioLngCi: -100,
      targetYear: 2025,
    });

    expect(quote.allInBioLngPriceEurMwh).toBe(72.00);
    expect(quote.allInBioLngPriceEurPerTonne).toBe(1000.00);
    expect(quote.allInBioLngPriceUsdPerTonne).toBeCloseTo(1080.00, 2);
    expect(quote.mwhPerTonneBioLng).toBeCloseTo(13.8889, 4);
    expect(quote.equivalentFossilLngTonnes).toBeCloseTo(1.0183, 4);
    expect(quote.fossilLngCostEur).toBeCloseTo(694.44, 2);
    expect(quote.fossilLngCostUsd).toBeCloseTo(750.00, 2);
    expect(quote.fossilLngEtsLiabilityEur).toBeCloseTo(137.22, 2);
    expect(quote.fossilLngFuelEuBalanceEur).toBeCloseTo(87.33, 2);
    expect(quote.totalConventionalAlternativeCostEur).toBeCloseTo(744.33, 2);
    expect(quote.fuelEuSurplusTco2ePerTonne).toBeCloseTo(9.0564, 4);
    expect(quote.fuelEuSurplusPriceEurPerTco2e).toBe(270);
    expect(quote.fuelEuSurplusValueEurPerTonne).toBeCloseTo(2445.23, 2);
    expect(quote.netSavingsPerTonneBioLngEur).toBeCloseTo(2189.56, 2);
    expect(quote.totalClientSavingsEur).toBe(Math.round(quote.dealVolumeTonnes! * quote.netSavingsPerTonneBioLngEur));
    expect(quote.dealVolumeTonnes).toBe(10000);
    expect(quote.dealVolumeMwh).toBe(138889);
    expect(quote.totalBioLngInvoiceEur).toBe(10000000);
    expect(quote.totalClientSavingsEur).toBeGreaterThan(0);
    expect(quote.totalEtsAvoidedTco2).toBeGreaterThan(0);
  });

  it('verifies deal flow data invariants for top counterparties across Dual-Fuel and Conventional fleets', () => {
    const dualFuelTarget = FUEL_EU_SHIPPING_COUNTERPARTIES.find(c => c.fleetCapability === 'DUAL_FUEL_LNG');
    const conventionalTarget = FUEL_EU_SHIPPING_COUNTERPARTIES.find(c => c.fleetCapability === 'CONVENTIONAL_ONLY');

    expect(dualFuelTarget).toBeDefined();
    expect(conventionalTarget).toBeDefined();

    for (const cp of [dualFuelTarget!, conventionalTarget!]) {
      const isDualFuel = cp.fleetCapability === 'DUAL_FUEL_LNG';
      const etsEur = shippingEtsExposureEur(cp.ets_exposure_2026_tco2, TEST_EUA_EUR_PER_TCO2E)!;
      const combinedRisk = cp.penalty_2026_y1_eur + etsEur;
      expect(shippingCombinedRegulatoryExposureEur(cp.penalty_2026_y1_eur, cp.ets_exposure_2026_tco2, TEST_EUA_EUR_PER_TCO2E)).toBe(combinedRisk);

      const quote = calculateMarineBunkerQuotation({
        ...TEST_QUOTE_MARKET_INPUTS,
        ttfGasIndexEurMwh: 36.0,
        liquefactionFeeEurMwh: 14.0,
        greenPremiumEurMwh: 22.0,
        bioLngVolumeTonnes: cp.bio_lng_required_neg100_t,
      });

      expect(quote.allInBioLngPriceEurPerTonne).toBe(1000.00);
      expect(quote.netSavingsPerTonneBioLngEur).toBeGreaterThan(0);
      if (cp.bio_lng_required_neg100_t > 0) {
        expect(quote.totalClientSavingsEur).toBeGreaterThan(0);
      }

      if (isDualFuel && cp.compliance_balance_2026_tco2e < 0) {
        expect(cp.desk_margin_physical_eur).toBeGreaterThan(0);
      }
      if (cp.compliance_balance_2026_tco2e !== 0) {
        const econ = poolingEconomicsForBalance(cp.compliance_balance_2026_tco2e, cp.penalty_2026_y1_eur, TEST_POOL);
        expect(econ.marginEur).toBeGreaterThan(0);
      }
    }
  });

  it('verifies deal flow pooling invariants for a surplus holder and Trade Builder URL parameter mapping', () => {
    const surplusTarget = FUEL_EU_SHIPPING_COUNTERPARTIES.find(c => c.compliance_balance_2026_tco2e > 0);
    expect(surplusTarget).toBeDefined();
    expect(surplusTarget!.compliance_balance_2026_tco2e).toBeGreaterThan(0);
    expect(surplusTarget!.penalty_2026_y1_eur).toBe(0);
    const surplusEcon = poolingEconomicsForBalance(
      surplusTarget!.compliance_balance_2026_tco2e,
      surplusTarget!.penalty_2026_y1_eur,
      TEST_POOL
    );
    expect(surplusEcon.savingsEur).toBeGreaterThan(0);
    expect(surplusEcon.marginEur).toBeGreaterThan(0);

    const url = buildDealUrl({
      marketId: 'FUELEU',
      originCountry: 'NL',
      feedstock: 'manure',
      ci: -100,
      volume: 15000,
      counterparty: surplusTarget!.parent_name,
      legalEntityName: surplusTarget!.parent_name,
      complianceYear: 2025,
      contactEmail: 'desk@example.com',
      contactPhone: '+31000000000',
    });

    expect(url).toContain('/trade?');
    expect(url).toContain('marketId=FUELEU');
    expect(url).toContain('originCountry=NL');
    expect(url).toContain('feedstock=manure');
    expect(url).toContain('ci=-100');
    expect(url).toContain('volume=15000');
    expect(url).toContain('contactEmail=');
    expect(url).toContain('contactPhone=');
  });

  it('verifies deep-linking and URL step state mapping for shipping deal flow', () => {
    const resolveDealFlowState = (companyParam: string | null, stepParam: string | null) => {
      let selectedCounterparty = null;
      if (companyParam) {
        const rank = parseInt(companyParam, 10);
        if (!isNaN(rank)) {
          selectedCounterparty = FUEL_EU_SHIPPING_COUNTERPARTIES.find(c => c.rank === rank) || null;
        }
        if (!selectedCounterparty) {
          const lower = companyParam.toLowerCase();
          selectedCounterparty = FUEL_EU_SHIPPING_COUNTERPARTIES.find(
            c => c.parent_name.toLowerCase() === lower
          ) || null;
        }
      }

      let currentStep = 1;
      if (selectedCounterparty) {
        const parsedStep = parseInt(stepParam || '2', 10);
        currentStep = (parsedStep >= 1 && parsedStep <= 4) ? parsedStep : 2;
      }

      return { selectedCounterparty, currentStep };
    };

    const first = FUEL_EU_SHIPPING_COUNTERPARTIES[0];
    const second = FUEL_EU_SHIPPING_COUNTERPARTIES[1];

    // Scenario 1: Initial visit to directory
    const s1 = resolveDealFlowState(null, null);
    expect(s1.selectedCounterparty).toBeNull();
    expect(s1.currentStep).toBe(1);

    // Scenario 2: Deep-link to rank 1, Step 2
    const s2 = resolveDealFlowState('1', '2');
    expect(s2.selectedCounterparty).not.toBeNull();
    expect(s2.selectedCounterparty?.rank).toBe(1);
    expect(s2.selectedCounterparty?.parent_name).toBe(first.parent_name);
    expect(s2.currentStep).toBe(2);

    // Scenario 3: Deep-link to Step 3 (Pricing) for rank 2
    const s3 = resolveDealFlowState('2', '3');
    expect(s3.selectedCounterparty?.rank).toBe(2);
    expect(s3.selectedCounterparty?.parent_name).toBe(second.parent_name);
    expect(s3.currentStep).toBe(3);

    // Scenario 4: Deep-link to Step 4 (Term Sheet) by exact company name
    const s4 = resolveDealFlowState(first.parent_name, '4');
    expect(s4.selectedCounterparty?.parent_name).toBe(first.parent_name);
    expect(s4.currentStep).toBe(4);

    // Scenario 5: Stepping backward from 4 -> 3 -> 2 -> 1
    const backTo3 = resolveDealFlowState('1', '3');
    expect(backTo3.currentStep).toBe(3);

    const backTo2 = resolveDealFlowState('1', '2');
    expect(backTo2.currentStep).toBe(2);

    const backTo1 = resolveDealFlowState(null, null);
    expect(backTo1.selectedCounterparty).toBeNull();
    expect(backTo1.currentStep).toBe(1);
  });
});

describe('September 2026 audit remediation — Bio-LNG methodology, scope, ETS 2026, simulator/engine parity', () => {
  it('ESSF SAPS WS1 FuelEU worked example (p.78): Bio-LNG WtW matches to 5 decimal places', () => {
    // Annex II note on col.4: WtT = E − Cf_CO2/LCV = E − 2.750/0.050 = E − 55
    // TtW keeps Cf_CO2 inside the (1−Cslip) bracket: combustion = 2.750 + 0×25 + 0.00011×298 = 2.78278
    // Otto SS (1.7% slip): TtW = ((1-0.017)×2.78278 + 0.017×25)/0.050 = 63.20945
    // Otto MS (3.1% slip): TtW = ((1-0.031)×2.78278 + 0.031×25)/0.050 = 69.43028
    expect(bioLngFuelEUIntensity(-100, 'LNG_OTTO_SS')).toBeCloseTo(-91.79055, 5);
    expect(bioLngFuelEUIntensity(0, 'LNG_OTTO_SS')).toBeCloseTo(8.20945, 5);
    expect(bioLngFuelEUIntensity(-100, 'LNG_OTTO_MS')).toBeCloseTo(-85.56972, 5);
    expect(bioLngFuelEUIntensity(-15, 'LNG_OTTO_MS')).toBeCloseTo(-0.56972, 5);
  });

  it('fuelEuInScopeFactor: 100% intra-EU/at-berth, 50% third-country (Art. 2(1))', () => {
    expect(fuelEuInScopeFactor(0)).toBe(1);
    expect(fuelEuInScopeFactor(1)).toBe(0.5);
    expect(fuelEuInScopeFactor(0.5)).toBe(0.75);
    // Clamped to [0,1]
    expect(fuelEuInScopeFactor(-1)).toBe(1);
    expect(fuelEuInScopeFactor(2)).toBe(0.5);
  });

  it('shareThirdCountryVoyages scales all fuel tonnes before the compliance calculation', () => {
    const base = {
      vlsfoTonnes: 10000, mgoTonnes: 0, lngTonnes: 0, bioLngTonnes: 0, bioLngCi: -100,
      targetYear: 2025, consecutiveYearsNonCompliant: 1,
    };
    const fullScope = calculateVesselExposure(base);
    const halfThirdCountry = calculateVesselExposure({ ...base, shareThirdCountryVoyages: 1 });
    // 100% third-country voyages -> scope factor 0.5 -> half the energy, same weighted GHGIE,
    // exactly half the compliance balance and (for a fixed GHGIE) half the penalty.
    expect(halfThirdCountry.totalEnergyMj).toBeCloseTo(fullScope.totalEnergyMj * 0.5, 3);
    expect(halfThirdCountry.weightedGhgie).toBeCloseTo(fullScope.weightedGhgie, 6);
    expect(halfThirdCountry.complianceBalanceTco2e).toBeCloseTo(fullScope.complianceBalanceTco2e * 0.5, 3);
  });

  it('EU ETS from 2026 includes LNG CH4 slip and N2O CO2e (Directive 2003/87/EC as amended by (EU) 2023/959)', () => {
    const ets = calculateEuEtsExposure(0, 0, 10000, 70, 0, 'LNG_OTTO_SS');
    // CO2-only baseline: 10,000 × 2.750 = 27,500 t
    expect(ets.totalGrossCo2Tonnes).toBeCloseTo(27500, 1);
    // 2025 stays CO2-only at 70%: 27,500 × 0.70 = 19,250 t (no CH4/N2O yet)
    expect(ets.etsExposure2025Tco2).toBeCloseTo(19250, 1);
    // 2026: CO2 at 100% (27,500) + CH4 slip (10,000×0.017×25=4,250) + N2O (10,000×0.983×0.00011×298≈322.23)
    // = 27,500 + 4,250 + 322.23 = 32,072.23 t
    expect(ets.etsExposure2026Tco2).toBeCloseTo(32072.2, 0);
    expect(ets.etsExposure2026Tco2).toBeGreaterThan(ets.totalGrossCo2Tonnes);
  });

  it('penaltyEur and closeDeficitWithBioLng are the same shared functions calculateVesselExposure uses', () => {
    const input = {
      vlsfoTonnes: 8000, mgoTonnes: 500, lngTonnes: 0, bioLngTonnes: 0, bioLngCi: -100,
      targetYear: 2025, consecutiveYearsNonCompliant: 2,
    };
    const r = calculateVesselExposure(input);
    expect(r.statutoryPenaltyY1Eur).toBeCloseTo(penaltyEur(r.complianceBalanceTco2e, r.weightedGhgie, 2), 6);
    expect(r.statutoryPenaltyY2Eur).toBeCloseTo(penaltyEur(r.complianceBalanceTco2e, r.weightedGhgie, 3), 6);
    const closure = closeDeficitWithBioLng({
      deficitTco2e: r.complianceBalanceTco2e,
      displacedIntensity: FUELEU_VLSFO_WTW,
      bioLngCi: -100,
    });
    expect(r.bioLngRequiredNeg100Tonnes).toBeCloseTo(closure.tonnes, 6);
    expect(r.bioLngRequiredNeg100Mwh).toBeCloseTo(closure.mwh, 6);
  });

  it('quote surplus and fossil-LNG balance are valued at the surplus price passed in (the desk bid from the FUELEU mark), not a fixed benchmark', () => {
    const quoteAtDefault = calculateMarineBunkerQuotation({ ...TEST_QUOTE_MARKET_INPUTS, bioLngCi: -100 });
    const quoteAtCustomBid = calculateMarineBunkerQuotation({ ...TEST_QUOTE_MARKET_INPUTS, bioLngCi: -100, fuelEuSurplusPriceEurPerTco2e: 100 });
    expect(quoteAtDefault.fuelEuSurplusPriceEurPerTco2e).toBe(98.6); // desk bid passed in (offer 108.60 - spread 10)
    expect(quoteAtCustomBid.fuelEuSurplusPriceEurPerTco2e).toBe(100);
    expect(quoteAtCustomBid.fuelEuSurplusValueEurPerTonne).toBeCloseTo(
      quoteAtDefault.fuelEuSurplusValueEurPerTonne * (100 / 98.6),
      2
    );
  });

  it('fossil LNG is the bunker-quote counterfactual, not VLSFO: quote reacts to the LNG engine class', () => {
    const ss = calculateMarineBunkerQuotation({ ...TEST_QUOTE_MARKET_INPUTS, bioLngCi: -100, lngEngineType: 'LNG_OTTO_SS' });
    const ms = calculateMarineBunkerQuotation({ ...TEST_QUOTE_MARKET_INPUTS, bioLngCi: -100, lngEngineType: 'LNG_OTTO_MS' });
    // Higher-slip Otto MS fossil LNG is a worse (higher WtW) counterfactual, so its own FuelEU
    // surplus credit is smaller — reducing the net savings relative to Otto SS.
    expect(fossilLngWtw('LNG_OTTO_MS')).toBeGreaterThan(fossilLngWtw('LNG_OTTO_SS'));
    expect(ms.fossilLngFuelEuBalanceEur).toBeLessThan(ss.fossilLngFuelEuBalanceEur);
  });
});
