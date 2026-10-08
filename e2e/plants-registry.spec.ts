import { test, expect } from '@playwright/test';
import { gotoScreen, collectPageErrors, appErrors, expectNoErrorBoundary } from './helpers';

test.describe('Plants Registry (1,974 Audited Facilities)', () => {
  test('renders the full registry directory and country macro stats sidebar', async ({ page }) => {
    const errors = collectPageErrors(page);

    await gotoScreen(page, '/plants');
    await expectNoErrorBoundary(page);

    const main = page.locator('#main-content');
    await expect(main).toContainText(/Plants/i);
    await expect(main).toContainText(/1,974 facilities/i);
    // The first facility is auto-selected on load, so the side panel opens on its detail
    // rather than the country totals rail — that rail only shows with nothing selected.
    await expect(main).toContainText(/Supply/i);
    await expect(main).toContainText(/Counterparty/i);

    // Verify table headers
    await expect(main).toContainText('Plant');
    await expect(main).toContainText('Operator');
    await expect(main).toContainText('Output');
    await expect(main).toContainText('Feedstock');

    expect(appErrors(errors)).toEqual([]);
  });

  test('filters plants by text search query and country chips', async ({ page }) => {
    const errors = collectPageErrors(page);
    await gotoScreen(page, '/plants');

    // Filter by country select
    await page.getByLabel('Country', { exact: true }).selectOption('DK');
    await expect(page.locator('.plants-active-chips .chip', { hasText: 'Country: DK' })).toBeVisible();

    const rows = page.locator('[role="listbox"][aria-label="Plant directory"] [role="option"]');
    const dkCount = await rows.count();
    expect(dkCount).toBeGreaterThan(0);

    // Filter by text search
    const searchInput = page.getByTestId('plant-search-input');
    await searchInput.fill('Nature Energy');

    const filteredCount = await rows.count();
    expect(filteredCount).toBeGreaterThan(0);

    // Clear the country filter, then filter by grid tier via the "+ More" popover
    await page.locator('.plants-active-chips button[aria-label="Remove country filter"]').click();
    await searchInput.fill('');
    await page.getByRole('button', { name: '+ More' }).click();
    await page.getByRole('menu').getByRole('combobox').nth(2).selectOption('TSO');
    await expect(page.locator('.plants-active-chips .chip', { hasText: 'Grid: TSO' })).toBeVisible();

    expect(appErrors(errors)).toEqual([]);
  });

  test('opens the facility detail panel and inspects technical attributes', async ({ page }) => {
    const errors = collectPageErrors(page);
    await gotoScreen(page, '/plants');

    // Click first plant row
    const firstRow = page.locator('[role="listbox"][aria-label="Plant directory"] [role="option"]').first();
    await firstRow.click();

    const panel = page.locator('aside.plants-aside');
    await expect(panel).toBeVisible();

    // Verify panel sections
    await expect(panel).toContainText(/Output/i);
    await expect(panel).toContainText(/Capacity/i);
    await expect(panel).toContainText(/CI \(default\)/i);
    await expect(panel).toContainText(/Feedstock/i);
    await expect(panel).toContainText(/Grid operator/i);
    await expect(panel).toContainText(/Legal entity/i);
    await expect(panel).toContainText(/Data quality/i);

    // Selecting a different row swaps the panel to that facility
    const secondRow = page.locator('[role="listbox"][aria-label="Plant directory"] [role="option"]').nth(1);
    const secondName = await secondRow.locator('.ds-row-name').innerText();
    await secondRow.click();
    await expect(panel.locator('.ds-panel-title')).toHaveText(secondName);

    expect(appErrors(errors)).toEqual([]);
  });

  test('shows clean empty state when no facility matches query and resets cleanly', async ({ page }) => {
    const errors = collectPageErrors(page);
    await gotoScreen(page, '/plants');

    const searchInput = page.getByTestId('plant-search-input');
    await searchInput.fill('NonExistentPlantName999XYZ');

    const main = page.locator('#main-content');
    await expect(main).toContainText(/No matching facility/i);

    const clearBtn = page.getByTestId('clear-filter-btn');
    await expect(clearBtn).toBeVisible();
    await clearBtn.click();

    // Reset restores the directory
    await expect(page.locator('[role="listbox"][aria-label="Plant directory"] [role="option"]')).not.toHaveCount(0);

    expect(appErrors(errors)).toEqual([]);
  });
});
