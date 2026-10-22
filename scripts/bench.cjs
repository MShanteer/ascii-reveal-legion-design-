// Benchmarks a demo build: Replay smoothness, start-up stall, data reveal time, hero readable time.
// Usage:
//   cd demo && npx vite build --outDir ../.bench/demo && cd ..
//   node scripts/bench.cjs .bench/demo v0.3 '?nofallback'      (CPU=1 for no throttling; default 4x)
// '?nofallback' turns off the slow-device fade so you measure the full animation.
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const dir = process.argv[2], label = process.argv[3], RUNS = 3;
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' };
const server = http.createServer((q, r) => { let f = path.join(dir, decodeURIComponent(q.url.split('?')[0])); if (f.endsWith('/')) f += 'index.html';
  fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'content-type': mime[path.extname(f)] || 'application/octet-stream' }); r.end(d); }); });
(async () => {
  await new Promise((r) => server.listen(0, r)); const url = `http://localhost:${server.address().port}/${process.argv[4] || ''}`;
  const b = await chromium.launch();
  const res = [];
  for (let run = 0; run < RUNS; run++) {
    const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: 'dark' });
    await ctx.addInitScript(() => {
      window.__lt = []; new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__lt.push([e.startTime, e.duration]); }).observe({ type: 'longtask', buffered: true });
      window.__frames = null;
      window.__rec = (ms) => new Promise((res) => { const f = []; const t0 = performance.now(); const step = (t) => { f.push(t); if (t - t0 < ms) requestAnimationFrame(step); else res(f); }; requestAnimationFrame(step); });
      // hero readable: first time the headline is no longer hidden
      window.__heroAt = null;
      const iv = setInterval(() => { const h = document.querySelector('h1'); if (h && !h.closest('[data-ar-t]') && !h.hasAttribute('data-ar-t') && !h.querySelector('[data-ar-t]') && document.querySelector('.ar-overlay') && !document.querySelector('.hero [data-ar-t]')) { if (performance.now() > 50) { window.__heroAt = performance.now(); clearInterval(iv); } } }, 5);
    });
    const p = await ctx.newPage();
    const cdp = await ctx.newCDPSession(p);
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: +(process.env.CPU||4) });
    await p.goto(url);
    await p.waitForFunction(() => window.__heroAt, null, { timeout: 30000 });
    const heroAt = await p.evaluate(() => window.__heroAt);
    await p.waitForTimeout(3000);
    // Replay smoothness
    const grid = await p.$('.grid'); await grid.scrollIntoViewIfNeeded(); await p.waitForTimeout(600);
    const idle = await p.evaluate(() => window.__rec(1500)); const idleFps = (idle.length - 1) / ((idle[idle.length - 1] - idle[0]) / 1000);
    await p.evaluate(() => { window.__lt = []; });
    const rec = p.evaluate(() => window.__rec(2500));
    const t0 = await p.evaluate(() => performance.now());
    await p.click('.toolbar .cta');
    const frames = await rec;
    const lts = await p.evaluate(() => window.__lt);
    const dts = frames.slice(1).map((t, i) => t - frames[i]);
    const sorted = [...dts].sort((a, c) => a - c);
    const p95 = sorted[Math.floor(sorted.length * 0.95)];
    const fps = (dts.length) / ((frames[frames.length - 1] - frames[0]) / 1000);
    const jank = dts.filter((d) => d > 50).length;
    const longest = lts.reduce((m, [, d]) => Math.max(m, d), 0);
    res.push({ heroAt, idleFps, fps, p95, jank, longest });
    await ctx.close();
  }
  // data-reveal timing in a separate pass with precise markers
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: 'dark' });
  await ctx.route('https://fonts.googleapis.com/**', (r) => r.fulfill({ contentType: 'text/css', body: '' }));
  const p = await ctx.newPage(); const cdp = await ctx.newCDPSession(p); await cdp.send('Emulation.setCPUThrottlingRate', { rate: +(process.env.CPU||4) });
  await p.goto(url); await p.waitForTimeout(4000);
  const deploy = await p.$('[aria-label="Deploy status card"]'); await deploy.scrollIntoViewIfNeeded(); await p.waitForTimeout(400);
  const dataRev = [];
  for (let i = 0; i < 3; i++) {
    await p.click('button:has-text("Redeploy")');
    // wait for the data to land (button re-enables only after reveal, so watch the text change instead)
    const before = await p.evaluate(() => document.querySelectorAll('[aria-label="Deploy status card"] dd')[0].textContent);
    await p.waitForFunction((b0) => document.querySelectorAll('[aria-label="Deploy status card"] dd')[0].textContent !== b0, before, { timeout: 15000, polling: 2 });
    const landed = await p.evaluate(() => performance.now());
    try {
      await p.waitForFunction(() => !document.querySelector('[aria-label="Deploy status card"] [data-ar-t]'), null, { timeout: 10000, polling: 2 });
      dataRev.push((await p.evaluate(() => performance.now())) - landed);
    } catch { dataRev.push(NaN); }
    await p.waitForTimeout(800);
  }
  await b.close(); server.close();
  const avg = (k) => res.reduce((s, r) => s + r[k], 0) / res.length;
  const out = { label, cpu: (process.env.CPU||4)+'x slowdown', heroReadableMs: Math.round(avg('heroAt')), idleFps: +avg('idleFps').toFixed(1), replayFps: +avg('fps').toFixed(1), replayP95FrameMs: Math.round(avg('p95')), replayJankFrames: +avg('jank').toFixed(1), longestTaskMs: Math.round(avg('longest')), dataRevealMs: dataRev.map((x) => isNaN(x) ? 'stuck' : Math.round(x)) };
  console.log(JSON.stringify(out));
  fs.writeFileSync(path.join(process.cwd(), `bench-${label}${process.env.CPU ? '-' + process.env.CPU + 'x' : ''}.json`), JSON.stringify(out, null, 2));
})();
