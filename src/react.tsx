import * as React from 'react';
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
import { createAsciiReveal, type AsciiRevealController, type Duration, type Origin, type RunOptions } from './core/engine';
import type { Preset, PresetName } from './core/presets';
import type { MascotDraw, MascotName } from './core/mascots';

const useIsoLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

/** True while React is hydrating server-rendered HTML (and on the server). React 18+; false on 17. */
const noopSubscribe = () => () => {};
const useSyncExternalStore = (React as unknown as { useSyncExternalStore?: typeof React.useSyncExternalStore }).useSyncExternalStore;
function useIsHydrating() {
  return useSyncExternalStore ? useSyncExternalStore(noopSubscribe, () => false, () => true) : false;
}

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
export const AsciiReveal = forwardRef<AsciiRevealHandle, AsciiRevealProps>(function AsciiReveal(
  {
    as: Tag = 'div',
    preset = 'decode',
    speed = 1,
    duration = 'fast',
    origin = 'center',
    selector,
    revealOnMount = true,
    revealOnHydrate = false,
    loading,
    shimmer = true,
    mascot = null,
    lazy = true,
    fallback = true,
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
  // remember whether this component's first render was a hydration of server HTML
  const hydrating = useIsHydrating();
  const fromServer = useRef(hydrating);
  const [pending, setPending] = useState(() => !fromServer.current && (revealOnMount || !!loading));

  useIsoLayoutEffect(() => {
    const root = rootRef.current;
    const overlay = overlayRef.current;
    if (!root || !overlay) return;
    const c = createAsciiReveal(root, { overlay, preset, speed, duration, origin, selector, mascot, lazy, fallback });
    ctrl.current = c;
    // measure with the content visible; nothing paints before the reveal hides it again
    root.removeAttribute('data-ar-pending');
    if (loadingRef.current) {
      c.hide({ instant: true });
      if (shimmer) c.shimmer(true);
    } else if (revealOnMount && (!fromServer.current || revealOnHydrate)) {
      // server-rendered content stays visible on hydration: it is already readable, hiding it would only delay it
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
    ctrl.current?.update({ preset, speed, duration, origin, selector, mascot, lazy, fallback });
  }, [preset, speed, duration, origin, selector, mascot, lazy, fallback]);

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
      // new data decodes in place; `within` keeps it to this component (no lazy section splitting)
      c.reveal({ within: rootRef.current ?? undefined }).then(() => doneRef.current?.());
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
  duration?: Duration;
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
