/**
 * AI Avatar Generation Service — Gen-Z Social-First Redesign
 *
 * WHAT CHANGED vs old version:
 *  ❌ OLD: Dark cosmic villain portrait, harsh comic outlines, serious expression
 *  ✅ NEW: 6 Gen-Z aesthetic presets that people ACTUALLY post on Instagram/TikTok
 *
 * The 6 aesthetics (mapped to Bae4U rarity tiers):
 *  1. Soft Girl   — pastel clouds, blush, cute kawaii energy (most viral for girls)
 *  2. Y2K Chrome  — metallic bubblegum, chrome reflections, cyber-cute
 *  3. E-Vibe      — alt aesthetic, blush marks, dark pastel, anime-inspired
 *  4. Baddie      — glam, confident, golden hour, hype streetwear
 *  5. Indie Film  — film grain, warm vintage, coffee shop cozy
 *  6. Neon Glow   — Legendary — vibrant neons, dark but COLORFUL not gloomy
 *
 * Face preservation: Replicate face-to-many → FAL.ai → HuggingFace
 * Gender detection: HuggingFace rizvandwiki/gender-classification (free)
 */

import sharp from "sharp";
import { fal } from "@fal-ai/client";
import { HfInference } from "@huggingface/inference";

// ─── Types (unchanged from your original) ────────────────────────────────────

export type Gender     = "male" | "female" | "other";
export type SkinTone   = "fair" | "warm-ivory" | "olive" | "medium-brown" | "warm-brown" | "deep-brown" | "dark";
export type HairColour = "jet-black" | "dark-brown" | "medium-brown" | "auburn" | "silver-grey" | "white" | "light";
export type AgeClass   = "teen" | "young-adult" | "adult" | "mature" | "elder";

// ─── NEW: Gen-Z Aesthetic System ─────────────────────────────────────────────
//
// Each aesthetic = a complete vibe that Gen-Z users will recognise + want to use.
// Mapped to Bae4U rarity so every tier feels special and shareable.

export type GenZAesthetic =
  | "soft-girl"    // Common female  / default female
  | "clean-boy"    // Common male    / default male
  | "y2k"          // Rare           — metallic chrome bubblegum
  | "e-vibe"       // Epic           — alt dark-pastel anime
  | "baddie"       // Epic female    — glam golden hour
  | "streetwear"   // Epic male      — urban hype
  | "neon-legend"  // Legendary      — vibrant neon glow (still dark bg but COLORFUL)
  | "indie-film";  // Rare alt        — warm vintage film grain

// Rarity → aesthetic mapping (used by hero card generator)
export const RARITY_AESTHETIC: Record<string, { female: GenZAesthetic; male: GenZAesthetic }> = {
  common:    { female: "soft-girl",   male: "clean-boy"  },
  rare:      { female: "y2k",         male: "y2k"        },
  epic:      { female: "baddie",      male: "streetwear" },
  legendary: { female: "neon-legend", male: "neon-legend"},
};

// ─── Aesthetic Prompt Templates ───────────────────────────────────────────────
//
// KEY DESIGN DECISIONS:
//  - Always "warm confident smile" → people share smiling avatars
//  - Bright/pastel backgrounds → not dark and gloomy
//  - "social media profile picture" in every prompt → model knows the use case
//  - "Pixar lighting" → the gold standard for loveable face rendering
//  - No "comic outlines" in soft/clean aesthetics → too harsh for social media

const AESTHETIC_ART: Record<GenZAesthetic, string> = {

  "soft-girl": [
    "soft girl aesthetic portrait",
    "dreamy pastel background with floating cherry blossoms and soft bokeh",
    "warm Pixar-style lighting, glowing skin, rosy blush cheeks",
    "pastel pink and lavender color palette",
    "cute expressive eyes with long lashes, natural glossy lip",
    "cozy trendy outfit — pastel hoodie or floral top",
    "soft watercolor brush texture, gentle painterly finish",
    "Instagram-worthy social media profile picture",
    "Gen-Z girl energy, kawaii cute vibe, loveable character design",
    "bright cheerful happy expression, wide warm smile",
    "soft rim lighting, beauty lighting setup",
    "highly detailed digital illustration, 1024×1024",
  ].join(", "),

  "clean-boy": [
    "clean fresh aesthetic portrait",
    "soft gradient background — warm cream to sky blue",
    "golden hour warm sunlight, healthy glowing skin",
    "sharp defined features, clean haircut",
    "relaxed confident smile, natural friendly expression",
    "casual trendy outfit — clean white tee or open collar shirt",
    "smooth semi-realistic illustration style",
    "Pixar lighting quality, warm golden face illumination",
    "Instagram-worthy social media profile picture",
    "Gen-Z boy energy, fresh clean vibe, naturally attractive",
    "bright soft background, not dark",
    "highly detailed digital illustration, 1024×1024",
  ].join(", "),

  "y2k": [
    "Y2K aesthetic portrait",
    "metallic chrome and bubblegum pink background with holographic sparkles",
    "iridescent chrome glow on skin, liquid metal highlights",
    "bubblegum pink and electric blue color palette",
    "glossy lips, sparkly accessories, Y2K fashion",
    "butterfly clips, silver jewelry, futuristic cute outfit",
    "cyberpunk-cute meets late-90s nostalgia",
    "dreamy holographic bokeh background",
    "Pixar-quality lighting with chrome reflections",
    "playful flirty smile, fun expressive energy",
    "super shareable social media profile picture",
    "highly detailed digital illustration, 1024×1024",
  ].join(", "),

  "e-vibe": [
    "E-girl E-boy aesthetic portrait",
    "dark pastel background — deep purple and soft pink gradient",
    "blush mark under eyes, anime-inspired",
    "two-tone hair highlights, layered chunky necklaces",
    "dark pastel color palette — mauve, dusty rose, slate blue",
    "alternative cute fashion — band tee, layered accessories",
    "semi-realistic anime-influenced illustration style",
    "soft dramatic lighting, warm face against moody background",
    "playful confident expression, subtle smirk",
    "Gen-Z alternative aesthetic, cool and cute",
    "social media PFP energy",
    "highly detailed digital illustration, 1024×1024",
  ].join(", "),

  "baddie": [
    "baddie aesthetic glam portrait",
    "golden hour warm bokeh background, warm amber and champagne tones",
    "perfectly contoured glowing skin, golden highlight",
    "full bold lashes, glossy nude or bold lip",
    "confidence radiating portrait, powerful feminine energy",
    "fashionable outfit — crop top, gold jewelry, trendy accessories",
    "warm cinematic lighting, bronzed sun-kissed glow",
    "smooth editorial illustration style",
    "strong confident smile, empowered expression",
    "Instagram baddie energy, aspirational and shareable",
    "editorial beauty portrait quality",
    "highly detailed digital illustration, 1024×1024",
  ].join(", "),

  "streetwear": [
    "streetwear aesthetic portrait",
    "urban concrete and gradient neon background",
    "fresh clean skin, sharp confident jawline",
    "oversized hoodie or graphic tee, snapback or beanie optional",
    "subtle neon accent lighting — cyan or magenta edge light",
    "cool relaxed confident smile, effortless energy",
    "hypebeast streetwear fashion vibe",
    "urban art inspired illustration style — smooth meets graphic",
    "Nike or Supreme energy without logos",
    "Gen-Z male social media PFP — drip and confidence",
    "editorial portrait quality",
    "highly detailed digital illustration, 1024×1024",
  ].join(", "),

  "neon-legend": [
    "neon glow legendary portrait",
    "deep vibrant background with electric neon aura — hot pink, electric blue, acid yellow",
    "neon rim lighting on face and hair, colorful not gloomy",
    "vibrant holographic color palette",
    "glowing skin, neon light streaks, futuristic energy",
    "bold confident expression, legendary main character energy",
    "premium fashion — statement piece outfit with neon accents",
    "smooth 3D render quality meets painterly illustration",
    "spectacular shareable social media content",
    "this is their era, iconic energy",
    "Pixar meets cyberpunk — COLORFUL, vivid, warm face",
    "highly detailed digital illustration, 1024×1024",
  ].join(", "),

  "indie-film": [
    "indie film aesthetic portrait",
    "warm film grain overlay, vintage 35mm photography feel",
    "soft warm background — golden bokeh, autumn leaves, coffee shop ambiance",
    "warm amber and terracotta color palette",
    "natural effortless beauty, no-makeup makeup look",
    "oversized vintage jacket or thrifted aesthetic outfit",
    "warm golden sunlight through window effect",
    "soft painterly illustration with film grain texture",
    "gentle warm smile, thoughtful dreamy expression",
    "Pinterest and Tumblr aesthetic — cozy and aspirational",
    "social media profile picture energy",
    "highly detailed digital illustration, 1024×1024",
  ].join(", "),
};

// NEGATIVE PROMPT — completely rewritten
// Old version blocked good things. New version specifically avoids Gen-Z dealbreakers.
const NEGATIVE_PROMPT =
  "dark gloomy background, serious frowning expression, angry face, " +
  "villain energy, harsh comic outlines, heavy ink lines, " +
  "photorealistic photograph, 3d render uncanny valley, blurry, low quality, " +
  "watermark, text overlay, logo, ugly, extra limbs, bad anatomy, nsfw, nude, " +
  "generic face, old-looking, tired, sad, lonely, scary, " +
  "overexposed washed out, flat dull colors";

// ─── Skin + Hair descriptors (keep your originals — they work great) ──────────

const SKIN_DESC: Record<SkinTone, string> = {
  "fair":         "fair porcelain skin with cool pink undertones, soft peachy glow",
  "warm-ivory":   "warm ivory skin with golden undertones, healthy radiance",
  "olive":        "olive Mediterranean skin, warm sun-kissed tone",
  "medium-brown": "medium warm-brown South-Asian skin, beautiful warm undertones",
  "warm-brown":   "rich warm-brown skin with amber undertones, glowing complexion",
  "deep-brown":   "deep brown skin with warm mahogany highlights, luminous skin",
  "dark":         "deep dark skin, rich and beautiful, glowing healthy complexion",
};

const HAIR_DESC: Record<HairColour, string> = {
  "jet-black":    "sleek jet-black hair, healthy shine",
  "dark-brown":   "rich dark chestnut-brown hair with subtle highlights",
  "medium-brown": "warm medium-brown hair, sun-kissed",
  "auburn":       "beautiful auburn reddish-brown hair",
  "silver-grey":  "trendy silver-grey hair, cool and stylish",
  "white":        "platinum white hair, bold and stunning",
  "light":        "light sandy blonde hair, beachy waves",
};

// ─── Visual trait types (unchanged — your analysis pipeline is solid) ─────────

export interface VisualTraits {
  gender:      Gender;
  genderConf:  number;
  skinTone:    SkinTone;
  hairColour:  HairColour;
  ageClass:    AgeClass;
  hasGlasses:  boolean;
  hasBeard:    boolean;
  expression:  "warm-smile" | "neutral" | "serious";
  dominantClothingHex: string;
}

export interface GenderAnalysisResult {
  gender:     Gender;
  confidence: number;
  provider:   string;
}

export interface AiAvatarResult {
  buffer:    Buffer;
  mimeType:  "image/png";
  prompt:    string;
  gender:    Gender;
  traits:    VisualTraits;
  seed:      number;
  provider:  string;
  aesthetic: GenZAesthetic;
}

// ─── NEW: Personalised Gen-Z Prompt Builder ───────────────────────────────────

export function buildGenZPrompt(
  traits: VisualTraits,
  aesthetic: GenZAesthetic,
): string {
  const { gender, skinTone, hairColour, hasGlasses, hasBeard } = traits;

  // Subject line — ALWAYS specify gender clearly to prevent misgendering
  const subject = gender === "female"
    ? "A beautiful young woman in her early 20s"
    : gender === "male"
    ? "A handsome young man in his early 20s"
    : "A stylish young person in their early 20s";

  const skinDesc    = SKIN_DESC[skinTone];
  const hairDesc    = HAIR_DESC[hairColour];
  const glassesDesc = hasGlasses ? "wearing cute trendy glasses, " : "";
  const beardDesc   = hasBeard   ? "with light stylish stubble, " : "";

  // ALWAYS force warm smile for social media appeal
  // (This was the #1 mistake in your old code — "serious" expression kills shareability)
  const expressionDesc = "warm genuine bright smile, happy and confident expression, ";

  const aestheticArt = AESTHETIC_ART[aesthetic];

  // Uniqueness token based on traits (prevents duplicate-looking avatars)
  const uniqueToken = `[unique:${skinTone}-${hairColour}-${gender}-${aesthetic}]`;

  return (
    `${subject}, ${skinDesc}, ${hairDesc}, ` +
    `${glassesDesc}${beardDesc}${expressionDesc}` +
    `${aestheticArt}. ` +
    `${uniqueToken}` 
  );
}

// ─── Auto aesthetic selector (used when rarity not passed) ───────────────────

export function selectAesthetic(traits: VisualTraits, rarity?: string): GenZAesthetic {
  const { gender, ageClass } = traits;

  if (rarity && RARITY_AESTHETIC[rarity]) {
    return gender === "female"
      ? RARITY_AESTHETIC[rarity].female
      : RARITY_AESTHETIC[rarity].male;
  }

  // Auto-select by age + gender when no rarity given
  if (gender === "female") {
    return ageClass === "teen" ? "soft-girl" : "baddie";
  }
  return ageClass === "teen" ? "clean-boy" : "streetwear";
}

// ─── Pixel analysis helpers (ALL YOUR ORIGINALS — keep these, they work) ─────

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

function rgbSaturation(r: number, g: number, b: number): number {
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  return max === 0 ? 0 : (max - min) / max;
}

function estimateEdgeDensity(buf: Buffer): number {
  let edges = 0;
  for (let i = 1; i < buf.length; i++) {
    if (Math.abs(buf[i] - buf[i - 1]) > 40) edges++;
  }
  return edges / (buf.length || 1);
}

function rgbToHex(r: number, g: number, b: number): string {
  const hex = (v: number) => Math.round(v).toString(16).padStart(2, "0");
  return `#${hex(r)}${hex(g)}${hex(b)}`;
}

function classifySkinTone(r: number, g: number, b: number): SkinTone {
  const bright = (r + g + b) / 3;
  const warm   = r - b;
  if (bright > 210 && warm < 20)  return "fair";
  if (bright > 190 && warm < 35)  return "warm-ivory";
  if (bright > 165 && warm < 50)  return "olive";
  if (bright > 140 && warm < 60)  return "medium-brown";
  if (bright > 115 && warm < 75)  return "warm-brown";
  if (bright > 80)                return "deep-brown";
  return "dark";
}

function classifyHairColour(r: number, g: number, b: number): HairColour {
  const bright = (r + g + b) / 3;
  const sat    = rgbSaturation(r, g, b);
  if (bright > 200)                       return "white";
  if (bright > 155 && sat < 0.10)        return "silver-grey";
  if (bright > 140 && sat < 0.18)        return "light";
  if (bright > 100 && r > g && r > b)    return "auburn";
  if (bright > 90  && sat < 0.30)        return "medium-brown";
  if (bright > 50  && sat < 0.35)        return "dark-brown";
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

// ─── Trait extractor (your original — kept as-is) ────────────────────────────

export async function extractVisualTraits(
  photoBuffer: Buffer,
  gender:      Gender,
  genderConf:  number,
): Promise<VisualTraits> {
  const SIZE = 256;
  const base = sharp(photoBuffer).resize(SIZE, SIZE, { fit: "cover", position: "centre" });

  const { channels: fullCh } = await base.clone().raw()
    .toBuffer({ resolveWithObject: true }).then(({ info }) => ({ channels: info.channels }));
  const isColor = fullCh >= 3;

  const faceCropBuf = await base.clone()
    .extract({ left: Math.round(SIZE * 0.15), top: Math.round(SIZE * 0.15),
               width: Math.round(SIZE * 0.70), height: Math.round(SIZE * 0.35) })
    .raw().toBuffer();
  const skin     = averageRGB(faceCropBuf, isColor ? 3 : 1);
  const skinTone = classifySkinTone(skin.r, skin.g, skin.b);

  const hairBuf = await base.clone()
    .extract({ left: Math.round(SIZE * 0.10), top: 2,
               width: Math.round(SIZE * 0.80), height: Math.round(SIZE * 0.12) })
    .raw().toBuffer();
  const hair      = averageRGB(hairBuf, isColor ? 3 : 1);
  const hairColour = classifyHairColour(hair.r, hair.g, hair.b);

  const chinBuf = await base.clone()
    .extract({ left: Math.round(SIZE * 0.20), top: Math.round(SIZE * 0.55),
               width: Math.round(SIZE * 0.60), height: Math.round(SIZE * 0.30) })
    .raw().toBuffer();
  const chin    = averageRGB(chinBuf, isColor ? 3 : 1);
  const hasBeard = gender === "male" && chin.r < 140 && (chin.r - chin.b) > 8;

  const eyeBuf = await base.clone()
    .extract({ left: Math.round(SIZE * 0.10), top: Math.round(SIZE * 0.30),
               width: Math.round(SIZE * 0.80), height: Math.round(SIZE * 0.20) })
    .greyscale().raw().toBuffer();
  const hasGlasses = estimateEdgeDensity(eyeBuf) > 0.14;

  const hairSat  = rgbSaturation(hair.r, hair.g, hair.b);
  const ageClass = classifyAge(hairSat, (hair.r + hair.g + hair.b) / 3, hairColour);

  const mouthBuf = await base.clone()
    .extract({ left: Math.round(SIZE * 0.25), top: Math.round(SIZE * 0.68),
               width: Math.round(SIZE * 0.50), height: Math.round(SIZE * 0.15) })
    .raw().toBuffer();
  const mouth    = averageRGB(mouthBuf, isColor ? 3 : 1);
  const expression = mouth.r > 155 ? "warm-smile" : mouth.r < 100 ? "serious" : "neutral";

  const clothBuf = await base.clone()
    .extract({ left: 0, top: Math.round(SIZE * 0.82),
               width: SIZE, height: Math.round(SIZE * 0.15) })
    .raw().toBuffer();
  const cloth = averageRGB(clothBuf, isColor ? 3 : 1);

  return {
    gender, genderConf, skinTone, hairColour, ageClass,
    hasGlasses, hasBeard, expression,
    dominantClothingHex: rgbToHex(cloth.r, cloth.g, cloth.b),
  };
}

// ─── Gender analysis (unchanged) ─────────────────────────────────────────────

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
  return { gender, confidence: best?.score ?? 0, provider: "huggingface/gender-classification" };
}

// ─── Generation providers (all your originals, kept exactly) ─────────────────

export type FaceToManyStyle = "3D" | "Emoji" | "Video game" | "Pixels" | "Clay" | "Toy" | "LEGO" | "Anime" | "Claymation" | "Comic";
type ApiStyle = Exclude<FaceToManyStyle, "Comic">;

// Maps Gen-Z aesthetic → Replicate face-to-many style
const AESTHETIC_TO_FACE_STYLE: Record<GenZAesthetic, ApiStyle> = {
  "soft-girl":   "Claymation",  // soft clay = cute, loved on social media
  "clean-boy":   "3D",           // clean 3D render = fresh and clean
  "y2k":         "Anime",        // anime = Y2K aesthetic vibes
  "e-vibe":      "Anime",        // anime = perfect for e-girl/e-boy
  "baddie":      "3D",           // cinematic 3D = editorial beauty
  "streetwear":  "Video game",   // game character = hype streetwear energy
  "neon-legend": "3D",           // premium 3D = legendary
  "indie-film":  "Claymation",   // soft clay = indie film cozy
};

async function generateViaFaceToMany(
  photoBuffer:    Buffer,
  mimeType:       string,
  replicateToken: string,
  style:          ApiStyle,
  prompt:         string,
): Promise<Buffer> {
  const createResp = await fetch("https://api.replicate.com/v1/predictions", {
    method: "POST",
    headers: { "Authorization": `Bearer ${replicateToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      version: "a07f252abbbd832009640b27f063ea52d87d7a23a185ca165bec23b5adc8deaf",
      input: {
        image:               `data:${mimeType};base64,${photoBuffer.toString("base64")}`,
        style,
        prompt,
        negative_prompt:     NEGATIVE_PROMPT,
        instant_id_strength: 0.85,   // higher = more face preservation
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
  const result = await fal.subscribe("fal-ai/flux/dev/image-to-image", {
    input: {
      image_url:            `data:${mimeType};base64,${photoBuffer.toString("base64")}`,
      prompt,
      negative_prompt:      NEGATIVE_PROMPT,
      strength:             0.68,
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
  return Buffer.from(await res.arrayBuffer());
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

  // Try img2img first (better face preservation)
  for (const model of ["stabilityai/stable-diffusion-xl-base-1.0", "runwayml/stable-diffusion-v1-5"]) {
    try {
      const result = await hf.imageToImage({
        model,
        inputs: imageBlob,
        parameters: {
          prompt,
          negative_prompt:     negativePrompt || NEGATIVE_PROMPT,
          num_inference_steps: 25,
          strength:            0.35,
          guidance_scale:      8.0,
          width: 768, height: 768,
        },
      });
      return Buffer.from(await (result as unknown as Blob).arrayBuffer());
    } catch { /* try next */ }
  }

  // Fallback: text-to-image
  const result = await hf.textToImage({
    model: "black-forest-labs/FLUX.1-schnell",
    inputs: prompt,
    parameters: { negative_prompt: negativePrompt || NEGATIVE_PROMPT, num_inference_steps: 4, width: 1024, height: 1024 },
  });
  return Buffer.from(await (result as unknown as Blob).arrayBuffer());
}

async function generateViaCloudflare(
  photoBuffer: Buffer,
  prompt:      string,
  accountId:   string,
  apiToken:    string,
  negativePrompt?: string,
): Promise<Buffer> {
  const baseUrl = `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run`;
  const headers  = { "Authorization": `Bearer ${apiToken}`, "Content-Type": "application/json" };
  const body = { prompt, num_steps: 20, negative_prompt: negativePrompt || NEGATIVE_PROMPT };
  const res  = await fetch(`${baseUrl}/@cf/bytedance/stable-diffusion-xl-lightning`, { method: "POST", headers, body: JSON.stringify(body) });
  if (!res.ok) throw new Error(`CF text2img ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return Buffer.from(await res.arrayBuffer());
}

// ─── PUBLIC ENTRY POINT ───────────────────────────────────────────────────────

/**
 * Generate a Gen-Z social-media-ready avatar.
 *
 * @param rarity  Optional — "common" | "rare" | "epic" | "legendary"
 *                Determines aesthetic. If not passed, auto-selected from traits.
 */
export async function generateAiAvatar(
  photoBuffer:    Buffer,
  mimeType:       string,
  genderHint:     Gender | undefined,
  falApiKey:      string | undefined,
  hfToken?:       string,
  replicateToken?: string,
  rarity?:        string,
): Promise<AiAvatarResult> {
  // 1. Gender
  let gender: Gender = genderHint ?? "other";
  let genderConf     = genderHint ? 1.0 : 0;
  if (!genderHint && hfToken) {
    const ga = await analyzeGenderFromImage(photoBuffer, mimeType, hfToken).catch(() => null);
    if (ga) { gender = ga.gender; genderConf = ga.confidence; }
  }

  // 2. Visual traits
  const traits = await extractVisualTraits(photoBuffer, gender, genderConf);

  // 3. Select Gen-Z aesthetic
  const aesthetic = selectAesthetic(traits, rarity);

  // 4. Build Gen-Z prompt (NEW — replaces buildPersonalisedPrompt)
  const prompt = buildGenZPrompt(traits, aesthetic);
  const seed   = Math.floor(Math.random() * 2_147_483_647);

  console.log(`[ai-avatar] aesthetic=${aesthetic} gender=${gender} skin=${traits.skinTone} hair=${traits.hairColour}`);
  console.log(`[ai-avatar] prompt="${prompt.slice(0, 120)}..."`);

  // 5. Generate — priority: face-to-many → fal.ai → HuggingFace
  let buffer:   Buffer;
  let provider: string;
  const faceStyle = AESTHETIC_TO_FACE_STYLE[aesthetic];

  if (replicateToken) {
    try {
      buffer   = await generateViaFaceToMany(photoBuffer, mimeType, replicateToken, faceStyle, prompt);
      provider = `replicate/fofr-face-to-many (${faceStyle})`;
    } catch (err) {
      console.warn("[ai-avatar] face-to-many failed:", err instanceof Error ? err.message : String(err));
      if (falApiKey) {
        buffer   = await generateViaFal(photoBuffer, mimeType, prompt, falApiKey, seed);
        provider = "fal.ai/flux-dev";
      } else if (hfToken) {
        buffer   = await generateViaHuggingFace(photoBuffer, mimeType, prompt, hfToken);
        provider = "huggingface/fallback";
      } else throw err;
    }
  } else if (falApiKey) {
    buffer   = await generateViaFal(photoBuffer, mimeType, prompt, falApiKey, seed);
    provider = "fal.ai/flux-dev";
  } else if (hfToken) {
    buffer   = await generateViaHuggingFace(photoBuffer, mimeType, prompt, hfToken);
    provider = "huggingface/flux-schnell";
  } else {
    throw new Error("No AI provider configured. Set REPLICATE_API_TOKEN, FAL_KEY, or HUGGINGFACE_TOKEN.");
  }

  return { buffer, mimeType: "image/png", prompt, gender, traits, seed, provider, aesthetic };
}

/**
 * Direct style generation — used by hero card generator for rarity-specific cards.
 */
export async function generateAvatarInStyle(
  photoBuffer:    Buffer,
  mimeType:       string,
  style:          FaceToManyStyle,
  replicateToken: string | undefined,
  falApiKey?:     string,
  hfToken?:       string,
  gender?:        Gender,
  cfAccountId?:   string,
  cfApiToken?:    string,
  rarity?:        string,
): Promise<{ buffer: Buffer; provider: string; style: FaceToManyStyle; aesthetic: GenZAesthetic }> {

  let resolvedGender: Gender = gender ?? "other";
  let genderConf = gender ? 1.0 : 0;
  if (!gender && hfToken) {
    const ga = await analyzeGenderFromImage(photoBuffer, mimeType, hfToken).catch(() => null);
    if (ga && ga.gender !== "other") { resolvedGender = ga.gender; genderConf = ga.confidence; }
  }

  const traits    = await extractVisualTraits(photoBuffer, resolvedGender, genderConf);
  const aesthetic = selectAesthetic(traits, rarity);
  const prompt    = buildGenZPrompt(traits, aesthetic);
  const faceStyle = AESTHETIC_TO_FACE_STYLE[aesthetic];

  const negGender = resolvedGender === "male"
    ? "female, woman, feminine features"
    : resolvedGender === "female"
    ? "male, man, masculine features"
    : "";
  const fullNeg = `${NEGATIVE_PROMPT}, ${negGender}`;

  if (hfToken) {
    try {
      const buffer = await generateViaHuggingFace(photoBuffer, mimeType, prompt, hfToken, fullNeg);
      return { buffer, provider: `huggingface/flux-schnell (${aesthetic})`, style: faceStyle, aesthetic };
    } catch (err) {
      console.warn("[ai-avatar] HF failed:", err instanceof Error ? err.message : String(err));
    }
  }

  if (cfAccountId && cfApiToken) {
    try {
      const buffer = await generateViaCloudflare(photoBuffer, prompt, cfAccountId, cfApiToken, fullNeg);
      return { buffer, provider: `cloudflare/sdxl-lightning (${aesthetic})`, style: faceStyle, aesthetic };
    } catch (err) {
      console.warn("[ai-avatar] Cloudflare failed:", err instanceof Error ? err.message : String(err));
    }
  }

  if (falApiKey) {
    const seed = Math.floor(Math.random() * 2_000_000);
    const buffer = await generateViaFal(photoBuffer, mimeType, prompt, falApiKey, seed);
    return { buffer, provider: `fal-ai/flux-img2img (${aesthetic})`, style: faceStyle, aesthetic };
  }

  if (replicateToken) {
    const buffer = await generateViaFaceToMany(photoBuffer, mimeType, replicateToken, faceStyle, prompt);
    return { buffer, provider: `replicate/fofr-face-to-many (${aesthetic})`, style: faceStyle, aesthetic };
  }

  throw new Error("No AI provider available.");
}

// Backward compat export
export const buildPersonalisedPrompt = (traits: VisualTraits) =>
  buildGenZPrompt(traits, selectAesthetic(traits));
