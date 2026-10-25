export type PresetName = 'decode' | 'dither' | 'terminal' | 'blueprint' | 'legion';

export interface Preset {
  /** Glyphs from empty to dense. The first character should be a space. */
  ramp: string;
  /** Glyphs used while a character scrambles. */
  scramble: string;
  /** `ramp` condenses through the ramp before scrambling; `random` scrambles the whole time. */
  mode: 'ramp' | 'random';
  /** How image glyphs are colored: the element's text color, the source pixels, or the accent. */
  color: 'mono' | 'source' | 'accent';
  /** Image cell heights in CSS px, coarse to fine. */
  cells: number[];
  /** Milliseconds between glyph changes. */
  tick: number;
  /** Optional leading cursor glyph shown as each character starts. */
  cursor?: string;
  /** Use the accent color for scramble glyphs. */
  accentGlyphs?: boolean;
}

export const presets: Record<PresetName, Preset> = {
  decode: {
    ramp: ' .:-=+*#%@',
    scramble: 'ABCDEFGHJKLMNPQRSTUVWXYZ0123456789#%&*+=?/',
    mode: 'ramp',
    color: 'mono',
    cells: [24, 16, 11, 8, 6],
    tick: 60,
  },
  dither: {
    ramp: ' ░▒▓█',
    scramble: '░▒▓█',
    mode: 'ramp',
    color: 'source',
    cells: [20, 14, 10, 7, 5],
    tick: 85,
  },
  terminal: {
    ramp: ' .-:=+*#',
    scramble: '01<>/\\{}[]|_=+-;:',
    mode: 'random',
    color: 'mono',
    cells: [22, 15, 10, 7, 6],
    tick: 40,
    cursor: '█',
  },
  blueprint: {
    ramp: ' ·-+=x#',
    scramble: '+-/\\|x·',
    mode: 'random',
    color: 'accent',
    cells: [26, 18, 13, 9, 7],
    tick: 95,
    accentGlyphs: true,
  },
  // The Legion look: a terminal printing in gold. Characters start as a block cursor, condense through
  // dots and operators to solid blocks, flicker through hex and punctuation, then lock to their real value.
  // Glyphs, surface dots and image glyphs take --ascii-accent (gold in legion.css). Calm tick, no loop.
  legion: {
    ramp: ' .:-=+*#▒█',
    scramble: '0123456789ABCDEF<>/\\[]{}_=+-;:#',
    mode: 'ramp',
    color: 'accent',
    cells: [22, 15, 10, 7, 6],
    tick: 52,
    cursor: '▌',
    accentGlyphs: true,
  },
};

export function resolvePreset(p: PresetName | Preset | undefined): Preset {
  if (!p) return presets.decode;
  if (typeof p === 'string') return presets[p] ?? presets.decode;
  return p;
}
