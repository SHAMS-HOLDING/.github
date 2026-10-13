// Renders banners, social image and avatar: node banners.mts (needs Playwright + Chromium).
// The ball is the same yarn simulation as the website hero, frozen at one angle.
import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { emptyLike, view, windYarn, YARN_STYLE } from './yarn.ts';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const here = (p: string) => new URL(p, import.meta.url);
const font = (pkg: string) => `data:font/woff2;base64,${readFileSync(require.resolve(pkg)).toString('base64')}`;

type Theme = { bg: string; ink: string; muted: string; yarnBack: string; yarnFront: string; red: string; glow: boolean };
const NIGHT: Theme = { bg: '#07070a', ink: '#F3EFE9', muted: '#8d8881', yarnBack: '150,143,134', yarnFront: '242,232,218', red: '#ff2d4a', glow: true };
const DAY: Theme = { bg: '#FAF8F5', ink: '#141414', muted: '#6b6762', yarnBack: '120,114,106', yarnFront: '60,56,52', red: '#C8102E', glow: false };

function ball(cx: number, cy: number, R: number, th: Theme, red: string) {
  const y = windYarn({ ...YARN_STYLE, wraps: 52, perWrap: 110 });
  const p = view(y, 0.6, 0.42, emptyLike(y));
  const B = 8, d = Array.from({ length: B }, () => '');
  const X = (i: number) => cx + p.x[i] * R, Y = (i: number) => cy + p.y[i] * R, f = (v: number) => v.toFixed(1);
  let band = -1;
  for (let i = 1; i < p.n - 1; i++) {
    const b = Math.min(B - 1, Math.max(0, Math.floor(((p.z[i] + 1) / 2) * B)));
    if (b !== band) { d[b] += `M${f((X(i - 1) + X(i)) / 2)} ${f((Y(i - 1) + Y(i)) / 2)}`; band = b; }
    d[b] += `Q${f(X(i))} ${f(Y(i))} ${f((X(i) + X(i + 1)) / 2)} ${f((Y(i) + Y(i + 1)) / 2)}`;
  }
  const BACK = [0.09, 0.15, 0.23, 0.33], FRONT = [0.34, 0.48, 0.64, 0.82], k = R / 240;
  let g = th.glow ? `<circle cx="${cx}" cy="${cy}" r="${R * 1.15}" fill="url(#sun)"/>` : '';
  for (let b = 0; b < 4; b++) g += `<path d="${d[b]}" stroke="rgba(${th.yarnBack},${BACK[b]})" stroke-width="${(0.7 + b * 0.07) * Math.max(k, 0.7)}"/>`;
  g += red;
  for (let j = 0; j < 4; j++) g += `<path d="${d[4 + j]}" stroke="${th.bg}" stroke-width="${(2.6 + j * 0.25) * Math.max(k, 0.7)}"/><path d="${d[4 + j]}" stroke="rgba(${th.yarnFront},${FRONT[j]})" stroke-width="${(0.85 + j * 0.18) * Math.max(k, 0.7)}"/>`;
  return g;
}

function page(W: number, H: number, th: Theme, transparent: boolean, layout: { fs: number; left: number; top: number; cx: number; cy: number; R: number }) {
  return `<!doctype html><html><head><style>
@font-face{font-family:Inter;src:url(${font('@fontsource-variable/inter/files/inter-latin-wght-normal.woff2')})}
@font-face{font-family:ISerif;src:url(${font('@fontsource/instrument-serif/files/instrument-serif-latin-400-normal.woff2')})}
body{margin:0}#b{width:${W}px;height:${H}px;position:relative;overflow:hidden;background:${transparent ? 'transparent' : th.bg};color:${th.ink};font-family:Inter}
h1{position:absolute;left:${layout.left}px;top:${layout.top}px;margin:0;font:400 ${layout.fs}px/1 ISerif;letter-spacing:-1px;z-index:2}
.dot{display:inline-block;width:.11em;height:.11em;border-radius:50%;background:${th.red};margin-left:.04em;${th.glow ? `box-shadow:0 0 18px ${th.red},0 0 46px rgba(255,45,74,.55)` : ''}}
p{position:absolute;left:${layout.left + 4}px;top:${layout.top + layout.fs * 1.18}px;margin:0;font-size:${Math.round(layout.fs * 0.15)}px;letter-spacing:.32em;text-transform:uppercase;z-index:2}
p span{color:${th.muted}} svg{position:absolute;inset:0}
</style></head><body><div id="b"><svg id="s" width="${W}" height="${H}"><defs><radialGradient id="sun"><stop offset="0" stop-color="rgba(255,150,95,.26)"/><stop offset=".4" stop-color="rgba(255,70,70,.12)"/><stop offset=".75" stop-color="rgba(255,45,74,.03)"/><stop offset="1" stop-color="rgba(0,0,0,0)"/></radialGradient></defs><g id="g" fill="none" stroke-linecap="round"></g></svg>
<h1>Der rote Faden<span class="dot"></span></h1><p><b>SHAMS</b> <span>Holding</span></p></div></body></html>`;
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
  const dot = await pg.evaluate(() => { const r = document.querySelector('.dot')!.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
  const { cx, cy, R } = j.L;
  // The thread leaves the full stop, runs into the centre of the ball and out the far side.
  const path = `M ${dot.x} ${dot.y} C ${dot.x + 120} ${dot.y} ${cx - R * 0.9} ${cy} ${cx} ${cy} S ${cx + R * 1.6} ${cy + R * 0.25} ${j.W + 10} ${cy + R * 0.3}`;
  const layers = j.th.glow ? [[16, 0.07], [6, 0.25], [2, 1]] : [[2.6, 1]];
  const red = layers.map(([w, o]) => `<path d="${path}" stroke="${j.th.red}" stroke-width="${w}" opacity="${o}"/>`).join('');
  await pg.evaluate((g) => { document.getElementById('g')!.innerHTML = g; }, ball(cx, cy, R, j.th, red));
  await pg.locator('#b').screenshot({ path: here(j.file).pathname, omitBackground: j.transparent });
  await pg.close();
}
// Avatar: the ball on the night background, thread entering left and leaving right.
const av = await browser.newPage({ viewport: { width: 512, height: 512 } });
const A = { cx: 256, cy: 256, R: 168 };
const avPath = `M -10 ${A.cy + 70} C 90 ${A.cy + 70} ${A.cx - 110} ${A.cy} ${A.cx} ${A.cy} S ${A.cx + 170} ${A.cy - 70} 522 ${A.cy - 70}`;
const avRed = [[16, 0.07], [6, 0.25], [2.4, 1]].map(([w, o]) => `<path d="${avPath}" stroke="${NIGHT.red}" stroke-width="${w}" opacity="${o}"/>`).join('');
await av.setContent(`<body style="margin:0;background:${NIGHT.bg}"><svg width="512" height="512"><defs><radialGradient id="sun"><stop offset="0" stop-color="rgba(255,150,95,.26)"/><stop offset=".4" stop-color="rgba(255,70,70,.12)"/><stop offset=".75" stop-color="rgba(255,45,74,.03)"/><stop offset="1" stop-color="rgba(0,0,0,0)"/></radialGradient></defs><g fill="none" stroke-linecap="round">${ball(A.cx, A.cy, A.R, NIGHT, avRed)}</g></svg></body>`);
await av.screenshot({ path: here('../png/shams-avatar-512.png').pathname });
await browser.close();
console.log('banners, og image and avatar written');
