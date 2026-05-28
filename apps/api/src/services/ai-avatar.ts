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
import { HfInference } from "@huggingface/inference";

export type Gender = "male" | "female" | "other";

// ─── Visual trait types ────────────────────────────────────────────────────────

export type SkinTone   = "fair" | "warm-ivory" | "olive" | "medium-brown" | "warm-brown" | "deep-brown" | "dark";
export type HairColour = "jet-black" | "dark-brown" | "medium-brown" | "auburn" | "silver-grey" | "white" | "light";
export type AgeClass   = "teen" | "young-adult" | "adult" | "mature" | "elder";

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
  "deep-space galaxy background with nebula auroras and stardust particles, " +
  "celestial cosmic energy aura radiating from the subject, " +
  "warm-lit dramatic rim lighting with cosmic glow, comic panel energy, " +
  "hand-painted brush texture blended with sculpted 3-D anatomy, " +
  "highly detailed digital illustration, 1024×1024 square, studio portrait framing";

const NEGATIVE_PROMPT =
  "photorealistic, photograph, 3d render, blurry, low quality, " +
  "watermark, text, logo, ugly, extra limbs, bad anatomy, nsfw, nude, " +
  "generic face, same face, blue eyes, white skin unless accurate, fantasy hair colour";

// ─── Prompt vocabulary maps ────────────────────────────────────────────────────

const SKIN_DESC: Record<SkinTone, string> = {
  "fair":         "fair porcelain skin with cool pink undertones",
  "warm-ivory":   "warm ivory skin with golden undertones",
  "olive":        "olive-toned Mediterranean skin",
  "medium-brown": "medium warm-brown South-Asian skin",
  "warm-brown":   "rich warm-brown skin with amber undertones",
  "deep-brown":   "deep brown skin with warm mahogany highlights",
  "dark":         "deep dark skin with rich blue-black shadows",
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

async function extractVisualTraits(
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

  // ── 2. Upper-face crop: y=10–45% → skin tone ─────────────────────────────
  const faceCropBuf = await base.clone()
    .extract({ left: Math.round(SIZE * 0.15), top: Math.round(SIZE * 0.15),
                width: Math.round(SIZE * 0.70), height: Math.round(SIZE * 0.35) })
    .raw().toBuffer();

  const skin = averageRGB(faceCropBuf, isColor ? 3 : 1);
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

  void w; void h;  // suppress unused vars

  return {
    gender, genderConf,
    skinTone, hairColour, ageClass,
    hasGlasses, hasBeard, expression,
    dominantClothingHex,
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

// ─── Personalised prompt builder ──────────────────────────────────────────────

export function buildPersonalisedPrompt(traits: VisualTraits): string {
  const { gender, skinTone, hairColour, ageClass, hasGlasses, hasBeard, expression, dominantClothingHex } = traits;

  // Aggressive randomization for uniqueness
  const rand = Math.random().toString(36).slice(2, 7);
  const faceShape = ["oval", "square", "round", "angular", "heart-shaped"][Math.floor(Math.random() * 5)];
  const eyeShape = ["almond", "round", "hooded", "wide-set", "deep-set"][Math.floor(Math.random() * 5)];
  const noseShape = ["straight", "aquiline", "button", "broad", "refined"][Math.floor(Math.random() * 5)];
  const mouthShape = ["full", "thin", "bow-shaped", "defined", "expressive"][Math.floor(Math.random() * 5)];
  const jawline = ["sharp", "soft", "square", "defined", "rounded"][Math.floor(Math.random() * 5)];
  const cheekbones = ["prominent", "subtle", "high", "soft", "angular"][Math.floor(Math.random() * 5)];
  const hairStyle = ["short and neat", "messy textured", "swept back", "side-parted", "natural flow"][Math.floor(Math.random() * 5)];

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

  // derive accent colour palette from clothing hex
  const clothColour = dominantClothingHex;
  const paletteHint = `accent colour drawn from clothing tones near ${clothColour}, vibrant neon-magenta pink background`;

  // Expanded face structure descriptors
  const faceDesc = `${faceShape} face shape, ${eyeShape} expressive eyes, ${noseShape} nose, ${mouthShape} mouth, ${jawline} jawline, ${cheekbones} cheekbones`;

  // Multiple uniqueness tokens
  const uniquenessToken = `[uid:${traits.skinTone}-${traits.hairColour}-${traits.ageClass}-${rand}] [face:${faceShape}-${eyeShape}-${jawline}] [style:${hairStyle}-${cheekbones}]`;

  const prompt =
    `${subjectBase}, ${skinDesc}, ${hairDesc}, ${ageDesc}, ` +
    `${glassesDesc}${beardDesc}${exprDesc}` +
    `${faceDesc}, ` +
    `${ART_STYLE}, ${paletteHint}. ` +
    `Unique identity preserved. ${uniquenessToken}. ` +
    `Highly individual character design. One-of-a-kind portrait.`;

  return prompt;
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
      strength:             0.72,
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

  // All img2img models failed - fall back to text-to-image with gender-aware prompts
  console.warn("[ai-avatar] HF img2img models failed, falling back to text-to-image");
  const result = await hf.textToImage({
    model: "black-forest-labs/FLUX.1-schnell",
    inputs: prompt,
    parameters: {
      negative_prompt:     negativePrompt || NEGATIVE_PROMPT,
      num_inference_steps: 4,
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

// ─── Public entry point ───────────────────────────────────────────────────────

/**
 * Generate a unique Spider-Verse NFT portrait personalised to the person in the photo.
 *
 * Steps:
 *  1. Classify gender (HuggingFace)
 *  2. Extract visual traits via sharp pixel analysis
 *  3. Build hyper-personalised prompt
 *  4. Generate image (fal.ai → HuggingFace fallback)
 */
export async function generateAiAvatar(
  photoBuffer: Buffer,
  mimeType:    string,
  genderHint:  Gender | undefined,
  falApiKey:   string | undefined,
  hfToken?:    string,
  replicateToken?: string,
  styleImageBuffer?: Buffer,
): Promise<AiAvatarResult> {
  // 1. Gender
  let gender: Gender    = genderHint ?? "other";
  let genderConf        = genderHint ? 1.0 : 0;

  if (!genderHint && hfToken) {
    const ga = await analyzeGenderFromImage(photoBuffer, mimeType, hfToken).catch(() => null);
    if (ga) { gender = ga.gender; genderConf = ga.confidence; }
  }

  // 2. Visual trait extraction
  const traits = await extractVisualTraits(photoBuffer, gender, genderConf);

  // 3. Personalised prompt
  const prompt = buildPersonalisedPrompt(traits);
  const seed   = Math.floor(Math.random() * 2_147_483_647);

  // 4. Generate — priority chain: face-to-many → fal.ai FLUX → HF img2img → HF text2img
  //    face-to-many uses InstantID to preserve the user's face identity (users love this)
  let buffer:   Buffer;
  let provider: string;

  const style = traits.ageClass === "teen" ? "Anime"
    : traits.expression === "serious"      ? "Video game"
    : "Claymation";

  if (replicateToken) {
    try {
      buffer   = await generateViaFaceToMany(photoBuffer, mimeType, replicateToken, style, prompt);
      provider = `replicate/fofr-face-to-many (${style})`;
    } catch (ftmErr: unknown) {
      console.warn("[ai-avatar] face-to-many failed, trying SDXL img2img:", ftmErr instanceof Error ? ftmErr.message : String(ftmErr));
      try {
        buffer   = await generateViaReplicate(photoBuffer, mimeType, prompt, replicateToken, seed, styleImageBuffer);
        provider = "replicate/sdxl-img2img";
      } catch (repErr: unknown) {
        console.warn("[ai-avatar] SDXL failed, trying fal.ai:", repErr instanceof Error ? repErr.message : String(repErr));
        if (falApiKey) {
          buffer   = await generateViaFal(photoBuffer, mimeType, prompt, falApiKey, seed);
          provider = "fal.ai/flux-dev";
        } else if (hfToken) {
          buffer   = await generateViaHuggingFace(photoBuffer, mimeType, prompt, hfToken);
          provider = "huggingface/sdxl-fallback";
        } else {
          throw repErr;
        }
      }
    }
  } else if (falApiKey) {
    try {
      buffer   = await generateViaFal(photoBuffer, mimeType, prompt, falApiKey, seed);
      provider = "fal.ai/flux-dev";
    } catch (falErr: unknown) {
      const msg = falErr instanceof Error ? falErr.message : String(falErr);
      if (hfToken && (msg.includes("Forbidden") || msg.includes("402") || msg.includes("Payment"))) {
        console.warn(`[ai-avatar] fal.ai failed (${msg}), falling back to HuggingFace`);
        buffer   = await generateViaHuggingFace(photoBuffer, mimeType, prompt, hfToken);
        provider = "huggingface/flux-1-schnell (fallback)";
      } else {
        throw falErr;
      }
    }
  } else if (hfToken) {
    buffer   = await generateViaHuggingFace(photoBuffer, mimeType, prompt, hfToken);
    provider = "huggingface/flux-1-schnell";
  } else {
    throw new Error("No AI provider configured — set REPLICATE_API_TOKEN, FAL_KEY, or HUGGINGFACE_TOKEN in .env");
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
    "Comic":       `cosmic comic book portrait, bold india-ink outlines, halftone dot shadows, deep space galaxy background with nebula and stardust, celestial neon aura, Gen-Z young adult energy, graphic novel hero card, NFT avatar`,
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

  const prompt = `${subjectBase}, ${skinDesc}, ${hairDesc}, ${glassesDesc}${beardDesc}${styleArt[style]}, highly detailed, 1024x1024`;
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
