import { test, expect } from '@playwright/test';
import {
  ROUTES,
  gotoScreen,
  collectPageErrors,
  appErrors,
  expectNoErrorBoundary,
} from './helpers';

/**
 * Every route in App.tsx must actually render.
 *
 * This is the test that did not exist when TradeBuilderScreen sat unrouted while
 * nine screens linked to it. It is deliberately shallow and deliberately total:
 * shallow so it stays true as screens change, total so no route can go missing.
 */
test.describe('every screen loads', () => {
  for (const { path, name } of ROUTES) {
    test(`${name} (${path}) renders without errors`, async ({ page }) => {
      const errors = collectPageErrors(page);

      await gotoScreen(page, path);
      await expectNoErrorBoundary(page);

      // Something substantial painted, not an empty pane.
      const main = page.locator('#main-content');
      await expect(main).toBeVisible();
      expect((await main.innerText()).trim().length, `${path} rendered an empty main pane`)
        .toBeGreaterThan(50);

      expect(appErrors(errors), `${path} logged console errors`).toEqual([]);
    });
  }
});

test('an unknown route redirects to the desk rather than a blank pane', async ({ page }) => {
  await page.goto('/#/briefing'); // a route removed in the cut back to core
  await expect(page.getByText('Loading module...')).toHaveCount(0, { timeout: 15_000 });
  await expect(page).toHaveURL(/#\/$/);
  await expectNoErrorBoundary(page);
});

test('the shell nav reaches every primary workspace', async ({ page }) => {
  const errors = collectPageErrors(page);
  await gotoScreen(page, '/');

  for (const label of ['Sourcing Desk', 'Trade Builder', 'Marks & Broker Run']) {
    await page.getByRole('link', { name: new RegExp(label, 'i') }).first().click();
    await expect(page.getByText('Loading module...')).toHaveCount(0, { timeout: 15_000 });
    await expectNoErrorBoundary(page);
  }

  expect(appErrors(errors)).toEqual([]);
});
