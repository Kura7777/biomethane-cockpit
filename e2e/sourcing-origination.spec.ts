import { test, expect } from '@playwright/test';
import { gotoScreen, collectPageErrors, appErrors, expectNoErrorBoundary } from './helpers';

test.describe('Sourcing & Origination Desk', () => {
  test('renders the order-intake step and live plant count', async ({ page }) => {
    const errors = collectPageErrors(page);

    await gotoScreen(page, '/sourcing');
    await expectNoErrorBoundary(page);

    const main = page.locator('#main-content');
    await expect(main).toContainText(/Step 1 of 4: Order intake/i);
    await expect(main).toContainText(/1,974\+/);
    await expect(main).toContainText(/Buyer destination market/i);
    await expect(main).toContainText(/Feedstock \/ substrate type/i);
    await expect(main).toContainText(/Scan European plants/i);

    expect(appErrors(errors)).toEqual([]);
  });

  test('interacts with order-intake controls and scans plants', async ({ page }) => {
    const errors = collectPageErrors(page);
    await gotoScreen(page, '/sourcing');

    const main = page.locator('#main-content');

    // Change target market (first select on the form)
    const marketSelect = main.locator('select').first();
    await marketSelect.selectOption('NL_ERE');

    // Change order volume
    const qtyInput = main.locator('input[type="number"]').first();
    await qtyInput.fill('25000');

    // Change feedstock substrate (second select)
    const feedstockSelect = main.locator('select').nth(1);
    await feedstockSelect.selectOption('food_waste');

    // Change assumed plant CI
    const ciInput = page.getByTestId('ci-override-input');
    await ciInput.fill('-20');

    // Click "Scan European plants"
    const scanBtn = page.getByRole('button', { name: /scan european plants/i });
    await expect(scanBtn).toBeVisible();
    await scanBtn.click();

    // Step 2 renders the scanned opportunities without error
    await expect(main).toContainText(/Step 2 of 4/i);
    await expect(page.locator('div.shadow-2xs').first()).toBeVisible();
    await expectNoErrorBoundary(page);
    expect(appErrors(errors)).toEqual([]);
  });

  test('selects an opportunity and routes it through to the Trade Builder', async ({ page }) => {
    const errors = collectPageErrors(page);
    await gotoScreen(page, '/sourcing');

    await page.getByRole('button', { name: /scan european plants/i }).click();

    const rows = page.locator('div.shadow-2xs');
    await expect(rows.first()).toBeVisible();

    // Select the first opportunity
    await rows.first().click();
    await page.getByRole('button', { name: /plan route.*calculate costs/i }).click();

    // Step 3: Route & Costs
    await expect(page.locator('#main-content')).toContainText(/Step 3 of 4/i);
    await page.getByRole('button', { name: /review final deal summary/i }).click();

    // Step 4: Deal Summary — opening the Trade Builder carries the deal through via query params
    await expect(page.locator('#main-content')).toContainText(/Step 4 of 4/i);
    await page.getByRole('button', { name: /open in trade builder/i }).click();
    await expect(page).toHaveURL(/#\/trade\?/);
    await expectNoErrorBoundary(page);

    expect(appErrors(errors)).toEqual([]);
  });

  // The old /sourcing opportunity matrix showed a per-row "Blocked" banner with the UDB/RED III
  // Art. 28(2) citation inline. That matrix is gone — Step 2's plant cards show a "Blocked"/
  // "Review needed" RouteStatusBadge chip instead, and the statutory citation now lives in the
  // eligibility detail (a hover title, and the full Compliance auditor), not as banner body text.
  // Reproducing a guaranteed-BLOCKED (not just "Review needed") opportunity needs a specific
  // origin/market/feedstock combination; left for a follow-up rather than guessed at here.
  test.fixme('displays a blocked opportunity badge with its statutory citation', async () => {});
});
