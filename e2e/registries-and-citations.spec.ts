import { test, expect } from '@playwright/test';
import { gotoScreen, collectPageErrors, appErrors, expectNoErrorBoundary } from './helpers';

test.describe('Registries, Citations & Data Provenance', () => {
  test('navigates registries hub views (Registry directory, Route checker, Production statistics, Live data)', async ({ page }) => {
    const errors = collectPageErrors(page);

    await gotoScreen(page, '/registries');
    await expectNoErrorBoundary(page);

    const main = page.locator('#main-content');
    await expect(main).toContainText(/Registries & cross-border routes/i);
    await expect(main).toContainText(/Registry directory/i);

    // Switch to Route checker view
    const routesTab = page.getByRole('button', { name: /^Route checker$/i }).first();
    await routesTab.click();
    await expectNoErrorBoundary(page);
    await expect(main).toContainText(/Origin registry/i);

    // Switch to Production statistics view
    const productionTab = page.getByRole('button', { name: /^Production statistics$/i }).first();
    await productionTab.click();
    await expectNoErrorBoundary(page);
    await expect(main).toContainText(/Only figures directly pulled from a source/i);

    // Switch to Live data view
    const liveTab = page.getByRole('button', { name: /^Live data$/i }).first();
    await liveTab.click();
    await expectNoErrorBoundary(page);
    await expect(main).toContainText(/Denmark — daily biomethane injection/i);

    expect(appErrors(errors)).toEqual([]);
  });

  test('searches statutory citations and copies legal reference', async ({ page }) => {
    const errors = collectPageErrors(page);

    await gotoScreen(page, '/citations');
    await expectNoErrorBoundary(page);

    const main = page.locator('#main-content');
    await expect(main).toContainText(/Statutory register/i);

    // Search for RED III
    const searchInput = page.getByPlaceholder(/Search .* instruments/i);
    await searchInput.fill('RED III');

    // Select citation item
    const citationItem = page.locator('.select-none').filter({ hasText: /RED III/i }).first();
    await citationItem.click();

    await expect(main).toContainText(/Directive \(EU\) 2023\/2413/i);

    // Copy citation
    const copyBtn = page.getByRole('button', { name: /Copy citation/i });
    if (await copyBtn.isVisible()) {
      await copyBtn.click();
    }

    expect(appErrors(errors)).toEqual([]);
  });

  test('filters data sources directory by category chips', async ({ page }) => {
    const errors = collectPageErrors(page);

    await gotoScreen(page, '/data-sources');
    await expectNoErrorBoundary(page);

    const main = page.locator('#main-content');
    await expect(main).toContainText(/Data sources & provenance/i);

    // Filter by Plants
    const plantsChip = page.locator('button.chip').filter({ hasText: /^Plants$/ }).first();
    await plantsChip.click();
    await expect(plantsChip).toHaveClass(/chip-a/);

    // Filter by Pricing
    const pricingChip = page.locator('button.chip').filter({ hasText: /^Pricing$/ }).first();
    await pricingChip.click();
    await expect(pricingChip).toHaveClass(/chip-a/);

    // Filter by Logistics
    const logisticsChip = page.locator('button.chip').filter({ hasText: /^Logistics$/ }).first();
    await logisticsChip.click();
    await expect(logisticsChip).toHaveClass(/chip-a/);

    // Restore All
    const allChip = page.locator('button.chip').filter({ hasText: /^All$/ }).first();
    await allChip.click();
    await expect(allChip).toHaveClass(/chip-a/);

    expect(appErrors(errors)).toEqual([]);
  });
});
