import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// https://vite.dev/config/
export default defineConfig({
  base: './', // Ensures static deployment / file:// / subpath compatibility
  plugins: [
    react(),
    tailwindcss(),
  ],
});
