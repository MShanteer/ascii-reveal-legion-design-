# Changelog

## 0.4.0-legion.1

The Legion fork: the design system's loading and reveal engine, for the Legion CRM and Moose Code (Next.js 16, React 19). Renamed `ascii-reveal-legion`; MIT, upstream copyright kept, see NOTICE. Built on upstream 0.3.0; every existing preset, variant and mascot behaves as before, except the reduced-motion change noted under Changed.

### Added
- **Performance guardrails.** `setAsciiQuality('auto' | 'full' | 'lite' | 'off')` and a `quality` prop on `AsciiReveal`, `AsciiSkeleton` and `AsciiLoader`. `auto` is `lite` on low-end devices (4 or fewer logical cores, or 4 GB or less of memory) and `off` with `prefers-reduced-motion`, which always wins. `lite`: skeletons, loaders and mascots are still, a reveal is one 220 ms fade. `off`: nothing animates, content appears at once. `getAsciiQuality`, `resolveQuality`, `isLowEndDevice` and `subscribeQuality` are exported too. The setting is kept on `globalThis`, so the main entry, `/core` and the CJS build share it.
- **Caps.** `setAsciiLimits({ maxAnimatedSkeletons: 6, maxAnimatedArea: 800000 })`. Only on-screen skeletons hold a shimmer slot, earlier ones first; the rest keep the still pattern. A skeleton's canvas only exists while it holds a slot.
- **`legion` preset**: block-cursor lead (`▌`), a terminal ramp, hex and punctuation scramble, gold (`--ascii-accent`) glyphs and image glyphs, tick 52 ms.
- **`legion` skeleton variant**: dither and scan dots, swept by a band in `--ascii-accent`.
- **Mascots** `antler` (the brand glyph, from its path data; grows once, then holds), `thinking` (three dots, one slow swell) and `legion-mark` (SVG markup scanned in once). `legionMark(svgMarkup)` and `LEGION_MARK_SVG` are exported. Under `lite` / `off` / reduced motion a mascot is one still frame.
- **`AsciiLoader`** (and `asciiLoaderHTML`, `animateLoaders` for non-React use): a one-line `▌ loading` that replaces spinners. The label decodes once; after that nothing runs in JavaScript. `variant="thinking"` for an AI "model is thinking" state. `role="status"`, still with reduced motion.
- **`ascii-reveal-legion/legion.css`**: the Legion tokens (`--ascii-accent #e8c16a`, `--ascii-glyph`, `--ascii-skeleton`, `--ascii-flash`, `--ascii-surface #0a0a0b`, `--ascii-mascot`, `--ascii-font` with a mono fallback stack that picks up `--font-mono`).
- Tests: `test/quality.test.mjs` (device detection and resolution), `test/guardrails.mjs`, `test/legion.mjs` and `test/hydrate.mjs` (real Chromium; count pending rAF, setTimeout and setInterval), `test/ssr.test.mjs` (server markup identical across renders, `'use client'` kept, peer range, no legacy React API), all against React 19 and React 18. `test/helpers.mjs` accepts `CHROMIUM_PATH`.
- A Legion page in the demo (`demo/legion.html`).

### Changed
- The skeleton frame loop no longer idles at 60 Hz. It runs only while a skeleton is shimmering on screen in a visible tab, and is cancelled otherwise (it used to keep requesting frames for off-screen skeletons). It restarts from an `IntersectionObserver` or `ResizeObserver` callback.
- A destroyed or unmounted reveal no longer leaves a frame scheduled. Loading shimmers and mascots pause when off screen.
- Reduced motion now shows the end state at once; before, a reveal was a 220 ms fade. Set quality `lite` on a component to keep the fade (reduced motion still wins, so this applies to low-end devices only).
- Peer range is `^17 || ^18 || ^19`. Dev dependencies moved to React 19.
- `sideEffects` is `["*.css"]` (was `false`) so `import 'ascii-reveal-legion/legion.css'` is never tree-shaken away.
- `npm run build` empties `dist/` first.

### Fixed
- `tsup`'s `clean` raced with the second build config and could delete `dist/core.d.ts`.
- The smoke test counted Chromium's `/favicon.ico` request as a page error.
- `scripts/bench.cjs` could not serve `index.html` on Windows paths.
### Size
- Gzipped (gzip -9): dist/index.js 16.9 KB → 20.7 KB, dist/core.js 15.6 KB → 19.1 KB (index.cjs 17.2 → 21.1, core.cjs 15.9 → 19.6), legion.css 0.8 KB. The growth is the guardrail layer (about 1.4 KB), the three mascots (about 1.9 KB), AsciiLoader (about 1.1 KB) and the legion CSS and preset strings.
- Demo bench (scripts/bench.cjs, CPU 4x, noisy machine): same React 19 demo with the upstream library and with this one, two interleaved runs each, within noise of each other (replay 10.7 / 13.5 fps vs 12.7 / 13.5, p95 405 / 328 ms vs 333 / 400 ms).

## 0.3.0

Answers two pieces of feedback: "isn't it too heavy?" and "skeletons are meant to render fast while content loads, does this?"

### Added
- `AsciiSkeleton` component and `asciiSkeletonHTML()`: an ASCII placeholder that is pure HTML and CSS. It paints on first render, works with server rendering and needs no JavaScript. A CSS-only scan sweeps through it, in four styles via `variant`: `dither` (default), `scan`, `braille`, `terminal`.
  - Measured against a gray skeleton (see README). The markup is a still glyph pattern that paints with no JavaScript; the shimmer (same look: per-line sweep, flickering glyphs) is drawn on a small canvas per skeleton at ~30 fps. Versus animating it in CSS: browser CPU while waiting 62% → 21% (gray: 15%), style/layout at load 83 → 9 ms, HTML 13 → 3 KB gzipped, first paint on par with gray.
  - `animate={false}` for long lists, and `animateSkeleton()` / `animateSkeletons()` for markup from `asciiSkeletonHTML`.
  - Off-screen skeletons, hidden tabs and reduced motion don't animate.
  - Base styles use `:where()`, so your own classes on a skeleton always win.
- `duration` prop: `'fast'` (default, data readable in ~400 ms) or `'cinematic'` (the v0.2 wave).
- `revealOnHydrate` prop. Server-rendered content is no longer hidden on hydration by default.
- `fallback` prop and a frame-time watchdog: on slow devices the reveal finishes and later reveals fade.
- `asciireveal` DOM event when animation starts and stops.
- Browser smoke test (`npm test`) and a CI workflow.

### Changed
- Rendering: one shared canvas per reveal instead of one per element, repainted at ~30 fps; landed text is cached. Replay is about twice as smooth and the longest main-thread task is ~40% shorter under 4× CPU throttling.
- Layout is measured once per reveal in a batch, and only near the viewport.
- Image glyph grids are precomputed per cell size.
- `loading` transitions only touch content inside the component.
- Text is hidden with `-webkit-text-fill-color`, so `currentColor` icons stay visible.
- Text is split into graphemes (emoji, accents).
- Glyphs are clipped to scrolling containers.
- Gradient text (`background-clip: text`) is hidden properly while it decodes, instead of showing through the glyphs.
- A wrapper resize mid-reveal finishes the reveal instead of drawing out of place. A resize caused by the loading swap itself (skeleton → content) no longer cancels the reveal.

### Size
- About 15 KB gzipped for everything (the engine is ~11 KB; mascots ~1.7 KB; skeleton ~1.5 KB).

### Demo site
- New "Loading states" section with Skeleton + reveal / Skeleton only tabs, skeleton style and reveal preset controls, three live demo cards and copyable code.
- Redesigned hero with an ASCII-decoded glow, Replay limited to the card grid, sticky controls only within the card section.

## 0.2.0
- Loading mascots: spider, ghost, pumpkin, bat, or your own SVG.
- Lazy reveal for sections below the fold.

## 0.1.0
- First release: `AsciiReveal`, `useAsciiReveal`, four presets, framework-free core.
