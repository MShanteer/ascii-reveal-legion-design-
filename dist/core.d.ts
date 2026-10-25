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
/**
 * Call `fn` whenever the global quality or limits change, or the reduced-motion preference flips.
 * The media-query listener only exists while somebody is subscribed.
 */
declare function subscribeQuality(fn: () => void): () => void;

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

type SkeletonVariant = 'dither' | 'scan' | 'braille' | 'terminal' | 'legion';
interface VariantSpec {
    base: string;
    wave: string;
    /** Share of empty cells. */
    gap: number;
    /** >1 favours the lighter glyphs of the ramp. */
    bias: number;
}
declare const SKELETON_VARIANTS: Record<SkeletonVariant, VariantSpec>;
declare const SKELETON_CSS = "\n:where(.ars){position:relative;display:block;font-family:var(--ascii-font,ui-monospace,\"SF Mono\",Menlo,Consolas,monospace);color:var(--ascii-skeleton,currentColor);user-select:none;pointer-events:none;--ars-base:.3;--ars-wave:.9;--ars-band:45%;--ars-speed:1.8s}\n.ars-line,.ars-block{position:relative;display:block;overflow:hidden;white-space:pre;line-height:1.3;contain:inline-size layout paint style}\n.ars-line+.ars-line{margin-top:.55em}\n.ars-block{line-height:1;border-radius:var(--ars-radius,8px);background:color-mix(in srgb,currentColor 6%,transparent)}\n.ars-base{display:block;opacity:var(--ars-base)}\n.ars>canvas{position:absolute;left:0;top:0;pointer-events:none}\n.ars-dither{--ars-base:.22;--ars-wave:.75;--ars-band:55%}\n.ars-dither .ars-line{line-height:1;letter-spacing:-.02em}\n.ars-braille{--ars-base:.35;--ars-wave:1;--ars-band:40%}\n.ars-scan{--ars-base:.28;--ars-wave:.95;--ars-band:38%}\n.ars-terminal{--ars-base:.16;--ars-wave:1;--ars-band:35%;--ars-speed:1.5s;--ars-wave-color:var(--ascii-accent,currentColor)}\n.ars-legion{--ars-base:.26;--ars-wave:.95;--ars-band:42%;--ars-speed:1.7s;--ars-wave-color:var(--ascii-accent,currentColor)}\n.ars-legion .ars-line{letter-spacing:-.02em}";
/** A deterministic row of glyphs. */
declare function glyphRow(seed: number, len: number, ramp?: string, gap?: number, bias?: number): string;
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
declare const LOADER_CSS = "\n:where(.arl){position:relative;display:inline-flex;align-items:baseline;gap:.55ch;font-family:var(--ascii-font,ui-monospace,\"SF Mono\",Menlo,Consolas,monospace);color:var(--ascii-skeleton,currentColor);line-height:1.3;white-space:pre;user-select:none}\n.arl-mark{color:var(--ascii-accent,currentColor);animation:arl-blink 1.1s steps(1,end) infinite}\n.arl-label[data-decoding]{color:var(--ascii-accent,currentColor)}\n.arl-dots{display:inline-flex}\n.arl-dots i{font-style:normal;opacity:.25;animation:arl-dot 1.6s ease-in-out infinite}\n.arl-dots i:nth-child(2){animation-delay:.22s}\n.arl-dots i:nth-child(3){animation-delay:.44s}\n.arl-sr{position:absolute;width:1px;height:1px;margin:-1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}\n.arl[data-blink=\"false\"] .arl-mark,.arl[data-static] .arl-mark{animation:none}\n.arl[data-static] .arl-dots i{animation:none;opacity:1}\n@keyframes arl-blink{50%{opacity:0}}\n@keyframes arl-dot{0%,100%{opacity:.25}35%{opacity:1}}\n@media (prefers-reduced-motion:reduce){.arl-mark{animation:none}.arl-dots i{animation:none;opacity:1}}";
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

export { type AsciiLimits, type AsciiQuality, type AsciiRevealController, type AsciiRevealOptions, type Duration, LEGION_MARK_SVG, LOADER_CSS, type LoaderSpec, type LoaderVariant, type MascotDraw, type MascotName, type Origin, type Preset, type PresetName, type ResolvedQuality, type RunOptions, SKELETON_CSS, SKELETON_VARIANTS, type SkeletonSpec, type SkeletonVariant, animateLoader, animateLoaders, animateSkeleton, animateSkeletons, asciiLoaderHTML, asciiSkeletonHTML, createAsciiReveal, getAsciiLimits, getAsciiQuality, glyphRow, imageMascot, isLowEndDevice, legionMark, mascots, presets, resolvePreset, resolveQuality, setAsciiLimits, setAsciiQuality, subscribeQuality };
