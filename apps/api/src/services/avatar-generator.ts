/**
 * Avatar Generator Service
 * 
 * Generates cartoon avatars using the DiceBear API (free, no API key required).
 * Maps detected facial features to avatar configuration parameters.
 * 
 * Supported styles:
 * - avataaars: Classic Bitmoji-style
 * - lorelei: Elegant feminine style
 * - notionists: Professional/minimal style
 * - big-smile: Expressive/friendly style
 * 
 * @module services/avatar-generator
 */

import sharp from "sharp";
import axios, { AxiosError } from "axios";

// ============================================================================
// Type Definitions
// ============================================================================

export type AvatarStyle = "avataaars" | "lorelei" | "notionists" | "big-smile";
export type Gender = "male" | "female";

export interface AvatarConfig {
  style: AvatarStyle;
  gender: Gender;
  hairColor: string; // Hex color
  skinColor: string; // Hex color
  eyeColor: string; // Hex color
  accessories?: string[];
  clothing?: string;
  backgroundColor?: string;
  facialHair?: string;
  eyebrows?: string;
  mouth?: string;
  top?: string;
}

export interface AvatarGenerationOptions {
  size?: number; // Output image size (default: 512)
  format?: "png" | "jpeg" | "webp";
  quality?: number; // 1-100 for jpeg/webp
}

export interface AvatarResult {
  buffer: Buffer;
  config: AvatarConfig;
  size: number;
  format: string;
}

// ============================================================================
// Constants
// ============================================================================

const DICEBEAR_API_BASE = "https://api.dicebear.com/7.x";
const DEFAULT_OPTIONS: AvatarGenerationOptions = {
  size: 512,
  format: "png",
  quality: 90,
};

// Color mappings for DiceBear
const COLOR_MAPS = {
  hair: {
    black: "0C0C0C",
    brown: "4A3728",
    blonde: "E8CE87",
    red: "A52A2A",
    grey: "808080",
    white: "F5F5F5",
  },
  skin: {
    fair: "F8D9CE",
    medium: "E0AC69",
    olive: "C68642",
    brown: "8D5524",
    dark: "5C3317",
  },
  eyes: {
    brown: "5C3317",
    blue: "1E90FF",
    green: "228B22",
    hazel: "8E7616",
    black: "0C0C0C",
  },
} as const;

// ============================================================================
// Main Function
// ============================================================================

/**
 * Generates a cartoon avatar from configuration.
 * 
 * @param config - Avatar configuration
 * @param options - Generation options
 * @returns Promise<AvatarResult> - Generated avatar image
 * 
 * @throws Error if generation fails
 */
export async function generateAvatar(
  config: AvatarConfig,
  options: AvatarGenerationOptions = {}
): Promise<AvatarResult> {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  try {
    // Build DiceBear API URL
    const url = buildDiceBearUrl(config);

    // Fetch SVG from DiceBear
    const response = await axios.get(url, {
      responseType: "arraybuffer",
      timeout: 10000, // 10 second timeout
    });

    if (response.status !== 200) {
      throw new Error(`DiceBear API returned status ${response.status}`);
    }

    const svgBuffer = Buffer.from(response.data);

    // Convert SVG to desired format using Sharp
    let image = sharp(svgBuffer).resize(opts.size, opts.size, {
      fit: "cover",
      position: "center",
    });

    // Apply format-specific options
    switch (opts.format) {
      case "jpeg":
        image = image.jpeg({ quality: opts.quality });
        break;
      case "webp":
        image = image.webp({ quality: opts.quality });
        break;
      case "png":
      default:
        image = image.png();
        break;
    }

    const buffer = await image.toBuffer();

    return {
      buffer,
      config,
      size: (opts.size ?? DEFAULT_OPTIONS.size) as number,
      format: (opts.format ?? DEFAULT_OPTIONS.format) as string,
    };
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;
      if (axiosError.code === "ECONNABORTED") {
        throw new Error("Avatar generation timeout: DiceBear API took too long to respond");
      }
      if (axiosError.response) {
        throw new Error(`DiceBear API error: ${axiosError.response.status} ${axiosError.response.statusText}`);
      }
      if (axiosError.request) {
        throw new Error("DiceBear API unreachable: check internet connection");
      }
    }
    throw new Error(`Avatar generation failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// ============================================================================
// Mapping Functions
// ============================================================================

/**
 * Maps face features to avatar configuration.
 * Uses detected features to select appropriate avatar parameters.
 */
export function mapFaceFeaturesToAvatarConfig(
  features: import("./face-analysis").FaceFeatures,
  style: AvatarStyle = "avataaars"
): AvatarConfig {
  const config: AvatarConfig = {
    style,
    gender: features.gender,
    hairColor: mapHairColor(features.hairColor),
    skinColor: mapSkinTone(features.skinTone),
    eyeColor: mapEyeColor(features.eyeColor),
    backgroundColor: "transparent",
  };

  // Add accessories based on features
  if (features.hasGlasses) {
    config.accessories = ["prescription01"];
  }

  // Add facial hair for males
  if (features.hasBeard) {
    config.facialHair = "beardMedium"; // valid avataaars enum
  }

  // Style-specific customizations
  switch (style) {
    case "avataaars":
      config.clothing = "blazerAndShirt";
      config.top = features.gender === "male" ? "shortWaved" : "longButNotTooLong";
      break;
    case "lorelei":
      config.clothing = undefined;
      config.top = undefined;
      break;
    case "notionists":
      config.clothing = undefined;
      config.top = undefined;
      break;
    case "big-smile":
      config.clothing = "hoodie";
      config.top = "shortWaved";
      config.mouth = "smile";
      break;
  }

  // Expression-based mouth
  if (features.expression === "laugh") {
    config.mouth = "tongue";
  } else if (features.expression === "surprise") {
    config.mouth = "screamOpen";
  } else if (features.expression === "serious") {
    config.mouth = "default";
  } else if (features.expression === "smile") {
    config.mouth = "smile";
  }

  return config;
}

/**
 * Maps hair color to DiceBear hex color.
 */
function mapHairColor(color: import("./face-analysis").HairColor): string {
  return COLOR_MAPS.hair[color] || COLOR_MAPS.hair.black;
}

/**
 * Maps skin tone to DiceBear hex color.
 */
function mapSkinTone(tone: import("./face-analysis").SkinTone): string {
  return COLOR_MAPS.skin[tone] || COLOR_MAPS.skin.medium;
}

/**
 * Maps eye color to DiceBear hex color.
 */
function mapEyeColor(color: import("./face-analysis").EyeColor): string {
  return COLOR_MAPS.eyes[color] || COLOR_MAPS.eyes.brown;
}

// ============================================================================
// URL Building
// ============================================================================

// ============================================================================
// Valid DiceBear v7 enum values per style
// ============================================================================

const VALID = {
  avataaars: {
    clothing: ["blazerAndSweater", "blazerAndShirt", "collarAndSweater", "graphicShirt", "hoodie", "overall", "shirtCrewNeck", "shirtScoopNeck", "shirtVNeck"],
    top:      ["bigHair", "bun", "curly", "curvy", "dreads", "frida", "fro", "froAndBand", "longButNotTooLong", "miaWallace", "shavedSides", "shortCurly", "shortFlat", "shortRound", "shortWaved", "sides", "straight01", "straight02", "straightAndStrand", "dreads01", "dreads02", "hat", "hijab", "turban", "winterHat02", "winterHat03", "winterHat04"],
    mouth:    ["concerned", "default", "disbelief", "eating", "grimace", "sad", "screamOpen", "serious", "smile", "tongue", "twinkle"],
    facialHair: ["beardLight", "beardMagestic", "beardMedium", "moustacheFancy", "moustacheMagnum"],
    accessories: ["kurt", "prescription01", "prescription02", "round", "sunglasses", "wayfarers"],
  },
} as const;

/**
 * Builds DiceBear API URL from configuration.
 * Only passes parameters that are valid for the given style.
 */
function buildDiceBearUrl(config: AvatarConfig): string {
  const baseUrl = `${DICEBEAR_API_BASE}/${config.style}/svg`;
  const params = new URLSearchParams();

  // Seed for reproducibility
  params.set("seed", Math.random().toString(36).substring(7));

  // Colors — DiceBear expects hex WITHOUT '#'
  params.set("hairColor", config.hairColor.replace("#", ""));
  params.set("skinColor", config.skinColor.replace("#", ""));

  // Background
  if (config.backgroundColor && config.backgroundColor !== "transparent") {
    params.set("backgroundColor", config.backgroundColor.replace("#", ""));
  }

  // avataaars-specific enum params — guard against invalid values
  if (config.style === "avataaars") {
    const v = VALID.avataaars;

    if (config.clothing && (v.clothing as readonly string[]).includes(config.clothing)) {
      params.set("clothing", config.clothing);
    } else {
      params.set("clothing", "blazerAndShirt");
    }

    if (config.top && (v.top as readonly string[]).includes(config.top)) {
      params.set("top", config.top);
    } else {
      params.set("top", config.gender === "male" ? "shortWaved" : "longButNotTooLong");
    }

    if (config.mouth && (v.mouth as readonly string[]).includes(config.mouth)) {
      params.set("mouth", config.mouth);
    } else {
      params.set("mouth", "smile");
    }

    if (config.facialHair && (v.facialHair as readonly string[]).includes(config.facialHair)) {
      params.set("facialHair", config.facialHair);
      params.set("facialHairProbability", "100");
    }

    if (config.accessories && config.accessories.length > 0) {
      const validAcc = config.accessories.filter(a => (v.accessories as readonly string[]).includes(a));
      if (validAcc.length > 0) {
        params.set("accessories", validAcc[0]); // DiceBear v7 takes single value
        params.set("accessoriesProbability", "100");
      }
    }
  }

  return `${baseUrl}?${params.toString()}`;
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Validates avatar configuration.
 */
export function validateAvatarConfig(config: AvatarConfig): boolean {
  if (!config.style || !["avataaars", "lorelei", "notionists", "big-smile"].includes(config.style)) {
    return false;
  }

  if (!config.gender || !["male", "female"].includes(config.gender)) {
    return false;
  }

  if (!config.hairColor || !/^#[0-9A-Fa-f]{6}$/.test(config.hairColor)) {
    return false;
  }

  if (!config.skinColor || !/^#[0-9A-Fa-f]{6}$/.test(config.skinColor)) {
    return false;
  }

  if (!config.eyeColor || !/^#[0-9A-Fa-f]{6}$/.test(config.eyeColor)) {
    return false;
  }

  return true;
}

/**
 * Gets available avatar styles.
 */
export function getAvailableStyles(): AvatarStyle[] {
  return ["avataaars", "lorelei", "notionists", "big-smile"];
}

/**
 * Gets style description.
 */
export function getStyleDescription(style: AvatarStyle): string {
  const descriptions: Record<AvatarStyle, string> = {
    avataaars: "Classic Bitmoji-style cartoon avatar",
    lorelei: "Elegant feminine avatar with soft features",
    notionists: "Professional minimal avatar",
    "big-smile": "Expressive friendly avatar with big smile",
  };
  return descriptions[style] || "Unknown style";
}

// ============================================================================
// Rarity-Routed Avatar Generation
// ============================================================================

export type Rarity = "common" | "rare" | "epic" | "legendary";

export interface RarityAvatarResult {
  pngBuffer: Buffer;
  source: string;
}

/**
 * Ready Player Me — photo → Bitmoji-style PNG (Rare + Epic tiers).
 * Free plan: 100 renders/day. Sign up at studio.readyplayer.me.
 * Env vars needed: RPM_APP_ID, RPM_API_KEY
 */
async function rpmAvatar(
  photoBuffer: Buffer,
  gender: "male" | "female",
  stylePreset: "default" | "cartoon" = "cartoon"
): Promise<RarityAvatarResult> {
  const RPM_APP_ID  = process.env.RPM_APP_ID!;
  const RPM_API_KEY = process.env.RPM_API_KEY!;

  const form = new FormData();
  form.append("photo",  new Blob([new Uint8Array(photoBuffer)], { type: "image/png" }), "photo.png");
  form.append("gender", gender);
  form.append("style",  stylePreset);

  const createResp = await fetch("https://api.readyplayer.me/v1/avatars/create-from-photo", {
    method: "POST",
    headers: { "X-APP-ID": RPM_APP_ID, "X-API-KEY": RPM_API_KEY },
    body: form,
  });
  const createData = await createResp.json() as { data?: { id: string } };
  const avatarId = createData.data?.id;
  if (!avatarId) throw new Error(`RPM create failed: ${JSON.stringify(createData)}`);

  const renderUrl = `https://models.readyplayer.me/${avatarId}.png?size=512&bg=transparent&renderCamera=portrait`;
  const imgResp   = await fetch(renderUrl, { headers: { "X-API-KEY": RPM_API_KEY } });
  if (!imgResp.ok) throw new Error(`RPM render failed: ${imgResp.statusText}`);

  const pngBuffer = await sharp(Buffer.from(await imgResp.arrayBuffer()))
    .resize(512, 512).png().toBuffer();

  return { pngBuffer, source: `rpm-${stylePreset}` };
}

/**
 * Replicate face-to-many — Epic: "Video game" style, Legendary: "Clay" style.
 * Cost: ~$0.02/image. Sign up at replicate.com.
 * Env var needed: REPLICATE_API_TOKEN
 */
async function replicateFaceToMany(
  photoBuffer: Buffer,
  rarity: "epic" | "legendary"
): Promise<RarityAvatarResult> {
  const TOKEN = process.env.REPLICATE_API_TOKEN!;
  const STYLE = rarity === "legendary" ? "Clay" : "Video game";

  const createResp = await fetch("https://api.replicate.com/v1/predictions", {
    method: "POST",
    headers: { "Authorization": `Token ${TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      version: "a07f252abbbd832009640b27f063ea52d87d7a23ce5e8ecff4cb6b3e6b5d606d",
      input: {
        image:                   `data:image/png;base64,${photoBuffer.toString("base64")}`,
        style:                   STYLE,
        prompt:                  "portrait, cartoon avatar, vibrant, detailed, NFT art",
        negative_prompt:         "ugly, blurry, low quality, extra fingers",
        instant_id_strength:     0.8,
      },
    }),
  });
  let result = await createResp.json() as { id: string; status: string; output?: string[]; error?: string };

  while (result.status !== "succeeded" && result.status !== "failed") {
    await new Promise(r => setTimeout(r, 2500));
    const poll = await fetch(`https://api.replicate.com/v1/predictions/${result.id}`, {
      headers: { "Authorization": `Token ${TOKEN}` },
    });
    result = await poll.json() as typeof result;
  }

  if (result.status === "failed") throw new Error(`Replicate failed: ${result.error}`);

  const imgResp   = await fetch(result.output![0]);
  const pngBuffer = await sharp(Buffer.from(await imgResp.arrayBuffer()))
    .resize(512, 512).png().toBuffer();

  return { pngBuffer, source: `replicate-face-to-many-${STYLE.toLowerCase()}` };
}

/**
 * Generates avatar PNG routed by rarity tier:
 *   common    → DiceBear avataaars (free, no API key)
 *   rare      → Ready Player Me cartoon (free plan, needs RPM_APP_ID + RPM_API_KEY)
 *   epic      → Replicate face-to-many "Video game" (~$0.02, needs REPLICATE_API_TOKEN)
 *   legendary → Replicate face-to-many "Clay" (~$0.02, needs REPLICATE_API_TOKEN)
 *
 * Falls back to previous tier on error.
 */
export async function generateAvatarByRarity(
  features: import("./face-analysis").FaceFeatures,
  rarity: Rarity,
  photoBuffer: Buffer
): Promise<RarityAvatarResult> {
  const gender: "male" | "female" = features.gender === "male" ? "male" : "female";

  if (rarity === "common") {
    const result = await generateAvatar(mapFaceFeaturesToAvatarConfig(features, "avataaars"), { size: 512 });
    return { pngBuffer: result.buffer, source: "dicebear-avataaars" };
  }

  if (rarity === "rare") {
    try {
      return await rpmAvatar(photoBuffer, gender, "cartoon");
    } catch (err) {
      console.warn("[avatar] RPM failed, fallback DiceBear:", (err as Error).message);
      const result = await generateAvatar(mapFaceFeaturesToAvatarConfig(features, "avataaars"), { size: 512 });
      return { pngBuffer: result.buffer, source: "dicebear-avataaars-fallback" };
    }
  }

  if (rarity === "epic") {
    try {
      return await replicateFaceToMany(photoBuffer, "epic");
    } catch (err) {
      console.warn("[avatar] Replicate epic failed, fallback RPM:", (err as Error).message);
      return rpmAvatar(photoBuffer, gender, "cartoon");
    }
  }

  return replicateFaceToMany(photoBuffer, "legendary");
}

/**
 * Derives rarity from a user's PCASH balance (wei string or bigint).
 *   >= 10,000 PCASH → legendary
 *   >= 2,000  PCASH → epic
 *   >= 500    PCASH → rare
 *   < 500     PCASH → common
 */
export function rarityFromBalance(pcashBalanceWei: bigint | string): Rarity {
  const b = Number(BigInt(pcashBalanceWei)) / 1e18;
  if (b >= 10_000) return "legendary";
  if (b >= 2_000)  return "epic";
  if (b >= 500)    return "rare";
  return "common";
}
