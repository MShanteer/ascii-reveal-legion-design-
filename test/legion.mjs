// Browser tests for the Legion additions: preset, skeleton variant, mascots, AsciiLoader, legion.css.
// Run `npm run build` first. Usage: node test/legion.mjs
import { launch, serve, recorder } from './helpers.mjs';
import { installScheduleCounter } from './sched.mjs';

const fixture = `<!doctype html><meta charset="utf-8">
<link rel="stylesheet" href="/dist/legion.css">
<style>
  body{margin:0;padding:16px;background:#0a0a0b;color:#f5f4f0;font:14px system-ui}
  #app{height:240px;width:420px;padding:12px;box-sizing:border-box}
  #list{margin-top:16px;width:320px}
  #list > .ars{display:block;margin-bottom:12px}
  #far{margin-top:3000px;height:240px;width:420px;position:relative}
</style>
<div id="app"><h1 id="title">Hello world</h1><p data-value>42 ms</p><article data-ascii="surface" style="padding:8px">Card</article></div>
<div id="list"></div>
<div id="loaders"></div>
<div id="far"><p>Far away</p></div>
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
const idle = (s) => s.raf === 0 && s.timeouts === 0 && s.intervals === 0;
const hiddenCount = (page) => page.evaluate(() => document.querySelectorAll('[data-ar-t],[data-ar-m],[data-ar-s],[data-ar-f]').length);

// pixel census of a canvas: how many opaque pixels, and how many are in a color range
const census = (page, sel, range) => page.evaluate(({ sel, range }) => {
  const c = document.querySelector(sel);
  if (!c || !c.width) return { opaque: 0, match: 0 };
  const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
  let opaque = 0, match = 0;
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] < 100) continue;
    opaque++;
    if (d[i] >= range.r[0] && d[i] <= range.r[1] && d[i + 1] >= range.g[0] && d[i + 1] <= range.g[1] && d[i + 2] >= range.b[0] && d[i + 2] <= range.b[1]) match++;
  }
  return { opaque, match };
}, { sel, range });
// the shimmer band sweeps across and is sometimes off a short row: take the fullest of several samples
const peak = async (page, sel, range, ms = 2300) => {
  let best = { opaque: 0, match: 0 };
  for (const t0 = Date.now(); Date.now() - t0 < ms;) {
    const c = await census(page, sel, range);
    if (c.opaque > best.opaque) best = c;
    await page.waitForTimeout(100);
  }
  return best;
};
const GOLD = { r: [190, 255], g: [130, 235], b: [0, 175] };

/* ---------------------------------------------------------------- legion.css ---------------- */
{
  const { ctx, page } = await open();
  const v = await page.evaluate(() => {
    const cs = getComputedStyle(document.documentElement);
    const g = (n) => cs.getPropertyValue(n).trim();
    return { accent: g('--ascii-accent'), glyph: g('--ascii-glyph'), skeleton: g('--ascii-skeleton'), flash: g('--ascii-flash'), surface: g('--ascii-surface'), mascot: g('--ascii-mascot'), font: g('--ascii-font') };
  });
  check('legion.css: --ascii-accent is gold #e8c16a', v.accent.toLowerCase() === '#e8c16a', v.accent);
  check('legion.css: glyph and skeleton are the muted #a8a6a0', v.glyph.toLowerCase() === '#a8a6a0' && v.skeleton.toLowerCase() === '#a8a6a0', `${v.glyph} ${v.skeleton}`);
  check('legion.css: surface #0a0a0b, pale gold flash, gold mascot', v.surface.toLowerCase() === '#0a0a0b' && v.flash.toLowerCase() === '#f6e6b8' && v.mascot.toLowerCase() === '#e8c16a', JSON.stringify(v));
  check('legion.css: --ascii-font resolves to a mono stack', /monospace/.test(v.font), v.font.slice(0, 60));
  const themed = await page.evaluate(() => {
    document.documentElement.style.setProperty('--font-mono', '"My Mono"');
    return getComputedStyle(document.documentElement).getPropertyValue('--ascii-font').trim();
  });
  check('legion.css: picks up the app\'s --font-mono when it exists', themed.startsWith('"My Mono"'), themed);
  await ctx.close();
}

/* ---------------------------------------------------------------- legion preset ---------------- */
{
  const { ctx, page } = await open();
  const r = await page.evaluate(async () => {
    const c = window.lib.createAsciiReveal(document.getElementById('app'), { preset: 'legion', lazy: false, fallback: false });
    const p = c.reveal();
    let gold = 0, frames = 0;
    await new Promise((done) => {
      const step = () => {
        frames++;
        for (const cv of document.querySelectorAll('.ar-overlay canvas')) {
          const d = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data;
          for (let i = 0; i < d.length; i += 4) if (d[i + 3] > 128 && d[i] > 190 && d[i + 1] > 130 && d[i + 2] < 175 && d[i] - d[i + 2] > 60) gold++;
        }
        if (document.querySelector('[data-ar-t],[data-ar-s]')) requestAnimationFrame(step); else done();
      };
      requestAnimationFrame(step);
    });
    await p;
    c.destroy();
    return { gold, frames };
  });
  check("preset 'legion' decodes text and a surface, with gold glyphs on the canvas", r.gold > 50, `${r.gold} gold pixels over ${r.frames} frames`);
  check("preset 'legion' leaves nothing hidden", (await hiddenCount(page)) === 0);
  check('...and nothing scheduled afterwards', idle(await sched(page)));
  const shape = await page.evaluate(() => { const p = window.lib.presets.legion; return [p.cursor, p.mode, p.color, !!p.accentGlyphs, p.tick, p.ramp[0]].join('|'); });
  check("preset 'legion' shape: block cursor lead, gold glyphs, calm tick", shape === '▌|ramp|accent|true|52| ', shape);
  const others = await page.evaluate(() => Object.keys(window.lib.presets).join(','));
  check('existing presets are still there, unchanged names', others === 'decode,dither,terminal,blueprint,legion', others);
  await ctx.close();
}

/* ---------------------------------------------------------------- legion skeleton variant ---------------- */
{
  const { ctx, page } = await open();
  await page.evaluate(() => {
    document.getElementById('list').innerHTML = window.lib.asciiSkeletonHTML({ variant: 'legion', lines: 3, seed: 3 }) + window.lib.asciiSkeletonHTML({ variant: 'legion', lines: 3, seed: 4, css: false }).replace('class="ars ars-legion"', 'class="ars ars-legion" style="--ascii-accent:#ff2bd6"');
    window.stop = window.lib.animateSkeletons(document.getElementById('list'));
  });
  await page.waitForTimeout(900);
  const base = await page.evaluate(() => {
    const t = document.querySelector('#list .ars-base');
    return { color: getComputedStyle(t).color, text: t.textContent.slice(0, 40) };
  });
  check("skeleton 'legion': still pattern is dither + scan dots in the muted color", base.color === 'rgb(168, 166, 160)' && /[░▒·]/.test(base.text), `${base.color} ${base.text}`);
  const gold = await peak(page, '#list .ars:nth-of-type(1) > canvas', GOLD);
  check("skeleton 'legion': the band is drawn in --ascii-accent (gold)", gold.opaque > 100 && gold.match / gold.opaque > 0.6, `${gold.match}/${gold.opaque} gold`);
  const pink = await peak(page, '#list .ars:nth-of-type(2) > canvas', { r: [200, 255], g: [0, 110], b: [150, 255] });
  check("...and follows the variable: override --ascii-accent and the band changes color", pink.opaque > 100 && pink.match / pink.opaque > 0.6, `${pink.match}/${pink.opaque} magenta`);
  const html = await page.evaluate(() => window.lib.asciiSkeletonHTML({ variant: 'legion', css: false, animate: false }));
  check("skeleton 'legion' markup is deterministic (same string twice)", html === (await page.evaluate(() => window.lib.asciiSkeletonHTML({ variant: 'legion', css: false, animate: false }))));
  await page.evaluate(() => window.stop());
  await ctx.close();
}

/* ---------------------------------------------------------------- mascots ---------------------------------- */
for (const name of ['antler', 'thinking', 'legion-mark']) {
  const { ctx, page } = await open();
  const during = await page.evaluate(async (name) => {
    const el = document.getElementById('app');
    const c = window.lib.createAsciiReveal(el, { mascot: name, preset: 'legion', lazy: false });
    window.c = c;
    await c.hide({ instant: true });
    c.shimmer(true);
    return window.__sched().raf;
  }, name);
  await page.waitForTimeout(1900);
  const px = await census(page, '#app .ar-overlay canvas', GOLD);
  check(`mascot '${name}': animates on a canvas while loading, in gold`, during >= 1 && px.opaque > 30 && px.match / px.opaque > 0.5, `${px.match}/${px.opaque} gold px, raf ${during}`);
  await page.evaluate(() => window.c.shimmer(false));
  await page.waitForTimeout(900);
  const after = await sched(page);
  const left = await page.evaluate(() => document.querySelectorAll('#app .ar-overlay canvas').length);
  check(`mascot '${name}': dissolves and leaves no canvas and no rAF`, left === 0 && idle(after), `${left} canvases, ${JSON.stringify(after)}`);
  await page.evaluate(() => window.c.destroy());
  await ctx.close();
}
{
  // calm: the antler holds still after growing (the brand glyph is not a looping spinner)
  const { ctx, page } = await open();
  await page.evaluate(async () => {
    const c = window.lib.createAsciiReveal(document.getElementById('app'), { mascot: 'antler', preset: 'legion', lazy: false });
    window.c = c;
    await c.hide({ instant: true });
    c.shimmer(true);
  });
  await page.waitForTimeout(1800);
  const bbox = await page.evaluate(() => {
    const c = document.querySelector('#app .ar-overlay canvas');
    const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
    let x0 = c.width, x1 = 0, y0 = c.height, y1 = 0;
    for (let y = 0; y < c.height; y++) for (let x = 0; x < c.width; x++) if (d[(y * c.width + x) * 4 + 3] > 60) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
    return { w: x1 - x0, h: y1 - y0, cw: c.width, ch: c.height, cx: (x0 + x1) / 2 / c.width };
  });
  check('antler: drawn at a sensible size, horizontally centred', bbox.w > 40 && bbox.h > 40 && bbox.w < bbox.cw && Math.abs(bbox.cx - 0.5) < 0.12, JSON.stringify(bbox));
  await page.evaluate(() => window.c.destroy());
  await ctx.close();
}
{
  // lite / off: one still frame, no loop at all
  for (const mode of ['lite', 'off']) {
    const { ctx, page } = await open();
    const r = await page.evaluate(async (mode) => {
      window.lib.setAsciiQuality(mode);
      const c = window.lib.createAsciiReveal(document.getElementById('app'), { mascot: 'thinking', preset: 'legion', lazy: false });
      window.c = c;
      await c.hide({ instant: true });
      c.shimmer(true);
      return window.__sched();
    }, mode);
    const px = await census(page, '#app .ar-overlay canvas', GOLD);
    check(`quality '${mode}': the mascot is drawn once as a still frame (pixels, nothing scheduled)`, px.opaque > 10 && idle(r), `${px.opaque} px, ${JSON.stringify(r)}`);
    await page.evaluate(() => window.c.shimmer(false));
    const gone = await page.evaluate(() => document.querySelectorAll('#app .ar-overlay canvas').length);
    check(`quality '${mode}': loading finished, the still frame is removed at once`, gone === 0);
    await page.evaluate(() => window.c.destroy());
    await ctx.close();
  }
  {
    // an image mascot has nothing to draw on the first frame: the still is repainted once the image has loaded
    const { ctx, page } = await open();
    const r = await page.evaluate(async () => {
      window.lib.setAsciiQuality('lite');
      const c = window.lib.createAsciiReveal(document.getElementById('app'), { mascot: 'legion-mark', lazy: false });
      window.c = c;
      await c.hide({ instant: true });
      c.shimmer(true);
      return window.__sched();
    });
    await page.waitForTimeout(500);
    const px = await census(page, '#app .ar-overlay canvas', GOLD);
    check("quality 'lite': the legion-mark still appears once its image has loaded, with no timer or frame", px.opaque > 10 && idle(await sched(page)) && idle(r), `${px.opaque} px`);
    await page.evaluate(() => window.c.destroy());
    await ctx.close();
  }
  const { ctx, page } = await open({ reducedMotion: true });
  const r = await page.evaluate(async () => {
    const c = window.lib.createAsciiReveal(document.getElementById('app'), { mascot: 'antler', lazy: false });
    window.c = c;
    await c.hide();
    c.shimmer(true);
    return window.__sched();
  });
  const px = await census(page, '#app .ar-overlay canvas', GOLD);
  check('reduced motion: the mascot is a still frame, nothing scheduled', px.opaque > 10 && idle(r), `${px.opaque} px, ${JSON.stringify(r)}`);
  await page.evaluate(() => window.c.destroy());
  await ctx.close();
}
{
  // off screen: the loop sleeps (zero frames) and wakes when scrolled to
  const { ctx, page } = await open();
  await page.evaluate(async () => {
    const c = window.lib.createAsciiReveal(document.getElementById('far'), { mascot: 'antler', lazy: false });
    window.c = c;
    await c.hide({ instant: true });
    c.shimmer(true);
  });
  await page.waitForTimeout(500);
  const off = await sched(page);
  check('mascot loop off screen: no frames scheduled', idle(off), JSON.stringify(off));
  await page.evaluate(() => document.getElementById('far').scrollIntoView({ block: 'center' }));
  await page.waitForTimeout(500);
  check('...scrolled into view: it runs', (await sched(page)).raf >= 1);
  await page.evaluate(() => { window.c.shimmer(false); });
  await page.waitForTimeout(900);
  await page.evaluate(() => window.c.destroy());
  check('...and ends clean', idle(await sched(page)));
  await ctx.close();
}
{
  // legionMark(svg): custom markup
  const { ctx, page } = await open();
  const r = await page.evaluate(async () => {
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 50"><rect width="100" height="50" fill="#e8c16a"/></svg>';
    const draw = window.lib.legionMark(svg);
    const cv = document.createElement('canvas'); cv.width = 200; cv.height = 100;
    const ctx = cv.getContext('2d');
    draw(ctx, 200, 100, 3, '#fff'); // first call starts loading the image
    await new Promise((r) => setTimeout(r, 200));
    ctx.clearRect(0, 0, 200, 100);
    draw(ctx, 200, 100, 3, '#fff');
    const d = ctx.getImageData(0, 0, 200, 100).data;
    let n = 0; for (let i = 3; i < d.length; i += 4) if (d[i] > 200) n++;
    return { n, svgHasSize: window.lib.LEGION_MARK_SVG.includes('width="136"') };
  });
  check('legionMark(svg): draws custom SVG markup that has only a viewBox', r.n > 2000 && r.svgHasSize, JSON.stringify(r));
  await ctx.close();
}

/* ---------------------------------------------------------------- AsciiLoader (core) ---------------- */
{
  const { ctx, page } = await open();
  await page.evaluate(() => {
    document.getElementById('loaders').innerHTML = window.lib.asciiLoaderHTML() + ' ' + window.lib.asciiLoaderHTML({ variant: 'thinking', css: false });
  });
  const markup = await page.evaluate(() => {
    const [a, b] = document.querySelectorAll('.arl');
    return {
      role: a.getAttribute('role'),
      mark: a.querySelector('.arl-mark').textContent,
      hidden: a.querySelector('.arl-mark').getAttribute('aria-hidden') + a.querySelector('.arl-label').getAttribute('aria-hidden'),
      sr: a.querySelector('.arl-sr').textContent,
      thinking: b.querySelector('.arl-label').textContent,
      dots: b.querySelectorAll('.arl-dots i').length,
      blink: getComputedStyle(a.querySelector('.arl-mark')).animationName,
    };
  });
  check('loader markup: role=status, ▌ cursor, decorative glyphs hidden, one readable label', markup.role === 'status' && markup.mark === '▌' && markup.hidden === 'truetrue' && markup.sr === 'loading', JSON.stringify(markup));
  check('loader thinking variant: label "thinking" and three dots', markup.thinking === 'thinking' && markup.dots === 3);
  check('loader paints with CSS only: the cursor blinks via a CSS animation', markup.blink === 'arl-blink', markup.blink);

  const dec = await page.evaluate(() => {
    window.stopLoaders = window.lib.animateLoaders(document.getElementById('loaders'));
    const label = document.querySelector('.arl .arl-label');
    return { first: label.textContent, decoding: label.hasAttribute('data-decoding'), raf: window.__sched().raf };
  });
  check('loader decode starts before the first paint (scrambled, not the final label)', dec.first !== 'loading' && dec.first.length === 7 && dec.decoding && dec.raf >= 1, JSON.stringify(dec));
  await page.waitForTimeout(800);
  const done = await page.evaluate(() => ({ text: document.querySelector('.arl .arl-label').textContent, decoding: document.querySelector('.arl .arl-label').hasAttribute('data-decoding'), thinking: document.querySelectorAll('.arl .arl-label')[1].textContent, sched: window.__sched() }));
  check('loader decode lands on the real label and stops (no rAF, no timers while it waits)', done.text === 'loading' && done.thinking === 'thinking' && !done.decoding && idle(done.sched), JSON.stringify(done));
  await page.evaluate(() => window.stopLoaders());
  check('stopping a loader leaves the label intact', (await page.textContent('.arl .arl-label')) === 'loading');
  await ctx.close();
}
for (const mode of ['reduced', 'lite', 'lowEnd']) {
  const { ctx, page } = await open({ reducedMotion: mode === 'reduced', lowEnd: mode === 'lowEnd' });
  const r = await page.evaluate(async (mode) => {
    if (mode === 'lite') window.lib.setAsciiQuality('lite');
    document.getElementById('loaders').innerHTML = window.lib.asciiLoaderHTML({ variant: 'thinking' });
    window.lib.animateLoaders(document.getElementById('loaders'));
    const root = document.querySelector('.arl');
    return {
      label: root.querySelector('.arl-label').textContent,
      raf: window.__sched().raf,
      static: root.hasAttribute('data-static'),
      mark: getComputedStyle(root.querySelector('.arl-mark')).animationName,
      dot: getComputedStyle(root.querySelector('.arl-dots i')).animationName,
      dotOpacity: getComputedStyle(root.querySelector('.arl-dots i')).opacity,
    };
  }, mode);
  check(`loader, ${mode}: still "thinking", no decode, no rAF, no blink, dots at rest`, r.label === 'thinking' && r.raf === 0 && r.mark === 'none' && r.dot === 'none' && r.dotOpacity === '1', JSON.stringify(r));
  await ctx.close();
}
{
  // blink={false} and live quality change
  const { ctx, page } = await open();
  const r = await page.evaluate(async () => {
    document.getElementById('loaders').innerHTML = window.lib.asciiLoaderHTML({ blink: false });
    const m = document.querySelector('.arl-mark');
    const noBlink = getComputedStyle(m).animationName;
    document.getElementById('loaders').innerHTML = window.lib.asciiLoaderHTML();
    window.lib.animateLoaders(document.getElementById('loaders'));
    await new Promise((r) => setTimeout(r, 600));
    const before = getComputedStyle(document.querySelector('.arl-mark')).animationName;
    window.lib.setAsciiQuality('off');
    const after = getComputedStyle(document.querySelector('.arl-mark')).animationName;
    return { noBlink, before, after };
  });
  check('loader: blink=false is a solid cursor; setAsciiQuality("off") stills a running loader at once', r.noBlink === 'none' && r.before === 'arl-blink' && r.after === 'none', JSON.stringify(r));
  await ctx.close();
}

check('no page errors', errors.length === 0, errors.join(' | '));
await browser.close();
server.close();
process.exit(finish());
