import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { FlowStepsMobile } from '../ui/FlowSteps';

describe('ErrorBoundary resets on route change', () => {
  it('clears a caught error when resetKey changes, and not otherwise', () => {
    const eb = new ErrorBoundary({ children: null, resetKey: '/plants' });
    const setState = vi.fn();
    eb.setState = setState as never;
    eb.state = { hasError: true, error: new Error('boom') };

    Object.assign(eb, { props: { children: null, resetKey: '/plants' } });
    eb.componentDidUpdate({ children: null, resetKey: '/plants' });
    expect(setState).not.toHaveBeenCalled();

    Object.assign(eb, { props: { children: null, resetKey: '/map' } });
    eb.componentDidUpdate({ children: null, resetKey: '/plants' });
    expect(setState).toHaveBeenCalledWith({ hasError: false, error: null });
  });

  it('Layout keys the boundary by pathname', () => {
    const src = readFileSync(resolve(__dirname, '../../app/Layout.tsx'), 'utf8');
    expect(src).toMatch(/<ErrorBoundary key=\{location\.pathname\} resetKey=\{location\.pathname\}>/);
  });
});

describe('FlowSteps (phone layout) can go back', () => {
  const steps = [
    { id: 1, label: 'Origin', summary: 'a' },
    { id: 2, label: 'Route', summary: 'b' },
    { id: 3, label: 'Costs', summary: 'c' },
  ];
  const render = (current: number) =>
    renderToStaticMarkup(
      <FlowStepsMobile steps={steps} current={current} onSelect={() => {}} renderBody={id => <i>body-{id}</i>} ariaLabel="flow" />,
    );

  it('shows no Back control on the first step', () => {
    expect(render(1)).not.toContain('ds-flow-mobile-back');
  });

  it('shows Back to the previous step on later steps', () => {
    const html = render(3);
    expect(html).toContain('ds-flow-mobile-back');
    expect(html).toContain('Back to step 2: Route');
    expect(html).toContain('body-3');
  });
});

describe('security headers', () => {
  const config = JSON.parse(readFileSync(resolve(__dirname, '../../../vercel.json'), 'utf8'));
  const all = config.headers.find((h: { source: string }) => h.source === '/(.*)').headers as { key: string; value: string }[];
  const get = (k: string) => all.find(h => h.key === k)?.value ?? '';

  it('sets CSP, nosniff, referrer policy and frame denial', () => {
    expect(get('Content-Security-Policy')).toContain("default-src 'self'");
    expect(get('Content-Security-Policy')).toContain("script-src 'self'");
    expect(get('Content-Security-Policy')).toContain("frame-ancestors 'none'");
    expect(get('X-Content-Type-Options')).toBe('nosniff');
    expect(get('Referrer-Policy')).toBe('no-referrer');
    expect(get('X-Frame-Options')).toBe('DENY');
  });

  it('allows every origin the app fetches from', () => {
    const csp = get('Content-Security-Policy');
    for (const origin of ['api.anthropic.com', 'generativelanguage.googleapis.com', 'api.energidataservice.dk', 'odre.opendatasoft.com']) {
      expect(csp).toContain(origin);
    }
  });
});
