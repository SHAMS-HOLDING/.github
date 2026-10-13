// Regenerates every mark from the yarn simulation: node marks.mts (Node 22.18+ runs .ts/.mts directly).
// The website imports the same yarn.ts, so the logo on the site and these files never drift apart.
import { writeFileSync, mkdirSync } from 'node:fs';
import { MARK_FULL, MARK_RED, MARK_SMALL, markBands, type MarkSpec } from './yarn.ts';

export type Palette = { bg: string; yarn: string; red: string };
export const DARK: Palette = { bg: '#07070a', yarn: '#c9c2b8', red: '#ff2d4a' };
export const LIGHT: Palette = { bg: '#FAF8F5', yarn: '#4f4a44', red: '#C8102E' };

export function markSvg(spec: MarkSpec, pal: Palette, { tile = false } = {}) {
  const bands = markBands(spec);
  const small = spec === MARK_SMALL;
  const half = bands.length / 2;
  const gw = small ? 1.6 : 0.38, rw = small ? 4.6 : 1.9;
  const op = (i: number) => (0.22 + 0.78 * (i / (bands.length - 1))).toFixed(2);
  const w = (i: number) => +(gw * (0.75 + 0.5 * (i / (bands.length - 1)))).toFixed(2);
  let g = '';
  bands.slice(0, half).forEach((d, i) => (g += `<path d="${d}" stroke="${pal.yarn}" stroke-opacity="${op(i)}" stroke-width="${w(i)}"/>`));
  g += `<path d="${MARK_RED}" stroke="${pal.bg}" stroke-width="${rw + (small ? 2.2 : 1.5)}"/><path d="${MARK_RED}" stroke="${pal.red}" stroke-width="${rw}"/>`;
  bands.slice(half).forEach((d, j) => {
    const i = j + half;
    g += `<path d="${d}" stroke="${pal.bg}" stroke-width="${(w(i) + (small ? 1.4 : 0.55)).toFixed(2)}"/><path d="${d}" stroke="${pal.yarn}" stroke-opacity="${op(i)}" stroke-width="${w(i)}"/>`;
  });
  const bgRect = tile ? `<rect width="64" height="64" rx="14" fill="${pal.bg}"/>` : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">${bgRect}<g fill="none" stroke-linecap="round" stroke-linejoin="round">${g}</g></svg>\n`;
}

if (process.argv[1]?.endsWith('marks.mts')) {
  const out = new URL('../svg/', import.meta.url);
  mkdirSync(out, { recursive: true });
  const files: Record<string, string> = {
    'shams-mark-ondark.svg': markSvg(MARK_FULL, DARK),
    'shams-mark-onlight.svg': markSvg(MARK_FULL, LIGHT),
    'shams-mark-small-ondark.svg': markSvg(MARK_SMALL, DARK),
    'shams-mark-small-onlight.svg': markSvg(MARK_SMALL, LIGHT),
    'shams-favicon.svg': markSvg(MARK_SMALL, DARK, { tile: true }),
  };
  for (const [name, svg] of Object.entries(files)) writeFileSync(new URL(name, out), svg);
  console.log('wrote', Object.keys(files).join(', '));
}
