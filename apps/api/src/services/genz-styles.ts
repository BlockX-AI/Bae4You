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
  "pop art comic book portrait, bold black ink outlines, halftone dot shading pattern, " +
  "vibrant starburst radial background pink magenta yellow, retro 1960s comic book style, " +
  "Roy Lichtenstein inspired, ben-day dots, flat bold colors, dramatic face lighting, " +
  "thick ink lines, speech-bubble energy, heroic pose, square format, " +
  "high contrast shadows, screen-print color separation, " +
  "professional comic book illustration, NFT avatar art";

const COMIC_NEGATIVE =
  "photorealistic, photograph, 3d render, blurry, watermark, text, logo, " +
  "dark gloomy, sad, ugly, extra limbs, bad anatomy, low quality, " +
  "monochrome, grey, washed out, anime, cartoon simple";

// ─── ANIME — The second killer style Gen-Z loves ──────────────────────────────
// Tuned for: vibrant cel-shaded portraits, expressive large eyes,
// glowing skin, dynamic hair, gradient background — what gets shared on TikTok/IG

const ANIME_BASE =
  "high quality anime portrait, detailed manga illustration, " +
  "vibrant cel shading, expressive large anime eyes with detailed iris and catchlight, " +
  "soft gradient background pink purple blue pastel, " +
  "detailed hair with individual strands and highlight sheen, " +
  "clean smooth skin with subtle blush, " +
  "dynamic lighting from above, rim light glow, " +
  "professional anime studio quality, Makoto Shinkai style lighting, " +
  "crisp sharp lines, saturated colors, kawaii but mature aesthetic, " +
  "social media profile picture, square format, NFT avatar art";

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
    steps:    4,    // FLUX schnell is optimized for 4 steps
    guidance: 3.5,  // lower guidance = better for schnell
  },
  "Anime": {
    prompt:         ANIME_BASE,
    negativePrompt: ANIME_NEGATIVE,
    cfModel:  "@cf/bytedance/stable-diffusion-xl-lightning",
    hfModel:  "black-forest-labs/FLUX.1-schnell",
    steps:    4,
    guidance: 3.5,
  },
  "3D": {
    prompt: [
      "cinematic 3D character portrait, Pixar animation style, subsurface skin scattering,",
      "soft volumetric lighting, clean studio background gradient, smooth high-poly face,",
      "professional CGI render, octane render quality, warm rim lighting, NFT avatar"
    ].join(" "),
    negativePrompt: COMIC_NEGATIVE,
    cfModel: "@cf/bytedance/stable-diffusion-xl-lightning",
    hfModel: "black-forest-labs/FLUX.1-schnell",
    steps: 4, guidance: 3.5,
  },
  "Video game": {
    prompt: [
      "video game character concept art portrait, stylized game art, heroic energy,",
      "bold saturated colors, dynamic rim lighting, action RPG style,",
      "character card art, detailed illustration, NFT avatar"
    ].join(" "),
    negativePrompt: COMIC_NEGATIVE,
    cfModel: "@cf/bytedance/stable-diffusion-xl-lightning",
    hfModel: "black-forest-labs/FLUX.1-schnell",
    steps: 4, guidance: 3.5,
  },
  "Clay": {
    prompt: [
      "claymation portrait, stop-motion clay texture, colorful soft clay material,",
      "smooth rounded features, warm studio lighting, vibrant pastel background,",
      "Laika studios quality, cute handcrafted feel, NFT avatar"
    ].join(" "),
    negativePrompt: ANIME_NEGATIVE,
    cfModel: "@cf/bytedance/stable-diffusion-xl-lightning",
    hfModel: "black-forest-labs/FLUX.1-schnell",
    steps: 4, guidance: 3.5,
  },
  "Pixels": {
    prompt: [
      "pixel art portrait, 32-bit retro game sprite style, bold pixel blocks,",
      "limited color palette, clean pixel art face, colorful retro background,",
      "detailed pixel shading, indie game art quality, NFT avatar"
    ].join(" "),
    negativePrompt: COMIC_NEGATIVE,
    cfModel: "@cf/bytedance/stable-diffusion-xl-lightning",
    hfModel: "black-forest-labs/FLUX.1-schnell",
    steps: 4, guidance: 3.5,
  },
};

// ─── Face descriptor builder ──────────────────────────────────────────────────
// This is what makes each avatar UNIQUE to the person.
// Fixes the "-" issue: traits are now injected at the FRONT of every prompt.

export type Gender    = "male" | "female" | "other";
export type SkinTone  = "fair"|"warm-ivory"|"olive"|"medium-brown"|"warm-brown"|"deep-brown"|"dark";
export type HairColor = "jet-black"|"dark-brown"|"medium-brown"|"auburn"|"silver-grey"|"white"|"light";

const SKIN_DESC: Record<SkinTone, string> = {
  "fair":         "fair porcelain skin",
  "warm-ivory":   "warm ivory skin with golden undertones",
  "olive":        "olive warm Mediterranean skin",
  "medium-brown": "medium warm South Asian brown skin",
  "warm-brown":   "rich warm brown skin",
  "deep-brown":   "deep brown skin with warm undertones",
  "dark":         "deep dark rich skin",
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

export function buildFaceDescriptor(
  gender:    Gender,
  skinTone:  SkinTone,
  hairColor: HairColor,
  hasBeard:  boolean,
  style:     GenZNftStyle,
): string {
  const genderWord = GENDER_DESC[gender];
  const skinWord   = SKIN_DESC[skinTone];
  const hairWord   = HAIR_DESC[hairColor];
  const beardWord  = hasBeard ? ", well-groomed stylish stubble" : "";

  // Comic style uses "portrait of" framing
  if (style === "Comic") {
    return `Comic book portrait of a ${genderWord}, ${skinWord}, ${hairWord}${beardWord}, confident expression, `;
  }
  // Anime style uses "anime character" framing
  if (style === "Anime") {
    return `Anime portrait of a ${genderWord}, ${skinWord}, detailed ${hairWord}${beardWord}, warm confident smile, `;
  }
  // Generic for other styles
  return `Portrait of a ${genderWord}, ${skinWord}, ${hairWord}${beardWord}, confident expression, `;
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
      num_inference_steps: cfg.steps,
      guidance_scale:      cfg.guidance,
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
      num_steps:       20,      // CF SDXL-Lightning uses num_steps not num_inference_steps
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
// Priority: HuggingFace → Cloudflare → Replicate (face-to-many)

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

  // 1. HuggingFace FLUX.1-schnell (free monthly quota)
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

  // 2. Cloudflare Workers AI (10k/day free — best free fallback)
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
  common:    "Comic",       // pop art — instantly loveable
  rare:      "Anime",       // anime — Gen-Z favorite
  epic:      "Video game",  // game character — hype
  legendary: "3D",          // Pixar quality — premium
};

export function styleForRarity(rarity: string): GenZNftStyle {
  return RARITY_STYLE[rarity] ?? "Comic";
}
