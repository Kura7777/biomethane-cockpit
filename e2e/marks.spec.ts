import { test, expect } from '@playwright/test';
import { gotoScreen, collectPageErrors, appErrors, expectNoErrorBoundary } from './helpers';

/**
 * Marks are hand-keyed and exist nowhere else, so the round trip through the v8
 * store — enter, use, reload, still there — is the one piece of state handling
 * that has to be right.
 */
test('a mark entered on the marks screen survives a reload and reaches the shell', async ({ page }) => {
  const errors = collectPageErrors(page);

  await gotoScreen(page, '/marks');
  await expectNoErrorBoundary(page);

  // Switch to the matrix view, where marks are keyed by hand.
  await page.getByRole('button', { name: /compliance marks matrix/i }).click();

  const input = page.getByLabel(/^Mid mark for /).first();
  await expect(input).toBeVisible();
  const label = await input.getAttribute('aria-label');

  await input.fill('123.45');
  await input.blur();

  // The auto-save debounce in the store is 300ms.
  await page.waitForTimeout(600);
  await page.reload();
  await expect(page.getByText('Loading module...')).toHaveCount(0, { timeout: 15_000 });

  await page.getByRole('button', { name: /compliance marks matrix/i }).click();
  await expect(page.getByLabel(label!)).toHaveValue('123.45');

  expect(appErrors(errors)).toEqual([]);
});

test('entering a real mark reduces the simulated-mark count', async ({ page }) => {
  await gotoScreen(page, '/marks');

  // A freshly seeded desk is entirely simulated; the banner reports how many.
  const banner = page.getByRole('status').filter({ hasText: /simulated marks/i });
  await expect(banner).toBeVisible();

  const readCount = async () => {
    const text = await banner.innerText();
    return Number(/(\d+) of \d+/.exec(text)![1]);
  };
  const before = await readCount();
  expect(before).toBeGreaterThan(0);

  // Keying a mark by hand stamps it 'Desk Trader Override', so it stops counting
  // as simulated — the banner must shrink, not sit there permanently.
  await page.getByRole('button', { name: /compliance marks matrix/i }).click();
  const input = page.getByLabel(/^Mid mark for /).first();
  await input.fill('98.76');
  await input.blur();

  await expect
    .poll(readCount, { message: 'a hand-keyed mark still counts as simulated' })
    .toBe(before - 1);
});
