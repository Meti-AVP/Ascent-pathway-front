import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Onyx on its own: one page (index.html), the four Onyx screens behind hash routes.
export default defineConfig({
  plugins: [react()],
  server: { port: 5350, strictPort: true },
  build: { target: 'es2022', chunkSizeWarningLimit: 1400 },
});
