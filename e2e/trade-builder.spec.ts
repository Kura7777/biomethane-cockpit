import { test, expect } from '@playwright/test';
import { gotoScreen, collectPageErrors, appErrors, expectNoErrorBoundary } from './helpers';

test.describe('Trade Builder Screen & Pricing Engine', () => {
  test('renders the 3-column desk grid with live waterfall and metrics', async ({ page }) => {
    const errors = collectPageErrors(page);

    // The desk grid is now a view toggled from the default step-by-step "Deal flow"; ?mode=grid
    // selects it directly (TradeBuilderScreen.tsx reads ?mode= on load).
    await gotoScreen(page, '/trade?marketId=DE_THG&originCountry=DK&feedstock=manure&ci=-100&volume=15000&mode=grid');
    await expectNoErrorBoundary(page);

    const main = page.locator('#main-content');

    // Column 1: Consignment
    await expect(main).toContainText('1Consignment');
    await expect(main).toContainText(/Denmark · \d+ producing facilities/);

    // Column 2: Destination & Legal Validation
    await expect(main).toContainText('2Destination & legal validation');
    await expect(main).toContainText('Germany THG Quota');
    await expect(main).toContainText(/Gate audit · \d+ of \d+ clear/i);

    // Column 3: Netback & Dossier
    await expect(main).toContainText('3Netback & dossier');
    await expect(main).toContainText('Net netback');
    await expect(main).toContainText('Waterfall');
    await expect(main).toContainText('Certificate value');
    await expect(main).toContainText('Producer payable');
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
    await gotoScreen(page, '/trade?marketId=NL_ERE&originCountry=DK&feedstock=manure&ci=-80&mode=grid');

    const saveBtn = page.locator('[data-testid="save-dossier-btn"]').or(page.getByRole('button', { name: /save to blotter/i })).first();
    await expect(saveBtn).toBeVisible();
    await saveBtn.click();

    await expect(page.getByText(/saved to blotter/i)).toBeVisible();
    await expectNoErrorBoundary(page);

    expect(appErrors(errors)).toEqual([]);
  });

  test('opens the EFET Annex document review and exports its PDF', async ({ page }) => {
    const errors = collectPageErrors(page);
    await gotoScreen(page, '/trade?marketId=DE_THG&originCountry=DK&feedstock=manure&ci=-100&mode=grid');

    // The old single "Term Sheet" preview is now a multi-document "Deal Document Drafts" modal;
    // the EFET Annex is opened directly via its own sidebar button. (Not .or(getByRole('button',
    // { name: /efet annex/i })): the "Review Deal Package" button's own visible label also
    // contains the words "EFET Annex" and sits earlier in the DOM, so that union would match it
    // instead and open on the Term Sheet tab.)
    const previewBtn = page.locator('[data-testid="efet-annex-btn"]');
    await expect(previewBtn).toBeVisible();
    await previewBtn.click();

    // Verify modal is open and displays EFET terms
    const modal = page.getByRole('dialog', { name: /deal document drafts/i });
    await expect(modal).toBeVisible();
    await expect(modal).toContainText(/Draft Individual Transaction Confirmation/i);
    await expect(modal).toContainText(/Fingerprint/i);

    // Download PDF from inside modal
    const downloadPromise = page.waitForEvent('download');
    const downloadBtn = modal.getByRole('button', { name: /download draft confirmation/i }).first();
    await downloadBtn.click();
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toMatch(/^Draft-Confirmation-.*\.pdf$/i);

    // Close modal
    const closeBtn = modal.getByRole('button', { name: /Esc ✕|✕|Close/i }).first();
    await closeBtn.click();
    await expect(modal).not.toBeVisible();

    expect(appErrors(errors)).toEqual([]);
  });

  test('opens and closes delivery playbook modal', async ({ page }) => {
    const errors = collectPageErrors(page);
    await gotoScreen(page, '/trade?marketId=DE_THG&originCountry=DK&mode=grid');

    const playbookBtn = page.locator('[data-testid="delivery-playbook-btn"]').or(page.getByRole('button', { name: /delivery|logistics/i })).first();
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

  test('opens PoS certificate ingestion modal and auto-populates consignment', async ({ page }) => {
    const errors = collectPageErrors(page);
    await gotoScreen(page, '/trade');

    const uploaderBtn = page.locator('[data-testid="pos-uploader-btn"]');
    await expect(uploaderBtn).toBeVisible();
    await uploaderBtn.click();

    const modal = page.getByRole('dialog', { name: /Proof of Sustainability/i });
    await expect(modal).toBeVisible();

    // Click Danish sample preset
    const dkSampleBtn = modal.getByText(/Danish Manure/i);
    await dkSampleBtn.click();

    // Verify extraction preview
    await expect(modal).toContainText('ISCC EU');
    await expect(modal).toContainText('-92.5 gCO₂e/MJ');

    // Apply to trade builder
    const applyBtn = modal.locator('[data-testid="pos-apply-btn"]');
    await applyBtn.click();

    await expect(modal).not.toBeVisible();
    await expectNoErrorBoundary(page);
    expect(appErrors(errors)).toEqual([]);
  });
});
