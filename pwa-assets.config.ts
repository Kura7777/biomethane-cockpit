import { defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config';

/**
 * Generates the installable-app icon set (favicon.ico, pwa-*.png, maskable, apple-touch)
 * from a single flat, full-bleed source image (pwa-icon-source.svg) — NOT from
 * public/brand.svg, which bakes in rounded corners for direct use as the browser-tab
 * SVG favicon. A rounded-corner source would leave transparent triangles in the
 * corners of the maskable icon, which OS icon masks assume is opaque brand color.
 *
 * Run with: npx pwa-assets-generator
 */
export default defineConfig({
  preset: {
    ...minimal2023Preset,
    // The flame already sits within the 80% (40%-radius) maskable safe zone at its
    // authored size, and the source is already full-bleed accent color — no extra
    // padding needed for any of the three asset types.
    transparent: {
      ...minimal2023Preset.transparent,
      padding: 0,
    },
    maskable: {
      ...minimal2023Preset.maskable,
      padding: 0,
      resizeOptions: { fit: 'contain', background: '#c9321f' },
    },
    apple: {
      ...minimal2023Preset.apple,
      padding: 0,
      resizeOptions: { fit: 'contain', background: '#c9321f' },
    },
  },
  images: ['public/pwa-icon-source.svg'],
});
