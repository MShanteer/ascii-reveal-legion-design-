// Server rendering and React/Next compatibility. No browser needed. Run `npm run build` first.
// Usage: node --test test/ssr.test.mjs
// Runs the same checks against React 19 (this repo's) and React 18 (test/react18, installed by `npm run test:setup`).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { bundle, versions, hasReact18 } from './bundle.mjs';
import { root } from './helpers.mjs';

const require = createRequire(import.meta.url);
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'arl-ssr-'));

const count = (s, needle) => s.split(needle).length - 1;

for (const major of versions) {
  test(`React ${major}: server markup is identical across renders (no hydration mismatch from Math.random, Date or ids)`, async () => {
    const file = path.join(tmp, `server-${major}.cjs`);
    fs.writeFileSync(file, await bundle(path.join(root, 'test/fixtures/server.jsx'), { react: major, platform: 'node' }));
    const r = require(file).run();

    assert.equal(r.first, r.second, 'the same tree rendered twice gives the same HTML');
    for (const [a, b] of r.skeletons) assert.equal(a, b, 'every skeleton variant renders the same HTML twice');
    assert.notEqual(r.skeletons[0][0], r.skeletons[4][0], 'different variants really differ');
    assert.deepEqual(r.problems, [], 'React printed no warnings or errors while rendering on the server');

    const html = r.first;
    assert.ok(html.includes('class="ars ars-legion"'), 'the legion skeleton is in the markup');
    assert.ok(html.includes('role="status"'), 'the loader is a status region');
    assert.ok(html.includes('data-label="loading"') && html.includes('data-label="thinking"'), 'loader labels are in the markup');
    assert.ok(html.includes('>a &amp; b &lt; c<'), 'a label with markup characters is escaped');
    assert.ok(!html.includes('data-ar-pending'), 'server-rendered content is not hidden while it waits for the client');
    assert.ok(html.includes('Hello Legion') && html.includes('42 ms'), 'server-rendered content is readable without JavaScript');
    assert.ok(!/<canvas/.test(html), 'no canvas is rendered on the server (the shimmer only starts in the browser)');

    // React 19 hoists <style href precedence> and ships the skeleton CSS once; 18 repeats it per instance (documented)
    const styles = count(r.two, '.ars{') + count(r.two, '.ars)');
    if (major >= 19) assert.equal(count(r.two, 'data-href="ascii-reveal-skeleton"'), 1, 'React 19 sends the skeleton CSS once per page');
    else assert.ok(styles >= 2, 'React 18 repeats the CSS inline per skeleton (add SKELETON_CSS once to avoid it)');
  });
}

test('React 18 copy for the compat tests is installed (npm run test:setup)', { skip: hasReact18 ? false : 'run `npm run test:setup` to enable the React 18 checks' }, () => {
  assert.ok(versions.includes(18));
});

test("dist keeps the 'use client' directive on the React entry (Next.js App Router)", () => {
  for (const f of ['dist/index.js', 'dist/index.cjs']) {
    const head = fs.readFileSync(path.join(root, f), 'utf8').slice(0, 20);
    assert.ok(/^["']use client["'];/.test(head), `${f} starts with "use client" (got ${JSON.stringify(head)})`);
  }
  const core = fs.readFileSync(path.join(root, 'dist/core.js'), 'utf8');
  assert.ok(!core.includes('react'), 'the framework-free core has no React in it');
});

test('peer range covers React 17, 18 and 19, and react is not bundled', () => {
  const range = pkg.peerDependencies.react;
  assert.equal(range, '^17.0.0 || ^18.0.0 || ^19.0.0');
  assert.equal(pkg.peerDependencies['react-dom'], range);
  const esm = fs.readFileSync(path.join(root, 'dist/index.js'), 'utf8');
  assert.ok(/from"react"/.test(esm), 'dist imports react (peer) instead of bundling it');
  assert.ok(!esm.includes('react.production') && !esm.includes('__SECRET_INTERNALS'), 'no copy of React inside dist');
});

test('source uses no legacy or deprecated React API', () => {
  const files = [];
  const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).forEach((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : /\.(tsx?|jsx?)$/.test(e.name) && files.push(path.join(d, e.name))));
  walk(path.join(root, 'src'));
  const banned = [/\bReact\.FC\b/, /\bFunctionComponent\b/, /\.defaultProps\b/, /\.propTypes\b/, /\bfindDOMNode\b/, /\bReactDOM\.render\b/, /\bcontextTypes\b/, /\bUNSAFE_/, /componentWillMount|componentWillReceiveProps/, /\bcreateFactory\b/];
  for (const f of files) {
    const src = fs.readFileSync(f, 'utf8');
    for (const re of banned) assert.ok(!re.test(src), `${path.relative(root, f)} uses ${re}`);
  }
  assert.ok(files.length >= 4);
});

test('the package resolves by its own name, including legion.css', () => {
  assert.equal(pkg.name, 'ascii-reveal-legion');
  const css = fileURLToPathSafe(import.meta.resolve('ascii-reveal-legion/legion.css'));
  assert.equal(path.resolve(css), path.join(root, 'dist', 'legion.css'));
  assert.ok(fs.readFileSync(css, 'utf8').includes('--ascii-accent'));
  assert.ok(import.meta.resolve('ascii-reveal-legion').endsWith('/dist/index.js'));
  assert.ok(import.meta.resolve('ascii-reveal-legion/core').endsWith('/dist/core.js'));
});

function fileURLToPathSafe(u) {
  return new URL(u).pathname.replace(/^\/([A-Za-z]:)/, '$1');
}

test.after(() => fs.rmSync(tmp, { recursive: true, force: true }));
