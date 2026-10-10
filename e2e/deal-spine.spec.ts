import { test, expect } from '@playwright/test';
import { gotoScreen, clearDeskState, collectPageErrors, appErrors } from './helpers';

/**
 * Walks a deal end to end the way a trader would — plant first, and buyer first — checking
 * that the fields recorded at each hand-off (Why: CI, volume, counterparty, desk margin) survive
 * the trip from Plants/Corporate orders through Origination/Map, into the Trade Builder, and
 * into the blotter. Findings #1-#3 (see deal-walk-report.md) were pinned with test.fail() guards
 * until fixed in the spine-fix job; they now run as ordinary passing assertions.
 *
 * Runs against a fresh desk (cleared localStorage) so the Pricing desk → Costs override below is
 * the only non-default assumption in play, and against the production build per playwright.config.ts.
 */

test.describe('Deal spine: plant first', () => {
  test('plant -> map -> trade builder carries the plant\'s name and feedstock-default CI (Finding #2, fixed)', async ({ page }) => {
    await clearDeskState(page);
    const errors = collectPageErrors(page);

    // Set a desk-wide cost by hand so we can check every downstream screen reads it.
    await gotoScreen(page, '/pricing?tab=costs');
    const registryTransfer = page.getByLabel('Registry transfer');
    await registryTransfer.waitFor({ state: 'visible' });
    await registryTransfer.fill('1.5');

    // Plants: filter to Denmark and read the first manure plant's row. The desk's 2026-10-08
    // decision means every plant's displayed CI is the flat feedstock default (manure: -100).
    await gotoScreen(page, '/plants');
    await page.getByLabel('Country').first().selectOption('DK');
    const firstRow = page.locator('[role="option"], .ds-row').first();
    await expect(firstRow).toBeVisible();
    const rowText = await firstRow.innerText();
    const plantName = rowText.split('\n')[0].trim();
    expect(plantName.length, 'could not read a plant name from the Plants row').toBeGreaterThan(0);
    expect(rowText, 'a DK plant\'s CI chip should show the manure feedstock default (-100), not a per-plant census value').toContain('100.0');

    // "Where can this gas go?" now passes the plant id along with the origin country.
    await firstRow.click();
    const corridorLink = page.getByRole('button', { name: 'Where can this gas go?' }).first();
    await corridorLink.click();
    await page.waitForLoadState('networkidle').catch(() => {});
    expect(page.url(), 'the Plants -> Map hand-off should carry both origin and plant').toMatch(/\/map\?origin=DK&plant=/);

    // Map: the playbook card should say which plant this corridor was sourced from, and send that
    // plant on into the Trade Builder exactly the way "Germany THG" does.
    await expect(page.getByTestId('trade-playbook-card')).toContainText('Sourced from');
    const setTarget = new URL(page.url().replace('#', ''));
    setTarget.searchParams.set('target', 'DE');
    setTarget.searchParams.set('filter', 'ALL');
    await gotoScreen(page, `/map?${setTarget.searchParams.toString()}`);
    const tradeBtn = page.getByRole('button', { name: /Trade/ }).first();
    await tradeBtn.waitFor({ state: 'visible' });
    await tradeBtn.click();
    await page.waitForLoadState('networkidle').catch(() => {});

    // The Trade Builder now sees the plant: its name reaches the Product step, and the CI is the
    // same flat feedstock default shown everywhere else (-100), never the old DK/manure tier default.
    const tbUrl = new URL(page.url().replace('#', ''));
    expect(tbUrl.searchParams.get('plantName'), 'Trade Builder URL should carry the plant\'s name').toBeTruthy();
    expect(tbUrl.searchParams.get('ci'), 'Trade Builder CI should be the flat manure feedstock default').toBe('-100');
    await expect(page.locator('#main-content')).toContainText(tbUrl.searchParams.get('plantName')!);

    expect(appErrors(errors)).toEqual([]);
  });

  test('trade builder reads the desk Pricing->Costs override, and the blotter round-trips without duplicating', async ({ page }) => {
    await clearDeskState(page);

    await gotoScreen(page, '/pricing?tab=costs');
    const registryTransfer = page.getByLabel('Registry transfer');
    await registryTransfer.waitFor({ state: 'visible' });
    await registryTransfer.fill('1.5');

    await gotoScreen(
      page,
      '/trade?marketId=DE_THG&originCountry=DK&feedstock=manure&ci=-105&ciIsEstimated=true&volume=20000&coc=MASS_BALANCE'
    );
    await page.getByRole('button', { name: /Desk grid/i }).click();

    // The waterfall's "Transfer & registry" line must reflect the hand-set desk cost.
    await expect(page.locator('#main-content')).toContainText('−1.50');

    const saveBtn = page.getByTestId('save-dossier-btn');
    await saveBtn.scrollIntoViewIfNeeded();
    await saveBtn.click();

    await gotoScreen(page, '/deals');
    await expect(page.getByText('Showing 1 of 1 deals')).toBeVisible();

    const openBtn = page.locator('[data-testid^="open-deal-"]').first();
    await openBtn.click();
    await page.waitForLoadState('networkidle').catch(() => {});
    await expect(page.locator('#main-content')).toContainText('Denmark');

    // Re-saving the reopened deal must update the same blotter row, not add a second one.
    await gotoScreen(page, '/trade' + new URL(page.url().replace('#', '')).search);
    await page.getByRole('button', { name: /Desk grid/i }).click();
    const saveBtn2 = page.getByTestId('save-dossier-btn');
    await saveBtn2.scrollIntoViewIfNeeded();
    await saveBtn2.click();

    await gotoScreen(page, '/deals');
    await expect(page.getByText('Showing 1 of 1 deals'), 're-saving a reopened deal must not create a second blotter row').toBeVisible();

    const repriceBtn = page.locator('[data-testid^="reprice-deal-"]').first();
    await repriceBtn.click();
    await expect(page.locator('[data-testid^="reprice-result-"]').first()).toContainText('Today:');
  });

  test('reopening a saved deal with no buyer shows no fake buyer and no FuelEU narrative (Finding #3, fixed)', async ({ page }) => {
    await clearDeskState(page);

    await gotoScreen(
      page,
      '/trade?marketId=DE_THG&originCountry=DK&feedstock=manure&ci=-105&ciIsEstimated=true&volume=20000&coc=MASS_BALANCE'
    );
    await page.getByRole('button', { name: /Desk grid/i }).click();
    const saveBtn = page.getByTestId('save-dossier-btn');
    await saveBtn.scrollIntoViewIfNeeded();
    await saveBtn.click();

    await gotoScreen(page, '/deals');
    await page.locator('[data-testid^="open-deal-"]').first().click();
    await page.waitForLoadState('networkidle').catch(() => {});

    await expect(
      page.locator('#main-content'),
      'a reopened deal with no counterparty set should show "No buyer yet", never a fabricated name'
    ).toContainText('No buyer yet');
    await expect(
      page.locator('#main-content'),
      'a reopened deal with no counterparty set should never show "European Offtake Buyer"'
    ).not.toContainText('European Offtake Buyer');
    await expect(
      page.locator('#main-content'),
      'a DK->DE THG deal with no counterparty set should not claim to be a FuelEU Maritime Upstream Sourcing Hedge'
    ).not.toContainText('FuelEU Maritime Upstream Sourcing Hedge');
  });
});

test.describe('Deal spine: buyer first', () => {
  test('corporate buyer + max CI survive into Origination Step 1', async ({ page }) => {
    await clearDeskState(page);

    await gotoScreen(page, '/corporate');
    await page.getByLabel('Client').fill('Edison Next');
    await page.getByLabel('Max CI').fill('-20');
    const sourceBtn = page.getByTestId('corp-source-it');
    await sourceBtn.click();
    await page.waitForLoadState('networkidle').catch(() => {});

    await expect(page.locator('#main-content')).toContainText('Buyer: Edison Next');
    await expect(page.locator('#main-content')).toContainText('Buyer max CI: -20');
  });

  test('Origination Step 2 shows the flat feedstock default CI, filtered by the buyer\'s max CI (Finding #1, fixed)', async ({ page }) => {
    await clearDeskState(page);

    // maxCi=-55 is below (less negative than) manure's flat feedstock default of -100, so the
    // default passes the filter: Stoholm should show CI -100, never the buyer's -55 ceiling.
    await gotoScreen(page, '/sourcing?maxCi=-55&buyer=Edison+Next');
    await page.getByRole('button', { name: /Scan European plants/i }).click();
    await page.waitForLoadState('networkidle').catch(() => {});
    const body = await page.locator('#main-content').innerText();
    const stoholmIdx = body.indexOf('Stoholm');
    expect(stoholmIdx, 'could not find the Stoholm (DK) plant on Origination Step 2').toBeGreaterThan(-1);
    const stoholmBlock = body.slice(stoholmIdx, stoholmIdx + 150);
    expect(stoholmBlock, 'Stoholm\'s displayed CI should not equal the buyer\'s max-CI constraint').not.toContain('CI: -55');
    expect(stoholmBlock, 'Stoholm should show the flat manure feedstock default (-100), not a per-plant census value').toContain('-100');
  });

  test('a tighter max CI than the feedstock default actually excludes plants (Finding #1, fixed)', async ({ page }) => {
    await clearDeskState(page);

    // -150 is below (more negative than) manure's flat feedstock default of -100: every manure
    // plant should now be excluded, and the screen should say how many were.
    await gotoScreen(page, '/sourcing?maxCi=-150&buyer=Edison+Next');
    await page.getByRole('button', { name: /Scan European plants/i }).click();
    await page.waitForLoadState('networkidle').catch(() => {});
    await expect(page.getByTestId('excluded-by-max-ci')).toBeVisible();
    const body = await page.locator('#main-content').innerText();
    expect(body.indexOf('Stoholm'), 'Stoholm\'s CI (-100) is above a -150 max CI and should now be excluded').toBe(-1);
  });
});
