import { test, expect, type Page } from '@playwright/test';
import { gotoScreen, collectPageErrors, appErrors } from './helpers';

const GEMINI_KEY = 'AIzaSyE2eTestKey1234567890abcdefghij';
const ASSUMPTIONS = 'biomethane-desk.assumptions.v1';

/** One recorded Gemini stream: a text answer and its usage. */
const geminiBody = (text: string) => [
  { candidates: [{ content: { role: 'model', parts: [{ text }] }, finishReason: 'STOP' }], usageMetadata: { promptTokenCount: 7000, cachedContentTokenCount: 0, candidatesTokenCount: 200, thoughtsTokenCount: 300 } },
].map(c => `data: ${JSON.stringify(c)}\r\n\r\n`).join('');

async function mockGemini(page: Page, text: string) {
  const seen: { url: string; key: string; body: string }[] = [];
  await page.route('https://generativelanguage.googleapis.com/**', async route => {
    const req = route.request();
    if (req.method() === 'OPTIONS') { await route.fulfill({ status: 204, headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*' } }); return; }
    seen.push({ url: req.url(), key: req.headers()['x-goog-api-key'] ?? '', body: req.postData() ?? '' });
    await route.fulfill({ status: 200, contentType: 'text/event-stream', headers: { 'access-control-allow-origin': '*' }, body: geminiBody(text) });
  });
  return seen;
}

test.describe('Desk helper with Gemini', () => {
  test('Ask the desk answers on a Gemini model and shows its cost and today\'s total', async ({ page }) => {
    const errors = collectPageErrors(page);
    await page.addInitScript(key => localStorage.setItem('biomethane_gemini_api_key', key), GEMINI_KEY);
    const seen = await mockGemini(page, 'NL GGE is a Dutch green-gas certificate.');
    const anthropic: string[] = [];
    page.on('request', r => { if (r.url().includes('api.anthropic.com')) anthropic.push(r.url()); });

    await gotoScreen(page, '/ask');
    // The desk default is Gemini 3.8 Flash, and only the Gemini models are listed.
    await expect(page.getByTestId('provider-switch-google')).toHaveAttribute('aria-checked', 'true');
    await expect(page.getByTestId('provider-switch-anthropic')).toHaveAttribute('aria-checked', 'false');
    await expect(page.getByTestId('ask-model')).toHaveText(/Gemini 3\.8 Flash/);
    await page.getByTestId('ask-model').click();
    await expect(page.getByTestId('ask-model-menu').getByRole('menuitemradio')).toHaveCount(3);
    await expect(page.getByTestId('ask-model-0')).toHaveCount(0);
    await page.keyboard.press('Escape');
    // One provider at a time: Claude lands on Haiku (no Anthropic key here, so offline), Gemini back on 3.8 Flash.
    await page.getByTestId('provider-switch-anthropic').click();
    await expect(page.getByTestId('ask-model')).toHaveText(/Haiku 5\.5/);
    await expect(page.getByTestId('helper-offline-note')).toContainText('Add a Claude API key');
    await page.getByTestId('provider-switch-google').click();
    await expect(page.getByTestId('ask-model')).toHaveText(/Gemini 3\.8 Flash/);
    await expect(page.getByTestId('helper-mode')).toHaveText('AI answers');
    await expect(page.getByTestId('helper-privacy')).toContainText('sent to Google');
    await expect(page.getByTestId('ask-today')).toHaveText('Today ≈ $0.00');

    await page.getByTestId('helper-input').fill('What is a GGE?');
    await page.getByTestId('helper-send').click();
    await expect(page.getByTestId('helper-answer')).toContainText('Dutch green-gas certificate');
    // 7,000 in at $0.75 + 500 out at $3.75 per million tokens = $0.007125.
    await expect(page.getByTestId('helper-answered-by')).toHaveText('Gemini 3.8 Flash · ≈ $0.007');
    await expect(page.getByTestId('ask-today')).toHaveText('Today ≈ $0.007');

    expect(seen).toHaveLength(1);
    expect(seen[0].url).toBe('https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:streamGenerateContent?alt=sse');
    expect(seen[0].key).toBe(GEMINI_KEY);
    expect(seen[0].body).toContain('systemInstruction');
    expect(seen[0].body).toContain('functionDeclarations');
    expect(seen[0].body).not.toContain('additionalProperties');
    expect(seen[0].body).not.toContain(GEMINI_KEY);
    expect(anthropic).toEqual([]);
    expect(appErrors(errors)).toEqual([]);
  });

  test('Regulation check keeps a Gemini key: save, fingerprint, Test key, clear', async ({ page }) => {
    const errors = collectPageErrors(page);
    let listed = '';
    await page.route('https://generativelanguage.googleapis.com/v1beta/models?pageSize=1', async route => {
      listed = route.request().headers()['x-goog-api-key'] ?? '';
      await route.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: '{"models":[]}' });
    });
    await gotoScreen(page, '/regulation-check');
    await expect(page.getByTestId('regcheck-ai-keys')).toContainText('AI keys');
    await expect(page.getByTestId('regcheck-key-input')).toBeVisible(); // Anthropic row, unchanged
    const input = page.getByTestId('regcheck-gemini-key-input');
    await expect(input).toHaveAttribute('autocapitalize', 'none');
    await expect(input).toHaveAttribute('autocorrect', 'off');
    await input.fill(`  ${GEMINI_KEY.slice(0, 10)}\n${GEMINI_KEY.slice(10)} `);
    await page.getByTestId('regcheck-gemini-key-save').click();
    await expect(page.getByTestId('regcheck-gemini-key-saved')).toContainText(`AIza…${GEMINI_KEY.slice(-4)} (${GEMINI_KEY.length} characters)`);
    expect(await page.evaluate(() => localStorage.getItem('biomethane_gemini_api_key'))).toBe(GEMINI_KEY);

    await page.getByTestId('regcheck-gemini-key-test').click();
    await expect(page.getByTestId('regcheck-gemini-key-result')).toContainText('Key works');
    expect(listed).toBe(GEMINI_KEY);

    await page.getByTestId('regcheck-gemini-key-clear').click();
    await expect(page.getByTestId('regcheck-gemini-key-saved')).toHaveCount(0);
    expect(await page.evaluate(() => localStorage.getItem('biomethane_gemini_api_key'))).toBeNull();
    expect(appErrors(errors)).toEqual([]);
  });

  test('a rejected Gemini key is reported without the key', async ({ page }) => {
    await page.addInitScript(key => localStorage.setItem('biomethane_gemini_api_key', key), GEMINI_KEY);
    await page.route('https://generativelanguage.googleapis.com/v1beta/models?pageSize=1', route =>
      route.fulfill({ status: 400, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify({ error: { message: `API key not valid ${GEMINI_KEY}` } }) }));
    await gotoScreen(page, '/regulation-check');
    await page.getByTestId('regcheck-gemini-key-test').click();
    const result = page.getByTestId('regcheck-gemini-key-result');
    await expect(result).toContainText('Google rejected this key');
    await expect(result).not.toContainText(GEMINI_KEY);
  });

  test('once today\'s budget is used up no AI is called and the answer is offline with a link to the cap', async ({ page }) => {
    await page.addInitScript(({ key, assumptions }) => {
      localStorage.setItem('biomethane_anthropic_api_key', key);
      localStorage.setItem(assumptions, JSON.stringify({ 'helper.dailyCapUsd': 2, 'helper.model': 0 }));
      const d = new Date();
      const pad = (n: number) => String(n).padStart(2, '0');
      localStorage.setItem('biomethane_helper_spend', JSON.stringify({ date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`, usd: 2.05 }));
    }, { key: 'sk-ant-e2e-test-key-123456', assumptions: ASSUMPTIONS });
    const calls: string[] = [];
    page.on('request', r => { if (/api\.anthropic\.com|generativelanguage\.googleapis\.com/.test(r.url())) calls.push(r.url()); });

    await gotoScreen(page, '/ask');
    await expect(page.getByTestId('ask-today')).toHaveText('Today ≈ $2.05');
    await page.getByTestId('helper-input').fill('What does GGE mean?');
    await page.getByTestId('helper-send').click();
    await expect(page.getByTestId('helper-offline-answer')).toBeVisible();
    const note = page.getByTestId('helper-budget-note');
    await expect(note).toContainText('Today’s AI budget ($2.00) is used up on this device; showing offline help.');
    await expect(note.getByRole('link', { name: 'Change the cap on the Pricing desk.' })).toHaveAttribute('href', /pricing\?tab=assumptions/);
    expect(calls).toEqual([]);

    // Raising the cap on the Pricing desk lets the next question through (still no call here: the cap check alone is under test).
    await note.getByRole('link').click();
    await expect(page.getByText('Desk helper daily AI budget on this device (0 = no cap)')).toBeVisible();
  });

  test('Regulation check: one provider is used by the helper at a time, and the switch matches Ask the desk', async ({ page }) => {
    await gotoScreen(page, '/regulation-check');
    // Gemini is the desk default.
    await expect(page.getByTestId('regcheck-provider-switch-google')).toHaveAttribute('aria-checked', 'true');
    await expect(page.getByTestId('regcheck-gemini-key-inuse')).toBeVisible();
    await expect(page.getByTestId('regcheck-key-inuse')).toHaveCount(0);
    await page.getByTestId('regcheck-provider-switch-anthropic').click();
    await expect(page.getByTestId('regcheck-key-inuse')).toBeVisible();
    await expect(page.getByTestId('regcheck-gemini-key-inuse')).toHaveCount(0);
    await gotoScreen(page, '/ask');
    await expect(page.getByTestId('provider-switch-anthropic')).toHaveAttribute('aria-checked', 'true');
    await expect(page.getByTestId('ask-model')).toHaveText(/Haiku 5\.5/);
  });
});
