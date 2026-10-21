// Generated artwork for the demo: blurred gradient fields drawn to canvas, so the demo ships no image files.

type Field = [x: number, y: number, r: number, color: string, alpha: number];

function rgba(hex: string, a: number) {
  const n = parseInt(hex.replace('#', ''), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

function grain(ctx: CanvasRenderingContext2D, W: number, H: number, amt: number) {
  const im = ctx.getImageData(0, 0, W, H);
  const d = im.data;
  for (let i = 0; i < d.length; i += 4) {
    if (!d[i + 3]) continue;
    const n = (Math.random() - 0.5) * amt;
    d[i] += n; d[i + 1] += n; d[i + 2] += n;
  }
  ctx.putImageData(im, 0, 0);
}

function fields(ctx: CanvasRenderingContext2D, W: number, H: number, list: Field[]) {
  const M = Math.max(W, H);
  ctx.globalCompositeOperation = 'screen';
  for (const [x, y, r, c, a] of list) {
    const g = ctx.createRadialGradient(x * W, y * H, 0, x * W, y * H, r * M);
    g.addColorStop(0, rgba(c, a));
    g.addColorStop(0.55, rgba(c, a * 0.45));
    g.addColorStop(1, rgba(c, 0));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }
  ctx.globalCompositeOperation = 'source-over';
}

export type ArtName = 'avatar' | 'print' | 'orb' | 'chart';

export function drawArt(name: ArtName, ctx: CanvasRenderingContext2D, W: number, H: number, dpr: number, colors: { accent: string; line: string; surface: string }) {
  ctx.clearRect(0, 0, W, H);
  if (name === 'avatar') {
    ctx.fillStyle = '#1a1030';
    ctx.fillRect(0, 0, W, H);
    fields(ctx, W, H, [[0.28, 0.28, 0.75, '#ff8a45', 0.95], [0.8, 0.35, 0.65, '#b04dff', 0.85], [0.5, 0.9, 0.7, '#1fb6ff', 0.85]]);
    ctx.fillStyle = 'rgba(255,255,255,.92)';
    ctx.font = `600 ${Math.round(H * 0.34)}px Geist, ui-sans-serif, system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('QH', W / 2, H / 2 + H * 0.02);
    grain(ctx, W, H, 12);
  } else if (name === 'print') {
    ctx.fillStyle = '#0d0b14';
    ctx.fillRect(0, 0, W, H);
    fields(ctx, W, H, [[0.22, 0.28, 0.6, '#ff6a3d', 0.9], [0.72, 0.22, 0.55, '#ff3d8b', 0.75], [0.62, 0.72, 0.62, '#7b4dff', 0.9], [0.2, 0.85, 0.5, '#1fb6ff', 0.65], [0.46, 0.48, 0.2, '#ffe3b0', 0.55]]);
    const g = ctx.createLinearGradient(0, H * 0.52, 0, H * 0.62);
    g.addColorStop(0, 'rgba(255,240,225,0)');
    g.addColorStop(0.5, 'rgba(255,240,225,.22)');
    g.addColorStop(1, 'rgba(255,240,225,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    grain(ctx, W, H, 14);
  } else if (name === 'orb') {
    const cx = W * 0.5, cy = H * 0.5, R = Math.min(W, H) * 0.36;
    let g = ctx.createRadialGradient(cx, cy, R * 0.8, cx, cy, R * 1.45);
    g.addColorStop(0, 'rgba(150,90,255,.45)');
    g.addColorStop(1, 'rgba(150,90,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.clip();
    ctx.fillStyle = '#140c26';
    ctx.fillRect(0, 0, W, H);
    fields(ctx, W, H, [[0.36, 0.34, 0.42, '#ff8a45', 1], [0.66, 0.38, 0.4, '#ff3d8b', 0.85], [0.58, 0.68, 0.42, '#7b4dff', 1], [0.36, 0.7, 0.32, '#1fb6ff', 0.85]]);
    g = ctx.createRadialGradient(cx - R * 0.35, cy - R * 0.4, 0, cx - R * 0.35, cy - R * 0.4, R * 0.7);
    g.addColorStop(0, 'rgba(255,255,255,.55)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    g = ctx.createRadialGradient(cx, cy, R * 0.65, cx, cy, R);
    g.addColorStop(0, 'rgba(10,6,20,0)');
    g.addColorStop(1, 'rgba(10,6,20,.45)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
    grain(ctx, W, H, 12);
  } else {
    const data = [8.1, 8.4, 8.0, 8.9, 9.3, 9.1, 9.8, 10.2, 10.0, 10.9, 11.3, 11.1, 11.9, 12.48];
    const pt = 10 * dpr, pb = 6 * dpr, pr = 8 * dpr, min = 7, max = 13;
    const x = (i: number) => (i / (data.length - 1)) * (W - pr);
    const y = (v: number) => pt + (1 - (v - min) / (max - min)) * (H - pt - pb);
    ctx.strokeStyle = colors.line;
    ctx.lineWidth = dpr;
    for (const v of [8, 10, 12]) {
      ctx.beginPath();
      ctx.moveTo(0, Math.round(y(v)) + 0.5);
      ctx.lineTo(W, Math.round(y(v)) + 0.5);
      ctx.stroke();
    }
    const line = new Path2D();
    data.forEach((v, i) => (i ? line.lineTo(x(i), y(v)) : line.moveTo(x(i), y(v))));
    const area = new Path2D(line);
    area.lineTo(x(data.length - 1), H);
    area.lineTo(0, H);
    area.closePath();
    const g = ctx.createLinearGradient(0, pt, 0, H);
    g.addColorStop(0, rgba(colors.accent, 0.35));
    g.addColorStop(1, rgba(colors.accent, 0));
    ctx.fillStyle = g;
    ctx.fill(area);
    ctx.strokeStyle = colors.accent;
    ctx.lineWidth = 2 * dpr;
    ctx.lineJoin = 'round';
    ctx.stroke(line);
    const ex = x(data.length - 1), ey = y(data[data.length - 1]);
    ctx.fillStyle = colors.surface;
    ctx.beginPath();
    ctx.arc(ex, ey, 5 * dpr, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = colors.accent;
    ctx.beginPath();
    ctx.arc(ex, ey, 3.2 * dpr, 0, Math.PI * 2);
    ctx.fill();
  }
}
