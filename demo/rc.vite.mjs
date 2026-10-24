import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({ root: '/home/claude/ascii-reveal/demo', plugins: [react()], base: './', resolve: { dedupe: ['react','react-dom'] }, build: { rollupOptions: { input: '/home/claude/ascii-reveal/demo/readme-cards.html' } } });
