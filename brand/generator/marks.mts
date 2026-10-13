// Regenerates every mark from the yarn simulation: node marks.mts (Node 22.18+ runs .ts/.mts directly).
// The website imports the same yarn.ts, so the logo on the site and these files never drift apart.
import { writeFileSync, mkdirSync } from 'node:fs';
import { MARK_FULL, MARK_SMALL, markPaths, mixHex, type MarkSpec } from './yarn.ts';

export type Palette = { bg: string; yarn: string; red: string };
export const DARK: Palette = { bg: '#07070a', yarn: '#c9c2b8', red: '#ff2d4a' };
export const LIGHT: Palette = { bg: '#FAF8F5', yarn: '#4f4a44', red: '#C8102E' };

// Same drawing as website/src/components/Mark.tsx: bands back to front; in each, the
// grey yarn, the stretch where it turns red, and the red fibre; then the tail.
export function markSvg(spec: MarkSpec, pal: Palette, { tile = false, weight = 1 } = {}) {
  const { parts, tail } = markPaths(spec);
  const small = spec.wraps < 15;
  const B = parts[0].length, half = B / 2, last = parts.length - 1;
  const gw = (small ? 1.6 : 0.38) * weight, rw = (small ? 4.2 : 1.9) * Math.sqrt(weight);
  const halo = (small ? 1.4 : 0.55) * weight, redHalo = (small ? 2 : 1.4) * weight;
  const lerp = (a: number, b: number, u: number) => a + (b - a) * u;
  const n = (v: number) => +v.toFixed(2);
  const path = (d: string, stroke: string, width: number, opacity = 1) =>
    `<path d="${d}" stroke="${stroke}"${opacity < 1 ? ` stroke-opacity="${n(opacity)}"` : ''} stroke-width="${n(width)}"/>`;
  let g = '';
  for (let i = 0; i < B; i++) {
    const k = i / (B - 1), front = i >= half;
    const look = (p: number) => {
      const u = p / last, width = lerp(gw * (0.75 + 0.5 * k), front ? rw : rw * 0.8, u);
      return { u, width, halo: width + lerp(halo, redHalo, u), opacity: lerp(0.22 + 0.78 * k, front ? 1 : 0.4 + 0.35 * k, u) };
    };
    // The grey first; then the red part's halos all before its strokes, so the colour steps join without seams.
    const draw = (ps: number[]) => {
      if (front) for (const p of ps) if (parts[p][i]) g += path(parts[p][i], pal.bg, look(p).halo);
      for (const p of ps) if (parts[p][i]) g += path(parts[p][i], mixHex(pal.yarn, pal.red, look(p).u), look(p).width, look(p).opacity);
    };
    draw([0]);
    draw(parts.map((_, p) => p).slice(1));
  }
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
