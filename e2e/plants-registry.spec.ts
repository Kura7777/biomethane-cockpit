import { test, expect, Page } from '@playwright/test';
import { gotoScreen, collectPageErrors, appErrors, expectNoErrorBoundary } from './helpers';

/** The census directory: a listbox of plant rows, one option per facility. */
const directory = (page: Page) => page.getByRole('listbox', { name: 'Plant directory' });
const plantRows = (page: Page) => directory(page).getByRole('option');
const searchBox = (page: Page) => page.getByTestId('plant-search-input');
const countrySelect = (page: Page) => page.getByRole('combobox', { name: 'Country' });
/** The row footer, "Showing 1–50 of 1,974". */
const tableFooter = (page: Page) => page.locator('#main-content').getByText(/^Showing\s/);

test.describe('Plants census (GIE/EBA facilities)', () => {
  test('renders the census table, header context and selected-plant side panel', async ({ page }) => {
    const errors = collectPageErrors(page);

    await gotoScreen(page, '/plants');
    await expectNoErrorBoundary(page);

    const main = page.locator('#main-content');
    await expect(main.getByRole('heading', { level: 1, name: 'Plants' })).toBeVisible();
    await expect(main).toContainText(/GIE\/EBA European Biomethane Map 2026 · [\d,]+ facilities · \d+ countries/);
    await expect(page.getByRole('tab', { name: /^Census [\d,]+$/ })).toBeVisible();

    // Column headers are sort buttons
    for (const header of ['Plant', 'Operator', 'Output', 'Feedstock · CI']) {
      await expect(main.getByRole('button', { name: header, exact: true })).toBeVisible();
    }
    await expect(main.getByText('Contact', { exact: true })).toBeVisible();

    // First page of the census is populated and paginated
    await expect(plantRows(page)).toHaveCount(50);
    await expect(tableFooter(page)).toContainText(/Showing 1–50 of [\d,]+/);

    // The first row is selected by default, so the side panel shows its detail
    const firstRow = plantRows(page).first();
    await expect(firstRow).toHaveAttribute('aria-selected', 'true');
    const firstName = (await firstRow.locator('.ds-row-name').textContent())!.trim();
    const panel = main.locator('aside.plants-aside');
    await expect(panel).toContainText(firstName);
    await expect(panel).toContainText('Supply');
    await expect(panel).toContainText('Counterparty');
    await expect(panel).toContainText('Data quality');
    await expect(panel.getByRole('button', { name: 'Price a deal' })).toBeVisible();
    await expect(panel.getByRole('button', { name: 'Full dossier' })).toBeVisible();

    expect(appErrors(errors)).toEqual([]);
  });

  test('filters the census by search text and by country select', async ({ page }) => {
    const errors = collectPageErrors(page);
    await gotoScreen(page, '/plants');

    const totalText = (await tableFooter(page).textContent())!;
    const total = Number(totalText.match(/of ([\d,]+)/)![1].replace(/,/g, ''));
    expect(total).toBeGreaterThan(1000);

    // Country select: pick Denmark and check every row carries the DK tag
    await countrySelect(page).selectOption('DK');
    await expect(page.locator('.plants-active-chips')).toContainText('Country: DK');

    const dkOption = countrySelect(page).locator('option[value="DK"]');
    const dkCount = Number((await dkOption.textContent())!.match(/DK · (\d+)/)![1]);
    expect(dkCount).toBeGreaterThan(0);
    await expect(tableFooter(page)).toContainText(`of ${dkCount.toLocaleString('en-US')}`);

    const isoTags = plantRows(page).locator('.ds-row-meta .plants-iso-tag');
    await expect(isoTags.first()).toHaveText('DK');
    const tags = await isoTags.allTextContents();
    expect(tags.length).toBeGreaterThan(0);
    expect(new Set(tags)).toEqual(new Set(['DK']));

    // Search narrows further: use the name of a plant already on screen
    const target = (await plantRows(page).nth(1).locator('.ds-row-name').textContent())!.trim();
    await searchBox(page).fill(target);
    await expect(plantRows(page).locator('.ds-row-name', { hasText: target }).first()).toBeVisible();
    const narrowed = await plantRows(page).count();
    expect(narrowed).toBeGreaterThan(0);
    expect(narrowed).toBeLessThanOrEqual(dkCount);

    // Removing the country chip keeps the search but widens back out beyond DK
    await page.getByRole('button', { name: 'Remove country filter' }).click();
    await expect(countrySelect(page)).toHaveValue('ALL');
    await expect(plantRows(page).locator('.ds-row-name', { hasText: target }).first()).toBeVisible();

    // Clearing the search restores the full census
    await searchBox(page).fill('');
    await expect(tableFooter(page)).toContainText(`of ${total.toLocaleString('en-US')}`);

    expect(appErrors(errors)).toEqual([]);
  });

  test('opens a plant in the side panel and its full dossier drawer', async ({ page }) => {
    const errors = collectPageErrors(page);
    await gotoScreen(page, '/plants');

    const row = plantRows(page).nth(2);
    const name = (await row.locator('.ds-row-name').textContent())!.trim();
    await row.click();

    await expect(row).toHaveAttribute('aria-selected', 'true');
    await expect(plantRows(page).first()).toHaveAttribute('aria-selected', 'false');

    const panel = page.locator('#main-content aside.plants-aside');
    await expect(panel.locator('.ds-panel-title')).toHaveText(name);
    for (const label of ['Output', 'Capacity', 'CI (default)', 'Feedstock', 'Grid operator', 'Legal entity', 'Contact status']) {
      await expect(panel).toContainText(label);
    }

    // Full dossier opens the sourcing drawer, headed by the plant name
    await panel.getByRole('button', { name: 'Full dossier' }).click();
    const dossierHeading = page.getByRole('heading', { level: 2, name });
    await expect(dossierHeading).toBeVisible();

    // Escape closes the drawer and leaves the selection in place
    await page.keyboard.press('Escape');
    await expect(dossierHeading).toHaveCount(0);
    await expect(panel.locator('.ds-panel-title')).toHaveText(name);

    expect(appErrors(errors)).toEqual([]);
  });

  test('expands the side panel into a dialog that Escape closes', async ({ page }) => {
    const errors = collectPageErrors(page);
    await gotoScreen(page, '/plants');

    const name = (await plantRows(page).first().locator('.ds-row-name').textContent())!.trim();

    await page.getByRole('button', { name: 'Expand panel' }).click();
    const dialog = page.getByRole('dialog', { name: `${name} details` });
    await expect(dialog).toBeVisible();
    await expect(dialog).toBeFocused();
    await expect(dialog.getByRole('button', { name: 'Exit full screen' })).toBeVisible();
    await expect(dialog).toContainText('Counterparty');

    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);

    // The inline panel is still showing the same plant
    await expect(page.locator('#main-content aside.plants-aside .ds-panel-title')).toHaveText(name);

    expect(appErrors(errors)).toEqual([]);
  });

  test('shows the empty state with country totals, and resets all filters', async ({ page }) => {
    const errors = collectPageErrors(page);
    await gotoScreen(page, '/plants');

    const totalText = (await tableFooter(page).textContent())!;

    await searchBox(page).fill('NonExistentPlantName999XYZ');

    const main = page.locator('#main-content');
    await expect(main.getByRole('heading', { name: /No matching facility found/i })).toBeVisible();
    await expect(directory(page)).toHaveCount(0);

    // With nothing selected the side panel falls back to the country totals rail
    await expect(main.locator('aside.plants-aside')).toContainText('Country totals');
    await expect(main.locator('.plants-country-row').first()).toBeVisible();

    const clearBtn = page.getByTestId('clear-filter-btn');
    await expect(clearBtn).toHaveText(/Clear filter \/ Reset all filters/);
    await clearBtn.click();

    await expect(searchBox(page)).toHaveValue('');
    await expect(plantRows(page)).toHaveCount(50);
    await expect(tableFooter(page)).toHaveText(totalText);
    await expect(main.locator('aside.plants-aside')).not.toContainText('Country totals');

    expect(appErrors(errors)).toEqual([]);
  });
});
