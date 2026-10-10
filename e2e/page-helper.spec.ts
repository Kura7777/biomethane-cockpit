import { test, expect } from '@playwright/test';
import { gotoScreen, collectPageErrors, appErrors } from './helpers';

const DK_NL_GGE = '/trade?marketId=NL_GGE&originCountry=DK&feedstock=manure&ci=-100&volume=15000';

test.describe('Page helper dock (desktop)', () => {
  test('Trade Builder DK → NL GGE: offline mode shows the guide and a "Why is … failing?" chip', async ({ page }) => {
    const errors = collectPageErrors(page);
    const apiCalls: string[] = [];
    page.on('request', r => { if (r.url().includes('api.anthropic.com')) apiCalls.push(r.url()); });

    await gotoScreen(page, DK_NL_GGE);

    const dock = page.getByTestId('page-helper');
    await expect(dock).toBeVisible();
    await expect(dock).toHaveAttribute('data-open', 'false');
    await expect(page.getByTestId('helper-chips').getByRole('button', { name: /^Why is .* failing\?$/ })).toBeVisible({ timeout: 10_000 });

    await page.getByTestId('helper-open').click();
    await expect(dock).toHaveAttribute('data-open', 'true');
    await expect(page.getByTestId('helper-mode')).toHaveText('Offline help');
    await expect(page.getByTestId('helper-overview')).toContainText('Trade Builder');
    await expect(page.getByTestId('helper-offline-note')).toContainText('Add a Claude API key in settings for conversational answers.');

    // The chip reads the live checklist from the page, with no network call.
    await page.getByTestId('helper-chips').getByRole('button', { name: /^Why is .* failing\?$/ }).click();
    await expect(page.getByTestId('helper-offline-answer')).toContainText('Failing now');
    expect(apiCalls).toEqual([]);

    // Typed glossary terms are matched offline.
    await page.getByTestId('helper-input').fill('What does THG mean?');
    await page.getByTestId('helper-send').click();
    await expect(page.getByTestId('helper-term-thg-quote')).toBeVisible();

    // The panel is open for the session, keeps this page's chat, and Esc collapses it.
    await page.keyboard.press('Escape');
    await expect(dock).toHaveAttribute('data-open', 'false');

    expect(appErrors(errors)).toEqual([]);
  });

  test('a chat belongs to its page; the previous page chat stays reachable', async ({ page }) => {
    await gotoScreen(page, '/glossary');
    await page.getByTestId('helper-open').click();
    await page.getByTestId('helper-input').fill('GGE');
    await page.getByTestId('helper-send').click();
    await expect(page.getByTestId('helper-offline-answer')).toBeVisible();

    await page.evaluate(() => { window.location.hash = '#/pricing'; });
    await expect(page.getByTestId('page-helper')).toHaveAttribute('data-open', 'true');
    await expect(page.getByTestId('helper-offline-answer')).toHaveCount(0);
    await page.getByTestId('helper-previous').click();
    await expect(page.getByTestId('helper-offline-answer')).toBeVisible();
  });

  test('AI mode sends the guide and page context with the key only in the header', async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('biomethane_anthropic_api_key', 'sk-ant-e2e-test-key-123456'));
    let body = '';
    let keyHeader = '';
    await page.route('https://api.anthropic.com/v1/messages', async route => {
      body = route.request().postData() ?? '';
      keyHeader = route.request().headers()['x-api-key'] ?? '';
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ content: [{ type: 'text', text: 'Open the pricing desk: [[go:/pricing?tab=assumptions|Desk assumptions]] and [[go:/nope|Nowhere]].' }] }),
      });
    });

    await gotoScreen(page, DK_NL_GGE);
    await page.getByTestId('helper-open').click();
    await expect(page.getByTestId('helper-mode')).toHaveText('AI answers');
    await expect(page.getByTestId('helper-privacy')).toContainText('sent to Anthropic');
    await page.getByTestId('helper-input').fill('Why is this blocked?');
    await page.getByTestId('helper-send').click();

    await expect(page.getByTestId('helper-answer')).toContainText('Open the pricing desk');
    await expect(page.getByTestId('helper-go')).toHaveCount(1);
    expect(keyHeader).toBe('sk-ant-e2e-test-key-123456');
    expect(body).not.toContain('sk-ant-e2e-test-key');
    expect(body).toContain('cache_control');
    expect(body).toContain('PAGE GUIDE: Trade Builder');
    expect(body).toContain('go-route-nl');
  });
});
