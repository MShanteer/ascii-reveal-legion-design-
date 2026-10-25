// Empties dist/ before a build. tsup's own `clean` raced with the second build config and could delete
// dist/core.d.ts, so cleaning happens here, once, before either build starts.
import fs from 'node:fs';
fs.rmSync(new URL('../dist', import.meta.url), { recursive: true, force: true });
