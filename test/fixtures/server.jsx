import { renderToString } from 'react-dom/server';
import { App } from './app.jsx';
import { AsciiSkeleton } from '../../dist/index.js';

/** Everything the SSR test looks at, produced inside one React copy. Console errors and warnings are collected. */
export function run() {
  const problems = [];
  const { error, warn } = console;
  console.error = (...a) => problems.push('error: ' + a.join(' '));
  console.warn = (...a) => problems.push('warn: ' + a.join(' '));
  try {
    const first = renderToString(<App />);
    const second = renderToString(<App />);
    const skeletons = ['dither', 'scan', 'braille', 'terminal', 'legion'].map((variant) => {
      const el = <AsciiSkeleton variant={variant} lines={3} seed={7} />;
      return [renderToString(el), renderToString(el)];
    });
    const two = renderToString(
      <div>
        <AsciiSkeleton lines={1} />
        <AsciiSkeleton lines={1} seed={2} />
      </div>,
    );
    return { first, second, skeletons, two, problems };
  } finally {
    console.error = error;
    console.warn = warn;
  }
}
