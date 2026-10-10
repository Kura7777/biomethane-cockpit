import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { GLOSSARY_BY_ID } from '../glossary';
import { TERM_STATUS } from '../termStatus';
import { termExample, TERMS_WITH_EXAMPLES } from '../termExamples';
import { REGCHECK_WATCHLIST } from '../../regcheck/watchlist';
import { feedstockDefaultCi } from '../../assumptions/registry';
import { NL_GGE_BUYOUT_EUR_PER_TCO2E, NL_GGE_FOSSIL_COMPARATOR_GCO2E_MJ, NL_GGE_START_YEAR } from '../../regulatory/constants';
import type { MarksState, CostInputs } from '../../netback/types';

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap(f => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? walk(p) : p.endsWith('.tsx') ? [p] : [];
  });
}

describe('term status', () => {
  it('every status belongs to a glossary entry and every watch id exists', () => {
    const watchIds = new Set(REGCHECK_WATCHLIST.map(w => w.id));
    for (const [id, st] of Object.entries(TERM_STATUS)) {
      expect(GLOSSARY_BY_ID[id], `status for unknown term ${id}`).toBeDefined();
      expect(st.checked).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      for (const w of st.watchIds) expect(watchIds.has(w), `${id}: unknown watch id ${w}`).toBe(true);
    }
  });
  it('the Dutch green-gas law is shown as not yet law', () => {
    expect(TERM_STATUS['nl-green-gas-law'].label).toBe('Not yet law');
  });
});

describe('<Term id> usages', () => {
  it('every literal id used in the UI is a glossary entry', () => {
    const files = walk(join(__dirname, '../../../features'));
    const bad: string[] = [];
    for (const f of files) {
      const src = readFileSync(f, 'utf8');
      for (const m of src.matchAll(/<Term id="([^"]+)"/g)) if (!GLOSSARY_BY_ID[m[1]]) bad.push(`${f}: ${m[1]}`);
      for (const m of src.matchAll(/termId: '([^']+)'/g)) if (!GLOSSARY_BY_ID[m[1]]) bad.push(`${f}: ${m[1]}`);
      for (const m of src.matchAll(/\b[A-Z]{2}_[A-Z_]+: '([a-z-]+)'/g)) if (src.includes('MARKET_TERM') && !GLOSSARY_BY_ID[m[1]]) bad.push(`${f}: ${m[1]}`);
    }
    expect(bad).toEqual([]);
  });
});

describe('worked examples', () => {
  const marks = {
    marks: {
      NL_GGE: { marketId: 'NL_GGE', bid: null, offer: null, mid: 0.4, updatedAt: null, source: 'test' },
      DE_THG: { marketId: 'DE_THG', bid: null, offer: null, mid: 300, updatedAt: null, source: 'test' },
      NL_ERE: { marketId: 'NL_ERE', bid: null, offer: null, mid: 0.3, updatedAt: null, source: 'test' },
    },
  } as unknown as MarksState;
  const ctx = { marks, costs: {} as CostInputs };

  it('exists for every listed term and only for glossary entries', () => {
    for (const id of TERMS_WITH_EXAMPLES) {
      expect(GLOSSARY_BY_ID[id]).toBeDefined();
      if (id !== 'netback') expect(termExample(id, ctx)?.lines.length).toBeGreaterThan(0);
    }
    expect(termExample('mass-balance', ctx)).toBeNull();
  });

  it('GGE example follows the comparator, the manure default CI, the mark and the buy-out', () => {
    const ci = feedstockDefaultCi('manure')!;
    const perMwh = (NL_GGE_FOSSIL_COMPARATOR_GCO2E_MJ - ci) * 3.6;
    const text = termExample('gge', ctx)!.lines.join(' ');
    expect(text).toContain(perMwh.toFixed(1));
    expect(text).toContain((perMwh * 0.4).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
    const buyout = NL_GGE_BUYOUT_EUR_PER_TCO2E[NL_GGE_START_YEAR] / 1000;
    expect(text).toContain((perMwh * buyout).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
  });

  it('says so when a market has no mark', () => {
    const empty = { marks: { marks: {} } as unknown as MarksState, costs: {} as CostInputs };
    expect(termExample('thg-quote', empty)!.lines.join(' ')).toContain('No DE THG mark');
  });
});
