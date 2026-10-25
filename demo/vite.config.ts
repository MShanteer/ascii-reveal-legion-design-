import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  plugins: [react()],
  base: './',
  resolve: { dedupe: ['react', 'react-dom'] },
  build: {
    rollupOptions: {
      // the original showcase page, and the Legion page (legion.html)
      input: {
        main: fileURLToPath(new URL('./index.html', import.meta.url)),
        legion: fileURLToPath(new URL('./legion.html', import.meta.url)),
      },
    },
  },
});
