import { describe, it, expect, beforeEach } from 'vitest';
import { parseBrokerRunText, SAMPLE_BROKER_RUNS, resolveMarketId, cleanNumber, normalizeDate } from '../marks/brokerParser';
import { calculateMarksDiff, buildAuditRecord, getMarksAuditHistory, saveMarksAuditRecord, clearMarksAuditHistory, MARKS_AUDIT_STORAGE_KEY } from '../marks/marksStore';
import { MarksState } from '../netback/types';

describe('Broker Run Parser & Importer Engine', () => {
  beforeEach(() => {
    clearMarksAuditHistory();
  });

  describe('Field Helpers & Normalization', () => {
    it('cleans numeric strings with currency symbols and commas', () => {
      expect(cleanNumber('€385.50')).toBe(385.5);
      expect(cleanNumber('£0.225')).toBe(0.225);
      expect(cleanNumber(' 78,50 ')).toBe(78.5);
      expect(cleanNumber('38.25%')).toBe(38.25);
      expect(cleanNumber('"385.00"')).toBe(385.0);
      expect(cleanNumber('1,234.50')).toBe(1234.5);
      expect(cleanNumber('1.234,50')).toBe(1234.5);
      expect(cleanNumber('385.00 EUR/MWh')).toBe(385.0);
      expect(cleanNumber('0.225 GBP/dRTFC')).toBe(0.225);
      expect(cleanNumber('invalid')).toBeNull();
      expect(cleanNumber('')).toBeNull();
      expect(cleanNumber(null)).toBeNull();
    });

    it('resolves product aliases to statutory market IDs', () => {
      expect(resolveMarketId('THG').marketId).toBe('DE_THG');
      expect(resolveMarketId('German THG').marketId).toBe('DE_THG');
      expect(resolveMarketId('ERE').marketId).toBe('NL_ERE');
      expect(resolveMarketId('Dutch HBE ERE').marketId).toBe('NL_ERE');
      expect(resolveMarketId('CPB').marketId).toBe('FR_CPB');
      expect(resolveMarketId('RTFC').marketId).toBe('UK_RTFO');
      expect(resolveMarketId('FuelEU').marketId).toBe('FUELEU');
      expect(resolveMarketId('FUELEU_MARITIME').marketId).toBe('FUELEU');
      expect(resolveMarketId('CIC').marketId).toBe('IT_CIC');
      expect(resolveMarketId('DE_GO').marketId).toBe('DE_GO');
      expect(resolveMarketId('TTF').marketId).toBe('GAS_TTF');
      expect(resolveMarketId('UNRECOGNIZED_FOO_BAR').marketId).toBeNull();
    });

    it('normalizes various date formats to ISO YYYY-MM-DD', () => {
      expect(normalizeDate('2026-09-05')).toBe('2026-09-05');
      expect(normalizeDate('05/09/2026')).toBe('2026-09-05');
      expect(normalizeDate('05-09-2026')).toBe('2026-09-05');
      expect(normalizeDate('')).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });

  describe('Sample Broker Run Parsing', () => {
    it('parses Argus Media CSV format with headers', () => {
      const result = parseBrokerRunText(SAMPLE_BROKER_RUNS.ARGUS.content);
      expect(result.validCount).toBeGreaterThanOrEqual(6);
      expect(result.brokerDetected).toBe('Argus Media');

      const thg = result.marks.find(m => m.marketId === 'DE_THG');
      expect(thg).toBeDefined();
      expect(thg?.midPrice).toBe(385);
      expect(thg?.bid).toBe(380);
      expect(thg?.ask).toBe(390);
      expect(thg?.isValid).toBe(true);

      const ttf = result.marks.find(m => m.marketId === 'GAS_TTF');
      expect(ttf).toBeDefined();
      expect(ttf?.midPrice).toBe(38.4);
    });

    it('parses ICIS tab-separated format', () => {
      const result = parseBrokerRunText(SAMPLE_BROKER_RUNS.ICIS.content);
      expect(result.validCount).toBeGreaterThanOrEqual(6);
      expect(result.brokerDetected).toBe('ICIS');

      const ere = result.marks.find(m => m.marketId === 'NL_ERE');
      expect(ere).toBeDefined();
      expect(ere?.midPrice).toBe(0.36);
      expect(ere?.bid).toBe(0.35);
      expect(ere?.ask).toBe(0.37);
    });

    it('parses STX comma-separated format without headers', () => {
      const result = parseBrokerRunText(SAMPLE_BROKER_RUNS.STX.content);
      expect(result.validCount).toBeGreaterThanOrEqual(6);
      expect(result.brokerDetected).toBe('STX Commodities');

      const cpb = result.marks.find(m => m.marketId === 'FR_CPB');
      expect(cpb).toBeDefined();
      expect(cpb?.midPrice).toBe(78.2);
    });

    it('parses ACT pipe-separated run with keyword labels', () => {
      const result = parseBrokerRunText(SAMPLE_BROKER_RUNS.ACT.content);
      expect(result.validCount).toBeGreaterThanOrEqual(6);
      expect(result.brokerDetected).toBe('ACT Commodities');

      const rtfc = result.marks.find(m => m.marketId === 'UK_RTFO');
      expect(rtfc).toBeDefined();
      expect(rtfc?.midPrice).toBe(0.224);
      expect(rtfc?.bid).toBe(0.216);
      expect(rtfc?.ask).toBe(0.232);
    });
  });

  describe('Validation & Error Handling', () => {
    it('flags inverted bid > ask as validation error', () => {
      const raw = 'THG, 380.00, 395.00, 375.00, EUR/tCO2e, 2026-09-05, Broker';
      const result = parseBrokerRunText(raw);
      expect(result.marks.length).toBe(1);
      expect(result.marks[0].isValid).toBe(false);
      expect(result.marks[0].validationErrors.some(e => e.includes('Inverted spread'))).toBe(true);
    });

    it('flags unrecognized market product', () => {
      const raw = 'CRYPTO_COIN, 120.00, 110.00, 130.00, USD, 2026-09-05, Broker';
      const result = parseBrokerRunText(raw);
      expect(result.marks[0].isValid).toBe(false);
      expect(result.marks[0].validationErrors.some(e => e.includes('Unrecognized market'))).toBe(true);
    });

    it('handles empty input gracefully', () => {
      const result = parseBrokerRunText('');
      expect(result.marks.length).toBe(0);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.validCount).toBe(0);
    });

    it('synthesizes bid/ask with warning if only mid price is supplied', () => {
      const raw = 'THG, 380.00';
      const result = parseBrokerRunText(raw);
      expect(result.marks[0].isValid).toBe(true);
      expect(result.marks[0].bid).toBeLessThan(380);
      expect(result.marks[0].ask).toBeGreaterThan(380);
      expect(result.marks[0].validationWarnings.length).toBeGreaterThan(0);
    });

    it('parses Excel quoted CSV runs seamlessly', () => {
      const quoted = '"THG","385.00","380.00","390.00","EUR/tCO2e","2026-09-05","Argus"\n"ERE","0.365","0.355","0.375","EUR/kgCO2e","2026-09-05","Argus"';
      const result = parseBrokerRunText(quoted);
      expect(result.validCount).toBe(2);
      expect(result.marks[0].marketId).toBe('DE_THG');
      expect(result.marks[0].midPrice).toBe(385);
      expect(result.marks[1].marketId).toBe('NL_ERE');
      expect(result.marks[1].midPrice).toBe(0.365);
    });

    it('parses colon-separated product and mid within pipe-delimited lines', () => {
      const raw = 'THG: 385.00 | EUR/MWh | 2026-09-05 | Broker';
      const result = parseBrokerRunText(raw);
      expect(result.marks.length).toBe(1);
      expect(result.marks[0].isValid).toBe(true);
      expect(result.marks[0].marketId).toBe('DE_THG');
      expect(result.marks[0].midPrice).toBe(385);
    });

    it('prioritizes exact alias matches preventing substring hijacking', () => {
      expect(resolveMarketId('DE_GO').marketId).toBe('DE_GO');
      expect(resolveMarketId('NL_GO').marketId).toBe('NL_GO');
      expect(resolveMarketId('FR_GO').marketId).toBe('FR_GO');
      expect(resolveMarketId('DUTCH GO').marketId).toBe('NL_GO');
      expect(resolveMarketId('GERMAN GO').marketId).toBe('DE_GO');
    });
  });

  describe('Marks Diff & Audit Store Integration', () => {
    const mockMarksState: MarksState = {
      marks: {
        DE_THG: {
          marketId: 'DE_THG',
          bid: 370,
          offer: 380,
          mid: 375,
          updatedAt: '2026-09-01T10:00:00Z',
          source: 'Simulated Desk',
        },
        NL_ERE: {
          marketId: 'NL_ERE',
          bid: 0.38,
          offer: 0.40,
          mid: 0.39,
          updatedAt: '2026-09-01T10:00:00Z',
          source: 'Simulated Desk',
        },
      },
      gasIndex: {
        bid: 36,
        offer: 38,
        mid: 37,
        updatedAt: '2026-09-01T10:00:00Z',
      },
      fx: {
        gbpEur: 1.18,
        chfEur: 1.05,
        updatedAt: '2026-09-01T10:00:00Z',
      },
      pricingSides: {
        certificateSide: 'bid',
        moleculeSide: 'bid',
      },
    };

    it('calculates price deltas and statuses accurately', () => {
      const parsed = parseBrokerRunText(`
        THG, 385.00, 380.00, 390.00, EUR/tCO2e, 2026-09-05, Argus
        ERE, 0.360, 0.350, 0.370, EUR/kgCO2e, 2026-09-05, Argus
        CPB, 75.00, 73.00, 77.00, EUR/MWh, 2026-09-05, Argus
        TTF, 38.00, 37.50, 38.50, EUR/MWh, 2026-09-05, Argus
      `).marks;

      const diffs = calculateMarksDiff(parsed, mockMarksState);
      expect(diffs.length).toBe(4);

      // THG moved from 375 to 385 (PRICE_UP)
      const thgDiff = diffs.find(d => d.marketId === 'DE_THG')!;
      expect(thgDiff.status).toBe('PRICE_UP');
      expect(thgDiff.diffEur).toBe(10);
      expect(thgDiff.diffPct).toBeGreaterThan(0);

      // ERE moved from 0.390 to 0.360 (PRICE_DOWN)
      const ereDiff = diffs.find(d => d.marketId === 'NL_ERE')!;
      expect(ereDiff.status).toBe('PRICE_DOWN');
      expect(ereDiff.diffEur).toBeLessThan(0);

      // CPB is new
      const cpbDiff = diffs.find(d => d.marketId === 'FR_CPB')!;
      expect(cpbDiff.status).toBe('NEW_MARK');

      // TTF moved from 37 to 38
      const ttfDiff = diffs.find(d => d.marketId === 'GAS_TTF')!;
      expect(ttfDiff.status).toBe('PRICE_UP');
      expect(ttfDiff.diffEur).toBe(1);
    });

    it('builds institutional audit record and persists to localStorage', () => {
      const parsed = parseBrokerRunText(SAMPLE_BROKER_RUNS.ARGUS.content).marks;
      const diffs = calculateMarksDiff(parsed, mockMarksState);
      const audit = buildAuditRecord(diffs, 'Argus Media', '2026-09-05', 'Chief Trader', 'raw snippet');

      expect(audit.id).toMatch(/^AUDIT-\d{4}-\d{2}-\d{2}-\d{4}$/);
      expect(audit.recordsCommitted).toBe(diffs.length);
      expect(audit.trader).toBe('Chief Trader');

      saveMarksAuditRecord(audit);
      const history = getMarksAuditHistory();
      expect(history.length).toBe(1);
      expect(history[0].id).toBe(audit.id);
      expect(history[0].brokerSource).toBe('Argus Media');
    });
  });
});
