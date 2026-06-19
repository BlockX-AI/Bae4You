/**
 * Bitmoji-Style Avatar Service — Notion Avatar Maker
 *
 * Converts VisualTraits (from ai-avatar.ts extractVisualTraits) into a
 * deterministic Notion-style SVG avatar config. The config is stored as JSONB
 * in users.bitmoji_config and can be rendered instantly on the client via
 * react-notion-avatar or server-side via generateNotionSVG().
 *
 * Asset source: Mayandev/notion-avatar (CC0 license)
 * SVG parts stored in: apps/api/public/notion-avatar-parts/
 *
 * Trait → config mapping:
 *   hair     ← traits.hairColour (7 buckets, rest hash-seeded)
 *   beard    ← traits.hasBeard  (0 = none, else stable hash)
 *   glass    ← traits.hasGlasses (0 = none, else stable hash)
 *   mouth    ← traits.expression (smile → indices 0-8, neutral/serious → 9-19)
 *   bgColor  ← traits.skinTone  (warm palette map)
 *   face/eye/eyebrow/nose/accessory/detail ← deterministic hash of userId
 */

import fs   from "fs";
import path from "path";
import type { VisualTraits, SkinTone, HairColour } from "./ai-avatar";

// ─── Public types ─────────────────────────────────────────────────────────────

export interface NotionAvatarConfig {
  face:      number;   // 0–15  (16 options)
  eye:       number;   // 0–13  (14 options)
  eyebrow:   number;   // 0–15  (16 options)
  glass:     number;   // 0–13  (14 options, 0 = none)
  hair:      number;   // 0–57  (58 options)
  mouth:     number;   // 0–19  (20 options)
  nose:      number;   // 0–13  (14 options)
  accessory: number;   // 0–13  (14 options, 0 = none)
  beard:     number;   // 0–15  (16 options, 0 = none)
  detail:    number;   // 0–12  (13 options)
  bgColor:   string;   // hex
  shape:     "circle" | "square";
}

export interface BitmojiAvatarResult {
  config:   NotionAvatarConfig;
  svgString: string;
  traits:   VisualTraits;
  userId:   string;
}

// ─── Deterministic hash helper ────────────────────────────────────────────────

function hashToRange(seed: string, max: number): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(31, h) + seed.charCodeAt(i) | 0;
  }
  return Math.abs(h) % (max + 1);
}

// ─── Trait → config mappings ──────────────────────────────────────────────────

// Hair colour → first representative hair index in the Notion avatar library
// Groups of similar-coloured hairstyles start at these approximate offsets
const HAIR_BY_COLOUR: Record<HairColour, number[]> = {
  "jet-black":    [0, 1, 2, 3, 4, 5],
  "dark-brown":   [10, 11, 12, 13, 14, 15],
  "medium-brown": [18, 19, 20, 21, 22],
  "auburn":       [24, 25, 26, 27],
  "silver-grey":  [41, 42, 43],
  "white":        [44, 45, 46],
  "light":        [30, 31, 32, 33, 34],
};

// Skin tone → warm background colour
const BG_BY_SKIN: Record<SkinTone, string> = {
  "fair":         "#fde2e4",
  "warm-ivory":   "#fff4e0",
  "olive":        "#e8f0d4",
  "medium-brown": "#f3e0c8",
  "warm-brown":   "#e8d3b8",
  "deep-brown":   "#d9bfa3",
  "dark":         "#cdb89a",
};

// ─── Core mapper ──────────────────────────────────────────────────────────────

export function traitsToNotionConfig(
  traits: VisualTraits,
  userId: string,
): NotionAvatarConfig {
  // Hair: pick from the skin-appropriate bucket, then hash within it
  const hairBucket = HAIR_BY_COLOUR[traits.hairColour] ?? HAIR_BY_COLOUR["jet-black"];
  const hairIdx    = hashToRange(userId + ":hair-bucket", hairBucket.length - 1);
  const hair       = hairBucket[hairIdx];

  // Beard: 0 = none (noticeably cleaner than ~25% chance of wrong beard)
  const beard = traits.hasBeard
    ? hashToRange(userId + ":beard", 15) || 1  // never 0 when beard detected
    : 0;

  // Glasses: 0 = none
  const glass = traits.hasGlasses
    ? hashToRange(userId + ":glass", 13) || 1  // never 0 when glasses detected
    : 0;

  // Mouth: smiling → 0–8, neutral/serious → 9–19
  let mouth: number;
  if (traits.expression === "warm-smile") {
    mouth = hashToRange(userId + ":smile", 8);
  } else {
    mouth = 9 + hashToRange(userId + ":neutral", 10);
  }

  return {
    face:      hashToRange(userId + ":face", 15),
    eye:       hashToRange(userId + ":eye", 13),
    eyebrow:   hashToRange(userId + ":eyebrow", 15),
    nose:      hashToRange(userId + ":nose", 13),
    accessory: 0,  // user can customise later
    detail:    hashToRange(userId + ":detail", 12),
    glass,
    hair,
    beard,
    mouth,
    bgColor:   BG_BY_SKIN[traits.skinTone] ?? "#f3e0c8",
    shape:     "circle",
  };
}

// ─── Random config (for getRandomConfig equivalent) ──────────────────────────

export function getRandomNotionConfig(): NotionAvatarConfig {
  const rand = () => Math.random().toString(36).slice(2);
  return {
    face:      Math.floor(Math.random() * 16),
    eye:       Math.floor(Math.random() * 14),
    eyebrow:   Math.floor(Math.random() * 16),
    glass:     Math.random() > 0.7 ? Math.floor(Math.random() * 14) : 0,
    hair:      Math.floor(Math.random() * 58),
    mouth:     Math.floor(Math.random() * 20),
    nose:      Math.floor(Math.random() * 14),
    accessory: 0,
    beard:     Math.random() > 0.7 ? Math.floor(Math.random() * 16) : 0,
    detail:    Math.floor(Math.random() * 13),
    bgColor:   "#f3e0c8",
    shape:     "circle",
    ...(void rand(), {}),
  };
}

// ─── Server-side SVG generation ───────────────────────────────────────────────
// Uses exact same logic as Mayandev/notion-avatar src/pages/api/common/index.ts
// Parts are read from public/notion-avatar-parts/{part}/{index}.svg (1080×1080)

const PARTS_DIR = path.resolve(__dirname, "../../public/notion-avatar-parts");

// Maps our internal config keys → folder names used by the upstream repo
const PART_FOLDER: Record<string, string> = {
  face:      "face",
  nose:      "nose",
  mouth:     "mouth",
  eye:       "eyes",
  eyebrow:   "eyebrows",
  beard:     "beard",
  glass:     "glasses",
  accessory: "accessories",
  detail:    "details",
  hair:      "hair",
};

function readPartContent(part: string, index: number): string {
  const folder   = PART_FOLDER[part];
  if (!folder) return "";
  const filePath = path.join(PARTS_DIR, folder, `${index}.svg`);
  if (!fs.existsSync(filePath)) return "";
  const raw = fs.readFileSync(filePath, "utf-8");
  // Strip outer <svg> wrapper — keep only inner content (same as upstream)
  return raw.replace(/<svg[^>]*>/i, "").replace(/<\/svg>/i, "");
}

export function generateNotionSVG(config: NotionAvatarConfig): string {
  if (!fs.existsSync(PARTS_DIR)) {
    return generateFallbackSVG(config);
  }

  const bg    = config.bgColor;
  const isCircle = config.shape === "circle";

  // Map config keys to part entries — same order as upstream
  const partEntries: Array<[string, number]> = [
    ["face",      config.face],
    ["eye",       config.eye],
    ["eyebrow",   config.eyebrow],
    ["nose",      config.nose],
    ["mouth",     config.mouth],
    ["beard",     config.beard],
    ["glass",     config.glass],
    ["accessory", config.accessory],
    ["detail",    config.detail],
    ["hair",      config.hair],
  ];

  const groups = partEntries
    .map(([part, index]) => {
      const content = readPartContent(part, index);
      if (!content.trim()) return "";
      const faceAttr = part === "face" ? ` fill="#ffffff"` : "";
      return `<g id="notion-avatar-${part}"${faceAttr}>${content}</g>`;
    })
    .filter(Boolean)
    .join("\n");

  // Background + clip shape
  const bgLayer = isCircle
    ? `<circle cx="540" cy="540" r="540" fill="${bg}"/>`
    : `<rect width="1080" height="1080" rx="162" fill="${bg}"/>`;

  // Exact feColorMatrix filter from upstream for crisp line rendering
  return `<svg viewBox="0 0 1080 1080" fill="none" xmlns="http://www.w3.org/2000/svg" width="1080" height="1080">
  <defs>
    <filter id="filter" x="-20%" y="-20%" width="140%" height="140%" filterUnits="objectBoundingBox" primitiveUnits="userSpaceOnUse" color-interpolation-filters="linearRGB">
      <feColorMatrix type="matrix" values="1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 20 -10" in="SourceGraphic" result="colormatrix"/>
      <feBlend mode="normal" in="SourceGraphic" in2="colormatrix" result="blend"/>
    </filter>
    <clipPath id="avatar-clip">${isCircle ? `<circle cx="540" cy="540" r="540"/>` : `<rect width="1080" height="1080" rx="162"/>`}</clipPath>
  </defs>
  <g clip-path="url(#avatar-clip)">
    ${bgLayer}
    <g id="notion-avatar" filter="url(#filter)">
      ${groups}
    </g>
  </g>
</svg>`;
}

// Fallback SVG when no part files are installed — renders initials-style avatar
function generateFallbackSVG(config: NotionAvatarConfig): string {
  const bg = config.bgColor;
  const shape = config.shape === "circle"
    ? `<circle cx="540" cy="540" r="540" fill="${bg}"/>`
    : `<rect width="1080" height="1080" fill="${bg}" rx="160"/>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1080" viewBox="0 0 1080 1080">
  ${shape}
  <ellipse cx="540" cy="520" rx="220" ry="250" fill="#fcd5b5"/>
  <circle cx="470" cy="460" r="28" fill="#333"/>
  <circle cx="610" cy="460" r="28" fill="#333"/>
  <path d="M 470 580 Q 540 640 610 580" stroke="#333" stroke-width="12" fill="none" stroke-linecap="round"/>
  <ellipse cx="540" cy="290" rx="220" ry="130" fill="#4a3728"/>
</svg>`;
}

// ─── SVG → PNG rasterization (for hero cards) ────────────────────────────────

export async function rasterizeNotionSVG(svgString: string, size = 512): Promise<Buffer> {
  const sharp = (await import("sharp")).default;
  return sharp(Buffer.from(svgString))
    .resize(size, size)
    .png()
    .toBuffer();
}

// ─── Full pipeline: traits → config → SVG ────────────────────────────────────

export function generateBitmojiFromTraits(
  traits: VisualTraits,
  userId: string,
): BitmojiAvatarResult {
  const config    = traitsToNotionConfig(traits, userId);
  const svgString = generateNotionSVG(config);
  return { config, svgString, traits, userId };
}
