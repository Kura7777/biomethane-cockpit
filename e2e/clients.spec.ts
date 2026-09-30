import { test, expect } from '@playwright/test';
import { gotoScreen, collectPageErrors, appErrors, expectNoErrorBoundary } from './helpers';

/** Parses "€1,234m", "€12.3m", "€450k", "€85" to euros; null for a dash. */
function eurValue(text: string): number | null {
  const m = text.replace(/[≤†*\s]/g, '').match(/^€([\d,]+(?:\.\d+)?)(m|k)?$/);
  if (!m) return null;
  const n = Number(m[1].replace(/,/g, ''));
  return m[2] === 'm' ? n * 1e6 : m[2] === 'k' ? n * 1e3 : n;
}

test.describe('Clients', () => {
  test('lists by biomethane potential by default, with a EUR per MWh column', async ({ page }) => {
    const errors = collectPageErrors(page);
    await gotoScreen(page, '/clients');
    await expectNoErrorBoundary(page);
    await expect(page.locator('table.table tbody tr').first()).toBeVisible();

    const potential = page.getByRole('columnheader', { name: /Biomethane potential/ });
    await expect(potential).toHaveAttribute('aria-sort', 'descending');
    await expect(page.getByRole('columnheader', { name: /€\/MWh/ })).toBeVisible();

    // The first rows really are in descending order of potential.
    const cells = await page.locator('table.table tbody tr td:nth-child(2)').allInnerTexts();
    const values = cells.slice(0, 20).map(eurValue).filter((v): v is number => v !== null);
    expect(values.length).toBeGreaterThan(5);
    for (let i = 1; i < values.length; i++) expect(values[i - 1]).toBeGreaterThanOrEqual(values[i]);

    // Sort headers are keyboard buttons; a second press flips the direction.
    await page.getByRole('button', { name: /^Biomethane potential/ }).press('Enter');
    await expect(potential).toHaveAttribute('aria-sort', 'ascending');
    expect(appErrors(errors)).toEqual([]);
  });

  test('a market filter and the KPI count agree', async ({ page }) => {
    await gotoScreen(page, '/clients');
    await expect(page.locator('table.table tbody tr').first()).toBeVisible();
    await page.getByRole('button', { name: 'EU ETS2', exact: true }).click();

    const tile = page.locator('.ds-kpi, [class*="kpi"]').filter({ hasText: 'Companies shown' }).first();
    const tileText = await tile.innerText();
    const matches = Number((tileText.match(/(\d[\d,]*)/) ?? [])[1]?.replace(/,/g, ''));
    expect(matches).toBeGreaterThan(0);
    expect(tileText).toMatch(/match · \d[\d,]* listed/);

    const rows = await page.locator('table.table tbody tr').count();
    const more = page.getByRole('button', { name: /Show more/ });
    const remaining = (await more.count()) ? Number(((await more.innerText()).match(/\((\d[\d,]*) remaining/) ?? [])[1].replace(/,/g, '')) : 0;
    expect(rows + remaining).toBe(matches);
  });

  test('shows an empty state when nothing matches', async ({ page }) => {
    await gotoScreen(page, '/clients');
    await page.getByLabel('Search companies').fill('zzzxq');
    await expect(page.getByText('No companies match. Clear the search or filters.')).toBeVisible();
  });

  test('a status set on a company survives a reload and shows in the status filter', async ({ page }) => {
    await gotoScreen(page, '/clients?company=edison');
    await expectNoErrorBoundary(page);
    const select = page.getByLabel('Client status');
    await select.selectOption('PIPELINE');
    await expect(select).toHaveValue('PIPELINE');

    await page.reload();
    await expect(page.getByText('Loading module...')).toHaveCount(0, { timeout: 15_000 });
    await expect(page.getByLabel('Client status')).toHaveValue('PIPELINE');

    // Back on the list, the status filter finds it.
    await page.getByRole('button', { name: /All companies/ }).click();
    await page.getByLabel('Status', { exact: true }).selectOption('PIPELINE');
    await expect(page.locator('table.table tbody tr')).toHaveCount(1);
    await expect(page.locator('table.table tbody tr').first()).toContainText('In pipeline');
  });
});
