import { test, expect, Page } from '@playwright/test';
import { MOBILE_ROUTES, gotoScreen, collectPageErrors, appErrors, expectNoErrorBoundary, waitForIdle } from './helpers';
import { NAV_GROUPS } from '../src/app/navConfig';

/**
 * Mobile shell + PWA acceptance gate.
 *
 * Runs on the `mobile-chrome` and `mobile-safari` projects only (see playwright.config.ts —
 * both use `testMatch: /(^|[\\/])mobile[\w.-]*\.spec\.ts$/`, and `chromium` uses `testIgnore`
 * for the same pattern — anchored to the filename, not just "contains mobile", because this
 * worktree's own directory name (biomethane-mobile) would otherwise match every spec file's
 * absolute path). Every screen in the app gets swept for horizontal overflow and a reference
 * screenshot; the shell tests pin down the bottom-tab-bar/sheet contract the mobile shell
 * agent is building against these exact `data-testid`s.
 */

// src/store/theme.tsx: ThemeProvider reads/writes this key with 'light' | 'dark'.
const THEME_STORAGE_KEY = 'biomethane-desk-theme';

function slugify(path: string): string {
  if (path === '/') return 'root';
  return path.replace(/^\//, '').replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'root';
}

interface OverflowResult {
  innerWidth: number;
  docOverflow: boolean;
  docScrollWidth: number;
  mainOverflow: boolean;
  mainScrollWidth: number | null;
  mainClientWidth: number | null;
  offenders: string[];
}

/**
 * Finds elements that push past the viewport's right edge (or off its left edge), the way a
 * trader would notice: something clipped or requiring a horizontal swipe. Deliberately excludes
 * (a) content inside an ancestor that itself scrolls horizontally and fits within the viewport —
 * that's a designed scroll region, e.g. a wide table — and (b) closed sheets/drawers, which sit
 * off-canvas via `position: fixed` + a translate transform or `visibility: hidden` until opened.
 */
async function findOverflow(page: Page): Promise<OverflowResult> {
  return page.evaluate(() => {
    const innerWidth = window.innerWidth;
    const docEl = document.documentElement;
    const main = document.getElementById('main-content');
    const docScrollWidth = docEl.scrollWidth;
    const mainScrollWidth = main ? main.scrollWidth : null;
    const mainClientWidth = main ? main.clientWidth : null;

    function isVisible(el: Element): boolean {
      const style = window.getComputedStyle(el);
      if (style.display === 'none' || style.visibility === 'hidden') return false;
      if (parseFloat(style.opacity || '1') === 0) return false;
      const rect = el.getBoundingClientRect();
      return rect.width > 0 || rect.height > 0;
    }

    /** True if `el` (or an ancestor) is a fixed-position element parked off-canvas. */
    function isOffCanvasFixed(el: Element): boolean {
      let node: Element | null = el;
      while (node && node !== document.body) {
        const style = window.getComputedStyle(node);
        if (style.position === 'fixed') {
          const rect = node.getBoundingClientRect();
          const fullyOffscreen =
            rect.right <= 0 || rect.left >= innerWidth || rect.bottom <= 0 || rect.top >= window.innerHeight;
          if (style.visibility === 'hidden' || fullyOffscreen) return true;
        }
        node = node.parentElement;
      }
      return false;
    }

    /**
     * How an ancestor contains `el` when `el` sticks out past the viewport:
     * - 'scroll': a designed horizontal scroll region (overflow-x auto/scroll) that itself fits the
     *   viewport, e.g. a .table-scroll wrapper. Allowed. The page scroll containers (#main-content,
     *   body, html) don't count: overflow-y:auto makes overflow-x compute to auto too, which would
     *   otherwise excuse everything on the page.
     * - 'ellipsis': a text-overflow: ellipsis box truncating on purpose. Allowed.
     * - 'marked': inside [data-overflow-ok], a container that clips on purpose (maps, carousels).
     *   Allowed, and reviewed by hand.
     * - 'clip': an overflow hidden/clip ancestor cutting content off. A defect: the trader can't
     *   see or reach it.
     * - null: nothing contains it, so it pushes the page sideways.
     */
    function containment(el: Element): { kind: 'scroll' | 'ellipsis' | 'marked' | 'clip' | null; by?: Element } {
      let node: Element | null = el.parentElement;
      while (node && node !== document.body && node !== document.documentElement) {
        if (node.hasAttribute('data-overflow-ok')) return { kind: 'marked', by: node };
        if (node.id === 'main-content') { node = node.parentElement; continue; }
        const style = window.getComputedStyle(node);
        const rect = node.getBoundingClientRect();
        const fits = rect.right <= innerWidth + 1 && rect.left >= -1;
        if (/(auto|scroll)/.test(style.overflowX) && fits) return { kind: 'scroll', by: node };
        if (style.overflowX === 'hidden' || style.overflowX === 'clip') {
          if (style.textOverflow === 'ellipsis') return { kind: 'ellipsis', by: node };
          if (fits) return { kind: 'clip', by: node };
        }
        node = node.parentElement;
      }
      return { kind: null };
    }

    /** Screen-reader-only text and zero-size helpers are positioned off-canvas on purpose. */
    function isVisuallyHidden(el: Element, rect: DOMRect): boolean {
      return rect.width <= 1 || rect.height <= 1 || el.classList.contains('sr-only');
    }

    function describe(el: Element, rect: DOMRect): string {
      const tag = el.tagName.toLowerCase();
      const id = (el as HTMLElement).id ? `#${(el as HTMLElement).id}` : '';
      const rawClass = typeof el.className === 'string' ? el.className : (el as SVGElement).getAttribute?.('class') || '';
      const cls = rawClass.trim() ? '.' + rawClass.trim().split(/\s+/).slice(0, 2).join('.') : '';
      const text = (el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 30);
      return `${tag}${id}${cls} "${text}" right=${Math.round(rect.right)}`;
    }

    const offenders: string[] = [];
    const all = document.querySelectorAll('body *');
    for (const el of Array.from(all)) {
      if (offenders.length >= 15) break;
      if (!isVisible(el)) continue;
      const rect = el.getBoundingClientRect();
      if (rect.right > innerWidth + 1 || rect.left < -1) {
        // SVG internals are clipped by their own <svg> viewport (charts, the map).
        if ((el as SVGElement).ownerSVGElement) continue;
        if (isVisuallyHidden(el, rect)) continue;
        if (isOffCanvasFixed(el)) continue;
        const c = containment(el);
        if (c.kind === 'scroll' || c.kind === 'ellipsis' || c.kind === 'marked') continue;
        const byDesc = c.by ? describe(c.by, c.by.getBoundingClientRect()).split(' "')[0] : '';
        offenders.push(describe(el, rect) + (c.kind === 'clip' ? ` (clipped by ${byDesc})` : ''));
      }
    }

    return {
      innerWidth,
      docOverflow: docScrollWidth > innerWidth + 1,
      docScrollWidth,
      mainOverflow: mainScrollWidth != null && mainClientWidth != null ? mainScrollWidth > mainClientWidth + 1 : false,
      mainScrollWidth,
      mainClientWidth,
      offenders,
    };
  });
}

test.describe('overflow', () => {
  for (const route of MOBILE_ROUTES) {
    test(`overflow ${route.path}`, async ({ page }) => {
      const errors = collectPageErrors(page);
      await gotoScreen(page, route.path);
      await waitForIdle(page);
      await expectNoErrorBoundary(page);

      const result = await findOverflow(page);
      const offenderList = result.offenders.length
        ? `\nOffending elements (up to 15):\n${result.offenders.map(o => `  - ${o}`).join('\n')}`
        : '';

      expect(
        result.docOverflow,
        `document scrollWidth (${result.docScrollWidth}px) exceeds the viewport (${result.innerWidth}px)${offenderList}`
      ).toBe(false);
      expect(
        result.mainOverflow,
        `#main-content scrollWidth (${result.mainScrollWidth}px) exceeds its clientWidth (${result.mainClientWidth}px)${offenderList}`
      ).toBe(false);
      expect(result.offenders, `elements overflow the viewport${offenderList}`).toEqual([]);

      expect(appErrors(errors), 'unexpected console/page errors').toEqual([]);
    });
  }
});

test.describe('screenshot', () => {
  async function captureFullPage(page: Page, filePath: string) {
    const viewport = page.viewportSize();
    if (!viewport) return;

    const dims = await page.evaluate(() => {
      const header = document.querySelector('header.app-header');
      const tabbar = document.querySelector('[data-testid="mobile-tabbar"]');
      const main = document.getElementById('main-content');
      return {
        headerH: header ? header.getBoundingClientRect().height : 0,
        tabbarH: tabbar ? tabbar.getBoundingClientRect().height : 0,
        mainScrollH: main ? main.scrollHeight : document.documentElement.scrollHeight,
      };
    });

    // #main-content scrolls internally rather than the page, so page.screenshot({ fullPage:
    // true }) only captures one viewport-worth of it. Instead, grow the viewport to fit the
    // whole stack (header + full content + tab bar), capped so a runaway screen can't hang
    // the browser, then take an ordinary (non-fullPage) screenshot and restore the viewport.
    const targetHeight = Math.min(Math.ceil(dims.headerH + dims.mainScrollH + dims.tabbarH) + 8, 6000);
    await page.setViewportSize({ width: viewport.width, height: targetHeight });
    await page.screenshot({ path: filePath });
    await page.setViewportSize(viewport);
  }

  async function setThemeAndReload(page: Page, theme: 'light' | 'dark') {
    await page.evaluate(
      ([key, value]) => {
        try {
          window.localStorage.setItem(key, value);
        } catch {
          /* storage unavailable — screenshot will just show the default theme */
        }
      },
      [THEME_STORAGE_KEY, theme] as const
    );
    await page.reload();
    await expect(page.getByText('Loading module...')).toHaveCount(0, { timeout: 15_000 });
    await expect(page.locator('#main-content')).toBeVisible({ timeout: 15_000 });
    await waitForIdle(page);
  }

  for (const route of MOBILE_ROUTES) {
    // Human-review only — never fails on content, only on the page failing to load at all.
    test(`screenshot ${route.path}`, async ({ page }, testInfo) => {
      await gotoScreen(page, route.path);

      const slug = slugify(route.path);
      for (const theme of ['light', 'dark'] as const) {
        await setThemeAndReload(page, theme);
        const filePath = `${process.env.MOBILE_SHOTS_DIR ?? 'test-results/mobile'}/${testInfo.project.name}/${slug}-${theme}.png`;
        await captureFullPage(page, filePath);
      }
    });
  }
});

test.describe('shell', () => {
  test('bottom tab bar is visible with tap targets at least 44px tall', async ({ page }) => {
    await gotoScreen(page, '/sourcing');
    await expect(page.getByTestId('mobile-tabbar')).toBeVisible();

    const tabIds = [...NAV_GROUPS.map(g => `tab-${g.id}`), 'tab-desk'];
    for (const id of tabIds) {
      const tab = page.getByTestId(id);
      await expect(tab, `${id} should be visible`).toBeVisible();
      const box = await tab.boundingBox();
      expect(box?.height ?? 0, `${id} should be at least 44px tall for a comfortable tap target`).toBeGreaterThanOrEqual(44);
    }
  });

  for (const group of NAV_GROUPS) {
    test(`tab-${group.id} opens nav-sheet listing its pages, and each one navigates`, async ({ page }) => {
      await gotoScreen(page, '/sourcing');

      for (const item of group.items) {
        await page.getByTestId(`tab-${group.id}`).click();
        const sheet = page.getByTestId('nav-sheet');
        await expect(sheet).toBeVisible();
        await expect(sheet).toHaveAttribute('role', 'dialog');
        await expect(sheet, `nav-sheet for "${group.label}" should list "${item.label}"`).toContainText(item.label);

        await sheet.getByText(item.label, { exact: true }).first().click();

        const expectedHash = `#${item.to}`;
        await expect(page).toHaveURL(new RegExp(expectedHash.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(\\?|$)'));
        await expect(sheet, 'nav-sheet should close after navigating').not.toBeVisible();
      }
    });
  }

  test('tab-desk opens desk-sheet with backup and restore actions', async ({ page }) => {
    await gotoScreen(page, '/sourcing');
    await page.getByTestId('tab-desk').click();

    const sheet = page.getByTestId('desk-sheet');
    await expect(sheet).toBeVisible();
    await expect(sheet).toHaveAttribute('role', 'dialog');
    await expect(sheet.getByRole('button', { name: /back up/i })).toBeVisible();
    await expect(sheet.getByRole('button', { name: /restore/i })).toBeVisible();
  });

  test('desktop footer is not rendered on mobile', async ({ page }) => {
    await gotoScreen(page, '/sourcing');
    await expect(page.locator('footer.app-footer')).toHaveCount(0);
  });
});

test.describe('inputs', () => {
  for (const path of ['/sourcing', '/pricing']) {
    test(`inputs on ${path} are at least 16px (avoids iOS Safari auto-zoom on focus)`, async ({ page }) => {
      await gotoScreen(page, path);

      const offenders = await page.evaluate(() => {
        const found: string[] = [];
        document.querySelectorAll('input, select, textarea').forEach(el => {
          const style = window.getComputedStyle(el as HTMLElement);
          const rect = (el as HTMLElement).getBoundingClientRect();
          const visible = style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
          if (!visible) return;
          const fontSize = parseFloat(style.fontSize);
          if (fontSize < 16) {
            const id = (el as HTMLElement).id ? `#${(el as HTMLElement).id}` : '';
            const name = (el as HTMLInputElement).name ? `[name=${(el as HTMLInputElement).name}]` : '';
            found.push(`${el.tagName.toLowerCase()}${id}${name} font-size=${fontSize}px`);
          }
        });
        return found;
      });

      expect(offenders, `inputs below 16px font-size:\n${offenders.join('\n')}`).toEqual([]);
    });
  }
});

test.describe('pwa', () => {
  test.beforeEach(async ({}, testInfo) => {
    test.skip(testInfo.project.name !== 'mobile-chrome', 'Service worker / install checks run once, on mobile-chrome only');
  });

  test('manifest and its icons are served correctly', async ({ request, baseURL }) => {
    const manifestUrl = new URL('manifest.webmanifest', baseURL!).toString();
    const manifestRes = await request.get(manifestUrl);
    test.skip(!manifestRes.ok(), 'manifest.webmanifest not served — PW_BASE_URL is likely a dev server, not a production preview build');

    expect(manifestRes.status()).toBe(200);
    const manifest = await manifestRes.json();
    expect(manifest.name, 'manifest.name').toBeTruthy();
    expect(manifest.start_url, 'manifest.start_url').toBeTruthy();
    expect(manifest.display, 'manifest.display').toBeTruthy();
    expect(Array.isArray(manifest.icons) && manifest.icons.length > 0, 'manifest.icons').toBe(true);

    for (const icon of manifest.icons as Array<{ src: string }>) {
      const iconUrl = new URL(icon.src, manifestUrl).toString();
      const iconRes = await request.get(iconUrl);
      expect(iconRes.status(), `icon ${icon.src} should return 200`).toBe(200);
      expect(iconRes.headers()['content-type'] || '', `icon ${icon.src} should be a PNG`).toContain('image/png');
    }
  });

  test('registers a service worker and keeps the shell usable offline', async ({ page, context, request, baseURL }) => {
    const manifestUrl = new URL('manifest.webmanifest', baseURL!).toString();
    const manifestRes = await request.get(manifestUrl);
    test.skip(!manifestRes.ok(), 'manifest.webmanifest not served — PW_BASE_URL is likely a dev server, not a production preview build');

    await gotoScreen(page, '/plants');

    const ready = await page.evaluate(
      () =>
        new Promise<boolean>(resolve => {
          if (!('serviceWorker' in navigator)) return resolve(false);
          const timer = setTimeout(() => resolve(false), 20_000);
          navigator.serviceWorker.ready.then(() => {
            clearTimeout(timer);
            resolve(true);
          });
        })
    );
    expect(ready, 'navigator.serviceWorker.ready should resolve within 20s').toBe(true);

    // One normal reload so the (now-installed) service worker takes over navigation requests.
    await page.reload();
    await expect(page.locator('#main-content')).toBeVisible({ timeout: 15_000 });

    await context.setOffline(true);
    try {
      await page.goto('/#/plants');
      await expect(page.locator('#main-content'), 'app shell should render from the precache while offline').toBeVisible({
        timeout: 15_000,
      });
    } finally {
      await context.setOffline(false);
    }
  });
});
