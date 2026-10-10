import { test, expect } from '@playwright/test';
import { gotoScreen } from './helpers';

test.describe('Page helper (compact layout)', () => {
  test('a round ? button opens the helper sheet and the dock is not shown', async ({ page }) => {
    await gotoScreen(page, '/trade?marketId=NL_GGE&originCountry=DK&feedstock=manure&ci=-100&volume=15000');
    await expect(page.getByTestId('page-helper')).toHaveCount(0);

    const fab = page.getByTestId('helper-fab');
    await expect(fab).toBeVisible();
    const fabBox = await fab.boundingBox();
    const tabBox = await page.getByTestId('mobile-tabbar').boundingBox();
    expect(fabBox && tabBox && fabBox.y + fabBox.height <= tabBox.y).toBe(true);

    await fab.click();
    const sheet = page.getByTestId('helper-sheet');
    await expect(sheet).toBeVisible();
    await expect(sheet.getByTestId('helper-overview')).toContainText('Trade Builder');
    await expect(sheet.getByTestId('helper-offline-note')).toBeVisible();
    const noOverflow = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
    expect(noOverflow).toBe(true);
  });
});
