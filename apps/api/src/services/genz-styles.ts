/**
 * genz-styles.ts — Optimized Comic + Anime prompt system
 *
 * Based on what's ALREADY WORKING in your system:
 *   huggingface/flux-schnell (Comic) → produces the pop-art halftone images
 *
 * This file:
 *  1. Locks in the EXACT prompts that produced those great comic images
 *  2. Adds a matching high-quality Anime style
 *  3. Adds Cloudflare Workers AI as free fallback (10k/day free)
 *  4. Fixes trait detection so Gender/Skin/Hair show up correctly
 *
 * The 2 killer styles for Gen-Z NFTs:
 *  COMIC  — pop art, halftone dots, starburst, bold outlines (already working ✓)
 *  ANIME  — Japanese manga, cel shading, vibrant, expressive eyes
 */

// ─── Style definitions ────────────────────────────────────────────────────────

export type GenZNftStyle = "Comic" | "Anime" | "3D" | "Video game" | "Clay" | "Pixels";

interface StyleConfig {
  prompt:         string;
  negativePrompt: string;
  cfModel:        string;   // Cloudflare Workers AI model
  hfModel:        string;   // HuggingFace model
  steps:          number;
  guidance:       number;
}

// ─── COMIC — Locked to what produced your great screenshots ──────────────────
// These exact prompt tokens produced the pop-art halftone images you showed.
// DO NOT change the structure — only the face descriptor changes per user.

const COMIC_BASE =
  "pop art comic book portrait, bold black ink outlines, sharp crisp halftone dot shading pattern, " +
  "BACKGROUND: bright golden yellow starburst rays radiating outward on hot pink background, " +
  "retro 1960s comic book style, Roy Lichtenstein inspired, ben-day dots, flat bold colors, " +
  "dramatic face lighting, thick ink lines, speech-bubble energy, " +
  "face filling 65% of frame width, eyes at upper third, close-up portrait crop, " +
  "high contrast shadows, screen-print color separation, " +
  "professional comic book illustration, NFT avatar art, " +
  "ultra high resolution, sharp details, vibrant saturated colors, crisp clean lines";

const COMIC_NEGATIVE =
  "photorealistic, photograph, 3d render, blurry, watermark, text, logo, " +
  "dark background, dark gloomy, space background, cosmic background, galaxy background, " +
  "sad, ugly, extra limbs, bad anatomy, low quality, " +
  "monochrome, grey, washed out, anime, cartoon simple";

// ─── ANIME — The second killer style Gen-Z loves ──────────────────────────────
// Tuned for: vibrant cel-shaded portraits, expressive large eyes,
// glowing skin, dynamic hair, gradient background — what gets shared on TikTok/IG

const ANIME_BASE =
  "ultra high quality anime portrait, detailed manga illustration, " +
  "vibrant cel shading, expressive large anime eyes with detailed iris and catchlight, " +
  "warm amber orange gradient background with glowing light bloom, " +
  "detailed hair with individual strands and highlight sheen, " +
  "clean smooth skin with subtle blush, warm confident smile, bright expression, " +
  "face filling 65% of frame width, eyes at upper third, close-up portrait crop, " +
  "dynamic lighting from above, rim light glow, " +
  "professional anime studio quality, Makoto Shinkai style lighting, " +
  "crisp sharp lines, saturated colors, kawaii but mature aesthetic, " +
  "social media profile picture, square format, NFT avatar art, " +
  "ultra high resolution, sharp details, vibrant saturated colors, clean crisp rendering";

const ANIME_NEGATIVE =
  "photorealistic, photograph, western cartoon, chibi too simple, " +
  "blurry, watermark, text, low quality, bad anatomy, ugly, " +
  "dark gloomy background, 3d render, overexposed";

// ─── Style map ────────────────────────────────────────────────────────────────

export const STYLE_CONFIGS: Record<GenZNftStyle, StyleConfig> = {
  "Comic": {
    prompt:         COMIC_BASE,
    negativePrompt: COMIC_NEGATIVE,
    cfModel:  "@cf/bytedance/stable-diffusion-xl-lightning",
    hfModel:  "black-forest-labs/FLUX.1-schnell",
    steps:    25,   // Higher steps = better quality
    guidance: 7.5,  // Higher guidance = better prompt adherence
  },
  "Anime": {
    prompt:         ANIME_BASE,
    negativePrompt: ANIME_NEGATIVE,
    cfModel:  "@cf/bytedance/stable-diffusion-xl-lightning",
    hfModel:  "black-forest-labs/FLUX.1-schnell",
    steps:    25,   // Higher steps = better quality
    guidance: 7.5,  // Higher guidance = better prompt adherence
  },
  "3D": {
    prompt: [
      "Pixar Disney animated movie character portrait, stylized 3D cartoon illustration,",
      "smooth rounded stylized features, NOT photorealistic, animated film quality,",
      "warm studio lighting, vivid gradient background purple and orange glow,",
      "warm confident smile, bright cheerful expression,",
      "face filling 65% of frame width, close-up portrait crop,",
      "Pixar Inside Out character quality, Disney Encanto art style, NFT avatar, " +
      "ultra high resolution, sharp details, vibrant saturated colors, clean crisp rendering"
    ].join(" "),
    negativePrompt: "photorealistic, photograph, blurry, watermark, ugly, bad anatomy, " +
      "dark gloomy, CGI headshot, octane render, hyper realistic skin, stock photo, low quality",
    cfModel: "@cf/bytedance/stable-diffusion-xl-lightning",
    hfModel: "black-forest-labs/FLUX.1-schnell",
    steps: 25, guidance: 7.5,
  },
  "Video game": {
    prompt: [
      "video game character concept art portrait, stylized game art, heroic energy,",
      "bold saturated colors, dynamic rim lighting, action RPG style,",
      "character card art, detailed illustration, NFT avatar, " +
      "ultra high resolution, sharp details, vibrant saturated colors, clean crisp rendering"
    ].join(" "),
    negativePrompt: COMIC_NEGATIVE,
    cfModel: "@cf/bytedance/stable-diffusion-xl-lightning",
    hfModel: "black-forest-labs/FLUX.1-schnell",
    steps: 25, guidance: 7.5,
  },
  "Clay": {
    prompt: [
      "claymation portrait, stop-motion clay texture, colorful soft clay material,",
      "smooth rounded features, warm studio lighting, vibrant pastel background,",
      "Laika studios quality, cute handcrafted feel, NFT avatar, " +
      "ultra high resolution, sharp details, vibrant saturated colors, clean crisp rendering"
    ].join(" "),
    negativePrompt: ANIME_NEGATIVE,
    cfModel: "@cf/bytedance/stable-diffusion-xl-lightning",
    hfModel: "black-forest-labs/FLUX.1-schnell",
    steps: 25, guidance: 7.5,
  },
  "Pixels": {
    prompt: [
      "Spider-Verse Into the Spider-Verse comic illustration, halftone mosaic background,",
      "bold ink outlines, colorful mosaic tiles in warm orange red gold behind figure,",
      "graphic novel panel art, pop art energy, strong color contrast,",
      "warm confident smile, charismatic expression, face filling 65% of frame,",
      "close-up portrait crop, eyes at upper third of image,",
      "Sony animation quality, Into the Spider-Verse aesthetic, NFT avatar, Legendary tier, " +
      "ultra high resolution, sharp details, vibrant saturated colors, clean crisp rendering"
    ].join(" "),
    negativePrompt: "photorealistic, 3d render, photograph, blurry, watermark, ugly, bad anatomy, " +
      "dark gloomy, pixel art, 8-bit, retro game sprite, low quality",
    cfModel: "@cf/bytedance/stable-diffusion-xl-lightning",
    hfModel: "black-forest-labs/FLUX.1-schnell",
    steps: 25, guidance: 7.5,
  },
};

// ─── Face descriptor builder ──────────────────────────────────────────────────
// This is what makes each avatar UNIQUE to the person.
// Fixes the "-" issue: traits are now injected at the FRONT of every prompt.

export type Gender    = "male" | "female" | "other";
export type SkinTone  = "fair"|"warm-ivory"|"olive"|"medium-brown"|"warm-brown"|"deep-brown"|"dark";
export type HairColor = "jet-black"|"dark-brown"|"medium-brown"|"auburn"|"silver-grey"|"white"|"light";

const SKIN_DESC: Record<SkinTone, string> = {
  "fair":         "fair porcelain skin with cool rosy-pink undertones",
  "warm-ivory":   "warm ivory skin with soft golden undertones",
  "olive":        "warm olive skin with golden-green undertones",
  "medium-brown": "medium warm-brown skin with rich amber undertones",
  "warm-brown":   "rich warm brown skin with caramel amber undertones",
  "deep-brown":   "deep brown skin with warm mahogany undertones",
  "dark":         "deep rich dark skin with cool blue-black undertones",
};

const HAIR_DESC: Record<HairColor, string> = {
  "jet-black":    "sleek jet-black hair",
  "dark-brown":   "dark chestnut brown hair",
  "medium-brown": "medium warm brown hair",
  "auburn":       "auburn reddish-brown hair",
  "silver-grey":  "cool silver grey hair",
  "white":        "platinum white bleached hair",    // ← matches the photo you showed!
  "light":        "light sandy blonde hair",
};

const GENDER_DESC: Record<Gender, string> = {
  "male":   "young man",
  "female": "young woman",
  "other":  "young person",
};

const HAIR_NEGATION: Record<HairColor, string> = {
  "jet-black":    "NOT blonde hair, NOT red hair, NOT auburn hair, NOT grey hair",
  "dark-brown":   "NOT blonde hair, NOT red hair, NOT orange hair, NOT grey hair",
  "medium-brown": "NOT blonde hair, NOT red hair, NOT black hair, NOT grey hair",
  "auburn":       "NOT blonde hair, NOT jet-black hair, NOT grey hair",
  "silver-grey":  "NOT black hair, NOT brown hair, NOT red hair, NOT blonde hair",
  "white":        "NOT black hair, NOT brown hair, NOT red hair, NOT auburn hair",
  "light":        "NOT black hair, NOT dark hair, NOT red hair",
};

// ─── Regional bone structure for genz-styles ────────────────────────────────────
// Purely physical descriptors, no ethnicity labels, 4 variants per skin tone.

const GENZ_REGIONAL_FEATURES: Record<SkinTone, string[]> = {
  "fair": [
    "sharp angular cheekbones, defined sculpted jaw, light brow ridge",
    "soft prominent brow, fine angular nose, oval refined face",
    "strong angular jaw, high sharp cheekbones, narrow nose bridge",
    "delicate angular features, high forehead, refined jawline",
  ],
  "warm-ivory": [
    "smooth high flat cheekbones, elegant oval face, gentle soft jaw",
    "high broad forehead, smooth high cheekbones, gentle angular jaw",
    "refined symmetrical oval face, soft defined high cheekbones",
    "smooth broad forehead, gently arched brows, soft angular jaw",
  ],
  "olive": [
    "strong prominent nose bridge, high angular cheekbones, square jaw",
    "broad strong nose, angular prominent cheekbones, defined brow ridge",
    "wide angular cheekbones, strong broad nose, angular square jawline",
    "prominent nose bridge, high strong cheekbones, sharp jawline",
  ],
  "medium-brown": [
    "broad soft rounded cheekbones, wide nose bridge, rounded strong jaw",
    "broad cheekbones, wide flat nose bridge, defined angular jaw",
    "rounded prominent cheekbones, broad flat nose, strong soft jaw",
    "wide cheekbones, strong jaw, broad rounded nose bridge",
  ],
  "warm-brown": [
    "high prominent cheekbones, broad strong nose, defined angular jaw",
    "wide strong cheekbones, broad rounded nose, angular defined jaw",
    "broad prominent cheekbones, wide nose, strong jaw, full lips",
    "defined high cheekbones, broad nose bridge, strong jaw",
  ],
  "deep-brown": [
    "broad strong cheekbones, wide rounded nose, prominent angular jaw",
    "wide prominent cheekbones, broad flat nose bridge, strong angular jaw",
    "strong broad cheekbones, wide nose, defined prominent jaw, full lips",
    "prominent angular cheekbones, broad rounded nose, strong jaw",
  ],
  "dark": [
    "broad prominent cheekbones, wide flat nose, strong prominent defined jaw",
    "wide strong cheekbones, broad rounded nose bridge, angular jaw",
    "prominent broad cheekbones, wide flat nose, strong defined jaw, full lips",
    "strong wide cheekbones, broad nose, prominent angular jaw",
  ],
};

export function buildFaceDescriptor(
  gender:    Gender,
  skinTone:  SkinTone,
  hairColor: HairColor,
  hasBeard:  boolean,
  style:     GenZNftStyle,
): string {
  const genderWord  = GENDER_DESC[gender];
  const skinWord    = SKIN_DESC[skinTone];
  const hairWord    = HAIR_DESC[hairColor];
  const hairNeg     = HAIR_NEGATION[hairColor];
  const beardWord   = hasBeard ? ", well-groomed stylish stubble" : "";

  // Regional bone structure — randomly rotated per call for globally diverse output
  const pool        = GENZ_REGIONAL_FEATURES[skinTone];
  const regionalDesc = `, ${pool[Math.floor(Math.random() * pool.length)]}`;

  // Comic style
  if (style === "Comic") {
    return `Comic book portrait of a ${genderWord}, ${skinWord}${regionalDesc}, ${hairWord}${beardWord}, warm confident smile, bright expression, ${hairNeg}, `;
  }
  // Anime style
  if (style === "Anime") {
    return `Anime portrait of a ${genderWord}, ${skinWord}${regionalDesc}, detailed ${hairWord}${beardWord}, warm confident smile, ${hairNeg}, `;
  }
  // Pixels / Spider-Verse
  if (style === "Pixels") {
    return `Spider-Verse comic portrait of a ${genderWord}, ${skinWord}${regionalDesc}, ${hairWord}${beardWord}, warm confident smile, charismatic, ${hairNeg}, `;
  }
  // Generic for 3D / Video game / Clay
  return `Portrait of a ${genderWord}, ${skinWord}${regionalDesc}, ${hairWord}${beardWord}, warm confident smile, bright expression, ${hairNeg}, `;
}

// ─── Full prompt assembler ────────────────────────────────────────────────────

export function buildFullPrompt(
  style:     GenZNftStyle,
  gender:    Gender,
  skinTone:  SkinTone,
  hairColor: HairColor,
  hasBeard:  boolean,
): { prompt: string; negativePrompt: string } {
  const config     = STYLE_CONFIGS[style];
  const faceDesc   = buildFaceDescriptor(gender, skinTone, hairColor, hasBeard, style);

  return {
    prompt:         faceDesc + config.prompt,
    negativePrompt: config.negativePrompt,
  };
}

// ─── HuggingFace generator ────────────────────────────────────────────────────

export async function generateViaHuggingFace(
  style:     GenZNftStyle,
  gender:    Gender,
  skinTone:  SkinTone,
  hairColor: HairColor,
  hasBeard:  boolean,
  hfToken:   string,
): Promise<{ buffer: Buffer; provider: string }> {
  const { HfInference } = await import("@huggingface/inference");
  const hf  = new HfInference(hfToken);
  const cfg = STYLE_CONFIGS[style];
  const { prompt, negativePrompt } = buildFullPrompt(style, gender, skinTone, hairColor, hasBeard);

  console.log(`[genz-style] HF ${style} | gender=${gender} skin=${skinTone} hair=${hairColor}`);
  console.log(`[genz-style] prompt="${prompt.slice(0, 100)}..."`);

  const result = await hf.textToImage({
    model: cfg.hfModel,
    inputs: prompt,
    parameters: {
      negative_prompt:     negativePrompt,
      num_inference_steps: cfg.steps,  // 25 steps for quality
      guidance_scale:      cfg.guidance, // 7.5 for better prompt adherence
      width:  1024,
      height: 1024,
    },
  });

  const buffer = Buffer.from(await (result as unknown as Blob).arrayBuffer());
  return { buffer, provider: `huggingface/flux-schnell (${style})` };
}

// ─── Cloudflare Workers AI generator (FREE — 10,000 images/day) ──────────────
// Setup: https://dash.cloudflare.com → AI → Workers AI
// Railway env vars needed: CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_API_TOKEN

export async function generateViaCloudflare(
  style:     GenZNftStyle,
  gender:    Gender,
  skinTone:  SkinTone,
  hairColor: HairColor,
  hasBeard:  boolean,
  accountId: string,
  apiToken:  string,
): Promise<{ buffer: Buffer; provider: string }> {
  const cfg = STYLE_CONFIGS[style];
  const { prompt, negativePrompt } = buildFullPrompt(style, gender, skinTone, hairColor, hasBeard);

  const url  = `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${cfg.cfModel}`;
  const resp = await fetch(url, {
    method:  "POST",
    headers: { "Authorization": `Bearer ${apiToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      prompt,
      negative_prompt: negativePrompt,
      num_steps:       cfg.steps,  // Use configured steps (25 for quality)
      guidance:        cfg.guidance,
      width:  1024,
      height: 1024,
    }),
  });

  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`Cloudflare AI error ${resp.status}: ${err.slice(0, 200)}`);
  }

  const buffer = Buffer.from(await resp.arrayBuffer());
  return { buffer, provider: `cloudflare/sdxl-lightning (${style})` };
}

// ─── Main entry: generateGenZAvatar ──────────────────────────────────────────
// Priority: Cloudflare → HuggingFace → Replicate (face-to-many)

export async function generateGenZAvatar(params: {
  style:     GenZNftStyle;
  gender:    Gender;
  skinTone:  SkinTone;
  hairColor: HairColor;
  hasBeard:  boolean;
  // Provider tokens from process.env
  hfToken?:       string;
  cfAccountId?:   string;
  cfApiToken?:    string;
  replicateToken?: string;
  falApiKey?:     string;
}): Promise<{ buffer: Buffer; provider: string; prompt: string }> {
  const { style, gender, skinTone, hairColor, hasBeard } = params;
  const { prompt } = buildFullPrompt(style, gender, skinTone, hairColor, hasBeard);

  // 1. Cloudflare Workers AI (10k/day free — FIRST priority)
  if (params.cfAccountId && params.cfApiToken) {
    try {
      const { buffer, provider } = await generateViaCloudflare(
        style, gender, skinTone, hairColor, hasBeard,
        params.cfAccountId, params.cfApiToken
      );
      return { buffer, provider, prompt };
    } catch (err) {
      console.warn(`[genz] Cloudflare failed: ${err instanceof Error ? err.message : err}`);
    }
  }

  // 2. HuggingFace FLUX.1-schnell (free monthly quota — fallback)
  if (params.hfToken) {
    try {
      const { buffer, provider } = await generateViaHuggingFace(
        style, gender, skinTone, hairColor, hasBeard, params.hfToken
      );
      return { buffer, provider, prompt };
    } catch (err) {
      console.warn(`[genz] HuggingFace failed: ${err instanceof Error ? err.message : err}`);
    }
  }

  // 3. Replicate face-to-many (best face preservation, ~$0.02/img)
  if (params.replicateToken) {
    const styleMap: Record<GenZNftStyle, string> = {
      "Comic": "Anime", "Anime": "Anime", "3D": "3D",
      "Video game": "Video game", "Clay": "Claymation", "Pixels": "Pixels",
    };
    const replicateStyle = styleMap[style];
    const resp = await fetch("https://api.replicate.com/v1/predictions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${params.replicateToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        version: "a07f252abbbd832009640b27f063ea52d87d7a23a185ca165bec23b5adc8deaf",
        input: { style: replicateStyle, prompt, instant_id_strength: 0.8 },
      }),
    });
    let pred = await resp.json() as any;
    for (let i = 0; i < 30 && pred.status !== "succeeded" && pred.status !== "failed"; i++) {
      await new Promise(r => setTimeout(r, 2500));
      pred = await (await fetch(`https://api.replicate.com/v1/predictions/${pred.id}`, {
        headers: { "Authorization": `Bearer ${params.replicateToken}` },
      })).json();
    }
    if (pred.status === "succeeded") {
      const imgBuf = Buffer.from(await (await fetch(pred.output[0])).arrayBuffer());
      return { buffer: imgBuf, provider: `replicate/face-to-many (${style})`, prompt };
    }
  }

  throw new Error("No AI provider available. Set HUGGINGFACE_TOKEN or CLOUDFLARE_ACCOUNT_ID + CLOUDFLARE_API_TOKEN in Railway.");
}

// ─── Rarity → Style mapping ───────────────────────────────────────────────────

export const RARITY_STYLE: Record<string, GenZNftStyle> = {
  common:    "Comic",       // pop art — instantly loveable, most accessible
  rare:      "Anime",       // anime — Gen-Z favorite, warm + expressive
  epic:      "3D",          // Pixar cartoon — premium, Disney quality
  legendary: "Pixels",      // Spider-Verse — rarest, most shareable, highest FOMO
};

export function styleForRarity(rarity: string): GenZNftStyle {
  return RARITY_STYLE[rarity] ?? "Comic";
}
