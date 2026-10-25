/**
 * A one-line terminal loading indicator that replaces spinners: `▌ loading`.
 *
 * - Plain HTML + CSS. It paints on the first frame, server-renders, and reads as "loading" to screen readers
 *   (the decorative glyphs are aria-hidden; one visually hidden copy of the label carries the text).
 * - The label decodes into place once when it appears (about 0.4 s, on requestAnimationFrame), then JavaScript is done:
 *   nothing is scheduled while the loader waits. The only thing that keeps moving is the cursor's blink, which is a CSS
 *   opacity animation the browser runs off the main thread.
 * - With reduced motion, or `lite` / `off` quality, there is no decode and no blink: a still `▌ loading`.
 *
 * Use it while something is loading and remove it when the data arrives. It does not animate by itself afterwards.
 */
import { presets } from './presets';
import { isBrowser, hash } from './util';
import { resolveQuality, subscribeQuality, type AsciiQuality } from './quality';

export type LoaderVariant = 'cursor' | 'thinking';

export interface LoaderSpec {
  /** Text next to the cursor. Default `loading` (`thinking` for the thinking variant). */
  label?: string;
  /** `cursor`: `▌ loading`. `thinking`: `▌ thinking` followed by three dots that swell one after another (CSS only). */
  variant?: LoaderVariant;
  /** Blink the cursor. Default true. The blink is a CSS opacity animation; it is off with reduced motion. */
  blink?: boolean;
  /** Include the stylesheet. Default true; set false when you've added `LOADER_CSS` to the page once. */
  css?: boolean;
}

export const LOADER_CSS = `
:where(.arl){position:relative;display:inline-flex;align-items:baseline;gap:.55ch;font-family:var(--ascii-font,ui-monospace,"SF Mono",Menlo,Consolas,monospace);color:var(--ascii-skeleton,currentColor);line-height:1.3;white-space:pre;user-select:none}
.arl-mark{color:var(--ascii-accent,currentColor);animation:arl-blink 1.1s steps(1,end) infinite}
.arl-label[data-decoding]{color:var(--ascii-accent,currentColor)}
.arl-dots{display:inline-flex}
.arl-dots i{font-style:normal;opacity:.25;animation:arl-dot 1.6s ease-in-out infinite}
.arl-dots i:nth-child(2){animation-delay:.22s}
.arl-dots i:nth-child(3){animation-delay:.44s}
.arl-sr{position:absolute;width:1px;height:1px;margin:-1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
.arl[data-blink="false"] .arl-mark,.arl[data-static] .arl-mark{animation:none}
.arl[data-static] .arl-dots i{animation:none;opacity:1}
@keyframes arl-blink{50%{opacity:0}}
@keyframes arl-dot{0%,100%{opacity:.25}35%{opacity:1}}
@media (prefers-reduced-motion:reduce){.arl-mark{animation:none}.arl-dots i{animation:none;opacity:1}}`;

const MARK = '▌'; // ▌

const defaultLabel = (v: LoaderVariant | undefined) => (v === 'thinking' ? 'thinking' : 'loading');
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');

/** HTML string for non-React use: `el.innerHTML = asciiLoaderHTML()`, then `animateLoaders(el)` for the decode. */
export function asciiLoaderHTML(spec: LoaderSpec = {}): string {
  const { variant = 'cursor', blink = true, css: withCss = true } = spec;
  const label = spec.label ?? defaultLabel(variant);
  const dots = variant === 'thinking' ? '<span class="arl-dots" aria-hidden="true"><i>.</i><i>.</i><i>.</i></span>' : '';
  return `${withCss ? `<style>${LOADER_CSS}</style>` : ''}<span class="arl arl-${variant}" role="status" data-ascii-loader data-label="${esc(label)}"${blink ? '' : ' data-blink="false"'}><span class="arl-mark" aria-hidden="true">${MARK}</span><span class="arl-label" aria-hidden="true">${esc(label)}</span>${dots}<span class="arl-sr">${esc(label)}</span></span>`;
}

const DECODE_MS = 420;
const FRAME_MS = 33; // ~30 fps is plenty for a few characters

/**
 * Start the decode on one loader root (an element with class `arl`) and keep it in step with the quality setting.
 * Returns a function that stops it and leaves the final label in place. Safe to call on the server (does nothing).
 */
export function animateLoader(root: HTMLElement, options: { quality?: AsciiQuality } = {}): () => void {
  if (!isBrowser()) return () => {};
  const labelEl = root.querySelector<HTMLElement>('.arl-label');
  const final = root.getAttribute('data-label') ?? labelEl?.textContent ?? '';
  let raf = 0;
  let start = 0;
  let lastDraw = -Infinity;
  const chars = Array.from(final);
  const set = presets.legion.scramble;
  const seed = (final.length * 131 + 7) | 0;
  // when each character locks in (ms): left to right with some jitter, all within DECODE_MS
  const lands = chars.map((_, k) => 70 + (k / Math.max(1, chars.length)) * (DECODE_MS - 190) + hash(k, seed, 3) * 90);

  // React updates data-label before it runs the old effect's cleanup, so read the current label from there
  const current = () => root.getAttribute('data-label') ?? final;
  const text = () => {
    if (!labelEl) return null;
    if (!labelEl.firstChild) labelEl.textContent = current();
    return labelEl.firstChild as Text | null;
  };
  const settle = () => {
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
    const node = text();
    if (node && node.nodeValue !== current()) node.nodeValue = current();
    labelEl?.removeAttribute('data-decoding');
  };
  const frame = (now: number) => {
    raf = 0;
    const lt = now - start;
    if (lt >= DECODE_MS) return settle();
    raf = requestAnimationFrame(frame);
    if (now - lastDraw < FRAME_MS && lt > 0) return;
    lastDraw = now;
    const node = text();
    if (!node) return;
    const step = Math.floor(lt / 55);
    node.nodeValue = chars.map((c, k) => (c === ' ' || lt >= lands[k] ? c : set[Math.floor(hash(k, step, seed) * set.length)])).join('');
  };
  const begin = () => {
    if (raf || !labelEl || !final.trim()) return;
    start = performance.now();
    labelEl.setAttribute('data-decoding', '');
    // draw the first scrambled frame now, before the browser paints, so the final label never flashes first
    const node = text();
    if (node) node.nodeValue = chars.map((c) => (c === ' ' ? c : set[Math.floor(hash(0, 0, seed + c.charCodeAt(0)) * set.length)])).join('');
    raf = requestAnimationFrame(frame);
  };
  const apply = () => {
    if (resolveQuality(options.quality) === 'full') {
      root.removeAttribute('data-static');
    } else {
      root.setAttribute('data-static', '');
      settle();
    }
  };

  apply();
  const unsub = subscribeQuality(apply);
  if (resolveQuality(options.quality) === 'full') begin();
  return () => {
    unsub();
    settle();
  };
}

/** Start the decode on every loader inside `scope` (for markup from `asciiLoaderHTML`). */
export function animateLoaders(scope: ParentNode = document, options: { quality?: AsciiQuality } = {}): () => void {
  if (!isBrowser()) return () => {};
  const stops = Array.from(scope.querySelectorAll<HTMLElement>('[data-ascii-loader]')).map((el) => animateLoader(el, options));
  return () => stops.forEach((s) => s());
}
