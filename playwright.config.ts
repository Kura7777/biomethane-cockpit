import { defineConfig, devices } from '@playwright/test';

/**
 * Browser tests for the desk.
 *
 * The domain suite (`npm test`) covers the pricing engines and never opens a page.
 * That gap is how the Trade Builder came to be imported by App.tsx, linked to by
 * nine screens, and rendered by no Route — type-clean, building, and completely
 * unreachable. Everything here exists to run the app the way a trader does.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'list' : [['list'], ['html', { open: 'never' }]],

  use: {
    // The dev server pins this port via strictPort — desk state lives in
    // localStorage, which is per-origin, so a drifting port would silently serve
    // an empty desk.
    baseURL: 'http://localhost:4200',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      // The shell declares min-w-[1400px]; a narrower viewport puts every screen
      // into horizontal scroll and moves controls out of view, which would make
      // these tests fail for reasons that have nothing to do with the app.
      use: { ...devices['Desktop Chrome'], viewport: { width: 1600, height: 950 } },
    },
  ],

  webServer: {
    // Tests run against the production build, not the dev server. The dev server
    // transforms modules on demand, so several workers requesting different lazy
    // screens at once leaves them all sitting on the Suspense fallback for tens of
    // seconds — failures that say nothing about the app. Building first also means
    // `npm run test:e2e` gates on `tsc -b`, and exercises the bundle that ships.
    command: 'npm run build && npm run preview',
    url: 'http://localhost:4200',
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
