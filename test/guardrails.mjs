// Browser tests for the performance guardrails: idle = zero timers and zero requestAnimationFrame, caps, quality levels,
// off-screen pausing. Run `npm run build` first. Usage: node test/guardrails.mjs
import { launch, serve, recorder } from './helpers.mjs';
import { installScheduleCounter } from './sched.mjs';

const fixture = `<!doctype html><meta charset="utf-8">
<style>
  :root{--ascii-accent:#e8c16a;--ascii-skeleton:#a8a6a0;--ascii-font:ui-monospace,Menlo,Consolas,monospace}
  body{margin:0;padding:16px;background:#0a0a0b;color:#f5f4f0;font:14px system-ui}
  #list > .ars{display:block;width:300px;margin-bottom:12px}
  #spacer{height:3000px}
  #app{padding:12px}
</style>
<div id="app"><h1 id="title">Hello world</h1><p data-value>42 ms</p></div>
<div id="list"></div>
<div id="spacer"></div>
<div id="far"></div>
<script type="module">
  import * as lib from '/dist/core.js';
  window.lib = lib;
  window.ready = true;
</script>`;

const { server, base } = await serve(fixture);
const browser = await launch();
const { check, finish } = recorder();
const errors = [];

async function open({ lowEnd = false, reducedMotion = false } = {}) {
  const ctx = await browser.newContext({ viewport: { width: 900, height: 700 }, colorScheme: 'dark', reducedMotion: reducedMotion ? 'reduce' : 'no-preference' });
  await ctx.addInitScript(installScheduleCounter);
  if (lowEnd) await ctx.addInitScript(() => Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => 2 }));
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  await page.goto(base);
  await page.waitForFunction(() => window.ready);
  return { ctx, page };
}
const sched = (page) => page.evaluate(() => window.__sched());
const canvases = (page) => page.evaluate(() => document.querySelectorAll('[data-ars-animate] > canvas').length);
const idle = (s) => s.raf === 0 && s.timeouts === 0 && s.intervals === 0;
const fill = (page, n, opts = {}) => page.evaluate(({ n, opts }) => {
  const list = document.getElementById('list');
  list.innerHTML = Array.from({ length: n }, (_, i) => window.lib.asciiSkeletonHTML({ lines: 2, widths: ['100%', '80%'], seed: i + 1, css: i === 0, ...opts })).join('');
}, { n, opts });
const inkOn = (page, sel) => page.evaluate((sel) => {
  const c = document.querySelector(sel);
  if (!c || !c.width) return false;
  return c.getContext('2d').getImageData(0, 0, c.width, c.height).data.some((v, i) => i % 4 === 3 && v > 0);
}, sel);

/* ---------------------------------------------------------------- idle: nothing is scheduled ---------------- */
{
  const { ctx, page } = await open();
  check('idle page: no rAF, no timers, no intervals after loading the library', idle(await sched(page)), JSON.stringify(await sched(page)));

  // a full reveal, then idle again
  await page.evaluate(async () => {
    const c = window.lib.createAsciiReveal(document.getElementById('app'), { lazy: false, fallback: false });
    window.c = c;
    await c.reveal();
  });
  await page.waitForTimeout(150);
  const afterReveal = await sched(page);
  check('after a reveal finishes: no rAF, no timers', idle(afterReveal), JSON.stringify(afterReveal));

  // a reveal still running, destroyed: nothing stays scheduled, synchronously
  const midDestroy = await page.evaluate(() => {
    window.c.reveal();
    const during = window.__sched().raf;
    window.c.destroy();
    return { during, after: window.__sched() };
  });
  check('destroy() while a reveal runs leaves no rAF scheduled', midDestroy.during >= 1 && midDestroy.after.raf === 0 && midDestroy.after.timeouts === 0, JSON.stringify(midDestroy));

  // loading shimmer on, then off, then destroy
  const shim = await page.evaluate(async () => {
    const el = document.getElementById('app');
    const c = window.lib.createAsciiReveal(el, { lazy: false });
    await c.hide({ instant: true });
    c.shimmer(true);
    const during = window.__sched().raf;
    c.destroy();
    return { during, after: window.__sched().raf };
  });
  check('loading shimmer: rAF only while loading, none after destroy()', shim.during >= 1 && shim.after === 0, JSON.stringify(shim));
  await ctx.close();
}

/* ---------------------------------------------------------------- skeletons: caps ---------------- */
{
  const { ctx, page } = await open();
  await fill(page, 10);
  await page.evaluate(() => { window.stopAll = window.lib.animateSkeletons(document); });
  await page.waitForTimeout(500);
  check('default cap: 10 visible skeletons, 6 shimmer, 4 stay still', (await canvases(page)) === 6, `${await canvases(page)} canvases`);
  check('animating skeletons really draw', await inkOn(page, '[data-ars-animate] > canvas'));
  const running = await sched(page);
  check('shimmer uses rAF and no timers', running.raf >= 1 && running.timeouts === 0 && running.intervals === 0, JSON.stringify(running));

  await page.evaluate(() => window.lib.setAsciiLimits({ maxAnimatedSkeletons: 3 }));
  check('lowering the cap takes effect at once (3 shimmer)', (await canvases(page)) === 3, `${await canvases(page)}`);

  // area cap: allow roughly two skeletons' worth
  const each = await page.evaluate(() => { const r = document.querySelector('#list .ars').getBoundingClientRect(); return r.width * r.height; });
  await page.evaluate((a) => window.lib.setAsciiLimits({ maxAnimatedSkeletons: 6, maxAnimatedArea: a }), each * 2.5);
  check('area cap: room for two and a half skeletons gives two', (await canvases(page)) === 2, `${await canvases(page)} (one skeleton is ${Math.round(each)} px²)`);
  await page.evaluate(() => window.lib.setAsciiLimits({ maxAnimatedSkeletons: 6, maxAnimatedArea: 800000 }));
  check('restoring the limits brings the slots back', (await canvases(page)) === 6);

  const stopped = await page.evaluate(() => { window.stopAll(); return { raf: window.__sched().raf, timeouts: window.__sched().timeouts }; });
  check('stopping every skeleton leaves no rAF and no canvases', stopped.raf === 0 && stopped.timeouts === 0 && (await canvases(page)) === 0, JSON.stringify(stopped));
  await ctx.close();
}

/* ---------------------------------------------------------------- skeletons: off-screen ---------------- */
{
  const { ctx, page } = await open();
  await page.evaluate(() => {
    document.getElementById('far').innerHTML = window.lib.asciiSkeletonHTML({ lines: 3 });
    window.stopFar = window.lib.animateSkeletons(document.getElementById('far'));
  });
  await page.waitForTimeout(400);
  const off = await sched(page);
  check('off-screen skeleton: no canvas, no rAF scheduled', (await canvases(page)) === 0 && idle(off), JSON.stringify(off));

  await page.evaluate(() => document.getElementById('far').scrollIntoView({ block: 'center' }));
  await page.waitForTimeout(600);
  const on = await sched(page);
  check('scrolled into view: it starts to shimmer', (await canvases(page)) === 1 && on.raf >= 1 && (await inkOn(page, '[data-ars-animate] > canvas')), JSON.stringify(on));

  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(400);
  const gone = await sched(page);
  check('scrolled away again: canvas freed, rAF stops', (await canvases(page)) === 0 && idle(gone), JSON.stringify(gone));

  // hidden tab
  await page.evaluate(() => document.getElementById('far').scrollIntoView({ block: 'center' }));
  await page.waitForTimeout(500);
  const hidden = await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { get: () => true, configurable: true });
    document.dispatchEvent(new Event('visibilitychange'));
    return window.__sched().raf;
  });
  check('hidden tab: the frame loop is cancelled', hidden === 0, `raf ${hidden}`);
  const shown = await page.evaluate(() => {
    delete document.hidden;
    document.dispatchEvent(new Event('visibilitychange'));
    return window.__sched().raf;
  });
  check('tab visible again: it resumes', shown >= 1, `raf ${shown}`);
  await page.evaluate(() => window.stopFar());
  check('...and stops cleanly', idle(await sched(page)));
  await ctx.close();
}

/* ---------------------------------------------------------------- quality levels ---------------- */
{
  const { ctx, page } = await open();
  await fill(page, 3);
  await page.evaluate(() => { window.stopAll = window.lib.animateSkeletons(document); });
  await page.waitForTimeout(400);
  check('quality auto on this machine: skeletons shimmer', (await canvases(page)) === 3);
  for (const q of ['off', 'lite']) {
    const r = await page.evaluate((q) => { window.lib.setAsciiQuality(q); return { raf: window.__sched().raf, timeouts: window.__sched().timeouts }; }, q);
    check(`setAsciiQuality('${q}'): static at once (no canvas, no rAF)`, r.raf === 0 && r.timeouts === 0 && (await canvases(page)) === 0, JSON.stringify(r));
  }
  await page.evaluate(() => window.lib.setAsciiQuality('full'));
  await page.waitForTimeout(300);
  check("setAsciiQuality('full'): shimmer comes back", (await canvases(page)) === 3);
  await page.evaluate(() => window.lib.setAsciiQuality('bogus'));
  check('an unknown value falls back to auto', (await page.evaluate(() => window.lib.getAsciiQuality())) === 'auto');
  await page.evaluate(() => window.stopAll());
  // per-skeleton override
  await page.evaluate(() => { window.lib.setAsciiQuality('off'); window.stopOne = window.lib.animateSkeleton(document.querySelector('#list .ars'), { quality: 'full' }); });
  await page.waitForTimeout(400);
  check("global 'off' with one skeleton set to quality 'full': only that one shimmers", (await canvases(page)) === 1);
  await page.evaluate(() => window.stopOne());
  await ctx.close();
}

/* ---------------------------------------------------------------- low-end device (2 cores) ---------------- */
{
  const { ctx, page } = await open({ lowEnd: true });
  const flag = await page.evaluate(() => [navigator.hardwareConcurrency, window.lib.isLowEndDevice(), window.lib.resolveQuality()].join(','));
  check('2 cores is low-end and auto resolves to lite', flag === '2,true,lite', flag);
  await fill(page, 4);
  await page.evaluate(() => { window.stopAll = window.lib.animateSkeletons(document); });
  await page.waitForTimeout(400);
  const s = await sched(page);
  check('low-end device: skeletons stay still (no canvas, no rAF)', (await canvases(page)) === 0 && idle(s), JSON.stringify(s));
  const forced = await page.evaluate(() => { window.lib.setAsciiQuality('full'); return window.lib.resolveQuality(); });
  await page.waitForTimeout(400);
  check("...and setAsciiQuality('full') opts back in", forced === 'full' && (await canvases(page)) === 4);
  await page.evaluate(async () => {
    window.lib.setAsciiQuality('auto');
    const c = window.lib.createAsciiReveal(document.getElementById('app'), { lazy: false });
    window.hiddenDuring = null;
    const p = c.reveal();
    window.rafAfterCall = window.__sched().raf;
    await p;
    c.destroy();
  });
  const rafAfter = await page.evaluate(() => window.rafAfterCall);
  check('low-end device: a reveal schedules no rAF (single fade)', rafAfter === 0, `raf right after reveal(): ${rafAfter}`);
  await page.evaluate(() => window.stopAll());
  await ctx.close();
}

/* ---------------------------------------------------------------- reduced motion ---------------- */
{
  const { ctx, page } = await open({ reducedMotion: true });
  const r = await page.evaluate(() => [window.lib.resolveQuality(), (window.lib.setAsciiQuality('full'), window.lib.resolveQuality())].join(','));
  check("reduced motion resolves to 'off' even when the app asks for 'full'", r === 'off,off', r);
  await fill(page, 4);
  await page.evaluate(() => { window.stopAll = window.lib.animateSkeletons(document); });
  await page.waitForTimeout(400);
  check('reduced motion: skeletons stay still and nothing is scheduled', (await canvases(page)) === 0 && idle(await sched(page)));
  const rv = await page.evaluate(async () => {
    const c = window.lib.createAsciiReveal(document.getElementById('app'), { lazy: false });
    await c.hide();
    const hiddenAfterHide = document.querySelectorAll('[data-ar-t]').length;
    const p = c.reveal();
    const rafAfterCall = window.__sched().raf;
    const canvasesDuring = document.querySelectorAll('.ar-overlay canvas').length;
    await p;
    const hiddenAfterReveal = document.querySelectorAll('[data-ar-t]').length;
    c.destroy();
    return { hiddenAfterHide, rafAfterCall, canvasesDuring, hiddenAfterReveal };
  });
  check('reduced motion: hide is instant, reveal shows the end state at once with no rAF and no canvas', rv.hiddenAfterHide > 0 && rv.rafAfterCall === 0 && rv.canvasesDuring === 0 && rv.hiddenAfterReveal === 0, JSON.stringify(rv));
  await ctx.close();
}

check('no page errors', errors.length === 0, errors.join(' | '));
await browser.close();
server.close();
process.exit(finish());
