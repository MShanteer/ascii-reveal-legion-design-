import {
  createElement,
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ElementType,
  type HTMLAttributes,
  type ReactNode,
} from 'react';
import { createAsciiReveal, type AsciiRevealController, type Origin, type RunOptions } from './core/engine';
import type { Preset, PresetName } from './core/presets';

const useIsoLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

export interface AsciiRevealHandle {
  /** Decode the content into place. */
  reveal(options?: RunOptions): Promise<void>;
  /** Scramble the content back out; it stays hidden until the next reveal. */
  hide(options?: RunOptions): Promise<void>;
  /** The wrapper element. */
  readonly element: HTMLElement | null;
}

export interface AsciiRevealProps extends Omit<HTMLAttributes<HTMLElement>, 'children'> {
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
export const AsciiReveal = forwardRef<AsciiRevealHandle, AsciiRevealProps>(function AsciiReveal(
  {
    as: Tag = 'div',
    preset = 'decode',
    speed = 1,
    origin = 'center',
    selector,
    revealOnMount = true,
    loading,
    shimmer = true,
    onRevealComplete,
    style,
    children,
    ...rest
  },
  ref,
) {
  const rootRef = useRef<HTMLElement | null>(null);
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const ctrl = useRef<AsciiRevealController | null>(null);
  const loadingRef = useRef(loading);
  const doneRef = useRef(onRevealComplete);
  doneRef.current = onRevealComplete;
  const [pending, setPending] = useState(revealOnMount || !!loading);

  useIsoLayoutEffect(() => {
    const root = rootRef.current;
    const overlay = overlayRef.current;
    if (!root || !overlay) return;
    const c = createAsciiReveal(root, { overlay, preset, speed, origin, selector });
    ctrl.current = c;
    // measure with the content visible; nothing paints before the reveal hides it again
    root.removeAttribute('data-ar-pending');
    if (loadingRef.current) {
      c.hide({ instant: true });
      if (shimmer) c.shimmer(true);
    } else if (revealOnMount) {
      c.reveal().then(() => doneRef.current?.());
    }
    setPending(false);
    return () => {
      c.destroy();
      ctrl.current = null;
    };
    // the controller lives for the component's lifetime; option changes go through update()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    ctrl.current?.update({ preset, speed, origin, selector });
  }, [preset, speed, origin, selector]);

  useEffect(() => {
    const c = ctrl.current;
    const was = loadingRef.current;
    loadingRef.current = loading;
    if (!c || was === loading || loading === undefined) return;
    if (loading) {
      c.hide().then(() => {
        if (loadingRef.current && shimmer) c.shimmer(true);
      });
    } else {
      c.shimmer(false);
      c.reveal().then(() => doneRef.current?.());
    }
  }, [loading, shimmer]);

  useImperativeHandle(
    ref,
    () => ({
      reveal: (o) => ctrl.current?.reveal(o) ?? Promise.resolve(),
      hide: (o) => ctrl.current?.hide(o) ?? Promise.resolve(),
      get element() {
        return rootRef.current;
      },
    }),
    [],
  );

  const merged: CSSProperties = { position: 'relative', ...style };
  return createElement(
    Tag,
    {
      ...rest,
      ref: rootRef,
      style: merged,
      'data-ar-pending': pending ? '' : undefined,
      'aria-busy': loading ? true : rest['aria-busy'],
    },
    children,
    createElement('div', { ref: overlayRef, className: 'ar-overlay', 'aria-hidden': true }),
  );
});

/**
 * Attach the effect to an element you render yourself.
 * Returns a ref callback plus `reveal` / `hide`.
 */
export function useAsciiReveal(options: {
  preset?: PresetName | Preset;
  speed?: number;
  origin?: Origin;
  selector?: string;
  revealOnMount?: boolean;
} = {}) {
  const ctrl = useRef<AsciiRevealController | null>(null);
  const opts = useRef(options);
  opts.current = options;
  const ref = useCallback((el: HTMLElement | null) => {
    ctrl.current?.destroy();
    ctrl.current = null;
    if (!el) return;
    const { revealOnMount = true, ...o } = opts.current;
    const c = createAsciiReveal(el, o);
    ctrl.current = c;
    if (revealOnMount) c.reveal();
  }, []);
  useEffect(() => {
    const { revealOnMount: _r, ...o } = options;
    ctrl.current?.update(o);
  });
  const reveal = useCallback((o?: RunOptions) => ctrl.current?.reveal(o) ?? Promise.resolve(), []);
  const hide = useCallback((o?: RunOptions) => ctrl.current?.hide(o) ?? Promise.resolve(), []);
  return { ref, reveal, hide };
}
