/**
 * Performance guardrails. One global switch decides how much this library is allowed to animate.
 *
 * - `full`  everything animates (skeleton shimmer, mascots, the decode reveal, loader label), within the caps below.
 * - `lite`  nothing runs on requestAnimationFrame: skeletons and loaders are static, mascots are one still frame,
 *           and a reveal is a single 220 ms fade instead of the decode.
 * - `off`   nothing animates at all: static placeholders, and content appears instantly.
 * - `auto`  (default) `full`, except `lite` on low-end devices (4 or fewer logical cores, or 4 GB or less of memory)
 *           and `off` when the user asks for reduced motion.
 *
 * `prefers-reduced-motion` always wins: it resolves to `off` whatever you pass, `full` included.
 *
 * The setting lives on `globalThis`, so the main entry and `ascii-reveal-legion/core` always agree on it.
 */
export type AsciiQuality = 'auto' | 'full' | 'lite' | 'off';
/** What `auto` turns into on this device, right now. */
export type ResolvedQuality = 'full' | 'lite' | 'off';

export interface AsciiLimits {
  /** At most this many skeletons shimmer at once; the rest keep their still glyph pattern. Default 6. */
  maxAnimatedSkeletons: number;
  /** Total area (CSS px²) of the skeletons that shimmer at once. Default 800 000 (about 1000 × 800). The first skeleton is always allowed, however large. */
  maxAnimatedArea: number;
}

interface QualityState {
  quality: AsciiQuality;
  limits: AsciiLimits;
  subs: Set<() => void>;
  mq: MediaQueryList | null;
}

const KEY = Symbol.for('ascii-reveal-legion.quality.v1');
const DEFAULT_LIMITS: AsciiLimits = { maxAnimatedSkeletons: 6, maxAnimatedArea: 800_000 };

function state(): QualityState {
  const g = globalThis as unknown as Record<symbol, QualityState | undefined>;
  return (g[KEY] ||= { quality: 'auto', limits: { ...DEFAULT_LIMITS }, subs: new Set(), mq: null });
}

const isQuality = (q: unknown): q is AsciiQuality => q === 'auto' || q === 'full' || q === 'lite' || q === 'off';
const hasWindow = () => typeof window !== 'undefined';

function emit() {
  for (const fn of Array.from(state().subs)) fn();
}

/** Set the global quality. Running skeletons and loaders react immediately. An unknown value falls back to `auto`. */
export function setAsciiQuality(quality: AsciiQuality): void {
  const s = state();
  const next = isQuality(quality) ? quality : 'auto';
  if (s.quality === next) return;
  s.quality = next;
  emit();
}

/** The global setting as passed to `setAsciiQuality` (not resolved). */
export function getAsciiQuality(): AsciiQuality {
  return state().quality;
}

/** Cap how much may shimmer at once. Pass only what you want to change. */
export function setAsciiLimits(limits: Partial<AsciiLimits>): void {
  const s = state();
  const next = { ...s.limits };
  if (limits.maxAnimatedSkeletons !== undefined && limits.maxAnimatedSkeletons >= 0) next.maxAnimatedSkeletons = Math.floor(limits.maxAnimatedSkeletons);
  if (limits.maxAnimatedArea !== undefined && limits.maxAnimatedArea >= 0) next.maxAnimatedArea = limits.maxAnimatedArea;
  if (next.maxAnimatedSkeletons === s.limits.maxAnimatedSkeletons && next.maxAnimatedArea === s.limits.maxAnimatedArea) return;
  s.limits = next;
  emit();
}

export function getAsciiLimits(): AsciiLimits {
  return state().limits;
}

/** True on devices that should not run decorative animation: 4 or fewer logical cores, or 4 GB or less of memory. */
export function isLowEndDevice(): boolean {
  // never on the server: Node has a navigator too, and the answer must not differ between server and browser renders
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;
  const n = navigator as Navigator & { deviceMemory?: number };
  const cores = n.hardwareConcurrency;
  const mem = n.deviceMemory;
  return (typeof cores === 'number' && cores > 0 && cores <= 4) || (typeof mem === 'number' && mem > 0 && mem <= 4);
}

const prefersReducedMotion = () => hasWindow() && !!window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * Resolve a quality setting into what will actually happen. `local` (a component's `quality` prop) beats the global
 * setting unless it is `auto`; reduced motion beats both.
 */
export function resolveQuality(local?: AsciiQuality): ResolvedQuality {
  if (prefersReducedMotion()) return 'off';
  const q = local && isQuality(local) && local !== 'auto' ? local : state().quality;
  if (q === 'auto') return isLowEndDevice() ? 'lite' : 'full';
  return q;
}

/**
 * Call `fn` whenever the global quality or limits change, or the reduced-motion preference flips.
 * The media-query listener only exists while somebody is subscribed.
 */
export function subscribeQuality(fn: () => void): () => void {
  const s = state();
  s.subs.add(fn);
  if (!s.mq && hasWindow() && window.matchMedia) {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    s.mq = mq;
    if (mq.addEventListener) mq.addEventListener('change', emit);
    else if ((mq as MediaQueryList).addListener) (mq as MediaQueryList).addListener(emit);
  }
  return () => {
    s.subs.delete(fn);
    if (!s.subs.size && s.mq) {
      if (s.mq.removeEventListener) s.mq.removeEventListener('change', emit);
      else if (s.mq.removeListener) s.mq.removeListener(emit);
      s.mq = null;
    }
  };
}
