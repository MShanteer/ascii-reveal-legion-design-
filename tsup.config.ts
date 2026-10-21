import { defineConfig } from 'tsup';

export default defineConfig([
  {
    entry: { index: 'src/index.ts' },
    format: ['esm', 'cjs'],
    dts: true,
    clean: true,
    sourcemap: false,
    minify: true,
    target: 'es2020',
    external: ['react', 'react-dom'],
    // keeps the component usable from Next.js App Router server components
    banner: { js: '"use client";' },
  },
  {
    entry: { core: 'src/core/index.ts' },
    format: ['esm', 'cjs'],
    dts: true,
    sourcemap: false,
    minify: true,
    target: 'es2020',
  },
]);
