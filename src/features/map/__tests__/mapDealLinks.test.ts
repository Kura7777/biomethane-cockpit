import { describe, it, expect } from 'vitest';
import { getPlaybookDealUrl } from '../tradePlaybook';
import { getCertificateRoute } from '../../../domain/registries/certificateRoutes';
import { parseDealParams } from '../../../domain/trade/dealParams';
import { defaultVolumeMwh, defaultCi } from '../../../domain/trade/dealDefaults';

describe('Map -> Trade Builder Deal Links', () => {
  const defaultVol = defaultVolumeMwh();

  it('DK -> DE (PoS / ALL): parses back to DE_THG, MASS_BALANCE, default volume and calibrated CI', () => {
    const route = getCertificateRoute('DK', 'DE');
    const url = getPlaybookDealUrl('DK', 'DE', route, 'ALL');
    expect(url).not.toBeNull();

    const searchParams = new URLSearchParams(url!.split('?')[1]);
    const deal = parseDealParams(searchParams);

    expect(deal.originCountry).toBe('DK');
    expect(deal.marketId).toBe('DE_THG');
    expect(deal.coc).toBe('MASS_BALANCE');
    expect(deal.volume).toBe(defaultVol);
    expect(deal.ci).toBe(defaultCi('DK', 'manure').ci);
    expect(deal.ciIsEstimated).toBe(true);
    expect(deal.feedstock).toBe('manure');
  });

  it('DK -> DE (GO): parses back to DE_GO, BOOK_AND_CLAIM, default volume and calibrated CI', () => {
    const route = getCertificateRoute('DK', 'DE');
    const url = getPlaybookDealUrl('DK', 'DE', route, 'GO');
    expect(url).not.toBeNull();

    const searchParams = new URLSearchParams(url!.split('?')[1]);
    const deal = parseDealParams(searchParams);

    expect(deal.originCountry).toBe('DK');
    expect(deal.marketId).toBe('DE_GO');
    expect(deal.coc).toBe('BOOK_AND_CLAIM');
    expect(deal.volume).toBe(defaultVol);
    expect(deal.ciIsEstimated).toBe(true);
  });

  it('DK -> SE (PoS): parses back to SE_TAX, MASS_BALANCE, default volume', () => {
    const route = getCertificateRoute('DK', 'SE');
    const url = getPlaybookDealUrl('DK', 'SE', route, 'POS');
    expect(url).not.toBeNull();

    const searchParams = new URLSearchParams(url!.split('?')[1]);
    const deal = parseDealParams(searchParams);

    expect(deal.originCountry).toBe('DK');
    expect(deal.marketId).toBe('SE_TAX');
    expect(deal.coc).toBe('MASS_BALANCE');
    expect(deal.volume).toBe(defaultVol);
  });

  it('GB -> DE (ALL): certificate route parses back to DE_GO, BOOK_AND_CLAIM', () => {
    const route = getCertificateRoute('GB', 'DE');
    const url = getPlaybookDealUrl('GB', 'DE', route, 'ALL');
    expect(url).not.toBeNull();

    const searchParams = new URLSearchParams(url!.split('?')[1]);
    const deal = parseDealParams(searchParams);

    expect(deal.originCountry).toBe('GB');
    expect(deal.marketId).toBe('DE_GO');
    expect(deal.coc).toBe('BOOK_AND_CLAIM');
    expect(deal.volume).toBe(defaultVol);
  });

  it('Closed / unmapped route returns null', () => {
    const route = getCertificateRoute('DK', 'IT');
    const url = getPlaybookDealUrl('DK', 'IT', route, 'POS');
    expect(url).toBeNull();
  });
});
