import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

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
  ],
});
