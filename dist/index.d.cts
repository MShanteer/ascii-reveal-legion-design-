import * as React from 'react';
import { HTMLAttributes, ReactNode, ElementType } from 'react';

type PresetName = 'decode' | 'dither' | 'terminal' | 'blueprint';
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
type MascotName = 'spider' | 'ghost' | 'pumpkin' | 'bat';
type MascotDraw = (ctx: CanvasRenderingContext2D, w: number, h: number, t: number, color: string) => void;
declare const mascots: Record<MascotName, MascotDraw>;
/** A custom mascot from an SVG URL or SVG markup, gently floating. */
declare function imageMascot(src: string): MascotDraw;

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
     * `spider`, `ghost`, `pumpkin`, `bat`, an SVG URL, SVG markup, or your own draw function.
     */
    mascot?: MascotName | string | MascotDraw | null;
    /**
     * Reveal sections below the fold as they scroll into view instead of all at once.
     * Applies to full reveals (no `within`). Default true.
     */
    lazy?: boolean;
    /** If the device can't keep up (frames over ~45 ms), finish instantly instead of stuttering. Default true. */
    fallback?: boolean;
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
    /** `decode` (default), `dither`, `terminal`, `blueprint`, or a custom preset object. */
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
     * `spider`, `ghost`, `pumpkin`, `bat`, an SVG URL or markup, or a draw function.
     */
    mascot?: MascotName | string | MascotDraw | null;
    /** Reveal sections below the fold as they scroll into view. Default true. */
    lazy?: boolean;
    /** Finish instantly instead of stuttering on slow devices. Default true. */
    fallback?: boolean;
    /** Called after the mount reveal or a loading reveal finishes. */
    onRevealComplete?: () => void;
}
/**
 * Wrap any subtree. Text, images and canvases inside it decode into place in one wave.
 *
 * Mark cards with `data-ascii="surface"`, buttons or chips with `data-ascii="fade"`,
 * and anything to leave alone with `data-ascii="skip"`.
 */
declare const AsciiReveal: React.ForwardRefExoticComponent<AsciiRevealProps & React.RefAttributes<AsciiRevealHandle>>;
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

type SkeletonVariant = 'dither' | 'scan' | 'braille' | 'terminal';
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
}
/** HTML string for non-React use: `el.innerHTML = asciiSkeletonHTML({ lines: 3 })`. */
declare function asciiSkeletonHTML(spec?: SkeletonSpec): string;

interface AsciiSkeletonProps extends Omit<HTMLAttributes<HTMLElement>, 'children'> {
    /** Glyph style: `dither` (shaded blocks, default), `scan` (decode glyphs), `braille` (fine dots), `terminal` (0/1 in your accent color). */
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
    /** Element to render as. Default `span`. */
    as?: ElementType;
}
/**
 * Instant ASCII placeholder. Pure markup + CSS: it paints on first render, works with server rendering,
 * needs no JavaScript and reserves the space your content will take. Use it on its own, or put it inside
 * `<AsciiReveal loading>` and the real content decodes in when it arrives.
 *
 * ```tsx
 * <AsciiReveal loading={!data}>
 *   {data ? <Profile data={data} /> : <AsciiSkeleton lines={3} variant="dither" />}
 * </AsciiReveal>
 * ```
 */
declare function AsciiSkeleton({ variant, lines, widths, rows, width, height, circle, seed, as, style, className, ...rest }: AsciiSkeletonProps): React.ReactElement<any, string | React.JSXElementConstructor<any>>;

export { AsciiReveal, type AsciiRevealController, type AsciiRevealHandle, type AsciiRevealOptions, type AsciiRevealProps, AsciiSkeleton, type AsciiSkeletonProps, type Duration, type MascotDraw, type MascotName, type Origin, type Preset, type PresetName, type RunOptions, type SkeletonSpec, type SkeletonVariant, asciiSkeletonHTML, createAsciiReveal, imageMascot, mascots, presets, resolvePreset, useAsciiReveal };
