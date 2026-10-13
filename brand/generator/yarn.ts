/**
 * Yarn: the simulation behind the SHAMS mark and the hero sun.
 *
 * One continuous thread is wound around a sphere the way a real ball of yarn is
 * wound: every wrap is (nearly) a great circle, the winding axis drifts a little
 * after each wrap, and later wraps lie slightly further out than earlier ones.
 * Because the thread is a parametric curve, it stays perfectly smooth at any scale,
 * and because it lives in 3D, every crossing has a true front and back.
 */

export type Yarn = { x: Float32Array; y: Float32Array; z: Float32Array; n: number };

function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Smooth 1D noise: a few incommensurate sines with seeded phases.
function smoothNoise(rand: () => number) {
  const f = [0.37, 0.71, 1.13].map((v) => v * (0.8 + rand() * 0.4));
  const p = f.map(() => rand() * Math.PI * 2);
  return (s: number) => (Math.sin(f[0] * s + p[0]) * 0.55 + Math.sin(f[1] * s + p[1]) * 0.3 + Math.sin(f[2] * s + p[2]) * 0.15);
}

export function windYarn({ wraps = 22, perWrap = 120, seed = 8, grow = 0.16, drift = 1, lat = 0 } = {}): Yarn {
  const rand = rng(seed);
  const na = smoothNoise(rand), nb = smoothNoise(rand), nc = smoothNoise(rand), nh = smoothNoise(rand);
  const wob = rand() * Math.PI * 2;
  const n = Math.round(wraps * perWrap) + 1;
  const x = new Float32Array(n), y = new Float32Array(n), z = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const s = i / perWrap; // wraps completed so far
    const th = 2 * Math.PI * s;
    // Axis drift per wrap (~25°), modulated by smooth noise so no two wraps repeat.
    const a = drift * (0.41 * s + 0.35 * na(s));
    const b = drift * (0.23 * s + 0.35 * nb(s));
    const c = drift * (0.13 * s + 0.25 * nc(s));
    // Wraps are not all great circles: some ride a little above or below the
    // equator (small circles), which is what makes a real ball look lumpy.
    const h = lat * nh(s * 1.7);
    const rho = Math.sqrt(1 - h * h);
    const r = 1 - grow + grow * (s / wraps) + 0.012 * Math.sin(5 * th + wob);
    // Point on the base great circle, then R = Rz(c) · Ry(b) · Rx(a).
    let px = Math.cos(th) * rho * r, py = Math.sin(th) * rho * r, pz = h * r;
    let t = py * Math.cos(a) - pz * Math.sin(a);
    pz = py * Math.sin(a) + pz * Math.cos(a);
    py = t;
    t = px * Math.cos(b) + pz * Math.sin(b);
    pz = -px * Math.sin(b) + pz * Math.cos(b);
    px = t;
    t = px * Math.cos(c) - py * Math.sin(c);
    py = px * Math.sin(c) + py * Math.cos(c);
    px = t;
    x[i] = px; y[i] = py; z[i] = pz;
  }
  return { x, y, z, n };
}

/** Rotate the whole ball (yaw around y, then pitch around x) into `out`. */
export function view(yarn: Yarn, yaw: number, pitch: number, out: Yarn) {
  const cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch);
  for (let i = 0; i < yarn.n; i++) {
    const x1 = yarn.x[i] * cy + yarn.z[i] * sy;
    const z1 = -yarn.x[i] * sy + yarn.z[i] * cy;
    const y1 = yarn.y[i];
    out.x[i] = x1;
    out.y[i] = y1 * cp - z1 * sp;
    out.z[i] = y1 * sp + z1 * cp;
  }
  return out;
}

export function emptyLike(yarn: Yarn): Yarn {
  return { x: new Float32Array(yarn.n), y: new Float32Array(yarn.n), z: new Float32Array(yarn.n), n: yarn.n };
}

/**
 * Splits the projected thread into smooth runs by depth band.
 * Pieces run from midpoint to midpoint with the sample as control point, so the
 * curve is C1-continuous and consecutive runs meet exactly. `sink` receives
 * (band, 'M' | 'Q', ...coords).
 */
export function traceBands(
  p: Yarn, bands: number, project: (x: number, y: number) => [number, number],
  sink: (band: number, cmd: 'M' | 'Q', a: number, b: number, c?: number, d?: number) => void,
) {
  let cur = -1;
  const band = (z: number) => Math.min(bands - 1, Math.max(0, Math.floor(((z + 1) / 2) * bands)));
  let [ax, ay] = project(p.x[0], p.y[0]);
  let [bx, by] = project(p.x[1], p.y[1]);
  for (let k = 1; k < p.n - 1; k++) {
    const [cx, cy] = project(p.x[k + 1], p.y[k + 1]);
    const b = band(p.z[k]);
    if (b !== cur) {
      sink(b, 'M', (ax + bx) / 2, (ay + by) / 2);
      cur = b;
    }
    sink(b, 'Q', bx, by, (bx + cx) / 2, (by + cy) / 2);
    ax = bx; ay = by; bx = cx; by = cy;
  }
}

/** Static mark geometry (used by the logo component and the brand generator). */
/** The look of the ball: how far the axis drifts per wrap, how far wraps leave the equator, how much the ball grows. */
export const YARN_STYLE = { drift: 1.6, lat: 0.35, grow: 0.22, seed: 8 };

export type MarkSpec = { wraps: number; perWrap: number; yaw: number; pitch: number; radius: number; bands: number };
export const MARK_FULL: MarkSpec = { wraps: 30, perWrap: 48, yaw: 0.6, pitch: 0.42, radius: 22.5, bands: 6 };
export const MARK_SMALL: MarkSpec = { wraps: 7, perWrap: 36, yaw: 0.6, pitch: 0.42, radius: 23.5, bands: 4 };
export const MARK_RED = 'M1 42 C13 42 21 37.5 32 32 C43 26.5 51 22 63 22';

export function markBands(spec: MarkSpec): string[] {
  const yarn = windYarn({ ...YARN_STYLE, wraps: spec.wraps, perWrap: spec.perWrap });
  const p = view(yarn, spec.yaw, spec.pitch, emptyLike(yarn));
  const out = Array.from({ length: spec.bands }, () => '');
  const f = (v: number) => (Math.round(v * 10) / 10).toString();
  traceBands(p, spec.bands, (x, y) => [32 + x * spec.radius, 32 + y * spec.radius], (b, cmd, a, bb, c, d) => {
    out[b] += cmd === 'M' ? `M${f(a)} ${f(bb)}` : `Q${f(a)} ${f(bb)} ${f(c!)} ${f(d!)}`;
  });
  return out; // index 0 = farthest band, last = nearest
}
