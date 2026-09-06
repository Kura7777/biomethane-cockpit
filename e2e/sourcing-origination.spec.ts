import { test, expect } from '@playwright/test';
import { gotoScreen, collectPageErrors, appErrors, expectNoErrorBoundary } from './helpers';

test.describe('Sourcing & Origination Desk', () => {
  test('renders the 4-cell ledger strip and live market metrics', async ({ page }) => {
    const errors = collectPageErrors(page);

    await gotoScreen(page, '/sourcing');
    await expectNoErrorBoundary(page);

    const main = page.locator('#main-content');
    await expect(main).toContainText('1,975');
    await expect(main).toContainText(/Audited facilities/i);
    await expect(main).toContainText(/Peak arbitrage margin/i);
    await expect(main).toContainText(/Prompt TTF gas/i);
    await expect(main).toContainText(/RED III mass balance/i);

    expect(appErrors(errors)).toEqual([]);
  });

  test('interacts with consignment bar controls and recalculates', async ({ page }) => {
    const errors = collectPageErrors(page);
    await gotoScreen(page, '/sourcing');

    // Change target market
    const marketSelect = page.locator('select#om');
    await expect(marketSelect).toBeVisible();
    await marketSelect.selectOption('NL_ERE');

    // Change contract quantity
    const qtyInput = page.locator('input#oq');
    await qtyInput.fill('25,000');

    // Change feedstock substrate
    const feedstockSelect = page.locator('select#of');
    await feedstockSelect.selectOption('food_waste');

    // Change carbon intensity
    const ciInput = page.locator('input#oc');
    await ciInput.fill('−20');

    // Click "Scan European plants"
    const scanBtn = page.getByRole('button', { name: /scan european plants/i });
    await expect(scanBtn).toBeVisible();
    await scanBtn.click();

    // Table recalculates without error
    await expect(page.locator('table.table tbody tr')).not.toHaveCount(0);
    await expectNoErrorBoundary(page);
    expect(appErrors(errors)).toEqual([]);
  });

  test('selects opportunity matrix rows and routes on double click', async ({ page }) => {
    const errors = collectPageErrors(page);
    await gotoScreen(page, '/sourcing');

    const rows = page.locator('table.table tbody tr');
    await expect(rows.first()).toBeVisible();

    // Click row to select
    const secondRow = rows.nth(1);
    await secondRow.click();
    await expect(secondRow).toHaveClass(/selrow/);

    // Double click to route into Trade Builder
    await secondRow.dblclick();
    await expect(page).toHaveURL(/#\/trade\?/);
    await expectNoErrorBoundary(page);

    expect(appErrors(errors)).toEqual([]);
  });

  test('displays blocked opportunity banner with statutory citation', async ({ page }) => {
    const errors = collectPageErrors(page);
    await gotoScreen(page, '/sourcing');

    const main = page.locator('#main-content');
    await expect(main.getByText(/^Blocked$/i).first()).toBeVisible();
    await expect(main).toContainText(/RED III Art\. 28\(2\)/i);

    expect(appErrors(errors)).toEqual([]);
  });
});
