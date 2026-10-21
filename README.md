# ascii-reveal

A loading effect for React. Text, images and whole cards decode into place through a character grid, in one wave across the page.

- **No layout shift.** Your content stays in the DOM in its real position. The scramble is drawn on a layer above it.
- **Works on anything.** Wrap a subtree and every text node, `<img>`, `<canvas>` and `<video>` inside it takes part.
- **Real loading states.** Set `loading` and the content scrambles out, a glyph shimmer runs where the data will land, then the new data decodes in.
- **Accessible.** Screen readers read the real text the whole time. `prefers-reduced-motion` turns the reveal into a short fade.
- **Small.** About 8 KB gzipped, no dependencies, one animation loop shared by every instance.

## Install

From npm:

```bash
npm i ascii-reveal
```

Straight from GitHub (no npm publish needed):

```bash
npm i github:<your-github-username>/ascii-reveal
```

React 17 or newer is a peer dependency. The built files in `dist/` are committed, so the GitHub install works without a build step.

## Quick start

```tsx
import { AsciiReveal } from 'ascii-reveal';

export function Page() {
  return (
    <AsciiReveal preset="decode">
      <article className="card" data-ascii="surface">
        <img src="/cover.jpg" alt="" />
        <h2>Hello world</h2>
        <button data-ascii="fade">Read more</button>
      </article>
    </AsciiReveal>
  );
}
```

The content reveals when the component mounts.

### Loading states

```tsx
const { data, isLoading } = useQuery(...);

<AsciiReveal loading={isLoading} selector="[data-value]" revealOnMount={false}>
  <dd data-value>{data?.latency ?? '—'}</dd>
</AsciiReveal>
```

When `loading` turns `true`, the matching content scrambles out and a shimmer runs in its place. When it turns `false`, the new content decodes in.

### Replay from code

```tsx
const ref = useRef<AsciiRevealHandle>(null);

<AsciiReveal ref={ref}>…</AsciiReveal>

// replay one card from where it was clicked
ref.current?.reveal({ within: cardElement, origin: { x: e.clientX, y: e.clientY } });
ref.current?.hide();
```

## Props

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `preset` | `'decode' \| 'dither' \| 'terminal' \| 'blueprint' \| Preset` | `'decode'` | Glyph set, timing and image style. |
| `speed` | `number` | `1` | Playback speed. `2` is twice as fast. |
| `origin` | `'center' \| 'top-left' \| 'pointer' \| { x, y }` | `'center'` | Where the wave starts. `{ x, y }` is in viewport pixels. |
| `selector` | `string` | – | Only animate content inside elements matching this selector. |
| `revealOnMount` | `boolean` | `true` | Reveal when the component mounts. |
| `loading` | `boolean` | – | Scramble out and shimmer while `true`; decode in when it turns `false`. |
| `shimmer` | `boolean` | `true` | Show the glyph shimmer while loading. |
| `onRevealComplete` | `() => void` | – | Called when a reveal finishes. |
| `as` | `ElementType` | `'div'` | Element used for the wrapper. |

All other props pass through to the wrapper element.

## Marking elements

| Attribute | Effect |
| --- | --- |
| `data-ascii="surface"` | Cards and panels. A dot field and corner frame appear first, then the surface fades in. |
| `data-ascii="fade"` | Buttons, chips, badges. Fades in on the wave. |
| `data-ascii="media"` | Treat any element as media (rendered as a glyph texture). |
| `data-ascii="skip"` | Leave this subtree alone, for example a toolbar that must stay usable. |
| `data-ascii-digits` | Scramble only through digits (applied automatically to numeric text). |

## Theming

The effect reads these CSS custom properties from the wrapper:

```css
.my-app {
  --ascii-accent: #5b8cff;   /* flash as each character lands, cursor and blueprint glyphs */
  --ascii-glyph: #888;       /* scramble glyph color (defaults to the text's own color at 50%) */
  --ascii-font: "Geist Mono", ui-monospace, monospace;
  --ascii-surface: #0b0b0d;  /* color behind transparent images, if detection is wrong */
}
```

## Without React

```ts
import { createAsciiReveal } from 'ascii-reveal/core';

const reveal = createAsciiReveal(document.querySelector('#app')!, { preset: 'dither' });
reveal.reveal();
// later
await reveal.hide();
reveal.shimmer(true);
```

## Presets

- **decode**: characters condense from light glyphs to dense ones, then lock to their real value.
- **dither**: block shading; images resolve in their own colors.
- **terminal**: a cursor leads each character, binary-style scramble.
- **blueprint**: line glyphs in the accent color.

Make your own by passing an object with the `Preset` shape (`ramp`, `scramble`, `mode`, `color`, `cells`, `tick`).

## Notes

- Cross-origin images without CORS headers can't be sampled; they reveal through a neutral glyph texture instead.
- Works with Next.js App Router: the React entry is marked `"use client"`.
- The reveal measures layout once when it starts. If your fonts load late, start the reveal after `document.fonts.ready`.

## Develop

```bash
npm install
npm run build        # builds dist/
npm run demo         # runs the demo site (cd demo && npm install first)
```

## License

MIT
