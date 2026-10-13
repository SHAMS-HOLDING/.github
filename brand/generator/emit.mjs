import { writeFileSync, mkdirSync } from 'node:fs';
import { tangle } from './gen.mjs';
import { mark } from './gen2.mjs';
const full = tangle(8, { loops: 9, pts: 6, r: 23 });
const small = tangle(8, { loops: 4, pts: 6, r: 24 });
const red = 'M2 41 C14 41 21 37 32 32 C43 27 50 23 62 23';
writeFileSync('/home/claude/shams/website/src/brand/mark.ts',
`// Generated from the brand generator (seed 8). A tangle of threads, one red thread through it.
export const RED_THREAD = '${red}';
export const TANGLE_FULL = ${JSON.stringify(full, null, 2)};
export const TANGLE_SMALL = ${JSON.stringify(small, null, 2)};
`);
const out = '/home/claude/shams/.github/brand/svg';
const variants = {
  'shams-mark-ondark': mark(8, { bg: '#07070a', r: 23, gw: 0.8, rw: 2.2 }),
  'shams-mark-onlight': mark(8, { bg: '#FAF8F5', grey: '#9C968E', redC: '#C8102E', r: 23, gw: 0.8, rw: 2.2 }),
  'shams-mark-small-ondark': mark(8, { bg: '#07070a', loops: 4, gw: 2, rw: 4.4, r: 24 }),
};
for (const [k, v] of Object.entries(variants)) writeFileSync(`${out}/${k}.svg`, v);
// favicon: rounded dark tile
const fav = mark(8, { bg: '#07070a', loops: 4, gw: 2.2, rw: 5, r: 24 }).replace('<g', '<rect width="64" height="64" rx="14" fill="#07070a"/><g');
writeFileSync('/home/claude/shams/website/public/favicon.svg', fav);
