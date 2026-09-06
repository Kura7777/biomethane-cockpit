import { test, expect } from '@playwright/test';
import {
  ROUTES,
  gotoScreen,
  collectPageErrors,
  appErrors,
  expectNoErrorBoundary,
} from './helpers';

/**
 * 1. Screen Rendering & Route Health Suite
 *
 * Every route in App.tsx must actually render without console errors
 * or ErrorBoundary exceptions.
 */
test.describe('Screen Rendering & Route Health', () => {
  for (const { path, name } of ROUTES) {
    test(`${name} (${path}) renders without errors`, async ({ page }) => {
      const errors = collectPageErrors(page);

      await gotoScreen(page, path);
      await expectNoErrorBoundary(page);

      // Verify substantial content painted, not an empty pane
      const main = page.locator('#main-content');
      await expect(main).toBeVisible();
      const content = await main.innerText();
      expect(content.trim().length, `${path} rendered an empty main pane`).toBeGreaterThan(30);

      expect(appErrors(errors), `${path} logged console errors`).toEqual([]);
    });
  }

  test('an unknown route redirects to the desk landing rather than a blank pane', async ({ page }) => {
    await page.goto('/#/unknown-desk-route-404');
    await expect(page.getByText('Loading module...')).toHaveCount(0, { timeout: 15_000 });
    await expect(page).toHaveURL(/#\/$/);
    await expectNoErrorBoundary(page);
    await expect(page.locator('#main-content')).toBeVisible();
  });

  test('the shell nav tabs reach all primary workspaces', async ({ page }) => {
    const errors = collectPageErrors(page);
    await gotoScreen(page, '/');

    const navLabels = [
      'Origination',
      'Scanner',
      'Trade builder',
      'Pricing desk',
      'Plants',
      'Registries',
      'Map',
      'Citations',
      'Sources',
    ];

    for (const label of navLabels) {
      const link = page.getByRole('link', { name: new RegExp(`^${label}$`, 'i') }).first();
      await expect(link).toBeVisible();
      await link.click();
      await expect(page.getByText('Loading module...')).toHaveCount(0, { timeout: 15_000 });
      await expectNoErrorBoundary(page);
      await expect(page.locator('#main-content')).toBeVisible();
    }

    expect(appErrors(errors)).toEqual([]);
  });
});
