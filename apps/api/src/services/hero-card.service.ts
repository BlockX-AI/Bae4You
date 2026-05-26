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
  name:         string;         // "PRAKHAR"
  city:         string;         // "MUMBAI"
  age:          number;         // 21
  cardNumber:   string;         // "0042"
  tier:         CardTier;
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

const LAYOUTS: Record<CardTier, TierLayout> = {
  Common: {
    avatar:   { cx: 432, cy: 375, r: 252 },
    bgColor:  "#1a1a2e",
    name:     { x: 55,  y: 718, size: 64, color: "#ffffff", anchor: "start"  },
    city:     { x: 55,  y: 778, size: 28, color: "#94a3b8", anchor: "start"  },
    stats:    "single",
    statsY:   828,
    statsColor: "#ffffff",
    statsBg:  "#2d2f54",
    showStats: ["vibe"],
    badgesY:  895,
    badgesBg: "#3b3d6b",
    badgesTextColor: "#ffffff",
    align:    "left",
  },
  Rare: {
    avatar:   { cx: 432, cy: 383, r: 238 },
    bgColor:  "#12101e",
    name:     { x: 55,  y: 728, size: 64, color: "#ffffff", anchor: "start"  },
    city:     { x: 55,  y: 788, size: 28, color: "#94a3b8", anchor: "start"  },
    stats:    "double-row",
    statsY:   820,
    statsColor: "#ffffff",
    statsBg:  "#2d1b5e",
    showStats: ["vibe", "rizz"],
    badgesY:  900,
    badgesBg: "#5b21b6",
    badgesTextColor: "#ffffff",
    align:    "left",
  },
  Epic: {
    avatar:   { cx: 432, cy: 340, r: 228 },
    bgColor:  "#0d0a0e",
    name:     { x: 432, y: 858, size: 62, color: "#ffd700", anchor: "middle" },
    city:     { x: 432, y: 900, size: 28, color: "#c9a227", anchor: "middle" },
    stats:    "double-row",
    statsY:   708,
    statsColor: "#ffd700",
    statsBg:  "#2a1a00",
    showStats: ["vibe", "rizz", "drip"],
    badgesY:  762,
    badgesBg: "#3d2800",
    badgesTextColor: "#ffd700",
    align:    "center",
  },
  Legendary: {
    avatar:   { cx: 432, cy: 388, r: 252 },
    bgColor:  "#000000",
    name:     { x: 432, y: 712, size: 68, color: "#ffd700", anchor: "middle" },
    city:     { x: 432, y: 768, size: 30, color: "#c9a227", anchor: "middle" },
    stats:    "grid-2x2",
    statsY:   800,
    statsColor: "#ffd700",
    statsBg:  "#1a1200",
    showStats: ["vibe", "rizz", "drip", "aura"],
    badgesY:  900,
    badgesBg: "#1a1200",
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
  width = 360
): string {
  const blocks = 8;
  const filled  = Math.round((value / 100) * blocks);
  const bW = 22, bH = 18, bGap = 5;
  const barsX = x + 130;

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
    <text x="${x + width - 10}" y="${y}" font-size="22" font-weight="700" fill="${color}"
      font-family="Arial Black, Arial" text-anchor="end">${value}</text>`;
}

/** Build the complete SVG overlay: cover rects + text + stats + badges */
function buildOverlay(input: HeroCardInput, layout: TierLayout): Buffer {
  const { name, city, age, cardNumber, vibe, rizz = 0, drip = 0, aura = 0, badges = [], tier } = input;
  const L = layout;
  const W = 864, H = 1216;

  // Cover regions to erase old placeholder text
  const coverAreas: Array<{ x: number; y: number; w: number; h: number }> = [];

  // Always cover: card number top-right
  coverAreas.push({ x: 630, y: 30,  w: 210, h: 70  });
  // Name cover
  coverAreas.push({ x: L.align === "center" ? 100 : 40, y: L.name.y - 65, w: L.align === "center" ? 664 : 520, h: 85  });
  // City cover
  coverAreas.push({ x: L.align === "center" ? 100 : 40, y: L.city.y - 35, w: L.align === "center" ? 664 : 460, h: 52  });
  // Stats area cover
  coverAreas.push({ x: 40, y: L.statsY - 30, w: 784, h: tier === "Legendary" ? 115 : tier === "Epic" ? 120 : 80 });
  // Badges cover
  coverAreas.push({ x: 40, y: L.badgesY - 10, w: 784, h: 60 });

  const coverSVG = coverAreas.map(c =>
    `<rect x="${c.x}" y="${c.y}" width="${c.w}" height="${c.h}" fill="${L.bgColor}" />`
  ).join("\n");

  // Card number (top-right)
  const cardNumSVG = `<text x="824" y="80" font-size="28" font-weight="700" fill="${L.name.color}"
    font-family="Arial Black, Arial" text-anchor="end">#${cardNumber.padStart(4, "0")}</text>`;

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
    statsSVG = statBlocks(55, L.statsY, "VIBE", vibe, L.statsColor, L.statsBg, 754);
  } else if (L.stats === "double-row") {
    const show = L.showStats;
    const col1 = show[0] ?? "vibe";
    const col2 = show[1] ?? "rizz";
    const col3 = show[2];
    statsSVG  = statBlocks(40,  L.statsY,      labels[col1], sv[col1 as keyof typeof sv] ?? 0, L.statsColor, L.statsBg, 370);
    statsSVG += statBlocks(450, L.statsY,      labels[col2], sv[col2 as keyof typeof sv] ?? 0, L.statsColor, L.statsBg, 370);
    if (col3) {
      statsSVG += statBlocks(40, L.statsY + 50, labels[col3], sv[col3 as keyof typeof sv] ?? 0, L.statsColor, L.statsBg, 370);
    }
  } else {
    // grid-2x2
    statsSVG  = statBlocks(40,  L.statsY,      "VIBE", vibe, L.statsColor, L.statsBg, 370);
    statsSVG += statBlocks(450, L.statsY,      "RIZZ", rizz, L.statsColor, L.statsBg, 370);
    statsSVG += statBlocks(40,  L.statsY + 55, "DRIP", drip, L.statsColor, L.statsBg, 370);
    statsSVG += statBlocks(450, L.statsY + 55, "AURA", aura, L.statsColor, L.statsBg, 370);
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
export async function generateHeroCard(input: HeroCardInput): Promise<Buffer> {
  const { tier, avatarBuffer } = input;
  const layout = LAYOUTS[tier];

  // 1. Load frame template
  const framePath = path.join(FRAME_DIR, `${tier.toLowerCase()}.png`);
  const frameBuffer = await sharp(framePath).toBuffer();

  // 2. Circle-crop the KYC avatar
  const circleAvatar = await cropCircle(avatarBuffer, layout.avatar.r);

  // 3. Build SVG text overlay
  const svgOverlay = buildOverlay(input, layout);

  // 4. Composite: frame → avatar circle → text overlay
  const result = await sharp(frameBuffer)
    .composite([
      {
        input:     circleAvatar,
        top:       layout.avatar.cy - layout.avatar.r,
        left:      layout.avatar.cx - layout.avatar.r,
        blend:     "over",
      },
      {
        input:     svgOverlay,
        top:       0,
        left:      0,
        blend:     "over",
      },
    ])
    .png()
    .toBuffer();

  return result;
}

/** Determine card tier from vibe score */
export function tierFromVibe(vibe: number): CardTier {
  if (vibe >= 95) return "Legendary";
  if (vibe >= 80) return "Epic";
  if (vibe >= 60) return "Rare";
  return "Common";
}
