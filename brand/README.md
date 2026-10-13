# SHAMS Holding brand

**Motif:** *der rote Faden*. A tangle of grey threads (complexity, the market, the noise) with one red thread running cleanly through it (clarity, the holding's line). Half the grey loops pass under the red thread and half over it, so it reads as woven, not pasted on.

| Token | Value | Use |
| --- | --- | --- |
| Background | `#07070A` | Surfaces (dark is the primary theme) |
| Ink | `#F3EFE9` | Text |
| Muted | `#8D8881` | Secondary text |
| Tangle | `#6E6A64` | Grey threads |
| Red (neon) | `#FF2D4A` | The thread on dark, with glow |
| Red (print) | `#C8102E` | The thread on light backgrounds |

**Type:** Instrument Serif (headlines), Inter (text, wordmark). Both SIL OFL, self-hosted.

**Rules**
- Red belongs to the thread. One red line per view, never decoration.
- On dark the thread glows (three stacked strokes: wide 7 %, medium 25 %, core 100 %). On light it never glows.
- The thread never cuts through text.
- Motion is slow and purposeful: the thread draws, light travels along it, the tangle breathes.

| File | Use |
| --- | --- |
| `svg/shams-mark-ondark.svg` / `-onlight.svg` | Mark, 48 px and larger |
| `svg/shams-mark-small-ondark.svg` | Mark below 48 px (4 loops, thicker strokes) |
| `png/shams-avatar-512.png` | GitHub org and social avatar |
| `web/shams-banner-*.png` | GitHub profile, headers (1600×400) |
| `web/shams-og-1200x630.png` | Social preview |
| `generator/` | Reproducible source: `node emit.mjs` regenerates the marks (seed 8), `banner2.cjs` the banners |
