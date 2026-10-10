import React from 'react';
import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { StaticRouter } from 'react-router-dom/server';
import { PageHelper } from '../PageHelper';
import { KNOWN_ROUTES } from '../../../domain/help/knownRoutes';

const render = (location: string) =>
  renderToStaticMarkup(
    <StaticRouter location={location}>
      <PageHelper />
    </StaticRouter>
  );

describe('PageHelper capsule', () => {
  it('renders the capsule on every route, closed, with no card', () => {
    for (const route of KNOWN_ROUTES) {
      const html = render(route);
      expect(html, route).toContain('data-testid="page-helper"');
      expect(html, route).toContain('Ask about this page');
      expect(html, route).toContain('data-testid="helper-open"');
      expect(html, route).toContain('aria-expanded="false"');
      expect(html, route).not.toContain('data-testid="helper-card"');
    }
  });
  it('makes no network call while rendering', () => {
    const original = globalThis.fetch;
    globalThis.fetch = (() => { throw new Error('network call'); }) as typeof fetch;
    try { render('/glossary'); } finally { globalThis.fetch = original; }
  });
});
