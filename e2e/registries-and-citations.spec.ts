import { test, expect } from '@playwright/test';
import { gotoScreen, collectPageErrors, appErrors, expectNoErrorBoundary } from './helpers';

test.describe('Registries, Citations & Data Provenance', () => {
  test('navigates registries hub views (Overview, Telemetry, Ingestion, Ledger, Simulator)', async ({ page }) => {
    const errors = collectPageErrors(page);

    await gotoScreen(page, '/registries');
    await expectNoErrorBoundary(page);

    const main = page.locator('#main-content');
    await expect(main).toContainText(/European Registry & Balance of Trade Hub/i);
    await expect(main).toContainText(/22 Jurisdictions|22 National Registries/i);

    // Switch to Live Flow Telemetry view
    const telemetryTab = page.getByRole('button', { name: /Live Flow Telemetry|TSO Feeds/i }).first();
    if (await telemetryTab.isVisible()) {
      await telemetryTab.click();
      await expectNoErrorBoundary(page);
      await expect(main).toContainText(/Pan-European Real-Time TSO Flow Telemetry|Injection Velocity/i);
    }

    // Switch to Ingestion view
    const ingestionTab = page.getByRole('button', { name: /Ingestion/i }).first();
    if (await ingestionTab.isVisible()) {
      await ingestionTab.click();
      await expectNoErrorBoundary(page);
    }

    // Switch to Ledger view
    const ledgerTab = page.getByRole('button', { name: /Ledger/i }).first();
    if (await ledgerTab.isVisible()) {
      await ledgerTab.click();
      await expectNoErrorBoundary(page);
    }

    // Switch to Simulator view
    const simTab = page.getByRole('button', { name: /Simulator/i }).first();
    if (await simTab.isVisible()) {
      await simTab.click();
      await expectNoErrorBoundary(page);
      await expect(main).toContainText(/Transfer Simulator|Cross-Border/i);
    }

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
