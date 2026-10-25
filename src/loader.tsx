import { createElement, useEffect, useLayoutEffect, useRef, type ElementType, type HTMLAttributes } from 'react';
import { LOADER_CSS, animateLoader, type LoaderVariant } from './core/loader';
import type { AsciiQuality } from './core/quality';

const useIsoLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

export interface AsciiLoaderProps extends Omit<HTMLAttributes<HTMLElement>, 'children'> {
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
export function AsciiLoader({ label, variant = 'cursor', blink = true, quality, as = 'span', className, ...rest }: AsciiLoaderProps) {
  const text = label ?? (variant === 'thinking' ? 'thinking' : 'loading');
  const ref = useRef<HTMLElement>(null);
  // before paint, so the final label never flashes ahead of the decode
  useIsoLayoutEffect(() => (ref.current ? animateLoader(ref.current, { quality }) : undefined), [text, quality]);
  const cls = `arl arl-${variant}`;
  return createElement(
    as,
    {
      role: 'status',
      ...rest,
      ref,
      className: className ? `${cls} ${className}` : cls,
      'data-ascii-loader': '',
      'data-label': text,
      'data-blink': blink ? undefined : 'false',
    },
    // React 19 hoists and de-duplicates a <style> with href + precedence, so the CSS ships once per page.
    createElement('style', { href: 'ascii-reveal-loader', precedence: 'default', dangerouslySetInnerHTML: { __html: LOADER_CSS } } as Record<string, unknown>),
    createElement('span', { className: 'arl-mark', 'aria-hidden': true }, '▌'),
    createElement('span', { className: 'arl-label', 'aria-hidden': true }, text),
    variant === 'thinking'
      ? createElement('span', { className: 'arl-dots', 'aria-hidden': true }, createElement('i', null, '.'), createElement('i', null, '.'), createElement('i', null, '.'))
      : null,
    createElement('span', { className: 'arl-sr' }, text),
  );
}
