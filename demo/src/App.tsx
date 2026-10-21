import { useEffect, useLayoutEffect, useRef, useState, type MouseEvent } from 'react';
import { AsciiReveal, type AsciiRevealHandle, type Origin, type PresetName } from 'ascii-reveal';
import { drawArt, type ArtName } from './art';
import { AsciiBackdrop } from './Backdrop';

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

/* A real image from the design. Falls back to generated art if the file is missing. */
function Photo({ src, fallback, className, theme }: { src: string; fallback: ArtName; className: string; theme: Theme }) {
  const [failed, setFailed] = useState(false);
  if (failed) return <Art name={fallback} className={className} theme={theme} />;
  return <img src={src} alt="" className={`media ${className}`} decoding="async" onError={() => setFailed(true)} />;
}

// GitHub repo. Drives the install command and docs links on the page.
const REPO = 'quanhoangindex/ascii-reveal';
const INSTALL = `npm i github:${REPO}`;

const STEPS: { title: string; body: string; code: string }[] = [
  { title: 'Install', body: 'Add the package from npm, or straight from GitHub. React 17 or newer is all it needs.', code: `npm i ascii-reveal\n\n# or straight from GitHub\n${INSTALL}` },
  {
    title: 'Wrap your content',
    body: 'Everything inside decodes into place when it mounts: text, images, canvases and video.',
    code: `import { AsciiReveal } from 'ascii-reveal';\n\n<AsciiReveal preset="decode">\n  <YourPage />\n</AsciiReveal>`,
  },
  {
    title: 'Mark the pieces',
    body: 'Optional attributes for cards, buttons, and anything that should stay untouched.',
    code: `<article data-ascii="surface">…</article>\n<button data-ascii="fade">Buy</button>\n<nav data-ascii="skip">…</nav>`,
  },
  {
    title: 'Show loading states',
    body: 'Old content scrambles out, a shimmer holds its place, and new data decodes in.',
    code: `<AsciiReveal loading={isLoading}>\n  <Stats data={data} />\n</AsciiReveal>`,
  },
];

/* Tiny highlighter for the snippets: shell comments, strings, JSX tags, attributes, keywords. */
const TOKENS = /(#[^\n]*)|("[^"\n]*"|'[^'\n]*')|(<\/?)([A-Za-z][\w.]*)|(\/?>)|\b(import|from|npm)\b|([\w-]+)(?==)|(\{[^}\n]*\})|(github:[\w./-]+)/g;
function highlight(code: string) {
  const out: React.ReactNode[] = [];
  let last = 0, k = 0, m: RegExpExecArray | null;
  TOKENS.lastIndex = 0;
  while ((m = TOKENS.exec(code))) {
    if (m.index > last) out.push(code.slice(last, m.index));
    const [all, cm, str, open, tag, close, kw, attr, expr, gh] = m;
    if (cm) out.push(<span key={k++} className="cm">{cm}</span>);
    else if (str) out.push(<span key={k++} className="str">{str}</span>);
    else if (open) out.push(<span key={k++} className="pn">{open}</span>, <span key={k++} className="tag">{tag}</span>);
    else if (close) out.push(<span key={k++} className="pn">{close}</span>);
    else if (kw) out.push(<span key={k++} className="kw">{kw}</span>);
    else if (attr) out.push(<span key={k++} className="attr">{attr}</span>);
    else if (expr) out.push(<span key={k++} className="expr">{expr}</span>);
    else if (gh) out.push(<span key={k++} className="str">{gh}</span>);
    last = m.index + all.length;
  }
  if (last < code.length) out.push(code.slice(last));
  return out;
}

function CopyButton({ text }: { text: string }) {
  const [label, setLabel] = useState('Copy');
  const copy = () => {
    const done = (ok: boolean) => { setLabel(ok ? 'Copied' : 'Select'); setTimeout(() => setLabel('Copy'), 1600); };
    try { navigator.clipboard.writeText(text).then(() => done(true), () => done(false)); } catch { done(false); }
  };
  return <button type="button" className="copy-btn" onClick={copy} data-ascii="fade" aria-label="Copy code">{label}</button>;
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

  const origin = (): Origin =>
    originMode === 'corner' ? { x: 0, y: 0 } : originMode === 'cursor' ? 'pointer' : { x: window.innerWidth / 2, y: window.innerHeight / 2 };
  const replay = () => page.current?.reveal({ origin: origin(), preset, speed });

  // replay only when the preset or origin actually changes (not on mount, and not on React's dev double-run)
  const prev = useRef({ preset, originMode });
  useEffect(() => {
    if (prev.current.preset === preset && prev.current.originMode === originMode) return;
    prev.current = { preset, originMode };
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
    <>
    <AsciiBackdrop theme={theme} />
    <div className="page">
      <AsciiReveal ref={page} className="frame" preset={preset} speed={speed} origin={{ x: window.innerWidth / 2, y: window.innerHeight / 2 }}>
        <nav className="sec nav" aria-label="Project">
          <div className="brand"><span className="mark" aria-hidden="true" />ascii-reveal</div>
          <div className="nav-right"><span className="badge">v0.1 · open source</span><a className="gh-pill" href={`https://github.com/${REPO}`} target="_blank" rel="noreferrer" data-ascii="fade" aria-label="ascii-reveal on GitHub"><svg className="gh-icon" viewBox="0 0 16 16" width="15" height="15" aria-hidden="true"><path fill="currentColor" d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/></svg><span>GitHub</span></a></div>
        </nav>

        <section className="sec hero" aria-label="Introduction">
          <div className="hero-copy">
            <span className="pill"><b>New</b>A loading effect for React</span>
            <h1>Your skeleton loader is boring us to death.</h1>
            <p className="lede">Nobody has ever enjoyed a pulsing gray rectangle. ascii-reveal decodes your real content into place, glyph by glyph, so the wait looks like something is actually happening.</p>
            <div className="actions">
              <button className="cta" type="button" onClick={replay} data-ascii="fade">Replay the reveal <kbd>R</kbd></button>
              <button className="copy" type="button" onClick={copy} aria-label="Copy install command" data-ascii="fade">
                <span><span className="d">$</span> npm i ascii-reveal</span><em>{copied}</em>
              </button>
            </div>
          </div>
          <div className="hero-art">
            <Photo src="images/robot-arm.png" fallback="orb" className="hero-img" theme={theme} />
          </div>
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
          <div className="demo-head">
            <p>Click a card to replay it from that point</p>
            <p>Redeploy runs the loading → loaded cycle</p>
          </div>

          <main className="grid">
            <article className="card" data-ascii="surface" tabIndex={0} aria-label="Profile card" onClick={replayCard} onKeyDown={replayKey}>
              <div className="row">
                <Photo src="images/avatar.png" fallback="avatar" className="avatar" theme={theme} />
                <div className="grow">
                  <p className="title">Quan Hoang</p>
                  <p className="small muted">Designer &amp; UX/UI Engineer</p>
                </div>
              </div>
              <p className="body">Designs and builds interfaces where motion explains state. Currently making ascii-reveal, an open-source loading effect for React.</p>
              <div className="row hair" style={{ paddingTop: 12 }}>
                <span className="tiny mono muted grow">2026</span>
                <span className="chip" data-ascii="fade">Building in public</span>
              </div>
              <div className="row" style={{ marginTop: 'auto' }}>
                <button className="btn primary grow" type="button" data-ascii="fade">Say hello</button>
                <button className="btn grow" type="button" data-ascii="fade">View work</button>
              </div>
            </article>

            <article className="card" data-ascii="surface" tabIndex={0} aria-label="Product card" onClick={replayCard} onKeyDown={replayKey}>
              <Photo src="images/print.png" fallback="print" className="photo" theme={theme} />
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

        <section className="sec usage" id="get-started" aria-label="Get started">
          <div className="usage-intro">
            <p className="eyebrow">Get started</p>
            <h2>Use it in your project</h2>
            <p className="body">Four steps from install to loading states. The README covers every prop, theming, and use without React.</p>
            <a className="text-link" href={`https://github.com/${REPO}#readme`} target="_blank" rel="noreferrer">Read the docs on GitHub →</a>
          </div>
          <ol className="steps">
            {STEPS.map((st, i) => (
              <li key={st.title} className="step">
                <span className="step-n">{String(i + 1).padStart(2, '0')}</span>
                <div className="step-body">
                  <h3>{st.title}</h3>
                  <p className="small muted">{st.body}</p>
                  <div className="snippet">
                    <pre className="code"><code>{highlight(st.code)}</code></pre>
                    <CopyButton text={st.code} />
                  </div>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <footer className="foot" data-ascii="skip">
          <span className="credit">Made by <a href="https://github.com/quanhoangindex" target="_blank" rel="noreferrer">Quan Hoang</a> · MIT licensed · ~8 KB gzipped</span>
          {seg(theme, setTheme, [['system', 'System'], ['light', 'Light'], ['dark', 'Dark']], 'Theme')}
        </footer>
      </AsciiReveal>
    </div>
    </>
  );
}
