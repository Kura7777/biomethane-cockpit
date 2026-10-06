import { describe, it, expect } from 'vitest';
import { corporateHandoffUrls } from '../handoff';

describe('corporateHandoffUrls', () => {
  it('offers only Source it, with no market, when no registry is picked', () => {
    const { sourceItUrl, tradeBuilderUrl, goMarketId } = corporateHandoffUrls({
      countries: [],
      form: 'GO_PLUS_POS',
      volumeMWh: 5000,
      maxCi: 20,
      client: 'Acme Co',
    });
    expect(goMarketId).toBeNull();
    expect(tradeBuilderUrl).toBeNull();
    expect(sourceItUrl).toBe('/sourcing?mwh=5000&maxCi=20&buyer=Acme+Co');
  });

  it('offers only Source it when more than one registry is picked (no single market)', () => {
    const { tradeBuilderUrl } = corporateHandoffUrls({
      countries: ['DE', 'NL'],
      form: 'GO_ONLY',
      volumeMWh: 1000,
      maxCi: null,
      client: '',
    });
    expect(tradeBuilderUrl).toBeNull();
  });

  it('resolves the destination GO market and BOOK_AND_CLAIM for a GO-only order', () => {
    const { goMarketId, tradeBuilderUrl } = corporateHandoffUrls({
      countries: ['DE'],
      form: 'GO_ONLY',
      volumeMWh: 8000,
      maxCi: 25,
      client: 'Acme Co',
    });
    expect(goMarketId).toBe('DE_GO');
    const params = new URL(tradeBuilderUrl!, 'http://localhost').searchParams;
    expect(params.get('marketId')).toBe('DE_GO');
    expect(params.get('coc')).toBe('BOOK_AND_CLAIM');
    expect(params.get('volume')).toBe('8000');
    expect(params.get('counterparty')).toBe('Acme Co');
    expect(params.get('ci')).toBeNull(); // max CI is a buyer constraint, never the plant CI
  });

  it('uses MASS_BALANCE for GO+PoS and physical orders', () => {
    const goPlusPos = corporateHandoffUrls({ countries: ['NL'], form: 'GO_PLUS_POS', volumeMWh: 1000, maxCi: null, client: '' });
    const physical = corporateHandoffUrls({ countries: ['NL'], form: 'PHYSICAL', volumeMWh: 1000, maxCi: null, client: '' });
    expect(new URL(goPlusPos.tradeBuilderUrl!, 'http://localhost').searchParams.get('coc')).toBe('MASS_BALANCE');
    expect(new URL(physical.tradeBuilderUrl!, 'http://localhost').searchParams.get('coc')).toBe('MASS_BALANCE');
  });

  it('never invents a volume or CI — both are omitted when blank', () => {
    const { sourceItUrl, tradeBuilderUrl } = corporateHandoffUrls({
      countries: ['FR'],
      form: 'GO_ONLY',
      volumeMWh: null,
      maxCi: null,
      client: '',
    });
    expect(sourceItUrl).toBe('/sourcing?market=FR_GO');
    const params = new URL(tradeBuilderUrl!, 'http://localhost').searchParams;
    expect(params.has('volume')).toBe(false);
    expect(params.has('ci')).toBe(false);
  });
});
