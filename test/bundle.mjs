// Bundles test entries against a chosen React (19 = the repo's own, 18 = test/react18) so the same test runs on both.
import { build } from 'esbuild';
import fs from 'node:fs';
import path from 'node:path';
import { root } from './helpers.mjs';

export const react18 = path.join(root, 'test', 'react18', 'node_modules');
export const hasReact18 = fs.existsSync(path.join(react18, 'react', 'package.json'));

export const versions = [19, ...(hasReact18 ? [18] : [])];

/**
 * Bundle `entry` (a path) with every `react` / `react-dom` import forced to one copy of the requested major.
 * `platform: 'node'` gives a CommonJS bundle to require(); `'browser'` gives an IIFE to load in a page.
 */
export async function bundle(entry, { react = 19, platform = 'node' } = {}) {
  const alias = react === 18 ? { react: path.join(react18, 'react'), 'react-dom': path.join(react18, 'react-dom') } : {};
  const out = await build({
    entryPoints: [entry],
    bundle: true,
    write: false,
    platform,
    format: platform === 'node' ? 'cjs' : 'iife',
    target: 'es2020',
    jsx: 'automatic',
    alias,
    // the development builds of React: they print the hydration and prop warnings we want to catch
    define: { 'process.env.NODE_ENV': '"development"' },
    logLevel: 'silent',
    absWorkingDir: root,
  });
  return out.outputFiles[0].text;
}
