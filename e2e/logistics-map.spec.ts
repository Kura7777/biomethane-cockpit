import { test, expect } from '@playwright/test';
import { gotoScreen, collectPageErrors, appErrors, expectNoErrorBoundary } from './helpers';

test.describe('Compliance & Logistics Map', () => {
  test('renders the Pan-European map canvas, zoom controls, and corridor summary', async ({ page }) => {
    const errors = collectPageErrors(page);

    await gotoScreen(page, '/map');
    await expectNoErrorBoundary(page);

    const main = page.locator('#main-content');
    await expect(main).toContainText(/Compliance & logistics map/i);
    await expect(main).toContainText(/Active corridor/i);
    await expect(main).toContainText(/Transit tariff/i);
    await expect(main).toContainText(/Basis to TTF/i);

    // Zoom buttons
    const zoomIn = page.getByRole('button', { name: /Zoom in/i });
    await expect(zoomIn).toBeVisible();
    await zoomIn.click();

    const zoomOut = page.getByRole('button', { name: /Zoom out/i });
    await expect(zoomOut).toBeVisible();
    await zoomOut.click();

    const rst = page.getByRole('button', { name: /Reset view/i });
    await expect(rst).toBeVisible();
    await rst.click();

    expect(appErrors(errors)).toEqual([]);
  });

  test('interacts with origin/target modes and updates the active corridor', async ({ page }) => {
    const errors = collectPageErrors(page);
    await gotoScreen(page, '/map');

    // Click "Set origin"
    const originBtn = page.getByRole('button', { name: /Set origin/i });
    await originBtn.click();
    await expect(originBtn).toHaveClass(/btn-primary/);

    // Click "Set target"
    const targetBtn = page.getByRole('button', { name: /Set target/i });
    await targetBtn.click();
    await expect(targetBtn).toHaveClass(/btn-primary/);

    expect(appErrors(errors)).toEqual([]);
  });

  test('displays delivery options and opens delivery playbook modal', async ({ page }) => {
    const errors = collectPageErrors(page);
    await gotoScreen(page, '/map');

    const main = page.locator('#main-content');
    await expect(main).toContainText(/Delivery options/i);
    await expect(main).toContainText(/Virtual UDB swap/i);
    await expect(main).toContainText(/Continuous grid path/i);
    await expect(main).toContainText(/Physical bio-LNG/i);

    // Open delivery playbook modal
    const playbookBtn = page.getByRole('button', { name: /Open delivery playbook/i });
    await expect(playbookBtn).toBeVisible();
    await playbookBtn.click();

    const modal = page.getByRole('dialog', { name: /delivery playbook/i });
    await expect(modal).toBeVisible();

    const closeBtn = modal.getByRole('button', { name: /Esc ✕|✕|Close/i }).first();
    await closeBtn.click();
    await expect(modal).not.toBeVisible();

    expect(appErrors(errors)).toEqual([]);
  });

  test('simulates trade and navigates into Trade Builder', async ({ page }) => {
    const errors = collectPageErrors(page);
    await gotoScreen(page, '/map');

    const simBtn = page.getByRole('button', { name: /Simulate in trade builder/i });
    await expect(simBtn).toBeVisible();
    await simBtn.click();

    await expect(page).toHaveURL(/#\/trade\?/);
    await expect(page.getByText('Loading module...')).toHaveCount(0, { timeout: 15_000 });
    await expectNoErrorBoundary(page);

    expect(appErrors(errors)).toEqual([]);
  });

  test('validates clean map layout and country selection sidebar', async ({ page }) => {
    const errors = collectPageErrors(page);
    await gotoScreen(page, '/map');
    await expectNoErrorBoundary(page);

    const main = page.locator('#main-content');
    await expect(main).toContainText(/Compliance status/i);
    await expect(main).toContainText(/Active ·/i);
    await expect(main).toContainText(/Restricted ·/i);

    expect(appErrors(errors)).toEqual([]);
  });
});

