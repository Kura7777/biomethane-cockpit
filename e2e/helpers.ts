import { Page, expect } from '@playwright/test';

/** The app uses HashRouter, so every route lives after the '#'. */
export const routeUrl = (path: string) => `/#${path}`;

/** Every path declared in src/app/App.tsx, with a heading each screen must show. */
export const ROUTES: { path: string; name: string }[] = [
  { path: '/', name: 'Sourcing desk (landing)' },
  { path: '/sourcing', name: 'Sourcing desk' },
  { path: '/commercial', name: 'Commercial sourcing alias' },
  { path: '/trade', name: 'Trade builder' },
  { path: '/marks', name: 'Marks & broker run' },
  { path: '/pricing', name: 'Pricing desk alias' },
  { path: '/plants', name: 'Plants registry' },
  { path: '/registries', name: 'Registries hub' },
  { path: '/data-sources', name: 'Data sources & provenance' },
  { path: '/provenance', name: 'Provenance alias' },
  { path: '/map', name: 'Compliance & logistics map' },
  { path: '/scanner', name: 'Opportunity scanner' },
  { path: '/risk', name: 'Portfolio risk' },
  { path: '/citations', name: 'Statutory citations' },
  { path: '/settings', name: 'Desk settings' },
  { path: '/ets2', name: 'EU ETS exposure' },
  { path: '/corporate', name: 'Corporate orders' },
  { path: '/value-stack', name: 'Value stack (redirects to Clients)' },
  { path: '/clients', name: 'Clients directory' },
  { path: '/clients?company=edison', name: 'Client company page' },
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
  /Clipboard/i,
  /CORS policy/i,
  /Failed to load resource/i,
  /ERR_FAILED/i,
  /api\.energidataservice\.dk/i,
  /opendatasoft\.com/i,
];

export function appErrors(errors: string[]): string[] {
  return errors.filter(e => !IGNORABLE.some(re => re.test(e)));
}

/** Wait for a screen to finish its lazy chunk + Suspense fallback. */
export async function gotoScreen(page: Page, path: string) {
  await page.goto(routeUrl(path));
  await expect(page.getByText('Loading module...')).toHaveCount(0, { timeout: 15_000 });
  await expect(page.locator('#main-content')).toBeVisible({ timeout: 15_000 });
  // The shell stays up while a screen's lazy chunk loads (Layout.tsx's Suspense), so wait for
  // that screen-level fallback too. The biggest data chunks take a while on a cold cache.
  await expect(page.getByTestId('screen-loading')).toHaveCount(0, { timeout: 45_000 });
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

/**
 * Every real (non-redirect) route in src/app/App.tsx, for the mobile shell/overflow/
 * screenshot sweep in e2e/mobile.spec.ts. ROUTES above predates several screens (the
 * FuelEU desk, the origination pipeline, connectors, assumptions...) and also carries
 * a couple of pure `<Navigate>` aliases (/risk, /value-stack) that render nothing of
 * their own — this list is the routing table's actual surface area, aliases included,
 * redirects excluded.
 */
export const MOBILE_ROUTES: { path: string; name: string }[] = [
  { path: '/', name: 'Sourcing desk (landing)' },
  { path: '/sourcing', name: 'Sourcing desk' },
  { path: '/commercial', name: 'Commercial sourcing alias' },
  { path: '/desk', name: 'Sourcing & origination desk' },
  { path: '/scanner', name: 'Opportunity scanner' },
  { path: '/map', name: 'Compliance & logistics map' },
  { path: '/pricing', name: 'Pricing desk alias' },
  { path: '/marks', name: 'Marks & broker run' },
  { path: '/plants', name: 'Plants registry' },
  { path: '/plants/pipeline', name: 'Origination pipeline (plants alias)' },
  { path: '/origination', name: 'Origination pipeline' },
  { path: '/registries', name: 'Registries hub' },
  { path: '/data-sources', name: 'Data sources & provenance' },
  { path: '/provenance', name: 'Provenance alias' },
  { path: '/fueleu-shipping', name: 'FuelEU Maritime desk' },
  { path: '/ets2', name: 'EU ETS exposure' },
  { path: '/corporate', name: 'Corporate orders' },
  { path: '/clients', name: 'Clients directory' },
  { path: '/trade', name: 'Trade builder' },
  { path: '/citations', name: 'Statutory citations' },
  { path: '/connectors', name: 'Data connectors' },
  { path: '/settings', name: 'Desk settings' },
  { path: '/assumptions', name: 'Assumptions' },
];

/** Wait for network activity to settle after a navigation or interaction. */
export async function waitForIdle(page: Page) {
  await page.waitForLoadState('networkidle').catch(() => {
    /* long-lived polling connections can keep this from ever firing; best-effort only */
  });
}
