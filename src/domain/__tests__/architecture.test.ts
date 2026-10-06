/// <reference types="vite/client" />
import { describe, it, expect } from 'vitest';

/**
 * Architecture guards.
 *
 * These tests defend the two invariants that keep the desk honest:
 *
 *   1. computeNetback is the ONLY function that turns a price into an economic value.
 *   2. No number reaches the screen that the desk did not observe or the user did not enter.
 *
 * Both have already been violated in this codebase — the netback waterfall was
 * reimplemented in two screens, and a 10% producer share was fabricated in thirteen
 * places. Convention did not prevent it. These tests do.
 */

// Read every source file as raw text. import.meta.glob keeps this dependency-free —
// no @types/node, and it resolves identically on every platform.
const RAW_SOURCES = import.meta.glob('../../**/*.{ts,tsx}', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

interface SourceFile {
  /** Path relative to src/, forward-slashed — readable in failure output. */
  path: string;
  text: string;
}

/**
 * Glob keys are relative to THIS file, at whatever depth is shortest — a sibling is
 * './name.ts', domain/netback is '../netback/engine.ts', features is '../../features/…'.
 * Resolve them properly rather than stripping a fixed prefix.
 */
const BASE_SEGMENTS = ['src', 'domain', '__tests__'];

function toSrcRelative(globKey: string): string {
  const stack = [...BASE_SEGMENTS];
  for (const segment of globKey.split('/')) {
    if (segment === '' || segment === '.') continue;
    if (segment === '..') stack.pop();
    else stack.push(segment);
  }
  return stack.slice(1).join('/'); // drop the leading 'src'
}

const ALL_FILES: SourceFile[] = Object.entries(RAW_SOURCES)
  .map(([key, text]) => ({ path: toSrcRelative(key), text }))
  .sort((a, b) => a.path.localeCompare(b.path));

interface Hit {
  file: string;
  line: number;
  text: string;
}

/** Every line in `files` matching `pattern`, with comment-only lines skipped. */
function findLines(files: SourceFile[], pattern: RegExp): Hit[] {
  const hits: Hit[] = [];
  for (const { path, text: source } of files) {
    source.split('\n').forEach((text, i) => {
      const trimmed = text.trim();
      if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')) return;
      if (pattern.test(text)) {
        hits.push({ file: path, line: i + 1, text: trimmed });
      }
      pattern.lastIndex = 0;
    });
  }
  return hits;
}

function report(hits: Hit[]): string {
  return '\n' + hits.map(h => `  ${h.file}:${h.line}\n      ${h.text}`).join('\n') + '\n';
}

const OUTSIDE_TESTS = ALL_FILES.filter(f => !f.path.includes('__tests__/'));
const OUTSIDE_NETBACK = OUTSIDE_TESTS.filter(f => !f.path.startsWith('domain/netback/'));

describe('ARCHITECTURE — the guards can see the code', () => {
  // Without this, a broken glob makes every test below pass against an empty file
  // list. A guard that silently stops looking is worse than no guard.
  it('loaded the source tree', () => {
    expect(ALL_FILES.length).toBeGreaterThan(40);
    expect(OUTSIDE_NETBACK.length).toBeGreaterThan(30);
    const paths = ALL_FILES.map(f => f.path);
    expect(paths).toContain('domain/netback/engine.ts');
    expect(paths).toContain('features/trade-builder/TradeBuilderScreen.tsx');
    expect(ALL_FILES.every(f => typeof f.text === 'string' && f.text.length > 0)).toBe(true);
  });
});

describe('ARCHITECTURE — single pricing authority', () => {
  it('performs no certificate-value arithmetic outside domain/netback/', () => {
    const hits = findLines(
      OUTSIDE_NETBACK,
      /(certificateValue|valueEurPerMWh)\s*\)?\s*[*+\-/]\s*[\w(]/
    );
    expect(hits, `Certificate value may only be priced by computeNetback.${report(hits)}`).toEqual([]);
  });

  it('assigns deskMargin only inside domain/netback/', () => {
    // Reads and forwarding are fine — `deskMargin: branch2.deskMargin` passes the
    // engine's own number along. Only computing a NEW one outside netback/ is banned.
    const FORWARDING = /\bdeskMargin\s*[:=]\s*[\w.?[\]]+\.deskMargin\b/;
    const hits = findLines(OUTSIDE_NETBACK, /\bdeskMargin\s*[:=](?!=)/).filter(
      h => !FORWARDING.test(h.text)
    );
    expect(hits, `deskMargin is produced only by computeNetback.${report(hits)}`).toEqual([]);
  });
});

describe('ARCHITECTURE — domain purity', () => {
  it('imports no React inside domain/', () => {
    const domainFiles = OUTSIDE_TESTS.filter(f => f.path.startsWith('domain/'));
    // Must match the import specifier, not the bare word — 'photobioreactors'
    // appears in the citation registry and is not a React dependency.
    const hits = findLines(domainFiles, /\bfrom\s+['"]react(-dom)?['"]/);
    expect(hits, `domain/ must stay React-free so it can run in a worker.${report(hits)}`).toEqual([]);
  });
});

describe('ARCHITECTURE — every navigation target is routed', () => {
  /**
   * The Trade Builder was imported by App.tsx and rendered by no Route for the whole
   * of its existence, while nine screens linked to /trade. Clicking any of them
   * loaded a different screen, and every deal parameter was dropped on arrival.
   *
   * Nothing caught it: it type-checks, it builds, and a domain suite never opens a
   * page. This is the guard that does.
   */
  const APP = ALL_FILES.find(f => f.path === 'app/App.tsx');

  /** Paths declared in the router, e.g. <Route path="/trade" ... />. */
  function declaredRoutes(): Set<string> {
    const routes = new Set<string>();
    for (const m of APP!.text.matchAll(/<Route\s+[^>]*path="([^"]+)"/g)) {
      routes.add(m[1]);
    }
    return routes;
  }

  it('declares the router in app/App.tsx', () => {
    expect(APP, 'app/App.tsx must exist for the route guard to mean anything').toBeDefined();
    expect(declaredRoutes().size).toBeGreaterThan(3);
  });

  it('routes every path reached by a navigate() or <NavLink to=…> literal', () => {
    const routes = declaredRoutes();
    const hasCatchAll = routes.has('*');

    // Only literals can be checked. navigate(buildDealUrl({...})) is covered by the
    // dealParams tests, which pin its output to DEAL_ROUTE.
    const LITERAL_NAV = /(?:navigate\(|\bto=)['"](\/[a-zA-Z0-9\-_/]*)/g;

    const missing: Hit[] = [];
    for (const { path, text } of OUTSIDE_TESTS) {
      text.split('\n').forEach((line, i) => {
        const trimmed = line.trim();
        if (trimmed.startsWith('//') || trimmed.startsWith('*')) return;
        for (const m of line.matchAll(LITERAL_NAV)) {
          const target = m[1];
          // A nested path is served by its parent segment's route.
          const base = '/' + (target.split('/')[1] ?? '');
          if (routes.has(target) || routes.has(base)) continue;
          missing.push({ file: path, line: i + 1, text: trimmed });
        }
      });
    }

    expect(
      missing,
      `These navigate to a path with no <Route> in App.tsx. They render nothing.` +
        (hasCatchAll ? ' The catch-all redirect hides this from the user, which makes it worse, not better.' : '') +
        report(missing)
    ).toEqual([]);
  });

  it('builds every deal link through buildDealUrl', () => {
    // A hand-rolled '/trade?...' is how the vocabularies diverged in the first
    // place: each caller invented its own key names and the builder read others.
    const files = OUTSIDE_TESTS.filter(f => f.path !== 'domain/trade/dealParams.ts');
    const hits = findLines(files, /['"`]\/trade\?/);
    expect(
      hits,
      `Deal links are built by buildDealUrl() so producer and consumer cannot drift.${report(hits)}`
    ).toEqual([]);
  });
});

describe('ARCHITECTURE — no fabricated values', () => {
  /**
   * Coefficients that are genuine physical or documented modelling constants.
   * Everything else multiplying by a decimal is inventing an economic value.
   * To add an entry here you must be able to name the source.
   */
  const ALLOWED_COEFFICIENTS: { file: string; coefficient: string; because: string }[] = [
    {
      file: 'domain/netback/engine.ts',
      coefficient: '0.0036',
      because: 'EU ETS: MRR 2018/2066 Annex VI natural gas 56.1 tCO2/TJ × 0.0036 TJ/MWh (exact unit conversion).',
    },
    {
      file: 'domain/logistics/engine.ts',
      coefficient: '0.0035',
      because: 'Documented pipeline shrinkage curve per 500 km.',
    },
    {
      file: 'features/trade-builder/TradeBuilderScreen.tsx',
      coefficient: '0.0036',
      because: 'Exact unit conversion gCO2e/MJ -> tCO2e/MWh (3600 MJ/MWh / 1e6 g/t).',
    },
    {
      file: 'domain/offtake/engine.ts',
      coefficient: '0.901',
      because: 'Standard European biomethane conversion factor (Gross HHV to Net LHV calorific ratio).',
    },
    {
      file: 'domain/offtake/engine.ts',
      coefficient: '0.65',
      because: 'Contract-specified CI sensitivity multiplier alpha from Institutional/Puzzle Term Sheet Clause 25.5.',
    },
    {
      file: 'domain/offtake/engine.ts',
      coefficient: '0.99',
      because: 'Contract-specified physical gas index discount factor from Institutional/Puzzle Term Sheet.',
    },
    {
      file: 'domain/offtake/commercialGates.ts',
      coefficient: '0.901',
      because: 'Standard European biomethane conversion factor (Gross HHV to Net LHV calorific ratio).',
    },
  ];

  function isAllowed(hit: Hit): boolean {
    return ALLOWED_COEFFICIENTS.some(
      a => hit.file === a.file && hit.text.includes(a.coefficient)
    );
  }

  it('multiplies by no unsourced decimal coefficient', () => {
    // simulate.ts is exempt: it is explicitly synthetic and stamps every mark SIMULATED.
    const files = OUTSIDE_TESTS.filter(f => f.path !== 'domain/marks/simulate.ts');
    const hits = findLines(files, /\*\s*0\.\d+/).filter(h => !isAllowed(h));
    expect(
      hits,
      `Every coefficient must be sourced. Add it to ALLOWED_COEFFICIENTS with a reason, ` +
        `or remove the fabrication.${report(hits)}`
    ).toEqual([]);
  });

  it('manufactures no value in a null-coalescing fallback', () => {
    // `x ?? (y * 0.10)` is the exact shape of the bug this suite exists to prevent:
    // the engine correctly reports "unset", and the screen quietly invents a number.
    //
    // netback/ is excluded for the same reason as the tests above: it is the pricing
    // authority. Deriving a mid from an observed bid and offer is arithmetic on real
    // data, not invention — and it is the one place allowed to do it.
    const files = OUTSIDE_NETBACK.filter(f => f.path !== 'domain/marks/simulate.ts');
    const hits = findLines(files, /\?\?[^;\n]*[*/]\s*\d/);
    expect(
      hits,
      `A null mark or unset input must render as unset, never as a derived number.${report(hits)}`
    ).toEqual([]);
  });

  it('renders no price movement that was never observed', () => {
    // The guards above all look for arithmetic, so the shell's ticker walked
    // straight past them: its deltas were string literals — '+0.42', '−4.00',
    // '+0.004' — printed beside a mark that was frequently unset, showing movement
    // on a price that did not exist. The desk stores one observation per mark and
    // no previous close, so a signed decimal in quotes cannot have been derived
    // from anything. Both the ASCII hyphen and the U+2212 minus sign count.
    const files = OUTSIDE_TESTS.filter(f => f.path !== 'domain/marks/simulate.ts');
    const hits = findLines(files, /['"][+\-−]\d+\.\d+['"]/);
    expect(
      hits,
      `A price change must be computed from two observations the desk actually holds, ` +
        `or not shown at all.${report(hits)}`
    ).toEqual([]);
  });

  it('substitutes no price-shaped literal for a missing input', () => {
    // The other shape of the same bug: `state.marks.gasIndex.mid ?? 28.50` puts a TTF
    // price nobody quoted into a real calculation. Integer sentinels (?? 0, ?? 999) are
    // not prices and are left alone; a decimal literal after ?? always is one.
    const files = OUTSIDE_NETBACK.filter(f => f.path !== 'domain/marks/simulate.ts');
    const hits = findLines(files, /\?\?\s*-?\d+\.\d+/);
    expect(
      hits,
      `A missing mark or cost must stay missing — never a stand-in number.${report(hits)}`
    ).toEqual([]);
  });
});

describe('ARCHITECTURE — no new hard-coded price', () => {
  /**
   * Known-safe money-shaped declarations. Add an entry here only when you can name why the value
   * is not a desk judgement that belongs on the Pricing desk → Costs or Assumptions tab — a
   * statutory figure with a citation, or explicitly synthetic test data.
   */
  const ALLOWED_MONEY_DECLARATIONS: { file: string; token: string; because: string }[] = [
    { file: 'domain/regulatory/constants.ts', token: 'EUR_MWH', because: 'Statutory constant catalogue — restates a cited legal figure, not a desk judgement.' },
    { file: 'domain/regulatory/constants.ts', token: 'PENALTY_EUR_PER_TCO2E', because: 'Statutory penalty, cited — defined here for real; markets/constants.ts only re-exports it.' },
    { file: 'domain/regulatory/constants.ts', token: 'RED3_TRANSPORT_MAX_CI', because: 'RED III statutory GHG-saving threshold, cited.' },
    { file: 'domain/marks/simulate.ts', token: '', because: 'Synthetic test data — every value here is explicitly SIMULATED, never a real price.' },
    { file: 'features/ets2/Ets2Screen.tsx', token: 'PRICE_CONTROL_TRIGGER_EUR_2020', because: 'Directive 2023/959 Art. 30h statutory price-control trigger, cited in the code comment above it — not a desk judgement, out of scope for this job.' },
  ];

  function isAllowedMoneyDeclaration(hit: Hit): boolean {
    return ALLOWED_MONEY_DECLARATIONS.some(a => hit.file === a.file && hit.text.includes(a.token));
  }

  it('declares no new money-shaped constant as a bare numeric literal', () => {
    // Variable/field names following this codebase's own unit-suffix convention
    // (xxxEurMwh, xxxEurPerMwh, xxxEurPerTco2e, xxxPriceUsd, xxxPenaltyEur, xxxCeilingEur, …)
    // assigned directly to a nonzero numeric literal, outside domain/marks/simulate.ts (which is
    // explicitly synthetic) and the regulatory/markets constant catalogues (which legitimately
    // restate a cited statute). A zero-initialised accumulator (`let totalEurMwh = 0`) is not a
    // price and is not flagged.
    const MONEY_DECLARATION = /\b(?:const|let)\s+\w*(?:EUR\w*MWH|EUR\w*TCO2E|EUR\w*RTFC|USD\w*TONNE|GBP\w*RTFC|GBP\w*TONNE|PENALTY\w*EUR\w*|CEILING\w*EUR\w*|PRICE\w*EUR\w*|PRICE\w*USD\w*|PRICE\w*GBP\w*|COST\w*EUR\w*MWH|FEE\w*EUR\w*MWH)\w*\s*[:=]\s*-?[1-9]\d*(?:\.\d+)?\b/i;
    const files = OUTSIDE_TESTS.filter(
      f => !f.path.includes('.generated.') && (f.path.startsWith('domain/') || f.path.startsWith('features/'))
    );
    const hits = findLines(files, MONEY_DECLARATION).filter(h => !isAllowedMoneyDeclaration(h));
    expect(
      hits,
      `A new price, cost or fee belongs on the Pricing desk (#/pricing — Market prices, Costs or ` +
        `Assumptions tab), not a bare literal in code. Add it there, or to ALLOWED_MONEY_DECLARATIONS ` +
        `above with a reason if it genuinely is not a desk judgement.${report(hits)}`
    ).toEqual([]);
  });
});
