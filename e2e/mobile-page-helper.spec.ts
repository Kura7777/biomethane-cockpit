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

test.describe('Ask the desk (compact layout)', () => {
  test('the Ask tab opens the general chat and the page capsule steps aside', async ({ page }) => {
    await gotoScreen(page, '/sourcing');
    await page.getByTestId('tab-ask').click();
    await expect(page).toHaveURL(/#\/ask$/);
    await expect(page.getByTestId('ask-screen')).toBeVisible();
    await expect(page.getByTestId('tab-ask')).toHaveClass(/active/);
    await expect(page.getByTestId('helper-open')).toHaveCount(0);
    await expect(page.getByTestId('helper-input')).toBeVisible();
    const input = await page.getByTestId('helper-input').boundingBox();
    const tab = await page.getByTestId('mobile-tabbar').boundingBox();
    expect(input!.y + input!.height).toBeLessThanOrEqual(tab!.y);
    const noOverflow = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
    expect(noOverflow).toBe(true);
  });
});

test.describe('Anthropic key on a phone', () => {
  test('a key pasted with phone clutter is cleaned on save, and a rejected key names the one saved here', async ({ page }) => {
    await gotoScreen(page, '/regulation-check');
    const input = page.getByTestId('regcheck-key-input');
    await expect(input).toHaveAttribute('autocapitalize', 'none');
    await input.fill(' Sk-ant-api03-e2e test key ​9876 ');
    await page.getByRole('button', { name: 'Save' }).click();
    await expect(page.getByTestId('regcheck-key-saved')).toContainText('sk-ant-…9876 (27 characters)');
    expect(await page.evaluate(() => localStorage.getItem('biomethane_anthropic_api_key'))).toBe('sk-ant-api03-e2etestkey9876');
    // 27 characters is far too short for a real key: warn before any network call.
    await expect(page.getByTestId('regcheck-key-problem')).toContainText('Only 27 characters');
    await page.route('https://api.anthropic.com/v1/models*', route => route.fulfill({
      status: 401,
      contentType: 'application/json',
      body: JSON.stringify({ type: 'error', error: { type: 'authentication_error', message: 'invalid x-api-key' } }),
    }));
    await page.getByTestId('regcheck-key-test').click();
    await expect(page.getByTestId('regcheck-key-result')).toContainText('Anthropic rejected this key (HTTP 401)');

    await page.route('https://api.anthropic.com/v1/messages*', route => route.fulfill({
      status: 401,
      contentType: 'application/json',
      body: JSON.stringify({ type: 'error', error: { type: 'authentication_error', message: 'invalid x-api-key' } }),
    }));
    await gotoScreen(page, '/ask');
    await page.getByTestId('helper-input').fill('What is a GGE?');
    await page.getByTestId('helper-send').click();
    const error = page.getByTestId('helper-error');
    await expect(error).toContainText('saved on this device (sk-ant-…9876');
    await expect(error).not.toContainText('e2etestkey');
  });
});
