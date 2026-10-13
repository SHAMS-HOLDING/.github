# SHAMS Holding brand

**Motif:** *der rote Faden*. A ball of wound threads, and one red thread running cleanly through it.

- The ball is the tangle: complexity, the market, the noise. It is also the sun: *shams* (شمس) is Arabic for sun.
- The red thread is the holding's line through it: clarity, continuity, leverage.

**The mark is simulated, not drawn.** `generator/yarn.ts` winds one continuous thread around a sphere the way real yarn is wound: each wrap is nearly a great circle, the winding axis drifts after every wrap, some wraps ride above or below the equator, and later wraps lie further out. The curve is parametric, so it stays smooth at any size, and it lives in 3D, so every crossing has a true front and back. Threads in front of the red thread are drawn over it with a background-coloured halo, threads behind it under it: the red thread is woven in, not pasted on. The website hero runs the same simulation live.

| Token | Value | Use |
| --- | --- | --- |
| Background | `#07070A` | Surfaces (dark is the primary theme) |
| Ink | `#F3EFE9` | Text |
| Muted | `#8D8881` | Secondary text |
| Yarn | `#C9C2B8` on dark, `#4F4A44` on light | The ball |
| Red (neon) | `#FF2D4A` | The thread on dark, with glow |
| Red (print) | `#C8102E` | The thread on light backgrounds |
| Sun | `rgba(255,150,95,.26)` → transparent | Warm core glow behind the ball, dark only |

**Type:** Instrument Serif (headlines), Inter (text, wordmark), Reem Kufi (Arabic). All SIL OFL, self-hosted.

**Rules**
- Red belongs to the thread. One red line per view, never decoration.
- On dark the thread glows (three stacked strokes: wide 7 %, medium 25 %, core 100 %). On light it never glows.
- The thread never cuts through text.
- Motion is slow and purposeful: the ball winds itself, turns, follows the cursor; light travels along the thread.

| File | Use |
| --- | --- |
| `svg/shams-mark-ondark.svg` / `-onlight.svg` | Mark, 48 px and larger (30 wraps) |
| `svg/shams-mark-small-*.svg` | Mark below 48 px (7 wraps, thicker strokes) |
| `svg/shams-favicon.svg` | Favicon tile |
| `png/shams-avatar-512.png` | GitHub org and social avatar |
| `web/shams-banner-*.png` | GitHub profile, headers (1600×400) |
| `web/shams-og-1200x630.png` | Social preview |

## Regenerate

```bash
cd generator
node marks.mts                 # SVG marks + favicon (Node 22.18+)
NODE_PATH=<website>/node_modules:$(npm root -g) node banners.mts   # PNGs, needs Playwright + Chromium
```
Keep `generator/yarn.ts` identical to `website/src/brand/yarn.ts`.
