// Counts what a page has scheduled and not yet run: requestAnimationFrame callbacks, setTimeout and setInterval.
// Install with page.addInitScript(installScheduleCounter) so it wraps the timers before any library code runs.
// Read it back with `await page.evaluate(() => window.__sched())` → { raf, timeouts, intervals }.
export function installScheduleCounter() {
  const raf = new Set(), timeouts = new Set(), intervals = new Set();
  const _raf = window.requestAnimationFrame.bind(window), _caf = window.cancelAnimationFrame.bind(window);
  const _st = window.setTimeout.bind(window), _ct = window.clearTimeout.bind(window);
  const _si = window.setInterval.bind(window), _ci = window.clearInterval.bind(window);
  window.requestAnimationFrame = (cb) => { const id = _raf((t) => { raf.delete(id); cb(t); }); raf.add(id); return id; };
  window.cancelAnimationFrame = (id) => { raf.delete(id); _caf(id); };
  window.setTimeout = (cb, ms, ...a) => { const id = _st((...x) => { timeouts.delete(id); typeof cb === 'function' ? cb(...x) : (0, eval)(cb); }, ms, ...a); timeouts.add(id); return id; };
  window.clearTimeout = (id) => { timeouts.delete(id); _ct(id); };
  window.setInterval = (cb, ms, ...a) => { const id = _si(cb, ms, ...a); intervals.add(id); return id; };
  window.clearInterval = (id) => { intervals.delete(id); _ci(id); };
  window.__sched = () => ({ raf: raf.size, timeouts: timeouts.size, intervals: intervals.size });
}
