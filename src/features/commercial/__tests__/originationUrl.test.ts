import { describe, it, expect } from 'vitest';
import { buildOriginationUrl, parseOriginationUrl } from '../originationUrl';
import { buildInitialRequestFromParams } from '../CommercialFlowStepper';

describe('originationUrl round-trip', () => {
  it('parses back exactly what it built', () => {
    const url = buildOriginationUrl({ market: 'DE_THG', mwh: 12500, maxCi: 30, buyer: 'Acme Gas GmbH', feedstock: 'manure' });
    const search = new URL(url, 'http://localhost').searchParams;
    const parsed = parseOriginationUrl(search);
    expect(parsed).toEqual({ market: 'DE_THG', mwh: 12500, maxCi: 30, buyer: 'Acme Gas GmbH', feedstock: 'manure' });
  });

  it('omits absent fields rather than serialising them', () => {
    const url = buildOriginationUrl({ market: 'DE_THG' });
    expect(url).toBe('/sourcing?market=DE_THG');
  });

  it('drops a non-numeric mwh or maxCi instead of returning NaN', () => {
    const search = new URLSearchParams('mwh=abc&maxCi=xyz&market=DE_THG');
    expect(parseOriginationUrl(search)).toEqual({ market: 'DE_THG' });
  });
});

describe('buildInitialRequestFromParams', () => {
  it('falls back to INITIAL_REQUEST defaults for every missing field', () => {
    const request = buildInitialRequestFromParams({});
    expect(request.targetMarketId).toBe('DE_THG');
    expect(request.feedstockKey).toBe('manure');
    expect(request.volumeMwh).toBe(10000);
    expect(request.counterparty).toBeNull();
  });

  it('applies known hand-off values', () => {
    const request = buildInitialRequestFromParams({ market: 'NL_ERE', mwh: 5000, maxCi: 20, buyer: 'Acme Gas GmbH', feedstock: 'food_waste' });
    expect(request.targetMarketId).toBe('NL_ERE');
    expect(request.feedstockKey).toBe('food_waste');
    expect(request.volumeMwh).toBe(5000);
    expect(request.constraints.maxCarbonIntensity).toBe(20);
    expect(request.counterparty).toBe('Acme Gas GmbH');
  });

  it('ignores a market or feedstock the registries do not recognise', () => {
    const request = buildInitialRequestFromParams({ market: 'NOT_A_MARKET', feedstock: 'not_a_feedstock' });
    expect(request.targetMarketId).toBe('DE_THG');
    expect(request.feedstockKey).toBe('manure');
  });
});
