// Renders banners, social image and avatar: node banners.mts (needs Playwright + Chromium).
// The ball is the same yarn simulation as the website hero, frozen at one angle, with the
// red thread wound in as one of its fibres; it finds its way out and leaves the frame.
import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { stillBall, type BallSpec } from './yarn.ts';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const here = (p: string) => new URL(p, import.meta.url);
const font = (pkg: string) => `data:font/woff2;base64,${readFileSync(require.resolve(pkg)).toString('base64')}`;

type Theme = { bg: string; ink: string; muted: string; yarnBack: string; yarnFront: string; red: string; glow: boolean };
const NIGHT: Theme = { bg: '#07070a', ink: '#F3EFE9', muted: '#8d8881', yarnBack: '150,143,134', yarnFront: '242,232,218', red: '#ff2d4a', glow: true };
const DAY: Theme = { bg: '#FAF8F5', ink: '#141414', muted: '#6b6762', yarnBack: '120,114,106', yarnFront: '60,56,52', red: '#C8102E', glow: false };

const BALL: BallSpec = { wraps: 52, perWrap: 110, yaw: 0.6, pitch: 0.42, bands: 8, red: { wraps: 2.25, seed: 11, exit: [0.92, -0.22, 0.32], core: 0.42 } };
const GREY = [0.09, 0.15, 0.23, 0.33, 0.34, 0.48, 0.64, 0.82];

// The ball, back to front by depth band, the red fibre woven in among the grey ones;
// then its tail, which leaves the ball, levels out and runs off the frame at endX.
function ball(cx: number, cy: number, R: number, th: Theme, endX: number) {
  const { grey, red, out, exit: [ex, ey], dir: [dx, dy] } = stillBall(BALL, cx, cy, R);
  const s = Math.max(R / 240, 0.7), f = (v: number) => v.toFixed(1);
  const L = endX - ex, ty = ey + (dy / dx) * L * 0.5;
  const tail = `${out}C${f(ex + (dx * L) / 3)} ${f(ey + (dy * L) / 3)} ${f(endX - L / 3)} ${f(ty)} ${f(endX)} ${f(ty)}`;
  const rw = th.glow ? 2 : 2.6;
  const path = (d: string, stroke: string, w: number, extra = '') => `<path d="${d}" stroke="${stroke}" stroke-width="${w.toFixed(2)}"${extra}/>`;
  let g = th.glow ? `<circle cx="${cx}" cy="${cy}" r="${R * 1.15}" fill="url(#sun)"/>` : '';
  for (let b = 0; b < 8; b++) {
    const front = b >= 4;
    if (front) g += path(grey[b], th.bg, (2.6 + (b - 4) * 0.25) * s);
    g += path(grey[b], `rgba(${front ? th.yarnFront : th.yarnBack},${GREY[b]})`, (front ? 0.85 + (b - 4) * 0.18 : 0.7 + b * 0.07) * s);
    if (!red[b]) continue;
    if (!front) { g += path(red[b], th.red, rw * 0.8, ` opacity="${(0.3 + 0.15 * b).toFixed(2)}"`); continue; }
    g += path(red[b], th.bg, rw + 2.4);
    if (th.glow) g += path(red[b], th.red, 12, ' opacity="0.05"') + path(red[b], th.red, 4.5, ' opacity="0.2"');
    g += path(red[b], th.red, rw);
  }
  // Butt cap on the halo: a round one would reach back over the fibre the tail continues.
  g += path(tail, th.bg, rw + 2.4, ' stroke-linecap="butt"');
  if (th.glow) g += path(tail, th.red, 14, ' opacity="0.07"') + path(tail, th.red, 5, ' opacity="0.25"');
  return g + path(tail, th.red, rw);
}

function page(W: number, H: number, th: Theme, transparent: boolean, layout: { fs: number; left: number; top: number; cx: number; cy: number; R: number }) {
  return `<!doctype html><html><head><style>
@font-face{font-family:Inter;src:url(${font('@fontsource-variable/inter/files/inter-latin-wght-normal.woff2')})}
@font-face{font-family:ISerif;src:url(${font('@fontsource/instrument-serif/files/instrument-serif-latin-400-normal.woff2')})}
body{margin:0}#b{width:${W}px;height:${H}px;position:relative;overflow:hidden;background:${transparent ? 'transparent' : th.bg};color:${th.ink};font-family:Inter}
h1{position:absolute;left:${layout.left}px;top:${layout.top}px;margin:0;font:400 ${layout.fs}px/1 ISerif;letter-spacing:-1px;z-index:2}
p{position:absolute;left:${layout.left + 4}px;top:${layout.top + layout.fs * 1.18}px;margin:0;font-size:${Math.round(layout.fs * 0.15)}px;letter-spacing:.32em;text-transform:uppercase;z-index:2}
p span{color:${th.muted}} svg{position:absolute;inset:0}
</style></head><body><div id="b"><svg id="s" width="${W}" height="${H}"><defs><radialGradient id="sun"><stop offset="0" stop-color="rgba(255,150,95,.26)"/><stop offset=".4" stop-color="rgba(255,70,70,.12)"/><stop offset=".75" stop-color="rgba(255,45,74,.03)"/><stop offset="1" stop-color="rgba(0,0,0,0)"/></radialGradient></defs><g id="g" fill="none" stroke-linecap="round" stroke-linejoin="round"></g></svg>
<h1>Der rote Faden.</h1><p><b>SHAMS</b> <span>Holding</span></p></div></body></html>`;
}

const jobs = [
  { file: '../web/shams-banner-ondark.png', W: 1600, H: 400, th: NIGHT, transparent: false, L: { fs: 128, left: 110, top: 104, cx: 1270, cy: 200, R: 150 } },
  { file: '../web/shams-banner-transparent.png', W: 1600, H: 400, th: NIGHT, transparent: true, L: { fs: 128, left: 110, top: 104, cx: 1270, cy: 200, R: 150 } },
  { file: '../web/shams-banner-onlight.png', W: 1600, H: 400, th: DAY, transparent: false, L: { fs: 128, left: 110, top: 104, cx: 1270, cy: 200, R: 150 } },
  { file: '../web/shams-banner-transparent-onlight.png', W: 1600, H: 400, th: DAY, transparent: true, L: { fs: 128, left: 110, top: 104, cx: 1270, cy: 200, R: 150 } },
  { file: '../web/shams-og-1200x630.png', W: 1200, H: 630, th: NIGHT, transparent: false, L: { fs: 112, left: 80, top: 236, cx: 930, cy: 300, R: 190 } },
];

const browser = await chromium.launch();
for (const j of jobs) {
  const pg = await browser.newPage({ viewport: { width: j.W, height: j.H } });
  await pg.setContent(page(j.W, j.H, j.th, j.transparent, j.L));
  await pg.evaluate(() => document.fonts.ready);
  await pg.evaluate((g) => { document.getElementById('g')!.innerHTML = g; }, ball(j.L.cx, j.L.cy, j.L.R, j.th, j.W + 10));
  await pg.locator('#b').screenshot({ path: here(j.file).pathname, omitBackground: j.transparent });
  await pg.close();
}
// Avatar: the ball on the night background, the red fibre leaving it to the right.
const av = await browser.newPage({ viewport: { width: 512, height: 512 } });
const A = { cx: 248, cy: 262, R: 168 };
await av.setContent(`<body style="margin:0;background:${NIGHT.bg}"><svg width="512" height="512"><defs><radialGradient id="sun"><stop offset="0" stop-color="rgba(255,150,95,.26)"/><stop offset=".4" stop-color="rgba(255,70,70,.12)"/><stop offset=".75" stop-color="rgba(255,45,74,.03)"/><stop offset="1" stop-color="rgba(0,0,0,0)"/></radialGradient></defs><g fill="none" stroke-linecap="round" stroke-linejoin="round">${ball(A.cx, A.cy, A.R, NIGHT, 522)}</g></svg></body>`);
await av.screenshot({ path: here('../png/shams-avatar-512.png').pathname });
await browser.close();
console.log('banners, og image and avatar written');
