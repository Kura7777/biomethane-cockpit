import { test, expect } from '@playwright/test';
import { gotoScreen, collectPageErrors, appErrors, expectNoErrorBoundary } from './helpers';

test.describe('Marks & Pricing Desk', () => {
  test('renders the pricing desk ledger and marks table', async ({ page }) => {
    const errors = collectPageErrors(page);

    await gotoScreen(page, '/marks');
    await expectNoErrorBoundary(page);

    const main = page.locator('#main-content');
    await expect(main).toContainText(/Pricing Desk & Master Order Book/i);
    await expect(main).toContainText(/TTF M\+1/i);
    await expect(main).toContainText(/GBP \/ EUR/i);

    // Verify the order-book table headers
    await expect(main).toContainText('Country');
    await expect(main).toContainText('Class');
    await expect(main).toContainText('BID Price');
    await expect(main).toContainText('OFFER Price');
    await expect(main).toContainText('Mark');

    expect(appErrors(errors)).toEqual([]);
  });

  test('sets a broker quote as a market\'s reference mark', async ({ page }) => {
    const errors = collectPageErrors(page);
    await gotoScreen(page, '/marks');

    // The order book's quotes are sourced, read-only broker data; the desk's one editable action
    // per market is picking which quote row feeds the deal engines as that market's reference mark.
    const useAsMarkBtn = page.getByRole('button', { name: 'Use as mark' }).first();
    await expect(useAsMarkBtn).toBeVisible();
    const row = useAsMarkBtn.locator('xpath=ancestor::tr');
    const rowIndex = await page.locator('tbody tr').evaluateAll(
      (rows, target) => rows.indexOf(target as HTMLTableRowElement),
      await row.elementHandle(),
    );
    await useAsMarkBtn.click();

    await expect(page.getByText(/Set as .+ reference mark/i)).toBeVisible();
    await expect(page.locator('tbody tr').nth(rowIndex)).toContainText('★ Ref');

    expect(appErrors(errors)).toEqual([]);
  });

  test('exports marks snapshot JSON file', async ({ page }) => {
    const errors = collectPageErrors(page);
    await gotoScreen(page, '/marks');

    const exportBtn = page.getByRole('button', { name: /export order book csv/i });
    await expect(exportBtn).toBeVisible();

    // The export creates an <a> tag and clicks it for download
    await exportBtn.click();
    await expectNoErrorBoundary(page);

    expect(appErrors(errors)).toEqual([]);
  });

  test('imports broker run through parser modal', async ({ page }) => {
    const errors = collectPageErrors(page);
    await gotoScreen(page, '/marks');

    const importBtn = page.getByRole('button', { name: /paste broker run/i });
    await expect(importBtn).toBeVisible();
    await importBtn.click();

    const modal = page.getByRole('dialog', { name: /import broker run/i });
    await expect(modal).toBeVisible();

    // The importer starts empty; paste a run with its own dated header so the commit button enables.
    await modal.locator('#brokerRun').fill('Run dated 2026-09-12\nDE THG  280.00 / 290.00');

    await expect(modal).toContainText(/Lines detected/i);
    await expect(modal).toContainText(/Markets matched/i);

    // Commit parsed marks
    const commitBtn = modal.getByRole('button', { name: /parse and write/i });
    await expect(commitBtn).toBeEnabled();
    await commitBtn.click();

    // Modal closes
    await expect(modal).not.toBeVisible();
    await expectNoErrorBoundary(page);

    expect(appErrors(errors)).toEqual([]);
  });
});
