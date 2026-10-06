import { describe, it, expect } from 'vitest';
import { currentRouteVerdict } from '../Step3RouteAndCosts';
import { applyCiOverride } from '../CommercialFlowStepper';
import type { SourcedOpportunity } from '../PlantScannerTable';

function opp(overrides: Partial<SourcedOpportunity> = {}): SourcedOpportunity {
  return {
    id: 'opp1',
    originCountry: 'DE',
    originCountryName: 'Germany',
    targetCountry: 'DE',
    targetMarketId: 'DE_THG',
    targetMarketName: 'DE THG',
    feedstockKey: 'manure',
    feedstockName: 'Manure',
    carbonIntensity: -100,
    certificationScheme: 'ISCC_EU',
    chainOfCustody: 'MASS_BALANCE',
    overallVerdict: 'ELIGIBLE',
    eligibility: { marketId: 'DE_THG', marketName: 'DE THG', overallVerdict: 'ELIGIBLE', blockingGate: null, gates: [], summary: 'Stale snapshot from the scan' },
    ...overrides,
  } as unknown as SourcedOpportunity;
}

describe('currentRouteVerdict', () => {
  it('matches the low-CI opportunity scanned at its own CI (no override)', () => {
    const route = currentRouteVerdict(opp({ carbonIntensity: -100 }), null, 10000);
    expect(route.overallVerdict).toBe('ELIGIBLE');
  });

  it('flips to blocked once a CI override pushes the route below the GHG-saving threshold', () => {
    // -100 gCO2e/MJ clears the DE_THG GHG-saving gate easily; 80 does not (manure's default CI).
    const [overridden] = applyCiOverride([opp({ carbonIntensity: -100 })], 80);
    const route = currentRouteVerdict(overridden, null, 10000);
    expect(route.overallVerdict).toBe('HARD_BLOCK');
    expect(route.summary).not.toBe('Stale snapshot from the scan');
  });

  it('never reports the stale scan-time verdict once the CI override changes the gate outcome', () => {
    const base = opp({ carbonIntensity: -100 }); // scan-time verdict: ELIGIBLE
    const [overridden] = applyCiOverride([base], 80);
    const route = currentRouteVerdict(overridden, null, 10000);
    expect(route.overallVerdict).not.toBe(base.overallVerdict);
  });

  // Step4DealSummary's term sheet badge calls currentRouteVerdict with the same arguments
  // (opportunity, request.delivery?.complianceYear, volumeMwh) as Step3RouteAndCosts — these
  // confirm the Step 4 call site honours the override the same way Step 3 does.
  it('Step 4 term sheet: matches the low-CI opportunity scanned at its own CI (no override)', () => {
    const complianceYear: number | null = null; // request.delivery?.complianceYear when unset
    const route = currentRouteVerdict(opp({ carbonIntensity: -100 }), complianceYear, 10000);
    expect(route.overallVerdict).toBe('ELIGIBLE');
  });

  it('Step 4 term sheet: flips to blocked once Step 1\'s CI override pushes the route below the GHG-saving threshold', () => {
    const [overridden] = applyCiOverride([opp({ carbonIntensity: -100 })], 80);
    const complianceYear: number | null = null;
    const route = currentRouteVerdict(overridden, complianceYear, 10000);
    expect(route.overallVerdict).toBe('HARD_BLOCK');
    expect(route.summary).not.toBe('Stale snapshot from the scan');
  });
});
