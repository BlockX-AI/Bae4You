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
  avatarBuffer: Buffer;         // KYC-generated comic avatar (any size)
  name:         string;         // "PRAKHAR" (from display_name)
  city:         string;         // "MUMBAI" (from location_city)
  age:          number;         // 21 (calculated from birth_date)
  cardNumber:   number;         // Auto-assigned from sequence
  tier:         CardTier;       // Auto-calculated from vibe score
  vibe:         number;         // 0–100
  rizz?:        number;
  drip?:        number;
  aura?:        number;
  badges?:      string[];       // ["OG MEMBER", "TOP 1%"]
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

/** Crop avatar buffer to a circle of diameter r*2 */
async function cropCircle(avatarBuf: Buffer, r: number): Promise<Buffer> {
  const d = r * 2;
  const svgMask = Buffer.from(
    `<svg width="${d}" height="${d}"><circle cx="${r}" cy="${r}" r="${r}" fill="white"/></svg>`
  );
  return sharp(avatarBuf)
    .resize(d, d, { fit: "cover", position: "top" })
    .composite([{ input: svgMask, blend: "dest-in" }])
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

/** Build the complete SVG overlay: cover rects + text + stats + badges */
function buildOverlay(input: HeroCardInput, layout: TierLayout): Buffer {
  const { name, city, age, cardNumber, vibe, rizz = 0, drip = 0, aura = 0, badges = [], tier } = input;
  const L = layout;
  const W = 864, H = 1216;

  // No cover rectangles - place content in template's designated empty areas
  const coverSVG = "";

  // Card number (top-left) - positioned where there's no baked-in content
  const cardNumSVG = `<text x="40" y="80" font-size="28" font-weight="700" fill="${L.name.color}"
    font-family="Arial Black, Arial" text-anchor="start">#${String(cardNumber).padStart(4, "0")}</text>`;

  // Name
  const nameSVG = `<text x="${L.name.x}" y="${L.name.y}" font-size="${L.name.size}" font-weight="900"
    fill="${L.name.color}" font-family="Arial Black, Arial" text-anchor="${L.name.anchor}"
    letter-spacing="2">${name.toUpperCase()}</text>`;

  // City + Age
  const citySVG = `<text x="${L.city.x}" y="${L.city.y}" font-size="${L.city.size}"
    fill="${L.city.color}" font-family="Arial, sans-serif" text-anchor="${L.city.anchor}"
    letter-spacing="1">${city.toUpperCase()} • AGE ${age}</text>`;

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
    ${nameSVG}
    ${citySVG}
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

  // 1. Load frame template
  const framePath = path.join(FRAME_DIR, `${tier.toLowerCase()}.png`);
  const frameBuffer = await sharp(framePath).toBuffer();

  // 2. Circle-crop the KYC avatar to fit within the template's golden ring
  const circleAvatar = await cropCircle(avatarBuffer, L.avatar.r);

  // 3. Build opaque cover patches for baked-in placeholder text (100% opaque, no SVG leakage)
  const coverPatches: sharp.OverlayOptions[] = await Promise.all(
    COVER_ZONES[tier].map(async ({ top, height, left = 60, width = 744 }) => ({
      input: await solidRect(width, height, L.bgColor),
      top,
      left,
      blend: "over" as const,
    }))
  );

  // 4. Build SVG text overlay (name, city, stats, badges)
  const svgOverlay = buildOverlay(input, layout);

  // 5. Composite: frame → cover patches → avatar → text overlay
  return sharp(frameBuffer)
    .composite([
      ...coverPatches,
      { input: circleAvatar, top: L.avatar.cy - L.avatar.r, left: L.avatar.cx - L.avatar.r, blend: "over" as const },
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
