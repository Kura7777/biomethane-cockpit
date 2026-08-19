import { test, expect } from '@playwright/test';
import {
  gotoScreen,
  clearDeskState,
  collectPageErrors,
  appErrors,
  expectNoErrorBoundary,
} from './helpers';

/**
 * What a new user sees.
 *
 * The desk used to start with every mark, FX rate and cost null, so every screen
 * rendered em-dashes and 'Unset' and the only way forward was a low-contrast grey
 * button. It read as broken rather than as principled. It now seeds itself from
 * simulateDesk(), and these tests hold both halves of that bargain: the app is
 * usable immediately, and it says plainly that the numbers are not real.
 */
test.describe('first run on an empty browser', () => {
  test.beforeEach(async ({ page }) => {
    await clearDeskState(page);
  });

  test('opens on the sourcing desk with a working, populated desk', async ({ page }) => {
    const errors = collectPageErrors(page);

    await gotoScreen(page, '/');
    await expectNoErrorBoundary(page);

    // The ticker is the shell's summary of desk state. On an unseeded desk every
    // price here was an em-dash.
    const ticker = page.locator('div').filter({ hasText: /^TTF M\+1/ }).first();
    await expect(ticker).toContainText(/€\d/);

    expect(appErrors(errors)).toEqual([]);
  });

  test('says plainly that the seeded marks are simulated', async ({ page }) => {
    await gotoScreen(page, '/');

    const banner = page.getByText(/running on\s+simulated marks/i);
    await expect(banner).toBeVisible();
    await expect(page.getByRole('button', { name: /enter real marks/i })).toBeVisible();
  });

  test('the simulated-marks banner links to the marks screen', async ({ page }) => {
    await gotoScreen(page, '/');
    await page.getByRole('button', { name: /enter real marks/i }).click();
    await expect(page).toHaveURL(/#\/marks/);
    await expectNoErrorBoundary(page);
  });

  test('a netback computes on first load rather than showing unset', async ({ page }) => {
    await gotoScreen(page, '/trade?marketId=DE_THG&originCountry=DK&feedstock=manure&ci=-100');
    await expectNoErrorBoundary(page);

    const main = page.locator('#main-content');
    await expect(main).toContainText(/€\s?-?[\d,]+\.\d{2}/);
    await expect(main).not.toContainText('NaN');
  });
});
