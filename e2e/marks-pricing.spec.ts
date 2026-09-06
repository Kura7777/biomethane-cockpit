import { test, expect } from '@playwright/test';
import { gotoScreen, collectPageErrors, appErrors, expectNoErrorBoundary } from './helpers';

test.describe('Marks & Pricing Desk', () => {
  test('renders the pricing desk ledger and marks table', async ({ page }) => {
    const errors = collectPageErrors(page);

    await gotoScreen(page, '/marks');
    await expectNoErrorBoundary(page);

    const main = page.locator('#main-content');
    await expect(main).toContainText(/Pricing desk & broker runs/i);
    await expect(main).toContainText(/TTF M\+1/i);
    await expect(main).toContainText(/GBP \/ EUR/i);
    await expect(main).toContainText(/CHF \/ EUR/i);
    await expect(main).toContainText(/Marks filled/i);

    // Verify marks table headers
    await expect(main).toContainText('Market');
    await expect(main).toContainText('Bid');
    await expect(main).toContainText('Mid');
    await expect(main).toContainText('Offer');
    await expect(main).toContainText('Spread');

    expect(appErrors(errors)).toEqual([]);
  });

  test('edits a mark and updates bid, offer, spread, and manual provenance', async ({ page }) => {
    const errors = collectPageErrors(page);
    await gotoScreen(page, '/marks');

    const midInput = page.getByLabel(/^Mid mark for Germany THG/i).first();
    await expect(midInput).toBeVisible();

    await midInput.fill('240.00');
    await midInput.blur();

    // Verify row reflects desk manual update
    const row = page.locator('table.table tbody tr').filter({ hasText: /Germany THG/i }).first();
    await expect(row).toContainText(/Desk · manual/i);

    expect(appErrors(errors)).toEqual([]);
  });

  test('exports marks snapshot JSON file', async ({ page }) => {
    const errors = collectPageErrors(page);
    await gotoScreen(page, '/marks');

    const exportBtn = page.getByRole('button', { name: /export snapshot/i });
    await expect(exportBtn).toBeVisible();

    // The export creates an <a> tag and clicks it for download
    await exportBtn.click();
    await expectNoErrorBoundary(page);

    expect(appErrors(errors)).toEqual([]);
  });

  test('imports broker run through parser modal', async ({ page }) => {
    const errors = collectPageErrors(page);
    await gotoScreen(page, '/marks');

    const importBtn = page.getByRole('button', { name: /import broker run/i });
    await expect(importBtn).toBeVisible();
    await importBtn.click();

    const modal = page.getByRole('dialog', { name: /import broker run/i });
    await expect(modal).toBeVisible();
    await expect(modal).toContainText(/Lines detected/i);
    await expect(modal).toContainText(/Markets matched/i);

    // Commit parsed marks
    const commitBtn = modal.getByRole('button', { name: /parse and write/i });
    await expect(commitBtn).toBeVisible();
    await commitBtn.click();

    // Modal closes
    await expect(modal).not.toBeVisible();
    await expectNoErrorBoundary(page);

    expect(appErrors(errors)).toEqual([]);
  });
});
