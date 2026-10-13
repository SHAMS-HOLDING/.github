/**
 * Yarn: the simulation behind the SHAMS mark and the hero ball.
 *
 * One continuous thread is wound around a sphere the way a real ball of yarn is
 * wound: every wrap is (nearly) a great circle, the winding axis drifts a little
 * after each wrap, and later wraps lie slightly further out than earlier ones.
 * Where the grey yarn ends, the same thread carries on as the red one: it turns
 * red, winds a little further under the outer layers and finds its way out.
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

export type V3 = [number, number, number];
export type WindSpec = { wraps: number; perWrap: number; seed: number; grow: number; drift: number; lat: number };

// Where the thread lies after `s` wraps at base radius `base`: the yarn's own winding, seeded.
function winder({ seed, drift, lat }: WindSpec) {
  const rand = rng(seed);
  const na = smoothNoise(rand), nb = smoothNoise(rand), nc = smoothNoise(rand), nh = smoothNoise(rand);
  const wob = rand() * Math.PI * 2;
  return (s: number, base: number): V3 => {
    const th = 2 * Math.PI * s;
    // Axis drift per wrap (~25°), modulated by smooth noise so no two wraps repeat.
    const a = drift * (0.41 * s + 0.35 * na(s));
    const b = drift * (0.23 * s + 0.35 * nb(s));
    const c = drift * (0.13 * s + 0.25 * nc(s));
    // Wraps are not all great circles: some ride a little above or below the
    // equator (small circles), which is what makes a real ball look lumpy.
    const h = lat * nh(s * 1.7);
    const rho = Math.sqrt(1 - h * h);
    const r = base + 0.012 * Math.sin(5 * th + wob);
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
    return [px, py, pz];
  };
}

/**
 * The red part of the thread: how many more wraps it winds, the radius it settles
 * at (under the outer layers), where it leaves the ball (`exit`, a unit vector in
 * ball space) and how deep it turns towards that exit (0 = centre, 1 = surface).
 * `start` turns the whole ball so that the grey ends (and the red begins) in that
 * direction, heading towards `heading`, so the change of colour sits where it is seen.
 */
export type RedSpec = { wraps: number; radius: number; exit: V3; core: number; start?: V3; heading?: V3 };
/** A wound thread. Samples from `red` on are red; sample `red` is where the grey yarn ended. */
export type Thread = Yarn & { red: number };

const SINK = 0.3; // wraps over which the red slips from the surface down to its radius

/**
 * The whole thread. The grey yarn is wound first; at its last point the same thread
 * turns red and keeps winding, slipping under the outer layers. Then it dives towards
 * the core and leaves the ball along `exit`, ending exactly on the surface with its
 * tangent pointing straight out, so whatever continues it outside meets it smoothly.
 */
export function windThread(yarn: WindSpec, { wraps, radius, exit, core, start, heading }: RedSpec): Thread {
  const at = winder(yarn);
  const P = yarn.perWrap, nG = Math.round(yarn.wraps * P);
  const base = (s: number) => 1 - yarn.grow + yarn.grow * (s / yarn.wraps);
  const pts: V3[] = [];
  for (let i = 0; i <= nG; i++) pts.push(at(i / P, base(i / P)));

  // 1. Past the grey's end the thread keeps winding, sinking from the surface to `radius`.
  const s0 = nG / P, b0 = base(s0), nW = Math.round(wraps * P);
  for (let i = 1; i <= nW; i++) {
    const u = Math.min(1, i / P / SINK), e = u * u * (3 - 2 * u);
    pts.push(at(s0 + i / P, b0 + (radius - b0) * e));
  }

  if (start) orient(pts, nG, start, heading);

  // 2. Dive: a cubic from there (keeping its direction) to the turn at exit·core.
  const P0 = pts[pts.length - 1], Pm = pts[pts.length - 2];
  const tl = Math.hypot(P0[0] - Pm[0], P0[1] - Pm[1], P0[2] - Pm[2]);
  const T: V3 = [(P0[0] - Pm[0]) / tl, (P0[1] - Pm[1]) / tl, (P0[2] - Pm[2]) / tl];
  const A: V3 = [exit[0] * core, exit[1] * core, exit[2] * core];
  const C1: V3 = [P0[0] + T[0] * 0.38, P0[1] + T[1] * 0.38, P0[2] + T[2] * 0.38];
  const C2: V3 = [A[0] - exit[0] * 0.32, A[1] - exit[1] * 0.32, A[2] - exit[2] * 0.32];
  const nD = Math.round(P * 0.45);
  for (let i = 1; i <= nD; i++) {
    const u = i / nD, v = 1 - u;
    const w0 = v * v * v, w1 = 3 * v * v * u, w2 = 3 * v * u * u, w3 = u * u * u;
    pts.push([0, 1, 2].map((j) => w0 * P0[j] + w1 * C1[j] + w2 * C2[j] + w3 * A[j]) as V3);
  }

  // 3. Out along the exit axis to the surface.
  const nA = Math.max(2, Math.round(P * 0.18));
  for (let i = 1; i <= nA; i++) {
    const r = core + ((1 - core) * i) / nA;
    pts.push([exit[0] * r, exit[1] * r, exit[2] * r]);
  }
  return {
    x: Float32Array.from(pts, (p) => p[0]), y: Float32Array.from(pts, (p) => p[1]), z: Float32Array.from(pts, (p) => p[2]),
    n: pts.length, red: nG,
  };
}

const unit = (v: V3): V3 => { const l = Math.hypot(...v); return [v[0] / l, v[1] / l, v[2] / l]; };
const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];

// Rotates every point in place around unit axis `k` by `angle` (Rodrigues).
function rotate(pts: V3[], k: V3, angle: number) {
  const cos = Math.cos(angle), sin = Math.sin(angle);
  for (const p of pts) {
    const kp = dot(k, p), c = cross(k, p);
    for (let j = 0; j < 3; j++) p[j] = p[j] * cos + c[j] * sin + k[j] * kp * (1 - cos);
  }
}

// Turns the ball so that point `pts[i]` lies in direction `start` and the thread
// there runs towards `heading` (as far as the surface allows).
function orient(pts: V3[], i: number, start: V3, heading?: V3) {
  const a = unit(pts[i]), b = unit(start), axis = cross(a, b);
  if (Math.hypot(...axis) > 1e-9) rotate(pts, unit(axis), Math.acos(Math.max(-1, Math.min(1, dot(a, b)))));
  if (!heading) return;
  // Twist around `start` until the thread's direction there matches the heading.
  const t: V3 = [pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1], pts[i][2] - pts[i - 1][2]];
  const flat = (v: V3): V3 => { const d = dot(v, b); return [v[0] - b[0] * d, v[1] - b[1] * d, v[2] - b[2] * d]; };
  const tp = flat(t), hp = flat(heading);
  rotate(pts, b, Math.atan2(dot(b, cross(tp, hp)), dot(tp, hp)));
}

/** Where grey turns red: over how much thread (in wraps) and in how many colour steps, by default. */
export const IGNITE = { wraps: 0.12, steps: 4 };

/** The part of the thread sample `k` belongs to: 0 = grey, 1..steps = turning red, steps + 1 = red. */
export function partOf(k: number, red: number, perWrap: number, steps = IGNITE.steps, wraps = IGNITE.wraps) {
  if (k < red) return 0;
  const n = Math.max(steps, Math.round(wraps * perWrap));
  return k < red + n ? 1 + Math.floor(((k - red) * steps) / n) : steps + 1;
}

/** Depth band of a point: 0 = farthest back. */
export const bandOf = (z: number, bands: number) => Math.min(bands - 1, Math.max(0, Math.floor(((z + 1) / 2) * bands)));

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
 * Splits the projected thread into smooth runs: a new run starts wherever `key`
 * changes (depth band, grey or red). Pieces run from midpoint to midpoint with the
 * sample as control point, so the curve is C1-continuous and consecutive runs meet
 * exactly. `sink` receives (key, 'M' | 'Q', ...coords).
 */
export function traceRuns(
  p: Yarn, key: (k: number) => number, project: (x: number, y: number) => [number, number],
  sink: (key: number, cmd: 'M' | 'Q', a: number, b: number, c?: number, d?: number) => void,
) {
  let cur = -1;
  let [ax, ay] = project(p.x[0], p.y[0]);
  let [bx, by] = project(p.x[1], p.y[1]);
  for (let k = 1; k < p.n - 1; k++) {
    const [cx, cy] = project(p.x[k + 1], p.y[k + 1]);
    const kk = key(k);
    if (kk !== cur) {
      sink(kk, 'M', (ax + bx) / 2, (ay + by) / 2);
      cur = kk;
    }
    sink(kk, 'Q', bx, by, (bx + cx) / 2, (by + cy) / 2);
    ax = bx; ay = by; bx = cx; by = cy;
  }
}

/** The look of the ball: how far the axis drifts per wrap, how far wraps leave the equator, how much the ball grows. */
export const YARN_STYLE = { drift: 1.6, lat: 0.35, grow: 0.22, seed: 8 };

/**
 * The red fibre in a still image: where the grey ends and the red begins (`start`),
 * how many wraps it winds on, and where it leaves the ball (`exit`). Both are
 * directions on screen: x right, y down, z towards the viewer.
 */
export type StillRed = { wraps: number; start: V3; heading?: V3; exit: V3; core: number; ignite?: number };
export type BallSpec = { wraps: number; perWrap: number; yaw: number; pitch: number; bands: number; red: StillRed };

const f1 = (v: number) => (Math.round(v * 10) / 10).toString();

/**
 * The ball frozen at one angle, as SVG path data: `parts[0]` is the grey yarn,
 * `parts[1..IGNITE.steps]` the stretch where it turns red, `parts[steps + 1]` the red
 * fibre, each split into depth bands (index 0 = farthest). `out` finishes the fibre
 * to the surface; `exit` is that point and `dir` the way it heads out on screen, so a
 * tail drawn from there continues it without a kink.
 */
export function stillBall(spec: BallSpec, cx: number, cy: number, R: number) {
  const proj = (x: number, y: number): [number, number] => [cx + x * R, cy + y * R];
  const ball = (v: V3) => { const l = Math.hypot(...v); return unview([v[0] / l, v[1] / l, v[2] / l], spec.yaw, spec.pitch); };
  const thread = windThread(
    { ...YARN_STYLE, wraps: spec.wraps, perWrap: spec.perWrap },
    {
      wraps: spec.red.wraps, radius: 0.9, exit: ball(spec.red.exit), core: spec.red.core,
      start: ball(spec.red.start), heading: spec.red.heading && ball(spec.red.heading),
    },
  );
  const q = view(thread, spec.yaw, spec.pitch, emptyLike(thread));
  const B = spec.bands, S = IGNITE.steps;
  const parts = Array.from({ length: S + 2 }, () => Array.from({ length: B }, () => ''));
  const part = (k: number) => partOf(k, thread.red, spec.perWrap, S, spec.red.ignite);
  traceRuns(q, (k) => part(k) * B + bandOf(q.z[k], B), proj, (key, cmd, a, b, c, d) => {
    parts[Math.floor(key / B)][key % B] += cmd === 'M' ? `M${f1(a)} ${f1(b)}` : `Q${f1(a)} ${f1(b)} ${f1(c!)} ${f1(d!)}`;
  });
  const n = q.n - 1, l = Math.hypot(q.x[n], q.y[n]);
  const [mx, my] = proj((q.x[n - 1] + q.x[n]) / 2, (q.y[n - 1] + q.y[n]) / 2);
  const [ex, ey] = proj(q.x[n], q.y[n]);
  return {
    parts,
    out: `M${f1(mx)} ${f1(my)}L${f1(ex)} ${f1(ey)}`,
    exit: [ex, ey] as [number, number],
    dir: [q.x[n] / l, q.y[n] / l] as [number, number],
  };
}

/** Static mark geometry (used by the logo component and the brand generator), on a 64 × 64 grid. */
export type MarkSpec = BallSpec & { radius: number; cx: number };
// The grey turns red at the upper left, heading up and over to the right; the red leaves to the right.
const MARK_RED = { start: [-0.7, -0.45, 0.55] as V3, heading: [1, -0.45, 0] as V3, exit: [0.92, -0.22, 0.32] as V3, core: 0.45 };
export const MARK_FULL: MarkSpec = { wraps: 30, perWrap: 48, yaw: 0.6, pitch: 0.42, radius: 22.5, bands: 6, cx: 30, red: { ...MARK_RED, wraps: 0.8 } };
export const MARK_SMALL: MarkSpec = { wraps: 7, perWrap: 36, yaw: 0.6, pitch: 0.42, radius: 23.5, bands: 4, cx: 30, red: { ...MARK_RED, wraps: 0.65 } };

/** The mark: the ball's parts (see `stillBall`) and the red tail that leaves it and runs off the right edge. */
export function markPaths(spec: MarkSpec) {
  const b = stillBall(spec, spec.cx, 32, spec.radius);
  const [ex, ey] = b.exit, [dx, dy] = b.dir;
  return { parts: b.parts, tail: `${b.out}C${f1(ex + dx * 5)} ${f1(ey + dy * 5)} 58 24 66 24` };
}

/** Mixes two #rrggbb colours: u = 0 gives a, 1 gives b. */
export function mixHex(a: string, b: string, u: number) {
  const c = (h: string, i: number) => parseInt(h.slice(1 + 2 * i, 3 + 2 * i), 16);
  return '#' + [0, 1, 2].map((i) => Math.round(c(a, i) + (c(b, i) - c(a, i)) * u).toString(16).padStart(2, '0')).join('');
}
