import { defineConfig, devices } from '@playwright/test';

/**
 * Browser tests for the desk.
 *
 * The domain suite (`npm test`) covers the pricing engines and never opens a page.
 * That gap is how the Trade Builder came to be imported by App.tsx, linked to by
 * nine screens, and rendered by no Route — type-clean, building, and completely
 * unreachable. Everything here exists to run the app the way a trader does.
 *
 * When PW_BASE_URL is set, tests run against that URL instead of managing their own
 * webServer — this lets several agents each point at their own `vite preview` instance
 * (e.g. mobile PWA work at :4302) without fighting over the desktop suite's server.
 */
const externalBaseUrl = process.env.PW_BASE_URL;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  workers: process.env.CI ? 2 : 4,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'list' : [['list'], ['html', { open: 'never' }]],

  use: {
    // The dev server pins this port via strictPort — desk state lives in
    // localStorage, which is per-origin, so a drifting port would silently serve
    // an empty desk.
    baseURL: externalBaseUrl ?? 'http://localhost:4200',
    trace: 'retain-on-failure',
    video: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      testIgnore: /(^|[\\/])mobile[\w.-]*\.spec\.ts$/,
      // The shell declares min-w-[1400px] on desktop; a narrower viewport puts every
      // screen into horizontal scroll and moves controls out of view, which would
      // make these tests fail for reasons that have nothing to do with the app. The
      // mobile projects below intentionally use real phone viewports instead — that's
      // what e2e/mobile.spec.ts is there to exercise.
      use: { ...devices['Desktop Chrome'], viewport: { width: 1600, height: 950 } },
    },
    {
      name: 'mobile-chrome',
      testMatch: /(^|[\\/])mobile[\w.-]*\.spec\.ts$/,
      use: { ...devices['Pixel 7'] },
    },
    {
      name: 'mobile-safari',
      testMatch: /(^|[\\/])mobile[\w.-]*\.spec\.ts$/,
      use: { ...devices['iPhone 14'] },
    },
    {
      // A phone turned sideways (844x390, touch) must still get the compact layout.
      name: 'mobile-landscape',
      testMatch: /(^|[\\/])mobile[\w.-]*\.spec\.ts$/,
      use: { ...devices['iPhone 14 landscape'] },
    },
    {
      // iPad portrait (768x1024, touch) also gets the compact layout.
      name: 'tablet',
      testMatch: /(^|[\\/])mobile[\w.-]*\.spec\.ts$/,
      use: { ...devices['iPad Mini'] },
    },
  ],

  ...(externalBaseUrl
    ? {}
    : {
        webServer: {
          // Tests run against the production build, not the dev server. The dev server
          // transforms modules on demand, so several workers requesting different lazy
          // screens at once leaves them all sitting on the Suspense fallback for tens of
          // seconds — failures that say nothing about the app. Building first also means
          // `npm run test:e2e` gates on `tsc -b`, and exercises the bundle that ships.
          command: process.platform === 'win32' ? 'cmd.exe /c "npm run build && npm run preview"' : 'npm run build && npm run preview',
          url: 'http://localhost:4200',
          reuseExistingServer: !process.env.CI,
          timeout: 180_000,
        },
      }),
});
