import { StrictMode } from 'react';
import { hydrateRoot } from 'react-dom/client';
import * as lib from '../../dist/index.js';
import { Doc } from './app.jsx';

window.lib = lib;
window.__errors = [];
window.__root = hydrateRoot(
  document,
  <StrictMode>
    <Doc />
  </StrictMode>,
  { onRecoverableError: (e) => window.__errors.push(String((e && e.message) || e)) },
);
window.hydrating = true;
