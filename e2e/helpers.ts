import { Page, expect } from '@playwright/test';

/** The app uses HashRouter, so every route lives after the '#'. */
export const routeUrl = (path: string) => `/#${path}`;

/** Every path declared in src/app/App.tsx, with a heading each screen must show. */
export const ROUTES: { path: string; name: string }[] = [
  { path: '/', name: 'Sourcing desk (landing)' },
  { path: '/sourcing', name: 'Sourcing desk' },
  { path: '/trade', name: 'Trade builder' },
  { path: '/marks', name: 'Marks & broker run' },
  { path: '/plants', name: 'Plants & registries' },
  { path: '/map', name: 'Grid map' },
  { path: '/scanner', name: 'Arbitrage scanner' },
  { path: '/library', name: 'Dossier library' },
  { path: '/citations', name: 'Statutory citations' },
  { path: '/settings', name: 'Desk settings' },
];

/**
 * Collect console errors and uncaught exceptions for the life of the page.
 *
 * A React screen that throws inside render is caught by the ErrorBoundary and
 * still paints a shell around the failure, so "the page loaded" proves very
 * little on its own. The console is where that shows up.
 */
export function collectPageErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  page.on('pageerror', err => errors.push(`Uncaught: ${err.message}`));
  return errors;
}

/** Errors that are environmental rather than the app's fault. */
const IGNORABLE = [
  /favicon/i,
  /Download the React DevTools/i,
  /\[vite\]/i,
];

export function appErrors(errors: string[]): string[] {
  return errors.filter(e => !IGNORABLE.some(re => re.test(e)));
}

/** Wait for a screen to finish its lazy chunk + Suspense fallback. */
export async function gotoScreen(page: Page, path: string) {
  await page.goto(routeUrl(path));
  await expect(page.getByText('Loading module...')).toHaveCount(0, { timeout: 15_000 });
  await expect(page.locator('#main-content')).toBeVisible({ timeout: 15_000 });
}

/** Assert the screen rendered rather than crashing into the ErrorBoundary. */
export async function expectNoErrorBoundary(page: Page) {
  await expect(
    page.getByText('Application Error'),
    'the screen threw during render and fell back to the ErrorBoundary'
  ).toHaveCount(0);
}

/** Wipe desk state so a test sees a genuine first run. */
export async function clearDeskState(page: Page) {
  await page.addInitScript(() => {
    try {
      window.localStorage.clear();
    } catch {
      /* storage unavailable — the app falls back to defaults, which is what we want */
    }
  });
}
