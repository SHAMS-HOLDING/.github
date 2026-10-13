const { chromium } = require('playwright'); const fs = require('fs');
const tpl = fs.readFileSync('/home/claude/banner2.html', 'utf8');
const D = '/home/claude/shams/.github/brand/web';
const jobs = [
  { name: 'shams-banner-ondark', W: 1600, H: 400, bg: '#07070a', ink: '#F3EFE9', tangle: '#6e6a64', red: '#ff2d4a', glow: true, fs: 132, L: 120, T: 92, T2: 262 },
  { name: 'shams-banner-transparent', W: 1600, H: 400, bg: 'transparent', ink: '#F3EFE9', tangle: '#6e6a64', red: '#ff2d4a', glow: true, fs: 132, L: 120, T: 92, T2: 262, transp: true },
  { name: 'shams-banner-onlight', W: 1600, H: 400, bg: '#FAF8F5', ink: '#141414', tangle: '#b5afa6', red: '#C8102E', glow: false, fs: 132, L: 120, T: 92, T2: 262 },
  { name: 'shams-banner-transparent-onlight', W: 1600, H: 400, bg: 'transparent', ink: '#141414', tangle: '#b5afa6', red: '#C8102E', glow: false, fs: 132, L: 120, T: 92, T2: 262, transp: true },
  { name: 'shams-og-1200x630', W: 1200, H: 630, bg: '#07070a', ink: '#F3EFE9', tangle: '#6e6a64', red: '#ff2d4a', glow: true, fs: 120, L: 90, T: 220, T2: 380 },
];
(async () => {
  const b = await chromium.launch();
  for (const j of jobs) {
    const html = tpl.replaceAll('__W__', j.W).replaceAll('__H__', j.H).replace('__BG__', j.bg).replace('__INK__', j.ink)
      .replace('__FS__', j.fs).replace('__L__', j.L).replace('__L2__', j.L + 4).replace('__T__', j.T).replace('__T2__', j.T2)
      .replace('__DOTGLOW__', j.glow ? '0 0 18px #ff2d4a, 0 0 46px rgba(255,45,74,.55)' : 'none');
    const p = await b.newPage({ viewport: { width: j.W, height: j.H } });
    await p.setContent(html);
    await p.evaluate(() => document.fonts.ready);
    await p.evaluate((j) => {
      const ns = 'http://www.w3.org/2000/svg';
      const d = document.querySelector('.dot').getBoundingClientRect();
      const dx = d.left + d.width / 2, dy = d.top + d.height / 2;
      const S = j.H * (j.W > j.H * 2 ? 0.78 : 0.62) / 50, cx = j.W - (j.W > j.H * 2 ? 330 : 250), cy = j.H * (j.W > j.H * 2 ? 0.42 : 0.33);
      const tg = document.getElementById('tg');
      tg.setAttribute('transform', `translate(${cx - 32 * S} ${cy - 32 * S}) scale(${S})`);
      for (const t of window.TANGLE) { const e = document.createElementNS(ns, 'path'); e.setAttribute('d', t); e.setAttribute('stroke', j.tangle); e.setAttribute('stroke-width', 1.2 / S * 1.3); e.setAttribute('opacity', '.7'); tg.appendChild(e); }
      const path = `M ${j.W + 10} ${cy - 60} C ${cx + 160} ${cy - 60} ${cx + 60} ${cy} ${cx} ${cy} C ${cx - 140} ${cy} ${dx} ${dy - 140} ${dx} ${dy}`;
      const red = document.getElementById('red');
      const layers = j.glow ? [[16, .07], [6, .25], [2, 1]] : [[2.4, 1]];
      for (const [w, o] of layers) { const e = document.createElementNS(ns, 'path'); e.setAttribute('d', path); e.setAttribute('stroke', j.red); e.setAttribute('stroke-width', w); e.setAttribute('opacity', o); red.appendChild(e); }
      if (!j.glow) document.querySelector('.dot').style.background = j.red;
    }, j);
    await p.locator('#b').screenshot({ path: `${D}/${j.name}.png`, omitBackground: !!j.transp });
    await p.close();
  }
  await b.close();
})();
