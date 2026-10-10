import { describe, it, expect } from 'vitest';
import appSource from '../../app/App.tsx?raw';
import { NAV_GROUPS, SIDEBAR_ITEMS } from '../../app/navConfig';
import { GLOSSARY, GLOSSARY_BY_ID, normaliseGlossaryText, searchGlossary } from '../help/glossary';
import { GUIDE_ROUTE_ALIASES, PAGE_GUIDES, getPageGuide } from '../help/pageGuides';

/**
 * Help content guards. The glossary and page guides are plain data the glossary page and the page
 * helper read, so these tests keep them honest: links go somewhere real, every id resolves, the text
 * fits its limits, and no price or other changing number is typed into the prose.
 */

const words = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;

/** Every path declared in App.tsx, redirects included. */
const APP_ROUTES = new Set([...appSource.matchAll(/<Route\s+path="([^"]+)"/g)].map(m => m[1]).filter(p => p !== '*'));

/** Routes that render a screen (not a <Navigate> redirect). */
const SCREEN_ROUTES = [...appSource.matchAll(/<Route\s+path="([^"]+)"\s+element=\{<(\w+)/g)]
  .filter(m => m[2] !== 'Navigate')
  .map(m => m[1]);

const pathOf = (route: string) => route.split('?')[0].split('#')[0];

/**
 * Currency amounts and per-unit prices. Fixed legal constants are fine only when interpolated from
 * regulatory/constants.ts, and none of them is shaped like a price, so a match here means a typed price.
 */
const PRICE_SHAPED = /[€£$]\s?\d|\d\s?[€£$]|\d[\d.,]*\s?(EUR|GBP|USD|euros?)\b|\d[\d.,]*\s?\/\s?(MWh|kWh|GWh|tCO|t\b|GGE|kg|CIC|RTFC)/i;

function guideTexts(): string[] {
  return PAGE_GUIDES.flatMap(g => [
    g.title,
    g.purpose,
    ...g.howToRead.flatMap(h => [h.section, h.text]),
    ...g.commonTasks.flatMap(t => [t.question, ...t.steps]),
    ...g.suggestedQuestions,
  ]);
}

function glossaryTexts(): string[] {
  return GLOSSARY.flatMap(e => [e.term, ...e.aliases, e.short, e.plain, e.whyItMatters, ...e.appLinks.map(l => l.label), ...e.sources.map(s => s.label)]);
}

describe('price guard', () => {
  it('catches typed prices and lets fixed constants through', () => {
    for (const bad of ['costs €450 a tonne', 'about 450 EUR', 'a 100/MWh ceiling', '£0.50 per certificate', '45 €/MWh']) {
      expect(PRICE_SHAPED.test(bad), bad).toBe(true);
    }
    for (const ok of ['(80 − CI) × 3.6 × MWh', '94 gCO₂e/MJ', 'up to 10% of the obligation', 'about 11.63 MWh']) {
      expect(PRICE_SHAPED.test(ok), ok).toBe(false);
    }
  });
});

describe('app route table (what the tests below check against)', () => {
  it('finds the routes declared in App.tsx', () => {
    expect(APP_ROUTES.has('/brief')).toBe(true);
    expect(APP_ROUTES.has('/glossary')).toBe(true);
    expect(SCREEN_ROUTES.length).toBeGreaterThan(15);
  });
});

describe('glossary', () => {
  it('has unique ids', () => {
    const ids = GLOSSARY.map(e => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('has no duplicate terms or aliases, and no alias that is another entry’s term', () => {
    const seen = new Map<string, string>();
    const clashes: string[] = [];
    for (const e of GLOSSARY) {
      const keys = new Set([e.term, ...e.aliases].map(normaliseGlossaryText));
      for (const k of keys) {
        const owner = seen.get(k);
        if (owner && owner !== e.id) clashes.push(`"${k}" is on both ${owner} and ${e.id}`);
        seen.set(k, e.id);
      }
      // within one entry the same string twice is also a slip
      expect(keys.size, `${e.id} repeats a term or alias`).toBe(1 + e.aliases.length);
    }
    expect(clashes).toEqual([]);
  });

  it('keeps every text field within its word limit', () => {
    const over: string[] = [];
    for (const e of GLOSSARY) {
      if (words(e.short) > 20) over.push(`${e.id}.short ${words(e.short)} words`);
      if (words(e.plain) > 80) over.push(`${e.id}.plain ${words(e.plain)} words`);
      if (words(e.whyItMatters) > 50) over.push(`${e.id}.whyItMatters ${words(e.whyItMatters)} words`);
    }
    expect(over).toEqual([]);
  });

  it('fills every field and gives each entry at least one source or app link', () => {
    for (const e of GLOSSARY) {
      expect(e.term.trim(), `${e.id} term`).not.toBe('');
      expect(e.short.trim(), `${e.id} short`).not.toBe('');
      expect(e.plain.trim(), `${e.id} plain`).not.toBe('');
      expect(e.whyItMatters.trim(), `${e.id} whyItMatters`).not.toBe('');
      expect(e.sources.length + e.appLinks.length, `${e.id} needs a source or an app link`).toBeGreaterThan(0);
    }
  });

  it('points every app link at a real route', () => {
    const bad: string[] = [];
    for (const e of GLOSSARY) {
      for (const l of e.appLinks) {
        if (!APP_ROUTES.has(pathOf(l.route))) bad.push(`${e.id} → ${l.route}`);
      }
    }
    expect(bad).toEqual([]);
  });

  it('gives every source a label and an https URL', () => {
    for (const e of GLOSSARY) {
      for (const s of e.sources) {
        expect(s.label.trim(), `${e.id} source label`).not.toBe('');
        expect(s.url, `${e.id} source ${s.label}`).toMatch(/^https:\/\//);
      }
    }
  });

  it('resolves every related id, and never relates an entry to itself', () => {
    const bad: string[] = [];
    for (const e of GLOSSARY) {
      for (const r of e.related) {
        if (!GLOSSARY_BY_ID[r]) bad.push(`${e.id} → unknown ${r}`);
        if (r === e.id) bad.push(`${e.id} relates to itself`);
      }
    }
    expect(bad).toEqual([]);
  });

  it('covers the terms the desk asked for', () => {
    const required = [
      'go', 'pos', 'udb', 'gge', 'ere', 'thg-quote', 'cic', 'rtfo', 'cpb', 'buy-out', 'energy-basis',
      'mass-balance', 'book-and-claim', 'segregation', 'chain-of-custody', 'aib-hub', 'ergar', 'verticer',
      'enagas-gdo', 'dena-biogasregister', 'nea', 'voluntary-scheme', 'certified-economic-operator',
      'red-iii', 'annex-ix', 'ghg-threshold', 'fossil-comparator', 'carbon-intensity', 'manure-credit',
      'operating-vs-investment-aid', 'prtr', 'sde-plus-plus', 'eeg', 'reer', 'double-counting',
      'ets1-zero-rating', 'ets2', 'fueleu-maritime', 'nl-green-gas-law',
      'netback', 'bundle-price', 'hub-spread', 'ttf', 'the-hub', 'vtp', 'desk-margin', 'producer-payable',
      'compliance-year', 'banking',
    ];
    expect(required.filter(id => !GLOSSARY_BY_ID[id])).toEqual([]);
    expect(GLOSSARY.length).toBeGreaterThanOrEqual(required.length);
  });

  it('types no currency amounts or per-unit prices into the text', () => {
    const hits = glossaryTexts().filter(t => PRICE_SHAPED.test(t));
    expect(hits).toEqual([]);
  });

  it('reads the fixed legal numbers it quotes from the constants, so the text follows them', () => {
    const gge = GLOSSARY_BY_ID['gge'].plain;
    expect(gge).toContain('(80 − CI) × 3.6');
    expect(GLOSSARY_BY_ID['fossil-comparator'].plain).toContain('94 gCO₂e/MJ');
    expect(GLOSSARY_BY_ID['ghg-threshold'].plain).toContain('32.9');
    expect(GLOSSARY_BY_ID['banking'].plain).toContain('10%');
  });
});

describe('glossary search', () => {
  it('finds a term by its abbreviation or alias', () => {
    expect(searchGlossary('THG').map(e => e.id)).toContain('thg-quote');
    expect(searchGlossary('HHV').map(e => e.id)).toContain('energy-basis');
    expect(searchGlossary('GvO').map(e => e.id)).toContain('go');
    expect(searchGlossary('afkoopsom').map(e => e.id)).toContain('buy-out');
    expect(searchGlossary('retribucion especifica').map(e => e.id)).toContain('reer');
  });

  it('ignores case and accents, and returns everything for an empty query', () => {
    expect(searchGlossary('enagas').map(e => e.id)).toContain('enagas-gdo');
    expect(searchGlossary('  ').length).toBe(GLOSSARY.length);
    expect(searchGlossary('zzzz-not-a-term')).toEqual([]);
  });
});

describe('page guides', () => {
  it('has one guide per route, each a real route', () => {
    const routes = PAGE_GUIDES.map(g => g.route);
    expect(new Set(routes).size).toBe(routes.length);
    for (const r of routes) expect(APP_ROUTES.has(r), `${r} is not in App.tsx`).toBe(true);
  });

  it('points every alias at a route that has a guide', () => {
    for (const [alias, target] of Object.entries(GUIDE_ROUTE_ALIASES)) {
      expect(APP_ROUTES.has(alias), `${alias} is not in App.tsx`).toBe(true);
      expect(PAGE_GUIDES.some(g => g.route === target), `${alias} → ${target} has no guide`).toBe(true);
    }
  });

  it('covers every route in the navigation', () => {
    const navRoutes = [...SIDEBAR_ITEMS.map(i => i.to), ...NAV_GROUPS.flatMap(g => g.items.map(i => i.to))];
    const missing = [...new Set(navRoutes)].filter(r => !getPageGuide(r));
    expect(missing).toEqual([]);
  });

  it('covers every screen the router renders', () => {
    const missing = [...new Set(SCREEN_ROUTES)].filter(r => !getPageGuide(r));
    expect(missing).toEqual([]);
  });

  it('opens the Morning brief guide for the landing page and nested paths resolve to their screen', () => {
    expect(getPageGuide('/')?.route).toBe('/brief');
    expect(getPageGuide('/commercial')?.route).toBe('/sourcing');
    expect(getPageGuide('/marks')?.route).toBe('/pricing');
    expect(getPageGuide('/plants/friedland')?.route).toBe('/plants');
    expect(getPageGuide('/pricing?tab=costs')?.route).toBe('/pricing');
    expect(getPageGuide('/nowhere-at-all')).toBeUndefined();
  });

  it('keeps every text field within its limit', () => {
    const over: string[] = [];
    for (const g of PAGE_GUIDES) {
      if (words(g.purpose) > 40) over.push(`${g.route}.purpose ${words(g.purpose)} words`);
      for (const h of g.howToRead) if (words(h.text) > 50) over.push(`${g.route} › ${h.section} ${words(h.text)} words`);
      for (const t of g.commonTasks) {
        if (t.steps.length < 1 || t.steps.length > 5) over.push(`${g.route} › ${t.question} has ${t.steps.length} steps`);
        for (const s of t.steps) if (words(s) > 20) over.push(`${g.route} › ${t.question} step "${s}" ${words(s)} words`);
      }
      if (g.suggestedQuestions.length < 3 || g.suggestedQuestions.length > 5) over.push(`${g.route} has ${g.suggestedQuestions.length} suggested questions`);
    }
    expect(over).toEqual([]);
  });

  it('resolves every key term and every task link', () => {
    const bad: string[] = [];
    for (const g of PAGE_GUIDES) {
      for (const k of g.keyTerms) if (!GLOSSARY_BY_ID[k]) bad.push(`${g.route} → unknown term ${k}`);
      for (const t of g.commonTasks) if (t.link && !APP_ROUTES.has(pathOf(t.link))) bad.push(`${g.route} → ${t.link}`);
      expect(g.howToRead.length, `${g.route} needs a reading guide`).toBeGreaterThan(0);
      expect(g.commonTasks.length, `${g.route} needs a task`).toBeGreaterThan(0);
    }
    expect(bad).toEqual([]);
  });

  it('types no currency amounts or per-unit prices into the text', () => {
    const hits = guideTexts().filter(t => PRICE_SHAPED.test(t));
    expect(hits).toEqual([]);
  });

  it('explains the Trade Builder checklist and the pricing desk’s mark, cost and assumption split', () => {
    const trade = JSON.stringify(getPageGuide('/trade'));
    for (const needle of ['custody pack', 'PASS', 'FAIL', 'WARN', 'TODO', 'PASS — not yet law', 'GO MWh', 'PoS MWh', 'legal pack']) {
      expect(trade.toLowerCase(), `Trade Builder guide should mention ${needle}`).toContain(needle.toLowerCase());
    }
    const pricing = JSON.stringify(getPageGuide('/pricing'));
    for (const needle of ['marks', 'costs', 'desk assumptions', 'OPEN', 'simulated']) {
      expect(pricing.toLowerCase(), `Pricing guide should mention ${needle}`).toContain(needle.toLowerCase());
    }
  });
});
