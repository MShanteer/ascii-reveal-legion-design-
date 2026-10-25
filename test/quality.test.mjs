// Unit tests for the quality guardrails (no browser). Run `npm run build` first. Usage: node --test test/quality.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import * as core from '../dist/core.js';
import * as main from '../dist/index.js';

const require = createRequire(import.meta.url);
const cjs = require('../dist/core.cjs');

const g = globalThis;
const saved = { navigator: Object.getOwnPropertyDescriptor(g, 'navigator'), window: g.window, document: g.document };

/** Pretend to be a browser with these traits, run `fn`, then put everything back. */
function device({ cores, memory, reduced = false }, fn) {
  const listeners = new Set();
  const mq = {
    matches: reduced,
    addEventListener: (_t, cb) => listeners.add(cb),
    removeEventListener: (_t, cb) => listeners.delete(cb),
  };
  Object.defineProperty(g, 'navigator', { value: { hardwareConcurrency: cores, deviceMemory: memory }, configurable: true, writable: true });
  g.window = { matchMedia: () => mq };
  g.document = {};
  try {
    return fn({ mq, listeners });
  } finally {
    if (saved.navigator) Object.defineProperty(g, 'navigator', saved.navigator); else delete g.navigator;
    if (saved.window === undefined) delete g.window; else g.window = saved.window;
    if (saved.document === undefined) delete g.document; else g.document = saved.document;
    core.setAsciiQuality('auto');
    core.setAsciiLimits({ maxAnimatedSkeletons: 6, maxAnimatedArea: 800000 });
  }
}

test('server (no window, no navigator): auto resolves to full and nothing throws', () => {
  assert.equal(core.resolveQuality(), 'full');
  assert.equal(core.isLowEndDevice(), false);
  const stop = core.subscribeQuality(() => {});
  stop();
});

test('low-end detection: 4 or fewer cores, or 4 GB or less of memory', () => {
  const lowEnd = (traits) => device(traits, () => core.isLowEndDevice());
  assert.equal(lowEnd({ cores: 2 }), true);
  assert.equal(lowEnd({ cores: 4 }), true);
  assert.equal(lowEnd({ cores: 5 }), false);
  assert.equal(lowEnd({ cores: 8, memory: 4 }), true);
  assert.equal(lowEnd({ cores: 8, memory: 8 }), false);
  assert.equal(lowEnd({ cores: 16, memory: 0.5 }), true);
  assert.equal(lowEnd({}), false, 'unknown hardware (Safari, Firefox) is not treated as low-end');
  assert.equal(lowEnd({ cores: 0, memory: 0 }), false, 'a zero reading is ignored');
});

test('auto resolves from the device; reduced motion always wins', () => {
  assert.equal(device({ cores: 12, memory: 8 }, () => core.resolveQuality()), 'full');
  assert.equal(device({ cores: 2 }, () => core.resolveQuality()), 'lite');
  assert.equal(device({ cores: 12, reduced: true }, () => core.resolveQuality()), 'off');
  device({ cores: 12, reduced: true }, () => {
    core.setAsciiQuality('full');
    assert.equal(core.resolveQuality(), 'off', "even 'full' cannot override reduced motion");
    assert.equal(core.resolveQuality('full'), 'off');
    assert.equal(core.resolveQuality('lite'), 'off');
  });
});

test('explicit levels: global, then a component override on top', () => {
  device({ cores: 2 }, () => {
    core.setAsciiQuality('full');
    assert.equal(core.resolveQuality(), 'full', 'full opts a low-end device back in');
    core.setAsciiQuality('off');
    assert.equal(core.resolveQuality(), 'off');
    assert.equal(core.resolveQuality('full'), 'full', 'a component can opt in on its own');
    assert.equal(core.resolveQuality('auto'), 'off', "'auto' on a component means follow the global setting");
    core.setAsciiQuality('auto');
    assert.equal(core.resolveQuality('off'), 'off');
    assert.equal(core.resolveQuality(), 'lite');
  });
});

test('setAsciiQuality: notifies once per change, ignores repeats, unknown values mean auto', () => {
  device({ cores: 12 }, () => {
    let n = 0;
    const stop = core.subscribeQuality(() => n++);
    core.setAsciiQuality('lite');
    core.setAsciiQuality('lite');
    assert.equal(n, 1);
    core.setAsciiQuality('bogus');
    assert.equal(core.getAsciiQuality(), 'auto');
    assert.equal(n, 2);
    stop();
    core.setAsciiQuality('off');
    assert.equal(n, 2, 'unsubscribed');
  });
});

test('the reduced-motion listener exists only while somebody is subscribed', () => {
  device({ cores: 12 }, ({ listeners, mq }) => {
    assert.equal(listeners.size, 0);
    const a = core.subscribeQuality(() => {});
    const b = core.subscribeQuality(() => {});
    assert.equal(listeners.size, 1, 'one shared listener');
    a();
    assert.equal(listeners.size, 1);
    b();
    assert.equal(listeners.size, 0, 'none left once the last subscriber is gone');
    let fired = 0;
    const c = core.subscribeQuality(() => fired++);
    for (const l of listeners) l();
    assert.equal(fired, 1, 'a change of the preference reaches subscribers');
    c();
    void mq;
  });
});

test('limits: defaults, partial updates, bad values ignored', () => {
  device({ cores: 12 }, () => {
    assert.deepEqual({ ...core.getAsciiLimits() }, { maxAnimatedSkeletons: 6, maxAnimatedArea: 800000 });
    core.setAsciiLimits({ maxAnimatedSkeletons: 2 });
    assert.equal(core.getAsciiLimits().maxAnimatedSkeletons, 2);
    assert.equal(core.getAsciiLimits().maxAnimatedArea, 800000);
    core.setAsciiLimits({ maxAnimatedSkeletons: -1, maxAnimatedArea: -5 });
    assert.equal(core.getAsciiLimits().maxAnimatedSkeletons, 2, 'negative ignored');
    assert.equal(core.getAsciiLimits().maxAnimatedArea, 800000, 'negative ignored');
    core.setAsciiLimits({ maxAnimatedSkeletons: 0 });
    assert.equal(core.getAsciiLimits().maxAnimatedSkeletons, 0, 'zero turns the shimmer off');
  });
});

test('one setting for every entry point: core, main, and the CommonJS build share it', () => {
  device({ cores: 12 }, () => {
    core.setAsciiQuality('lite');
    assert.equal(main.getAsciiQuality(), 'lite');
    assert.equal(cjs.getAsciiQuality(), 'lite');
    cjs.setAsciiLimits({ maxAnimatedSkeletons: 1 });
    assert.equal(main.getAsciiLimits().maxAnimatedSkeletons, 1);
    let heard = 0;
    const stop = main.resolveQuality && core.subscribeQuality(() => heard++);
    cjs.setAsciiQuality('off');
    assert.equal(heard, 1, 'a subscriber in one bundle hears a change made through another');
    stop();
  });
});
