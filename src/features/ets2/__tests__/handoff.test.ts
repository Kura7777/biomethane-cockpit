import { describe, it, expect } from 'vitest';
import { buildEts1SiteTradeBuilderUrl, buildEts2CorporateOrderUrl } from '../handoff';
import type { Ets1Site } from '../../../domain/ets1/sites';

function site(overrides: Partial<Ets1Site>): Ets1Site {
  return {
    id: 'site1',
    name: 'Test Site',
    operator: 'Test Operator',
    parentCompany: null,
    country: 'DE',
    city: 'Berlin',
    activityId: null,
    nace: '',
    sector: 'FOOD_BEVERAGE',
    sectorBasis: 'SITE_CODE',
    fit: 'HIGH',
    verifiedLatestTco2: 10000,
    verifiedPreviousTco2: null,
    freeAllocLatestTco2: null,
    verifiedLatestIsPriorYear: false,
    ...overrides,
  } as Ets1Site;
}

describe('buildEts1SiteTradeBuilderUrl', () => {
  it('uses the EU_ETS1 market and mass balance for a fit site', () => {
    const url = buildEts1SiteTradeBuilderUrl(site({}));
    const params = new URL(url, 'http://localhost').searchParams;
    expect(params.get('marketId')).toBe('EU_ETS1');
    expect(params.get('coc')).toBe('MASS_BALANCE');
    expect(params.get('originCountry')).toBe('DE');
  });

  it('derives a volume from the site\'s own gas use for a fit site', () => {
    const url = buildEts1SiteTradeBuilderUrl(site({ fit: 'HIGH', verifiedLatestTco2: 10000 }));
    const params = new URL(url, 'http://localhost').searchParams;
    expect(params.has('volume')).toBe(true);
    expect(Number(params.get('volume'))).toBeGreaterThan(0);
  });

  it('never invents a volume for a LOW-fit site', () => {
    const url = buildEts1SiteTradeBuilderUrl(site({ fit: 'LOW', verifiedLatestTco2: 10000 }));
    const params = new URL(url, 'http://localhost').searchParams;
    expect(params.has('volume')).toBe(false);
  });

  it('never invents a volume for a fit site with zero verified emissions', () => {
    const url = buildEts1SiteTradeBuilderUrl(site({ fit: 'HIGH', verifiedLatestTco2: 0 }));
    const params = new URL(url, 'http://localhost').searchParams;
    expect(params.has('volume')).toBe(false);
  });

  it('marks a derived volume as estimated', () => {
    const url = buildEts1SiteTradeBuilderUrl(site({ fit: 'HIGH', verifiedLatestTco2: 10000 }));
    const params = new URL(url, 'http://localhost').searchParams;
    expect(params.get('volumeIsEstimated')).toBe('true');
  });

  it('carries no volumeIsEstimated flag when there is no derived volume', () => {
    const url = buildEts1SiteTradeBuilderUrl(site({ fit: 'LOW', verifiedLatestTco2: 10000 }));
    const params = new URL(url, 'http://localhost').searchParams;
    expect(params.has('volumeIsEstimated')).toBe(false);
  });
});

describe('buildEts2CorporateOrderUrl', () => {
  it('carries the client name with no mwh when the volume is unknown', () => {
    expect(buildEts2CorporateOrderUrl('Acme Gas Ltd', null)).toBe('/corporate?client=Acme+Gas+Ltd');
  });

  it('converts a known TWh volume to MWh', () => {
    const url = buildEts2CorporateOrderUrl('Acme Gas Ltd', 1.5);
    const params = new URL(url, 'http://localhost').searchParams;
    expect(params.get('mwh')).toBe('1500000');
  });
});
