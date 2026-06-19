/**
 * AI Avatar Generation Service — Personality-Driven Prompt Engineering
 *
 * Converts a user's uploaded photo into a Spider-Verse / Gen-Z NFT portrait
 * that looks UNIQUE per person by extracting visual personality traits from
 * the photo using pixel-level sharp analysis + HuggingFace gender classifier.
 *
 * Analysis pipeline (all free, no extra APIs):
 *   1. Gender classification  → rizvandwiki/gender-classification (HF)
 *   2. Skin tone              → sharp pixel sampling from face region
 *   3. Hair colour            → sharp pixel sampling from top region
 *   4. Age class              → contrast / grey-ratio heuristic in face crop
 *   5. Accessory / vibe hints → saturation + edge density heuristics
 *
 * Generation providers (auto-selected):
 *   A. fal.ai FLUX dev img2img  — FAL_KEY with credits (~$0.03/img)
 *   B. HuggingFace FLUX.1-schnell text-to-image — HUGGINGFACE_TOKEN (free)
 */

import sharp from "sharp";
import { fal } from "@fal-ai/client";
import { GoogleGenAI } from "@google/genai";
import { HfInference } from "@huggingface/inference";

export type Gender = "male" | "female" | "other";
export type AvatarArtStyle = "cosmic" | "noir-glamour";

// ─── Visual trait types ────────────────────────────────────────────────────────

export type SkinTone   = "fair" | "warm-ivory" | "olive" | "medium-brown" | "warm-brown" | "deep-brown" | "dark";
export type HairColour = "jet-black" | "dark-brown" | "medium-brown" | "auburn" | "silver-grey" | "white" | "light";
export type AgeClass   = "teen" | "young-adult" | "adult" | "mature" | "elder";

// Detected ethnic/regional background — derived from pixel analysis (skin hue, nose width, eye lid pattern)
export type EthnicRegion =
  | "east-asian"          // Korean, Japanese, Chinese, Taiwanese
  | "south-asian"         // Indian, Pakistani, Bangladeshi, Sri Lankan
  | "southeast-asian"     // Filipino, Thai, Vietnamese, Indonesian, Malaysian
  | "middle-eastern"      // Arab, Persian, Turkish, Israeli
  | "northern-european"   // Scandinavian, British, German, Dutch, Irish
  | "southern-european"   // Italian, Spanish, Greek, Portuguese
  | "african"             // Sub-Saharan African (West, East, Central, South)
  | "latin-american";     // Hispanic/Latino — warm mixed-heritage

export interface VisualTraits {
  gender:      Gender;
  genderConf:  number;
  skinTone:    SkinTone;
  hairColour:  HairColour;
  ageClass:    AgeClass;
  hasGlasses:  boolean;   // high edge density in eye region
  hasBeard:    boolean;   // grey/brown density in lower-face region
  expression:  "warm-smile" | "neutral" | "serious";
  dominantClothingHex: string;
  ethnicRegion:        EthnicRegion;   // detected from skin hue + nose width + eye pattern
}

export interface GenderAnalysisResult {
  gender:     Gender;
  confidence: number;
  provider:   string;
}

export interface AiAvatarResult {
  buffer:   Buffer;
  mimeType: "image/png";
  prompt:   string;
  gender:   Gender;
  traits:   VisualTraits;
  seed:     number;
  provider: string;
}

// ─── Global art style anchor ───────────────────────────────────────────────────

const ART_STYLE =
  "cosmic Gen-Z NFT trading card portrait, bold india-ink outlines, " +
  "halftone dot shadows, neon glitch colour fringe, " +
  "deep-space galaxy background with detailed nebulae, swirling cosmic dust, " +
  "complex planetary rings, luminous stardust particles, " +
  "celestial cosmic energy aura radiating from the subject as a light source, " +
  "multi-source lighting with cool blue rim light and warm golden face illumination, " +
  "dramatic chiaroscuro contrast, volumetric light beams, " +
  "highly detailed hair with individual strand texture, " +
  "clothing with intricate fold rendering and fabric texture, " +
  "galaxy background interacting with the figure, energy wisps connecting subject to nebulae, " +
  "comic panel energy, hand-painted brush texture blended with sculpted 3-D anatomy, " +
  "highly detailed digital illustration, 1024×1024 square, studio portrait framing";

const NOIR_ART_STYLE =
  "high-contrast black and white noir portrait illustration, dramatic chiaroscuro lighting with deep velvet shadows and bright key-light highlights, " +
  "1940s Hollywood glamour aesthetic, sharp clean ink line work blended with charcoal shading, single side key light carving the face, " +
  "half-face in shadow, smoky atmospheric background with subtle film grain, smoldering serious expression with slight head tilt, " +
  "sharp tailored silhouette, professional studio portrait framing, hand-drawn graphite feel with crisp vector edges, " +
  "monochrome with the faintest warm sepia undertone, 1024x1024 square";

const NEGATIVE_PROMPT =
  "photorealistic, photograph, 3d render, blurry, low quality, " +
  "watermark, text, logo, ugly, extra limbs, bad anatomy, nsfw, nude, " +
  "generic face, same face, " +
  "blue eyes, green eyes, grey eyes, " +
  "silver hair, white hair, blonde hair, platinum hair, " +
  "pale skin, white skin, freckles, european features, " +
  "anime, manga, cartoon, flat colours";

// Region-specific negative prompt suppressions to prevent invented features
function buildNegativePrompt(ethnicRegion: EthnicRegion): string {
  const extra: Record<EthnicRegion, string> = {
    "east-asian":        "brown skin, dark skin, thick nose, heavy jaw",
    "south-asian":       "pale skin, fair skin, thin lips, narrow nose, blue eyes, green eyes, silver hair, blonde hair",
    "southeast-asian":   "pale skin, narrow nose, thin lips",
    "middle-eastern":    "pale skin, thin nose, blue eyes, silver hair, blonde hair",
    "northern-european": "dark skin, brown skin, thick nose",
    "southern-european": "pale skin, blue eyes, blonde hair",
    "african":           "pale skin, fair skin, thin lips, narrow nose",
    "latin-american":    "pale skin, blue eyes, silver hair",
  };
  return NEGATIVE_PROMPT + ", " + (extra[ethnicRegion] ?? "");
}

const NOIR_NEGATIVE_PROMPT =
  "color, vibrant colors, neon, rainbow, photorealistic, photograph, blurry, " +
  "low quality, watermark, text, deformed, anime, cartoon, manga, chibi, " +
  "flat lighting, soft lighting, even lighting, cosmic, galaxy, stars, " +
  "nebula, sci-fi, fantasy, bright background, daytime, sunny";

function buildStyleNegativePrompt(style: AvatarArtStyle, ethnicRegion: EthnicRegion): string {
  return style === "noir-glamour" ? NOIR_NEGATIVE_PROMPT : buildNegativePrompt(ethnicRegion);
}

function buildGeminiIdentityPrompt(style: AvatarArtStyle): string {
  if (style === "noir-glamour") {
    return "Transform the person in the reference image into a high-contrast black-and-white noir glamour portrait. Preserve the same facial identity, face shape, skin tone, hairstyle, eyebrows, eyes, nose, lips, and expression. Use dramatic chiaroscuro lighting, half-face shadow, charcoal texture, subtle film grain, and 1940s Hollywood studio framing. Do not change gender, age, ethnicity, facial structure, or hair color. Square 1024x1024 portrait.";
  }

  return "Transform the person in the reference image into a stylized cosmic Gen-Z comic avatar. Preserve the same facial identity, face shape, skin tone, hairstyle, eyebrows, eyes, nose, lips, and expression. Use bold ink outlines, halftone shadows, neon rim lighting, and a deep-space galaxy background. Do not change gender, age, ethnicity, facial structure, or hair color. Square 1024x1024 avatar portrait.";
}

// ─── Prompt vocabulary maps ────────────────────────────────────────────────────

const SKIN_DESC: Record<SkinTone, string> = {
  "fair":         "fair porcelain skin with cool rosy-pink undertones",
  "warm-ivory":   "warm ivory skin with soft golden-yellow undertones",
  "olive":        "warm olive skin with golden-green undertones",
  "medium-brown": "medium warm-brown skin with rich amber undertones",
  "warm-brown":   "rich warm brown skin with deep caramel and amber undertones",
  "deep-brown":   "deep brown skin with warm mahogany and copper undertones",
  "dark":         "deep rich dark skin with cool blue-black undertones",
};

const HAIR_DESC: Record<HairColour, string> = {
  "jet-black":    "short jet-black hair with sharp clean lines",
  "dark-brown":   "dark chestnut-brown hair",
  "medium-brown": "medium warm-brown hair",
  "auburn":       "auburn reddish-brown hair",
  "silver-grey":  "distinguished silver-grey hair, salt-and-pepper streaks",
  "white":        "bright white or platinum hair",
  "light":        "light sandy or blonde hair",
};

const AGE_VIBE: Record<AgeClass, string> = {
  "teen":        "Gen-Z teenager, soft round face, youthful glowing skin, trendy energy",
  "young-adult": "Gen-Z young adult in early 20s, smooth defined features, fresh confident look",
  "adult":       "Gen-Z adult in mid-20s, sharp defined features, confident modern look, youthful energy",
  "mature":      "young adult in late 20s, defined strong features, cool modern vibe",
  "elder":       "stylish young adult, sharp expressive features, bold Gen-Z presence",
};

// ─── Pixel-level image analysis (sharp-based, zero API cost) ─────────────────

export async function extractVisualTraits(
  photoBuffer: Buffer,
  gender:      Gender,
  genderConf:  number,
): Promise<VisualTraits> {
  const img   = sharp(photoBuffer);
  const meta  = await img.metadata();
  const w     = meta.width  ?? 256;
  const h     = meta.height ?? 256;

  const SIZE  = 256;  // normalised working size
  const base  = sharp(photoBuffer).resize(SIZE, SIZE, { fit: "cover", position: "centre" });

  // ── 1. Full-image stats (raw) ─────────────────────────────────────────────
  const { channels: fullCh } = await base.clone().raw().toBuffer({ resolveWithObject: true })
    .then(({ info }) => ({ channels: info.channels }));
  const isColor = fullCh >= 3;

  // ── 2. Face crop: y=25–65%, x=20–80% → skin tone (skin-filtered average)
  // Narrower x-range (60% width) keeps us on the face and away from side backgrounds.
  // Starts at y=25% to clear the hairline on most portrait photos.
  // averageSkinPixels() filters out hair, background, overexposed pixels.
  const faceCropBuf = await base.clone()
    .extract({ left: Math.round(SIZE * 0.20), top: Math.round(SIZE * 0.25),
                width: Math.round(SIZE * 0.60), height: Math.round(SIZE * 0.40) })
    .raw().toBuffer();

  const skin = averageSkinPixels(faceCropBuf, isColor ? 3 : 1);
  const skinTone = classifySkinTone(skin.r, skin.g, skin.b);

  // ── 3. Top strip: y=0–12% → hair colour ──────────────────────────────────
  const hairBuf = await base.clone()
    .extract({ left: Math.round(SIZE * 0.10), top: 2,
                width: Math.round(SIZE * 0.80), height: Math.round(SIZE * 0.12) })
    .raw().toBuffer();

  const hair = averageRGB(hairBuf, isColor ? 3 : 1);
  const hairColour = classifyHairColour(hair.r, hair.g, hair.b);

  // ── 4. Lower-face crop: y=55–85% → beard hint ────────────────────────────
  const chinBuf = await base.clone()
    .extract({ left: Math.round(SIZE * 0.20), top: Math.round(SIZE * 0.55),
                width: Math.round(SIZE * 0.60), height: Math.round(SIZE * 0.30) })
    .raw().toBuffer();

  const chin = averageRGB(chinBuf, isColor ? 3 : 1);
  // beard hint: lower chin region noticeably darker / more saturated than forehead
  const chinDark = chin.r < 140;
  const hasBeard = gender === "male" && chinDark && (chin.r - chin.b) > 8;

  // ── 5. Eye strip: y=30–50% → glasses hint (edge density) ─────────────────
  const eyeBuf = await base.clone()
    .extract({ left: Math.round(SIZE * 0.10), top: Math.round(SIZE * 0.30),
                width: Math.round(SIZE * 0.80), height: Math.round(SIZE * 0.20) })
    .greyscale().raw().toBuffer();

  const edgeDensity = estimateEdgeDensity(eyeBuf);
  const hasGlasses  = edgeDensity > 0.14;   // frames add strong horizontal edges

  // ── 6. Age class — grey ratio of hair region ──────────────────────────────
  const hairSat     = rgbSaturation(hair.r, hair.g, hair.b);
  const hairBright  = (hair.r + hair.g + hair.b) / 3;
  const ageClass    = classifyAge(hairSat, hairBright, hairColour);

  // ── 7. Expression — smile hint (lower-face brightness spread) ────────────
  const mouthBuf = await base.clone()
    .extract({ left: Math.round(SIZE * 0.25), top: Math.round(SIZE * 0.68),
                width: Math.round(SIZE * 0.50), height: Math.round(SIZE * 0.15) })
    .raw().toBuffer();

  const mouth = averageRGB(mouthBuf, isColor ? 3 : 1);
  const expression = mouth.r > 155 ? "warm-smile" : mouth.r < 100 ? "serious" : "neutral";

  // ── 8. Clothing colour (bottom strip) ────────────────────────────────────
  const clothBuf = await base.clone()
    .extract({ left: 0, top: Math.round(SIZE * 0.82),
                width: SIZE, height: Math.round(SIZE * 0.15) })
    .raw().toBuffer();

  const cloth = averageRGB(clothBuf, isColor ? 3 : 1);
  const dominantClothingHex = rgbToHex(cloth.r, cloth.g, cloth.b);

  // ── 9. Nose width ratio — skin-pixel density across nose-level horizontal strip ──────
  const noseBuf = await base.clone()
    .extract({ left: Math.round(SIZE * 0.10), top: Math.round(SIZE * 0.50),
                width: Math.round(SIZE * 0.80), height: Math.round(SIZE * 0.10) })
    .raw().toBuffer();
  const noseTotalPx    = Math.round(SIZE * 0.80) * Math.round(SIZE * 0.10);
  const noseWidthRatio = countSkinPixels(noseBuf, isColor ? 3 : 1) / (noseTotalPx || 1);

  // ── 10. Skin hue from face crop (yellow vs. pink undertone) ─────────────────────
  const { h: skinHue, l: skinLightness } = rgbToHsl(skin.r, skin.g, skin.b);

  // ── 11. Ethnic region from all combined signals ─────────────────────────────
  const ethnicRegion = detectEthnicRegion(
    skinTone, skinHue, skinLightness, (skin.r - skin.b) / 255,
    edgeDensity, noseWidthRatio,
  );

  void w; void h;

  // ── 12. Statistical hair-colour correction ─────────────────────────────────
  // Pixel heuristic misreads jet-black hair as silver/grey when the background
  // is brighter than the hair. Apply high-confidence correction: dark-skinned
  // people almost never have naturally silver/white/light hair in their 20s–30s.
  let correctedHairColour = hairColour;
  if (
    (skinTone === "warm-brown" || skinTone === "medium-brown" || skinTone === "deep-brown" ||
     skinTone === "dark" || skinTone === "olive") &&
    (hairColour === "silver-grey" || hairColour === "white" || hairColour === "light")
  ) {
    correctedHairColour = "jet-black";  // statistical override
  }

  return {
    gender, genderConf,
    skinTone, hairColour: correctedHairColour, ageClass,
    hasGlasses, hasBeard, expression,
    dominantClothingHex, ethnicRegion,
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function averageRGB(buf: Buffer, channels: number): { r: number; g: number; b: number } {
  let r = 0, g = 0, b = 0, n = 0;
  if (channels === 1) {
    for (let i = 0; i < buf.length; i++) { r += buf[i]; n++; }
    const v = r / (n || 1);
    return { r: v, g: v, b: v };
  }
  for (let i = 0; i + 2 < buf.length; i += channels) {
    r += buf[i]; g += buf[i + 1]; b += buf[i + 2]; n++;
  }
  const d = n || 1;
  return { r: r / d, g: g / d, b: b / d };
}

// Skin-filtered average: ignores hair (dark), background, and over-exposed pixels.
// Only averages pixels that pass a broad skin-tone heuristic.
// Key guards:
//   - red-dominant + warm (pr >= pg >= pb)
//   - g/b ratio < 1.40: skin has modest g:b drop; warm wood/backgrounds have g/b > 1.40
//   - brightness in human-skin range (55–235)
// Falls back to neutral warm-ivory if no valid pixels found.
function averageSkinPixels(buf: Buffer, channels: number): { r: number; g: number; b: number } {
  let r = 0, g = 0, b = 0, n = 0;
  const stride = Math.max(1, channels);
  for (let i = 0; i + (channels >= 3 ? 2 : 0) < buf.length; i += stride) {
    const pr = buf[i] as number;
    const pg = channels >= 3 ? (buf[i + 1] as number) : pr;
    const pb = channels >= 3 ? (buf[i + 2] as number) : pr;
    const bright = (pr + pg + pb) / 3;
    if (pr > 55 && pg > 35 && pb > 18 &&
        pr >= pg && pr >= pb &&
        (pr - Math.min(pg, pb)) > 8 &&
        pb > 0 && pg < pb * 1.40 &&  // g/b < 1.40 excludes warm wood/tan backgrounds
        bright > 55 && bright < 235) {
      r += pr; g += pg; b += pb; n++;
    }
  }
  if (n === 0) return { r: 200, g: 165, b: 140 };  // warm-ivory fallback
  return { r: r / n, g: g / n, b: b / n };
}

function rgbSaturation(r: number, g: number, b: number): number {
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  return max === 0 ? 0 : (max - min) / max;
}

function estimateEdgeDensity(greyscaleBuf: Buffer): number {
  let edges = 0;
  for (let i = 1; i < greyscaleBuf.length; i++) {
    if (Math.abs(greyscaleBuf[i] - greyscaleBuf[i - 1]) > 40) edges++;
  }
  return edges / (greyscaleBuf.length || 1);
}

function rgbToHex(r: number, g: number, b: number): string {
  const hex = (v: number) => Math.round(v).toString(16).padStart(2, "0");
  return `#${hex(r)}${hex(g)}${hex(b)}`;
}

function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
  const rN = r / 255, gN = g / 255, bN = b / 255;
  const max = Math.max(rN, gN, bN), min = Math.min(rN, gN, bN);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l };
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h: number;
  if (max === rN)       h = ((gN - bN) / d + (gN < bN ? 6 : 0)) / 6;
  else if (max === gN)  h = ((bN - rN) / d + 2) / 6;
  else                  h = ((rN - gN) / d + 4) / 6;
  return { h, s, l };
}

function classifySkinTone(r: number, g: number, b: number): SkinTone {
  const { l } = rgbToHsl(r, g, b);
  const warm = (r - b) / 255;           // 0–1 warmth (red minus blue channel)

  if (l > 0.80)                          return "fair";
  if (l > 0.68 && warm < 0.18)          return "fair";
  if (l > 0.68)                          return "warm-ivory";   // light + warm → East Asian / N.European warm
  if (l > 0.56 && warm < 0.26)          return "warm-ivory";
  if (l > 0.56)                          return "olive";         // medium-light + warm → Mediterranean / Latin
  if (l > 0.44 && warm < 0.30)          return "olive";
  if (l > 0.44)                          return "medium-brown";  // medium + warm → diverse mid-range
  if (l > 0.32 && warm < 0.34)          return "medium-brown";
  if (l > 0.32)                          return "warm-brown";
  if (l > 0.18)                          return "deep-brown";
  return "dark";
}

function classifyHairColour(r: number, g: number, b: number): HairColour {
  const bright = (r + g + b) / 3;
  const sat    = rgbSaturation(r, g, b);
  if (bright > 200)                               return "white";
  if (bright > 155 && sat < 0.10)                return "silver-grey";
  if (bright > 140 && sat < 0.18)                return "light";
  // Auburn requires genuine redness (sat > 0.20) — guards against JPEG compression
  // artifacts that inflate red channel on dark hair in small thumbnails.
  if (bright > 100 && r > g && r > b && sat > 0.20) return "auburn";
  if (bright > 75  && sat < 0.30)                return "medium-brown";
  if (bright > 30  && sat < 0.40)                return "dark-brown";
  return "jet-black";
}

function classifyAge(hairSat: number, hairBright: number, hairColour: HairColour): AgeClass {
  if (hairColour === "white" || hairColour === "silver-grey") {
    return hairBright > 175 ? "elder" : "mature";
  }
  if (hairSat < 0.15 && hairBright > 130) return "mature";
  if (hairBright > 200)                   return "teen";
  return "young-adult";
}

// Count pixels in a raw buffer that match a broad skin-tone heuristic
function countSkinPixels(buf: Buffer, channels: number): number {
  let count = 0;
  const stride = Math.max(1, channels);
  for (let i = 0; i + (channels >= 3 ? 2 : 0) < buf.length; i += stride) {
    const r = buf[i] as number;
    const g = channels >= 3 ? (buf[i + 1] as number) : r;
    const b = channels >= 3 ? (buf[i + 2] as number) : r;
    // Broad skin-pixel criteria (works across all ethnicities)
    if (r > 60 && g > 40 && b > 20 &&
        r > g && r > b &&
        (r - Math.min(g, b)) > 10 &&
        Math.abs(r - g) <= 60) count++;
  }
  return count;
}

// Multi-signal ethnic region scoring
// Inputs: HSL of face-crop avg colour + eye edge density + nose width ratio
function detectEthnicRegion(
  skinTone:       SkinTone,
  skinHue:        number,   // 0–1 HSL hue of face-crop average pixel
  skinL:          number,   // 0–1 HSL lightness
  warmth:         number,   // (r−b)/255 skin warmth
  eyeEdgeDensity: number,   // existing edge-density in eye strip
  noseWidthRatio: number,   // skin-pixel ratio across nose-level strip
): EthnicRegion {

  const s: Record<EthnicRegion, number> = {
    "east-asian": 0, "south-asian": 0, "southeast-asian": 0,
    "middle-eastern": 0, "northern-european": 0, "southern-european": 0,
    "african": 0, "latin-american": 0,
  };

  // ── 1. Skin tone bucket — strongest single signal ─────────────────────────
  switch (skinTone) {
    case "fair":
      s["northern-european"] += 0.50;  s["southern-european"] += 0.15;  break;
    case "warm-ivory":
      s["east-asian"]        += 0.45;  s["northern-european"] += 0.20;
      s["southeast-asian"]   += 0.10;  break;
    case "olive":
      s["southern-european"] += 0.30;  s["middle-eastern"]    += 0.30;
      s["latin-american"]    += 0.20;  s["south-asian"]       += 0.10;  break;
    case "medium-brown":
      s["south-asian"]       += 0.30;  s["southeast-asian"]   += 0.25;
      s["latin-american"]    += 0.20;  s["middle-eastern"]    += 0.10;  break;
    case "warm-brown":
      s["african"]           += 0.30;  s["south-asian"]       += 0.20;
      s["latin-american"]    += 0.15;  s["middle-eastern"]    += 0.10;  break;
    case "deep-brown":
      s["african"]           += 0.55;  s["latin-american"]    += 0.10;  break;
    case "dark":
      s["african"]           += 0.70;  break;
  }

  // ── 2. Skin hue: yellow-orange (h > 0.045) → East/SE Asian ────────────────
  if (skinHue > 0.045 && skinL > 0.58) {
    s["east-asian"]      += 0.22;  s["southeast-asian"] += 0.10;
  } else if (skinHue < 0.025 && skinL > 0.68) {
    s["northern-european"] += 0.22;  // cool-pink, very light = Northern European
  } else if (skinHue > 0.035 && skinL < 0.55) {
    s["south-asian"]     += 0.14;  s["middle-eastern"]   += 0.10;
  }

  // ── 3. Eye lid pattern: low edge density → monolid/hooded (East/SE Asian) ───
  if (eyeEdgeDensity < 0.06) {
    s["east-asian"]      += 0.20;  s["southeast-asian"] += 0.10;
  } else if (eyeEdgeDensity > 0.13) {
    s["northern-european"] += 0.14;  s["african"]        += 0.09;
    s["middle-eastern"]    += 0.09;
  }

  // ── 4. Nose width ratio: wide → African/SE Asian; narrow → European/E.Asian ─
  if (noseWidthRatio > 0.44) {
    s["african"]           += 0.24;  s["southeast-asian"] += 0.12;
  } else if (noseWidthRatio < 0.28) {
    s["northern-european"] += 0.20;  s["east-asian"]      += 0.10;
    s["middle-eastern"]    += 0.07;  // aquiline narrow nose also common
  } else {
    s["south-asian"]       += 0.07;  s["latin-american"]  += 0.07;
    s["southern-european"] += 0.07;
  }

  // Return highest-scoring region
  return (Object.entries(s)
    .sort(([, a], [, b]) => b - a)[0][0]) as EthnicRegion;
}

// ─── Ethnic region descriptors ────────────────────────────────────────────────
// Maps detected ethnicRegion → accurate physical feature descriptions.
// Used by buildPersonalisedPrompt to create region-specific avatar prompts.

export const ETHNIC_REGION_DESCRIPTORS: Record<EthnicRegion, {
  face:     string;
  eyes:     string;
  nose:     string;
  jaw:      string;
  keywords: string;
}> = {
  "east-asian": {
    face:     "smooth oval face, high wide flat cheekbones, smooth broad forehead",
    eyes:     "almond-shaped eyes with delicate single or double eyelid, refined arched brow",
    nose:     "low-bridged delicate refined nose, subtle rounded tip",
    jaw:      "soft defined jaw, smooth narrow pointed chin",
    keywords: "East Asian facial aesthetics, Korean Japanese Chinese appearance, smooth porcelain-to-golden luminous skin",
  },
  "south-asian": {
    face:     "defined oval face, prominent angular cheekbones, strong expressive bone structure",
    eyes:     "large expressive almond eyes, strong dark defined arched brow",
    nose:     "medium-bridged defined prominent nose, slightly flared nostrils",
    jaw:      "strong angular jaw, defined prominent chin",
    keywords: "South Asian facial features, Indian Pakistani appearance, warm golden-to-caramel brown skin",
  },
  "southeast-asian": {
    face:     "broad rounded face, wide prominent flat cheekbones, soft warm features",
    eyes:     "wide-set almond eyes, gentle monolid or soft double lid, wide flat brow",
    nose:     "broad low-bridged nose, wide nostrils, rounded tip",
    jaw:      "rounded broad jaw, soft wide chin",
    keywords: "Southeast Asian facial features, Filipino Thai Vietnamese Indonesian appearance, warm golden-tawny skin",
  },
  "middle-eastern": {
    face:     "strong defined face, high prominent angular cheekbones, bold bone structure",
    eyes:     "large deep-set expressive eyes, heavy defined bold brow ridge",
    nose:     "long prominent nose, defined high bridge, angular refined tip",
    jaw:      "strong angular jaw, defined prominent chin",
    keywords: "Middle Eastern facial features, Arab Persian Turkish appearance, warm olive to golden-brown skin",
  },
  "northern-european": {
    face:     "angular defined face, sharp high cheekbones, prominent defined bone structure",
    eyes:     "wide-set prominent eyes, light defined brow ridge",
    nose:     "narrow straight or slightly aquiline nose, well-defined bridge",
    jaw:      "sharp angular jaw, narrow defined chin",
    keywords: "Northern European facial features, Scandinavian British German appearance, fair cool porcelain skin",
  },
  "southern-european": {
    face:     "oval-to-angular face, defined prominent cheekbones, expressive strong features",
    eyes:     "large expressive dark eyes, strong arched brow, slightly hooded lid",
    nose:     "prominent nose, strong bridge, defined angular tip",
    jaw:      "strong defined jaw, square prominent chin",
    keywords: "Mediterranean Southern European facial features, Italian Spanish Greek appearance, warm olive complexion",
  },
  "african": {
    face:     "strong broad face, wide prominent cheekbones, robust expressive bone structure",
    eyes:     "wide expressive eyes, full heavy brow ridge, prominent orbital area",
    nose:     "broad wide nose, prominent nostrils, flat low bridge",
    jaw:      "strong broad jaw, defined prominent chin, naturally full lips",
    keywords: "African facial features, West East African appearance, rich deep warm mahogany-to-ebony skin",
  },
  "latin-american": {
    face:     "oval-to-round face, warm prominent cheekbones, mixed expressive features",
    eyes:     "large expressive eyes, full defined dark brow, warm energy",
    nose:     "medium-to-broad nose, rounded tip, medium bridge",
    jaw:      "rounded strong jaw, warm full features, defined chin",
    keywords: "Latin American facial features, Hispanic Latino appearance, warm mixed-heritage golden-to-caramel skin",
  },
};

// ─── Personalised prompt builder ──────────────────────────────────────────────

export function buildPersonalisedPrompt(traits: VisualTraits, style: AvatarArtStyle = "cosmic"): string {
  const { gender, skinTone, hairColour, ageClass, hasGlasses, hasBeard,
          expression, dominantClothingHex, ethnicRegion } = traits;

  const rand      = Math.random().toString(36).slice(2, 7);
  const hairStyle = ["short and neat", "messy textured", "swept back", "side-parted", "natural flow"][Math.floor(Math.random() * 5)];

  // Use photo-detected ethnic region — precise, not random
  const region = ETHNIC_REGION_DESCRIPTORS[ethnicRegion];

  const subjectBase = gender === "female"
    ? "A cosmic Gen-Z NFT portrait of a young woman in her 20s"
    : gender === "male"
    ? "A cosmic Gen-Z NFT portrait of a young man in his 20s"
    : "A cosmic Gen-Z NFT portrait of a young person in their 20s";

  const skinDesc    = SKIN_DESC[skinTone];
  const hairDesc    = `${HAIR_DESC[hairColour]}, ${hairStyle}`;
  const ageDesc     = AGE_VIBE[ageClass];
  const glassesDesc = hasGlasses ? "wearing stylised thick-framed statement glasses, " : "";
  const beardDesc   = hasBeard   ? "with a well-groomed beard drawn in bold ink strokes, " : "";
  const exprDesc    = expression === "warm-smile"
    ? "radiating a warm confident smile, joyful exuberant energy, "
    : expression === "serious"
    ? "with a focused serious intense expression, commanding aura, "
    : "with a calm composed neutral expression, ";

  const paletteHint    = `accent colour drawn from clothing tones near ${dominantClothingHex}, vibrant neon-magenta pink background`;
  const uniquenessToken = `[uid:${skinTone}-${ethnicRegion}-${hairColour}-${rand}]`;
  const artStyle = style === "noir-glamour" ? NOIR_ART_STYLE : ART_STYLE;
  const stylePaletteHint = style === "noir-glamour"
    ? "monochrome black-and-white palette, faint warm sepia undertone, no neon colours"
    : paletteHint;

  // Focused 80-token prompt — FLUX ignores tokens >~150, so prioritise the
  // 5 most confident traits + art style anchor. Full face/ethnic desc is secondary.
  const coreTraits = [
    skinDesc,
    hairDesc,
    hasBeard   ? beardDesc.trim()   : null,
    hasGlasses ? glassesDesc.trim() : null,
    exprDesc.trim(),
    region.keywords,
  ].filter(Boolean).join(", ");

  return (
    `${subjectBase}, ${coreTraits}, ` +
    `${artStyle}, ${stylePaletteHint}. ` +
    `${uniquenessToken}.`
  );
}

// ─── Gender analysis (HuggingFace — confirmed working) ────────────────────────

export async function analyzeGenderFromImage(
  photoBuffer: Buffer,
  mimeType:    string,
  hfToken?:    string,
): Promise<GenderAnalysisResult> {
  if (!hfToken) return { gender: "other", confidence: 0, provider: "none" };

  const hf   = new HfInference(hfToken);
  const data = new Blob([new Uint8Array(photoBuffer)], { type: mimeType });

  const result = await hf.imageClassification({
    model: "rizvandwiki/gender-classification",
    data,
  });

  const best   = [...result].sort((a, b) => b.score - a.score)[0];
  const label  = best?.label?.toLowerCase();
  const gender: Gender = label === "male" || label === "female" ? label : "other";

  return {
    gender,
    confidence: best?.score ?? 0,
    provider: "huggingface/rizvandwiki-gender-classification",
  };
}

// ─── Generation providers ─────────────────────────────────────────────────────

/**
 * fofr/face-to-many — BEST FREE face-preserving avatar generator.
 * Uses InstantID to lock the user's face identity, then applies NFT art style.
 *
 * Free: $5 credit on sign-up (~250 images). After that: ~$0.02/image.
 * Env: REPLICATE_API_TOKEN
 *
 * Style guide per rarity:
 *   common    → "Claymation" (fun, accessible)
 *   rare      → "Anime" (vibrant, popular)
 *   epic      → "Video game" (high-energy)
 *   legendary → "3D" (premium, cinematic)
 */
export type FaceToManyStyle = "3D" | "Emoji" | "Video game" | "Pixels" | "Clay" | "Toy" | "LEGO" | "Anime" | "Claymation" | "Comic";

type ApiStyle = Exclude<FaceToManyStyle, "Comic">;

export interface GeminiImageOptions {
  style?: AvatarArtStyle;
}

/**
 * generateViaGeminiImage — face-preserving avatar generation with Gemini 2.5 Flash Image.
 *
 * Sends the user's selfie as an inlineData reference image plus a short identity-preserving
 * style prompt. Throws on auth, quota, rate-limit, safety, or empty-image responses so
 * generateAiAvatar() can fall through to the next provider in the priority chain.
 *
 * @param photoBuffer Source selfie/photo buffer used as identity reference.
 * @param mimeType MIME type for the source image, e.g. image/jpeg.
 * @param prompt Fallback prompt parameter; Gemini uses a shorter style-specific identity prompt.
 * @param geminiApiKey Google AI Studio / Gemini API key. Never logged.
 * @param options Optional avatar style selection. Defaults to cosmic.
 */
export async function generateViaGeminiImage(
  photoBuffer:   Buffer,
  mimeType:      string,
  prompt:        string,
  geminiApiKey:  string,
  options?:      GeminiImageOptions,
): Promise<Buffer> {
  const ai = new GoogleGenAI({ apiKey: geminiApiKey });
  const style = options?.style ?? "cosmic";
  const identityPrompt = buildGeminiIdentityPrompt(style);

  void prompt;

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-image",
    contents: [{
      role: "user",
      parts: [
        { text: identityPrompt },
        {
          inlineData: {
            mimeType,
            data: photoBuffer.toString("base64"),
          },
        },
      ],
    }],
  });

  const parts = response.candidates?.[0]?.content?.parts ?? [];
  for (const part of parts) {
    const inlineData = part.inlineData;
    if (inlineData?.data) {
      return Buffer.from(inlineData.data, "base64");
    }
  }

  const text = parts.map(part => part.text).filter(Boolean).join(" ").slice(0, 200);
  throw new Error(`Gemini 2.5 Flash Image returned no image${text ? `: ${text}` : ""}`);
}

async function generateViaFaceToMany(
  photoBuffer: Buffer,
  mimeType:    string,
  replicateToken: string,
  style: ApiStyle = "Anime",
  prompt?: string,
): Promise<Buffer> {
  const createResp = await fetch("https://api.replicate.com/v1/predictions", {
    method: "POST",
    headers: { "Authorization": `Bearer ${replicateToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      version: "a07f252abbbd832009640b27f063ea52d87d7a23a185ca165bec23b5adc8deaf",
      input: {
        image:               `data:${mimeType};base64,${photoBuffer.toString("base64")}`,
        style,
        prompt:              prompt ?? "portrait, NFT avatar, vibrant colors, detailed, high quality",
        negative_prompt:     "ugly, blurry, deformed, extra limbs, bad anatomy, watermark",
        instant_id_strength: 0.8,
        guidance_scale:      7.5,
        num_steps:           30,
      },
    }),
  });

  if (!createResp.ok) throw new Error(`face-to-many create error: ${createResp.status}`);

  let pred = await createResp.json() as { id: string; status: string; output?: string[]; error?: string };

  for (let i = 0; i < 40 && pred.status !== "succeeded" && pred.status !== "failed"; i++) {
    await new Promise(r => setTimeout(r, 2500));
    const poll = await fetch(`https://api.replicate.com/v1/predictions/${pred.id}`, {
      headers: { "Authorization": `Bearer ${replicateToken}` },
    });
    pred = await poll.json() as typeof pred;
  }

  if (pred.status !== "succeeded") throw new Error(`face-to-many failed: ${pred.error ?? pred.status}`);

  const imgResp = await fetch(pred.output![0]);
  if (!imgResp.ok) throw new Error("Failed to download face-to-many image");
  return Buffer.from(await imgResp.arrayBuffer());
}

async function generateViaFal(
  photoBuffer: Buffer,
  mimeType:    string,
  prompt:      string,
  falApiKey:   string,
  seed:        number,
): Promise<Buffer> {
  fal.config({ credentials: falApiKey });

  const base64   = photoBuffer.toString("base64");
  const inputUrl = `data:${mimeType};base64,${base64}`;

  const result = await fal.subscribe("fal-ai/flux/dev/image-to-image", {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    input: {
      image_url:            inputUrl,
      prompt,
      negative_prompt:      NEGATIVE_PROMPT,
      strength:             0.55,
      num_images:           1,
      image_size:           "square_hd",
      guidance_scale:       7.5,
      num_inference_steps:  28,
      seed,
      enable_safety_checker: true,
    } as any,
    logs: false,
  });

  const output = result.data as { images?: Array<{ url: string }> };
  if (!output?.images?.length) throw new Error("fal.ai returned no images");

  const res = await fetch(output.images[0].url);
  if (!res.ok) throw new Error(`Failed to download fal.ai image: ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

// ─── fal.ai InstantID — face-preserving stylized avatar ──────────────────────

/**
 * fal-ai/instant-id — Uses InstantID face embedding + SDXL for face-preserving
 * style transfer. Best results for noir-glamour and other artistic styles where
 * the user's actual facial identity must be clearly recognizable.
 *
 * Cost: ~$0.05/image on fal.ai
 * Env: FAL_KEY
 *
 * Parameters:
 *   identitynet_strength_ratio — how much to preserve the face (0.0–1.0, higher = more like the user)
 *   adapter_strength_ratio     — how much to apply the art style (0.0–1.0, higher = more stylized)
 *   guidance_scale             — prompt adherence (higher = stronger style but may distort)
 */
export interface InstantIdParams {
  guidance_scale?:             number;
  num_inference_steps?:        number;
  identitynet_strength_ratio?: number;
  adapter_strength_ratio?:     number;
}

export async function generateViaFalInstantId(
  photoBuffer:    Buffer,
  mimeType:       string,
  prompt:         string,
  negativePrompt: string,
  falApiKey:      string,
  params?:        InstantIdParams,
): Promise<Buffer> {
  fal.config({ credentials: falApiKey });

  const base64   = photoBuffer.toString("base64");
  const inputUrl = `data:${mimeType};base64,${base64}`;

  const result = await fal.subscribe("fal-ai/instant-id", {
    input: {
      face_image_url:              inputUrl,
      prompt,
      negative_prompt:             negativePrompt,
      guidance_scale:              params?.guidance_scale             ?? 5.5,
      num_inference_steps:         params?.num_inference_steps        ?? 30,
      identitynet_strength_ratio:  params?.identitynet_strength_ratio ?? 0.85,
      adapter_strength_ratio:      params?.adapter_strength_ratio     ?? 0.70,
      num_samples:                 1,
    } as any,
    logs: false,
  });

  const output = result.data as { images?: Array<{ url: string }> };
  if (!output?.images?.length) throw new Error("fal.ai InstantID returned no images");

  const res = await fetch(output.images[0].url);
  if (!res.ok) throw new Error(`Failed to download fal.ai InstantID image: ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

async function generateViaReplicate(
  photoBuffer: Buffer,
  mimeType:    string,
  prompt:      string,
  replicateToken: string,
  seed:        number,
  styleImageBuffer?: Buffer,
): Promise<Buffer> {
  const imageBase64 = photoBuffer.toString("base64");
  const dataUrl = `data:${mimeType};base64,${imageBase64}`;

  const response = await fetch("https://api.replicate.com/v1/predictions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${replicateToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      version: "7762fd07cf82c948538e41f63f77d685e02b063e37e496e96eefd46c929f9bdc",
      input: {
        image: dataUrl,
        prompt: prompt,
        negative_prompt: NEGATIVE_PROMPT,
        num_inference_steps: 20,
        strength: 0.5,
        guidance_scale: 7.5,
        seed,
      },
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Replicate API error: ${response.status} - ${err}`);
  }

  const prediction = await response.json() as { urls: { get: string } };

  // Poll for result
  let result: any;
  for (let i = 0; i < 30; i++) {
    await new Promise(r => setTimeout(r, 2000));
    const pollRes = await fetch(prediction.urls.get, {
      headers: { "Authorization": `Bearer ${replicateToken}` },
    });
    result = await pollRes.json();
    if (result.status === "succeeded" || result.status === "failed") break;
  }

  if (result.status !== "succeeded") {
    throw new Error(`Replicate generation failed: ${result.status}`);
  }

  const imageRes = await fetch(result.output[0]);
  if (!imageRes.ok) throw new Error("Failed to download Replicate image");
  return Buffer.from(await imageRes.arrayBuffer());
}

async function generateViaHuggingFace(
  photoBuffer: Buffer,
  mimeType:    string,
  prompt:      string,
  hfToken:     string,
  negativePrompt?: string,
): Promise<Buffer> {
  const hf = new HfInference(hfToken);
  const imageBlob = new Blob([new Uint8Array(photoBuffer)], { type: mimeType });

  // Try multiple models that support img2img on free tier
  const img2imgModels = [
    "stabilityai/stable-diffusion-xl-base-1.0",
    "runwayml/stable-diffusion-v1-5",
    "CompVis/stable-diffusion-v1-4",
  ];

  for (const model of img2imgModels) {
    try {
      const result = await hf.imageToImage({
        model,
        inputs: imageBlob,
        parameters: {
          prompt:              prompt,
          negative_prompt:     negativePrompt || NEGATIVE_PROMPT,
          num_inference_steps: 25,
          strength:            0.35, // Lower strength to preserve more of original photo including gender
          guidance_scale:      8.0, // Higher guidance to follow prompt better
          width:               768,
          height:              768,
        },
      });

      const arrayBuf = await (result as unknown as Blob).arrayBuffer();
      console.log(`[ai-avatar] img2img success via ${model}`);
      return Buffer.from(arrayBuf);
    } catch (err: unknown) {
      console.warn(`[ai-avatar] img2img failed for ${model}:`, err instanceof Error ? err.message.slice(0, 100) : String(err));
    }
  }

  // All img2img models failed - fall back to FLUX.1-dev text-to-image (28 steps, much higher quality)
  console.warn("[ai-avatar] HF img2img models failed, falling back to FLUX.1-dev text-to-image");
  const result = await hf.textToImage({
    model: "black-forest-labs/FLUX.1-dev",
    inputs: prompt,
    parameters: {
      negative_prompt:     negativePrompt || NEGATIVE_PROMPT,
      num_inference_steps: 28,
      guidance_scale:      3.5,
      width:               1024,
      height:              1024,
    },
  });

  const arrayBuf = await (result as unknown as Blob).arrayBuffer();
  return Buffer.from(arrayBuf);
}

// ─── Cloudflare Workers AI ────────────────────────────────────────────────────

/**
 * Generate avatar via Cloudflare Workers AI (free tier — 10k req/day).
 * Uses img2img when photo is provided, otherwise text-to-image.
 */
async function generateViaCloudflare(
  photoBuffer: Buffer,
  prompt:      string,
  accountId:   string,
  apiToken:    string,
  negativePrompt?: string,
): Promise<Buffer> {
  const IMG2IMG_MODEL = "@cf/runwayml/stable-diffusion-v1-5-img2img";
  const TXT2IMG_MODEL = "@cf/bytedance/stable-diffusion-xl-lightning";

  const baseUrl = `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run`;
  const headers  = { "Authorization": `Bearer ${apiToken}`, "Content-Type": "application/json" };

  // Use SDXL-Lightning text-to-image — much better avatar quality than SD v1.5 img2img
  // Photo traits (skin, hair, gender, beard) are already baked into the prompt
  const body = { prompt, num_steps: 20, negative_prompt: negativePrompt || NEGATIVE_PROMPT };
  const res  = await fetch(`${baseUrl}/${TXT2IMG_MODEL}`, { method: "POST", headers, body: JSON.stringify(body) });
  if (!res.ok) throw new Error(`CF text2img ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const buf = Buffer.from(await res.arrayBuffer());
  console.log("[ai-avatar] Cloudflare SDXL-Lightning text-to-image success");
  return buf;
}

// ─── PuLID-FLUX via Modal endpoint ────────────────────────────────────────────

/**
 * generateViaPulidFlux — PuLID-FLUX identity-preserving generation.
 *
 * Calls a Modal serverless function (free $30/month, ~3000-4000 avatars).
 * Falls back gracefully if MODAL_PULID_URL is not set.
 *
 * Modal gives an A10G GPU that can run PuLID-FLUX in ~12-15 seconds.
 * Set env var MODAL_PULID_URL to your deployed endpoint.
 * Set PULID_ENABLED=true to route all styles through this provider.
 *
 * Key parameters:
 *   id_weight (0.8-1.0) — how strongly to preserve facial identity
 *   start_step (0-2)    — earlier = stronger identity injection
 *   true_cfg (1.0-1.5)  — prompt adherence vs identity balance
 */
export interface PulidFluxParams {
  id_weight?:      number;
  start_step?:     number;
  true_cfg?:       number;
  num_steps?:      number;
  guidance_scale?: number;
  width?:          number;
  height?:         number;
}

export async function generateViaPulidFlux(
  photoBuffer:    Buffer,
  mimeType:       string,
  prompt:         string,
  negativePrompt: string,
  modalEndpoint:  string,
  params?:        PulidFluxParams,
): Promise<Buffer> {
  const body = {
    image_base64:    photoBuffer.toString("base64"),
    mime_type:       mimeType,
    prompt,
    negative_prompt: negativePrompt,
    id_weight:       params?.id_weight      ?? 0.9,
    start_step:      params?.start_step     ?? 1,
    true_cfg:        params?.true_cfg       ?? 1.2,
    num_steps:       params?.num_steps      ?? 24,
    guidance_scale:  params?.guidance_scale ?? 4.0,
    width:           params?.width          ?? 1024,
    height:          params?.height         ?? 1024,
  };

  const resp = await fetch(modalEndpoint, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify(body),
  });

  if (!resp.ok) {
    const text = await resp.text().catch(() => resp.status.toString());
    throw new Error(`PuLID-FLUX Modal error ${resp.status}: ${text.slice(0, 200)}`);
  }

  const result = await resp.json() as { image_base64?: string; error?: string };
  if (result.error) throw new Error(`PuLID-FLUX: ${result.error}`);
  if (!result.image_base64) throw new Error("PuLID-FLUX returned no image");

  return Buffer.from(result.image_base64, "base64");
}

// ─── CodeFormer face restoration (Replicate) ──────────────────────────────────

/**
 * restoreFace — run CodeFormer on the raw diffusion output.
 *
 * Fixes subtle artifacts: asymmetric eyes, mushy mouths, weird teeth.
 * Called right before IPFS upload.
 * Cost: ~$0.001/image on Replicate.
 *
 * fidelity_weight (0.0-1.0):
 *   0.7 = keep identity, clean artifacts  ← default for avatars
 *   0.5 = more aggressive smoothing (stylized)
 *   1.0 = full fidelity (minimal change)
 */
export async function restoreFace(
  imageBuffer:     Buffer,
  replicateToken:  string,
  fidelityWeight?: number,
): Promise<Buffer> {
  const createResp = await fetch("https://api.replicate.com/v1/predictions", {
    method:  "POST",
    headers: { "Authorization": `Bearer ${replicateToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      version: "7de2ea26c616d5bf2245ad0d5e24f0ff9a6204578a5c876db53a4a975c7d49db",
      input: {
        image:            `data:image/png;base64,${imageBuffer.toString("base64")}`,
        fidelity_weight:  fidelityWeight ?? 0.7,
        upscale:          1,
        has_aligned:      false,
        only_center_face: false,
      },
    }),
  });

  if (!createResp.ok) {
    const text = await createResp.text().catch(() => createResp.status.toString());
    throw new Error(`CodeFormer create error ${createResp.status}: ${text.slice(0, 200)}`);
  }

  let pred = await createResp.json() as { id: string; status: string; output?: string; error?: string };

  for (let i = 0; i < 40 && pred.status !== "succeeded" && pred.status !== "failed"; i++) {
    await new Promise(r => setTimeout(r, 2000));
    const poll = await fetch(`https://api.replicate.com/v1/predictions/${pred.id}`, {
      headers: { "Authorization": `Bearer ${replicateToken}` },
    });
    pred = await poll.json() as typeof pred;
  }

  if (pred.status !== "succeeded") throw new Error(`CodeFormer failed: ${pred.error ?? pred.status}`);

  const imgResp = await fetch(pred.output!);
  if (!imgResp.ok) throw new Error(`Failed to download CodeFormer result: ${imgResp.status}`);
  return Buffer.from(await imgResp.arrayBuffer());
}

// ─── ArcFace cosine similarity scoring (best-of-N) ────────────────────────────

/**
 * In-memory embedding cache — keyed by SHA-256 hex of the source photo buffer.
 * TTL: 30 minutes (enough for a user generating multiple style variants).
 * This avoids re-running face analysis on every style request in the same session.
 */
const _embeddingCache = new Map<string, { vec: number[]; expiresAt: number }>();
const CACHE_TTL_MS = 30 * 60 * 1000;

function _photoHash(buf: Buffer): string {
  let h = 0;
  for (let i = 0; i < Math.min(buf.length, 1024); i++) {
    h = (Math.imul(31, h) + buf[i]) | 0;
  }
  return h.toString(16);
}

/**
 * computeFaceEmbedding — lightweight cosine-distance proxy.
 *
 * Real ArcFace requires ONNX runtime or the Python sidecar (Phase 2+).
 * For now this extracts a 12-d perceptual feature vector from face-crop statistics
 * (mean/std of HSV channels + edge density) which is good enough for best-of-N
 * selection until InsightFace ONNX is wired up.
 *
 * When the sidecar is available, replace the body with an HTTP call to
 * POST /embed returning a 512-d float32 array.
 */
async function computeFaceEmbedding(imageBuffer: Buffer): Promise<number[]> {
  const cacheKey = _photoHash(imageBuffer);
  const cached = _embeddingCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.vec;

  const img = sharp(imageBuffer);
  const meta = await img.metadata();
  const w = meta.width ?? 256;
  const h = meta.height ?? 256;
  const SIZE = 128;

  const base = sharp(imageBuffer).resize(SIZE, SIZE, { fit: "cover", position: "centre" });

  const cx = Math.round(SIZE * 0.20);
  const cy = Math.round(SIZE * 0.20);
  const cw = Math.round(SIZE * 0.60);
  const ch = Math.round(SIZE * 0.60);

  const faceBuf = await base.clone()
    .extract({ left: cx, top: cy, width: cw, height: ch })
    .raw().toBuffer();

  const N = faceBuf.length / 3;
  let rSum = 0, gSum = 0, bSum = 0;
  let rSq  = 0, gSq  = 0, bSq  = 0;
  let edges = 0;

  for (let i = 0; i + 2 < faceBuf.length; i += 3) {
    const r = faceBuf[i] as number, g = faceBuf[i + 1] as number, b = faceBuf[i + 2] as number;
    rSum += r; gSum += g; bSum += b;
    rSq  += r * r; gSq  += g * g; bSq  += b * b;
    if (i > 0) {
      const dr = Math.abs(r - (faceBuf[i - 3] as number));
      const dg = Math.abs(g - (faceBuf[i - 2] as number));
      const db = Math.abs(b - (faceBuf[i - 1] as number));
      if (dr + dg + db > 60) edges++;
    }
  }

  const d = N || 1;
  const rMean = rSum / d, gMean = gSum / d, bMean = bSum / d;
  const rStd  = Math.sqrt(rSq / d - rMean * rMean);
  const gStd  = Math.sqrt(gSq / d - gMean * gMean);
  const bStd  = Math.sqrt(bSq / d - bMean * bMean);
  const edgeDens = edges / d;

  const vec = [
    rMean / 255, gMean / 255, bMean / 255,
    rStd  / 128, gStd  / 128, bStd  / 128,
    edgeDens,
    (rMean - bMean) / 255,
    (rMean - gMean) / 255,
    Math.min(rMean, gMean, bMean) / 255,
    Math.max(rMean, gMean, bMean) / 255,
    (rStd + gStd + bStd) / (3 * 128),
  ];

  void w; void h;
  _embeddingCache.set(cacheKey, { vec, expiresAt: Date.now() + CACHE_TTL_MS });

  // Prune expired entries lazily
  if (_embeddingCache.size > 200) {
    const now = Date.now();
    for (const [k, v] of _embeddingCache) {
      if (v.expiresAt < now) _embeddingCache.delete(k);
    }
  }

  return vec;
}

function _cosineSim(a: number[], b: number[]): number {
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot   += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB) + 1e-8);
}

/**
 * pickBestCandidate — compare N generated images against the source photo
 * and return the one with the highest perceptual face similarity.
 *
 * Used for best-of-2 KYC generation (AVATAR_BEST_OF_N=2).
 */
export async function pickBestCandidate(
  sourceBuffer: Buffer,
  candidates:   Buffer[],
): Promise<{ best: Buffer; score: number; index: number }> {
  if (candidates.length === 1) return { best: candidates[0], score: 1, index: 0 };

  const sourceVec = await computeFaceEmbedding(sourceBuffer);
  const scores = await Promise.all(candidates.map(c => computeFaceEmbedding(c)));
  const sims   = scores.map(vec => _cosineSim(sourceVec, vec));

  let bestIdx = 0;
  for (let i = 1; i < sims.length; i++) {
    if (sims[i] > sims[bestIdx]) bestIdx = i;
  }

  return { best: candidates[bestIdx], score: sims[bestIdx], index: bestIdx };
}

// ─── Public entry point ───────────────────────────────────────────────────────

/**
 * Generate a unique NFT portrait personalised to the person in the photo.
 *
 * Provider priority (2026 stack):
 *   1. PuLID-FLUX via Modal  (PULID_ENABLED=true + MODAL_PULID_URL set)
 *   2. Gemini 2.5 Flash Image (GEMINI_IMAGE_ENABLED=true + GEMINI_API_KEY set)
 *   3. Replicate face-to-many (REPLICATE_TOKEN set — InstantID-based)
 *   4. fal.ai FLUX img2img   (FAL_KEY set — strength now 0.55)
 *   5. HuggingFace FLUX      (HUGGINGFACE_TOKEN — free fallback)
 *   6. Cloudflare SDXL       (CLOUDFLARE_* — always-available fallback)
 *
 * Post-processing (gated by AVATAR_RESTORE_ENABLED=true):
 *   CodeFormer face restoration via Replicate (fidelity=0.7, ~$0.001)
 *
 * Best-of-N (gated by AVATAR_BEST_OF_N=2):
 *   Generates N candidates in parallel, picks highest perceptual similarity to source.
 *   Free tier: N=1. KYC: N=2 to catch unlucky bad generations.
 */
export async function generateAiAvatar(
  photoBuffer:    Buffer,
  mimeType:       string,
  genderHint:     Gender | undefined,
  falApiKey:      string | undefined,
  hfToken?:       string,
  replicateToken?: string,
  styleImageBuffer?: Buffer,
  opts?: {
    modalPulidUrl?:     string;
    pulidEnabled?:      boolean;
    restoreEnabled?:    boolean;
    bestOfN?:           number;
    cfAccountId?:       string;
    cfApiToken?:        string;
    style?:             AvatarArtStyle;
    geminiApiKey?:      string;
    geminiImageEnabled?: boolean;
  },
): Promise<AiAvatarResult> {
  const {
    modalPulidUrl,
    pulidEnabled   = false,
    restoreEnabled = false,
    bestOfN        = 1,
    cfAccountId,
    cfApiToken,
    style          = "cosmic",
    geminiApiKey,
    geminiImageEnabled = false,
  } = opts ?? {};

  // 1. Gender classification
  let gender: Gender = genderHint ?? "other";
  let genderConf     = genderHint ? 1.0 : 0;
  if (!genderHint && hfToken) {
    const ga = await analyzeGenderFromImage(photoBuffer, mimeType, hfToken).catch(() => null);
    if (ga) { gender = ga.gender; genderConf = ga.confidence; }
  }

  // 2. Visual trait extraction
  const traits = await extractVisualTraits(photoBuffer, gender, genderConf);

  // 3. Personalised prompt
  const prompt = buildPersonalisedPrompt(traits, style);
  const seed   = Math.floor(Math.random() * 2_147_483_647);
  const negativePrompt = buildStyleNegativePrompt(style, traits.ethnicRegion);

  // ── Inner: single generation attempt (used inside best-of-N loop) ────────────
  async function _generate(): Promise<{ buffer: Buffer; provider: string }> {
    // 4a. PuLID-FLUX via Modal — identity-preserving, best quality (free $30/mo)
    if (pulidEnabled && modalPulidUrl) {
      try {
        const buffer = await generateViaPulidFlux(photoBuffer, mimeType, prompt, negativePrompt, modalPulidUrl);
        return { buffer, provider: "modal/pulid-flux" };
      } catch (err: unknown) {
        console.warn("[ai-avatar] PuLID-FLUX failed, falling back:", err instanceof Error ? err.message : String(err));
      }
    }

    // 4b. Gemini 2.5 Flash Image — face-preserving reference-image generation
    if (geminiImageEnabled && geminiApiKey) {
      try {
        const buffer = await generateViaGeminiImage(photoBuffer, mimeType, prompt, geminiApiKey, { style });
        return { buffer, provider: "gemini-2.5-flash-image" };
      } catch (err: unknown) {
        console.warn("[ai-avatar] Gemini 2.5 Flash Image failed:", err instanceof Error ? err.message : String(err));
      }
    }

    const faceStyle: ApiStyle = traits.ageClass === "teen" ? "Anime"
      : traits.expression === "serious"                    ? "Video game"
      : "Claymation";

    // 4c. Replicate face-to-many (InstantID — best free face-preserving option)
    if (replicateToken) {
      try {
        const buffer = await generateViaFaceToMany(photoBuffer, mimeType, replicateToken, faceStyle, prompt);
        return { buffer, provider: `replicate/fofr-face-to-many (${faceStyle})` };
      } catch (err: unknown) {
        console.warn("[ai-avatar] face-to-many failed:", err instanceof Error ? err.message : String(err));
      }
    }

    // 4d. fal.ai FLUX img2img (strength 0.55 — preserves ~45% of source face)
    if (falApiKey) {
      try {
        const buffer = await generateViaFal(photoBuffer, mimeType, prompt, falApiKey, seed);
        return { buffer, provider: "fal.ai/flux-dev-img2img" };
      } catch (err: unknown) {
        console.warn("[ai-avatar] fal.ai failed:", err instanceof Error ? err.message : String(err));
      }
    }

    // 4e. HuggingFace FLUX.1-dev (free, 28-step text-to-image fallback)
    if (hfToken) {
      try {
        const buffer = await generateViaHuggingFace(photoBuffer, mimeType, prompt, hfToken, negativePrompt);
        return { buffer, provider: "huggingface/flux-dev" };
      } catch (err: unknown) {
        console.warn("[ai-avatar] HuggingFace failed:", err instanceof Error ? err.message : String(err));
      }
    }

    // 4f. Cloudflare SDXL-Lightning (always-available free fallback)
    if (cfAccountId && cfApiToken) {
      const buffer = await generateViaCloudflare(photoBuffer, prompt, cfAccountId, cfApiToken, negativePrompt);
      return { buffer, provider: "cloudflare/sdxl-lightning" };
    }

    throw new Error("No AI provider configured — set MODAL_PULID_URL, GEMINI_API_KEY, FAL_KEY, HUGGINGFACE_TOKEN, or CLOUDFLARE_* in Railway Variables.");
  }

  // 5. Best-of-N generation
  let buffer: Buffer;
  let provider: string;

  if (bestOfN > 1) {
    const candidates = await Promise.all(Array.from({ length: bestOfN }, () => _generate()));
    const { index } = await pickBestCandidate(photoBuffer, candidates.map(c => c.buffer));
    buffer   = candidates[index].buffer;
    provider = candidates[index].provider + ` [best-of-${bestOfN}]`;
    console.log(`[ai-avatar] best-of-${bestOfN}: picked candidate ${index} (${provider})`);
  } else {
    const result = await _generate();
    buffer   = result.buffer;
    provider = result.provider;
  }

  // 6. CodeFormer face restoration (optional, gated by AVATAR_RESTORE_ENABLED)
  if (restoreEnabled && replicateToken) {
    try {
      buffer   = await restoreFace(buffer, replicateToken, 0.7);
      provider += " +CodeFormer";
      console.log("[ai-avatar] CodeFormer restoration applied");
    } catch (err: unknown) {
      console.warn("[ai-avatar] CodeFormer failed, using raw output:", err instanceof Error ? err.message : String(err));
    }
  }

  return { buffer, mimeType: "image/png", prompt, gender, traits, seed, provider };
}

/** Direct style-locked avatar generation — tries FAL.ai → Replicate → HuggingFace
 *  Uses backend gender detection + visual trait extraction for photo-personalized prompts.
 */
export async function generateAvatarInStyle(
  photoBuffer: Buffer,
  mimeType:    string,
  style:       FaceToManyStyle,
  replicateToken: string | undefined,
  falApiKey?:  string,
  hfToken?:    string,
  gender?:     Gender,
  cfAccountId?: string,
  cfApiToken?:  string,
): Promise<{ buffer: Buffer; provider: string; style: FaceToManyStyle }> {

  // 1. Backend gender detection from the actual photo (free HuggingFace classifier)
  let resolvedGender: Gender = gender ?? "other";
  let genderConf = gender ? 1.0 : 0;
  if (!gender && hfToken) {
    const ga = await analyzeGenderFromImage(photoBuffer, mimeType, hfToken).catch(() => null);
    if (ga && ga.gender !== "other") { resolvedGender = ga.gender; genderConf = ga.confidence; }
  }

  // 2. Extract photo-specific traits (skin tone, hair, beard, glasses, expression, clothing)
  const traits = await extractVisualTraits(photoBuffer, resolvedGender, genderConf);

  // 3. Build style-specific prompts using actual photo traits (not generic prefixes)
  const skinDesc    = SKIN_DESC[traits.skinTone];
  const hairDesc    = HAIR_DESC[traits.hairColour];
  const glassesDesc = traits.hasGlasses ? "wearing stylised thick-framed glasses, " : "";
  const beardDesc   = traits.hasBeard   ? "with a well-groomed beard, " : "";
  const subjectBase = resolvedGender === "male" ? "A young man in his 20s" : resolvedGender === "female" ? "A young woman in her 20s" : "A young person in their 20s";
  const negGender   = resolvedGender === "male"
    ? "female, woman, feminine, girl, girly, woman body, female features"
    : resolvedGender === "female"
    ? "male, man, masculine, manly, boy, man body, male features"
    : "";

  const styleArt: Record<FaceToManyStyle, string> = {
    "Comic":       `cosmic comic book portrait, bold india-ink outlines, halftone dot shadows, deep space galaxy background with detailed nebulae and swirling cosmic dust, complex planetary rings, luminous stardust particles, celestial neon aura radiating as light source, multi-source lighting with cool blue rim light and warm golden face illumination, dramatic chiaroscuro contrast, volumetric light beams, highly detailed hair with individual strand texture, clothing with intricate fold rendering, galaxy background interacting with the figure, energy wisps connecting subject to nebulae, Gen-Z young adult energy, graphic novel hero card, NFT avatar`,
    "Anime":       `anime manga portrait, vibrant cel-shading, expressive large eyes, detailed hair highlights, japanese animation style, NFT avatar`,
    "3D":          `cinematic 3D render portrait, dramatic rim lighting, ultra-detailed sculpted face, premium CGI, NFT avatar`,
    "Video game":  `video game character portrait, heroic stylized art, game concept art, bold colors, action NFT hero`,
    "Pixels":      `pixel art portrait, 16-bit retro sprite, bold pixel blocks, colorful retro game style, NFT avatar`,
    "Clay":        `claymation portrait, colorful soft clay texture, stop-motion style, cute handcrafted feel, NFT avatar`,
    "Toy":         `vinyl designer toy portrait, collectible toy art, bold clean shapes, designer collectible NFT`,
    "LEGO":        `LEGO minifigure portrait, blocky plastic toy style, bright primary colors, collectible NFT`,
    "Claymation":  `claymation portrait, colorful clay texture, stop-motion style, cute handcrafted NFT avatar`,
    "Emoji":       `bitmoji cartoon portrait, vibrant flat cartoon style, expressive fun character, NFT avatar`,
  };

  const regionDesc = ETHNIC_REGION_DESCRIPTORS[traits.ethnicRegion];
  const prompt = `${subjectBase}, ${skinDesc}, ${regionDesc.keywords}, ${regionDesc.face}, ${regionDesc.eyes}, ${hairDesc}, ${glassesDesc}${beardDesc}${styleArt[style]}, highly detailed, 1024x1024`;
  console.log(`[ai-avatar] style=${style} gender=${resolvedGender}(${genderConf.toFixed(2)}) skin=${traits.skinTone} hair=${traits.hairColour} prompt="${prompt.slice(0,120)}..."`);

  // 1. HuggingFace text-to-image (free tier — resets monthly)
  if (hfToken) {
    try {
      const buffer = await generateViaHuggingFace(photoBuffer, mimeType, prompt, hfToken, negGender);
      return { buffer, provider: `huggingface/flux-schnell (${style})`, style };
    } catch (err) {
      console.error("[ai-avatar] HuggingFace failed:", err instanceof Error ? err.message : String(err));
      // fall through to Cloudflare
    }
  }

  // 2. Cloudflare Workers AI (free — 10k/day, img2img supported)
  if (cfAccountId && cfApiToken) {
    try {
      const buffer = await generateViaCloudflare(photoBuffer, prompt, cfAccountId, cfApiToken, negGender);
      return { buffer, provider: `cloudflare/sdxl-lightning (${style})`, style };
    } catch (err) {
      console.error("[ai-avatar] Cloudflare failed:", err instanceof Error ? err.message : String(err));
      // fall through to FAL.ai
    }
  }

  // 3. Try FAL.ai img2img (better gender preservation)
  if (falApiKey) {
    try {
      const seed = Math.floor(Math.random() * 2_000_000);
      const buffer = await generateViaFal(photoBuffer, mimeType, prompt, falApiKey, seed);
      return { buffer, provider: `fal-ai/flux-img2img (${style})`, style };
    } catch (err) {
      console.error("[ai-avatar] FAL.ai failed:", err instanceof Error ? err.message : String(err));
      // fall through to Replicate
    }
  }

  // 4. Try Replicate face-to-many (best face preservation)
  if (replicateToken) {
    try {
      const baseStyle = style === "Comic" ? "Anime" : style;
      const buffer = await generateViaFaceToMany(photoBuffer, mimeType, replicateToken, baseStyle, prompt);
      return { buffer, provider: `replicate/fofr-face-to-many (${style})`, style };
    } catch (err) {
      console.error("[ai-avatar] Replicate failed:", err instanceof Error ? err.message : String(err));
      // fall through to error
    }
  }

  throw new Error("No AI provider available. Set CLOUDFLARE_ACCOUNT_ID + CLOUDFLARE_API_TOKEN in Railway Variables.");
}

// Export AI_PROMPTS for backward-compat with test scripts
export const AI_PROMPTS = {
  male:   `A painterly Spider-Verse NFT portrait of a young man, ${ART_STYLE}.`,
  female: `A painterly Spider-Verse NFT portrait of a young woman, ${ART_STYLE}.`,
  other:  `A painterly Spider-Verse NFT portrait, ${ART_STYLE}.`,
};
