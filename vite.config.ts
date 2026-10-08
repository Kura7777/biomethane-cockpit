import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';
import { visualizer } from 'rollup-plugin-visualizer';
import { apiServerPlugin } from './src/server/vitePlugin';

// https://vite.dev/config/
export default defineConfig({
  base: './', // Ensures static deployment / file:// / subpath compatibility
  // Desk state (marks, costs, saved assessments) lives in localStorage, which is scoped per
  // origin — so a drifting port silently orphans hand-keyed marks. strictPort makes a taken
  // port fail loudly instead of quietly serving the desk from a new, empty origin.
  server: {
    port: 4200,
    strictPort: true,
  },
  preview: {
    port: 4200,
    strictPort: true,
  },
  plugins: [
    react(),
    tailwindcss(),
    apiServerPlugin(),
    VitePWA({
      registerType: 'prompt',
      injectRegister: null, // we call registerSW ourselves from src/app/pwa.ts
      strategies: 'generateSW',
      // Without this, vite-plugin-pwa treats an asset that exceeds
      // workbox.maximumFileSizeToCacheInBytes as a fatal build error rather than
      // just excluding it from the precache — but excluding the multi-MB plant/data
      // chunks from the precache (they're runtime-cached instead, see below) is
      // exactly the intended behaviour here, so downgrade it to a warning.
      showMaximumFileSizeToCacheInBytesWarning: true,
      includeAssets: ['favicon.ico', 'brand.svg', 'apple-touch-icon-180x180.png'],
      manifest: {
        id: './',
        name: 'Biomethane Desk',
        short_name: 'Biomethane Desk',
        description: 'The trader desk for European biomethane: netbacks, registry compliance, sourcing and pricing, offline-ready.',
        start_url: './',
        scope: './',
        display: 'standalone',
        display_override: ['standalone'],
        background_color: '#15171c',
        theme_color: '#15171c',
        lang: 'en-GB',
        categories: ['business', 'finance', 'productivity'],
        icons: [
          { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png', purpose: 'any' },
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
        shortcuts: [
          { name: 'Pricing desk', url: './#/pricing', icons: [{ src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' }] },
          { name: 'Plants', url: './#/plants', icons: [{ src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' }] },
          { name: 'Origination', url: './#/sourcing', icons: [{ src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' }] },
          { name: 'Clients', url: './#/clients', icons: [{ src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' }] },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,webmanifest,woff2}'],
        // Default maximumFileSizeToCacheInBytes (2 MiB) intentionally keeps the
        // multi-MB plant/data chunks out of the precache; they're runtime-cached below.
        cleanupOutdatedCaches: true,
        navigateFallback: 'index.html',
        navigateFallbackDenylist: [/^\/api\//],
        runtimeCaching: [
          {
            urlPattern: ({ url, sameOrigin }) => sameOrigin && /\/assets\/.*\.js$/.test(url.pathname),
            handler: 'CacheFirst',
            options: {
              cacheName: 'desk-chunks',
              expiration: { maxEntries: 80, maxAgeSeconds: 60 * 60 * 24 * 60 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'google-fonts-css' },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-files',
              expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
      devOptions: {
        enabled: false,
      },
    }),
    // Bundle composition report. Opt-in only: `ANALYZE=1 npm run build` writes
    // dist/stats.html instead of touching the default build output.
    process.env.ANALYZE === '1' &&
      visualizer({
        filename: 'dist/stats.html',
        template: 'treemap',
        gzipSize: true,
        brotliSize: true,
      }),
  ],
  test: {
    exclude: ['**/node_modules/**', '**/e2e/**', '**/dist/**', '**/.claude/**'], // .claude/worktrees holds other agents' repo copies
  },
});
