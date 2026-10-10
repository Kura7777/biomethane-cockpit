import React from 'react';
import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { StaticRouter } from 'react-router-dom/server';
import { PageHelper, ASK_ROUTE } from '../PageHelper';
import { AskDeskScreen } from '../AskDeskScreen';
import { appendHelperTurn, clearHelperConversation, getHelperSnapshot, resetHelperStore } from '../helperStore';
import { getPageGuide } from '../../../domain/help/pageGuides';
import { KNOWN_ROUTES } from '../../../domain/help/knownRoutes';

const render = (location: string) =>
  renderToStaticMarkup(
    <StaticRouter location={location}>
      <PageHelper />
    </StaticRouter>
  );

describe('PageHelper capsule', () => {
  it('renders the capsule on every route, closed, with no card', () => {
    for (const route of KNOWN_ROUTES.filter(r => r !== ASK_ROUTE)) {
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

describe('Ask the desk (#/ask)', () => {
  const renderAsk = () =>
    renderToStaticMarkup(
      <StaticRouter location="/ask">
        <AskDeskScreen />
      </StaticRouter>
    );

  it('hides the page capsule on its own screen', () => {
    expect(render(ASK_ROUTE)).toBe('');
  });
  it('opens on the starter questions from the /ask guide, with the input and mode note', () => {
    resetHelperStore();
    const html = renderAsk();
    expect(html).toContain('data-testid="ask-empty"');
    for (const q of getPageGuide(ASK_ROUTE)!.suggestedQuestions) expect(html).toContain(q);
    expect(html).toContain('Ask the desk anything');
    expect(html).toContain('data-testid="helper-offline-note"');
    expect(html).toMatch(/data-testid="ask-new-chat"[^>]*disabled/);
  });
  it('shows the running conversation and New chat clears only that one', () => {
    resetHelperStore();
    appendHelperTurn(ASK_ROUTE, { id: 'a', role: 'user', text: 'What is a GGE?' });
    appendHelperTurn('/trade', { id: 'b', role: 'user', text: 'Why is this blocked?' });
    const html = renderAsk();
    expect(html).toContain('What is a GGE?');
    expect(html).not.toContain('data-testid="ask-empty"');
    expect(html).not.toContain('data-testid="helper-previous"');
    clearHelperConversation(ASK_ROUTE);
    expect(getHelperSnapshot().conversations[ASK_ROUTE]).toBeUndefined();
    expect(getHelperSnapshot().conversations['/trade']).toHaveLength(1);
    resetHelperStore();
  });
});
