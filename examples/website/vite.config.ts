import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath } from 'node:url';

const repositoryRoot = fileURLToPath(new URL('../..', import.meta.url));

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('/node_modules/hls.js/')) return 'hls-player';
        },
      },
    },
  },
  server: {
    fs: { allow: [repositoryRoot] },
    port: 5173,
    proxy: {
      '/api': {
        target: `http://localhost:${process.env.API_PORT ?? 3030}`,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
});
