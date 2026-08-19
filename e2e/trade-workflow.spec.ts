import { test, expect } from '@playwright/test';
import { gotoScreen, collectPageErrors, appErrors, expectNoErrorBoundary } from './helpers';

/**
 * The whole point of the app: price a deal and leave with something you can send.
 *
 * The export step is the reason this spec exists. "Confirm & Export Term Sheet"
 * was an alert() that claimed the sheet had been exported — the final action of
 * the entire workflow, doing nothing. waitForEvent('download') cannot be satisfied
 * by an alert, so this test can only pass if a real file is produced.
 */
test('a deal can be priced and exported as a real file', async ({ page }) => {
  const errors = collectPageErrors(page);

  await gotoScreen(page, '/trade?marketId=DE_THG&originCountry=DK&feedstock=manure&ci=-100&volume=120000');
  await expectNoErrorBoundary(page);

  // The desk seeds itself, so a netback must actually compute — no em-dash.
  const main = page.locator('#main-content');
  await expect(main).toContainText(/€\s?-?\d/);

  await page.getByRole('button', { name: /deal ticket preview/i }).first().click();
  const ticket = page.getByRole('dialog', { name: /deal ticket/i });
  await expect(ticket).toBeVisible();

  const downloadPromise = page.waitForEvent('download');
  await ticket.getByRole('button', { name: /confirm & export term sheet/i }).click();
  const download = await downloadPromise;

  expect(download.suggestedFilename()).toMatch(/^term-sheet-.*\.txt$/);

  // The file must contain the dossier, not be an empty shell.
  const stream = await download.createReadStream();
  const body = await new Promise<string>((resolve, reject) => {
    let out = '';
    stream.on('data', (c: Buffer) => (out += c.toString('utf-8')));
    stream.on('end', () => resolve(out));
    stream.on('error', reject);
  });

  expect(body).toContain('EUROPEAN BIOMETHANE DESK');
  expect(body).toContain('TRADE SUMMARY');
  expect(body.length).toBeGreaterThan(400);

  expect(appErrors(errors)).toEqual([]);
});

test('an exported deal is recoverable from the dossier library', async ({ page }) => {
  await gotoScreen(page, '/trade?marketId=DE_THG&originCountry=DK&feedstock=manure&ci=-100');

  await page.getByRole('button', { name: /deal ticket preview/i }).first().click();
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: /confirm & export term sheet/i }).click();
  await downloadPromise;

  // Exporting also files the dossier, so the deal exists in the app and not only
  // in the user's downloads folder.
  await gotoScreen(page, '/library');
  await expectNoErrorBoundary(page);
  await expect(page.locator('#main-content')).toContainText(/DOS-/);
});
