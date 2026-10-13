// Regenerates every mark from the yarn simulation: node marks.mts (Node 22.18+ runs .ts/.mts directly).
// The website imports the same yarn.ts, so the logo on the site and these files never drift apart.
import { writeFileSync, mkdirSync } from 'node:fs';
import { MARK_FULL, MARK_SMALL, markPaths, type MarkSpec } from './yarn.ts';

export type Palette = { bg: string; yarn: string; red: string };
export const DARK: Palette = { bg: '#07070a', yarn: '#c9c2b8', red: '#ff2d4a' };
export const LIGHT: Palette = { bg: '#FAF8F5', yarn: '#4f4a44', red: '#C8102E' };

// Same drawing as website/src/components/Mark.tsx: bands back to front, the red fibre
// woven in among the grey ones, then the tail that leaves the ball.
export function markSvg(spec: MarkSpec, pal: Palette, { tile = false, weight = 1 } = {}) {
  const { grey, red, tail } = markPaths(spec);
  const small = spec === MARK_SMALL;
  const half = grey.length / 2;
  const gw = (small ? 1.6 : 0.38) * weight, rw = (small ? 4.2 : 1.9) * Math.sqrt(weight);
  const halo = (small ? 1.4 : 0.55) * weight, redHalo = (small ? 2 : 1.4) * weight;
  const k = (i: number) => i / (grey.length - 1);
  const n = (v: number) => +v.toFixed(2);
  const w = (i: number) => n(gw * (0.75 + 0.5 * k(i)));
  const path = (d: string, stroke: string, width: number, opacity?: number) =>
    `<path d="${d}" stroke="${stroke}"${opacity === undefined ? '' : ` stroke-opacity="${n(opacity)}"`} stroke-width="${n(width)}"/>`;
  let g = '';
  grey.forEach((d, i) => {
    if (i >= half) g += path(d, pal.bg, w(i) + halo);
    g += path(d, pal.yarn, w(i), 0.22 + 0.78 * k(i));
    if (!red[i]) return;
    if (i >= half) g += path(red[i], pal.bg, rw + redHalo);
    g += i >= half ? path(red[i], pal.red, rw) : path(red[i], pal.red, rw * 0.8, 0.4 + 0.35 * k(i));
  });
  // butt cap: a round one would reach back over the fibre the tail continues
  g += path(tail, pal.bg, rw + redHalo).replace('/>', ' stroke-linecap="butt"/>') + path(tail, pal.red, rw);
  const bgRect = tile ? `<rect width="64" height="64" rx="14" fill="${pal.bg}"/>` : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">${bgRect}<g fill="none" stroke-linecap="round" stroke-linejoin="round">${g}</g></svg>\n`;
}

if (process.argv[1]?.endsWith('marks.mts')) {
  const out = new URL('../svg/', import.meta.url);
  mkdirSync(out, { recursive: true });
  const files: Record<string, string> = {
    'shams-mark-ondark.svg': markSvg(MARK_FULL, DARK),
    'shams-mark-onlight.svg': markSvg(MARK_FULL, LIGHT),
    'shams-mark-large-ondark.svg': markSvg(MARK_FULL, DARK, { weight: 0.45 }),
    'shams-mark-large-onlight.svg': markSvg(MARK_FULL, LIGHT, { weight: 0.45 }),
    'shams-mark-small-ondark.svg': markSvg(MARK_SMALL, DARK),
    'shams-mark-small-onlight.svg': markSvg(MARK_SMALL, LIGHT),
    'shams-favicon.svg': markSvg(MARK_SMALL, DARK, { tile: true }),
  };
  for (const [name, svg] of Object.entries(files)) writeFileSync(new URL(name, out), svg);
  console.log('wrote', Object.keys(files).join(', '));
}
