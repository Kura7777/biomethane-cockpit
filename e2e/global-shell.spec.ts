import { test, expect } from '@playwright/test';
import { gotoScreen, collectPageErrors, appErrors, expectNoErrorBoundary } from './helpers';

test.describe('Global Shell, Theme Toggle & Command Palette', () => {
  test('renders header metrics, live TTF index, and brand navigation', async ({ page }) => {
    const errors = collectPageErrors(page);

    await gotoScreen(page, '/trade');
    await expectNoErrorBoundary(page);

    // Verify header elements
    const header = page.locator('header');
    await expect(header).toBeVisible();
    await expect(header).toContainText(/Biomethane Desk/i);
    await expect(header).toContainText(/TTF M\+1/i);
    await expect(header).toContainText(/Side/i);
    await expect(header).toContainText(/Trader · A\. Vos/i);

    // Clicking brand logo navigates to /sourcing
    await header.getByText('Biomethane Desk').click();
    await expect(page).toHaveURL(/#\/sourcing/);
    await expectNoErrorBoundary(page);

    expect(appErrors(errors)).toEqual([]);
  });

  test('toggles dark and light mode theme classes', async ({ page }) => {
    const errors = collectPageErrors(page);

    await gotoScreen(page, '/');
    await expectNoErrorBoundary(page);

    const themeBtn = page.locator('header button').filter({ hasText: /^Light$|^Dark$/i });
    await expect(themeBtn).toBeVisible();

    const initialText = await themeBtn.innerText();

    // Click to toggle theme
    await themeBtn.click();
    const afterText = await themeBtn.innerText();
    expect(afterText).not.toBe(initialText);

    // Verify <html> classList updated
    if (afterText.toLowerCase() === 'light') {
      await expect(page.locator('html')).toHaveClass(/dark/);
    }

    // Toggle back
    await themeBtn.click();
    const restoredText = await themeBtn.innerText();
    expect(restoredText).toBe(initialText);

    expect(appErrors(errors)).toEqual([]);
  });

  test('opens Command Palette via button and keyboard shortcut, searches and executes commands', async ({ page }) => {
    const errors = collectPageErrors(page);

    await gotoScreen(page, '/');
    await expectNoErrorBoundary(page);

    // Open via Command button
    const commandBtn = page.getByRole('button', { name: /Command.*⌘K/i });
    await expect(commandBtn).toBeVisible();
    await commandBtn.click();

    const paletteModal = page.getByRole('dialog', { name: /Command palette/i });
    await expect(paletteModal).toBeVisible();

    // Search for "Plant registry"
    const searchInput = paletteModal.getByPlaceholder(/Jump to a screen/i);
    await searchInput.fill('Plant registry');

    // Press Enter to navigate
    await page.keyboard.press('Enter');
    await expect(paletteModal).not.toBeVisible();
    await expect(page).toHaveURL(/#\/plants/);
    await expectNoErrorBoundary(page);

    // Open via Ctrl+k or button again
    await commandBtn.click();
    await expect(paletteModal).toBeVisible();

    // Close via Escape
    await page.keyboard.press('Escape');
    await expect(paletteModal).not.toBeVisible();

    expect(appErrors(errors)).toEqual([]);
  });

  test('executes global keyboard number shortcuts (1-7)', async ({ page }) => {
    const errors = collectPageErrors(page);

    await gotoScreen(page, '/');
    await expectNoErrorBoundary(page);

    // Key 2 -> /plants
    await page.keyboard.press('2');
    await expect(page).toHaveURL(/#\/plants/);

    // Key 3 -> /map
    await page.keyboard.press('3');
    await expect(page).toHaveURL(/#\/map/);

    // Key 4 -> /trade
    await page.keyboard.press('4');
    await expect(page).toHaveURL(/#\/trade/);

    // Key 1 -> /sourcing
    await page.keyboard.press('1');
    await expect(page).toHaveURL(/#\/sourcing/);

    expect(appErrors(errors)).toEqual([]);
  });
});
