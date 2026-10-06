import { describe, it, expect } from 'vitest';
import { FUELEU_BIO_LNG_DEFAULT_ORIGIN } from '../../../domain/trade/dealDefaults';
import { buildOriginationUrl } from '../../commercial/originationUrl';

describe('FUELEU_BIO_LNG_DEFAULT_ORIGIN', () => {
  it('holds the desk bio-LNG corridor the FuelEU flows used to hardcode', () => {
    expect(FUELEU_BIO_LNG_DEFAULT_ORIGIN).toEqual({ originCountry: 'NL', feedstock: 'manure', ci: -100 });
  });
});

describe('FuelEU "Find a plant" hand-off', () => {
  it('sends the FUELEU market and a sized volume into Origination', () => {
    const url = buildOriginationUrl({ market: 'FUELEU', mwh: 25000, buyer: 'Maersk Offtake' });
    const params = new URL(url, 'http://localhost').searchParams;
    expect(params.get('market')).toBe('FUELEU');
    expect(params.get('mwh')).toBe('25000');
    expect(params.get('buyer')).toBe('Maersk Offtake');
  });

  it('omits the buyer when no counterparty is known (the generic simulator)', () => {
    const url = buildOriginationUrl({ market: 'FUELEU', mwh: 12000 });
    expect(url).toBe('/sourcing?market=FUELEU&mwh=12000');
  });
});
