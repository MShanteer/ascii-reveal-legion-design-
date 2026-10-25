import { StrictMode, useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import 'ascii-reveal-legion/legion.css';
import './legion.css';
import {
  AsciiLoader,
  AsciiReveal,
  AsciiSkeleton,
  LEGION_MARK_SVG,
  getAsciiLimits,
  getAsciiQuality,
  isLowEndDevice,
  resolveQuality,
  setAsciiQuality,
  type AsciiQuality,
  type MascotName,
} from 'ascii-reveal-legion';

const MARK_SRC = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(LEGION_MARK_SVG);
const REPO = 'https://github.com/MShanteer/ascii-reveal-legion-design-';

/** A fake request: `load()` flips to loading, then back after `ms`. Demo only. */
function useFakeLoad(ms: number, startLoading = false) {
  const [loading, setLoading] = useState(startLoading);
  const timer = useRef(0);
  const load = useCallback(() => {
    window.clearTimeout(timer.current);
    setLoading(true);
    timer.current = window.setTimeout(() => setLoading(false), ms);
  }, [ms]);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  return { loading, load, setLoading };
}

function Section({ id, n, title, lede, children }: { id: string; n: string; title: string; lede?: ReactNode; children: ReactNode }) {
  return (
    <section className="sec" id={id} aria-labelledby={`${id}-h`}>
      <div className="sec-head">
        <span className="idx">{n}</span>
        <h2 id={`${id}-h`}>{title}</h2>
      </div>
      {lede ? <p className="lede">{lede}</p> : null}
      {children}
    </section>
  );
}

/* ---------------------------------------------------------------- 01 loaders */

function Loaders() {
  const think = useFakeLoad(2800);
  const [run, setRun] = useState(0);
  return (
    <Section
      id="loaders"
      n="01"
      title="Loaders"
      lede={
        <>
          One line, no spinner. <code>AsciiLoader</code> decodes its label once, then JavaScript is done: the only thing left moving is a CSS cursor blink the browser runs off the main thread. With reduced motion it is a still <code>▌ loading</code>.
        </>
      }>
      <div className="grid two">
        <div className="panel">
          <h3 className="label">Spinner replacement</h3>
          <div className="stage" key={run}>
            <AsciiLoader />
          </div>
          <div className="stage">
            <AsciiLoader label="syncing leads" />
          </div>
          <button className="btn" onClick={() => setRun((n) => n + 1)}>
            Replay decode
          </button>
        </div>
        <div className="panel">
          <h3 className="label">Moose Code: the model is thinking</h3>
          <div className="chat">
            <p className="msg me">Why is the pipeline total off by $1,200?</p>
            <div className="msg bot" aria-live="polite">
              {think.loading ? (
                <AsciiLoader variant="thinking" />
              ) : (
                <AsciiReveal preset="legion" lazy={false} key={`a${run}`}>
                  <p>Two estimates were counted twice after the Tuesday re-sync. Removing the duplicates brings the total to $212,900.</p>
                </AsciiReveal>
              )}
            </div>
          </div>
          <button className="btn" onClick={think.load} disabled={think.loading}>
            Ask again
          </button>
        </div>
      </div>
    </Section>
  );
}

/* ---------------------------------------------------------------- 02 skeleton to reveal */

const LEADS = [
  { who: 'ML', name: 'Marcus Lee', meta: 'Hail damage · roof replacement', value: '$18,420', stage: 'Estimate sent', age: '2 d' },
  { who: 'DW', name: 'Dana Whitfield', meta: 'Wind · shingle repair', value: '$3,150', stage: 'Inspection', age: '5 h' },
  { who: 'OR', name: 'Orchard Row HOA', meta: 'Commercial · 14 buildings', value: '$212,900', stage: 'Negotiating', age: '9 d' },
];

function Crm() {
  const f = useFakeLoad(2200);
  return (
    <Section
      id="crm"
      n="02"
      title="Skeleton, then reveal"
      lede={
        <>
          The skeleton is plain HTML that paints on the first frame. When the data lands, the real cards decode into place in gold, about 400 ms. <code>preset="legion"</code> with <code>variant="legion"</code>.
        </>
      }>
      <div className="bar">
        <button className="btn" onClick={f.load} disabled={f.loading}>
          {f.loading ? 'Loading…' : 'Load leads'}
        </button>
        <span className="hint">{f.loading ? 'shimmer runs only while loading' : 'idle: no timers, no frames'}</span>
      </div>
      <AsciiReveal preset="legion" loading={f.loading} lazy={false} className="lead-grid">
        {LEADS.map((l, i) =>
          f.loading ? (
            <div className="card" key={l.name} aria-hidden="true">
              <AsciiSkeleton variant="legion" rows={2} width={40} height={40} circle seed={i + 1} />
              <AsciiSkeleton variant="legion" lines={3} widths={['62%', '90%', '48%']} seed={i + 11} />
            </div>
          ) : (
            <article className="card" data-ascii="surface" key={l.name}>
              <header>
                <span className="avatar">{l.who}</span>
                <div>
                  <h3>{l.name}</h3>
                  <p className="meta">{l.meta}</p>
                </div>
              </header>
              <dl>
                <div>
                  <dt>Value</dt>
                  <dd>{l.value}</dd>
                </div>
                <div>
                  <dt>Stage</dt>
                  <dd>{l.stage}</dd>
                </div>
                <div>
                  <dt>Age</dt>
                  <dd>{l.age}</dd>
                </div>
              </dl>
              <button className="btn" data-ascii="fade">
                Open lead
              </button>
            </article>
          ),
        )}
      </AsciiReveal>
    </Section>
  );
}

/* ---------------------------------------------------------------- 03 mascots */

const MASCOTS: { name: MascotName; title: string; note: string }[] = [
  { name: 'antler', title: 'antler', note: 'The brand glyph, redrawn. Grows once, then a pale band drifts up it.' },
  { name: 'thinking', title: 'thinking', note: 'Three dots, one slow swell. For "the model is thinking".' },
  { name: 'legion-mark', title: 'legion-mark', note: 'Any SVG markup. The mark scans in once, then holds.' },
];

function MascotPanel({ name, title, note }: (typeof MASCOTS)[number]) {
  const f = useFakeLoad(3000, true);
  return (
    <div className="panel">
      <div className="panel-top">
        <h3 className="label">mascot="{title}"</h3>
        <button className="btn small" onClick={() => (f.loading ? f.setLoading(false) : f.load())}>
          {f.loading ? 'Resolve' : 'Load'}
        </button>
      </div>
      <AsciiReveal preset="legion" mascot={name} loading={f.loading} lazy={false} className="mascot-box">
        <div className="mascot-done">
          <p className="ok">✓ 128 records synced</p>
          <p className="muted">{note}</p>
        </div>
      </AsciiReveal>
    </div>
  );
}

function Mascots() {
  return (
    <Section
      id="mascots"
      n="03"
      title="Mascots"
      lede="Loading mascots, rendered through the glyph grid in your accent color. They animate only while loading and on screen; with reduced motion or on a low-end device you get one still frame.">
      <div className="grid three">
        {MASCOTS.map((m) => (
          <MascotPanel key={m.name} {...m} />
        ))}
      </div>
    </Section>
  );
}

/* ---------------------------------------------------------------- 04 guardrails */

const LEVELS: AsciiQuality[] = ['auto', 'full', 'lite', 'off'];
const LEVEL_NOTE: Record<string, string> = {
  full: 'Everything animates, within the caps.',
  lite: 'Nothing runs on requestAnimationFrame. Skeletons and mascots are still, a reveal is one 220 ms fade.',
  off: 'Nothing animates. Content appears at once.',
};

function Guardrails() {
  const [q, setQ] = useState<AsciiQuality>(getAsciiQuality());
  const [animating, setAnimating] = useState(0);
  const grid = useRef<HTMLDivElement>(null);
  const resolved = resolveQuality();
  const count = useCallback(() => setAnimating(grid.current?.querySelectorAll('[data-ars-animate] > canvas').length ?? 0), []);
  // read the slot count a moment after anything changes or the grid scrolls into view (skeletons settle within a few frames)
  useEffect(() => {
    let t = 0;
    const later = () => {
      window.clearTimeout(t);
      t = window.setTimeout(count, 800);
    };
    const io = new IntersectionObserver(([e]) => e.isIntersecting && later());
    if (grid.current) io.observe(grid.current);
    later();
    return () => {
      io.disconnect();
      window.clearTimeout(t);
    };
  }, [q, count]);
  const lim = getAsciiLimits();
  const cores = typeof navigator !== 'undefined' ? navigator.hardwareConcurrency : undefined;
  return (
    <Section
      id="guardrails"
      n="04"
      title="Performance guardrails"
      lede={
        <>
          Built for low-end laptops. <code>auto</code> drops to still on 4 cores or fewer, or 4 GB or less, and always under reduced motion. At most {lim.maxAnimatedSkeletons} on-screen skeletons shimmer at once; scroll and the slots move on. When nothing is loading, nothing is scheduled: zero timers, zero animation frames.
        </>
      }>
      <div className="bar">
        <div className="seg" role="group" aria-label="Quality">
          {LEVELS.map((l) => (
            <button
              key={l}
              className={`seg-btn${q === l ? ' on' : ''}`}
              aria-pressed={q === l}
              onClick={() => {
                setAsciiQuality(l);
                setQ(l);
              }}>
              {l}
            </button>
          ))}
        </div>
        <span className="hint">
          setAsciiQuality(<b>'{q}'</b>) → <b>{resolved}</b>
          {q === 'auto' ? ` · ${cores ?? '?'} cores${isLowEndDevice() ? ', low-end' : ''}` : ''}
        </span>
      </div>
      <p className="muted small">{LEVEL_NOTE[resolved]}</p>
      <div className="skel-grid" ref={grid}>
        {Array.from({ length: 12 }, (_, i) => (
          <div className="tile" key={i}>
            <AsciiSkeleton variant="legion" lines={2} widths={['100%', '70%']} seed={i + 20} />
          </div>
        ))}
      </div>
      <p className="meter">
        <b>{animating}</b> of 12 skeletons shimmering · cap {lim.maxAnimatedSkeletons}, area {Math.round(lim.maxAnimatedArea / 1000)}k px²
        <button className="link" onClick={count}>
          recount
        </button>
      </p>
    </Section>
  );
}

/* ---------------------------------------------------------------- 05 theme + usage */

const SWATCHES = [
  ['--legion-bg', '#0a0a0b', 'surface'],
  ['--legion-text', '#f5f4f0', 'text'],
  ['--legion-muted', '#a8a6a0', 'glyph, skeleton'],
  ['--legion-gold', '#e8c16a', 'accent, cursor, band'],
  ['--legion-gold-pale', '#f6e6b8', 'flash as a character lands'],
];

const CODE_CRM = `// app/layout.tsx
import 'ascii-reveal-legion/legion.css';

// app/leads/page.tsx   ('use client' is already in the package)
import { AsciiReveal, AsciiSkeleton } from 'ascii-reveal-legion';

<AsciiReveal preset="legion" loading={!leads}>
  {leads ? <LeadTable rows={leads} />
         : <AsciiSkeleton variant="legion" lines={4} />}
</AsciiReveal>`;

const CODE_MOOSE = `import { AsciiLoader, setAsciiQuality } from 'ascii-reveal-legion';

// once, e.g. a user setting: 'auto' | 'full' | 'lite' | 'off'
setAsciiQuality('auto');

{isThinking ? <AsciiLoader variant="thinking" /> : <Answer text={text} />}
{isLoading  && <AsciiLoader label="indexing repo" />}`;

function Theme() {
  return (
    <Section id="theme" n="05" title="Theme and usage" lede="Dark only. One CSS file sets every variable the engine reads; your mono font comes in through --font-mono or --legion-font-mono.">
      <div className="swatches">
        {SWATCHES.map(([v, hex, use]) => (
          <div className="sw" key={v}>
            <span className="chip" style={{ background: hex }} aria-hidden="true" />
            <code>{v}</code>
            <span className="muted">
              {hex} · {use}
            </span>
          </div>
        ))}
      </div>
      <div className="grid two">
        <div className="panel">
          <h3 className="label">Legion CRM (Next 16, React 19)</h3>
          <pre>
            <code>{CODE_CRM}</code>
          </pre>
        </div>
        <div className="panel">
          <h3 className="label">Moose Code</h3>
          <pre>
            <code>{CODE_MOOSE}</code>
          </pre>
        </div>
      </div>
    </Section>
  );
}

/* ---------------------------------------------------------------- page */

function Page() {
  return (
    <div className="shell">
      <header className="top">
        <span className="brand">
          <img src={MARK_SRC} width="26" height="26" alt="" />
          ascii-reveal-legion
        </span>
        <nav aria-label="Sections">
          <a href="#loaders">loaders</a>
          <a href="#crm">reveal</a>
          <a href="#mascots">mascots</a>
          <a href="#guardrails">guardrails</a>
          <a href="#theme">theme</a>
          <a href={REPO} target="_blank" rel="noreferrer">
            github
          </a>
        </nav>
      </header>
      <AsciiReveal preset="legion" className="hero" lazy={false}>
        <div className="hero-copy">
          <p className="kicker">v0.4.0-legion.1 · MIT · fork of ascii-reveal</p>
          <h1>Loading that looks like the terminal it is.</h1>
          <p className="lead">Gold on black. Skeletons, loaders and reveals for the Legion CRM and Moose Code, with a hard promise: when nothing is loading, nothing runs.</p>
        </div>
        <img className="hero-mark" src={MARK_SRC} width="240" height="198" alt="" />
      </AsciiReveal>
      <main>
        <Loaders />
        <Crm />
        <Mascots />
        <Guardrails />
        <Theme />
      </main>
      <footer className="foot">
        <p>
          A fork of <a href="https://github.com/quanhoangindex/ascii-reveal">ascii-reveal</a> by Quan Hoang, MIT. Changes: guardrails, the legion preset and variant, antler, thinking and legion-mark mascots, AsciiLoader, legion.css.
        </p>
      </footer>
    </div>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Page />
  </StrictMode>,
);
