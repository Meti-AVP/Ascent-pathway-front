import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// One app, four entry pages: the hub, and one page per design direction.
export default defineConfig({
  plugins: [react()],
  // Several directions are built at once; a half-finished file in one must never cover the others
  // with Vite's error overlay while they are being reviewed. Errors still show in the console.
  server: { port: 5340, strictPort: true, hmr: { overlay: false } },
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 1400,
    rollupOptions: {
      input: {
        index: resolve(import.meta.dirname, 'index.html'),
        summit: resolve(import.meta.dirname, 'summit.html'),
        tapes: resolve(import.meta.dirname, 'tapes.html'),
        ember: resolve(import.meta.dirname, 'ember.html'),
      },
    },
  },
});
