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

describe('ARCHITECTURE — no fabricated values', () => {
  /**
   * Coefficients that are genuine physical or documented modelling constants.
   * Everything else multiplying by a decimal is inventing an economic value.
   * To add an entry here you must be able to name the source.
   */
  const ALLOWED_COEFFICIENTS: { file: string; coefficient: string; because: string }[] = [
    {
      file: 'domain/logistics/engine.ts',
      coefficient: '0.0035',
      because: 'Documented pipeline shrinkage curve per 500 km.',
    },
    {
      file: 'features/opportunity-scanner/ScannerScreen.tsx',
      coefficient: '0.0036',
      because: 'Exact unit conversion gCO2e/MJ -> tCO2e/MWh (3600 MJ/MWh / 1e6 g/t).',
    },
    {
      file: 'features/trade-builder/TradeBuilderScreen.tsx',
      coefficient: '0.0036',
      because: 'Exact unit conversion gCO2e/MJ -> tCO2e/MWh (3600 MJ/MWh / 1e6 g/t).',
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
