// Builds pre-rendered (no JS) pages: a gray skeleton vs AsciiSkeleton (animated and still), 1 and 12 cards.
// Builds static, pre-rendered pages (no JS) for each placeholder type and card count.
const fs = require('fs'), path = require('path');
const OUT = path.join(__dirname, 'pages'); fs.mkdirSync(OUT, { recursive: true });
const { asciiSkeletonHTML, SKELETON_CSS } = require('../../dist/core.cjs');
const shell = (title, css, body) => `<!doctype html><html><head><meta charset="utf-8"><title>${title}</title><style>
body{margin:0;padding:24px;font:15px/1.5 system-ui,sans-serif;background:#fff;color:#141416}
.grid{display:grid;grid-template-columns:repeat(3,320px);gap:16px}
.card{border:1px solid #e5e5e5;border-radius:14px;padding:16px;display:flex;gap:12px;height:132px;box-sizing:border-box}
.col{flex:1;min-width:0;display:flex;flex-direction:column;gap:8px}
${css}</style></head><body><div class="grid">${body}</div></body></html>`;
const GRAY_CSS = `.g{display:block;border-radius:6px;background:#e9e9ec;animation:p 1.4s ease-in-out infinite}
.gc{width:48px;height:48px;border-radius:50%;flex:none}@keyframes p{50%{opacity:.45}}`;
const gray = () => `<div class="card"><span class="g gc"></span><div class="col"><span class="g" style="width:55%;height:14px"></span><span class="g" style="width:100%;height:10px;margin-top:6px"></span><span class="g" style="width:92%;height:10px"></span><span class="g" style="width:70%;height:10px"></span></div></div>`;
const asciiStill = (i) => `<div class="card"><div style="width:48px;height:48px;flex:none">${asciiSkeletonHTML({ rows: 4, seed: i + 1, css: false, animate: false })}</div><div class="col">${asciiSkeletonHTML({ lines: 1, widths: ['55%'], seed: i + 20, css: false, animate: false })}${asciiSkeletonHTML({ lines: 3, widths: ['100%', '92%', '70%'], seed: i + 40, css: false, animate: false })}</div></div>`;
const asciiOnce = (i) => `<div class="card"><div style="width:48px;height:48px;flex:none">${asciiSkeletonHTML({ rows: 4, seed: i + 1, css: false })}</div><div class="col">${asciiSkeletonHTML({ lines: 1, widths: ['55%'], seed: i + 20, css: false })}${asciiSkeletonHTML({ lines: 3, widths: ['100%', '92%', '70%'], seed: i + 40, css: false })}</div></div>`;
const ascii = (i) => `<div class="card"><div style="width:48px;height:48px;flex:none">${asciiSkeletonHTML({ rows: 4, seed: i + 1 })}</div><div class="col">${asciiSkeletonHTML({ lines: 1, widths: ['55%'], seed: i + 20 })}${asciiSkeletonHTML({ lines: 3, widths: ['100%', '92%', '70%'], seed: i + 40 })}</div></div>`;
for (const n of [1, 12]) {
  fs.writeFileSync(`${OUT}/ascii-still-${n}.html`, shell('ascii-still', SKELETON_CSS, Array.from({ length: n }, (_, i) => asciiStill(i)).join('')));
  fs.writeFileSync(`${OUT}/gray-${n}.html`, shell('gray', GRAY_CSS, Array.from({ length: n }, (_, i) => gray(i)).join('')));
  fs.writeFileSync(`${OUT}/ascii-${n}.html`, shell('ascii', SKELETON_CSS, Array.from({ length: n }, (_, i) => asciiOnce(i)).join('')).replace('</body>', '<script type="module">import { animateSkeletons } from "./core.js"; animateSkeletons();</script></body>'));
}
fs.copyFileSync(path.join(__dirname, '../../dist/core.js'), path.join(OUT, 'core.js'));
console.log('ok');
