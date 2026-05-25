/**
 * hero-card-generator.ts
 * Generates rarity-tiered hero card PNGs for Bae4U NFT profiles.
 * Uses SVG strings + Sharp composite — zero Canvas dependency.
 *
 * Pipeline:
 *   buildCardSVG()       → SVG string  (card frame, gems, stats)
 *   sharp(svg).png()     → card base PNG buffer
 *   makeCircularAvatar() → circular-masked avatar PNG (Sharp composite)
 *   sharp(base).composite(avatar) → final 400×560 card PNG
 */

import sharp from "sharp";

// ─── Types ────────────────────────────────────────────────────────────────────

export type Rarity = "common" | "rare" | "epic" | "legendary";

export interface HeroCardInput {
  username: string;
  handle: string;
  location: string;
  rarity: Rarity;
  stats: {
    charm: number;
    appeal: number;
    vibe: number;
    xp: number;
  };
  avatarPngBuffer: Buffer;
  tokenId?: number;
}

export interface HeroCardOutput {
  cardPngBuffer: Buffer;
  cardWidth: number;
  cardHeight: number;
}

// ─── Rarity Themes ────────────────────────────────────────────────────────────

const RARITY = {
  common: {
    bg:      "#1e1d1b",
    topBar:  "#2b2a27",
    frame:   "#68675e",
    gem:     "#a8a79e",
    gemDark: "#2e2e2b",
    gems:    1,
    label:   "COMMON",
  },
  rare: {
    bg:      "#03213c",
    topBar:  "#083360",
    frame:   "#3a8fd2",
    gem:     "#72b2e6",
    gemDark: "#0a2a50",
    gems:    2,
    label:   "RARE",
  },
  epic: {
    bg:      "#1a1550",
    topBar:  "#2b2478",
    frame:   "#7a70d8",
    gem:     "#ada4ec",
    gemDark: "#1e1864",
    gems:    3,
    label:   "EPIC",
  },
  legendary: {
    bg:      "#2c1400",
    topBar:  "#481e00",
    frame:   "#c88c18",
    gem:     "#efaa28",
    gemDark: "#3c1a00",
    gems:    4,
    label:   "LEGENDARY",
  },
} as const;

type RarityConfig = typeof RARITY[keyof typeof RARITY];

// ─── Card Dimensions ──────────────────────────────────────────────────────────

const W = 400;
const H = 560;
const AVATAR_CX      = W / 2;
const AVATAR_CY      = 220;
const AVATAR_R       = 108;
const AVATAR_INNER_R = 103;

// ─── SVG Helpers ──────────────────────────────────────────────────────────────

function diamond(cx: number, cy: number, r: number, fill: string): string {
  return `<rect x="${cx - r}" y="${cy - r}" width="${r * 2}" height="${r * 2}"
    rx="1.5" fill="${fill}" transform="rotate(45 ${cx} ${cy})"/>`;
}

function statBox(
  x: number, y: number,
  w: number, h: number,
  label: string, value: string,
  c: RarityConfig
): string {
  return `
  <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="10" fill="#00000044"/>
  <text x="${x + 15}" y="${y + 23}"
    fill="${c.gem}" font-size="9" font-weight="bold"
    letter-spacing="2" font-family="monospace">${label}</text>
  <text x="${x + 15}" y="${y + 55}"
    fill="white" font-size="24" font-weight="bold"
    font-family="monospace">${value}</text>`;
}

function safe(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function fmtXP(xp: number): string {
  if (xp >= 1_000_000) return `${(xp / 1_000_000).toFixed(1)}M`;
  if (xp >= 1_000)     return `${(xp / 1_000).toFixed(1)}K`;
  return String(xp);
}

// ─── SVG Builder ──────────────────────────────────────────────────────────────

function buildCardSVG(input: HeroCardInput): string {
  const c = RARITY[input.rarity];

  const GEM_SPACING = 22;
  const GEM_SIZE    = 7;
  const gemStartX   = W / 2 - (4 * GEM_SPACING) / 2 + GEM_SPACING / 2;
  const gems = Array.from({ length: 4 }, (_, i) =>
    diamond(gemStartX + i * GEM_SPACING, 42, GEM_SIZE, i < c.gems ? c.gem : c.gemDark)
  ).join("");

  const bgPattern = Array.from({ length: 18 }, (_, i) => {
    const col = i % 6;
    const row = Math.floor(i / 6);
    return diamond(48 + col * 62, 105 + row * 80, 3, `${c.gem}1a`);
  }).join("");

  const COL_W   = 171;
  const COL_H   = 70;
  const COL_GAP = 10;
  const STAT_Y  = 390;

  const tokenBadge = input.tokenId != null
    ? `<text x="${W / 2}" y="${H - 14}" text-anchor="middle"
        fill="${c.gem}" font-size="9" font-family="monospace" opacity=".6">
        #${input.tokenId.toString().padStart(6, "0")}
      </text>`
    : "";

  return `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}"
    xmlns="http://www.w3.org/2000/svg">
  <defs>
    <clipPath id="cardClip">
      <rect width="${W}" height="${H}" rx="22"/>
    </clipPath>
  </defs>
  <g clip-path="url(#cardClip)">
    <rect width="${W}" height="${H}" fill="${c.bg}"/>
    ${bgPattern}
    <rect x="0" y="0" width="${W}" height="70" fill="${c.topBar}"/>
    <text x="${W / 2}" y="28" text-anchor="middle"
      fill="${c.gem}" font-size="11" font-weight="bold"
      letter-spacing="4" font-family="monospace">${c.label}</text>
    ${gems}
    <circle cx="${AVATAR_CX}" cy="${AVATAR_CY}" r="${AVATAR_R + 4}" fill="${c.topBar}"/>
    <circle cx="${AVATAR_CX}" cy="${AVATAR_CY}" r="${AVATAR_R}"
      fill="none" stroke="${c.frame}" stroke-width="5"/>
    <circle cx="${AVATAR_CX}" cy="${AVATAR_CY}" r="${AVATAR_INNER_R}" fill="#0a0a0a"/>
    <circle cx="${AVATAR_CX + 76}" cy="${AVATAR_CY + 82}" r="18" fill="${c.frame}"/>
    <polygon
      points="${AVATAR_CX + 76},${AVATAR_CY + 71}
              ${AVATAR_CX + 78.5},${AVATAR_CY + 77}
              ${AVATAR_CX + 84},${AVATAR_CY + 77.5}
              ${AVATAR_CX + 80},${AVATAR_CY + 81.5}
              ${AVATAR_CX + 81.5},${AVATAR_CY + 87}
              ${AVATAR_CX + 76},${AVATAR_CY + 84}
              ${AVATAR_CX + 70.5},${AVATAR_CY + 87}
              ${AVATAR_CX + 72},${AVATAR_CY + 81.5}
              ${AVATAR_CX + 68},${AVATAR_CY + 77.5}
              ${AVATAR_CX + 73.5},${AVATAR_CY + 77}"
      fill="${c.bg}" opacity=".9"/>
    <text x="${W / 2}" y="352" text-anchor="middle"
      fill="white" font-size="20" font-weight="bold"
      font-family="monospace" letter-spacing="1">${safe(input.username)}</text>
    <text x="${W / 2}" y="372" text-anchor="middle"
      fill="${c.gem}" font-size="11" font-family="monospace" opacity=".85">
      ${safe(input.handle)} · ${safe(input.location)}</text>
    ${statBox(15, STAT_Y,                   COL_W, COL_H, "CHARM",  String(input.stats.charm),  c)}
    ${statBox(15 + COL_W + COL_GAP, STAT_Y, COL_W, COL_H, "APPEAL", String(input.stats.appeal), c)}
    ${statBox(15, STAT_Y + COL_H + 8,                   COL_W, COL_H, "VIBE", String(input.stats.vibe), c)}
    ${statBox(15 + COL_W + COL_GAP, STAT_Y + COL_H + 8, COL_W, COL_H, "XP",  fmtXP(input.stats.xp),   c)}
    ${tokenBadge}
  </g>
</svg>`;
}

// ─── Avatar Circular Mask ─────────────────────────────────────────────────────

async function makeCircularAvatar(pngBuffer: Buffer, diameter: number): Promise<Buffer> {
  const r = Math.floor(diameter / 2);
  const mask = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${diameter}" height="${diameter}">
      <circle cx="${r}" cy="${r}" r="${r}" fill="white"/>
    </svg>`
  );
  return sharp(pngBuffer)
    .resize(diameter, diameter, { fit: "cover", position: "centre" })
    .composite([{ input: mask, blend: "dest-in" }])
    .png()
    .toBuffer();
}

// ─── Main Export ──────────────────────────────────────────────────────────────

export async function generateHeroCard(input: HeroCardInput): Promise<HeroCardOutput> {
  const cardBase = await sharp(Buffer.from(buildCardSVG(input)))
    .png()
    .toBuffer();

  const avatarDiameter = (AVATAR_INNER_R - 2) * 2;
  const circularAvatar = await makeCircularAvatar(input.avatarPngBuffer, avatarDiameter);

  const left = Math.floor(AVATAR_CX - avatarDiameter / 2);
  const top  = Math.floor(AVATAR_CY - avatarDiameter / 2);

  const cardPngBuffer = await sharp(cardBase)
    .composite([{ input: circularAvatar, left, top }])
    .png()
    .toBuffer();

  return { cardPngBuffer, cardWidth: W, cardHeight: H };
}

export async function generateHeroCardDataUrl(input: HeroCardInput): Promise<string> {
  const { cardPngBuffer } = await generateHeroCard(input);
  return `data:image/png;base64,${cardPngBuffer.toString("base64")}`;
}

// ─── Sticker Pack ─────────────────────────────────────────────────────────────

export const STICKER_OVERLAYS = [
  "smile", "love", "wink", "cool", "laugh",
  "surprised", "crown", "hearts", "fire",
] as const;

export type StickerOverlay = typeof STICKER_OVERLAYS[number];

const OVERLAY_SVG: Record<StickerOverlay, (c: RarityConfig) => string> = {
  smile:     (_c) => `<text x="200" y="295" text-anchor="middle" font-size="36">😊</text>`,
  love:      (_c) => `<text x="200" y="295" text-anchor="middle" font-size="36">😍</text>`,
  wink:      (_c) => `<text x="200" y="295" text-anchor="middle" font-size="36">😉</text>`,
  cool:      (_c) => `<text x="200" y="295" text-anchor="middle" font-size="36">😎</text>`,
  laugh:     (_c) => `<text x="200" y="295" text-anchor="middle" font-size="36">😂</text>`,
  surprised: (_c) => `<text x="200" y="295" text-anchor="middle" font-size="36">😲</text>`,
  crown:     (c)  => `<circle cx="200" cy="108" r="14" fill="${c.gem}"/><text x="200" y="114" text-anchor="middle" font-size="16" fill="${c.bg}">♛</text>`,
  hearts:    (_c) => `<text x="160" y="120" font-size="18" fill="#e84040" opacity=".9">♥</text><text x="226" y="118" font-size="14" fill="#e84040" opacity=".75">♥</text>`,
  fire:      (_c) => `<text x="200" y="295" text-anchor="middle" font-size="36">🔥</text>`,
};

export async function generateStickerPack(
  input: HeroCardInput
): Promise<Record<StickerOverlay, Buffer>> {
  const { cardPngBuffer } = await generateHeroCard(input);
  const c = RARITY[input.rarity];

  const results = {} as Record<StickerOverlay, Buffer>;

  await Promise.all(
    STICKER_OVERLAYS.map(async (overlay) => {
      const overlaySvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
        ${OVERLAY_SVG[overlay](c)}
      </svg>`;
      results[overlay] = await sharp(cardPngBuffer)
        .composite([{ input: Buffer.from(overlaySvg) }])
        .png()
        .toBuffer();
    })
  );

  return results;
}

export function getCardRarities(): Rarity[] {
  return ["common", "rare", "epic", "legendary"];
}

// ─── (end of file — old 835-line Canvas version replaced) ────────────────────
// ─── Stub kept to satisfy old imports during transition ──────────────────────
/** @deprecated use HeroCardInput */
export type CardRarity = Rarity;
/** @deprecated alias */
export function getCardConfig(rarity: Rarity) { return RARITY[rarity]; }

// ─── end of file ─────────────────────────────────────────────────────
