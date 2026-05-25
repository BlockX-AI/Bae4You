# Hero Card Generator — Canvas Rendering Issue

## Status: RESOLVED (switched to SVG + Sharp)

---

## Problem

The `canvas` npm package produces **all-black output** for every drawing operation,
regardless of fill color, gradient, or image source.

### Diagnostic Evidence

```
// Even this simplest possible case fails:
ctx.fillStyle = '#ff0000';
ctx.fillRect(0, 0, 100, 100);
// → pixel: [0, 0, 0, 255]  (should be [255, 0, 0, 255])
```

All pixels in every generated card were `[0, 0, 0, 255]` — fully opaque black.
This applies to: solid fills, linear gradients, radial gradients, `drawImage`, text.

## Root Cause

The `canvas` npm package is a native Node.js addon that wraps **Cairo** (2D graphics library)
and **Pango** (text rendering). On this machine the native bindings compile but the
Cairo rendering backend silently produces black output for all operations.

Typical causes:
- Cairo system library mismatch with the version `canvas` was compiled against
- Missing or broken `libcairo`, `libpango`, `libjpeg`, `libgif` system dependencies
- Known issue on macOS with Apple Silicon / Rosetta 2 compatibility shims

## Fix Applied

Rewrote `hero-card-generator.ts` to use **SVG strings + Sharp** instead of Canvas.

### Why SVG + Sharp Works

- Sharp uses `libvips` (independent of Cairo) — already proven working in `face-analysis.ts`
- SVG is a text format; no native binary rendering at generation time
- Sharp's `composite()` API handles layering the avatar PNG onto the SVG card frame
- Zero additional dependencies — Sharp is already in `package.json`

### Architecture of the New Implementation

```
generateHeroCard(input)
  │
  ├─ buildCardSVG()           → SVG string (background, frame, gems, crown, stats)
  │    └─ All rarity themes via RARITY config
  │
  ├─ sharp(svg).png()         → card base PNG buffer
  │
  ├─ makeCircularAvatar()     → circular-masked avatar PNG (Sharp composite)
  │
  └─ sharp(base).composite(avatar) → final card PNG
```

## Files Changed

| File | Change |
|------|--------|
| `src/services/hero-card-generator.ts` | Full rewrite: Canvas → SVG + Sharp |
| `scripts/hero-card-test.ts` | No change needed |
| `package.json` | No new deps (Sharp already present) |

## If Canvas Is Needed Later

To fix the native Canvas issue, run:
```bash
# macOS with Homebrew
brew install pkg-config cairo pango libpng jpeg giflib librsvg pixman
npm rebuild canvas
```
Then verify with:
```bash
node -e "const {createCanvas}=require('canvas'); const c=createCanvas(10,10); const ctx=c.getContext('2d'); ctx.fillStyle='#ff0000'; ctx.fillRect(0,0,10,10); console.log(c.toBuffer('image/png').length);"
# Should output ~100 bytes (not 67 bytes which is empty PNG)
```
