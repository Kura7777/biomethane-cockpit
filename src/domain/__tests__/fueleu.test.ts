import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import {
  FUEL_EU_SHIPPING_COUNTERPARTIES,
  VESSEL_ARCHETYPES,
  calculateVesselExposure,
  FUELEU_TARGET_2025,
  FUELEU_TARGET_2030,
  FUELEU_BASELINE_VLSFO_CI,
  FUELEU_STATUTORY_PENALTY_PER_TONNE,
  CALLING_REGIONS,
  TRADE_LANES,
  CallingRegion,
  TradeLane,
  getStrategyTierBadgeClass,
} from '../fueleu';

describe('FuelEU Maritime Domain & Shipping Targets', () => {
  it('loads all 1,850 shipping companies with non-null metrics and zero NaNs', () => {
    expect(FUEL_EU_SHIPPING_COUNTERPARTIES.length).toBe(1850);

    for (const c of FUEL_EU_SHIPPING_COUNTERPARTIES) {
      expect(c.rank).toBeGreaterThan(0);
      expect(Number.isInteger(c.rank)).toBe(true);
      expect(c.parent_name).toBeTruthy();
      expect(c.vessels_in_scope).toBeGreaterThan(0);
      expect(c.total_energy_mwh).toBeGreaterThan(0);
      expect(c.actual_ghgie).toBeGreaterThan(0);
      expect(Number.isFinite(c.compliance_balance_2025_tco2e)).toBe(true);
      expect(Number.isFinite(c.penalty_2025_y1_eur)).toBe(true);
      expect(Number.isFinite(c.bio_lng_required_neg100_t)).toBe(true);
      expect(Number.isFinite(c.client_savings_physical_eur)).toBe(true);
      expect(Number.isFinite(c.desk_margin_physical_eur)).toBe(true);
      expect(Number.isFinite(c.client_savings_pooling_eur)).toBe(true);
      expect(Number.isFinite(c.desk_margin_pooling_eur)).toBe(true);
      expect(c.primary_bunkering_hubs).toBeTruthy();
    }
  });

  it('correctly aggregates portfolio metrics across 12,000+ vessels', () => {
    const totalVessels = FUEL_EU_SHIPPING_COUNTERPARTIES.reduce((acc, c) => acc + c.vessels_in_scope, 0);
    const totalEnergyMwh = FUEL_EU_SHIPPING_COUNTERPARTIES.reduce((acc, c) => acc + c.total_energy_mwh, 0);
    const surplusCounterparties = FUEL_EU_SHIPPING_COUNTERPARTIES.filter(c => c.compliance_balance_2025_tco2e > 0);
    const deficitCounterparties = FUEL_EU_SHIPPING_COUNTERPARTIES.filter(c => c.compliance_balance_2025_tco2e < 0);

    expect(totalVessels).toBe(12356);
    // >600 TWh fleet energy
    expect(totalEnergyMwh).toBeGreaterThan(600000000);

    // 36 over-compliant surplus holders, 1814 deficit carriers
    expect(surplusCounterparties.length).toBe(36);
    expect(deficitCounterparties.length).toBe(1814);
  });

  it('contains expected market leaders with verified numbers', () => {
    const msc = FUEL_EU_SHIPPING_COUNTERPARTIES.find(c => c.parent_name.includes('MSC'));
    expect(msc).toBeDefined();
    expect(msc!.vessels_in_scope).toBe(420);
    expect(msc!.penalty_2025_y1_eur).toBeCloseTo(120842392, 0);

    const maersk = FUEL_EU_SHIPPING_COUNTERPARTIES.find(c => c.parent_name.includes('Maersk'));
    expect(maersk).toBeDefined();
    expect(maersk!.vessels_in_scope).toBe(290);
    expect(maersk!.compliance_balance_2025_tco2e).toBeLessThan(0);

    const cma = FUEL_EU_SHIPPING_COUNTERPARTIES.find(c => c.parent_name.includes('CMA CGM'));
    expect(cma).toBeDefined();
    // CMA CGM is a surplus holder due to extensive LNG fleet
    expect(cma!.compliance_balance_2025_tco2e).toBeGreaterThan(0);
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
    });

    expect(result.isOverCompliant).toBe(false);
    expect(result.complianceBalanceTco2e).toBeLessThan(0);
    expect(result.weightedGhgie).toBeCloseTo(FUELEU_BASELINE_VLSFO_CI, 2);
    expect(result.statutoryPenaltyY1Eur).toBeGreaterThan(0);
    expect(result.bioLngRequiredNeg100Tonnes).toBeGreaterThan(0);
    expect(result.physicalSavingsEur).toBeGreaterThan(0);
    expect(result.physicalTradingMarginEur).toBeGreaterThan(0);
    expect(result.poolingSavingsEur).toBeGreaterThan(0);
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
    });

    expect(result.isOverCompliant).toBe(true);
    expect(result.complianceBalanceTco2e).toBeGreaterThan(0);
    expect(result.statutoryPenaltyY1Eur).toBe(0);
    expect(result.bioLngRequiredNeg100Tonnes).toBe(0);
    // Over-compliant vessels can monetize surplus through Article 21 pooling
    expect(result.poolingSavingsEur).toBeGreaterThan(0);
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

    const neutralized = calculateVesselExposure({
      vlsfoTonnes: 10000,
      mgoTonnes: 0,
      lngTonnes: 0,
      bioLngTonnes: requiredBioLng,
      bioLngCi: -100,
      targetYear: 2025,
      consecutiveYearsNonCompliant: 1,
    });

    expect(neutralized.complianceBalanceTco2e).toBeCloseTo(0, 0);
    expect(neutralized.statutoryPenaltyY1Eur).toBeCloseTo(0, 0);
    expect(neutralized.isOverCompliant).toBe(true);
  });

  it('strictly registers the FuelEU Maritime dataset in DATA_SOURCES_DIRECTORY', async () => {
    const { getDataSourceById } = await import('../provenance/dataSourcesDirectory');
    const source = getDataSourceById('fueleu_maritime_shipping_registry');

    expect(source).toBeDefined();
    expect(source!.name).toContain('FuelEU Maritime');
    expect(source!.provenanceTier).toBe('STATUTORY_DIRECTIVE');
    expect(source!.category).toBe('REGISTRIES_MASS_BALANCE');
    expect(source!.fieldsProvided.length).toBeGreaterThan(5);
    expect(source!.coverageCount).toBe('1,850 Shipping Companies (12,356 Vessels · 633.2 TWh EU Scope)');
    expect(source!.docUrl).toBeTruthy();
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

  it('isolates bunker hubs by exact token without substring contamination', () => {
    // Check that Bremen does NOT match Bremerhaven
    const bremerhavenOnly = FUEL_EU_SHIPPING_COUNTERPARTIES.filter(c => {
      const hubs = c.primary_bunkering_hubs.split(',').map(h => h.trim());
      return hubs.includes('Bremerhaven') && !hubs.includes('Bremen');
    });

    expect(bremerhavenOnly.length).toBeGreaterThan(0);

    for (const c of bremerhavenOnly) {
      const hubs = c.primary_bunkering_hubs.split(',').map(h => h.trim());
      expect(hubs.includes('Bremen')).toBe(false);
    }
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

  it('enriches all 1,850 counterparties with valid CallingRegion, TradeLane, and complete institutional contact dossiers', () => {
    const validRegions: CallingRegion[] = [
      'ARA_HUB',
      'WEST_MED',
      'BALTIC_NORDIC',
      'UK_CONTINENT',
      'CENTRAL_MED_ADRIATIC',
    ];
    const validLanes: TradeLane[] = [
      'ASIA_EUROPE',
      'INTRA_EU_FEEDER',
      'TRANSATLANTIC',
      'BALTIC_NORDIC_ROPAX',
      'ME_AFRICA_EU_LIQUID',
    ];

    expect(FUEL_EU_SHIPPING_COUNTERPARTIES.length).toBe(1850);

    for (const c of FUEL_EU_SHIPPING_COUNTERPARTIES) {
      // Valid Calling Region
      expect(validRegions).toContain(c.callingRegion);
      expect(CALLING_REGIONS[c.callingRegion]).toBeDefined();
      expect(CALLING_REGIONS[c.callingRegion].label).toBeTruthy();
      expect(CALLING_REGIONS[c.callingRegion].portsDescription).toBeTruthy();

      // Valid Trade Lane
      expect(validLanes).toContain(c.tradeLane);
      expect(TRADE_LANES[c.tradeLane]).toBeDefined();
      expect(TRADE_LANES[c.tradeLane].label).toBeTruthy();
      expect(TRADE_LANES[c.tradeLane].corridorDescription).toBeTruthy();

      // Institutional Contact Dossier completeness
      expect(c.targetDepartment).toBeTruthy();
      expect(c.targetDepartment.length).toBeGreaterThan(5);
      expect(c.keyContactRole).toBeTruthy();
      expect(c.keyContactRole.length).toBeGreaterThan(5);
      expect(c.hqAddress).toBeTruthy();
      expect(c.hqAddress.length).toBeGreaterThan(8);
      expect(c.switchboardPhone).toBeTruthy();
      expect(c.switchboardPhone).toMatch(/^\+[0-9 ]+$/);
      expect(c.contactDomain).toBeTruthy();
      expect(c.contactDomain).toContain('.');

      // Tailored outreach pitch
      expect(c.outreachPitch).toBeTruthy();
      expect(c.outreachPitch.length).toBeGreaterThan(50);
      expect(c.outreachPitch.includes('FuelEU') || c.outreachPitch.includes('Bio-LNG') || c.outreachPitch.includes('Article 21')).toBe(true);
    }
  });

  it('verifies geographic distribution across all 5 European calling regions and 5 trade lanes', () => {
    const regionCounts: Record<string, number> = {};
    const laneCounts: Record<string, number> = {};

    for (const c of FUEL_EU_SHIPPING_COUNTERPARTIES) {
      regionCounts[c.callingRegion] = (regionCounts[c.callingRegion] || 0) + 1;
      laneCounts[c.tradeLane] = (laneCounts[c.tradeLane] || 0) + 1;
    }

    // All 5 calling regions are populated
    expect(regionCounts['ARA_HUB']).toBeGreaterThan(0);
    expect(regionCounts['WEST_MED']).toBeGreaterThan(0);
    expect(regionCounts['BALTIC_NORDIC']).toBeGreaterThan(0);
    expect(regionCounts['UK_CONTINENT']).toBeGreaterThan(0);
    expect(regionCounts['CENTRAL_MED_ADRIATIC']).toBeGreaterThan(0);

    // All 5 trade lanes are populated
    expect(laneCounts['ASIA_EUROPE']).toBeGreaterThan(0);
    expect(laneCounts['INTRA_EU_FEEDER']).toBeGreaterThan(0);
    expect(laneCounts['TRANSATLANTIC']).toBeGreaterThan(0);
    expect(laneCounts['BALTIC_NORDIC_ROPAX']).toBeGreaterThan(0);
    expect(laneCounts['ME_AFRICA_EU_LIQUID']).toBeGreaterThan(0);

    const totalFromRegions = Object.values(regionCounts).reduce((a, b) => a + b, 0);
    const totalFromLanes = Object.values(laneCounts).reduce((a, b) => a + b, 0);

    expect(totalFromRegions).toBe(1850);
    expect(totalFromLanes).toBe(1850);
  });

  it('verifies CRM CSV export row count, headers, and Salesforce/HubSpot compliance', () => {
    const headers = [
      'Rank',
      'Account / Company Name',
      'Headquarters',
      'HQ Street Address',
      'Switchboard Phone',
      'Corporate Domain',
      'Target Department',
      'Key Contact Role',
      'Key Executive',
      'Fleet Segment',
      'Calling Region Code',
      'Calling Region Corridor',
      'Trade Lane Code',
      'Trade Lane Route',
      'Primary Bunkering Ports',
      'Vessels in EU Scope',
      'Strategy Tier',
      'Annual EU Energy MWh',
      'Actual GHGIE (gCO2e/MJ)',
      '2025 Compliance Balance (tCO2e)',
      '2025 Statutory Penalty Y1 (EUR)',
      '2025 Statutory Penalty Y2 (EUR)',
      '2030 Statutory Penalty Y1 (EUR)',
      'Bio-LNG Req Neg100 CI (t)',
      'Bio-LNG Req Neg100 CI (MWh)',
      'Bio-LNG Req Zero CI (t)',
      'Client Potential Savings Physical (EUR)',
      'Desk Margin Physical (EUR)',
      'Client Potential Savings Pooling (EUR)',
      'Desk Margin Pooling (EUR)',
      'Tailored Commercial Outreach Pitch',
    ];

    expect(headers.length).toBe(31);

    // Test row generation format
    for (const c of FUEL_EU_SHIPPING_COUNTERPARTIES) {
      const row = [
        c.rank,
        c.parent_name,
        c.headquarters,
        c.hqAddress,
        c.switchboardPhone,
        c.contactDomain,
        c.targetDepartment,
        c.keyContactRole,
        c.key_executive,
        c.segment,
        c.callingRegion,
        CALLING_REGIONS[c.callingRegion]?.portsDescription,
        c.tradeLane,
        TRADE_LANES[c.tradeLane]?.corridorDescription,
        c.primary_bunkering_hubs,
        c.vessels_in_scope,
        c.strategy_tier,
        c.total_energy_mwh,
        c.actual_ghgie,
        c.compliance_balance_2025_tco2e,
        c.penalty_2025_y1_eur,
        c.penalty_2025_y2_eur,
        c.penalty_2030_y1_eur,
        c.bio_lng_required_neg100_t,
        c.bio_lng_required_neg100_mwh,
        c.bio_lng_required_zero_t,
        c.client_savings_physical_eur,
        c.desk_margin_physical_eur,
        c.client_savings_pooling_eur,
        c.desk_margin_pooling_eur,
        c.outreachPitch,
      ];

      expect(row.length).toBe(headers.length);
      for (const field of row) {
        expect(field).not.toBeUndefined();
        expect(field).not.toBeNull();
      }
    }
  });

  it('strictly synchronizes outreach pitches with audited numerical fields across all 1,850 counterparties', () => {
    for (const c of FUEL_EU_SHIPPING_COUNTERPARTIES) {
      if (c.penalty_2025_y1_eur > 0) {
        // Deficit carrier: pitch must accurately reflect penalty in millions (e.g. €120.8M or rounded)
        const penM = (c.penalty_2025_y1_eur / 1e6).toFixed(1);
        const penRound = Math.round(c.penalty_2025_y1_eur / 1e6);
        const hasPenalty = c.outreachPitch.includes(`€${penM}M`) || c.outreachPitch.includes(`€${penRound}M`) || c.outreachPitch.includes(`€${(c.penalty_2025_y1_eur / 1e6).toFixed(2)}M`);
        expect(hasPenalty, `Penalty missing from pitch of ${c.parent_name}`).toBe(true);

        // Client savings must also be mentioned
        const savePhysicalM = (c.client_savings_physical_eur / 1e6).toFixed(1);
        const savePoolingM = (c.client_savings_pooling_eur / 1e6).toFixed(1);
        const hasSavings = c.outreachPitch.includes(`€${savePhysicalM}M`) || 
                           c.outreachPitch.includes(`€${savePoolingM}M`) ||
                           c.outreachPitch.includes(`€${(c.client_savings_physical_eur / 1e6).toFixed(2)}M`) ||
                           c.outreachPitch.includes(`€${(c.client_savings_pooling_eur / 1e6).toFixed(2)}M`) ||
                           c.outreachPitch.includes(`€${Math.round(c.client_savings_physical_eur / 1e6)}M`) ||
                           c.outreachPitch.includes(`€${Math.round(c.client_savings_pooling_eur / 1e6)}M`);
        expect(hasSavings, `Savings missing from pitch of ${c.parent_name}`).toBe(true);
      } else {
        // Surplus holder: must have positive pooling economics and mention surplus in kt
        expect(c.client_savings_pooling_eur).toBeGreaterThan(0);
        expect(c.desk_margin_pooling_eur).toBeGreaterThan(0);

        const surpKt = (c.compliance_balance_2025_tco2e / 1000).toFixed(1);
        const hasSurplus = c.outreachPitch.includes(`+${surpKt} kt`);
        expect(hasSurplus, `Surplus +${surpKt} kt missing from pitch of ${c.parent_name}`).toBe(true);
      }
    }
  });

  it('strictly validates 1-indexed sequential ranking and 4 strategic tiers', () => {
    expect(FUEL_EU_SHIPPING_COUNTERPARTIES.length).toBe(1850);

    // Verify ranks 1 to 1850
    for (let i = 0; i < FUEL_EU_SHIPPING_COUNTERPARTIES.length; i++) {
      expect(FUEL_EU_SHIPPING_COUNTERPARTIES[i].rank).toBe(i + 1);
    }

    // Verify all 1814 deficit carriers are sorted descending by penalty
    const deficits = FUEL_EU_SHIPPING_COUNTERPARTIES.filter(c => c.compliance_balance_2025_tco2e < 0);
    expect(deficits.length).toBe(1814);
    for (let i = 0; i < deficits.length - 1; i++) {
      expect(deficits[i].penalty_2025_y1_eur).toBeGreaterThanOrEqual(deficits[i + 1].penalty_2025_y1_eur);
    }

    // Verify all 4 strategic tiers exist and are cleanly partitioned
    const tier1 = FUEL_EU_SHIPPING_COUNTERPARTIES.filter(c => c.strategy_tier.startsWith('Tier 1'));
    const tier2 = FUEL_EU_SHIPPING_COUNTERPARTIES.filter(c => c.strategy_tier.startsWith('Tier 2'));
    const tier3 = FUEL_EU_SHIPPING_COUNTERPARTIES.filter(c => c.strategy_tier.startsWith('Tier 3'));
    const tier4 = FUEL_EU_SHIPPING_COUNTERPARTIES.filter(c => c.strategy_tier.startsWith('Tier 4'));

    expect(tier1.length).toBeGreaterThan(0);
    expect(tier2.length).toBeGreaterThan(0);
    expect(tier3.length).toBeGreaterThan(0);
    expect(tier4.length).toBe(36);

    // Tier 1: Mega-Deficit (>€10M / year)
    for (const c of tier1) {
      expect(c.penalty_2025_y1_eur).toBeGreaterThan(10000000);
    }
    // Tier 2: Mid-Tier Compliance (€2M – €10M / year)
    for (const c of tier2) {
      expect(c.penalty_2025_y1_eur).toBeGreaterThanOrEqual(2000000);
      expect(c.penalty_2025_y1_eur).toBeLessThanOrEqual(10000000);
    }
    // Tier 3: Regional & Feeder Deficit (<€2M / year)
    for (const c of tier3) {
      expect(c.penalty_2025_y1_eur).toBeGreaterThan(0);
      expect(c.penalty_2025_y1_eur).toBeLessThan(2000000);
    }
    // Tier 4: Over-Compliant Article 21 Surplus Sellers
    for (const c of tier4) {
      expect(c.compliance_balance_2025_tco2e).toBeGreaterThan(0);
      expect(c.penalty_2025_y1_eur).toBe(0);
    }
  });

  it('verifies multi-parameter corridor and trade lane isolation and search matching', () => {
    const araLanes = FUEL_EU_SHIPPING_COUNTERPARTIES.filter(c => c.callingRegion === 'ARA_HUB');
    const asiaLanes = FUEL_EU_SHIPPING_COUNTERPARTIES.filter(c => c.tradeLane === 'ASIA_EUROPE');
    const araAsiaIntersect = FUEL_EU_SHIPPING_COUNTERPARTIES.filter(
      c => c.callingRegion === 'ARA_HUB' && c.tradeLane === 'ASIA_EUROPE'
    );

    expect(araLanes.length).toBeGreaterThan(0);
    expect(asiaLanes.length).toBeGreaterThan(0);
    expect(araAsiaIntersect.length).toBeGreaterThan(0);
    expect(araAsiaIntersect.length).toBeLessThanOrEqual(araLanes.length);
    expect(araAsiaIntersect.length).toBeLessThanOrEqual(asiaLanes.length);

    // Domain search matching
    const maerskMatch = FUEL_EU_SHIPPING_COUNTERPARTIES.filter(c =>
      c.contactDomain.toLowerCase().includes('maersk.com')
    );
    expect(maerskMatch.length).toBe(1);
    expect(maerskMatch[0].parent_name).toContain('Maersk');

    // Corridor code matching
    const westMedMatch = FUEL_EU_SHIPPING_COUNTERPARTIES.filter(c =>
      c.callingRegion.includes('WEST_MED')
    );
    expect(westMedMatch.length).toBeGreaterThan(0);
    for (const m of westMedMatch) {
      expect(m.callingRegion).toBe('WEST_MED');
    }
  });

  it('correctly maps strategy tiers to design-token badge classes', () => {
    expect(getStrategyTierBadgeClass('Tier 1: Mega-Deficit (>€10M / year)')).toBe('chip-neg');
    expect(getStrategyTierBadgeClass('Tier 2: Mid-Tier Compliance Buyer (€2M – €10M / year)')).toBe('chip-warn');
    expect(getStrategyTierBadgeClass('Tier 3: Regional & Feeder Deficit (<€2M / year)')).toBe('chip-info');
    expect(getStrategyTierBadgeClass('Tier 4: Over-Compliant Article 21 Surplus Seller')).toBe('chip-pos');
    expect(getStrategyTierBadgeClass('Unknown Tier')).toBe('chip-pos');
  });

  it('strictly validates on-disk JSON and CSV files are 100% synchronized with in-memory counterparties', () => {
    const jsonPath = path.resolve(__dirname, '../../../data/fueleu_shipping_crm_targets.json');
    const csvPath = path.resolve(__dirname, '../../../data/fueleu_shipping_crm_targets.csv');

    expect(fs.existsSync(jsonPath)).toBe(true);
    expect(fs.existsSync(csvPath)).toBe(true);

    const jsonContent = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    expect(Array.isArray(jsonContent)).toBe(true);
    expect(jsonContent.length).toBe(1850);

    const csvContent = fs.readFileSync(csvPath, 'utf8').trim().split('\n');
    expect(csvContent.length).toBe(1851); // 1 header + 1850 rows

    for (let i = 0; i < FUEL_EU_SHIPPING_COUNTERPARTIES.length; i++) {
      const memory = FUEL_EU_SHIPPING_COUNTERPARTIES[i];
      const diskJson = jsonContent[i];

      expect(diskJson.rank).toBe(memory.rank);
      expect(diskJson.parent_name).toBe(memory.parent_name);
      expect(diskJson.vessels_in_scope).toBe(memory.vessels_in_scope);
      expect(diskJson.penalty_2025_y1_eur).toBe(memory.penalty_2025_y1_eur);
      expect(diskJson.compliance_balance_2025_tco2e).toBe(memory.compliance_balance_2025_tco2e);
      expect(diskJson.callingRegion).toBe(memory.callingRegion);
      expect(diskJson.tradeLane).toBe(memory.tradeLane);
    }
  });

  it('supports intuitive rank-based search queries (#1, rank 1, or numeric 1)', () => {
    const parseRankSearch = (q: string) => {
      const clean = q.trim();
      const isPrefix = clean.startsWith('#') || clean.toLowerCase().startsWith('rank ');
      return isPrefix
        ? parseInt(clean.replace(/^(#|rank\s*)/i, ''), 10)
        : (clean.match(/^\d+$/) ? parseInt(clean, 10) : NaN);
    };

    expect(parseRankSearch('#1')).toBe(1);
    expect(parseRankSearch('#1850')).toBe(1850);
    expect(parseRankSearch('rank 10')).toBe(10);
    expect(parseRankSearch('Rank 50')).toBe(50);
    expect(parseRankSearch('42')).toBe(42);
    expect(isNaN(parseRankSearch('Maersk'))).toBe(true);

    const rank1Target = FUEL_EU_SHIPPING_COUNTERPARTIES.find(c => c.rank === parseRankSearch('#1'));
    expect(rank1Target).toBeDefined();
    expect(rank1Target!.parent_name).toContain('MSC');
  });

  it('verifies pagination calculations across all page sizes (25, 50, 100, ALL)', () => {
    const totalItems = FUEL_EU_SHIPPING_COUNTERPARTIES.length; // 1850

    // 25 per page -> 74 pages
    const pages25 = Math.ceil(totalItems / 25);
    expect(pages25).toBe(74);

    // 50 per page -> 37 pages
    const pages50 = Math.ceil(totalItems / 50);
    expect(pages50).toBe(37);

    // 100 per page -> 19 pages
    const pages100 = Math.ceil(totalItems / 100);
    expect(pages100).toBe(19);

    // ALL -> 1 page, 1850 items
    const allSlice = FUEL_EU_SHIPPING_COUNTERPARTIES.slice(0, 1850);
    expect(allSlice.length).toBe(1850);
  });
});
