import { test, expect } from '@playwright/test';
import { gotoScreen } from './helpers';

test.describe('Page helper (compact layout)', () => {
  test('the Ask capsule opens the helper sheet and there is no desktop card', async ({ page }) => {
    await gotoScreen(page, '/trade?marketId=NL_GGE&originCountry=DK&feedstock=manure&ci=-100&volume=15000');
    await expect(page.getByTestId('page-helper')).toHaveCount(0);

    const fab = page.getByTestId('helper-open');
    await expect(fab).toContainText('Ask');
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

  test('the prompt appears above the Ask capsule after changing screen and stays inside the viewport', async ({ page }) => {
    await gotoScreen(page, '/glossary');
    await page.evaluate(() => { window.location.hash = '#/pricing'; });
    const nudge = page.getByTestId('helper-nudge');
    await expect(nudge).toBeVisible();
    const box = await nudge.boundingBox();
    const vw = page.viewportSize()!.width;
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(vw);
    await page.getByTestId('helper-nudge-yes').click();
    await expect(page.getByTestId('helper-sheet')).toBeVisible();
  });

  test('the Ask capsule never overlaps the tab bar or the sticky action bar', async ({ page }) => {
    await gotoScreen(page, '/trade?marketId=NL_GGE&originCountry=DK&feedstock=manure&ci=-100&volume=15000');
    const box = (sel: string) => page.locator(sel).first().boundingBox();
    const cap = await box('[data-testid="helper-open"]');
    const tab = await box('[data-testid="mobile-tabbar"]');
    expect(cap!.y + cap!.height).toBeLessThanOrEqual(tab!.y);
    const sticky = await box('.m-sticky-actions');
    if (sticky) expect(cap!.y + cap!.height).toBeLessThanOrEqual(sticky.y);
    const vw = page.viewportSize()!.width;
    expect(cap!.x + cap!.width).toBeLessThanOrEqual(vw);
  });
});
