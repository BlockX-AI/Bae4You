/**
 * Bitmoji Service — Public API wrapper for bitmoji-avatar.ts
 *
 * Provides the `generateBitmojiFromPhoto` function expected by bitmoji-test.ts
 * and any external callers. Internally delegates to:
 *   - ai-avatar.ts   (analyzeGenderFromImage + extractVisualTraits)
 *   - bitmoji-avatar.ts (trait mapping + SVG generation + rasterization)
 */

import { analyzeGenderFromImage, extractVisualTraits } from "./ai-avatar";
import {
  traitsToNotionConfig,
  generateNotionSVG,
  rasterizeNotionSVG,
  getRandomNotionConfig,
  type NotionAvatarConfig,
  type BitmojiAvatarResult,
} from "./bitmoji-avatar";
import type { Gender, VisualTraits } from "./ai-avatar";

// ─── Input options ────────────────────────────────────────────────────────────

export interface GenerateBitmojiOptions {
  style?:           "avataaars" | "notion" | "notionAvatar";
  gender?:          "male" | "female" | undefined;
  generateStickers?: boolean;
  stickerSize?:     number;
  avatarSize?:      number;
  debug?:           boolean;
  hfToken?:         string;
  userId?:          string;
}

// ─── Output shape (matches bitmoji-test.ts expectations) ─────────────────────

export interface StickerOutput {
  type:   string;
  size:   number;
  buffer: Buffer;
  svg:    string;
}

export interface BitmojiOutput {
  avatar: {
    buffer: Buffer;
    size:   number;
    format: "png";
    svg:    string;
    config: NotionAvatarConfig;
  };
  style:      string;
  stickers:   StickerOutput[];
  timestamp:  number;
  features: {
    gender:     string;
    faceShape:  string;
    skinTone:   string;
    hairColor:  string;
    eyeColor:   string;
    hasGlasses: boolean;
    hasBeard:   boolean;
    expression: string;
    confidence: number;
  };
  traits: VisualTraits;
  config: NotionAvatarConfig;
}

// Sticker expression variants to generate
const STICKER_TYPES = [
  { type: "smile",   expressionOverride: "warm-smile" as const },
  { type: "neutral", expressionOverride: "neutral"    as const },
  { type: "serious", expressionOverride: "serious"    as const },
];

// ─── Main export ──────────────────────────────────────────────────────────────

export async function generateBitmojiFromPhoto(
  photoBuffer: Buffer,
  opts: GenerateBitmojiOptions = {},
): Promise<BitmojiOutput> {
  const {
    generateStickers = false,
    stickerSize      = 256,
    avatarSize       = 512,
    debug            = false,
    hfToken,
    userId           = `anon-${Date.now()}`,
  } = opts;

  if (debug) console.log("[bitmoji-service] Analysing gender...");

  // 1. Gender analysis
  const genderResult = await analyzeGenderFromImage(
    photoBuffer, "image/jpeg", hfToken,
  ).catch(() => ({
    gender: (opts.gender ?? "other") as Gender,
    confidence: 0,
    provider: "fallback",
  }));

  const gender: Gender = opts.gender
    ? (opts.gender as Gender)
    : genderResult.gender;

  if (debug) console.log("[bitmoji-service] Gender:", gender, `(${(genderResult.confidence * 100).toFixed(1)}%)`);

  // 2. Visual trait extraction
  if (debug) console.log("[bitmoji-service] Extracting visual traits...");
  const traits = await extractVisualTraits(photoBuffer, gender, genderResult.confidence);
  if (debug) console.log("[bitmoji-service] Traits:", traits);

  // 3. Map traits → Notion Avatar config
  const config    = traitsToNotionConfig(traits, userId);
  const svgString = generateNotionSVG(config);

  if (debug) console.log("[bitmoji-service] Config:", config);

  // 4. Rasterize avatar
  if (debug) console.log("[bitmoji-service] Rasterizing avatar...");
  const avatarBuffer = await rasterizeNotionSVG(svgString, avatarSize);

  // 5. Stickers (expression variants)
  const stickers: StickerOutput[] = [];
  if (generateStickers) {
    if (debug) console.log("[bitmoji-service] Generating stickers...");
    for (const { type, expressionOverride } of STICKER_TYPES) {
      const stickerTraits = { ...traits, expression: expressionOverride };
      const stickerConfig = traitsToNotionConfig(stickerTraits, userId + `:sticker:${type}`);
      const stickerSvg    = generateNotionSVG(stickerConfig);
      const stickerBuffer = await rasterizeNotionSVG(stickerSvg, stickerSize);
      stickers.push({ type, size: stickerSize, buffer: stickerBuffer, svg: stickerSvg });
    }
  }

  return {
    avatar: {
      buffer: avatarBuffer,
      size:   avatarSize,
      format: "png",
      svg:    svgString,
      config,
    },
    style:     "notion-avatar",
    stickers,
    timestamp: Date.now(),
    features: {
      gender:     traits.gender,
      faceShape:  "oval",  // Notion avatars use preset face shapes; pixel analysis doesn't detect face shape
      skinTone:   traits.skinTone,
      hairColor:  traits.hairColour,
      eyeColor:   "brown",  // not detected by pixel analysis
      hasGlasses: traits.hasGlasses,
      hasBeard:   traits.hasBeard,
      expression: traits.expression,
      confidence: traits.genderConf,
    },
    traits,
    config,
  };
}

export {
  traitsToNotionConfig,
  generateNotionSVG,
  rasterizeNotionSVG,
  getRandomNotionConfig,
  type NotionAvatarConfig,
  type BitmojiAvatarResult,
};
