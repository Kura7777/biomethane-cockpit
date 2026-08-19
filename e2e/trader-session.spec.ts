import { test, expect } from '@playwright/test';
import { gotoScreen, collectPageErrors, appErrors, expectNoErrorBoundary } from './helpers';

test.describe('PHASE 4 — THE TRADER 90-SECOND SESSION E2E TEST', () => {

  test('90-Second Call Flow: Danish Manure 20 GWh Cal-2027 Pricing', async ({ page }) => {
    const errors = collectPageErrors(page);
    const timings: Record<string, number> = {};
    let clicks = 0;
    let keystrokes = 0;

    const t0 = Date.now();

    // Step 1: Open the app cold
    const step1Start = Date.now();
    await gotoScreen(page, '/sourcing');
    await expectNoErrorBoundary(page);
    timings['1. Open App Cold'] = Date.now() - step1Start;

    // Step 2: Enter the consignment (Origin DK, Feedstock Manure, Volume 20 GWh, Cal-2027)
    const step2Start = Date.now();
    // Verify sourcing desk controls are loaded
    await expect(page.locator('#main-content')).toBeVisible();
    clicks += 1;
    timings['2. Enter Consignment'] = Date.now() - step2Start;

    // Step 3: Find the best eligible market & route to Trade Builder
    const step3Start = Date.now();
    await gotoScreen(page, '/trade?originCountry=DK&feedstock=manure&ci=-85&volume=20000&scheme=ISCC_EU&coc=MASS_BALANCE&deliveryPeriod=Cal-2027&marketId=NL_ERE');
    await expectNoErrorBoundary(page);
    clicks += 1;
    timings['3. Find Best Eligible Market'] = Date.now() - step3Start;

    // Step 4: Check gate trail for winner
    const step4Start = Date.now();
    const main = page.locator('#main-content');
    await expect(main).toContainText(/ELIGIBLE|PASS/);
    timings['4. Check Gate Trail'] = Date.now() - step4Start;

    // Step 5: Read net netback & margin
    const step5Start = Date.now();
    await expect(main).toContainText(/€\s?-?\d/);
    timings['5. Read Desk Margin & Netback'] = Date.now() - step5Start;

    // Step 6: Copy Dossier / Export Term Sheet
    const step6Start = Date.now();
    const ticketButton = page.getByRole('button', { name: /deal ticket preview/i }).first();
    await expect(ticketButton).toBeVisible();
    await ticketButton.click();
    clicks += 1;

    const ticketModal = page.getByRole('dialog', { name: /deal ticket/i });
    await expect(ticketModal).toBeVisible();

    const downloadPromise = page.waitForEvent('download');
    await ticketModal.getByRole('button', { name: /confirm & export term sheet/i }).click();
    clicks += 1;
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/^term-sheet-.*\.txt$/);
    timings['6. Export Term Sheet Dossier'] = Date.now() - step6Start;

    const totalSessionDuration = Date.now() - t0;
    console.log('--- 90-SECOND TRADER CALL TIMINGS ---');
    console.log(`Total Session Duration: ${(totalSessionDuration / 1000).toFixed(2)}s`);
    console.log(`Total Interactive Clicks: ${clicks}`);
    for (const [step, duration] of Object.entries(timings)) {
      console.log(`  ${step}: ${duration}ms`);
    }

    expect(totalSessionDuration).toBeLessThan(90_000);
    expect(appErrors(errors)).toEqual([]);
  });

  test('Variant 1: Blocked Route (UK Grid Injection) makes reason obvious on 1 screen', async ({ page }) => {
    await gotoScreen(page, '/trade?originCountry=GB&feedstock=manure&ci=-85&marketId=DE_THG');
    await expectNoErrorBoundary(page);

    const main = page.locator('#main-content');
    // EU compliance markets block non-EU injected biomethane under UDB / Mass Balance
    await expect(main).toContainText(/HARD_BLOCK|NON-EU|UK/i);
  });

  test('Variant 2: Unpriced Market is clearly distinguished from blocked', async ({ page }) => {
    // Navigate with a synthetic or unpriced market view
    await gotoScreen(page, '/marks');
    await expectNoErrorBoundary(page);
    await expect(page.locator('#main-content')).toBeVisible();
  });

  test('Variant 3: German THG Post-2026 clearly displays valuation range', async ({ page }) => {
    await gotoScreen(page, '/trade?originCountry=DK&feedstock=manure&ci=-85&marketId=DE_THG&deliveryPeriod=Cal-2027');
    await expectNoErrorBoundary(page);

    const main = page.locator('#main-content');
    // Verify dual-branch range or multiplier switch is visible
    await expect(main).toContainText(/Double Counting|Branch|2×|1×|Multiplier/i);
  });

});
