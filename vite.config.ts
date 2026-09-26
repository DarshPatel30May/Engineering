import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  // relative asset paths so the build works at any sub-path (e.g. GitHub Pages /Engineering/)
  base: './',
  plugins: [react()],
  server: { port: 5173 },
  build: { chunkSizeWarningLimit: 1500 },
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
  },
});
