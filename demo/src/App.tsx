import { useEffect, useLayoutEffect, useRef, useState, type MouseEvent } from 'react';
import { AsciiReveal, type AsciiRevealHandle, type Origin, type PresetName } from 'ascii-reveal';
import { drawArt, type ArtName } from './art';

type Theme = 'system' | 'light' | 'dark';
type OriginMode = 'center' | 'corner' | 'cursor';

/* Canvas artwork that redraws on resize and theme change. */
function Art({ name, className, theme }: { name: ArtName; className: string; theme: Theme }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useLayoutEffect(() => {
    const cv = ref.current!;
    const draw = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const W = Math.round(cv.clientWidth * dpr), H = Math.round(cv.clientHeight * dpr);
      if (!W || !H) return;
      if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; }
      const cs = getComputedStyle(document.documentElement);
      const colors = { accent: cs.getPropertyValue('--accent').trim(), line: cs.getPropertyValue('--line').trim(), surface: cs.getPropertyValue('--bg').trim() };
      drawArt(name, cv.getContext('2d', { willReadFrequently: true })!, W, H, dpr, colors);
    };
    draw();
    const ro = new ResizeObserver(draw);
    ro.observe(cv);
    const mq = matchMedia('(prefers-color-scheme: dark)');
    mq.addEventListener('change', draw);
    return () => { ro.disconnect(); mq.removeEventListener('change', draw); };
  }, [name, theme]);
  return <canvas ref={ref} className={`media ${className}`} aria-hidden="true" />;
}

const COMMITS = ['fix hydration flash', 'tune glyph ramp', 'cache font metrics', 'drop layout thrash', 'batch canvas draws', 'respect reduced motion'];
const REGIONS = ['eu-north-1', 'eu-west-3', 'us-east-2', 'ap-northeast-1', 'sa-east-1'];
const pick = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)];

function DeployCard({ onReplay }: { onReplay: (e: MouseEvent<HTMLElement>) => void }) {
  const [loading, setLoading] = useState(false);
  const [d, setD] = useState({ commit: 'a3f9c21 · fix hydration flash', region: 'eu-north-1', latency: '84 ms', cache: '97.3%' });
  const redeploy = () => {
    setLoading(true);
    setTimeout(() => {
      setD({
        commit: Math.floor(Math.random() * 0xfffffff).toString(16).padStart(7, '0') + ' · ' + pick(COMMITS),
        region: pick(REGIONS),
        latency: 58 + Math.floor(Math.random() * 60) + ' ms',
        cache: (94 + Math.random() * 5.8).toFixed(1) + '%',
      });
      setLoading(false);
    }, 1500);
  };
  return (
    <article className="card" data-ascii="surface" tabIndex={0} aria-label="Deploy status card" onClick={onReplay}>
      <AsciiReveal className="stack" loading={loading} selector="[data-swap]" revealOnMount={false}>
        <div className="row between">
          <p className="eyebrow">Production deploy</p>
          <span className="chip" data-ascii="fade"><span data-swap>● Ready</span></span>
        </div>
        <dl className="rows">
          <dt>Commit</dt><dd className="mono" data-swap>{d.commit}</dd>
          <dt>Region</dt><dd className="mono" data-swap>{d.region}</dd>
          <dt>p95</dt><dd className="mono" data-swap>{d.latency}</dd>
          <dt>Cache hit</dt><dd className="mono" data-swap>{d.cache}</dd>
        </dl>
        <button className="btn primary full" type="button" data-ascii="fade" style={{ marginTop: 'auto' }} disabled={loading} onClick={redeploy}>
          Redeploy
        </button>
      </AsciiReveal>
    </article>
  );
}

export default function App() {
  const page = useRef<AsciiRevealHandle>(null);
  const [preset, setPreset] = useState<PresetName>('decode');
  const [originMode, setOriginMode] = useState<OriginMode>('center');
  const [speed, setSpeed] = useState(1);
  const [theme, setTheme] = useState<Theme>('system');
  const [copied, setCopied] = useState('Copy');
  const first = useRef(true);

  const origin = (): Origin =>
    originMode === 'corner' ? { x: 0, y: 0 } : originMode === 'cursor' ? 'pointer' : { x: window.innerWidth / 2, y: window.innerHeight / 2 };
  const replay = () => page.current?.reveal({ origin: origin(), preset, speed });

  useEffect(() => {
    if (first.current) { first.current = false; return; }
    replay();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preset, originMode]);

  useEffect(() => {
    if (theme === 'system') delete document.documentElement.dataset.theme;
    else document.documentElement.dataset.theme = theme;
  }, [theme]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.key === 'r' || e.key === 'R') && !e.metaKey && !e.ctrlKey && !e.altKey && !/INPUT|TEXTAREA|SELECT/.test((document.activeElement as HTMLElement)?.tagName)) replay();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  });

  const replayCard = (e: MouseEvent<HTMLElement>) => {
    if ((e.target as HTMLElement).closest('button')) return;
    page.current?.reveal({ within: e.currentTarget, origin: { x: e.clientX, y: e.clientY }, preset, speed });
  };
  const replayKey = (e: React.KeyboardEvent<HTMLElement>) => {
    if (e.target !== e.currentTarget || (e.key !== 'Enter' && e.key !== ' ')) return;
    e.preventDefault();
    const r = e.currentTarget.getBoundingClientRect();
    page.current?.reveal({ within: e.currentTarget, origin: { x: r.left + r.width / 2, y: r.top + r.height / 2 }, preset, speed });
  };
  const copy = () => {
    const done = (ok: boolean) => { setCopied(ok ? 'Copied' : 'Select'); setTimeout(() => setCopied('Copy'), 1600); };
    try { navigator.clipboard.writeText('npm i ascii-reveal').then(() => done(true), () => done(false)); } catch { done(false); }
  };

  const seg = <T extends string>(value: T, set: (v: T) => void, options: [T, string][], label: string) => (
    <div className="seg" role="group" aria-label={label}>
      {options.map(([v, text]) => (
        <button key={v} type="button" aria-pressed={value === v} onClick={() => set(v)}>{text}</button>
      ))}
    </div>
  );

  return (
    <div className="page">
      <AsciiReveal ref={page} className="frame" preset={preset} speed={speed} origin={{ x: window.innerWidth / 2, y: window.innerHeight / 2 }}>
        <nav className="sec nav" aria-label="Project">
          <div className="brand"><span className="mark" aria-hidden="true" />ascii-reveal</div>
          <span className="badge">v0.1 · open source</span>
        </nav>

        <section className="sec hero" aria-label="Introduction">
          <div className="aura" aria-hidden="true">
            <div className="blob" style={{ width: 520, height: 520, right: -120, top: -160, background: '#b04dff' }} />
            <div className="blob" style={{ width: 420, height: 420, right: 160, top: 120, background: '#ff6a3d' }} />
            <div className="blob" style={{ width: 380, height: 380, right: -60, bottom: -200, background: '#1fb6ff' }} />
          </div>
          <div className="hero-copy">
            <span className="pill"><b>New</b>A loading effect for React</span>
            <h1>Content that resolves into place.</h1>
            <p className="lede">A loading component that decodes text, images and whole cards out of a character grid. Real layout from the first frame, so nothing jumps when data arrives.</p>
            <div className="actions">
              <button className="cta" type="button" onClick={replay} data-ascii="fade">Replay the reveal <kbd>R</kbd></button>
              <button className="copy" type="button" onClick={copy} aria-label="Copy install command" data-ascii="fade">
                <span><span className="d">$</span> npm i ascii-reveal</span><em>{copied}</em>
              </button>
            </div>
          </div>
          <figure className="lens">
            <Art name="orb" className="" theme={theme} />
            <figcaption className="lens-cap"><span>fig. 01 · orb</span><span>canvas · 60 fps</span></figcaption>
          </figure>
        </section>

        <div className="sec toolbar" role="group" aria-label="Animation controls" data-ascii="skip">
          <div className="group">
            <span className="glabel">Preset</span>
            {seg(preset, setPreset, [['decode', 'Decode'], ['dither', 'Dither'], ['terminal', 'Terminal'], ['blueprint', 'Blueprint']], 'Preset')}
          </div>
          <div className="group">
            <span className="glabel">Wave from</span>
            {seg(originMode, setOriginMode, [['center', 'Center'], ['corner', 'Corner'], ['cursor', 'Cursor']], 'Wave origin')}
          </div>
          <div className="group">
            <label className="glabel" htmlFor="speed">Speed</label>
            <input type="range" id="speed" min={0.4} max={2} step={0.1} value={speed} onChange={(e) => setSpeed(+e.target.value)} onPointerUp={replay} onKeyUp={replay} />
            <span className="speedval">{speed.toFixed(1)}×</span>
          </div>
          <button type="button" className="cta" onClick={replay}>Replay <kbd>R</kbd></button>
        </div>

        <section className="sec demo" aria-label="Demo cards">
          <div className="aura" aria-hidden="true">
            <div className="blob" style={{ width: 560, height: 560, left: -180, top: 40, background: '#7b4dff' }} />
            <div className="blob" style={{ width: 460, height: 460, left: '34%', top: -120, background: '#ff3d8b' }} />
            <div className="blob" style={{ width: 520, height: 520, right: -160, top: '30%', background: '#1fb6ff' }} />
            <div className="blob" style={{ width: 420, height: 420, left: '28%', bottom: -200, background: '#ff8a3d' }} />
          </div>
          <div className="demo-head">
            <p>Click a card to replay it from that point</p>
            <p>Redeploy runs the loading → loaded cycle</p>
          </div>

          <main className="grid">
            <article className="card" data-ascii="surface" tabIndex={0} aria-label="Profile card" onClick={replayCard} onKeyDown={replayKey}>
              <div className="row">
                <Art name="avatar" className="avatar" theme={theme} />
                <div className="grow">
                  <p className="title">Quan Hoang</p>
                  <p className="small muted">Designer &amp; front-end developer</p>
                </div>
              </div>
              <p className="body">Designs and builds interfaces where motion explains state. Currently making ascii-reveal, an open-source loading effect for React.</p>
              <div className="row hair" style={{ paddingTop: 12 }}>
                <span className="tiny mono muted grow">Portfolio v3 · 2026</span>
                <span className="chip" data-ascii="fade">Building in public</span>
              </div>
              <div className="row" style={{ marginTop: 'auto' }}>
                <button className="btn primary grow" type="button" data-ascii="fade">Say hello</button>
                <button className="btn grow" type="button" data-ascii="fade">View work</button>
              </div>
            </article>

            <article className="card" data-ascii="surface" tabIndex={0} aria-label="Product card" onClick={replayCard} onKeyDown={replayKey}>
              <Art name="print" className="photo" theme={theme} />
              <div className="row between" style={{ alignItems: 'baseline' }}>
                <p className="title">Aura No. 3</p>
                <p className="title mono">€120.00</p>
              </div>
              <p className="small muted" style={{ marginTop: -8 }}>Giclée print · 50 × 70 cm · edition of 40</p>
              <button className="btn primary full" type="button" data-ascii="fade">Add to cart</button>
            </article>

            <article className="card" data-ascii="surface" tabIndex={0} aria-label="Stats card" onClick={replayCard} onKeyDown={replayKey}>
              <div className="row between">
                <p className="eyebrow">Weekly active users</p>
                <span className="chip" data-ascii="fade">+8.2%</span>
              </div>
              <p className="big">12,480</p>
              <p className="small muted" style={{ marginTop: -8 }}>vs 11,530 the week before</p>
              <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
                <Art name="chart" className="chart" theme={theme} />
                <div className="axis"><span>Oct 7</span><span>Oct 20</span></div>
              </div>
            </article>

            <article className="card" data-ascii="surface" tabIndex={0} aria-label="Article card" onClick={replayCard} onKeyDown={replayKey}>
              <p className="eyebrow">Field notes · 6 min read</p>
              <h2 className="headline">Loaders should resolve, not disappear</h2>
              <p className="body">A spinner asks people to wait. A reveal shows them what they are waiting for. When content decodes in its final position, the layout never jumps and the eye already knows where to look.</p>
              <div className="row between hair" style={{ paddingTop: 12, marginTop: 'auto' }}>
                <span className="tiny mono muted">Oct 18, 2026</span>
                <span className="tiny mono muted">Read →</span>
              </div>
            </article>

            <article className="card" data-ascii="surface" tabIndex={0} aria-label="Code card" onClick={replayCard} onKeyDown={replayKey}>
              <div className="row between">
                <p className="eyebrow">Usage</p>
                <span className="tiny mono muted">App.tsx</span>
              </div>
              <div className="code">
                <span className="ln"><span className="kw">import</span> {'{ AsciiReveal }'} <span className="kw">from</span> <span className="str">"ascii-reveal"</span>;</span>
                <span className="ln"> </span>
                <span className="ln"><span className="pn">&lt;</span><span className="tag">AsciiReveal</span> <span className="attr">preset</span>=<span className="str">"decode"</span><span className="pn">&gt;</span></span>
                <span className="ln">{'  '}<span className="pn">&lt;</span><span className="tag">ProfileCard</span> <span className="pn">/&gt;</span></span>
                <span className="ln">{'  '}<span className="pn">&lt;</span><span className="tag">Gallery</span> <span className="attr">items</span>={'{prints}'} <span className="pn">/&gt;</span></span>
                <span className="ln"><span className="pn">&lt;/</span><span className="tag">AsciiReveal</span><span className="pn">&gt;</span></span>
              </div>
              <p className="small muted">Wrap any subtree. Text, images and canvases inside it reveal in one wave.</p>
            </article>

            <DeployCard onReplay={replayCard} />
          </main>
        </section>

        <section className="sec features" aria-label="How it works">
          <div className="feat"><span className="k">layout</span><h2>No layout shift</h2><p>Your text stays in the DOM in its real position. The scramble is drawn on a layer above it, so widths and line breaks never move.</p></div>
          <div className="feat"><span className="k">media</span><h2>Images from a glyph grid</h2><p>Images and canvases are sampled into a character grid that steps from coarse to fine, then hands off to the real pixels.</p></div>
          <div className="feat"><span className="k">a11y</span><h2>Accessible by default</h2><p>Screen readers read the real text the whole time. With reduced motion turned on, the reveal becomes a short fade.</p></div>
        </section>

        <footer className="foot" data-ascii="skip">
          <span>One animation loop · no dependencies · ~8 KB gzipped</span>
          {seg(theme, setTheme, [['system', 'System'], ['light', 'Light'], ['dark', 'Dark']], 'Theme')}
        </footer>
      </AsciiReveal>
    </div>
  );
}
