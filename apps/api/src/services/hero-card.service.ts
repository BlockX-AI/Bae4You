/**
 * Hero Card Generator — Bae4U
 *
 * Composites a KYC avatar onto tier-specific card templates using Sharp + SVG overlays.
 * Card templates (864×1216 px) live in apps/api/public/images/herocard/
 *
 * Flow:
 *   avatarBuffer → circle-crop → composite onto frame → SVG text + stats overlay → PNG
 */

import sharp from "sharp";
import path from "path";

// ── Types ─────────────────────────────────────────────────────────────────────

export type CardTier = "Common" | "Rare" | "Epic" | "Legendary";

export interface HeroCardInput {
  avatarBuffer:   Buffer;       // KYC-generated comic avatar (any size)
  name:           string;       // "PRAKHAR" (from display_name)
  city:           string;       // "MUMBAI" (from location_city)
  age:            number;       // 21 (calculated from birth_date)
  cardNumber:     number;       // Auto-assigned from sequence
  tier:           CardTier;     // Auto-calculated from vibe score
  vibe:           number;       // 0–100
  rizz?:          number;
  drip?:          number;
  aura?:          number;
  badges?:        string[];     // ["OG MEMBER", "TOP 1%"]
  tagline?:       string;       // Earned title e.g. "MAGNETIC" — auto-computed if omitted
  petValuePcash?: number;       // Current pet price in PCASH (shown on Epic+)
  seriesLabel?:   string;       // "GENESIS SERIES" (shown on Legendary only)
}

// ── Card layout config per tier (positions in 864×1216 space) ─────────────────

interface TierLayout {
  /** Avatar circle: center x/y + radius */
  avatar: { cx: number; cy: number; r: number };
  /** BG fill color used to erase old text */
  bgColor: string;
  /** Name text */
  name: { x: number; y: number; size: number; color: string; anchor: "start" | "middle" };
  /** City + age text */
  city: { x: number; y: number; size: number; color: string; anchor: "start" | "middle" };
  /** Stats layout */
  stats: "single" | "double-row" | "grid-2x2";
  statsY: number;
  statsColor: string;
  statsBg: string;
  /** What stats to show */
  showStats: Array<"vibe" | "rizz" | "drip" | "aura">;
  /** Badges row Y */
  badgesY: number;
  badgesBg: string;
  badgesTextColor: string;
  /** Align */
  align: "left" | "center";
}

/**
 * Pixel-measured positions for each tier template (864×1216):
 *  - avatar circle center/radius measured from actual template image
 *  - coverY = y where baked-in placeholder text starts (needs to be blanked)
 *  - name/city/stats/badges placed within the covered area
 */
const LAYOUTS: Record<CardTier, TierLayout> = {
  Common: {
    avatar:   { cx: 432, cy: 430, r: 235 },
    bgColor:  "#0d0d1a",
    name:     { x: 432, y: 845, size: 38, color: "#ffffff", anchor: "middle" },
    city:     { x: 432, y: 888, size: 18, color: "#94a3b8", anchor: "middle" },
    stats:    "single",
    statsY:   940,
    statsColor: "#ffffff",
    statsBg:  "#1a1a3e",
    showStats: ["vibe"],
    badgesY:  1055,
    badgesBg: "#2a2a5e",
    badgesTextColor: "#ffffff",
    align:    "center",
  },
  Rare: {
    avatar:   { cx: 432, cy: 460, r: 265 },
    bgColor:  "#0a0814",
    name:     { x: 432, y: 845, size: 38, color: "#c084fc", anchor: "middle" },
    city:     { x: 432, y: 888, size: 18, color: "#a855f7", anchor: "middle" },
    stats:    "double-row",
    statsY:   930,
    statsColor: "#c084fc",
    statsBg:  "#1a0a3e",
    showStats: ["vibe", "rizz"],
    badgesY:  1055,
    badgesBg: "#3b1278",
    badgesTextColor: "#c084fc",
    align:    "center",
  },
  Epic: {
    avatar:   { cx: 432, cy: 430, r: 235 },
    bgColor:  "#080608",
    name:     { x: 432, y: 845, size: 42, color: "#ffd700", anchor: "middle" },
    city:     { x: 432, y: 892, size: 18, color: "#c9a227", anchor: "middle" },
    stats:    "double-row",
    statsY:   930,
    statsColor: "#ffd700",
    statsBg:  "#1a0e00",
    showStats: ["vibe", "rizz", "drip"],
    badgesY:  1055,
    badgesBg: "#2a1800",
    badgesTextColor: "#ffd700",
    align:    "center",
  },
  Legendary: {
    avatar:   { cx: 432, cy: 455, r: 235 },
    bgColor:  "#000000",
    name:     { x: 432, y: 845, size: 46, color: "#ffd700", anchor: "middle" },
    city:     { x: 432, y: 895, size: 20, color: "#c9a227", anchor: "middle" },
    stats:    "grid-2x2",
    statsY:   930,
    statsColor: "#ffd700",
    statsBg:  "#0a0800",
    showStats: ["vibe", "rizz", "drip", "aura"],
    badgesY:  1055,
    badgesBg: "#0a0800",
    badgesTextColor: "#ffd700",
    align:    "center",
  },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

const FRAME_DIR = path.resolve(__dirname, "../../public/images/herocard");

/**
 * Scale avatar to fill the circle bounding box (no circle crop here —
 * the frame-cutout approach lets the frame's ring act as the mask).
 */
async function scaleAvatarForCircle(avatarBuf: Buffer, r: number): Promise<Buffer> {
  const d = r * 2;
  return sharp(avatarBuf)
    .resize(d, d, { fit: "cover", position: "centre" })
    .png()
    .toBuffer();
}

/**
 * Cut a circular hole from the frame at (cx, cy, r).
 * Returns the frame PNG with that circle area made transparent.
 */
async function cutCircleFromFrame(
  frameBuf: Buffer, cx: number, cy: number, r: number, cardW: number, cardH: number
): Promise<Buffer> {
  const whiteBase = await sharp({
    create: { width: cardW, height: cardH, channels: 4, background: { r: 255, g: 255, b: 255, alpha: 255 } },
  }).png().toBuffer();

  const circleSvg = Buffer.from(
    `<svg width="${cardW}" height="${cardH}"><circle cx="${cx}" cy="${cy}" r="${r}" fill="black"/></svg>`
  );
  const ringMask = await sharp(whiteBase)
    .composite([{ input: circleSvg, blend: "dest-out" }])
    .png()
    .toBuffer();

  return sharp(frameBuf)
    .composite([{ input: ringMask, blend: "dest-in" }])
    .png()
    .toBuffer();
}

/** Render a stat row as SVG — block-dot style matching card aesthetic */
function statBlocks(
  x: number, y: number,
  label: string, value: number,
  color: string, bgColor: string,
): string {
  const blocks = 8;
  const filled  = Math.round((value / 100) * blocks);
  const bW = 22, bH = 18, bGap = 5;
  const labelW = 90;
  const barsX   = x + labelW;
  const scoreX  = barsX + blocks * (bW + bGap) + 8;

  let rects = "";
  for (let i = 0; i < blocks; i++) {
    const bx = barsX + i * (bW + bGap);
    rects += `<rect x="${bx}" y="${y - 14}" width="${bW}" height="${bH}" rx="4"
      fill="${i < filled ? color : bgColor}" opacity="${i < filled ? 1 : 0.35}"/>`;
  }

  return `
    <text x="${x}" y="${y}" font-size="22" font-weight="700" fill="${color}"
      font-family="Arial Black, Arial" letter-spacing="1">${label}</text>
    ${rects}
    <text x="${scoreX}" y="${y}" font-size="22" font-weight="700" fill="${color}"
      font-family="Arial Black, Arial">${value}</text>`;
}

// ── Earned title calculator ──────────────────────────────────────────────────

export function computeTagline(tier: CardTier, vibe: number, rizz = 0, drip = 0, aura = 0): string {
  if (tier === "Common") {
    if (vibe >= 65) return "CATCHING FIRE";
    if (vibe >= 55) return "RISING STAR";
    if (vibe >= 40) return "FINDING FLOW";
    return "NEW IN TOWN";
  }
  if (tier === "Rare") {
    if (rizz >= 90) return "IRRESISTIBLE";
    if (rizz >= 75) return "MAGNETIC";
    if (rizz >= 60) return "CHARMING";
    return "CONNECTED";
  }
  if (tier === "Epic") {
    const best = Math.max(vibe, rizz, drip);
    if (best === drip && drip >= 90) return "STYLE ICON";
    if (best === rizz && rizz >= 90) return "HEARTBREAKER";
    if (best === vibe && vibe >= 90) return "VIBE SETTER";
    if (vibe >= 80 && rizz >= 80 && drip >= 80) return "APEX PREDATOR";
    return "ELITE";
  }
  // Legendary
  if (aura >= 95) return "THE ICON";
  if (rizz >= 95) return "THE ONE";
  if (vibe >= 95 && rizz >= 90 && drip >= 90 && aura >= 90) return "UNTOUCHABLE";
  if (vibe >= 95) return "THE CHOSEN ONE";
  return "LEGENDARY";
}

/** Build the complete SVG overlay: cover rects + text + stats + badges */
function buildOverlay(input: HeroCardInput, layout: TierLayout): Buffer {
  const { name, city, age, cardNumber, vibe, rizz = 0, drip = 0, aura = 0, badges = [], tier } = input;
  const tagline      = input.tagline ?? computeTagline(tier, vibe, rizz, drip, aura);
  const petValue     = input.petValuePcash;
  const seriesLabel  = input.seriesLabel;
  const L = layout;
  const W = 864, H = 1216;

  // No cover rectangles - place content in template's designated empty areas
  const coverSVG = "";

  // Card number (top-left)
  const cardNumSVG = `<text x="40" y="80" font-size="28" font-weight="700" fill="${L.name.color}"
    font-family="Arial Black, Arial" text-anchor="start">#${String(cardNumber).padStart(4, "0")}</text>`;

  // Series label (Legendary only) — between card-num row and avatar
  const seriesSVG = (tier === "Legendary" && seriesLabel)
    ? `<text x="${W / 2}" y="108" font-size="13" font-weight="700"
        fill="#c9a227" font-family="Arial, sans-serif" text-anchor="middle"
        letter-spacing="5" opacity="0.75">${seriesLabel.toUpperCase()}</text>`
    : "";

  // Name
  const nameSVG = `<text x="${L.name.x}" y="${L.name.y}" font-size="${L.name.size}" font-weight="900"
    fill="${L.name.color}" font-family="Arial Black, Arial" text-anchor="${L.name.anchor}"
    letter-spacing="2">${name.toUpperCase()}</text>`;

  // City + Age
  const citySVG = `<text x="${L.city.x}" y="${L.city.y}" font-size="${L.city.size}"
    fill="${L.city.color}" font-family="Arial, sans-serif" text-anchor="${L.city.anchor}"
    letter-spacing="1">${city.toUpperCase()} • AGE ${age}</text>`;

  // Earned tagline — between city and stats
  const tierSymbol: Record<CardTier, string> = {
    Common: "✦", Rare: "✦", Epic: "◆", Legendary: "♛",
  };
  const sym = tierSymbol[tier];
  const taglineY = L.city.y + 38;
  const taglineSVG = `
    <text x="${W / 2}" y="${taglineY}" font-size="16" font-weight="900"
      fill="${L.statsColor}" font-family="Arial Black, Arial" text-anchor="middle"
      letter-spacing="4" opacity="0.85">${sym}  ${tagline}  ${sym}</text>`;

  // Pet value (Epic + Legendary only)
  const petValueSVG = (petValue && (tier === "Epic" || tier === "Legendary"))
    ? `<text x="${W / 2}" y="${taglineY + 30}" font-size="13"
        fill="${L.statsColor}" font-family="Arial, sans-serif" text-anchor="middle"
        letter-spacing="2" opacity="0.6">PET VALUE: ${petValue.toLocaleString()} PCASH</text>`
    : "";

  // Stats
  let statsSVG = "";
  const sv = { vibe, rizz, drip, aura };
  const labels: Record<string, string> = { vibe: "VIBE", rizz: "RIZZ", drip: "DRIP", aura: "AURA" };

  if (L.stats === "single") {
    statsSVG = statBlocks(432 - 150, L.statsY, "VIBE", vibe, L.statsColor, L.statsBg);
  } else if (L.stats === "double-row") {
    const show = L.showStats;
    const col1 = show[0] ?? "vibe";
    const col2 = show[1] ?? "rizz";
    const col3 = show[2];
    statsSVG  = statBlocks(40,  L.statsY,      labels[col1], sv[col1 as keyof typeof sv] ?? 0, L.statsColor, L.statsBg);
    statsSVG += statBlocks(450, L.statsY,      labels[col2], sv[col2 as keyof typeof sv] ?? 0, L.statsColor, L.statsBg);
    if (col3) {
      statsSVG += statBlocks(40, L.statsY + 50, labels[col3], sv[col3 as keyof typeof sv] ?? 0, L.statsColor, L.statsBg);
    }
  } else {
    // grid-2x2
    statsSVG  = statBlocks(40,  L.statsY,      "VIBE", vibe, L.statsColor, L.statsBg);
    statsSVG += statBlocks(450, L.statsY,      "RIZZ", rizz, L.statsColor, L.statsBg);
    statsSVG += statBlocks(40,  L.statsY + 55, "DRIP", drip, L.statsColor, L.statsBg);
    statsSVG += statBlocks(450, L.statsY + 55, "AURA", aura, L.statsColor, L.statsBg);
  }

  // Badges
  let badgesSVG = "";
  if (badges.length > 0) {
    let bx = L.align === "center" ? 432 - (badges.length * 160) / 2 : 55;
    for (const badge of badges) {
      const bw = badge.length * 12 + 40;
      badgesSVG += `
        <rect x="${bx}" y="${L.badgesY - 6}" width="${bw}" height="38" rx="19"
          fill="${L.badgesBg}" opacity="0.9"/>
        <text x="${bx + bw / 2}" y="${L.badgesY + 18}" font-size="18" font-weight="700"
          fill="${L.badgesTextColor}" font-family="Arial, sans-serif" text-anchor="middle">${badge}</text>`;
      bx += bw + 16;
    }
  }

  const svg = `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
    ${coverSVG}
    ${cardNumSVG}
    ${seriesSVG}
    ${nameSVG}
    ${citySVG}
    ${taglineSVG}
    ${petValueSVG}
    ${statsSVG}
    ${badgesSVG}
  </svg>`;

  return Buffer.from(svg);
}

// ── Public API ─────────────────────────────────────────────────────────────────

/**
 * Generate a personalized hero card PNG.
 *
 * @returns Buffer — final 864×1216 PNG ready for IPFS upload / display
 */
/** Create a solid-colour opaque PNG buffer (used as cover patch) */
async function solidRect(w: number, h: number, hex: string): Promise<Buffer> {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return sharp({ create: { width: w, height: h, channels: 4,
    background: { r, g, b, alpha: 1 } } }).png().toBuffer();
}

/**
 * Pixel-measured cover zones for each template's baked-in placeholder text.
 * These are Sharp opaque patches (guaranteed 100% coverage, no SVG opacity issues).
 * Coordinates measured directly from template images.
 *  x=60, width=744 stays inside the decorative gold border on all 4 templates.
 *  Note: Common/Rare/Epic have baked-in card numbers (gradient bg) — we don't cover them
 *        and don't display new card numbers to avoid visible patch artifacts.
 *        Legendary has no baked-in number, so we can display the card number cleanly.
 */
const COVER_ZONES: Record<CardTier, { top: number; height: number; left?: number; width?: number }[]> = {
  Common:    [{ top: 790, height: 320, left: 60, width: 744 }],
  Rare:      [{ top: 790, height: 320, left: 60, width: 744 }],
  Epic:      [{ top: 790, height: 320, left: 60, width: 744 }],
  Legendary: [{ top: 790, height: 320, left: 60, width: 744 }],
};

export async function generateHeroCard(input: HeroCardInput): Promise<Buffer> {
  const { tier, avatarBuffer } = input;
  const layout = LAYOUTS[tier];
  const L = layout;
  const { cx, cy, r } = L.avatar;
  const CARD_W = 864, CARD_H = 1216;

  // 1. Load frame template
  const framePath = path.join(FRAME_DIR, `${tier.toLowerCase()}.png`);
  const frameBuffer = await sharp(framePath).toBuffer();

  // 2. Scale avatar to fill the circle bounding box (rectangle — frame does the circular masking)
  const avatarSquare = await scaleAvatarForCircle(avatarBuffer, r);

  // 3. Cut circular hole from the frame so frame interior never bleeds through
  const frameCutout = await cutCircleFromFrame(frameBuffer, cx, cy, r, CARD_W, CARD_H);

  // 4. Build opaque cover patches for info area (clean background for text)
  const coverPatches: sharp.OverlayOptions[] = await Promise.all(
    COVER_ZONES[tier].map(async ({ top, height, left = 60, width = 744 }) => ({
      input: await solidRect(width, height, L.bgColor),
      top,
      left,
      blend: "over" as const,
    }))
  );

  // 5. Build SVG text overlay (name, city, stats, badges)
  const svgOverlay = buildOverlay(input, layout);

  // 6. Composite: solid bg → avatar (fills circle) → frame-with-hole → cover patches → text
  const baseBg = await solidRect(CARD_W, CARD_H, L.bgColor);

  return sharp(baseBg)
    .composite([
      { input: avatarSquare, top: cy - r, left: cx - r, blend: "over" as const },
      { input: frameCutout,  top: 0, left: 0, blend: "over" as const },
      ...coverPatches,
      { input: svgOverlay,   top: 0, left: 0, blend: "over" as const },
    ])
    .png()
    .toBuffer();
}

/** Determine card tier from vibe score */
export function tierFromVibe(vibe: number): CardTier {
  if (vibe >= 95) return "Legendary";
  if (vibe >= 80) return "Epic";
  if (vibe >= 60) return "Rare";
  return "Common";
}
