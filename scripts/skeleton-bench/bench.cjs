// Usage: node scripts/skeleton-bench/build.cjs && node scripts/skeleton-bench/bench.cjs  (needs Playwright)
// Note: total browser CPU is only meaningful at 1x; CPU throttling itself burns CPU.
// Placeholder cost: first paint, page weight, DOM size, load-time style/layout, and total browser CPU while it animates.
const { chromium } = require('playwright'); const http = require('http'), fs = require('fs'), path = require('path'), zlib = require('zlib');
const srv = http.createServer((q, r) => { const f = path.join(__dirname, 'pages', q.url.split('?')[0]); fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': f.endsWith('.js') ? 'text/javascript' : 'text/html' }); r.end(d); }); });
const med = (a) => { const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };
(async () => {
  await new Promise((r) => srv.listen(4302, r));
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined }); const out = [];
  const bcdp = await b.newBrowserCDPSession();
  const cpuTotal = async () => (await bcdp.send('SystemInfo.getProcessInfo')).processInfo.reduce((s, p) => s + p.cpuTime, 0);
  for (const rate of [1, 4]) for (const n of [1, 12]) for (const kind of ['gray', 'ascii', 'ascii-still']) {
    const runs = [];
    for (let i = 0; i < 7; i++) {
      const ctx = await b.newContext({ viewport: { width: 1100, height: 800 } }); const p = await ctx.newPage();
      const cdp = await ctx.newCDPSession(p); await cdp.send('Emulation.setCPUThrottlingRate', { rate }); await cdp.send('Performance.enable');
      await p.goto(`http://localhost:4302/${kind}-${n}.html`, { waitUntil: 'load' }); await p.waitForTimeout(1200);
      const m = Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map((x) => [x.name, x.value]));
      const fp = await p.evaluate(() => performance.getEntriesByName('first-paint')[0].startTime);
      const nodes = await p.evaluate(() => document.getElementsByTagName('*').length);
      const c0 = await cpuTotal(); const t0 = Date.now(); await p.waitForTimeout(3000); const c1 = await cpuTotal();
      runs.push({ fp, nodes, sl: (m.RecalcStyleDuration + m.LayoutDuration) * 1000, cpu: (c1 - c0) / ((Date.now() - t0) / 1000) * 100 });
      await ctx.close();
    }
    const html = fs.readFileSync(path.join(__dirname, 'pages', `${kind}-${n}.html`));
    const row = { cpuThrottle: rate + 'x', cards: n, kind, firstPaintMs: Math.round(med(runs.map((r) => r.fp))), htmlKB: +(html.length / 1024).toFixed(1), gzipKB: +(zlib.gzipSync(html, { level: 9 }).length / 1024).toFixed(1),
      domNodes: runs[0].nodes, styleLayoutMs: +med(runs.map((r) => r.sl)).toFixed(1), browserCpuPct: +med(runs.map((r) => r.cpu)).toFixed(1) };
    out.push(row); console.log(JSON.stringify(row));
  }
  fs.writeFileSync(path.join(__dirname, 'results.json'), JSON.stringify(out, null, 2)); await b.close(); srv.close();
})();
