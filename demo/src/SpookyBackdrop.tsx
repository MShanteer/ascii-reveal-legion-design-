import { useEffect, useRef } from 'react';
import { mascots } from 'ascii-reveal-legion';

/**
 * Haunted background for the mascots section: a spider drops on its thread and climbs back up,
 * a second one scuttles along the floor, a ghost drifts through, and a cobweb hangs in the corner.
 * Everything is drawn as vector shapes into a tiny "ink" canvas, then printed as ASCII glyphs,
 * so it matches the rest of the page. ~20 fps, paused off-screen or in a hidden tab,
 * a single still frame with reduced motion.
 */
const RAMP = ' .:-=+*#%@';
const CELL = 9;
const SS = 2; // ink supersampling per cell

export function SpookyBackdrop() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const cv = ref.current!;
    const ctx = cv.getContext('2d')!;
    const ink = document.createElement('canvas');
    const ictx = ink.getContext('2d', { willReadFrequently: true })!;
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    let W = 0, H = 0, dpr = 1, cols = 0, rows = 0, raf = 0, last = 0, visible = false, color = '#888';
    const t0 = performance.now();

    const readColor = () => {
      color = getComputedStyle(cv).getPropertyValue('--spooky-glyph').trim() || '#888';
    };
    const resize = () => {
      const r = cv.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = r.width; H = r.height;
      cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
      cols = Math.ceil(W / CELL); rows = Math.ceil(H / CELL);
      ink.width = cols * SS; ink.height = rows * SS;
      readColor();
      draw(performance.now());
    };

    // draw a mascot into the ink canvas, in css px of the section
    const put = (name: 'spider' | 'ghost', x: number, y: number, w: number, h: number, t: number, alpha = 1) => {
      const k = SS / CELL;
      ictx.save();
      ictx.globalAlpha = alpha;
      ictx.translate(x * k, y * k);
      mascots[name](ictx, w * k, h * k, t, '#fff');
      ictx.restore();
    };
    const smooth = (a: number, b: number, v: number) => { const x = Math.min(1, Math.max(0, (v - a) / (b - a))); return x * x * (3 - 2 * x); };

    function scene(t: number) {
      const k = SS / CELL;
      ictx.clearRect(0, 0, ink.width, ink.height);
      ictx.strokeStyle = '#fff'; ictx.fillStyle = '#fff'; ictx.lineCap = 'round';

      // cobweb in the top-right corner (the hanging spider lives here)
      ictx.save();
      ictx.translate(ink.width, 0);
      ictx.scale(-1, 1);
      ictx.globalAlpha = 0.7;
      ictx.lineWidth = 1.1;
      const R = Math.min(W * 0.2, 240) * k;
      for (let i = 0; i <= 5; i++) {
        const a = (i / 5) * (Math.PI / 2);
        ictx.beginPath(); ictx.moveTo(0, 0); ictx.lineTo(Math.cos(a) * R, Math.sin(a) * R); ictx.stroke();
      }
      for (let j = 1; j <= 4; j++) {
        const rr = (R * j) / 4.4;
        ictx.beginPath();
        for (let i = 0; i <= 5; i++) {
          const a = (i / 5) * (Math.PI / 2);
          const sag = i % 1 === 0 && i > 0 ? 0.9 : 1;
          const px = Math.cos(a) * rr, py = Math.sin(a) * rr;
          if (i === 0) ictx.moveTo(px, py);
          else {
            const pa = ((i - 0.5) / 5) * (Math.PI / 2);
            ictx.quadraticCurveTo(Math.cos(pa) * rr * sag * 0.86, Math.sin(pa) * rr * sag * 0.86, px, py);
          }
        }
        ictx.stroke();
      }
      ictx.restore();

      // spider 1: drops from the ceiling on its thread, hangs, climbs back (10 s loop)
      {
        const p = (t % 10) / 10;
        const drop = smooth(0, 0.3, p) * (1 - smooth(0.72, 1, p));
        const size = Math.min(240, W * 0.18);
        const x = W * 0.9 + Math.sin(t * 0.6) * 10;
        const y = -size * 0.75 + drop * (H * 0.36);
        ictx.save(); ictx.globalAlpha = 1; ictx.lineWidth = 1.2;
        ictx.beginPath(); ictx.moveTo(x * k, 0); ictx.lineTo(x * k, Math.max(0, y) * k); ictx.stroke();
        ictx.restore();
        put('spider', x - size / 2, y, size, size, t);
      }

      // spider 2: scuttles along the floor, left to right, pausing now and then (16 s loop)
      {
        const p = (t % 16) / 16;
        const steps = p * 3 + Math.sin(p * Math.PI * 6) * 0.08; // little stop-and-go
        const size = Math.min(150, W * 0.12);
        const x = -size + (steps / 3) * (W + size * 2);
        const y = H - size * 0.8 + Math.abs(Math.sin(t * 9)) * 3;
        put('spider', x, y, size, size * 0.9, t * 1.6, 1);
      }

      // ghost: drifts through the middle, fading in and out like it can't decide (14 s loop)
      {
        const p = (t % 14) / 14;
        const size = Math.min(260, W * 0.19);
        const x = W * 0.48 + p * W * 0.16 + Math.sin(t * 0.9) * 30;
        const y = H * 0.04 + Math.sin(t * 1.3) * 22;
        const a = smooth(0, 0.18, p) * (1 - smooth(0.7, 0.95, p)) * (0.9 + 0.1 * Math.sin(t * 3.1));
        if (a > 0.01) put('ghost', x, y, size, size, t, a);
      }
    }

    function draw(now: number) {
      if (!W) return;
      const t = reduced ? 3.2 : (now - t0) / 1000;
      scene(t);
      const data = ictx.getImageData(0, 0, ink.width, ink.height).data;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      ctx.font = `${Math.round(CELL * 0.95)}px "Geist Mono", ui-monospace, Menlo, monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = color;
      const iw = ink.width;
      for (let gy = 0; gy < rows; gy++) {
        for (let gx = 0; gx < cols; gx++) {
          let a = 0;
          for (let sy = 0; sy < SS; sy++) for (let sx = 0; sx < SS; sx++) a += data[((gy * SS + sy) * iw + gx * SS + sx) * 4 + 3];
          a /= SS * SS * 255;
          if (a < 0.08) continue;
          const idx = Math.min(RAMP.length - 1, 1 + Math.floor(Math.pow(a, 0.7) * (RAMP.length - 1)));
          ctx.globalAlpha = 0.3 + 0.7 * a;
          ctx.fillText(RAMP[idx], gx * CELL + CELL / 2, gy * CELL + CELL / 2);
        }
      }
      ctx.globalAlpha = 1;
    }

    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      if (!visible || document.hidden || now - last < 50) return;
      last = now;
      draw(now);
    };

    const ro = new ResizeObserver(resize);
    ro.observe(cv);
    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; });
    io.observe(cv);
    const mo = new MutationObserver(() => { readColor(); draw(performance.now()); });
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    const mq = matchMedia('(prefers-color-scheme: dark)');
    const onScheme = () => { readColor(); draw(performance.now()); };
    mq.addEventListener('change', onScheme);
    if (!reduced) raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf); ro.disconnect(); io.disconnect(); mo.disconnect();
      mq.removeEventListener('change', onScheme);
    };
  }, []);

  return (
    <div className="spooky-bg" aria-hidden="true" data-ascii="skip">
      <canvas ref={ref} />
    </div>
  );
}
