// One tree rendered on the server and then hydrated in the browser, for the SSR and hydration tests.
import { AsciiLoader, AsciiReveal, AsciiSkeleton } from '../../dist/index.js';

export function App() {
  return (
    <main id="app">
      <AsciiReveal id="reveal" preset="legion">
        <h1>Hello Legion</h1>
        <p data-value>42 ms</p>
        <AsciiSkeleton variant="legion" lines={2} seed={3} />
      </AsciiReveal>
      <AsciiSkeleton variant="dither" lines={3} seed={1} />
      <AsciiSkeleton variant="scan" rows={4} width={96} height={96} circle seed={2} />
      <AsciiSkeleton variant="terminal" lines={2} widths={['100%', '60%']} animate={false} />
      <AsciiLoader />
      <AsciiLoader variant="thinking" label="thinking" />
      <AsciiLoader label="a & b < c" blink={false} />
    </main>
  );
}

/** The whole document, the way a Next.js App Router layout renders it. */
export function Doc() {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <title>hydrate</title>
        <link rel="stylesheet" href="/dist/legion.css" />
      </head>
      <body style={{ margin: 16, background: '#0a0a0b', color: '#f5f4f0' }}>
        <App />
        <script src="/client.js" />
      </body>
    </html>
  );
}
