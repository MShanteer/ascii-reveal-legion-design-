import { resolvePreset, type Preset, type PresetName } from './presets';
import { clamp, dpr as getDpr, ease, easeIO, hash, isBrowser, parseColor, reducedMotion } from './util';

/* ------------------------------------------------------------------ */
/* Public types                                                        */
/* ------------------------------------------------------------------ */

export type Origin = 'center' | 'top-left' | 'pointer' | { x: number; y: number };

export interface AsciiRevealOptions {
  /** Built-in preset name or a custom preset object. Default `decode`. */
  preset?: PresetName | Preset;
  /** Playback speed multiplier. 2 is twice as fast. Default 1. */
  speed?: number;
  /** Where the reveal wave starts. Default `center` of the element. */
  origin?: Origin;
  /** Only animate content inside elements matching this selector. */
  selector?: string;
  /** Elements that get the dot-field and corner frame before fading in. Default `[data-ascii="surface"]`. */
  surfaces?: string;
  /** Elements that simply fade in on the wave (buttons, chips). Default `[data-ascii="fade"]`. */
  fades?: string;
  /** Elements rendered through the glyph grid. Default `img, canvas, video, [data-ascii="media"]`. */
  media?: string;
  /** Element the effect draws into. Created automatically when omitted. */
  overlay?: HTMLElement;
}

export interface RunOptions {
  origin?: Origin;
  /** Limit this run to a part of the tree, for example one card. */
  within?: Element;
  speed?: number;
  preset?: PresetName | Preset;
  /** Hide only: skip the animation and hide immediately. */
  instant?: boolean;
}

export interface AsciiRevealController {
  /** Decode the content into place. Resolves when every target has landed. */
  reveal(options?: RunOptions): Promise<void>;
  /** Scramble the content back out. It stays hidden until the next `reveal()`. */
  hide(options?: RunOptions): Promise<void>;
  /** Show a glyph shimmer where hidden content was, for loading states. */
  shimmer(on: boolean): void;
  update(options: Partial<AsciiRevealOptions>): void;
  destroy(): void;
}

/* ------------------------------------------------------------------ */
/* Global stylesheet, pointer tracking, scheduler                      */
/* ------------------------------------------------------------------ */

const T = 'data-ar-t'; // text parent hidden
const M = 'data-ar-m'; // media hidden / fading
const S = 'data-ar-s'; // surface fading
const F = 'data-ar-f'; // fade element
const DEFAULT_FONT = 'ui-monospace, "SF Mono", "Geist Mono", "JetBrains Mono", Menlo, Consolas, monospace';

let styled = false;
function ensureStyles() {
  if (styled || !isBrowser()) return;
  styled = true;
  const el = document.createElement('style');
  el.setAttribute('data-ascii-reveal', '');
  el.textContent = `
html:not([data-ar-measuring]) [${T}]{color:transparent!important;-webkit-text-fill-color:transparent!important;text-shadow:none!important}
[${M}],[${S}],[${F}]{opacity:var(--ar-o,0)!important}
[data-ar-pending]{visibility:hidden}
.ar-overlay{position:absolute;inset:0;pointer-events:none;z-index:2;overflow:visible}
.ar-overlay>span{position:absolute;white-space:pre;text-align:center;pointer-events:none;margin:0;padding:0;user-select:none}
.ar-overlay>canvas{position:absolute;pointer-events:none;display:block}`;
  document.head.appendChild(el);
}

let pointer: { x: number; y: number } | null = null;
let tracking = false;
function trackPointer() {
  if (tracking || !isBrowser()) return;
  tracking = true;
  document.addEventListener('pointermove', (e) => (pointer = { x: e.clientX, y: e.clientY }), { passive: true });
  document.addEventListener('pointerdown', (e) => (pointer = { x: e.clientX, y: e.clientY }), { passive: true });
}

interface Target {
  key: object;
  holdEl: Element;
  holdName: string;
  cx: number;
  cy: number;
  offset: number;
  dur: number;
  insideSurface?: boolean;
  init(dir: 1 | -1): void;
  prepare?(): void;
  ready?(): Promise<void>;
  render(lt: number, dir: 1 | -1): void;
  dispose(): void;
  rect?: { x: number; y: number; w: number; h: number };
}

interface Run {
  ctrl: Controller;
  dir: 1 | -1;
  start: number;
  targets: Target[];
  byKey: Map<object, Target>;
  done: Promise<void>;
  resolve: () => void;
  live: boolean;
}

interface Loop {
  render(now: number): boolean; // return false to stop
}

const runs = new Set<Run>();
const loops = new Set<Loop>();
const owner = new WeakMap<object, Run>();
const holds = new WeakMap<Element, Map<string, number>>();
let raf = 0;
let flashPrev: [HTMLElement, string][] = [];
let flashNext: [HTMLElement, string][] = [];

function hold(el: Element, name: string) {
  let m = holds.get(el);
  if (!m) holds.set(el, (m = new Map()));
  const n = (m.get(name) || 0) + 1;
  m.set(name, n);
  if (n === 1) el.setAttribute(name, '');
}
function release(el: Element, name: string) {
  const m = holds.get(el);
  if (!m) return;
  const n = (m.get(name) || 0) - 1;
  if (n > 0) return void m.set(name, n);
  m.delete(name);
  el.removeAttribute(name);
  if (name !== T && !el.hasAttribute(M) && !el.hasAttribute(S) && !el.hasAttribute(F)) {
    (el as HTMLElement).style.removeProperty('--ar-o');
  }
}

function kick() {
  if (!raf) raf = requestAnimationFrame(tick);
}

function tick() {
  for (const [el, color] of flashPrev) {
    el.style.transition = 'color .42s cubic-bezier(.2,.7,.2,1)';
    el.style.color = color;
  }
  flashPrev = flashNext;
  flashNext = [];
  const now = performance.now();
  for (const run of Array.from(runs)) {
    if (!run.live) continue;
    const local = now - run.start;
    if (local < 0) continue;
    let finished = true;
    for (const t of run.targets) {
      if (owner.get(t.key) !== run) continue;
      const tl = local - t.offset;
      if (tl < 0) {
        finished = false;
        continue;
      }
      const lt = run.dir > 0 ? Math.min(tl, t.dur) : Math.max(0, t.dur - tl);
      t.render(lt, run.dir);
      if (tl < t.dur) finished = false;
    }
    if (finished) finishRun(run);
  }
  for (const loop of Array.from(loops)) if (!loop.render(now)) loops.delete(loop);
  raf = runs.size || loops.size || flashPrev.length ? requestAnimationFrame(tick) : 0;
}

function finishRun(run: Run) {
  runs.delete(run);
  for (const t of run.targets) {
    if (owner.get(t.key) !== run) continue;
    owner.delete(t.key);
    t.dispose();
    if (run.dir > 0) release(t.holdEl, t.holdName);
    else run.ctrl.markHidden(t.holdEl, t.holdName);
  }
  run.resolve();
}

function claim(run: Run, t: Target) {
  const prev = owner.get(t.key);
  if (prev && prev !== run) {
    const pt = prev.byKey.get(t.key);
    if (pt) {
      pt.dispose();
      release(pt.holdEl, pt.holdName);
    }
  }
  owner.set(t.key, run);
  hold(t.holdEl, t.holdName);
}

/* ------------------------------------------------------------------ */
/* Environment: colors and fonts read once per run                     */
/* ------------------------------------------------------------------ */

interface Env {
  preset: Preset;
  scale: number;
  ox: number; // overlay client left
  oy: number;
  ow: number;
  oh: number;
  overlay: HTMLElement;
  font: string;
  accent: string | null;
  flash: string | null;
  glyph: string | null;
  dpr: number;
  origin: { x: number; y: number };
}

function cssVar(el: Element, name: string) {
  return getComputedStyle(el).getPropertyValue(name).trim();
}

function backdropColor(el: Element): [number, number, number] {
  const forced = parseColor(cssVar(el, '--ascii-surface'));
  if (forced) return [forced[0], forced[1], forced[2]];
  let n: Element | null = el.parentElement;
  while (n) {
    const c = parseColor(getComputedStyle(n).backgroundColor);
    if (c && c[3] >= 0.5) return [c[0], c[1], c[2]];
    n = n.parentElement;
  }
  return [255, 255, 255];
}

/* ------------------------------------------------------------------ */
/* Target builders                                                     */
/* ------------------------------------------------------------------ */

type CharState = 'h' | 's' | 'k' | 'r';
interface Char {
  ch: string;
  x: number;
  y: number;
  w: number;
  h: number;
  el?: HTMLSpanElement;
  st: CharState | '';
  g: string;
}

const SKIP_TAGS = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEXTAREA', 'INPUT', 'SELECT', 'OPTION', 'TEMPLATE']);

function textTarget(node: Text, env: Env, seed: number): Target | null {
  const parent = node.parentElement;
  if (!parent) return null;
  const cs = getComputedStyle(parent);
  if (cs.visibility === 'hidden' || cs.display === 'none') return null;
  const range = document.createRange();
  const str = node.nodeValue || '';
  const chars: Char[] = [];
  let i = 0;
  for (const ch of str) {
    const len = ch.length;
    if (!/\s/.test(ch)) {
      range.setStart(node, i);
      range.setEnd(node, i + len);
      const r = range.getBoundingClientRect();
      if (r.width || r.height) {
        const x = r.left - env.ox;
        const y = r.top - env.oy;
        if (x + r.width > -4 && y + r.height > -4 && x < env.ow + 4 && y < env.oh + 4) {
          chars.push({ ch, x, y, w: r.width, h: r.height, st: '', g: '' });
        }
      }
    }
    i += len;
  }
  if (!chars.length) return null;
  range.selectNodeContents(node);
  const br = range.getBoundingClientRect();
  range.detach?.();

  const p = env.preset;
  const n = chars.length;
  const sc = env.scale;
  const spread = Math.min(720, 90 + n * 13) * sc;
  const s0 = new Float32Array(n);
  const s1 = new Float32Array(n);
  const ph = new Float32Array(n);
  let dur = 1;
  for (let k = 0; k < n; k++) {
    s0[k] = (k / n) * spread * 0.72 + hash(k, seed, 1) * spread * 0.28;
    s1[k] = s0[k] + (200 + hash(k, seed, 2) * 240) * sc;
    ph[k] = hash(k, seed, 3) * 1000;
    if (s1[k] > dur) dur = s1[k];
  }
  const digits = !!parent.closest('[data-ascii-digits]') || /^[\d.,%:+\-\s€$£¥]+$/.test(str.trim());
  const set = digits ? '0123456789' : p.scramble;
  const real = {
    font: `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`,
    color: cs.color,
    transform: cs.textTransform,
    features: cs.fontFeatureSettings,
    numeric: cs.fontVariantNumeric,
  };
  const glyphColor = p.accentGlyphs && env.accent ? env.accent : env.glyph || real.color;
  const glyphOpacity = p.accentGlyphs && env.accent ? '0.9' : env.glyph ? '1' : '0.5';
  const glyphFont = `400 ${cs.fontSize} ${env.font}`;

  const apply = (c: Char, st: CharState) => {
    const s = c.el!.style;
    if (st === 'h') {
      s.visibility = 'hidden';
    } else if (st === 'r') {
      s.visibility = 'visible';
      s.font = real.font;
      s.textTransform = real.transform;
      s.opacity = '1';
      s.color = real.color;
      c.el!.textContent = c.ch;
      c.g = '';
    } else {
      s.visibility = 'visible';
      s.transition = 'none';
      s.font = glyphFont;
      s.textTransform = 'none';
      s.opacity = st === 'k' ? '1' : glyphOpacity;
      s.color = st === 'k' ? env.accent || real.color : glyphColor;
    }
  };

  return {
    key: node,
    holdEl: parent,
    holdName: T,
    cx: br.left + br.width / 2,
    cy: br.top + br.height / 2,
    offset: 0,
    dur,
    rect: { x: br.left - env.ox, y: br.top - env.oy, w: br.width, h: br.height },
    init(dir) {
      const frag = document.createDocumentFragment();
      for (const c of chars) {
        const el = document.createElement('span');
        const s = el.style;
        s.left = c.x + 'px';
        s.top = c.y + 'px';
        s.width = c.w + 'px';
        s.height = c.h + 'px';
        s.lineHeight = c.h + 'px';
        s.fontFeatureSettings = real.features;
        s.fontVariantNumeric = real.numeric;
        el.textContent = c.ch;
        c.el = el;
        c.st = '';
        frag.appendChild(el);
      }
      env.overlay.appendChild(frag);
      this.render(dir > 0 ? 0 : dur, dir);
    },
    render(lt, dir) {
      for (let k = 0; k < n; k++) {
        const c = chars[k];
        let st: CharState;
        let g = '';
        if (lt < s0[k]) st = 'h';
        else if (lt < s1[k]) {
          const q = (lt - s0[k]) / (s1[k] - s0[k]);
          const t = Math.floor((lt + ph[k]) / p.tick);
          st = 's';
          if (p.cursor && q < 0.2) {
            st = 'k';
            g = p.cursor;
          } else if (p.mode === 'ramp' && !digits && q < 0.7) {
            const L = p.ramp.length;
            let idx = 1 + Math.floor((q / 0.7) * (L - 1));
            if (hash(k, t, 5) < 0.35) idx += hash(k, t, 6) < 0.5 ? -1 : 1;
            g = p.ramp[clamp(idx, 1, L - 1)];
          } else g = set[Math.floor(hash(k, t, 7) * set.length)];
        } else st = 'r';
        if (st !== c.st) {
          const was = c.st;
          apply(c, st);
          c.st = st;
          if (st === 'r' && (was === 's' || was === 'k') && dir > 0 && env.flash) {
            c.el!.style.transition = 'none';
            c.el!.style.color = env.flash;
            flashNext.push([c.el!, real.color]);
          }
        }
        if (g && g !== c.g) {
          c.el!.textContent = g;
          c.g = g;
        }
      }
    },
    dispose() {
      for (const c of chars) c.el?.remove();
    },
  };
}

let sInk = 0, sR = 0, sG = 0, sB = 0;

function mediaTarget(el: HTMLElement, env: Env): Target | null {
  const rc = el.getBoundingClientRect();
  if (rc.width < 2 || rc.height < 2) return null;
  const cs = getComputedStyle(el);
  const dp = env.dpr;
  const W = Math.max(1, Math.round(rc.width * dp));
  const H = Math.max(1, Math.round(rc.height * dp));
  const x = rc.left - env.ox;
  const y = rc.top - env.oy;
  const p = env.preset;
  const dur = 1150 * env.scale;
  const cellScale = clamp(Math.min(rc.width, rc.height) / 230, 0.4, 1);
  const cells = p.cells.map((c) => Math.max(3, c * cellScale) * dp);
  const textColor = cs.color;
  const fixed = p.color === 'mono' ? textColor : p.color === 'accent' ? env.accent || textColor : null;
  const bg = backdropColor(el);
  const bgLum = (0.2126 * bg[0] + 0.7152 * bg[1] + 0.0722 * bg[2]) / 255;
  const ox = (env.origin.x - rc.left) * dp;
  const oy = (env.origin.y - rc.top) * dp;
  const maxD = Math.max(Math.hypot(ox, oy), Math.hypot(W - ox, oy), Math.hypot(ox, H - oy), Math.hypot(W - ox, H - oy)) || 1;
  let canvas: HTMLCanvasElement | null = null;
  let ctx: CanvasRenderingContext2D | null = null;
  let data: Uint8ClampedArray | null = null;

  const sample = (px: number, py: number) => {
    if (!data) {
      sInk = 0.22 + 0.5 * hash((px / (8 * dp)) | 0, (py / (8 * dp)) | 0, 41);
      sR = sG = sB = 128;
      return;
    }
    let ix = px | 0, iy = py | 0;
    if (ix < 0) ix = 0;
    if (iy < 0) iy = 0;
    if (ix >= W) ix = W - 1;
    if (iy >= H) iy = H - 1;
    const i = (iy * W + ix) * 4;
    const a = data[i + 3] / 255;
    const r = data[i] * a + bg[0] * (1 - a);
    const g = data[i + 1] * a + bg[1] * (1 - a);
    const b = data[i + 2] * a + bg[2] * (1 - a);
    const lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
    sInk = Math.abs(lum - bgLum) / Math.max(bgLum, 1 - bgLum);
    sR = r | 0;
    sG = g | 0;
    sB = b | 0;
  };

  const setSrc = (o: number) => (el as HTMLElement).style.setProperty('--ar-o', o.toFixed(3));

  return {
    key: el,
    holdEl: el,
    holdName: M,
    cx: rc.left + rc.width / 2,
    cy: rc.top + rc.height / 2,
    offset: 0,
    dur,
    init(dir) {
      canvas = document.createElement('canvas');
      canvas.width = W;
      canvas.height = H;
      const s = canvas.style;
      s.left = x + 'px';
      s.top = y + 'px';
      s.width = rc.width + 'px';
      s.height = rc.height + 'px';
      s.borderRadius = cs.borderRadius;
      ctx = canvas.getContext('2d');
      env.overlay.appendChild(canvas);
      setSrc(dir > 0 ? 0 : 1);
    },
    async ready() {
      if (el instanceof HTMLImageElement && !(el.complete && el.naturalWidth)) {
        await Promise.race([el.decode().catch(() => {}), new Promise((r) => setTimeout(r, 900))]);
      }
    },
    prepare() {
      try {
        const off = document.createElement('canvas');
        off.width = W;
        off.height = H;
        const o = off.getContext('2d', { willReadFrequently: true })!;
        if (el instanceof HTMLImageElement) {
          if (!el.naturalWidth) throw 0;
          const iw = el.naturalWidth, ih = el.naturalHeight;
          if (cs.objectFit === 'cover' || cs.objectFit === 'contain') {
            const sc = cs.objectFit === 'cover' ? Math.max(W / iw, H / ih) : Math.min(W / iw, H / ih);
            o.drawImage(el, (W - iw * sc) / 2, (H - ih * sc) / 2, iw * sc, ih * sc);
          } else o.drawImage(el, 0, 0, W, H);
        } else if (el instanceof HTMLCanvasElement || el instanceof HTMLVideoElement) {
          o.drawImage(el, 0, 0, W, H);
        } else throw 0;
        data = o.getImageData(0, 0, W, H).data;
      } catch {
        data = null; // cross-origin or unknown element: use a neutral glyph texture
      }
    },
    render(lt) {
      if (!ctx || !canvas) return;
      const q = lt / dur;
      ctx.clearRect(0, 0, W, H);
      if (q >= 1) {
        canvas.style.opacity = '0';
        setSrc(1);
        return;
      }
      setSrc(q < 0.68 ? 0 : easeIO((q - 0.68) / 0.32));
      canvas.style.opacity = String(q < 0.74 ? 1 : 1 - ease((q - 0.74) / 0.26));
      if (q <= 0) return;
      const step = Math.min(cells.length - 1, Math.floor((q / 0.8) * cells.length));
      const ch = cells[step];
      const cw = ch * 0.62;
      ctx.font = `${Math.round(ch * 1.02)}px ${env.font}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      if (fixed) ctx.fillStyle = fixed;
      const cols = Math.ceil(W / cw), rows = Math.ceil(H / ch);
      const t = Math.floor(lt / p.tick);
      const gate = q * 2.3;
      const dx = cw / 3, dy = ch / 3, qd = 6 * dp, L = p.ramp.length;
      for (let gy = 0; gy < rows; gy++) {
        const cy = (gy + 0.5) * ch;
        for (let gx = 0; gx < cols; gx++) {
          const cx = (gx + 0.5) * cw;
          const v = 0.5 * hash((cx / qd) | 0, (cy / qd) | 0, 11) + 0.5 * (Math.hypot(cx - ox, cy - oy) / maxD);
          if (v > gate) continue;
          // strongest of five samples, so thin lines survive coarse cells
          let best = -1, br = 0, bgc = 0, bb = 0;
          sample(cx, cy); if (sInk > best) { best = sInk; br = sR; bgc = sG; bb = sB; }
          sample(cx - dx, cy - dy); if (sInk > best) { best = sInk; br = sR; bgc = sG; bb = sB; }
          sample(cx + dx, cy - dy); if (sInk > best) { best = sInk; br = sR; bgc = sG; bb = sB; }
          sample(cx - dx, cy + dy); if (sInk > best) { best = sInk; br = sR; bgc = sG; bb = sB; }
          sample(cx + dx, cy + dy); if (sInk > best) { best = sInk; br = sR; bgc = sG; bb = sB; }
          let lv = best;
          if (hash(gx, gy, t) < 0.16) lv += (hash(gx, gy, t + 77) - 0.5) * 0.35;
          const idx = Math.round(clamp(lv * 1.15) * (L - 1));
          if (idx <= 0) continue;
          if (!fixed) ctx.fillStyle = `rgb(${br},${bgc},${bb})`;
          ctx.fillText(p.ramp[idx], cx, cy);
        }
      }
    },
    dispose() {
      canvas?.remove();
      canvas = null;
      ctx = null;
    },
  };
}

function surfaceTarget(el: HTMLElement, env: Env): Target | null {
  const rc = el.getBoundingClientRect();
  if (rc.width < 2 || rc.height < 2) return null;
  const cs = getComputedStyle(el);
  const dp = env.dpr;
  const W = Math.round(rc.width * dp), H = Math.round(rc.height * dp);
  const dur = 720 * env.scale;
  const ox = (env.origin.x - rc.left) * dp, oy = (env.origin.y - rc.top) * dp;
  const maxD = Math.max(Math.hypot(ox, oy), Math.hypot(W - ox, oy), Math.hypot(ox, H - oy), Math.hypot(W - ox, H - oy)) || 1;
  const cell = 14 * dp, cols = Math.ceil(W / cell), rows = Math.ceil(H / cell);
  const rad = Math.min((parseFloat(cs.borderTopLeftRadius) || 0) * dp, Math.min(W, H) / 2);
  const color = env.preset.accentGlyphs && env.accent ? env.accent : env.glyph || cs.color;
  const dotA = env.preset.accentGlyphs ? 0.75 : 0.86;
  let canvas: HTMLCanvasElement | null = null;
  let ctx: CanvasRenderingContext2D | null = null;
  return {
    key: el,
    holdEl: el,
    holdName: S,
    cx: rc.left + rc.width / 2,
    cy: rc.top + rc.height / 2,
    offset: 0,
    dur,
    init(dir) {
      canvas = document.createElement('canvas');
      canvas.width = W;
      canvas.height = H;
      const s = canvas.style;
      s.left = rc.left - env.ox + 'px';
      s.top = rc.top - env.oy + 'px';
      s.width = rc.width + 'px';
      s.height = rc.height + 'px';
      ctx = canvas.getContext('2d');
      env.overlay.prepend(canvas);
      this.render(dir > 0 ? 0 : dur, dir);
    },
    render(lt) {
      if (!ctx) return;
      const q = lt / dur;
      el.style.setProperty('--ar-o', easeIO((q - 0.15) / 0.6).toFixed(3));
      ctx.clearRect(0, 0, W, H);
      if (q >= 1 || q <= 0) return;
      ctx.fillStyle = color;
      ctx.font = `${Math.round(11 * dp)}px ${env.font}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      for (let gy = 0; gy < rows; gy++)
        for (let gx = 0; gx < cols; gx++) {
          const cx = (gx + 0.5) * cell, cy = (gy + 0.5) * cell;
          const v = 0.45 * hash(gx, gy, 21) + 0.55 * (Math.hypot(cx - ox, cy - oy) / maxD);
          const l = (q - v * 0.55) / 0.32;
          if (l <= 0 || l >= 1) continue;
          ctx.globalAlpha = Math.sin(l * Math.PI) * (env.glyph ? 0.9 : 0.45);
          ctx.fillText(hash(gx, gy, 22) > dotA ? '+' : '·', cx, cy);
        }
      const a = q < 0.12 ? q / 0.12 : q > 0.55 ? 1 - (q - 0.55) / 0.3 : 1;
      if (a > 0) {
        ctx.globalAlpha = clamp(a) * 0.75;
        ctx.strokeStyle = env.accent && env.preset.accentGlyphs ? env.accent : cs.color;
        ctx.lineWidth = 1.25 * dp;
        const o = 0.75 * dp, k = rad + 10 * dp;
        ctx.beginPath();
        ctx.moveTo(o, k); ctx.arcTo(o, o, k, o, rad); ctx.lineTo(k, o);
        ctx.moveTo(W - k, o); ctx.arcTo(W - o, o, W - o, k, rad); ctx.lineTo(W - o, k);
        ctx.moveTo(W - o, H - k); ctx.arcTo(W - o, H - o, W - k, H - o, rad); ctx.lineTo(W - k, H - o);
        ctx.moveTo(k, H - o); ctx.arcTo(o, H - o, o, H - k, rad); ctx.lineTo(o, H - k);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    },
    dispose() {
      canvas?.remove();
      canvas = null;
      ctx = null;
    },
  };
}

function fadeTarget(el: HTMLElement, env: Env): Target | null {
  const rc = el.getBoundingClientRect();
  if (!rc.width && !rc.height) return null;
  const dur = 420 * env.scale;
  return {
    key: el,
    holdEl: el,
    holdName: F,
    cx: rc.left + rc.width / 2,
    cy: rc.top + rc.height / 2,
    offset: 0,
    dur,
    init(dir) {
      el.style.setProperty('--ar-o', dir > 0 ? '0' : '1');
    },
    render(lt) {
      el.style.setProperty('--ar-o', ease(lt / dur).toFixed(3));
    },
    dispose() {},
  };
}

/* ------------------------------------------------------------------ */
/* Controller                                                          */
/* ------------------------------------------------------------------ */

class Controller implements AsciiRevealController {
  root: HTMLElement;
  opts: AsciiRevealOptions;
  overlay: HTMLElement;
  ownOverlay: boolean;
  hidden = new Map<Element, Set<string>>();
  lastRects: { x: number; y: number; w: number; h: number }[] = [];
  shimmerLoop: (Loop & { stopAt: number; canvas: HTMLCanvasElement }) | null = null;
  seed = (Math.random() * 1e6) | 0;
  n = 0;
  destroyed = false;

  constructor(root: HTMLElement, opts: AsciiRevealOptions) {
    ensureStyles();
    trackPointer();
    this.root = root;
    this.opts = { ...opts };
    if (getComputedStyle(root).position === 'static') root.style.position = 'relative';
    this.ownOverlay = !opts.overlay;
    this.overlay = opts.overlay || document.createElement('div');
    this.overlay.classList.add('ar-overlay');
    this.overlay.setAttribute('aria-hidden', 'true');
    if (this.ownOverlay) root.appendChild(this.overlay);
  }

  update(o: Partial<AsciiRevealOptions>) {
    Object.assign(this.opts, o);
  }

  markHidden(el: Element, name: string) {
    let set = this.hidden.get(el);
    if (!set) this.hidden.set(el, (set = new Set()));
    if (set.has(name)) release(el, name); // already holding a hidden mark
    else set.add(name);
  }

  clearHidden(scope: Element) {
    for (const [el, names] of Array.from(this.hidden)) {
      if (!scope.contains(el) && el !== scope) continue;
      for (const n of names) release(el, n);
      this.hidden.delete(el);
    }
  }

  private origin(o: Origin | undefined, scope: Element) {
    const r = scope.getBoundingClientRect();
    const c = { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    if (!o || o === 'center') return c;
    if (o === 'top-left') return { x: r.left, y: r.top };
    if (o === 'pointer') return pointer || c;
    return o;
  }

  private env(o: RunOptions, scope: Element): Env {
    const orc = this.overlay.getBoundingClientRect();
    const font = cssVar(this.root, '--ascii-font') || DEFAULT_FONT;
    const accent = cssVar(this.root, '--ascii-accent') || null;
    const glyph = cssVar(this.root, '--ascii-glyph') || null;
    const flash = cssVar(this.root, '--ascii-flash') || null;
    return {
      preset: resolvePreset(o.preset ?? this.opts.preset),
      scale: 1 / Math.max(0.1, o.speed ?? this.opts.speed ?? 1),
      ox: orc.left,
      oy: orc.top,
      ow: orc.width,
      oh: orc.height,
      overlay: this.overlay,
      font,
      accent,
      flash,
      glyph,
      dpr: getDpr(),
      origin: this.origin(o.origin ?? this.opts.origin, scope),
    };
  }

  private collect(scope: Element, env: Env): Target[] {
    const sel = this.opts.selector;
    const inScope = (el: Element) => !el.closest('.ar-overlay') && (!sel || !!el.closest(sel));
    const all = (q: string) => {
      const list = Array.from(scope.querySelectorAll<HTMLElement>(q));
      if (scope.matches(q)) list.unshift(scope as HTMLElement);
      return list.filter((el) => inScope(el) && !el.closest('[data-ascii="skip"]'));
    };
    const surfaces = all(this.opts.surfaces || '[data-ascii="surface"]');
    const fades = all(this.opts.fades || '[data-ascii="fade"]');
    const media = all(this.opts.media || 'img, canvas, video, [data-ascii="media"]');
    const targets: Target[] = [];
    const seed = this.seed + ++this.n * 131;
    for (const el of surfaces) { const t = surfaceTarget(el, env); if (t) targets.push(t); }
    for (const el of fades) { const t = fadeTarget(el, env); if (t) targets.push(t); }
    for (const el of media) { const t = mediaTarget(el, env); if (t) targets.push(t); }
    const walker = document.createTreeWalker(scope, NodeFilter.SHOW_TEXT, {
      acceptNode: (node) => {
        const p = node.parentElement;
        if (!p || !node.nodeValue || !node.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
        if (SKIP_TAGS.has(p.tagName) || p.closest('.ar-overlay')) return NodeFilter.FILTER_REJECT;
        if (p.closest('[data-ascii="skip"]')) return NodeFilter.FILTER_REJECT;
        if (sel && !p.closest(sel)) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      },
    });
    let k = 0;
    while (walker.nextNode()) {
      const t = textTarget(walker.currentNode as Text, env, seed + k++ * 977);
      if (t) targets.push(t);
    }
    // content sitting on a surface starts a beat after the surface
    if (surfaces.length) {
      for (const t of targets) {
        if (t.holdName === S) continue;
        const el = t.holdEl;
        t.insideSurface = surfaces.some((s) => s !== el && s.contains(el));
      }
    }
    return targets;
  }

  private async run(dir: 1 | -1, o: RunOptions = {}): Promise<void> {
    if (!isBrowser()) return;
    const scope = o.within || this.root;
    const env = this.env(o, scope);
    // read real colors even if the content is currently hidden by a previous run
    const html = document.documentElement;
    html.setAttribute('data-ar-measuring', '');
    let targets: Target[];
    try {
      targets = this.collect(scope, env);
    } finally {
      html.removeAttribute('data-ar-measuring');
    }
    if (dir < 0) this.lastRects = targets.filter((t) => t.rect).map((t) => t.rect!);

    if (dir < 0 && (o.instant || reducedMotion())) {
      for (const t of targets) {
        const prev = owner.get(t.key);
        if (prev) {
          // stop the running animation; its hold carries over as the hidden mark
          prev.byKey.get(t.key)?.dispose();
          owner.delete(t.key);
        } else hold(t.holdEl, t.holdName);
        if (t.holdName !== T) (t.holdEl as HTMLElement).style.setProperty('--ar-o', '0');
        this.markHidden(t.holdEl, t.holdName);
      }
      return;
    }
    if (dir > 0 && reducedMotion()) {
      for (const t of targets) {
        const prev = owner.get(t.key);
        if (prev) {
          prev.byKey.get(t.key)?.dispose();
          release(t.holdEl, t.holdName);
          owner.delete(t.key);
        }
      }
      this.clearHidden(scope);
      if ((scope as HTMLElement).animate) (scope as HTMLElement).animate([{ opacity: 0 }, { opacity: 1 }], { duration: 260, easing: 'ease-out' });
      return;
    }

    let resolve!: () => void;
    const run: Run = {
      ctrl: this,
      dir,
      start: Infinity,
      targets,
      byKey: new Map(targets.map((t) => [t.key, t])),
      done: new Promise<void>((r) => (resolve = r)),
      resolve: () => resolve(),
      live: false,
    };
    for (const t of targets) {
      claim(run, t);
      t.init(dir);
    }
    if (dir > 0) this.clearHidden(scope);

    const vel = 1.15 / env.scale;
    for (const t of targets) {
      t.offset = Math.hypot(t.cx - env.origin.x, t.cy - env.origin.y) / vel + (t.insideSurface && dir > 0 ? 140 * env.scale : 0);
    }
    if (dir > 0) await Promise.all(targets.map((t) => t.ready?.()));
    for (const t of targets) t.prepare?.();
    if (this.destroyed || !targets.some((t) => owner.get(t.key) === run)) {
      run.resolve();
      return run.done;
    }
    run.start = performance.now() + 16;
    run.live = true;
    runs.add(run);
    kick();
    return run.done;
  }

  reveal(o?: RunOptions) {
    return this.run(1, o);
  }

  hide(o?: RunOptions) {
    return this.run(-1, o);
  }

  shimmer(on: boolean) {
    if (!isBrowser()) return;
    if (!on) {
      if (this.shimmerLoop && this.shimmerLoop.stopAt === Infinity) this.shimmerLoop.stopAt = performance.now();
      return;
    }
    if (this.shimmerLoop) {
      this.shimmerLoop.stopAt = Infinity;
      return;
    }
    if (reducedMotion()) return;
    const dp = getDpr();
    const orc = this.overlay.getBoundingClientRect();
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(orc.width * dp);
    canvas.height = Math.round(orc.height * dp);
    Object.assign(canvas.style, { left: '0px', top: '0px', width: orc.width + 'px', height: orc.height + 'px' });
    this.overlay.appendChild(canvas);
    const ctx = canvas.getContext('2d')!;
    const preset = resolvePreset(this.opts.preset);
    const ramp = preset.ramp.slice(1, Math.max(3, Math.ceil(preset.ramp.length * 0.6)));
    const font = cssVar(this.root, '--ascii-font') || DEFAULT_FONT;
    const accent = cssVar(this.root, '--ascii-accent');
    const color = (preset.accentGlyphs || preset.cursor) && accent ? accent : cssVar(this.root, '--ascii-glyph') || getComputedStyle(this.root).color;
    const rects = (this.lastRects.length ? this.lastRects : [{ x: 0, y: 0, w: orc.width, h: orc.height }]).map((r) => ({
      x: r.x * dp, y: r.y * dp, w: r.w * dp, h: r.h * dp,
    }));
    const ch = 11 * dp, cw = ch * 0.62;
    const t0 = performance.now();
    const loop = {
      stopAt: Infinity,
      canvas,
      render: (now: number) => {
        const lt = now - t0;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const fin = clamp(lt / 260);
        const fout = loop.stopAt === Infinity ? 1 : 1 - clamp((now - loop.stopAt) / 260);
        if (fout <= 0) {
          canvas.remove();
          if (this.shimmerLoop === loop) this.shimmerLoop = null;
          return false;
        }
        ctx.globalAlpha = 0.6 * fin * fout;
        ctx.font = `${Math.round(ch)}px ${font}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = color;
        const tick = Math.floor(lt / 70);
        for (const R of rects) {
          const cols = Math.max(1, Math.floor(R.w / cw)), rows = Math.max(1, Math.floor(R.h / ch));
          const x0 = R.x + (R.w - cols * cw) / 2;
          for (let gy = 0; gy < rows; gy++)
            for (let gx = 0; gx < cols; gx++) {
              const w = 0.5 + 0.5 * Math.sin(gx * 0.5 - lt * 0.007 + gy * 1.7 + R.y * 0.01);
              let idx = Math.floor(w * ramp.length * 0.999);
              if (hash((gx + R.x) | 0, gy, tick) < 0.2) idx = Math.floor(hash(gx, (gy + R.y) | 0, tick) * ramp.length);
              ctx.fillText(ramp[idx], x0 + (gx + 0.5) * cw, R.y + (gy + 0.5) * ch + (R.h - rows * ch) / 2);
            }
        }
        ctx.globalAlpha = 1;
        return true;
      },
    };
    this.shimmerLoop = loop;
    loops.add(loop);
    kick();
  }

  destroy() {
    this.destroyed = true;
    for (const run of Array.from(runs)) {
      if (run.ctrl !== this) continue;
      runs.delete(run);
      for (const t of run.targets) {
        if (owner.get(t.key) !== run) continue;
        owner.delete(t.key);
        t.dispose();
        release(t.holdEl, t.holdName);
      }
      run.resolve();
    }
    for (const [el, names] of this.hidden) for (const n of names) release(el, n);
    this.hidden.clear();
    if (this.shimmerLoop) {
      loops.delete(this.shimmerLoop);
      this.shimmerLoop.canvas.remove();
      this.shimmerLoop = null;
    }
    if (this.ownOverlay) this.overlay.remove();
    else this.overlay.replaceChildren();
  }
}

/** Attach the effect to any element. Works without React. */
export function createAsciiReveal(root: HTMLElement, options: AsciiRevealOptions = {}): AsciiRevealController {
  return new Controller(root, options);
}

