import { describe, it, expect } from 'vitest';
import { applyCiOverride } from '../CommercialFlowStepper';
import { buildOpportunityDealUrl } from '../dealUrl';
import type { SourcedOpportunity } from '../PlantScannerTable';

function opp(overrides: Partial<SourcedOpportunity>): SourcedOpportunity {
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
    ...overrides,
  } as unknown as SourcedOpportunity;
}

describe('applyCiOverride', () => {
  it('leaves opportunities unchanged when there is no override', () => {
    const opps = [opp({ carbonIntensity: -100 })];
    expect(applyCiOverride(opps, null)).toBe(opps);
    expect(applyCiOverride(opps, undefined)).toBe(opps);
  });

  it('replaces every opportunity\'s CI and flags it as the desk\'s assumption', () => {
    const opps = [opp({ carbonIntensity: -100 }), opp({ carbonIntensity: 5 })];
    const result = applyCiOverride(opps, 42);
    expect(result.map(o => o.carbonIntensity)).toEqual([42, 42]);
    expect(result.every(o => o.ciIsOverridden)).toBe(true);
  });

  it('reaches the Trade Builder deal URL with ciIsEstimated set', () => {
    const [overridden] = applyCiOverride([opp({ carbonIntensity: -100 })], 42);
    const url = buildOpportunityDealUrl(overridden, 'DE_THG', 10000);
    const params = new URL(url, 'http://localhost').searchParams;
    expect(params.get('ci')).toBe('42');
    expect(params.get('ciIsEstimated')).toBe('true');
  });
});
