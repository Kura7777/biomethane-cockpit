import { describe, it, expect } from 'vitest';
import { buildCompanyDirectory, CompanyLink, sectorsOf } from '../companies/directory';
import { normalizeCompanyName, searchFold } from '../companies/normalize';
import { formatEur } from '../companies/money';
import { buildCsv, csvCell, CSV_BOM } from '../companies/csv';
import { parseLinks, parseStatuses, resolveStatus, withStatus, linksWithout, Status } from '../companies/clientState';

const idsOf = (links: CompanyLink[]) => buildCompanyDirectory(links);

describe('status keeps following a company through links (L5)', () => {
  // Three profiles that sort A < B < C by id.
  const [A, B, C] = ['engie', 'engie italia', 'engie deutschland'].sort();
  const base = buildCompanyDirectory();
  const has = (id: string) => base.some(p => p.id === id);

  it('the test companies exist', () => {
    expect([A, B, C].every(has)).toBe(true);
  });

  it('a merged profile takes the smallest id and lists every member', () => {
    const d = idsOf([{ a: B, b: C }]);
    const p = d.find(x => x.memberIds.includes(B))!;
    expect(p.id).toBe([B, C].sort()[0]);
    expect(p.memberIds).toEqual([B, C].sort());
    expect(d.length).toBe(base.length - 1);
  });

  it('link A+B then C+A: the id follows the smallest member, and the status set on A is not lost (both orders)', () => {
    const orders: CompanyLink[][] = [
      [{ a: A, b: B }, { a: C, b: A }],
      [{ a: C, b: A }, { a: A, b: B }],
    ];
    for (const links of orders) {
      // The trader marks the company after the first link only.
      const afterFirst = idsOf([links[0]]);
      const first = afterFirst.find(p => p.memberIds.includes(A))!;
      let statuses: Record<string, Status> = withStatus({}, first, 'MEETING');
      const all = idsOf(links);
      const merged = all.find(p => p.memberIds.includes(A))!;
      expect(merged.memberIds).toEqual([A, B, C].sort());
      expect(merged.id).toBe([A, B, C].sort()[0]);
      expect(all.length).toBe(base.length - 2);
      // Same profile whichever order the links were made in.
      expect(idsOf([...links].reverse()).find(p => p.memberIds.includes(A))!.id).toBe(merged.id);
      expect(resolveStatus(statuses, merged)).toBe('MEETING');
      // Setting a new status writes to the profile id and clears the member keys.
      statuses = withStatus(statuses, merged, 'PIPELINE');
      expect(resolveStatus(statuses, merged)).toBe('PIPELINE');
      expect(Object.keys(statuses).filter(k => merged.memberIds.includes(k))).toEqual([merged.id]);
    }
  });

  it('falls back to the most advanced status among the merged ids', () => {
    const p = { id: 'a', memberIds: ['a', 'b', 'c'] };
    expect(resolveStatus({ b: 'CONTACTED', c: 'PIPELINE' }, p)).toBe('PIPELINE');
    expect(resolveStatus({ b: 'NOT_A_FIT', c: 'CONTACTED' }, p)).toBe('CONTACTED');
    expect(resolveStatus({ b: 'MEETING', c: 'CONTACTED' }, p)).toBe('MEETING');
    expect(resolveStatus({ b: 'NOT_A_FIT' }, p)).toBe('NOT_A_FIT');
    expect(resolveStatus({}, p)).toBe('NOT_CONTACTED');
    // Its own key wins over a member's.
    expect(resolveStatus({ a: 'NOT_CONTACTED', b: 'PIPELINE' }, p)).toBe('NOT_CONTACTED');
  });

  it('unlink removes only links touching this profile', () => {
    const links: CompanyLink[] = [{ a: A, b: B }, { a: 'x', b: 'y' }, { a: C, b: 'z' }];
    const kept = linksWithout(links, { memberIds: [A, B] });
    expect(kept).toEqual([{ a: 'x', b: 'y' }, { a: C, b: 'z' }]);
  });
});

describe('alias merging is order-independent (L9)', () => {
  const d = buildCompanyDirectory();

  it('ThyssenKrupp Steel Europe is one row', () => {
    const rows = d.filter(p => p.names.some(n => normalizeCompanyName(n) === 'thyssenkrupp steel europe'));
    expect(rows.length).toBe(1);
    expect(rows[0].names.some(n => /thyssenkrupp ag/i.test(n))).toBe(true);
  });

  it('gives every profile a unique id and lists itself in memberIds', () => {
    expect(new Set(d.map(p => p.id)).size).toBe(d.length);
    for (const p of d) expect(p.memberIds).toEqual([p.id]);
  });

  it('is deterministic', () => {
    const again = buildCompanyDirectory();
    expect(again.map(p => p.id)).toEqual(d.map(p => p.id));
  });

  it('counts FuelEU + ETS maritime as one sector (L6)', () => {
    const ship = d.find(p => p.markets.includes('FUELEU') && p.markets.includes('ETS_MARITIME') && p.markets.length === 2)!;
    expect(sectorsOf(ship)).toEqual(['SHIPPING']);
    expect(sectorsOf({ markets: ['FUELEU', 'ETS_MARITIME', 'ETS1', 'ETS2'] })).toEqual(['SHIPPING', 'ETS1', 'ETS2']);
    const multi = d.filter(p => sectorsOf(p).length > 1).length;
    expect(multi).toBeLessThan(200);
  });
});

describe('stored state is shape-checked (L12)', () => {
  const garbage = ['null', '{}', '[1,2]', '"x"', '1', 'not json', '', undefined as unknown as string];
  it('links fall back to empty on anything but an array of {a,b} strings', () => {
    for (const g of garbage) expect(parseLinks(g)).toEqual([]);
    expect(parseLinks('[{"a":"x","b":"y"},{"a":1,"b":2},null]')).toEqual([{ a: 'x', b: 'y' }]);
  });
  it('statuses fall back to empty on anything but a record of valid statuses', () => {
    for (const g of garbage) expect(parseStatuses(g)).toEqual({});
    expect(parseStatuses('[1,2]')).toEqual({});
    expect(parseStatuses('{"a":"MEETING","b":"bogus","c":3}')).toEqual({ a: 'MEETING' });
  });
  it('a directory built from bad links does not throw', () => {
    expect(() => buildCompanyDirectory(parseLinks('{}'))).not.toThrow();
  });
});

describe('search folding (L15)', () => {
  it('finds accented and slashed names from plain text', () => {
    expect(searchFold('Ørsted A/S')).toContain(searchFold('orsted'));
    expect(searchFold('Wärtsilä')).toContain('wartsila');
    expect(searchFold('ŁÓDŹ')).toContain('lodz');
    expect(searchFold('Eisengießerei')).toContain('giesserei');
  });
});

describe('money formatter (L14)', () => {
  it('follows the scale rules', () => {
    expect(formatEur(null)).toBe('—');
    expect(formatEur(0)).toBe('€0');
    expect(formatEur(4_000)).toBe('€4k');
    expect(formatEur(49_999)).toBe('€50k');
    expect(formatEur(750)).toBe('€750');
    expect(formatEur(1_000_000)).toBe('€1.0m');
    expect(formatEur(2_345_678)).toBe('€2.3m');
    expect(formatEur(9_960_000)).toBe('€10m');
    expect(formatEur(14_510_000)).toBe('€15m');
    expect(formatEur(561_261_120)).toBe('€561m');
    expect(formatEur(999_600)).toBe('€1.0m');
  });
  it('never prints "+€-" or a four-digit k figure', () => {
    for (const v of [-5, -1234, -2_000_000, 999_499, 999_500, 14_510_000, 1e9]) {
      const t = formatEur(v);
      expect(t).not.toMatch(/\+€-|€-/);
      expect(t).not.toMatch(/\d{4,}k/);
    }
    expect(formatEur(-2_000_000)).toBe('-€2.0m');
  });
});

describe('CSV (L16)', () => {
  it('starts with a UTF-8 BOM', () => {
    expect(buildCsv(['a'], [['x']]).startsWith(CSV_BOM)).toBe(true);
  });
  it('neutralises formula starts in text but leaves numbers alone', () => {
    for (const bad of ['=1+1', '+1', '-1', '@SUM(A1)', '\tx', '\rx']) expect(csvCell(bad).replace(/^"/, '').startsWith("'")).toBe(true);
    expect(csvCell(-5)).toBe('-5');
    expect(csvCell(1234)).toBe('1234');
    expect(csvCell(null)).toBe('');
    expect(csvCell('ok')).toBe('ok');
  });
  it('quotes commas, quotes and newlines', () => {
    expect(csvCell('a,b')).toBe('"a,b"');
    expect(csvCell('say "hi"')).toBe('"say ""hi"""');
  });
});
