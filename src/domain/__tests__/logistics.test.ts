import { describe, it, expect } from 'vitest';
import { calculateLogisticsRoute, findShortestPipelinePath, resolveInterconnectionPoints } from '../logistics/engine';

describe('Cross-Border Gas Logistics & Corridor Wheel Calculator', () => {
  it('computes shortest pipeline path from Sweden to Spain via DK, DE, FR, ES', () => {
    const path = findShortestPipelinePath('SE', 'ES');
    expect(path).toEqual(['SE', 'DK', 'DE', 'FR', 'ES']);

    const ips = resolveInterconnectionPoints(path);
    expect(ips.length).toBe(4);
    expect(ips[0].name).toContain('Dragør');
    expect(ips[1].name).toContain('Ellund');
    expect(ips[2].name).toContain('France-Germany');
    expect(ips[3].name).toContain('Pirineos');
  });

  it('calculates 3 delivery modes for Sweden to Spain trade with Virtual Swap recommended', () => {
    const assessment = calculateLogisticsRoute('SE', 'ES', 28.50);

    expect(assessment.originCountry).toBe('SE');
    expect(assessment.targetCountry).toBe('ES');
    expect(assessment.distanceKm).toBeGreaterThan(2000);
    expect(assessment.recommendedMode).toBe('VIRTUAL_SWAP');

    // Virtual Swap is most cost-effective (~€2.30–€3.50/MWh)
    const virtualMode = assessment.modes.virtualSwap;
    expect(virtualMode.isRecommended).toBe(true);
    expect(virtualMode.totalCostEurMwh).toBeGreaterThan(1.50);
    expect(virtualMode.totalCostEurMwh).toBeLessThan(5.00);

    // Bio-LNG Virtual Pipeline includes liquefaction and cryogenic road freight
    const bioLngMode = assessment.modes.bioLng;
    expect(bioLngMode.totalCostEurMwh).toBeGreaterThan(15.00);

    // Execution steps provided for trader
    expect(assessment.executionSteps.length).toBe(4);
    expect(assessment.executionSteps[0].title).toContain('EFET');
    expect(assessment.executionSteps[2].title).toContain('UDB');
  });

  it('calculates neighboring Denmark to Germany physical transit corridor', () => {
    const assessment = calculateLogisticsRoute('DK', 'DE', 28.50);
    expect(assessment.physicalRoute.transitingCountries).toEqual(['DK', 'DE']);
    expect(assessment.physicalRoute.interconnectionPoints.length).toBe(1);
    expect(assessment.physicalRoute.interconnectionPoints[0].name).toContain('Ellund');
  });

  describe('SECTION 2 — Unverified Borders & Null Tariff Propagation', () => {

    it('unmatched border IP sets tariffs to null with capacityPlatform UNVERIFIED and Unknown TSO', () => {
      const ips = resolveInterconnectionPoints(['IE', 'DE']); // IE-DE direct is not a verified IP
      expect(ips.length).toBe(1);
      expect(ips[0].entryTariffEurMwh).toBeNull();
      expect(ips[0].exitTariffEurMwh).toBeNull();
      expect(ips[0].totalTariffEurMwh).toBeNull();
      expect(ips[0].capacityPlatform).toBe('UNVERIFIED');
      expect(ips[0].fromTso).toBe('Unknown TSO');
      expect(ips[0].toTso).toBe('Unknown TSO');
    });

    it('route containing unverified border sets totalPhysicalTariffEurMwh to null and populates unverifiedLegs', () => {
      const assessment = calculateLogisticsRoute('IE', 'DE', 28.50);
      expect(assessment.physicalRoute.totalPhysicalTariffEurMwh).toBeNull();
      expect(assessment.modes.physicalPipeline.totalCostEurMwh).toBeNull();
      expect(assessment.modes.physicalPipeline.summary).toContain('Tariff incomplete');
      expect(assessment.modes.physicalPipeline.isRecommended).toBe(false);
    });

    it('unverified routes are excluded from recommendedMode (never recommended on cost)', () => {
      const assessment = calculateLogisticsRoute('IE', 'ES', 28.50);
      expect(assessment.recommendedMode).not.toBe('PHYSICAL_PIPELINE');
      expect(assessment.modes.physicalPipeline.isRecommended).toBe(false);
    });

  });

  describe('SECTION 3 — Topology Corrections, Overrides & Null Shrinkage', () => {

    it('FR to IT routes physically via CH or AT/DE, not direct non-existent commercial IP', () => {
      const path = findShortestPipelinePath('FR', 'IT');
      expect(path).toEqual(['FR', 'CH', 'IT']);
    });

    it('IE routes through GB via Moffat interconnector', () => {
      const path = findShortestPipelinePath('IE', 'NL');
      expect(path[0]).toBe('IE');
      expect(path[1]).toBe('GB');
    });

    it('applies user tariff overrides dynamically to resolve verified corridor tariffs', () => {
      const assessment = calculateLogisticsRoute('DK', 'DE', 28.50, {
        IP_ELLUND: { entryTariffEurMwh: 0.45, exitTariffEurMwh: 0.50, totalTariffEurMwh: 0.95 },
      });
      expect(assessment.physicalRoute.totalPhysicalTariffEurMwh).toBe(0.95);
      expect(assessment.physicalRoute.unverifiedLegs).toEqual([]);
      expect(assessment.modes.physicalPipeline.totalCostEurMwh).not.toBeNull();
    });

    it('null baseGasPriceEurMwh or unmapped distance propagates null shrinkage', () => {
      const assessmentNoGasPrice = calculateLogisticsRoute('DK', 'DE', null);
      expect(assessmentNoGasPrice.physicalRoute.shrinkageEurMwh).toBeNull();

      const assessmentUnmapped = calculateLogisticsRoute('UNKNOWN' as any, 'DE', 28.50);
      expect(assessmentUnmapped.distanceKm).toBeNull();
      expect(assessmentUnmapped.physicalRoute.shrinkageEurMwh).toBeNull();
      expect(assessmentUnmapped.modes.bioLng.totalCostEurMwh).toBeNull();
    });

  });

  describe('SECTION 4 — ENTSOG CAM NC Capacity Durations & TSO Tariff Booking Engine', () => {

    it('calculates standard yearly base capacity tariff (1.00x multiplier) for DK -> DE', () => {
      const assessment = calculateLogisticsRoute('DK', 'DE', 30.00, undefined, 'YEARLY');
      expect(assessment.capacityDuration).toBe('YEARLY');
      expect(assessment.durationMultiplier).toBe(1.00);
      expect(assessment.physicalRoute.totalPhysicalTariffEurMwh).toBe(0.55); // Ellund base total = 0.55
      expect(assessment.tsoBreakdown.length).toBe(1);

      const leg = assessment.tsoBreakdown[0];
      expect(leg.vipName).toContain('Ellund');
      expect(leg.fromTso).toBe('Energinet');
      expect(leg.toTso).toContain('Gasunie Deutschland');
      expect(leg.platform).toBe('PRISMA');
      expect(leg.entryTariffEurMwh).toBe(0.25);
      expect(leg.exitTariffEurMwh).toBe(0.30);
      expect(leg.baseTotalTariffEurMwh).toBe(0.55);
      expect(leg.bookedTariffEurMwh).toBe(0.55);
    });

    it('applies CAM NC 1.25x multiplier for monthly capacity bookings', () => {
      const yearly = calculateLogisticsRoute('DK', 'DE', 30.00, undefined, 'YEARLY');
      const monthly = calculateLogisticsRoute('DK', 'DE', 30.00, undefined, 'MONTHLY');

      expect(monthly.capacityDuration).toBe('MONTHLY');
      expect(monthly.durationMultiplier).toBe(1.25);
      // 0.55 * 1.25 = 0.6875 -> 0.69
      expect(monthly.physicalRoute.totalPhysicalTariffEurMwh).toBe(0.69);
      expect(monthly.tsoBreakdown[0].bookedTariffEurMwh).toBe(0.688);
      expect(monthly.modes.physicalPipeline.totalCostEurMwh!).toBeGreaterThan(yearly.modes.physicalPipeline.totalCostEurMwh!);
    });

    it('applies CAM NC 1.50x multiplier for Day-Ahead spot capacity bookings', () => {
      const spot = calculateLogisticsRoute('DK', 'DE', 30.00, undefined, 'DAILY');
      expect(spot.capacityDuration).toBe('DAILY');
      expect(spot.durationMultiplier).toBe(1.50);
      // 0.55 * 1.50 = 0.825 -> 0.83 (rounded to 2 decimal places)
      expect(spot.physicalRoute.totalPhysicalTariffEurMwh).toBe(0.83);
    });

    it('applies CAM NC 1.75x multiplier for Within-Day capacity balancing bookings', () => {
      const withinDay = calculateLogisticsRoute('DK', 'DE', 30.00, undefined, 'WITHIN_DAY');
      expect(withinDay.capacityDuration).toBe('WITHIN_DAY');
      expect(withinDay.durationMultiplier).toBe(1.75);
      // 0.55 * 1.75 = 0.9625 -> 0.96
      expect(withinDay.physicalRoute.totalPhysicalTariffEurMwh).toBe(0.96);
    });

    it('identifies statutory German § 33 GasNZV avoided grid cost credit for DE origin', () => {
      const assessmentDE = calculateLogisticsRoute('DE', 'NL', 30.00);
      expect(assessmentDE.dsoInjectionCreditEurMwh).toBe(0.70);
      const deCreditItem = assessmentDE.modes.physicalPipeline.lineItems.find(item => item.label.includes('§ 33 GasNZV'));
      expect(deCreditItem).toBeDefined();
      expect(deCreditItem?.costEurMwh).toBe(-0.70);
      expect(deCreditItem?.isOptional).toBe(true);
    });

    it('identifies statutory French Code de l’énergie Art. L. 453-9 injection credit for FR origin', () => {
      const assessmentFR = calculateLogisticsRoute('FR', 'DE', 30.00);
      expect(assessmentFR.dsoInjectionCreditEurMwh).toBe(0.40);
      const frCreditItem = assessmentFR.modes.physicalPipeline.lineItems.find(item => item.label.includes('L. 453-9'));
      expect(frCreditItem).toBeDefined();
      expect(frCreditItem?.costEurMwh).toBe(-0.40);
    });

  });
});

