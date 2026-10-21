import { useEffect, useRef } from 'react';

/**
 * A faint field of ASCII glyphs behind the page. Slow interfering sine waves
 * decide which cells show a glyph and how dense it is, so soft bands drift
 * across the background. Throttled to ~24 fps, paused when the tab is hidden,
 * and drawn once (static) with reduced motion.
 */
const RAMP = ' .·:-=+*';
const CELL = 16;

export function AsciiBackdrop({ theme }: { theme: string }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const cv = ref.current!;
    const ctx = cv.getContext('2d')!;
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    let W = 0, H = 0, dpr = 1, raf = 0, last = 0, color = '#888';
    const t0 = performance.now();

    const readColor = () => {
      color = getComputedStyle(document.documentElement).getPropertyValue('--backdrop-glyph').trim() || '#888';
    };
    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = window.innerWidth;
      H = window.innerHeight;
      cv.width = Math.round(W * dpr);
      cv.height = Math.round(H * dpr);
      readColor();
      draw(performance.now());
    };

    function draw(now: number) {
      const t = (now - t0) * (reduced ? 0 : 1);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      ctx.font = `${Math.round(CELL * 0.8)}px "Geist Mono", ui-monospace, Menlo, monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = color;
      const cw = CELL * 0.62 * 1.4;
      const cols = Math.ceil(W / cw) + 1;
      const rows = Math.ceil(H / CELL) + 1;
      for (let gy = 0; gy < rows; gy++) {
        const y = gy * CELL;
        for (let gx = 0; gx < cols; gx++) {
          const x = gx * cw;
          // three slow waves in different directions; their sum forms drifting bands
          const v =
            Math.sin(x * 0.006 + y * 0.004 + t * 0.00022) +
            Math.sin(x * 0.011 - y * 0.007 - t * 0.00017) * 0.6 +
            Math.sin(y * 0.013 + t * 0.00013) * 0.4;
          const k = (v - 0.55) / 1.45; // only the crests show
          if (k <= 0) continue;
          const idx = Math.min(RAMP.length - 1, 1 + Math.floor(k * (RAMP.length - 1)));
          ctx.globalAlpha = 0.18 + 0.5 * k;
          ctx.fillText(RAMP[idx], x, y);
        }
      }
      ctx.globalAlpha = 1;
    }

    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      if (document.hidden || now - last < 42) return;
      last = now;
      draw(now);
    };

    resize();
    window.addEventListener('resize', resize);
    if (!reduced) raf = requestAnimationFrame(loop);
    const mo = new MutationObserver(() => { readColor(); draw(performance.now()); });
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    const mq = matchMedia('(prefers-color-scheme: dark)');
    const onScheme = () => { readColor(); draw(performance.now()); };
    mq.addEventListener('change', onScheme);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      mo.disconnect();
      mq.removeEventListener('change', onScheme);
    };
  }, [theme]);

  return <canvas ref={ref} className="backdrop" aria-hidden="true" />;
}
