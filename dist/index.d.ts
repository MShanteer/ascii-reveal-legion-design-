import * as react from 'react';
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

type Origin = 'center' | 'top-left' | 'pointer' | {
    x: number;
    y: number;
};
interface AsciiRevealOptions {
    /** Built-in preset name or a custom preset object. Default `decode`. */
    preset?: PresetName | Preset;
    /** Playback speed multiplier. 2 is twice as fast. Default 1. */
    speed?: number;
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
}
interface RunOptions {
    origin?: Origin;
    /** Limit this run to a part of the tree, for example one card. */
    within?: Element;
    speed?: number;
    preset?: PresetName | Preset;
    /** Hide only: skip the animation and hide immediately. */
    instant?: boolean;
}
interface AsciiRevealController {
    /** Decode the content into place. Resolves when every target has landed. */
    reveal(options?: RunOptions): Promise<void>;
    /** Scramble the content back out. It stays hidden until the next `reveal()`. */
    hide(options?: RunOptions): Promise<void>;
    /** Show a glyph shimmer where hidden content was, for loading states. */
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
    /** Where the wave starts: `center` (default), `top-left`, `pointer`, or `{ x, y }` in viewport px. */
    origin?: Origin;
    /** Only animate content inside elements that match this selector. */
    selector?: string;
    /** Reveal when the component mounts. Default true. */
    revealOnMount?: boolean;
    /**
     * Loading state. `true` scrambles the content out and shows a glyph shimmer;
     * switching back to `false` decodes the new content into place.
     */
    loading?: boolean;
    /** Show the shimmer while `loading` is true. Default true. */
    shimmer?: boolean;
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
    origin?: Origin;
    selector?: string;
    revealOnMount?: boolean;
}): {
    ref: (el: HTMLElement | null) => void;
    reveal: (o?: RunOptions) => Promise<void>;
    hide: (o?: RunOptions) => Promise<void>;
};

export { AsciiReveal, type AsciiRevealController, type AsciiRevealHandle, type AsciiRevealOptions, type AsciiRevealProps, type Origin, type Preset, type PresetName, type RunOptions, createAsciiReveal, presets, resolvePreset, useAsciiReveal };
