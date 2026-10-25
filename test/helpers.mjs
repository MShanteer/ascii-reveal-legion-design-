// Shared helpers for the browser tests.
import { chromium } from 'playwright';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/**
 * Launch Chromium. Set CHROMIUM_PATH to use a browser you already have (for example the one in
 * %LOCALAPPDATA%\ms-playwright) instead of downloading Playwright's own with `npx playwright install chromium`.
 */
export function launch(options = {}) {
  const executablePath = process.env.CHROMIUM_PATH || undefined;
  return chromium.launch({ executablePath, ...options });
}

const types = { '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.html': 'text/html', '.svg': 'image/svg+xml' };

/** Serve `html` at `/` and the repo's files (dist/, test fixtures) at their paths. `extra` maps a url to { type, body }. */
export async function serve(html, extra = {}) {
  const server = http.createServer((req, res) => {
    const url = req.url.split('?')[0];
    if (url === '/') { res.writeHead(200, { 'content-type': 'text/html' }); return res.end(html); }
    if (url === '/favicon.ico') { res.writeHead(204); return res.end(); }
    if (extra[url]) { res.writeHead(200, { 'content-type': extra[url].type }); return res.end(extra[url].body); }
    const f = path.join(root, url);
    if (!f.startsWith(root) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { 'content-type': types[path.extname(f)] || 'application/octet-stream' });
    fs.createReadStream(f).pipe(res);
  });
  await new Promise((r) => server.listen(0, r));
  return { server, base: `http://localhost:${server.address().port}/` };
}

/** A tiny pass/fail recorder that prints in the same style as the original smoke test. */
export function recorder() {
  const results = [];
  const check = (name, ok, info = '') => {
    results.push({ name, ok });
    console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}${info ? ' — ' + info : ''}`);
  };
  const finish = () => {
    const failed = results.filter((r) => !r.ok).length;
    console.log(failed ? `\n${failed} failed` : '\nall passed');
    return failed ? 1 : 0;
  };
  return { check, finish, results };
}
