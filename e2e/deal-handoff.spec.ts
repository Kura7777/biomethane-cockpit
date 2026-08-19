import { test, expect, Page } from '@playwright/test';
import { gotoScreen, collectPageErrors, appErrors, expectNoErrorBoundary } from './helpers';

/**
 * The regression suite for the disconnect this work set out to fix.
 *
 * `/trade` used to render the Sourcing desk while nine screens linked to it, and
 * the two screens read different query-param vocabularies — so `scheme`, `coc` and
 * `deliveryPeriod` were emitted by three callers and understood by neither
 * destination. Every assertion here is a field that used to be dropped in transit.
 */

/** Read the pressed state of one of the builder's toggle buttons. */
async function isPressed(page: Page, name: string | RegExp): Promise<boolean> {
  const button = page.getByRole('button', { name }).first();
  await expect(button).toBeVisible();
  return (await button.getAttribute('aria-pressed')) === 'true';
}

test.describe('deal parameters survive the handoff', () => {
  test('every contract field lands in the builder', async ({ page }) => {
    const errors = collectPageErrors(page);

    await gotoScreen(
      page,
      '/trade?marketId=NL_ERE&originCountry=SE&feedstock=food_waste&ci=-25' +
        '&volume=60000&scheme=REDCERT_EU&coc=BOOK_AND_CLAIM' +
        '&deliveryPeriod=Cal-2027&counterparty=Vitol%20Biogas'
    );
    await expectNoErrorBoundary(page);

    // The three that used to vanish.
    expect(await isPressed(page, /REDCERT EU/i), 'scheme was dropped in transit').toBe(true);
    expect(await isPressed(page, /Book & claim/i), 'chain of custody was dropped in transit').toBe(true);
    expect(await isPressed(page, '2027'), 'delivery period was dropped in transit').toBe(true);

    // And the rest of the contract.
    await expect(page.getByPlaceholder(/Offtake Counterparty|Shell Energy/i)).toHaveValue('Vitol Biogas');
    await expect(page.locator('#main-content')).toContainText('NL ERE');
    await expect(page.locator('#main-content')).toContainText('60,000');

    expect(appErrors(errors)).toEqual([]);
  });

  test('an unspecified field keeps its default rather than blanking out', async ({ page }) => {
    await gotoScreen(page, '/trade?marketId=DE_THG');
    await expectNoErrorBoundary(page);

    expect(await isPressed(page, /ISCC EU/i)).toBe(true);
    expect(await isPressed(page, /Mass balance/i)).toBe(true);
  });

  test('an unknown market keeps the current selection instead of emptying the deal', async ({ page }) => {
    const errors = collectPageErrors(page);
    await gotoScreen(page, '/trade?marketId=NOT_A_REAL_MARKET&originCountry=DK');
    await expectNoErrorBoundary(page);

    // Still a working builder on some real market, not a blank pane.
    await expect(page.locator('#main-content')).toContainText(/netback/i);
    expect(appErrors(errors)).toEqual([]);
  });

  test('a non-numeric volume does not reach the screen as NaN', async ({ page }) => {
    await gotoScreen(page, '/trade?marketId=DE_THG&volume=abc&ci=xyz');
    await expectNoErrorBoundary(page);
    await expect(page.locator('#main-content')).not.toContainText('NaN');
  });
});

test.describe('entry points reach the builder', () => {
  test('the scanner hands its selected market to the builder', async ({ page }) => {
    const errors = collectPageErrors(page);
    await gotoScreen(page, '/scanner');

    const build = page.getByRole('button', { name: /build trade dossier/i }).first();
    await expect(build).toBeVisible();
    await build.click();

    await expect(page).toHaveURL(/#\/trade\?/);
    await expect(page.getByText('Loading module...')).toHaveCount(0, { timeout: 15_000 });
    await expectNoErrorBoundary(page);

    // Landed on the builder, not the sourcing desk it used to land on.
    await expect(page.locator('#main-content')).toContainText(/deal ticket preview/i);
    expect(appErrors(errors)).toEqual([]);
  });

  test('the dossier library reopens a saved deal in the builder', async ({ page }) => {
    const errors = collectPageErrors(page);

    // Each test gets a clean browser context, so the library starts empty. File a
    // dossier first — exporting a term sheet saves one — then reopen it.
    await gotoScreen(page, '/trade?marketId=IT_CIC&originCountry=DK&feedstock=manure&ci=-100');
    await page.getByRole('button', { name: /deal ticket preview/i }).first().click();
    const download = page.waitForEvent('download');
    await page.getByRole('button', { name: /confirm & export term sheet/i }).click();
    await download;

    await gotoScreen(page, '/library');
    const reopen = page.getByRole('button', { name: /^open$/i }).first();
    await expect(reopen).toBeVisible();
    await reopen.click();

    await expect(page).toHaveURL(/#\/trade\?/);
    await expect(page.getByText('Loading module...')).toHaveCount(0, { timeout: 15_000 });
    await expectNoErrorBoundary(page);
    // The saved dossier's market and origin came back with it.
    await expect(page.locator('#main-content')).toContainText('Italy CIC');
    await expect(page.locator('#main-content')).toContainText('Denmark');

    expect(appErrors(errors)).toEqual([]);
  });
});
