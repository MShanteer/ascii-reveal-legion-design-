// Copies the Legion theme next to the built JavaScript so it ships as `ascii-reveal-legion/legion.css`.
import fs from 'node:fs';
fs.mkdirSync(new URL('../dist', import.meta.url), { recursive: true });
fs.copyFileSync(new URL('../src/legion.css', import.meta.url), new URL('../dist/legion.css', import.meta.url));
console.log('dist/legion.css');
