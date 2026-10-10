import { test, expect } from '@playwright/test';
import { gotoScreen, collectPageErrors, appErrors } from './helpers';

const DK_NL_GGE = '/trade?marketId=NL_GGE&originCountry=DK&feedstock=manure&ci=-100&volume=15000';

test.describe('Page helper capsule (desktop)', () => {
  test('Trade Builder DK → NL GGE: offline mode shows the guide and a "Why is … failing?" chip', async ({ page }) => {
    const errors = collectPageErrors(page);
    const apiCalls: string[] = [];
    page.on('request', r => { if (r.url().includes('api.anthropic.com')) apiCalls.push(r.url()); });

    await gotoScreen(page, DK_NL_GGE);

    const dock = page.getByTestId('page-helper');
    await expect(page.getByTestId('helper-open')).toBeVisible();
    await expect(dock).toHaveAttribute('data-open', 'false');
    await expect(page.getByTestId('helper-open')).toHaveAttribute('aria-expanded', 'false');
    await expect(page.getByTestId('helper-card')).toHaveCount(0);

    await page.getByTestId('helper-open').click();
    await expect(dock).toHaveAttribute('data-open', 'true');
    await expect(page.getByTestId('helper-card')).toBeVisible();
    await expect(page.getByTestId('helper-input')).toBeFocused();
    await expect(page.getByTestId('helper-subtitle')).toHaveText('Trade Builder');
    await expect(page.getByTestId('helper-mode')).toHaveText('Offline help');
    await expect(page.getByTestId('helper-greeting')).toBeVisible();
    await expect(page.getByTestId('helper-overview')).toContainText('Trade Builder');
    await expect(page.getByTestId('helper-offline-note')).toContainText('Add a Claude API key in settings for conversational answers.');
    await expect(page.getByTestId('helper-chips').getByRole('button', { name: /^Why is .* failing\?$/ })).toBeVisible({ timeout: 10_000 });

    // The chip reads the live checklist from the page, with no network call.
    await page.getByTestId('helper-chips').getByRole('button', { name: /^Why is .* failing\?$/ }).click();
    await expect(page.getByTestId('helper-offline-answer')).toContainText('Failing now');
    expect(apiCalls).toEqual([]);

    // Typed glossary terms are matched offline. Shift+Enter adds a line; Enter sends.
    const input = page.getByTestId('helper-input');
    await input.fill('What does THG mean?');
    await input.press('Shift+Enter');
    await expect(input).not.toHaveValue('');
    await input.press('Backspace');
    await input.press('Enter');
    await expect(page.getByTestId('helper-term-thg-quote')).toBeVisible();

    // Bigger, then Esc steps back: expanded → card → closed, and focus returns to the capsule.
    await page.getByTestId('helper-expand').click();
    await expect(dock).toHaveAttribute('data-expanded', 'true');
    await expect(page.getByTestId('helper-backdrop')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(dock).toHaveAttribute('data-expanded', 'false');
    await expect(dock).toHaveAttribute('data-open', 'true');
    await page.keyboard.press('Escape');
    await expect(dock).toHaveAttribute('data-open', 'false');
    await expect(page.getByTestId('helper-open')).toBeFocused();

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

  test('moving to a new screen offers help; Yes opens it, and it can be switched off', async ({ page }) => {
    await gotoScreen(page, '/glossary');
    // No prompt on the first page load.
    await expect(page.getByTestId('helper-nudge')).toHaveCount(0);

    await page.evaluate(() => { window.location.hash = '#/pricing'; });
    const nudge = page.getByTestId('helper-nudge');
    await expect(nudge).toContainText('Would you like help with this page?');
    await page.getByTestId('helper-nudge-yes').click();
    await expect(page.getByTestId('page-helper')).toHaveAttribute('data-open', 'true');
    await expect(nudge).toHaveCount(0);

    await page.keyboard.press('Escape');
    await page.evaluate(() => { window.location.hash = '#/clients'; });
    await expect(page.getByTestId('helper-nudge')).toBeVisible();
    await page.getByTestId('helper-nudge-never').click();
    await page.evaluate(() => { window.location.hash = '#/deals'; });
    await expect(page.getByTestId('helper-open')).toBeVisible();
    await expect(page.getByTestId('helper-nudge')).toHaveCount(0);
  });

  test('geometry at 1600×950: capsule clears the status bar, card stays in the viewport, no Trade Builder button is covered', async ({ page }) => {
    await gotoScreen(page, DK_NL_GGE);
    const rect = async (sel: string) => page.locator(sel).first().evaluate(el => {
      const r = el.getBoundingClientRect();
      return { x: r.x, y: r.y, right: r.right, bottom: r.bottom };
    });
    const vp = page.viewportSize()!;
    const capsule = await rect('[data-testid="helper-open"]');
    const footer = await rect('.app-footer');
    expect(capsule.bottom).toBeLessThanOrEqual(footer.y);
    expect(capsule.right).toBeLessThanOrEqual(vp.width);

    // No visible button or link in the Trade Builder sits under the capsule.
    const covered = await page.evaluate(({ c }) => {
      const hit: string[] = [];
      document.querySelectorAll('#main-content button, #main-content a, #main-content input, #main-content select').forEach(el => {
        const r = el.getBoundingClientRect();
        if (r.width === 0 || r.height === 0) return;
        if (r.right > c.x && r.x < c.right && r.bottom > c.y && r.y < c.bottom) hit.push((el.textContent || el.tagName).trim().slice(0, 40));
      });
      return hit;
    }, { c: capsule });
    expect(covered).toEqual([]);

    await page.getByTestId('helper-open').click();
    const card = await rect('[data-testid="helper-card"]');
    expect(card.x).toBeGreaterThanOrEqual(0);
    expect(card.y).toBeGreaterThanOrEqual(0);
    expect(card.right).toBeLessThanOrEqual(vp.width);
    expect(card.bottom).toBeLessThanOrEqual(capsule.y);
    expect(card.right - card.x).toBeCloseTo(400, 0);

    await page.getByTestId('helper-expand').click();
    const big = await rect('[data-testid="helper-card"]');
    expect(big.x).toBeGreaterThanOrEqual(0);
    expect(big.y).toBeGreaterThanOrEqual(0);
    expect(big.right).toBeLessThanOrEqual(vp.width);
    expect(big.bottom).toBeLessThanOrEqual(vp.height);
  });
});
