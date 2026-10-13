import { writeFileSync } from 'node:fs';
import { tangle } from './gen.mjs';
const red = 'M2 41 C14 41 21 37 32 32 C43 27 50 23 62 23';
export function mark(seed, { bg = '#07070a', grey = '#8C8780', redC = '#E3263F', loops = 9, gw = 0.9, rw = 2.4, r = 18, pts = 6 } = {}) {
  const ps = tangle(seed, { loops, pts, r });
  const g = (d) => (bg === 'none' ? '' : `<path d="${d}" stroke="${bg}" stroke-width="${gw + 1.6}"/>`) + `<path d="${d}" stroke="${grey}" stroke-width="${gw}"/>`;
  const under = ps.slice(0, Math.ceil(loops / 2)).map(g).join('');
  const over = ps.slice(Math.ceil(loops / 2)).map(g).join('');
  const redPath = (bg === 'none' ? '' : `<path d="${red}" stroke="${bg}" stroke-width="${rw + 1.8}" stroke-linecap="round"/>`) + `<path d="${red}" stroke="${redC}" stroke-width="${rw}" stroke-linecap="round"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><g fill="none">${under}${redPath}${over}</g></svg>`;
}
if (process.argv[2] === 'sheet') for (const seed of [3, 5, 8, 13, 21, 34]) writeFileSync(`m${seed}.svg`, mark(seed));
