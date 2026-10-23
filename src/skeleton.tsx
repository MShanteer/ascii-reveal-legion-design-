import { createElement, useEffect, useMemo, useRef, type CSSProperties, type ElementType, type HTMLAttributes } from 'react';
import { BLOCK_LEN, LINE_LEN, SKELETON_CSS, SKELETON_WIDTHS, skeletonBase, type SkeletonVariant } from './core/skeleton';
import { animateSkeleton } from './core/skeleton-anim';

export interface AsciiSkeletonProps extends Omit<HTMLAttributes<HTMLElement>, 'children'> {
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
  /** Shimmer. Default true. Set false for long lists: a still glyph pattern paints as fast as a gray box. */
  animate?: boolean;
  /** Element to render as. Default `span`. */
  as?: ElementType;
}

const css = (v: string | number | undefined) => (typeof v === 'number' ? `${v}px` : v);

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
export function AsciiSkeleton({ variant = 'dither', lines = 3, widths = SKELETON_WIDTHS, rows, width, height, circle, seed = 1, animate = true, as = 'span', style, className, ...rest }: AsciiSkeletonProps) {
  const ref = useRef<HTMLElement>(null);
  const wkey = widths.join('|');
  // the markup paints as a still pattern; the shimmer starts once this runs in the browser
  useEffect(() => (animate && ref.current ? animateSkeleton(ref.current) : undefined), [animate, variant, lines, rows, seed, width, height, circle, wkey]);
  // glyph text depends only on these props: don't regenerate it when the parent re-renders
  const body = useMemo(() => {
    const group = (i: number, n: number, cls: string, st: CSSProperties) =>
      createElement('span', { key: i, className: cls, style: st }, createElement('span', { className: 'ars-base' }, skeletonBase(variant, seed * 97 + i * 13, n, rows ? BLOCK_LEN : LINE_LEN)));
    return rows
      ? [group(0, rows, 'ars-block', { width: css(width), height: css(height), ...(circle ? { ['--ars-radius' as string]: '50%' } : null) })]
      : Array.from({ length: lines }, (_, i) => group(i, 1, 'ars-line', { width: css(widths[i % widths.length]) }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [variant, lines, wkey, rows, width, height, circle, seed]);
  const cls = `ars ars-${variant}`;
  return createElement(
    as,
    { ...rest, ref, className: className ? `${cls} ${className}` : cls, style, 'data-ascii-skeleton': '', 'data-ars-animate': animate ? String(seed) : undefined, 'aria-hidden': true },
    // React 19 hoists and de-duplicates a <style> with href + precedence, so the CSS ships once per page.
    // React 18 renders it inline per instance (still correct, just repeated).
    createElement('style', { href: 'ascii-reveal-skeleton', precedence: 'default', dangerouslySetInnerHTML: { __html: SKELETON_CSS } } as Record<string, unknown>),
    ...body,
  );
}
