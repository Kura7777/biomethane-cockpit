import { describe, it, expect } from 'vitest';
import { parseBrokerRunText, parseFreeformQuotes } from '../markets/brokerRunParser';
import { commitBrokerRunToState } from '../marks/commitBrokerRun';
import { canonicalTenorLabel, findTenorInText } from '../marks/tenorLabel';
import type { AppAction } from '../../store/state';

const FX = 1.25;

function one(text: string, fx?: number) {
  const res = parseBrokerRunText(text, 'Broker', '2026-10-01', fx);
  expect(res.quotes.length, `quote for: ${text}`).toBe(1);
  expect(res.marks.length, `mark for: ${text}`).toBe(1);
  return { q: res.quotes[0], m: res.marks[0], res };
}

describe('audit: free-form broker parser - prices are never years, tenors, CI or volumes', () => {
  const cases: Array<[string, string, number | null, number | null]> = [
    ['bid then offer with a year', 'DE THG 2026 bid 215 offer 225 €/tCO2e', 215, 225],
    ['offer then bid with a year', 'DE THG 2026 offer 225 bid 215 €/tCO2e', 215, 225],
    ['single offer with a year', 'FR CPB 2026 offer 78', null, 78],
    ['single bid with a year', 'FR CPB 2026 bid 76', 76, null],
    ['slash no spaces', 'DE THG 2026 215/225', 215, 225],
    ['slash with spaces', 'DE THG 2026 215 / 225', 215, 225],
    ['dash', 'DE THG 2026 215-225', 215, 225],
    ['bid / offer words with slash', 'DE THG 2026 bid 215 / offer 225', 215, 225],
    ['at', 'DE THG 2026 215 @ 225', 215, 225],
    ['colon form', 'DE THG manure 2026: 215 / 225', 215, 225],
    ['price before keyword', 'DE THG 2026 215 bid 225 offer', 215, 225],
  ];
  it.each(cases)('%s', (_label, text, bid, offer) => {
    const { q, m } = one(text);
    expect(q.bidMarketUnit).toBe(bid);
    expect(q.offerMarketUnit).toBe(offer);
    expect(m.bid).toBe(bid);
    expect(m.ask).toBe(offer);
    expect(q.isValid).toBe(true);
    expect(m.isValid).toBe(true);
  });

  it('good lines are valid and mid is (bid+offer)/2, or the single side flagged one-sided', () => {
    const both = one('DE THG 2026 bid 215 offer 225 €/tCO2e').m;
    expect(both.midPrice).toBe(220);
    expect(both.validationErrors).toEqual([]);
    const single = one('FR CPB 2026 offer 78 €/MWh').m;
    expect(single.midPrice).toBe(78);
    expect(single.bid).toBeNull();
    expect(single.validationWarnings.join(' ')).toMatch(/one-sided/);
  });

  it('a crossed market keeps both sides and warns (no silent swap)', () => {
    const { q, m } = one('DE THG 2026 bid 230 offer 220 €/tCO2e');
    expect(q.bidMarketUnit).toBe(230);
    expect(q.offerMarketUnit).toBe(220);
    expect(m.isValid).toBe(true);
    expect(m.validationWarnings.join(' ')).toMatch(/crossed market/);
  });
});

describe('audit: units are mapped into the market unit, or rejected', () => {
  const ok: Array<[string, string, string, number | null, number | null, number | undefined]> = [
    // text, marketId, market unit, bid, offer, fx
    ['DE THG 2026 215/225 €/t', 'DE_THG', 'EUR_PER_TCO2E', 215, 225, undefined],
    ['DE THG 2026 215/225 €/tCO2e', 'DE_THG', 'EUR_PER_TCO2E', 215, 225, undefined],
    ['DE THG 2026 215/225 EUR/t', 'DE_THG', 'EUR_PER_TCO2E', 215, 225, undefined],
    ['FR CPB 2026 76/80 €/MWh', 'FR_CPB', 'EUR_PER_MWH', 76, 80, undefined],
    ['FR CPB 2026 76/80 EUR/MWh', 'FR_CPB', 'EUR_PER_MWH', 76, 80, undefined],
    ['FR CPB 2026 20/21 €/GJ', 'FR_CPB', 'EUR_PER_MWH', 72, 75.6, undefined],
    ['NL ERE 2026 0.365/0.375 €/kg', 'NL_ERE', 'EUR_PER_KG_CO2E', 0.365, 0.375, undefined],
    ['NL ERE 2026 36.5/37.5 ct/kg', 'NL_ERE', 'EUR_PER_KG_CO2E', 0.365, 0.375, undefined],
    ['UK RTFO 21.5/22.5 p/RTFC', 'UK_RTFO', 'GBP_PER_RTFC', 0.215, 0.225, undefined],
    ['UK RTFO 21.5/22.5 p/cert', 'UK_RTFO', 'GBP_PER_RTFC', 0.215, 0.225, undefined],
    ['UK RTFO 0.215/0.225 £/RTFC', 'UK_RTFO', 'GBP_PER_RTFC', 0.215, 0.225, undefined],
    ['UK RTFO 0.215/0.225 GBP/RTFC', 'UK_RTFO', 'GBP_PER_RTFC', 0.215, 0.225, undefined],
    ['UK RTFO 0.25/0.26 €/RTFC', 'UK_RTFO', 'GBP_PER_RTFC', 0.2, 0.208, FX],
    ['IT CIC 2026 330/340 €/cert', 'IT_CIC', 'EUR_PER_CIC', 330, 340, undefined],
    ['DK GO 2026 1.2/1.5 €/cert', 'DK_GO', 'EUR_PER_MWH', 1.2, 1.5, undefined],
    ['UK RGGO 2026 22/24 £/MWh', 'UK_RGGO', 'EUR_PER_MWH', 27.5, 30, FX],
  ];
  it.each(ok)('%s', (text, marketId, unit, bid, offer, fx) => {
    const { q, m } = one(text, fx);
    expect(q.marketId).toBe(marketId);
    expect(q.marketUnit).toBe(unit);
    expect(q.bidMarketUnit).toBe(bid);
    expect(q.offerMarketUnit).toBe(offer);
    expect(m.unit).toBe(unit);
    expect(m.bid).toBe(bid);
    expect(m.ask).toBe(offer);
    expect(m.isValid, m.validationErrors.join(';')).toBe(true);
  });

  const bad: Array<[string, string, string]> = [
    ['DE THG 2026 215/225 €/MWh', 'DE_THG', 'unit €/MWh not convertible for market DE_THG'],
    ['DE THG 2026 215/225 €/GJ', 'DE_THG', 'unit €/GJ not convertible for market DE_THG'],
    ['NL ERE 2026 14.5/15.5 €/GJ', 'NL_ERE', 'unit €/GJ not convertible for market NL_ERE'],
    ['FR CPB 2026 76/80 €/t', 'FR_CPB', 'unit €/t not convertible for market FR_CPB'],
    ['UK RTFO 0.215/0.225 €/MWh', 'UK_RTFO', 'unit €/MWh not convertible for market UK_RTFO'],
  ];
  it.each(bad)('rejects, never guesses: %s', (text, marketId, message) => {
    const { q, m } = one(text, FX);
    expect(q.marketId).toBe(marketId);
    expect(q.isValid).toBe(false);
    expect(q.validationErrors).toContain(message);
    expect(m.isValid).toBe(false);
    expect(m.bid).toBeNull();
    expect(m.ask).toBeNull();
    expect(q.bidMarketUnit).toBeNull();
  });

  it('a GBP price on a EUR market without a supplied FX is rejected, with FX it is converted', () => {
    const noFx = one('UK RGGO 2026 £22.00 Offer').q;
    expect(noFx.isValid).toBe(false);
    expect(noFx.numericOfferEurMwh).toBeNull();
    expect(noFx.offerPrice).toBe('£22.00');
    const withFx = one('UK RGGO 2026 £22.00 Offer', 1.175).q;
    expect(withFx.numericOfferEurMwh).toBe(25.85);
  });

  it('numericBid/OfferEurMwh is only ever a genuine EUR/MWh price', () => {
    expect(one('DE THG 2026 215/225 €/tCO2e').q.numericBidEurMwh).toBeNull();
    expect(one('NL ERE 2026 0.365/0.375 €/kg').q.numericBidEurMwh).toBeNull();
    expect(one('UK RTFO 21.5/22.5 p/RTFC').q.numericBidEurMwh).toBeNull();
    expect(one('IT CIC 2026 330/340 €/cert').q.numericBidEurMwh).toBeNull();
    const mwh = one('FR CPB 2026 76/80 €/MWh').q;
    expect(mwh.numericBidEurMwh).toBe(76);
    expect(mwh.numericOfferEurMwh).toBe(80);
  });
});

describe('audit: market routing', () => {
  it('RTFO / RTFC map to UK_RTFO, never RGGO; RGGO only for RGGO', () => {
    expect(one('UK RTFO 21.5/22.5 p/RTFC').q.marketId).toBe('UK_RTFO');
    expect(one('UK RTFO 21.5/22.5 p/RTFC').q.class).toBe('RTFO');
    expect(one('GB RTFC 0.215/0.225 £/RTFC').q.marketId).toBe('UK_RTFO');
    expect(one('UK RGGO 2026 22/24 £/MWh', FX).q.marketId).toBe('UK_RGGO');
  });

  it.each([
    'DE THG bundle manure Cal27 85/90 €/MWh',
    'DE_THG_BUNDLE 85/90 €/MWh',
    'THG Bundled 85/90 €/MWh',
  ])('bundle alias goes to the delivered bundle, not the unbundled quota: %s', text => {
    const { q } = one(text);
    expect(q.marketId).toBe('DE_THG_BUNDLE');
    expect(q.marketUnit).toBe('EUR_PER_MWH');
    expect(q.numericBidEurMwh).toBe(85);
  });

  it('country is never silently defaulted to DE', () => {
    const { q, m } = one('20/21 €/MWh');
    expect(q.isValid).toBe(false);
    expect(q.validationErrors).toContain('country not identified');
    expect(m.isValid).toBe(false);
    expect(q.country).not.toBe('DE');
  });

  it('a market that implies its country (RTFO -> UK) does not need the country spelled out', () => {
    const { q } = one('RTFO 21.5/22.5 p/RTFC');
    expect(q.country).toBe('UK');
    expect(q.isValid).toBe(true);
  });
});

describe('audit: CI and volume tokens', () => {
  it.each([
    ['DE THG manure 2026 -100 gCO2e/MJ 215/225 €/tCO2e', '-100gCO2/MJ'],
    ['DE THG manure 2026 CI -20 215/225 €/tCO2e', '-20gCO2/MJ'],
    ['DE THG manure 2026 35g 215/225 €/tCO2e', '35gCO2/MJ'],
    ['DE THG manure 2026 <-100 CI: €215 Bid / €225 Offer', '<-100gCO2/MJ'],
  ])('reads an explicit CI token: %s', (text, ci) => {
    const { q, m } = one(text);
    expect(q.ciScore).toBe(ci);
    expect(m.ciScore).toBe(ci);
    expect(q.bidMarketUnit).toBe(215);
    expect(q.offerMarketUnit).toBe(225);
  });

  it('a volume is never a CI score', () => {
    const { q } = one('DE THG 2026 215/225 €/tCO2e 50 GWh');
    expect(q.ciScore).toBe('—');
    expect(q.volumeMwh).toBe(50000);
  });

  it.each([
    ['FR CPB 2026 76/80 €/MWh 50 GWh', 50000, '50GWH'],
    ['FR CPB 2026 76/80 €/MWh vol 20000 MWh', 20000, '20000MWH'],
    ['NL ERE 2026 0.365/0.375 €/kg 100 TJ', 27777.78, '100TJ'],
    ['DK GO 2026 1.2/1.5 €/MWh 500,000 certs', 500000, '500000 certs'],
    ['UK RTFO 21.5/22.5 p/RTFC 500000 certs', null, '500000 certs'],
    ['UK RTFO 21.5/22.5 p/RTFC 3 kt', null, '3 kt'],
  ])('normalises volume to MWh where possible and keeps the text: %s', (text, mwh, label) => {
    const { q, m } = one(text, FX);
    expect(q.volumeMwh).toBe(mwh);
    expect(q.volumeText).toBe(label);
    expect(m.volumeMwh).toBe(mwh);
    // volumes never leak into prices
    expect(q.bidMarketUnit).not.toBeNull();
  });
});

describe('audit: broker prefixes and vintages', () => {
  it.each([
    ['STX: DE THG 2026 215/225 €/tCO2e', 'STX Commodities'],
    ['Marex quoting DE THG 2026 215/225 €/tCO2e', 'Marex Spectron'],
    ['ACT Run: DE THG 2026 215/225 €/tCO2e', 'ACT Commodities'],
    ['Evolution: DE THG 2026 215/225 €/tCO2e', 'Evolution Markets'],
  ])('tolerates and detects the prefix: %s', (text, broker) => {
    const { res, q, m } = one(text);
    expect(res.brokerDetected).toBe(broker);
    expect(m.brokerSource).toBe(broker);
    expect(q.marketId).toBe('DE_THG');
    expect(q.bidMarketUnit).toBe(215);
  });

  it.each([
    ['DE THG 2026 215/225 €/tCO2e', 'Cal 2026'],
    ['DE THG Cal27 215/225 €/tCO2e', 'Cal 2027'],
    ['DE THG Q1-27 215/225 €/tCO2e', 'Q1 2027'],
    ['DE THG H2-26 215/225 €/tCO2e', 'H2 2026'],
    ['DE THG Win26 215/225 €/tCO2e', 'Win 2026'],
    ['DE THG Jan-27 215/225 €/tCO2e', 'Jan 2027'],
  ])('vintage is a canonical label and never a price: %s', (text, label) => {
    const { q, m } = one(text);
    expect(q.vintage).toBe(label);
    expect(m.vintage).toBe(label);
    expect(q.bidMarketUnit).toBe(215);
  });
});

describe('audit: the nine repro inputs', () => {
  const inputs: Array<[string, (r: ReturnType<typeof parseBrokerRunText>) => void]> = [
    ['STX: DE THG manure 2026 bid 215 offer 225 €/tCO2e vol 50 GWh', r => {
      expect(r.brokerDetected).toBe('STX Commodities');
      expect(r.quotes[0]).toMatchObject({ marketId: 'DE_THG', bidMarketUnit: 215, offerMarketUnit: 225, volumeMwh: 50000, vintage: 'Cal 2026' });
      expect(r.marks[0]).toMatchObject({ isValid: true, midPrice: 220 });
    }],
    ['Marex quoting UK RTFO 2026 bid 21.5 / offer 22.5 p/RTFC 500000 certs', r => {
      expect(r.quotes[0]).toMatchObject({ marketId: 'UK_RTFO', bidMarketUnit: 0.215, offerMarketUnit: 0.225, currency: 'GBP' });
      expect(r.marks[0].isValid).toBe(true);
    }],
    ['ACT Run: NL ERE 2026 14.5/15.5 €/GJ 100 TJ', r => {
      expect(r.marks[0].isValid).toBe(false);
      expect(r.marks[0].validationErrors).toContain('unit €/GJ not convertible for market NL_ERE');
      expect(r.quotes[0].volumeMwh).toBe(27777.78);
    }],
    ['DE THG bundle manure Cal27 85/90 €/MWh 20000 MWh', r => {
      expect(r.quotes[0]).toMatchObject({ marketId: 'DE_THG_BUNDLE', vintage: 'Cal 2027', numericBidEurMwh: 85, numericOfferEurMwh: 90, volumeMwh: 20000 });
    }],
    ['FR CPB 2026 offer 78 €/MWh', r => {
      expect(r.quotes[0]).toMatchObject({ marketId: 'FR_CPB', bidMarketUnit: null, offerMarketUnit: 78 });
      expect(r.marks[0]).toMatchObject({ isValid: true, midPrice: 78 });
    }],
    ['DE THG 2026 bid 230 offer 220 €/tCO2e', r => {
      expect(r.marks[0].bid).toBe(230);
      expect(r.marks[0].ask).toBe(220);
      expect(r.marks[0].validationWarnings.join(' ')).toMatch(/crossed market/);
    }],
    ['UK RGGO 2026 bid 3.2 offer 3.5 p/cert', r => {
      expect(r.quotes[0].marketId).toBe('UK_RGGO');
      expect(r.quotes[0].isValid).toBe(false); // no GBP/EUR FX supplied
    }],
    ['hello it is a good day, we see 40 on the market', r => {
      expect(r.quotes).toEqual([]);
      expect(r.marks.every(m => !m.isValid)).toBe(true);
    }],
    ['DK GO 2026 1.2/1.5 €/MWh 5 GWh', r => {
      expect(r.quotes[0]).toMatchObject({ marketId: 'DK_GO', numericBidEurMwh: 1.2, numericOfferEurMwh: 1.5, volumeMwh: 5000 });
      expect(r.marks[0].isValid).toBe(true);
    }],
  ];
  it.each(inputs)('%s', (text, check) => {
    check(parseBrokerRunText(text, 'Broker', '2026-10-01'));
  });
});

describe('audit: parseFreeformQuotes exposes the same validity', () => {
  it('returns invalid quotes rather than dropping or inventing them', () => {
    const res = parseFreeformQuotes('NL ERE 2026 14.5/15.5 €/GJ');
    expect(res.quotes).toHaveLength(1);
    expect(res.quotes[0].isValid).toBe(false);
  });
});

describe('audit: commitBrokerRunToState keeps units and canonical tenors', () => {
  function commit(text: string) {
    const actions: AppAction[] = [];
    const res = parseBrokerRunText(text, 'Broker', '2026-10-01', FX);
    const n = commitBrokerRunToState(a => actions.push(a), res, '2026-10-01');
    const run = actions.find(a => a.type === 'ADD_PRICING_RUN') as Extract<AppAction, { type: 'ADD_PRICING_RUN' }> | undefined;
    return { n, rows: run?.rows ?? [] };
  }

  it('keeps Cal27 as "Cal 2027" instead of "—"', () => {
    const { n, rows } = commit('DE THG bundle manure Cal27 85/90 €/MWh');
    expect(n).toBe(1);
    expect(rows[0].vintage).toBe('Cal 2027');
    expect(rows[0].numericBidEurMwh).toBe(85);
  });

  it('never writes a EUR/t price into the EUR/MWh fields', () => {
    const { rows } = commit('DE THG 2026 bid 215 offer 225 €/tCO2e');
    expect(rows[0].vintage).toBe('Cal 2026');
    expect(rows[0].bidPriceNumeric).toBe(215);
    expect(rows[0].numericBidEurMwh).toBeNull();
    expect(rows[0].numericOfferEurMwh).toBeNull();
  });

  it('never writes a EUR/kg or GBP/RTFC price into the EUR/MWh fields', () => {
    const ere = commit('NL ERE 2026 0.365/0.375 €/kg').rows[0];
    expect(ere.bidPriceNumeric).toBe(0.365);
    expect(ere.numericBidEurMwh).toBeNull();
    const rtfo = commit('UK RTFO Q1-27 21.5/22.5 p/RTFC').rows[0];
    expect(rtfo.vintage).toBe('Q1 2027');
    expect(rtfo.currency).toBe('GBP');
    expect(rtfo.bidPriceNumeric).toBe(0.215);
    expect(rtfo.numericBidEurMwh).toBeNull();
  });

  it('does not treat a FuelEU EUR/tCO2e-deficit mark as EUR/MWh', () => {
    const actions: AppAction[] = [];
    const res = parseBrokerRunText('FUELEU,295,285,305,EUR/tCO2e,2026-09-05,Broker', 'Broker', '2026-09-05');
    expect(res.marks[0].isValid).toBe(true);
    commitBrokerRunToState(a => actions.push(a), res, '2026-09-05');
    const run = actions.find(a => a.type === 'ADD_PRICING_RUN') as Extract<AppAction, { type: 'ADD_PRICING_RUN' }>;
    expect(run.rows[0].numericBidEurMwh).toBeNull();
  });

  it('rows with no stated tenor still get "—" (nothing invented)', () => {
    const { rows } = commit('DE THG 215/225 €/tCO2e');
    expect(rows[0].vintage).toBe('—');
  });
});

describe('audit: tenor label normaliser', () => {
  it.each([
    ['2027', 'Cal 2027'], ['Cal27', 'Cal 2027'], ['Cal-27', 'Cal 2027'], ['CAL 27', 'Cal 2027'], ['Cal 2027', 'Cal 2027'],
    ['Q1-27', 'Q1 2027'], ['Q1 27', 'Q1 2027'], ['1Q27', 'Q1 2027'], ['q3 2026', 'Q3 2026'],
    ['H2-27', 'H2 2027'], ['H226', 'H2 2026'], ['h1 2027', 'H1 2027'],
    ['Win26', 'Win 2026'], ['W26', 'Win 2026'], ['Winter 2026', 'Win 2026'],
    ['Sum27', 'Sum 2027'], ['S27', 'Sum 2027'],
    ['Jan-27', 'Jan 2027'], ['Jan27', 'Jan 2027'], ['January 2027', 'Jan 2027'],
    ['spot', 'Spot'], ['BoM', 'BoM'], ['m+1', 'M+1'], ['M+12', 'M+12'],
  ])('%s -> %s', (input, label) => {
    expect(canonicalTenorLabel(input)).toBe(label);
  });

  it('returns null for things that are not tenors', () => {
    expect(canonicalTenorLabel('banana')).toBeNull();
    expect(canonicalTenorLabel('')).toBeNull();
    expect(canonicalTenorLabel('215')).toBeNull();
    expect(findTenorInText('no tenor here 215/225')).toBeNull();
  });
});
