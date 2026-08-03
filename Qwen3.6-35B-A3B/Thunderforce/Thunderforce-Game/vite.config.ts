import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  server: {
    host: '127.0.0.1',
    port: 5188,
    strictPort: true,
  },
  preview: {
    host: '127.0.0.1',
    port: 4188,
    strictPort: true,
  },
  build: {
    sourcemap: true,
    chunkSizeWarningLimit: 900,
  },
  resolve: {
    alias: {
      '@engine': resolve(__dirname, 'packages/engine/src'),
      '@game': resolve(__dirname, 'packages/game/src'),
      '@ui': resolve(__dirname, 'packages/ui/src'),
    },
  },
});
