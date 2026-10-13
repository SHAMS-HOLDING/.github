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

export type V3 = [number, number, number];

/**
 * The red thread: one more fibre wound into the ball among the others. After its
 * wraps it dives towards the core, turns, and leaves the ball along `exit` (a unit
 * vector in ball space). The strand ends exactly on the surface at `exit` with its
 * tangent pointing straight out, so whatever continues it outside meets it smoothly.
 * `core` is how deep the turn lies (0 = centre, 1 = surface).
 */
export type StrandSpec = { wraps: number; perWrap: number; seed: number; radius: number; exit: V3; core: number };

export function redStrand({ wraps, perWrap, seed, radius, exit, core }: StrandSpec): Yarn {
  const rand = rng(seed);
  const na = smoothNoise(rand), nb = smoothNoise(rand), nc = smoothNoise(rand), nh = smoothNoise(rand);
  const [a0, b0, c0] = [rand(), rand(), rand()].map((v) => v * Math.PI * 2);
  const xs: number[] = [], ys: number[] = [], zs: number[] = [];
  const push = (x: number, y: number, z: number) => { xs.push(x); ys.push(y); zs.push(z); };

  // 1. Wound like every other fibre (same drift and latitude as YARN_STYLE).
  const nW = Math.round(wraps * perWrap);
  for (let i = 0; i <= nW; i++) {
    const s = i / perWrap, th = 2 * Math.PI * s;
    const a = a0 + 1.6 * (0.41 * s + 0.35 * na(s));
    const b = b0 + 1.6 * (0.23 * s + 0.35 * nb(s));
    const c = c0 + 1.6 * (0.13 * s + 0.25 * nc(s));
    const h = 0.3 * nh(s * 1.7), rho = Math.sqrt(1 - h * h);
    let px = Math.cos(th) * rho * radius, py = Math.sin(th) * rho * radius, pz = h * radius;
    let t = py * Math.cos(a) - pz * Math.sin(a);
    pz = py * Math.sin(a) + pz * Math.cos(a);
    py = t;
    t = px * Math.cos(b) + pz * Math.sin(b);
    pz = -px * Math.sin(b) + pz * Math.cos(b);
    px = t;
    t = px * Math.cos(c) - py * Math.sin(c);
    py = px * Math.sin(c) + py * Math.cos(c);
    px = t;
    push(px, py, pz);
  }

  // 2. Dive: a cubic from the last wrap (keeping its direction) to the turn at exit·core.
  const k = xs.length - 1;
  const P0: V3 = [xs[k], ys[k], zs[k]];
  let T: V3 = [xs[k] - xs[k - 1], ys[k] - ys[k - 1], zs[k] - zs[k - 1]];
  const tl = Math.hypot(...T);
  T = [T[0] / tl, T[1] / tl, T[2] / tl];
  const A: V3 = [exit[0] * core, exit[1] * core, exit[2] * core];
  const C1: V3 = [P0[0] + T[0] * 0.38, P0[1] + T[1] * 0.38, P0[2] + T[2] * 0.38];
  const C2: V3 = [A[0] - exit[0] * 0.32, A[1] - exit[1] * 0.32, A[2] - exit[2] * 0.32];
  const nD = Math.round(perWrap * 0.45);
  for (let i = 1; i <= nD; i++) {
    const u = i / nD, v = 1 - u;
    const w0 = v * v * v, w1 = 3 * v * v * u, w2 = 3 * v * u * u, w3 = u * u * u;
    push(
      w0 * P0[0] + w1 * C1[0] + w2 * C2[0] + w3 * A[0],
      w0 * P0[1] + w1 * C1[1] + w2 * C2[1] + w3 * A[1],
      w0 * P0[2] + w1 * C1[2] + w2 * C2[2] + w3 * A[2],
    );
  }

  // 3. Out along the exit axis to the surface.
  const nA = Math.max(2, Math.round(perWrap * 0.18));
  for (let i = 1; i <= nA; i++) {
    const r = core + ((1 - core) * i) / nA;
    push(exit[0] * r, exit[1] * r, exit[2] * r);
  }
  return { x: Float32Array.from(xs), y: Float32Array.from(ys), z: Float32Array.from(zs), n: xs.length };
}

/** The ball-space direction that `view(…, yaw, pitch)` turns into the screen direction `v`. */
export function unview([x, y, z]: V3, yaw: number, pitch: number): V3 {
  const cp = Math.cos(pitch), sp = Math.sin(pitch), cy = Math.cos(yaw), sy = Math.sin(yaw);
  const y1 = y * cp + z * sp, z1 = -y * sp + z * cp;
  return [x * cy - z1 * sy, y1, x * sy + z1 * cy];
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

/** The look of the ball: how far the axis drifts per wrap, how far wraps leave the equator, how much the ball grows. */
export const YARN_STYLE = { drift: 1.6, lat: 0.35, grow: 0.22, seed: 8 };

/** The red fibre in a still image: `wraps` wound in, then out of the ball along `exit`, a direction on screen (x right, y down, z towards the viewer). */
export type RedSpec = { wraps: number; seed: number; exit: V3; core: number };
export type BallSpec = { wraps: number; perWrap: number; yaw: number; pitch: number; bands: number; red: RedSpec };

const f1 = (v: number) => (Math.round(v * 10) / 10).toString();

/**
 * The ball frozen at one angle, as SVG path data per depth band (index 0 = farthest):
 * the grey yarn, the red fibre wound in among it, and where the fibre leaves the ball.
 * `out` finishes the fibre to the surface; `exit` is that point and `dir` the way it
 * heads out on screen, so a tail drawn from there continues it without a kink.
 */
export function stillBall(spec: BallSpec, cx: number, cy: number, R: number) {
  const proj = (x: number, y: number): [number, number] => [cx + x * R, cy + y * R];
  const paths = (p: Yarn) => {
    const out = Array.from({ length: spec.bands }, () => '');
    traceBands(p, spec.bands, proj, (b, cmd, a, bb, c, d) => {
      out[b] += cmd === 'M' ? `M${f1(a)} ${f1(bb)}` : `Q${f1(a)} ${f1(bb)} ${f1(c!)} ${f1(d!)}`;
    });
    return out;
  };
  const yarn = windYarn({ ...YARN_STYLE, wraps: spec.wraps, perWrap: spec.perWrap });
  const e = spec.red.exit, el = Math.hypot(...e);
  const exit = unview([e[0] / el, e[1] / el, e[2] / el], spec.yaw, spec.pitch);
  const strand = redStrand({ wraps: spec.red.wraps, perWrap: spec.perWrap, seed: spec.red.seed, radius: 0.9, exit, core: spec.red.core });
  const q = view(strand, spec.yaw, spec.pitch, emptyLike(strand));
  const n = q.n - 1, l = Math.hypot(q.x[n], q.y[n]);
  const [mx, my] = proj((q.x[n - 1] + q.x[n]) / 2, (q.y[n - 1] + q.y[n]) / 2);
  const [ex, ey] = proj(q.x[n], q.y[n]);
  return {
    grey: paths(view(yarn, spec.yaw, spec.pitch, emptyLike(yarn))),
    red: paths(q),
    out: `M${f1(mx)} ${f1(my)}L${f1(ex)} ${f1(ey)}`,
    exit: [ex, ey] as [number, number],
    dir: [q.x[n] / l, q.y[n] / l] as [number, number],
  };
}

/** Static mark geometry (used by the logo component and the brand generator), on a 64 × 64 grid. */
export type MarkSpec = BallSpec & { radius: number; cx: number };
const MARK_RED_FIBRE = { seed: 11, exit: [0.92, -0.22, 0.32] as V3, core: 0.45 };
export const MARK_FULL: MarkSpec = { wraps: 30, perWrap: 48, yaw: 0.6, pitch: 0.42, radius: 22.5, bands: 6, cx: 30, red: { ...MARK_RED_FIBRE, wraps: 1.25 } };
export const MARK_SMALL: MarkSpec = { wraps: 7, perWrap: 36, yaw: 0.6, pitch: 0.42, radius: 23.5, bands: 4, cx: 30, red: { ...MARK_RED_FIBRE, wraps: 0.75 } };

/** The mark: grey and red bands, and the red tail that leaves the ball and runs off the right edge. */
export function markPaths(spec: MarkSpec) {
  const b = stillBall(spec, spec.cx, 32, spec.radius);
  const [ex, ey] = b.exit, [dx, dy] = b.dir;
  return { grey: b.grey, red: b.red, tail: `${b.out}C${f1(ex + dx * 5)} ${f1(ey + dy * 5)} 58 24 66 24` };
}
