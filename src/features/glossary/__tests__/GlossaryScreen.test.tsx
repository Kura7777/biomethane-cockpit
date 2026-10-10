import React from 'react';
import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { StaticRouter } from 'react-router-dom/server';
import { GlossaryScreen } from '../GlossaryScreen';
import { GLOSSARY } from '../../../domain/help/glossary';

const render = (location: string) =>
  renderToStaticMarkup(
    <StaticRouter location={location}>
      <GlossaryScreen />
    </StaticRouter>
  );

describe('GlossaryScreen', () => {
  it('lists every term grouped A–Z with the search box and a count', () => {
    const html = render('/glossary');
    expect(html).toContain('data-testid="glossary-search"');
    expect(html).toContain(`${GLOSSARY.length} terms`);
    for (const e of GLOSSARY) expect(html).toContain(`data-testid="glossary-entry-${e.id}"`);
    expect(html).toContain('id="gl-group-G"');
  });

  it('filters by a search on a term or an abbreviation', () => {
    const html = render('/glossary?q=THG');
    expect(html).toContain('data-testid="glossary-entry-thg-quote"');
    expect(html).not.toContain('data-testid="glossary-entry-ttf"');
    expect(html).toContain('matching');
  });

  it('shows an empty state for a search with no match', () => {
    const html = render('/glossary?q=zzzz-no-such-term');
    expect(html).toContain('data-testid="glossary-empty"');
  });

  it('opens the entry named in the URL and shows its sections', () => {
    const html = render('/glossary?term=gge');
    expect(html).toMatch(/data-testid="glossary-entry-gge"/);
    expect(html).toContain('aria-expanded="true"');
    expect(html).toContain('Why it matters');
    expect(html).toContain('Where in the app');
    expect(html).toContain('Sources');
    expect(html).toContain('Related terms');
  });

  it('opens an entry by an alias in the URL', () => {
    const html = render('/glossary?term=HHV');
    expect(html).toContain('Also called:');
    expect(html).toContain('aria-controls="gl-body-energy-basis"');
    expect(html).toContain('id="gl-body-energy-basis"');
  });

  it('keeps every entry closed when no term is given', () => {
    const html = render('/glossary');
    expect(html).not.toContain('aria-expanded="true"');
  });
});
