import { test, expect } from '@playwright/test';
import { gotoScreen, collectPageErrors, appErrors, expectNoErrorBoundary } from './helpers';

test.describe('Opportunity Scanner & Netback Ladder', () => {
  test('renders the netback ladder table and summary ledger', async ({ page }) => {
    const errors = collectPageErrors(page);

    await gotoScreen(page, '/scanner');
    await expectNoErrorBoundary(page);

    const main = page.locator('#main-content');
    await expect(main).toContainText(/Netback ladder/i);
    await expect(main).toContainText(/Cost stack/i);
    await expect(main).toContainText(/Blocked opportunity/i);

    // Verify table columns
    await expect(main).toContainText('Market / scheme');
    await expect(main).toContainText('Gates');
    await expect(main).toContainText('Net €/MWh');
    await expect(main).toContainText('Spread vs all-in');

    expect(appErrors(errors)).toEqual([]);
  });

  test('toggles filters to refine arbitrage opportunities', async ({ page }) => {
    const errors = collectPageErrors(page);
    await gotoScreen(page, '/scanner');

    const tableRows = page.locator('table.table tbody tr');
    const initialCount = await tableRows.count();
    expect(initialCount).toBeGreaterThan(0);

    // Toggle "All six gates clear" filter
    const clearedFilter = page.getByText('All six gates clear');
    await clearedFilter.click();
    await expectNoErrorBoundary(page);

    // Toggle "Positive netback only" filter
    const positiveFilter = page.getByText('Positive netback only');
    await positiveFilter.click();
    await expectNoErrorBoundary(page);

    expect(appErrors(errors)).toEqual([]);
  });

  test('switches pricing side between Bid, Mid, and Offer', async ({ page }) => {
    const errors = collectPageErrors(page);
    await gotoScreen(page, '/scanner');

    // Switch to Bid
    const bidOption = page.locator('label.seg-opt').filter({ hasText: /^Bid$/i });
    await bidOption.click();
    await expect(bidOption).toHaveClass(/active/);

    // Switch to Offer
    const offerOption = page.locator('label.seg-opt').filter({ hasText: /^Offer$/i });
    await offerOption.click();
    await expect(offerOption).toHaveClass(/active/);

    expect(appErrors(errors)).toEqual([]);
  });

  test('supports keyboard arrow navigation across ranking ladder', async ({ page }) => {
    const errors = collectPageErrors(page);
    await gotoScreen(page, '/scanner');

    const firstRow = page.locator('table.table tbody tr').first();
    await firstRow.click();
    await expect(firstRow).toHaveClass(/selrow/);

    // Press ArrowDown to select next row
    await page.keyboard.press('ArrowDown');
    const secondRow = page.locator('table.table tbody tr').nth(1);
    await expect(secondRow).toHaveClass(/selrow/);

    expect(appErrors(errors)).toEqual([]);
  });

  test('structures trade and launches Trade Builder', async ({ page }) => {
    const errors = collectPageErrors(page);
    await gotoScreen(page, '/scanner');

    const structureBtn = page.getByRole('button', { name: /structure in trade builder/i }).first();
    await expect(structureBtn).toBeVisible();
    await structureBtn.click();

    await expect(page).toHaveURL(/#\/trade\?/);
    await expect(page.getByText('Loading module...')).toHaveCount(0, { timeout: 15_000 });
    await expectNoErrorBoundary(page);

    expect(appErrors(errors)).toEqual([]);
  });
});
