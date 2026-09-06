import { test, expect } from '@playwright/test';
import { gotoScreen, collectPageErrors, appErrors, expectNoErrorBoundary } from './helpers';

test.describe('Trade Builder Screen & Pricing Engine', () => {
  test('renders the 3-column layout with live waterfall and metrics', async ({ page }) => {
    const errors = collectPageErrors(page);

    await gotoScreen(page, '/trade?marketId=DE_THG&originCountry=DK&feedstock=manure&ci=-100&volume=15000');
    await expectNoErrorBoundary(page);

    const main = page.locator('#main-content');

    // Column 1: Consignment
    await expect(main).toContainText('1Consignment');
    await expect(main).toContainText(/Denmark · \d+ producing facilities/);

    // Column 2: Destination & Legal Validation
    await expect(main).toContainText('2Destination & legal validation');
    await expect(main).toContainText('Germany THG Quota');
    await expect(main).toContainText(/Six-gate audit/i);

    // Column 3: Netback & Dossier
    await expect(main).toContainText('3Netback & dossier');
    await expect(main).toContainText('Net netback');
    await expect(main).toContainText('Waterfall');
    await expect(main).toContainText('Certificate value');
    await expect(main).toContainText('Delivered cost');
    await expect(main).toContainText('15,000 MWh');

    expect(appErrors(errors)).toEqual([]);
  });

  test('dynamically recalculates compliance and netback when switching feedstock & origin', async ({ page }) => {
    const errors = collectPageErrors(page);
    await gotoScreen(page, '/trade?marketId=DE_THG&originCountry=DK&feedstock=manure&ci=-100');

    // Switch origin to GB (isolated origin)
    const gbChip = page.locator('button.chip').filter({ hasText: /GB/ }).first();
    await gbChip.click();

    // Verification: Non-EU grid injection triggers block/warning on EU compliance markets
    const main = page.locator('#main-content');
    await expect(main).toContainText(/United Kingdom/i);
    await expect(main).toContainText(/Blocked|Conditional/i);

    // Switch feedstock to Energy crops (non-Annex IX)
    const cropsChip = page.locator('button.chip').filter({ hasText: /Energy crops/i }).first();
    await cropsChip.click();

    // Verify 6-gate audit reflects crop status
    await expect(main).toContainText(/Energy crops/i);

    expect(appErrors(errors)).toEqual([]);
  });

  test('saves dossier and confirms with desk notification toast', async ({ page }) => {
    const errors = collectPageErrors(page);
    await gotoScreen(page, '/trade?marketId=NL_ERE&originCountry=DK&feedstock=manure&ci=-80');

    const saveBtn = page.getByRole('button', { name: /save dossier/i });
    await expect(saveBtn).toBeVisible();
    await saveBtn.click();

    await expect(page.getByText(/dossier saved/i)).toBeVisible();
    await expectNoErrorBoundary(page);

    expect(appErrors(errors)).toEqual([]);
  });

  test('opens EFET term sheet preview modal and exports PDF successfully', async ({ page }) => {
    const errors = collectPageErrors(page);
    await gotoScreen(page, '/trade?marketId=DE_THG&originCountry=DK&feedstock=manure&ci=-100');

    const previewBtn = page.getByRole('button', { name: /term sheet/i });
    await expect(previewBtn).toBeVisible();
    await previewBtn.click();

    // Verify modal is open and displays EFET terms
    const modal = page.getByRole('dialog', { name: /efet biomethane/i });
    await expect(modal).toBeVisible();
    await expect(modal).toContainText(/EFET Biomethane Annex & Transaction Confirmation/i);
    await expect(modal).toContainText(/SHA-256/i);

    // Download PDF from inside modal
    const downloadPromise = page.waitForEvent('download');
    const downloadBtn = modal.getByRole('button', { name: /download pdf/i }).first();
    await downloadBtn.click();
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toMatch(/^EFET-Biomethane-.*\.pdf$/i);

    // Close modal
    const closeBtn = modal.getByRole('button', { name: /Esc ✕|✕|Close/i }).first();
    await closeBtn.click();
    await expect(modal).not.toBeVisible();

    expect(appErrors(errors)).toEqual([]);
  });

  test('opens and closes delivery playbook modal', async ({ page }) => {
    const errors = collectPageErrors(page);
    await gotoScreen(page, '/trade?marketId=DE_THG&originCountry=DK');

    const playbookBtn = page.getByRole('button', { name: /delivery|logistics/i });
    await expect(playbookBtn).toBeVisible();
    await playbookBtn.click();

    const modal = page.getByRole('dialog', { name: /delivery playbook/i });
    await expect(modal).toBeVisible();
    await expect(modal).toContainText(/DK → DE/i);

    // Close modal
    const closeBtn = modal.getByRole('button', { name: /Esc ✕|✕|Close/i }).first();
    await closeBtn.click();
    await expect(modal).not.toBeVisible();

    expect(appErrors(errors)).toEqual([]);
  });
});
