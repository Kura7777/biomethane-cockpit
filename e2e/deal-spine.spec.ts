import { test, expect } from '@playwright/test';
import { gotoScreen, clearDeskState, collectPageErrors, appErrors } from './helpers';

/**
 * Walks a deal end to end the way a trader would — plant first, and buyer first — checking
 * that the fields recorded at each hand-off (Why: CI, volume, counterparty, desk margin) survive
 * the trip from Plants/Corporate orders through Origination/Map, into the Trade Builder, and
 * into the blotter. Three real bugs were found this way (see deal-walk-report.md) and are pinned
 * here with test.fail() so a fix shows up as a newly-green test instead of a silent regression.
 *
 * Runs against a fresh desk (cleared localStorage) so the Pricing desk → Costs override below is
 * the only non-default assumption in play, and against the production build per playwright.config.ts.
 */

test.describe('Deal spine: plant first', () => {
  test('plant -> map -> trade builder drops the plant\'s own CI and volume (Finding #2)', async ({ page }) => {
    await clearDeskState(page);
    const errors = collectPageErrors(page);

    // Set a desk-wide cost by hand so we can check every downstream screen reads it.
    await gotoScreen(page, '/pricing?tab=costs');
    const registryTransfer = page.getByLabel('Registry transfer');
    await registryTransfer.waitFor({ state: 'visible' });
    await registryTransfer.fill('1.5');

    // Plants: filter to Denmark and read the first manure plant's own verified CI + output.
    await gotoScreen(page, '/plants');
    await page.getByLabel('Country').first().selectOption('DK');
    const firstRow = page.locator('[role="option"], .ds-row').first();
    await expect(firstRow).toBeVisible();
    const rowText = await firstRow.innerText();
    const plantName = rowText.split('\n')[0].trim();
    const verifiedCiMatch = rowText.match(/−?-?(\d+(\.\d+)?)/); // first numeric token after the name (CI chip)
    expect(plantName.length, 'could not read a plant name from the Plants row').toBeGreaterThan(0);

    // "Where can this gas go?" only ever passes the origin country — not the plant, its CI, or its
    // volume (PlantsScreen.tsx navigate(`/map?origin=...`)). Pin that gap here.
    const corridorLink = firstRow.locator('button:has-text("Where can this gas go?")').first();
    await corridorLink.click();
    await page.waitForLoadState('networkidle').catch(() => {});
    expect(page.url(), 'the Plants -> Map hand-off should only carry ?origin= today (Finding #2)').toMatch(/\/map\?origin=DK/);
    expect(page.url()).not.toContain('plantId');
    expect(page.url()).not.toContain('ci=');

    // Map: send the DK->DE corridor to the Trade Builder exactly the way "Germany THG" does.
    await gotoScreen(page, '/map?origin=DK&target=DE&filter=ALL');
    const tradeBtn = page.getByRole('button', { name: /Trade/ }).first();
    await tradeBtn.waitFor({ state: 'visible' });
    await tradeBtn.click();
    await page.waitForLoadState('networkidle').catch(() => {});

    // The Trade Builder never saw the plant: it falls back to the DK/manure country-tier default
    // (-105 g/MJ) and the generic desk default volume (20,000 MWh), not the plant's own numbers.
    const tbUrl = new URL(page.url().replace('#', ''));
    const ciParam = tbUrl.searchParams.get('ci');
    const volumeParam = tbUrl.searchParams.get('volume');
    test.fail(true, 'Finding #2: map hand-off fabricates a generic DK/manure consignment instead of carrying the selected plant\'s verified CI and annual volume');
    expect(ciParam, 'Trade Builder CI should match the plant\'s own verified CI, not the generic DK/manure tier default').not.toBe('-105');
    expect(volumeParam, 'Trade Builder volume should match the plant\'s own annual output, not the generic desk default').not.toBe('20000');

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

  test('reopening a saved deal fabricates a FuelEU shipping counterparty narrative on an ordinary THG deal (Finding #3)', async ({ page }) => {
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

    test.fail(true, 'Finding #3: TradeBuilderScreen.tsx:427 defaults the reopened counterparty to "European Offtake Buyer", which then trips TradeConsignmentStep.tsx:209\'s (deal.counterparty && deal.feedstock === \'manure\') check and shows a fabricated "FuelEU Maritime Upstream Sourcing Hedge" badge on a plain DE THG deal with no shipping or FuelEU link');
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

  test('Origination Step 2 shows the buyer\'s max CI as every plant\'s own CI (Finding #1)', async ({ page }) => {
    await clearDeskState(page);

    // Pick an arbitrary, specific max CI. sourcingAdapter.ts:45-47 feeds the buyer's
    // maxCarbonIntensity constraint into the scan as the consignment CI for every opportunity, so
    // the plant list ends up displaying this exact number as if it were each plant's own CI —
    // Stoholm's real verified CI (Plants registry) is -82.0 g/MJ, never -55.
    await gotoScreen(page, '/sourcing?maxCi=-55&buyer=Edison+Next');
    await page.getByRole('button', { name: /Scan European plants/i }).click();
    await page.waitForLoadState('networkidle').catch(() => {});
    const body = await page.locator('#main-content').innerText();
    const stoholmIdx = body.indexOf('Stoholm');
    expect(stoholmIdx, 'could not find the Stoholm (DK) plant on Origination Step 2').toBeGreaterThan(-1);
    const stoholmBlock = body.slice(stoholmIdx, stoholmIdx + 150);

    test.fail(true, 'Finding #1: Origination Step 2 displays the buyer\'s Max CI ceiling (-55) as Stoholm\'s own carbon intensity instead of its real verified CI (-82.0, per the Plants registry), and the "exceeds max CI" filter never actually filters anything as a result');
    expect(stoholmBlock, 'Stoholm\'s displayed CI should not equal the buyer\'s max-CI constraint').not.toContain('CI: -55');
  });
});
