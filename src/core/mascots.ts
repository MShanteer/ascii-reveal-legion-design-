/**
 * Loading mascots. Each one is a small animated vector drawing; the engine renders it
 * through the glyph grid, so it shows up as living ASCII art while content loads.
 * Every draw function fills a w×h box at time t (seconds).
 */
export type MascotName = 'spider' | 'ghost' | 'pumpkin' | 'bat' | 'antler' | 'thinking' | 'legion-mark';
export type MascotDraw = ((ctx: CanvasRenderingContext2D, w: number, h: number, t: number, color: string) => void) & {
  /** Set by mascots that load an image: resolves when it can be drawn, so a still frame can be repainted once. */
  ready?: Promise<unknown>;
};

const TAU = Math.PI * 2;

function cutout(ctx: CanvasRenderingContext2D, fn: () => void) {
  ctx.save();
  ctx.globalCompositeOperation = 'destination-out';
  ctx.fillStyle = '#000';
  fn();
  ctx.restore();
}

/** Blink curve: 1 = open, briefly 0 every ~2.8 s. */
function blink(t: number, period = 2.8, offset = 0) {
  const p = ((t + offset) % period) / period;
  const d = Math.abs(p - 0.97) / 0.025;
  return d >= 1 ? 1 : d;
}

const spider: MascotDraw = (ctx, w, h, t, color) => {
  const s = Math.min(w * 0.78, h * 0.95);
  const cx = w / 2 + Math.sin(t * 0.9) * s * 0.03;
  // dangles on its thread: slow bob
  const cy = h * 0.56 + Math.sin(t * 1.7) * h * 0.07;
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  // thread
  ctx.lineWidth = Math.max(1, s * 0.012);
  ctx.beginPath();
  ctx.moveTo(w / 2, 0);
  ctx.lineTo(cx, cy - s * 0.16);
  ctx.stroke();
  // eight arched legs: front pair reaches up, back pair trails down
  ctx.lineWidth = Math.max(2, s * 0.045);
  const ANG = [-0.95, -0.4, 0.15, 0.6];
  for (const side of [-1, 1]) {
    for (let i = 0; i < 4; i++) {
      const wig = Math.sin(t * 7.5 + i * 1.4 + (side > 0 ? 0.8 : 0)) * 0.1;
      const a = ANG[i] + wig;
      const hipX = cx + side * s * 0.05;
      const hipY = cy - s * 0.03 + i * s * 0.02;
      const kneeX = hipX + side * Math.cos(a - 0.55) * s * 0.26;
      const kneeY = hipY + Math.sin(a - 0.55) * s * 0.26;
      const footX = kneeX + side * Math.cos(a + 0.75) * s * 0.24;
      const footY = kneeY + Math.sin(a + 0.75) * s * 0.24;
      ctx.beginPath();
      ctx.moveTo(hipX, hipY);
      ctx.quadraticCurveTo(kneeX, kneeY - s * 0.03, kneeX, kneeY);
      ctx.quadraticCurveTo(kneeX + side * s * 0.02, kneeY, footX, footY);
      ctx.stroke();
    }
  }
  // round abdomen and head
  ctx.beginPath();
  ctx.ellipse(cx, cy + s * 0.09, s * 0.14, s * 0.165, 0, 0, TAU);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(cx, cy - s * 0.075, s * 0.088, 0, TAU);
  ctx.fill();
  // eyes and a little hourglass marking
  const e = blink(t, 3.1);
  cutout(ctx, () => {
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.ellipse(cx + side * s * 0.03, cy - s * 0.08, s * 0.02, s * 0.02 * e + 0.01, 0, 0, TAU);
      ctx.fill();
    }
    ctx.beginPath();
    ctx.moveTo(cx - s * 0.035, cy + s * 0.04);
    ctx.lineTo(cx + s * 0.035, cy + s * 0.04);
    ctx.lineTo(cx - s * 0.035, cy + s * 0.14);
    ctx.lineTo(cx + s * 0.035, cy + s * 0.14);
    ctx.closePath();
    ctx.fill();
  });
};

const ghost: MascotDraw = (ctx, w, h, t, color) => {
  const s = Math.min(w * 0.85, h * 0.95);
  const cx = w / 2 + Math.sin(t * 0.8) * w * 0.12;
  const top = h * 0.5 - s * 0.48 + Math.sin(t * 1.6) * s * 0.05;
  const r = s * 0.3;
  ctx.save();
  ctx.translate(cx, top + s * 0.5);
  ctx.rotate(Math.sin(t * 0.8) * 0.08);
  ctx.translate(-cx, -(top + s * 0.5));
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(cx - r, top + r);
  ctx.arc(cx, top + r, r, Math.PI, 0);
  ctx.lineTo(cx + r, top + s * 0.86);
  // wavy hem that ripples
  const waves = 4;
  for (let i = waves; i >= 0; i--) {
    const x = cx - r + (2 * r * i) / waves;
    const y = top + s * 0.86 + Math.sin(t * 4 + i * 1.7) * s * 0.035 + (i % 2 ? s * 0.06 : 0);
    ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();
  const e = blink(t, 2.6, 0.7);
  cutout(ctx, () => {
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.ellipse(cx + side * r * 0.36, top + r * 0.95, r * 0.13, r * 0.2 * e + 0.5, 0, 0, TAU);
      ctx.fill();
    }
    // "ooo" mouth, breathing
    ctx.beginPath();
    ctx.ellipse(cx, top + r * 1.45, r * 0.12, r * (0.14 + 0.05 * Math.sin(t * 3)), 0, 0, TAU);
    ctx.fill();
  });
  ctx.restore();
};

const pumpkin: MascotDraw = (ctx, w, h, t) => {
  const s = Math.min(w * 0.9, h * 1.05);
  const cx = w / 2;
  const cy = h * 0.55 + Math.sin(t * 2.2) * s * 0.015;
  const rx = s * 0.42, ry = s * 0.32;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(Math.sin(t * 1.1) * 0.04);
  ctx.translate(-cx, -cy);
  // stem
  ctx.fillStyle = '#6d7d3a';
  ctx.beginPath();
  ctx.moveTo(cx - s * 0.04, cy - ry * 0.95);
  ctx.quadraticCurveTo(cx - s * 0.02, cy - ry * 1.35, cx + s * 0.07, cy - ry * 1.42);
  ctx.lineTo(cx + s * 0.06, cy - ry * 1.28);
  ctx.quadraticCurveTo(cx + s * 0.03, cy - ry * 1.15, cx + s * 0.04, cy - ry * 0.92);
  ctx.closePath();
  ctx.fill();
  // ribbed body
  const ribs = [-0.62, -0.3, 0.3, 0.62, 0];
  for (const k of ribs) {
    const g = ctx.createRadialGradient(cx + k * rx * 0.6, cy - ry * 0.3, ry * 0.1, cx + k * rx * 0.6, cy, ry * 1.1);
    g.addColorStop(0, '#ffab52');
    g.addColorStop(1, '#d8641f');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(cx + k * rx * 0.62, cy, rx * (k === 0 ? 0.46 : 0.42), ry, 0, 0, TAU);
    ctx.fill();
  }
  // carved face with flickering candle light
  const flick = 0.72 + 0.28 * Math.abs(Math.sin(t * 9) * Math.sin(t * 5.3 + 1));
  ctx.fillStyle = `rgba(255, 214, 120, ${flick})`;
  const eye = (side: number) => {
    ctx.beginPath();
    ctx.moveTo(cx + side * rx * 0.18, cy - ry * 0.12);
    ctx.lineTo(cx + side * rx * 0.48, cy - ry * 0.12);
    ctx.lineTo(cx + side * rx * 0.33, cy - ry * 0.52);
    ctx.closePath();
    ctx.fill();
  };
  eye(-1);
  eye(1);
  ctx.beginPath();
  const my = cy + ry * 0.22;
  ctx.moveTo(cx - rx * 0.55, my);
  const teeth = 6;
  for (let i = 0; i <= teeth; i++) {
    const x = cx - rx * 0.55 + (rx * 1.1 * i) / teeth;
    ctx.lineTo(x, my + (i % 2 ? ry * 0.12 : 0));
  }
  ctx.quadraticCurveTo(cx, my + ry * 0.62, cx - rx * 0.55, my);
  ctx.fill();
  ctx.restore();
};

const bat: MascotDraw = (ctx, w, h, t, color) => {
  const s = Math.min(w * 0.9, h * 1.5);
  const cx = w / 2 + Math.sin(t * 0.7) * w * 0.12;
  const cy = h * 0.5 + Math.sin(t * 1.4) * h * 0.1;
  const flap = Math.sin(t * 8); // -1 down .. 1 up
  ctx.fillStyle = color;
  for (const side of [-1, 1]) {
    const lift = flap * s * 0.16;
    const shX = cx + side * s * 0.06, shY = cy - s * 0.05; // shoulder
    const elX = cx + side * s * 0.26, elY = cy - s * 0.16 - lift * 0.6; // elbow
    const tipX = cx + side * s * 0.5, tipY = cy - s * 0.06 - lift; // wing tip
    ctx.beginPath();
    ctx.moveTo(shX, shY);
    ctx.quadraticCurveTo(cx + side * s * 0.14, elY - s * 0.02, elX, elY);
    ctx.quadraticCurveTo(cx + side * s * 0.4, elY - s * 0.01, tipX, tipY);
    // scalloped membrane between the finger bones
    ctx.quadraticCurveTo(cx + side * s * 0.43, tipY + s * 0.1, cx + side * s * 0.38, tipY + s * 0.17);
    ctx.quadraticCurveTo(cx + side * s * 0.32, tipY + s * 0.1, cx + side * s * 0.26, cy + s * 0.12 - lift * 0.4);
    ctx.quadraticCurveTo(cx + side * s * 0.2, cy + s * 0.04 - lift * 0.3, cx + side * s * 0.13, cy + s * 0.15 - lift * 0.2);
    ctx.quadraticCurveTo(cx + side * s * 0.1, cy + s * 0.07, cx + side * s * 0.04, cy + s * 0.08);
    ctx.closePath();
    ctx.fill();
  }
  ctx.beginPath();
  ctx.ellipse(cx, cy + s * 0.02, s * 0.065, s * 0.11, 0, 0, TAU);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(cx, cy - s * 0.09, s * 0.05, 0, TAU);
  ctx.fill();
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(cx + side * s * 0.015, cy - s * 0.12);
    ctx.lineTo(cx + side * s * 0.045, cy - s * 0.2);
    ctx.lineTo(cx + side * s * 0.055, cy - s * 0.1);
    ctx.closePath();
    ctx.fill();
  }
  cutout(ctx, () => {
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.arc(cx + side * s * 0.02, cy - s * 0.095, s * 0.012, 0, TAU);
      ctx.fill();
    }
  });
};

/* ------------------------------------------------------------------ */
/* Legion mascots: the antler brand glyph, a calm "thinking" indicator */
/* ------------------------------------------------------------------ */

const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);

/** The three strokes of the Legion antler (200 × 200 viewBox, drawn between x 40–160 and y 80–175). */
const ANTLER_D = [
  'M100 175 L78 130 Q70 115 60 110 L40 95 M60 110 L55 80 M78 130 L72 95 M78 130 L92 105',
  'M100 175 L122 130 Q130 115 140 110 L160 95 M140 110 L145 80 M122 130 L128 95 M122 130 L108 105',
  'M85 152 L100 175 L115 152',
];
let antlerPaths: Path2D[] | null = null; // built on first draw: Path2D does not exist on the server

/** "rgba(r,g,b,a)" from a CSS color, mixed toward white (amount > 0) or black (< 0). Falls back to Legion gold. */
function tone(color: string, amount: number, alpha = 1): string {
  const m = /^#([0-9a-f]{6})$/i.exec(color.trim());
  let r = 232, g = 193, b = 106;
  if (m) {
    const n = parseInt(m[1], 16);
    r = (n >> 16) & 255; g = (n >> 8) & 255; b = n & 255;
  } else {
    const c = /rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)/i.exec(color);
    if (c) { r = +c[1]; g = +c[2]; b = +c[3]; }
  }
  const mix = (v: number) => Math.round(amount >= 0 ? v + (255 - v) * amount : v * (1 + amount));
  return `rgba(${mix(r)},${mix(g)},${mix(b)},${alpha})`;
}

/**
 * The Legion antler, drawn from the brand glyph. It grows up from its base once (1.2 s), then holds still with a
 * soft highlight drifting up through it. Colors follow `--ascii-mascot` (gold by default in legion.css): dark at the
 * root, the color itself in the middle, pale at the tips.
 */
const antler: MascotDraw = (ctx, w, h, t, color) => {
  const paths = antlerPaths || (antlerPaths = ANTLER_D.map((d) => new Path2D(d)));
  const s = Math.min((w * 0.72) / 120, (h * 0.8) / 95);
  const grow = 1 - Math.pow(1 - clamp01(t / 1.2), 3);
  ctx.save();
  ctx.translate(w / 2 - 100 * s, h / 2 - 127.5 * s);
  ctx.scale(s, s);
  // reveal from the base (y 175) upward
  ctx.beginPath();
  ctx.rect(0, 175 - grow * 110, 200, 110 * grow + 6);
  ctx.clip();
  ctx.lineWidth = Math.max(6, 1.7 / s);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const base = ctx.createLinearGradient(0, 175, 0, 80);
  base.addColorStop(0, tone(color, -0.42));
  base.addColorStop(0.5, tone(color, 0));
  base.addColorStop(1, tone(color, 0.5));
  ctx.strokeStyle = base;
  for (const p of paths) ctx.stroke(p);
  // a pale band drifts up the antler while it waits (about 4.5 s from root to tip, then again)
  if (t > 1.2) {
    const u = (((t - 1.2) * 0.32) % 1.5) - 0.25;
    const lo = clamp01(u - 0.16), mid = clamp01(u), hi = clamp01(u + 0.16);
    const glow = ctx.createLinearGradient(0, 175, 0, 80);
    glow.addColorStop(0, tone(color, 0.7, 0));
    glow.addColorStop(lo, tone(color, 0.7, 0));
    glow.addColorStop(mid, tone(color, 0.7, 0.75));
    glow.addColorStop(hi, tone(color, 0.7, 0));
    glow.addColorStop(1, tone(color, 0.7, 0));
    ctx.strokeStyle = glow;
    for (const p of paths) ctx.stroke(p);
  }
  ctx.restore();
};

/**
 * "The model is thinking": three dots and one slow swell travelling through them (about 4 s a pass). Small and calm.
 * At rest (reduced motion, low-end devices) it is drawn once with the swell on the middle dot.
 */
const thinking: MascotDraw = (ctx, w, h, t, color) => {
  const d = Math.min(w * 0.2, h * 0.34);
  const r = d * 0.37;
  const pos = ((t * 0.9) % 3.8) - 0.8; // which dot the swell is on; 1 = the middle one at t = 2 s
  ctx.fillStyle = color;
  for (let i = 0; i < 3; i++) {
    const near = Math.exp(-((i - pos) * (i - pos)) / (2 * 0.6 * 0.6)); // 0..1
    ctx.globalAlpha = 0.3 + 0.7 * near;
    ctx.beginPath();
    ctx.arc(w / 2 + (i - 1) * d, h / 2, r * (0.75 + 0.35 * near), 0, TAU);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
};

/** The Legion antler as SVG markup (the brand glyph, cropped to the mark so it fills its box). Used by the `legion-mark` mascot. */
export const LEGION_MARK_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" width="136" height="112" viewBox="32 72 136 112" fill="none">' +
  '<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#F6E6B8"/><stop offset="50%" stop-color="#E8C16A"/><stop offset="100%" stop-color="#8E6620"/></linearGradient></defs>' +
  '<g stroke="url(#g)" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" fill="none">' +
  ANTLER_D.map((d) => `<path d="${d}"/>`).join('') +
  '</g></svg>';

/** Give SVG markup a pixel size from its viewBox when it has none, so the browser reports a natural size. */
function sized(svg: string): string {
  if (/<svg[^>]*\swidth=/i.test(svg)) return svg;
  const vb = /viewBox=["']\s*[\d.-]+[\s,]+[\d.-]+[\s,]+([\d.]+)[\s,]+([\d.]+)/i.exec(svg);
  return vb ? svg.replace(/<svg/i, `<svg width="${vb[1]}" height="${vb[2]}"`) : svg;
}

/**
 * A logo mascot from SVG markup (or an SVG URL): the mark scans in from the top once, then holds with a very slow
 * breath of opacity. With no argument it is the Legion antler exactly as drawn in the brand file. The image loads on the
 * first frame, so importing this costs nothing on the server.
 */
export function legionMark(svg: string = LEGION_MARK_SVG): MascotDraw {
  let img: HTMLImageElement | null = null;
  const draw: MascotDraw = (ctx, w, h, t) => {
    if (!img) {
      img = new Image();
      img.decoding = 'async';
      const src = svg.trim();
      img.src = src.startsWith('<') ? 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(sized(src)) : src;
      draw.ready = img.decode().catch(() => {});
    }
    if (!img.complete || !img.naturalWidth) return;
    const ar = img.naturalWidth / img.naturalHeight;
    let dw = w * 0.8, dh = dw / ar;
    if (dh > h * 0.85) { dh = h * 0.85; dw = dh * ar; }
    const x = (w - dw) / 2, y = (h - dh) / 2;
    const scan = 1 - Math.pow(1 - clamp01(t / 1.1), 3);
    ctx.save();
    ctx.beginPath();
    ctx.rect(x - 2, y - 2, dw + 4, (dh + 4) * scan);
    ctx.clip();
    ctx.globalAlpha = t < 1.1 ? 1 : 0.88 + 0.12 * Math.sin((t - 1.1) * 1.3);
    ctx.drawImage(img, x, y, dw, dh);
    ctx.restore();
  };
  return draw;
}


export const mascots: Record<MascotName, MascotDraw> = { spider, ghost, pumpkin, bat, antler, thinking, 'legion-mark': legionMark() };

/** A custom mascot from an SVG URL or SVG markup, gently floating. */
export function imageMascot(src: string): MascotDraw {
  const img = new Image();
  img.decoding = 'async';
  img.src = src.trim().startsWith('<') ? 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(src) : src;
  const draw: MascotDraw = (ctx, w, h, t) => {
    if (!img.complete || !img.naturalWidth) return;
    const ar = img.naturalWidth / img.naturalHeight;
    let dw = w * 0.8, dh = dw / ar;
    if (dh > h * 0.85) { dh = h * 0.85; dw = dh * ar; }
    ctx.drawImage(img, (w - dw) / 2, (h - dh) / 2 + Math.sin(t * 1.6) * h * 0.04, dw, dh);
  };
  draw.ready = img.decode().catch(() => {});
  return draw;
}
