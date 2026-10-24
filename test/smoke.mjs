// Browser smoke test for the built package (run `npm run build` first).
// Usage: node test/smoke.mjs   (needs `npx playwright install chromium` once)
import { chromium } from 'playwright';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const fixture = `<!doctype html><meta charset="utf-8">
<style>body{font:16px system-ui;margin:24px;color:#222} .box{height:60px;overflow:auto;width:220px;border:1px solid #ccc}</style>
<div id="app">
  <h1 id="title">Hello café 👩‍👩‍👧 world</h1>
  <button id="btn" style="color:rgb(200,0,0)"><svg width="16" height="16" viewBox="0 0 16 16"><rect width="16" height="16" fill="currentColor"/></svg> Save</button>
  <div class="box" id="box"><p>${'Scrolling text inside a clipped container. '.repeat(12)}</p></div>
  <article data-ascii="surface" style="padding:12px;border-radius:12px;background:#f3f3f3"><p data-value>42 ms</p></article>
</div>
<script type="module">
  import { createAsciiReveal, asciiSkeletonHTML, animateSkeletons } from '/dist/core.js';
  window.lib = { createAsciiReveal, asciiSkeletonHTML, animateSkeletons };
  window.ready = true;
</script>`;

const server = http.createServer((req, res) => {
  const url = req.url.split('?')[0];
  if (url === '/') { res.writeHead(200, { 'content-type': 'text/html' }); return res.end(fixture); }
  const f = path.join(root, url);
  if (!f.startsWith(root) || !fs.existsSync(f)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': 'text/javascript' });
  fs.createReadStream(f).pipe(res);
});
await new Promise((r) => server.listen(0, r));
const base = `http://localhost:${server.address().port}/`;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 900, height: 700 } });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
await page.goto(base);
await page.waitForFunction(() => window.ready);

const results = [];
const check = (name, ok, info = '') => { results.push({ name, ok }); console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}${info ? ' — ' + info : ''}`); };
const hiddenCount = () => page.evaluate(() => document.querySelectorAll('[data-ar-t],[data-ar-m],[data-ar-s],[data-ar-f]').length);

// 1. a full reveal finishes, leaves nothing hidden and removes its canvases
await page.evaluate(() => { window.c = window.lib.createAsciiReveal(document.getElementById('app'), { lazy: false, fallback: false }); });
const mid = await page.evaluate(async () => {
  const p = window.c.reveal();
  // sample every frame while the run is active; the most canvases seen at once is what we check
  let canvases = 0, icon = '';
  await new Promise((done) => {
    const step = () => {
      canvases = Math.max(canvases, document.querySelectorAll('.ar-overlay canvas').length);
      if (!icon && document.querySelector('[data-ar-t]')) icon = getComputedStyle(document.querySelector('#btn rect')).fill;
      if (document.querySelector('[data-ar-t],[data-ar-s]')) requestAnimationFrame(step); else done();
    };
    requestAnimationFrame(step);
  });
  const res = { icon, canvases };
  await p;
  return res;
});
check('icons keep currentColor while text is hidden', mid.icon === 'rgb(200, 0, 0)', mid.icon);
check('animation draws on a shared canvas', mid.canvases >= 1 && mid.canvases <= 2, `${mid.canvases} canvases`);
check('reveal leaves nothing hidden', (await hiddenCount()) === 0);
check('canvases removed after reveal', (await page.evaluate(() => document.querySelectorAll('.ar-overlay canvas').length)) === 0);
check('text unchanged (graphemes intact)', (await page.textContent('#title')) === 'Hello café 👩‍👩‍👧 world');

// 2. hide then reveal round-trips
await page.evaluate(() => window.c.hide());
check('hide marks content hidden', (await hiddenCount()) > 0);
await page.evaluate(() => window.c.reveal());
check('reveal after hide restores everything', (await hiddenCount()) === 0);

// 3. resizing mid-run finishes the run cleanly
const resized = await page.evaluate(async () => {
  const p = window.c.reveal();
  await new Promise((r) => setTimeout(r, 60));
  document.getElementById('app').style.width = '500px';
  const t0 = performance.now();
  await p;
  return performance.now() - t0;
});
await page.waitForTimeout(100);
check('resize mid-run settles', (await hiddenCount()) === 0, `${Math.round(resized)} ms`);

// 4. selector-scoped loading: hide, shimmer, swap, reveal
await page.evaluate(async () => {
  const c = window.lib.createAsciiReveal(document.getElementById('app'), { selector: '[data-value]', lazy: false });
  await c.hide();
  c.shimmer(true);
  document.querySelector('[data-value]').textContent = '57 ms';
  c.shimmer(false);
  await c.reveal();
  c.destroy();
});
check('loading cycle completes', (await hiddenCount()) === 0 && (await page.textContent('[data-value]')) === '57 ms');

// 5. skeleton markup renders without the engine
const sk = await page.evaluate(() => { const d = document.createElement('div'); d.innerHTML = window.lib.asciiSkeletonHTML({ lines: 2 }) + window.lib.asciiSkeletonHTML({ lines: 2, animate: false, css: false }); document.body.append(d); const [a, b] = d.querySelectorAll('.ars'); return [a.querySelectorAll('.ars-line').length, a.hasAttribute('data-ars-animate') ? 1 : 0, b.hasAttribute('data-ars-animate') ? 1 : 0].join(','); });
check('asciiSkeletonHTML renders lines; animate flag only when animated', sk === '2,1,0', sk);
const shimmer = await page.evaluate(async () => {
  const stop = window.lib.animateSkeletons(document);
  await new Promise((r) => setTimeout(r, 300));
  const c = document.querySelector('[data-ars-animate] > canvas');
  const px = c ? c.getContext('2d').getImageData(0, 0, c.width, c.height).data.some((v, i) => i % 4 === 3 && v > 0) : false;
  stop();
  return [!!c, px, !!document.querySelector('[data-ars-animate] > canvas')].join(',');
});
check('animateSkeletons draws the shimmer on a canvas and cleans up', shimmer === 'true,true,false', shimmer);

// 6. destroy cleans up the overlay
await page.evaluate(() => window.c.destroy());
check('destroy removes the overlay', (await page.evaluate(() => document.querySelectorAll('.ar-overlay').length)) === 0);

check('no page errors', errors.length === 0, errors.join(' | '));
await browser.close();
server.close();
const failed = results.filter((r) => !r.ok).length;
console.log(failed ? `\n${failed} failed` : '\nall passed');
process.exit(failed ? 1 : 0);
