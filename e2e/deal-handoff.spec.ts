import { test, expect, Page } from '@playwright/test';
import { gotoScreen, collectPageErrors, appErrors, expectNoErrorBoundary } from './helpers';

/** Check if a chip button is active (has chip-a class) */
async function isChipActive(page: Page, text: string | RegExp): Promise<boolean> {
  const chip = page.locator('button.chip').filter({ hasText: text }).first();
  await expect(chip).toBeVisible();
  const classes = (await chip.getAttribute('class')) || '';
  return classes.includes('chip-a');
}

test.describe('Deal Handoff & Query Parameter Survival', () => {
  test('every contract field lands in the trade builder from URL query params', async ({ page }) => {
    const errors = collectPageErrors(page);

    await gotoScreen(
      page,
      '/trade?marketId=NL_ERE&originCountry=SE&feedstock=food_waste&ci=-25' +
        '&volume=60000&scheme=REDCERT_EU&coc=BOOK_AND_CLAIM'
    );
    await expectNoErrorBoundary(page);

    // Origin
    expect(await isChipActive(page, /🇸🇪/), 'Origin SE was not selected').toBe(true);

    // Feedstock
    expect(await isChipActive(page, /Food waste/i), 'Feedstock Food waste was not selected').toBe(true);

    // Scheme
    expect(await isChipActive(page, /REDcert EU/i), 'Scheme REDcert EU was not selected').toBe(true);

    // Chain of Custody
    expect(await isChipActive(page, /Book & claim/i), 'Chain of custody Book & claim was not selected').toBe(true);

    // Target Market
    expect(await isChipActive(page, /NL ERE/i), 'Market NL ERE was not selected').toBe(true);

    // Volume & CI
    const main = page.locator('#main-content');
    await expect(main).toContainText('60,000 MWh');
    await expect(main).toContainText('−25');

    expect(appErrors(errors)).toEqual([]);
  });

  test('an unspecified field keeps its standard default', async ({ page }) => {
    await gotoScreen(page, '/trade?marketId=DE_THG');
    await expectNoErrorBoundary(page);

    expect(await isChipActive(page, /ISCC EU/i)).toBe(true);
    expect(await isChipActive(page, /Mass balance/i)).toBe(true);
    expect(await isChipActive(page, /🇩🇰/)).toBe(true);
  });

  test('an unknown market keeps safe fallback and does not crash', async ({ page }) => {
    const errors = collectPageErrors(page);
    await gotoScreen(page, '/trade?marketId=NON_EXISTENT_MARKET_XYZ&originCountry=DK');
    await expectNoErrorBoundary(page);

    await expect(page.locator('#main-content')).toContainText(/Net netback/i);
    expect(appErrors(errors)).toEqual([]);
  });

  test('a non-numeric volume does not reach the screen as NaN', async ({ page }) => {
    await gotoScreen(page, '/trade?marketId=DE_THG&volume=invalid_volume&ci=invalid_ci');
    await expectNoErrorBoundary(page);
    await expect(page.locator('#main-content')).not.toContainText('NaN');
  });

  test('the scanner hands its selected market and consignment to the builder', async ({ page }) => {
    const errors = collectPageErrors(page);
    await gotoScreen(page, '/scanner');

    const structureBtn = page.getByRole('button', { name: /structure in trade builder/i }).first();
    await expect(structureBtn).toBeVisible();
    await structureBtn.click();

    await expect(page).toHaveURL(/#\/trade\?/);
    await expect(page.getByText('Loading module...')).toHaveCount(0, { timeout: 15_000 });
    await expectNoErrorBoundary(page);

    await expect(page.locator('#main-content')).toContainText(/Destination & legal validation/i);
    expect(appErrors(errors)).toEqual([]);
  });

  test('the sourcing desk double click hands consignment to the builder', async ({ page }) => {
    const errors = collectPageErrors(page);
    await gotoScreen(page, '/sourcing');

    const firstRow = page.locator('table tbody tr[data-click="1"]').first();
    await expect(firstRow).toBeVisible({ timeout: 10_000 });
    await firstRow.dblclick();

    await expect(page).toHaveURL(/#\/trade\?/);
    await expect(page.getByText('Loading module...')).toHaveCount(0, { timeout: 15_000 });
    await expectNoErrorBoundary(page);

    await expect(page.locator('#main-content')).toContainText(/Net netback/i);
    expect(appErrors(errors)).toEqual([]);
  });
});
