import { createElement, type CSSProperties, type ElementType, type HTMLAttributes } from 'react';
import { SKELETON_CSS, SKELETON_WIDTHS, skeletonDelay, skeletonLayers, type SkeletonVariant } from './core/skeleton';

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
  /** Element to render as. Default `span`. */
  as?: ElementType;
}

const css = (v: string | number | undefined) => (typeof v === 'number' ? `${v}px` : v);

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
export function AsciiSkeleton({ variant = 'dither', lines = 3, widths = SKELETON_WIDTHS, rows, width, height, circle, seed = 1, as = 'span', style, className, ...rest }: AsciiSkeletonProps) {
  const group = (i: number, n: number, cls: string, st: CSSProperties) => {
    const [b, w1, w2] = skeletonLayers(variant, seed * 97 + i * 13, n, rows ? 120 : 160);
    return createElement(
      'span',
      { key: i, className: cls, style: { ...st, ['--ars-d' as string]: skeletonDelay(i) } },
      createElement('span', { className: 'ars-base' }, b),
      createElement('span', { className: 'ars-wave' }, w1),
      createElement('span', { className: 'ars-wave' }, w2),
    );
  };
  const body = rows
    ? [group(0, rows, 'ars-block', { width: css(width), height: css(height), ...(circle ? { ['--ars-radius' as string]: '50%' } : null) })]
    : Array.from({ length: lines }, (_, i) => group(i, 1, 'ars-line', { width: css(widths[i % widths.length]) }));
  const cls = `ars ars-${variant}`;
  return createElement(
    as,
    { ...rest, className: className ? `${cls} ${className}` : cls, style, 'data-ascii-skeleton': '', 'aria-hidden': true },
    // identical <style> blocks are harmless and keep the component self-contained for SSR
    createElement('style', { dangerouslySetInnerHTML: { __html: SKELETON_CSS } }),
    ...body,
  );
}
