import { describe, it, expect, vi, afterEach } from 'vitest';
import { readEts2Companies, readEts2Countries, ETS2_COMPANY_IMPORT_KEY, ETS2_COUNTRY_IMPORT_KEY } from '../../features/clients/deskInputs';
import { DEFAULT_ETS2_COMPANIES } from '../companies/directory';
import { ETS2_COUNTRIES } from '../ets2/countries';

function stubStorage(values: Record<string, string>) {
  vi.stubGlobal('localStorage', { getItem: (k: string) => values[k] ?? null, setItem: () => undefined });
}

describe('ETS2 import keys tolerate any stored shape (R5)', () => {
  afterEach(() => vi.unstubAllGlobals());
  for (const bad of ['[null]', 'null', '{}', '[1,2]', '"x"', 'not json', '[{"iso":null}]', '[[]]']) {
    it(`falls back to the defaults on ${bad}`, () => {
      stubStorage({ [ETS2_COUNTRY_IMPORT_KEY]: bad, [ETS2_COMPANY_IMPORT_KEY]: bad });
      expect(() => readEts2Countries()).not.toThrow();
      expect(() => readEts2Companies()).not.toThrow();
      expect(readEts2Countries().every(c => c && typeof c.iso === 'string')).toBe(true);
      expect(readEts2Companies().every(c => c && typeof c.name === 'string')).toBe(true);
      expect(readEts2Countries().length).toBeGreaterThanOrEqual(ETS2_COUNTRIES.length);
      expect(readEts2Companies().length).toBeGreaterThanOrEqual(DEFAULT_ETS2_COMPANIES.length);
    });
  }
  it('empty storage gives the defaults', () => {
    stubStorage({});
    expect(readEts2Companies()).toBe(DEFAULT_ETS2_COMPANIES);
    expect(readEts2Countries()).toBe(ETS2_COUNTRIES);
  });
});
