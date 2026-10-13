// Generates "tangle + red thread" marks for a few seeds.
import { writeFileSync } from 'node:fs';
function rng(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32); }
// Closed Catmull-Rom → cubic bezier
function closed(pts) {
  const n = pts.length; let d = `M${pts[0][0].toFixed(2)} ${pts[0][1].toFixed(2)}`;
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n];
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C${c1.map(v=>v.toFixed(2)).join(' ')} ${c2.map(v=>v.toFixed(2)).join(' ')} ${p2.map(v=>v.toFixed(2)).join(' ')}`;
  }
  return d;
}
export function tangle(seed, { loops = 7, pts = 5, r = 17, cx = 32, cy = 32 } = {}) {
  const R = rng(seed); const out = [];
  for (let l = 0; l < loops; l++) {
    const a0 = R() * Math.PI * 2; const p = [];
    for (let i = 0; i < pts; i++) {
      const a = a0 + (i / pts) * Math.PI * 2 + (R() - 0.5) * 0.9;
      const rr = r * (0.45 + R() * 0.6);
      p.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr * 0.92]);
    }
    out.push(closed(p));
  }
  return out;
}
const red = 'M3 44 C14 44 20 40 26 34 C31 29 34 30 38 30 C46 30 50 20 61 20';
for (const seed of [3, 7, 11, 19, 23, 42]) {
  const paths = tangle(seed).map(d => `<path d="${d}"/>`).join('');
  writeFileSync(`m${seed}.svg`, `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><g fill="none" stroke="#8C8780" stroke-width="1.1" stroke-opacity=".75">${paths}</g><path d="${red}" fill="none" stroke="#E3263F" stroke-width="3" stroke-linecap="round"/></svg>`);
}
