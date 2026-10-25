import * as react from 'react';
import { HTMLAttributes, ReactNode, ElementType } from 'react';

type PresetName = 'decode' | 'dither' | 'terminal' | 'blueprint' | 'legion';
interface Preset {
    /** Glyphs from empty to dense. The first character should be a space. */
    ramp: string;
    /** Glyphs used while a character scrambles. */
    scramble: string;
    /** `ramp` condenses through the ramp before scrambling; `random` scrambles the whole time. */
    mode: 'ramp' | 'random';
    /** How image glyphs are colored: the element's text color, the source pixels, or the accent. */
    color: 'mono' | 'source' | 'accent';
    /** Image cell heights in CSS px, coarse to fine. */
    cells: number[];
    /** Milliseconds between glyph changes. */
    tick: number;
    /** Optional leading cursor glyph shown as each character starts. */
    cursor?: string;
    /** Use the accent color for scramble glyphs. */
    accentGlyphs?: boolean;
}
declare const presets: Record<PresetName, Preset>;
declare function resolvePreset(p: PresetName | Preset | undefined): Preset;

/**
 * Loading mascots. Each one is a small animated vector drawing; the engine renders it
 * through the glyph grid, so it shows up as living ASCII art while content loads.
 * Every draw function fills a w×h box at time t (seconds).
 */
type MascotName = 'spider' | 'ghost' | 'pumpkin' | 'bat' | 'antler' | 'thinking' | 'legion-mark';
type MascotDraw = ((ctx: CanvasRenderingContext2D, w: number, h: number, t: number, color: string) => void) & {
    /** Set by mascots that load an image: resolves when it can be drawn, so a still frame can be repainted once. */
    ready?: Promise<unknown>;
};
/** The Legion antler as SVG markup (the brand glyph, cropped to the mark so it fills its box). Used by the `legion-mark` mascot. */
declare const LEGION_MARK_SVG: string;
/**
 * A logo mascot from SVG markup (or an SVG URL): the mark scans in from the top once, then holds with a very slow
 * breath of opacity. With no argument it is the Legion antler exactly as drawn in the brand file. The image loads on the
 * first frame, so importing this costs nothing on the server.
 */
declare function legionMark(svg?: string): MascotDraw;
declare const mascots: Record<MascotName, MascotDraw>;
/** A custom mascot from an SVG URL or SVG markup, gently floating. */
declare function imageMascot(src: string): MascotDraw;

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
type AsciiQuality = 'auto' | 'full' | 'lite' | 'off';
/** What `auto` turns into on this device, right now. */
type ResolvedQuality = 'full' | 'lite' | 'off';
interface AsciiLimits {
    /** At most this many skeletons shimmer at once; the rest keep their still glyph pattern. Default 6. */
    maxAnimatedSkeletons: number;
    /** Total area (CSS px²) of the skeletons that shimmer at once. Default 800 000 (about 1000 × 800). The first skeleton is always allowed, however large. */
    maxAnimatedArea: number;
}
/** Set the global quality. Running skeletons and loaders react immediately. An unknown value falls back to `auto`. */
declare function setAsciiQuality(quality: AsciiQuality): void;
/** The global setting as passed to `setAsciiQuality` (not resolved). */
declare function getAsciiQuality(): AsciiQuality;
/** Cap how much may shimmer at once. Pass only what you want to change. */
declare function setAsciiLimits(limits: Partial<AsciiLimits>): void;
declare function getAsciiLimits(): AsciiLimits;
/** True on devices that should not run decorative animation: 4 or fewer logical cores, or 4 GB or less of memory. */
declare function isLowEndDevice(): boolean;
/**
 * Resolve a quality setting into what will actually happen. `local` (a component's `quality` prop) beats the global
 * setting unless it is `auto`; reduced motion beats both.
 */
declare function resolveQuality(local?: AsciiQuality): ResolvedQuality;

type Origin = 'center' | 'top-left' | 'pointer' | {
    x: number;
    y: number;
};
/** `fast` (default) keeps data readable within ~400 ms; `cinematic` is the slow showcase wave. */
type Duration = 'fast' | 'cinematic';
interface AsciiRevealOptions {
    /** Built-in preset name or a custom preset object. Default `decode`. */
    preset?: PresetName | Preset;
    /** Playback speed multiplier. 2 is twice as fast. Default 1. */
    speed?: number;
    /** `fast` (default) for data, `cinematic` for heroes and demos. */
    duration?: Duration;
    /** Where the reveal wave starts. Default `center` of the element. */
    origin?: Origin;
    /** Only animate content inside elements matching this selector. */
    selector?: string;
    /** Elements that get the dot-field and corner frame before fading in. Default `[data-ascii="surface"]`. */
    surfaces?: string;
    /** Elements that simply fade in on the wave (buttons, chips). Default `[data-ascii="fade"]`. */
    fades?: string;
    /** Elements rendered through the glyph grid. Default `img, canvas, video, [data-ascii="media"]`. */
    media?: string;
    /** Element the effect draws into. Created automatically when omitted. */
    overlay?: HTMLElement;
    /**
     * Show an animated ASCII mascot while loading instead of the plain shimmer:
     * `spider`, `ghost`, `pumpkin`, `bat`, `antler`, `thinking`, `legion-mark`, an SVG URL, SVG markup, or your own draw function.
     */
    mascot?: MascotName | string | MascotDraw | null;
    /**
     * Reveal sections below the fold as they scroll into view instead of all at once.
     * Applies to full reveals (no `within`). Default true.
     */
    lazy?: boolean;
    /** If the device can't keep up (frames over ~45 ms), finish instantly instead of stuttering. Default true. */
    fallback?: boolean;
    /**
     * Performance guardrail for this reveal; overrides the global `setAsciiQuality`. `auto` (default) animates, except on
     * low-end devices (`lite`: one short fade, no mascot loop) and with reduced motion (`off`: content appears at once).
     */
    quality?: AsciiQuality;
}
interface RunOptions {
    origin?: Origin;
    /** Limit this run to a part of the tree, for example one card. */
    within?: Element;
    speed?: number;
    duration?: Duration;
    preset?: PresetName | Preset;
    /** Hide only: skip the animation and hide immediately. */
    instant?: boolean;
}
interface AsciiRevealController {
    /** Decode the content into place. Resolves when every target has landed. */
    reveal(options?: RunOptions): Promise<void>;
    /** Scramble the content back out. It stays hidden until the next `reveal()`. */
    hide(options?: RunOptions): Promise<void>;
    /** Show a glyph shimmer (or the mascot) where hidden content was, for loading states. */
    shimmer(on: boolean): void;
    update(options: Partial<AsciiRevealOptions>): void;
    destroy(): void;
}
/** Attach the effect to any element. Works without React. */
declare function createAsciiReveal(root: HTMLElement, options?: AsciiRevealOptions): AsciiRevealController;

interface AsciiRevealHandle {
    /** Decode the content into place. */
    reveal(options?: RunOptions): Promise<void>;
    /** Scramble the content back out; it stays hidden until the next reveal. */
    hide(options?: RunOptions): Promise<void>;
    /** The wrapper element. */
    readonly element: HTMLElement | null;
}
interface AsciiRevealProps extends Omit<HTMLAttributes<HTMLElement>, 'children'> {
    children?: ReactNode;
    /** Element to render as the wrapper. Default `div`. */
    as?: ElementType;
    /** `decode` (default), `dither`, `terminal`, `blueprint`, `legion`, or a custom preset object. */
    preset?: PresetName | Preset;
    /** Playback speed multiplier. Default 1. */
    speed?: number;
    /** `fast` (default): data is readable within ~400 ms. `cinematic`: the slow showcase wave. */
    duration?: Duration;
    /** Where the wave starts: `center` (default), `top-left`, `pointer`, or `{ x, y }` in viewport px. */
    origin?: Origin;
    /** Only animate content inside elements that match this selector. */
    selector?: string;
    /**
     * Reveal when the component mounts on the client. Default true.
     * Server-rendered content is never hidden on hydration unless `revealOnHydrate` is set.
     */
    revealOnMount?: boolean;
    /** Also decode server-rendered content when it hydrates. Default false (it stays visible). */
    revealOnHydrate?: boolean;
    /**
     * Loading state. `true` scrambles the content out and shows a glyph shimmer;
     * switching back to `false` decodes the new content into place.
     */
    loading?: boolean;
    /** Show the shimmer while `loading` is true. Default true. */
    shimmer?: boolean;
    /**
     * Replace the shimmer with an animated ASCII mascot while loading:
     * `spider`, `ghost`, `pumpkin`, `bat`, `antler`, `thinking`, `legion-mark`, an SVG URL or markup, or a draw function.
     */
    mascot?: MascotName | string | MascotDraw | null;
    /** Reveal sections below the fold as they scroll into view. Default true. */
    lazy?: boolean;
    /** Finish instantly instead of stuttering on slow devices. Default true. */
    fallback?: boolean;
    /**
     * Performance guardrail for this component; overrides the global `setAsciiQuality`. `auto` (default) animates,
     * except on low-end devices (`lite`: one short fade, mascots drawn once) and with reduced motion (`off`: content appears at once).
     */
    quality?: AsciiQuality;
    /** Called after the mount reveal or a loading reveal finishes. */
    onRevealComplete?: () => void;
}
/**
 * Wrap any subtree. Text, images and canvases inside it decode into place in one wave.
 *
 * Mark cards with `data-ascii="surface"`, buttons or chips with `data-ascii="fade"`,
 * and anything to leave alone with `data-ascii="skip"`.
 */
declare const AsciiReveal: react.ForwardRefExoticComponent<AsciiRevealProps & react.RefAttributes<AsciiRevealHandle>>;
/**
 * Attach the effect to an element you render yourself.
 * Returns a ref callback plus `reveal` / `hide`.
 */
declare function useAsciiReveal(options?: {
    preset?: PresetName | Preset;
    speed?: number;
    duration?: Duration;
    origin?: Origin;
    selector?: string;
    revealOnMount?: boolean;
}): {
    ref: (el: HTMLElement | null) => void;
    reveal: (o?: RunOptions) => Promise<void>;
    hide: (o?: RunOptions) => Promise<void>;
};

type LoaderVariant = 'cursor' | 'thinking';
interface LoaderSpec {
    /** Text next to the cursor. Default `loading` (`thinking` for the thinking variant). */
    label?: string;
    /** `cursor`: `▌ loading`. `thinking`: `▌ thinking` followed by three dots that swell one after another (CSS only). */
    variant?: LoaderVariant;
    /** Blink the cursor. Default true. The blink is a CSS opacity animation; it is off with reduced motion. */
    blink?: boolean;
    /** Include the stylesheet. Default true; set false when you've added `LOADER_CSS` to the page once. */
    css?: boolean;
}
/** HTML string for non-React use: `el.innerHTML = asciiLoaderHTML()`, then `animateLoaders(el)` for the decode. */
declare function asciiLoaderHTML(spec?: LoaderSpec): string;
/**
 * Start the decode on one loader root (an element with class `arl`) and keep it in step with the quality setting.
 * Returns a function that stops it and leaves the final label in place. Safe to call on the server (does nothing).
 */
declare function animateLoader(root: HTMLElement, options?: {
    quality?: AsciiQuality;
}): () => void;
/** Start the decode on every loader inside `scope` (for markup from `asciiLoaderHTML`). */
declare function animateLoaders(scope?: ParentNode, options?: {
    quality?: AsciiQuality;
}): () => void;

interface AsciiLoaderProps extends Omit<HTMLAttributes<HTMLElement>, 'children'> {
    /** Text next to the cursor. Default `loading` (`thinking` for the thinking variant). */
    label?: string;
    /** `cursor`: `▌ loading`. `thinking`: `▌ thinking` and three dots that swell one after another, for an AI "model is thinking" state. */
    variant?: LoaderVariant;
    /** Blink the cursor. Default true. A CSS opacity animation, never on with reduced motion. */
    blink?: boolean;
    /**
     * Performance guardrail for this loader; overrides the global `setAsciiQuality`. With `lite` / `off`, or reduced motion,
     * the loader is a still `▌ loading`: no decode, no blink, nothing scheduled.
     */
    quality?: AsciiQuality;
    /** Element to render as. Default `span`. */
    as?: ElementType;
}
/**
 * A single-line terminal loading indicator that replaces spinners: `▌ loading`.
 * Render it while something loads and remove it when the data arrives.
 *
 * It is plain HTML and CSS, so it server-renders and paints at once. When it appears, the label decodes into place
 * (about 0.4 s); after that nothing runs in JavaScript. Screen readers get a polite "loading" status.
 *
 * ```tsx
 * {isLoading ? <AsciiLoader /> : <Results data={data} />}
 * {isThinking && <AsciiLoader variant="thinking" />}
 * ```
 */
declare function AsciiLoader({ label, variant, blink, quality, as, className, ...rest }: AsciiLoaderProps): react.ReactElement<any, string | react.JSXElementConstructor<any>>;

type SkeletonVariant = 'dither' | 'scan' | 'braille' | 'terminal' | 'legion';
interface SkeletonSpec {
    /** Glyph style. Default `dither`. */
    variant?: SkeletonVariant;
    /** Number of text lines. Default 3. */
    lines?: number;
    /** Line widths (CSS). Defaults to a natural paragraph shape. */
    widths?: (string | number)[];
    /** Rows of glyphs for a block (image/avatar) skeleton. Overrides `lines`. */
    rows?: number;
    /** Seed for the glyph pattern. */
    seed?: number;
    /** Include the stylesheet. Default true; set false when you've added `SKELETON_CSS` to the page once. */
    css?: boolean;
    /** Shimmer. Default true. Set false for long lists: a still glyph pattern paints as fast as a gray box. */
    animate?: boolean;
}
/** HTML string for non-React use: `el.innerHTML = asciiSkeletonHTML({ lines: 3 })`, then `animateSkeletons()` to start the shimmer. */
declare function asciiSkeletonHTML(spec?: SkeletonSpec): string;

interface AsciiSkeletonProps extends Omit<HTMLAttributes<HTMLElement>, 'children'> {
    /** Glyph style: `dither` (shaded blocks, default), `scan` (decode glyphs), `braille` (fine dots), `terminal` (0/1 in your accent color), `legion` (dither and scan, swept by a band in your accent color). */
    variant?: SkeletonVariant;
    /** Number of text lines. Default 3. */
    lines?: number;
    /** Line widths (CSS lengths or px numbers). Defaults to a natural paragraph shape. */
    widths?: (string | number)[];
    /** Render a block (image, avatar, chart) of this many glyph rows instead of text lines. */
    rows?: number;
    /** Block width / height (CSS). Useful with `rows`. */
    width?: string | number;
    height?: string | number;
    /** Round block, e.g. an avatar. */
    circle?: boolean;
    /** Seed for the glyph pattern, so neighbouring skeletons don't look identical. */
    seed?: number;
    /** Shimmer. Default true. Set false for long lists: a still glyph pattern paints as fast as a gray box. */
    animate?: boolean;
    /**
     * Performance guardrail for this skeleton; overrides the global `setAsciiQuality`. `auto` (default) shimmers, except on
     * low-end devices and with reduced motion, where the still pattern stays. Even when allowed, only a capped number of
     * on-screen skeletons shimmer at once (`setAsciiLimits`).
     */
    quality?: AsciiQuality;
    /** Element to render as. Default `span`. */
    as?: ElementType;
}
/**
 * Instant ASCII placeholder. Pure markup + CSS: it paints on first render, works with server rendering,
 * needs no JavaScript and reserves the space your content will take. The shimmer is drawn on a small canvas
 * once the component mounts (much cheaper than animating the markup). Use it on its own, or put it inside
 * `<AsciiReveal loading>` and the real content decodes in when it arrives.
 *
 * ```tsx
 * <AsciiReveal loading={!data}>
 *   {data ? <Profile data={data} /> : <AsciiSkeleton lines={3} variant="dither" />}
 * </AsciiReveal>
 * ```
 */
declare function AsciiSkeleton({ variant, lines, widths, rows, width, height, circle, seed, animate, quality, as, style, className, ...rest }: AsciiSkeletonProps): react.ReactElement<any, string | react.JSXElementConstructor<any>>;

/**
 * Start the shimmer on one skeleton root (an element with class `ars`). Returns a function that stops it.
 * It only shimmers while it is on screen, the quality allows it, and it fits under the global caps.
 */
declare function animateSkeleton(root: HTMLElement, options?: {
    quality?: AsciiQuality;
}): () => void;
/** Start the shimmer on every animated skeleton inside `scope` (for markup from `asciiSkeletonHTML`). */
declare function animateSkeletons(scope?: ParentNode, options?: {
    quality?: AsciiQuality;
}): () => void;

export { type AsciiLimits, AsciiLoader, type AsciiLoaderProps, type AsciiQuality, AsciiReveal, type AsciiRevealController, type AsciiRevealHandle, type AsciiRevealOptions, type AsciiRevealProps, AsciiSkeleton, type AsciiSkeletonProps, type Duration, LEGION_MARK_SVG, type LoaderSpec, type LoaderVariant, type MascotDraw, type MascotName, type Origin, type Preset, type PresetName, type ResolvedQuality, type RunOptions, type SkeletonSpec, type SkeletonVariant, animateLoader, animateLoaders, animateSkeleton, animateSkeletons, asciiLoaderHTML, asciiSkeletonHTML, createAsciiReveal, getAsciiLimits, getAsciiQuality, imageMascot, isLowEndDevice, legionMark, mascots, presets, resolvePreset, resolveQuality, setAsciiLimits, setAsciiQuality, useAsciiReveal };
