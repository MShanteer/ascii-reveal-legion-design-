# Changelog

## 0.3.0

Answers two pieces of feedback: "isn't it too heavy?" and "skeletons are meant to render fast while content loads, does this?"

### Added
- `AsciiSkeleton` component and `asciiSkeletonHTML()`: an ASCII placeholder that is pure HTML and CSS. It paints on first render, works with server rendering and needs no JavaScript. A CSS-only scan sweeps through it, in four styles via `variant`: `dither` (default), `scan`, `braille`, `terminal`.
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
