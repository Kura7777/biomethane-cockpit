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

  it('calculates 3 delivery modes for Sweden to Spain trade', () => {
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

    // Physical Pipeline wheeling has cumulative tariffs across 4 borders
    const physicalMode = assessment.modes.physicalPipeline;
    expect(physicalMode.totalCostEurMwh).toBeGreaterThan(virtualMode.totalCostEurMwh);
    expect(physicalMode.lineItems.length).toBeGreaterThanOrEqual(4);

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
});
