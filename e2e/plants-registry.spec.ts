import { test, expect } from '@playwright/test';
import { gotoScreen, collectPageErrors, appErrors, expectNoErrorBoundary } from './helpers';

test.describe('Plants Registry (1,975 Audited Facilities)', () => {
  test('renders the full registry directory and country macro stats sidebar', async ({ page }) => {
    const errors = collectPageErrors(page);

    await gotoScreen(page, '/plants');
    await expectNoErrorBoundary(page);

    const main = page.locator('#main-content');
    await expect(main).toContainText(/Plant registry/i);
    await expect(main).toContainText(/1,975 facilities/i);
    await expect(main).toContainText(/Country totals/i);

    // Verify table headers
    await expect(main).toContainText('Facility');
    await expect(main).toContainText('Operator');
    await expect(main).toContainText('Nm³/h');
    await expect(main).toContainText('GWh/y');
    await expect(main).toContainText('Feedstock');

    expect(appErrors(errors)).toEqual([]);
  });

  test('filters plants by text search query and country chips', async ({ page }) => {
    const errors = collectPageErrors(page);
    await gotoScreen(page, '/plants');

    // Filter by country chip "DK"
    const dkChip = page.locator('button.chip').filter({ hasText: /DK/ }).first();
    await dkChip.click();
    await expect(dkChip).toHaveClass(/chip-a/);

    const rows = page.locator('table.table tbody tr');
    const dkCount = await rows.count();
    expect(dkCount).toBeGreaterThan(0);

    // Filter by text search
    const searchInput = page.getByPlaceholder(/Filter facility name/i);
    await searchInput.fill('Nature Energy');

    const filteredCount = await page.locator('table.table tbody tr').count();
    expect(filteredCount).toBeGreaterThan(0);

    // Filter by "Grid Injected" chip
    const injectedChip = page.locator('button.chip').filter({ hasText: /Grid Injected/i }).first();
    await injectedChip.click();
    await expect(injectedChip).toHaveClass(/chip-a/);

    expect(appErrors(errors)).toEqual([]);
  });

  test('opens detailed facility record modal and inspects technical attributes', async ({ page }) => {
    const errors = collectPageErrors(page);
    await gotoScreen(page, '/plants');

    // Click first plant row
    const firstRow = page.locator('table.table tbody tr').first();
    await firstRow.click();

    const modal = page.getByRole('dialog', { name: /Facility record/i });
    await expect(modal).toBeVisible();

    // Verify modal sections
    await expect(modal).toContainText(/Operator/i);
    await expect(modal).toContainText(/Capacity Nm³\/h/i);
    await expect(modal).toContainText(/Annual energy GWh/i);
    await expect(modal).toContainText(/Feedstock/i);
    await expect(modal).toContainText(/Upgrading technology/i);
    await expect(modal).toContainText(/Grid connection/i);
    await expect(modal).toContainText(/Registry/i);
    await expect(modal).toContainText(/GIE \/ EBA European Biomethane Map 2026/i);

    // Close modal via Escape key
    await page.keyboard.press('Escape');
    await expect(modal).not.toBeVisible();

    expect(appErrors(errors)).toEqual([]);
  });

  test('shows clean empty state when no facility matches query and resets cleanly', async ({ page }) => {
    const errors = collectPageErrors(page);
    await gotoScreen(page, '/plants');

    const searchInput = page.getByPlaceholder(/Filter facility name/i);
    await searchInput.fill('NonExistentPlantName999XYZ');

    const main = page.locator('#main-content');
    await expect(main).toContainText(/No matching facility/i);

    const clearBtn = page.getByRole('button', { name: /Clear filter/i });
    await expect(clearBtn).toBeVisible();
    await clearBtn.click();

    // Reset restores table
    await expect(page.locator('table.table tbody tr')).not.toHaveCount(0);

    expect(appErrors(errors)).toEqual([]);
  });
});
