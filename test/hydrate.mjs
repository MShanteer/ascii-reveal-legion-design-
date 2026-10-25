// Hydrates server-rendered output in a real browser, under React.StrictMode, and checks for mismatches and leaks.
// Runs against React 19 (this repo's) and React 18 (test/react18, `npm run test:setup`). Run `npm run build` first.
// Usage: node test/hydrate.mjs
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { launch, serve, recorder, root } from './helpers.mjs';
import { bundle, versions } from './bundle.mjs';
import { installScheduleCounter } from './sched.mjs';

const require = createRequire(import.meta.url);
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'arl-hydrate-'));
const browser = await launch();
const { check, finish } = recorder();

for (const major of versions) {
  const file = path.join(tmp, `document-${major}.cjs`);
  fs.writeFileSync(file, await bundle(path.join(root, 'test/fixtures/document.jsx'), { react: major, platform: 'node' }));
  const html = require(file).html();
  const client = await bundle(path.join(root, 'test/fixtures/client.jsx'), { react: major, platform: 'browser' });
  const { server, base } = await serve(html, { '/client.js': { type: 'text/javascript', body: client } });

  const ctx = await browser.newContext({ viewport: { width: 900, height: 700 }, colorScheme: 'dark' });
  await ctx.addInitScript(installScheduleCounter);
  const page = await ctx.newPage();
  const problems = [];
  page.on('pageerror', (e) => problems.push('pageerror: ' + e));
  page.on('console', (m) => ['error', 'warning'].includes(m.type()) && problems.push(`${m.type()}: ${m.text()}`));
  const tag = `React ${major}`;

  await page.goto(base);
  await page.waitForFunction(() => window.hydrating);
  const before = await page.evaluate(() => document.body.innerHTML.length);
  check(`${tag}: server HTML is readable before hydration (labels, content, skeleton markup)`, html.includes('Hello Legion') && html.includes('class="ars ars-legion"') && html.includes('role="status"'));
  await page.waitForTimeout(1500);

  const state = await page.evaluate(() => ({
    errors: window.__errors,
    labels: [...document.querySelectorAll('.arl-label')].map((e) => e.textContent),
    decoding: document.querySelectorAll('[data-decoding]').length,
    hidden: document.querySelectorAll('[data-ar-t],[data-ar-m],[data-ar-s],[data-ar-f],[data-ar-pending]').length,
    heading: document.querySelector('h1')?.textContent,
    skeletonCanvases: document.querySelectorAll('[data-ars-animate] > canvas').length,
    sched: window.__sched(),
  }));
  check(`${tag}: hydrates under StrictMode with no recoverable errors, warnings or page errors`, state.errors.length === 0 && problems.length === 0, [...state.errors, ...problems].join(' | ').slice(0, 400));
  check(`${tag}: loader decode finished and left the real labels`, JSON.stringify(state.labels) === JSON.stringify(['loading', 'thinking', 'a & b < c']) && state.decoding === 0, JSON.stringify(state.labels));
  check(`${tag}: server-rendered content stays visible (nothing hidden on hydration)`, state.hidden === 0 && state.heading === 'Hello Legion', `${state.hidden} hidden`);
  check(`${tag}: skeletons shimmer after hydration, within the cap`, state.skeletonCanvases >= 1 && state.skeletonCanvases <= 6, `${state.skeletonCanvases} canvases`);
  check(`${tag}: no timers or intervals scheduled while it runs`, state.sched.timeouts === 0 && state.sched.intervals === 0, JSON.stringify(state.sched));

  const stilled = await page.evaluate(() => { window.lib.setAsciiQuality('off'); return { sched: window.__sched(), canvases: document.querySelectorAll('[data-ars-animate] > canvas').length }; });
  check(`${tag}: setAsciiQuality('off') on the hydrated page: still, zero frames`, stilled.sched.raf === 0 && stilled.canvases === 0, JSON.stringify(stilled));
  await page.evaluate(() => window.lib.setAsciiQuality('auto'));
  await page.waitForTimeout(400);

  const gone = await page.evaluate(async () => {
    window.__root.unmount();
    await new Promise((r) => setTimeout(r, 100));
    return { sched: window.__sched(), canvases: document.querySelectorAll('canvas').length };
  });
  await page.waitForTimeout(100);
  const after = await page.evaluate(() => window.__sched());
  check(`${tag}: after unmount nothing is scheduled (no rAF, no timers) and no canvas is left`, after.raf === 0 && after.timeouts === 0 && after.intervals === 0 && gone.canvases === 0, JSON.stringify({ gone, after }));
  void before;
  await ctx.close();
  server.close();
}

await browser.close();
fs.rmSync(tmp, { recursive: true, force: true });
process.exit(finish());
