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

  test('AI mode streams an answer, runs a desk tool, and keeps the key in the header only', async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('biomethane_anthropic_api_key', 'sk-ant-e2e-test-key-123456'));
    const sse = (events: object[]) => events.map(e => `event: ${(e as { type: string }).type}\ndata: ${JSON.stringify(e)}\n\n`).join('');
    const start = { type: 'message_start', message: { id: 'msg_1', type: 'message', role: 'assistant', model: 'claude-opus-5-5', content: [], stop_reason: null, stop_sequence: null, usage: { input_tokens: 1, output_tokens: 0 } } };
    const end = (stop: string) => [{ type: 'message_delta', delta: { stop_reason: stop, stop_sequence: null }, usage: { output_tokens: 1 } }, { type: 'message_stop' }];
    const answer = [
      '**DK → NL GGE is blocked** because Danish GOs cannot reach the Dutch registry yet.',
      '',
      '| Leg | Status |',
      '|---|---|',
      '| DK → NL GO | Not possible |',
      '| ES → NL GO | Possible |',
      '',
      'Open the pricing desk: [[go:/pricing?tab=assumptions|Desk assumptions]] and [[go:/nope|Nowhere]].',
    ].join('\n');
    const bodies: string[] = [];
    let keyHeader = '';
    await page.route('https://api.anthropic.com/v1/messages*', async route => {
      bodies.push(route.request().postData() ?? '');
      keyHeader = route.request().headers()['x-api-key'] ?? '';
      const events = bodies.length === 1
        ? [start,
          { type: 'content_block_start', index: 0, content_block: { type: 'tool_use', id: 'tu_1', name: 'get_route', input: {} } },
          { type: 'content_block_delta', index: 0, delta: { type: 'input_json_delta', partial_json: '{"origin":"DK","destination":"NL"}' } },
          { type: 'content_block_stop', index: 0 }, ...end('tool_use')]
        : [start,
          { type: 'content_block_start', index: 0, content_block: { type: 'text', text: '' } },
          { type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text: answer } },
          { type: 'content_block_delta', index: 0, delta: { type: 'citations_delta', citation: { type: 'web_search_result_location', url: 'https://www.emissieautoriteit.nl/', title: 'NEa', encrypted_index: 'x', cited_text: 'x' } } },
          { type: 'content_block_stop', index: 0 }, ...end('end_turn')];
      await route.fulfill({ status: 200, contentType: 'text/event-stream', body: sse(events) });
    });

    await gotoScreen(page, DK_NL_GGE);
    await page.getByTestId('helper-open').click();
    await expect(page.getByTestId('helper-mode')).toHaveText('AI answers');
    await expect(page.getByTestId('helper-privacy')).toContainText('sent to Anthropic');
    await page.getByTestId('helper-input').fill('Why is this blocked?');
    await page.getByTestId('helper-send').click();

    await expect(page.getByTestId('helper-answer')).toContainText('DK → NL GGE is blocked');
    await expect(page.getByTestId('helper-answer').locator('table')).toBeVisible();
    await expect(page.getByTestId('helper-go')).toHaveCount(1);
    await expect(page.getByTestId('helper-sources')).toContainText('NEa');
    expect(bodies).toHaveLength(2);
    expect(keyHeader).toBe('sk-ant-e2e-test-key-123456');
    for (const b of bodies) expect(b).not.toContain('sk-ant-e2e-test-key');
    expect(bodies[0]).toContain('cache_control');
    expect(bodies[0]).toContain('PAGE GUIDE: Trade Builder');
    expect(bodies[0]).toContain('go-route-nl');
    expect(bodies[0]).toContain('claude-opus-5-5');
    expect(bodies[0]).toContain('web_search_20260209');
    // The tool ran in the browser and its result went back to the model.
    expect(bodies[1]).toContain('tool_result');
    expect(bodies[1]).toContain('NOT_POSSIBLE');
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

  test('the map rail scrolls its last button clear of the capsule', async ({ page }) => {
    await gotoScreen(page, '/map');
    const playbook = page.getByRole('button', { name: /Open delivery playbook/i });
    await playbook.scrollIntoViewIfNeeded();
    const cap = await page.getByTestId('helper-open').boundingBox();
    const btn = await playbook.boundingBox();
    expect(btn!.y + btn!.height).toBeLessThanOrEqual(cap!.y + 1);
    await playbook.click();
  });
});

test.describe('Ask the desk (desktop)', () => {
  test('sits on the main bar right after Reference and opens a full-page chat without the capsule', async ({ page }) => {
    const errors = collectPageErrors(page);
    await page.setViewportSize({ width: 1280, height: 800 });
    await gotoScreen(page, DK_NL_GGE);

    const ask = page.getByTestId('nav-ask');
    await expect(ask).toBeVisible();
    const reference = page.locator('.app-group-btn', { hasText: 'Reference' });
    const [refBox, askBox] = [await reference.boundingBox(), await ask.boundingBox()];
    expect(askBox!.x).toBeGreaterThan(refBox!.x + refBox!.width - 1);
    expect(askBox!.x + askBox!.width).toBeLessThanOrEqual(1280);
    // The bar does not overflow, even with "· Trade builder" showing on Pricing.
    expect(await page.locator('.app-header-nav').evaluate(el => el.scrollWidth <= el.clientWidth + 1)).toBe(true);

    await ask.click();
    await expect(page).toHaveURL(/#\/ask$/);
    await expect(ask).toHaveClass(/active/);
    await expect(page.getByTestId('ask-screen')).toBeVisible();
    await expect(page.getByTestId('page-helper')).toHaveCount(0);
    await expect(page.getByTestId('helper-input')).toBeFocused();
    await expect(page.getByTestId('ask-new-chat')).toBeDisabled();

    await page.getByTestId('ask-starters').getByRole('button').first().click();
    await expect(page.getByTestId('helper-user')).toHaveCount(1);
    await expect(page.getByTestId('helper-offline-answer')).toBeVisible();

    // The conversation survives a trip to another page; New chat clears it.
    await page.evaluate(() => { window.location.hash = '#/glossary'; });
    await expect(page.getByTestId('helper-open')).toBeVisible();
    await page.getByTestId('nav-ask').click();
    await expect(page.getByTestId('helper-user')).toHaveCount(1);
    await page.getByTestId('ask-new-chat').click();
    await expect(page.getByTestId('ask-empty')).toBeVisible();
    await expect(page.getByTestId('helper-user')).toHaveCount(0);
    expect(appErrors(errors)).toEqual([]);
  });
});
