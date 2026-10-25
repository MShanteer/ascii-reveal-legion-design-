import { defineConfig } from 'tsup';

export default defineConfig([
  {
    entry: { index: 'src/index.ts' },
    format: ['esm', 'cjs'],
    dts: true,
    // no `clean` here: the two builds run in parallel and one would delete the other's output. `npm run build` cleans first.
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
