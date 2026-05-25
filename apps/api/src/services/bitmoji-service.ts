/**
 * Bitmoji Service - Main Orchestrator
 * 
 * Coordinates face analysis, avatar generation, and sticker creation.
 * This is the main entry point for the Bitmoji Identity Engine.
 * 
 * @module services/bitmoji-service
 */

import { analyzeFaceFromImage, FaceFeatures, Gender, validateImageBuffer } from "./face-analysis";
import { 
  generateAvatar, 
  mapFaceFeaturesToAvatarConfig, 
  AvatarStyle,
  AvatarResult 
} from "./avatar-generator";
import { 
  generateBae4UStickers, 
  StickerResult,
  validateStickerConfig 
} from "./sticker-generator";

// ============================================================================
// Type Definitions
// ============================================================================

export interface BitmojiGenerationOptions {
  style?: AvatarStyle;
  gender?: Gender;         // Override auto-detected gender
  generateStickers?: boolean;
  stickerSize?: number;
  avatarSize?: number;
  debug?: boolean;
}

export interface BitmojiResult {
  avatar: AvatarResult;
  stickers: StickerResult[];
  features: FaceFeatures;
  style: AvatarStyle;
  timestamp: number;
}

export interface BitmojiError extends Error {
  code?: string;
  stage?: "face-analysis" | "avatar-generation" | "sticker-generation";
}

// ============================================================================
// Main Function
// ============================================================================

/**
 * Generates a complete Bitmoji avatar and sticker pack from a photo.
 * 
 * Pipeline:
 * 1. Validate input
 * 2. Analyze face features
 * 3. Generate avatar from features
 * 4. Generate sticker pack from avatar
 * 5. Return complete result
 * 
 * @param photoBuffer - User photo buffer
 * @param options - Generation options
 * @returns Promise<BitmojiResult> - Complete bitmoji result
 * 
 * @throws BitmojiError if any stage fails
 */
export async function generateBitmojiFromPhoto(
  photoBuffer: Buffer,
  options: BitmojiGenerationOptions = {}
): Promise<BitmojiResult> {
  const {
    style = "avataaars",
    gender,
    generateStickers = true,
    stickerSize = 512,
    avatarSize = 512,
    debug = false,
  } = options;

  const startTime = Date.now();

  try {
    // Stage 1: Validate input
    if (debug) {
      console.log("[BitmojiService] Stage 1: Validating input...");
    }

    if (!validateImageBuffer(photoBuffer)) {
      throw createBitmojiError("Invalid image buffer", "face-analysis");
    }

    // Stage 2: Analyze face
    if (debug) {
      console.log("[BitmojiService] Stage 2: Analyzing face...");
    }

    let features = await analyzeFaceFromImage(photoBuffer, { debug });

    // Apply explicit gender override if provided
    if (gender) {
      features = { ...features, gender };
    }

    if (debug) {
      console.log("[BitmojiService] Face features extracted:", features);
    }

    // Stage 3: Generate avatar
    if (debug) {
      console.log("[BitmojiService] Stage 3: Generating avatar...");
    }

    const avatarConfig = mapFaceFeaturesToAvatarConfig(features, style);
    const avatar = await generateAvatar(avatarConfig, { size: avatarSize });

    if (debug) {
      console.log("[BitmojiService] Avatar generated successfully");
    }

    // Stage 4: Generate stickers
    let stickers: StickerResult[] = [];
    if (generateStickers) {
      if (debug) {
        console.log("[BitmojiService] Stage 4: Generating stickers...");
      }

      stickers = await generateBae4UStickers(avatar.buffer, stickerSize);

      if (debug) {
        console.log(`[BitmojiService] Generated ${stickers.length} stickers`);
      }
    }

    const duration = Date.now() - startTime;

    if (debug) {
      console.log(`[BitmojiService] Complete in ${duration}ms`);
    }

    return {
      avatar,
      stickers,
      features,
      style,
      timestamp: Date.now(),
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    
    if (debug) {
      console.error(`[BitmojiService] Failed after ${duration}ms:`, error);
    }

    // Determine error stage
    let stage: BitmojiError["stage"] = "face-analysis";
    if (error instanceof Error) {
      if (error.message.includes("DiceBear") || error.message.includes("avatar")) {
        stage = "avatar-generation";
      } else if (error.message.includes("sticker") || error.message.includes("canvas")) {
        stage = "sticker-generation";
      }
    }

    throw createBitmojiError(
      error instanceof Error ? error.message : String(error),
      stage
    );
  }
}

// ============================================================================
// Couple Avatar Generation
// ============================================================================

export interface CoupleBitmojiOptions extends BitmojiGenerationOptions {
  photo2: Buffer;
  bonded?: boolean;
}

export interface CoupleBitmojiResult {
  avatar1: BitmojiResult;
  avatar2: BitmojiResult;
  coupleStickers: StickerResult[];
  bonded: boolean;
  timestamp: number;
}

/**
 * Generates matching couple avatars from two photos.
 * 
 * @param photo1 - Partner 1 photo
 * @param photo2 - Partner 2 photo
 * @param options - Generation options
 * @returns Promise<CoupleBitmojiResult> - Couple bitmoji result
 */
export async function generateCoupleBitmoji(
  photo1: Buffer,
  photo2: Buffer,
  options: CoupleBitmojiOptions
): Promise<CoupleBitmojiResult> {
  const { bonded = false, ...bitmojiOptions } = options;

  if (!validateImageBuffer(photo1) || !validateImageBuffer(photo2)) {
    throw createBitmojiError("Invalid image buffer(s)", "face-analysis");
  }

  // Generate both avatars in parallel
  const [avatar1, avatar2] = await Promise.all([
    generateBitmojiFromPhoto(photo1, bitmojiOptions),
    generateBitmojiFromPhoto(photo2, bitmojiOptions),
  ]);

  // Generate couple-specific stickers
  const coupleStickers: StickerResult[] = [];
  
  // Add connected hearts sticker
  if (bonded) {
    const avatar1Stickers = await generateBae4UStickers(avatar1.avatar.buffer);
    coupleStickers.push(avatar1Stickers[1]); // connected-hearts
  }

  return {
    avatar1,
    avatar2,
    coupleStickers,
    bonded,
    timestamp: Date.now(),
  };
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Creates a standardized Bitmoji error.
 */
function createBitmojiError(
  message: string,
  stage: BitmojiError["stage"] = "face-analysis"
): BitmojiError {
  const error = new Error(message) as BitmojiError;
  error.code = "BITMOJI_ERROR";
  error.stage = stage;
  return error;
}

/**
 * Validates bitmoji generation options.
 */
export function validateBitmojiOptions(options: BitmojiGenerationOptions): boolean {
  if (options.style && !["avataaars", "lorelei", "notionists", "big-smile"].includes(options.style)) {
    return false;
  }

  if (options.avatarSize && (options.avatarSize < 64 || options.avatarSize > 2048)) {
    return false;
  }

  if (options.stickerSize && (options.stickerSize < 64 || options.stickerSize > 2048)) {
    return false;
  }

  return true;
}

/**
 * Gets generation statistics from result.
 */
export function getGenerationStats(result: BitmojiResult): {
  avatarSize: number;
  stickerCount: number;
  totalSize: number;
  duration: number;
} {
  const avatarSize = result.avatar.buffer.length;
  const stickerSize = result.stickers.reduce((sum, s) => sum + s.buffer.length, 0);
  const totalSize = avatarSize + stickerSize;
  const duration = result.timestamp - result.timestamp; // Placeholder - would need actual timing

  return {
    avatarSize,
    stickerCount: result.stickers.length,
    totalSize,
    duration: 0, // Would need to track actual duration
  };
}

/**
 * Formats bitmoji result for API response.
 */
export function formatBitmojiResponse(result: BitmojiResult): {
  avatar: {
    size: number;
    format: string;
    features: FaceFeatures;
  };
  stickers: Array<{
    type: string;
    size: number;
    format: string;
  }>;
  metadata: {
    style: string;
    timestamp: number;
    stickerCount: number;
  };
} {
  return {
    avatar: {
      size: result.avatar.size,
      format: result.avatar.format,
      features: result.features,
    },
    stickers: result.stickers.map((s) => ({
      type: s.type,
      size: s.size,
      format: s.format,
    })),
    metadata: {
      style: result.style,
      timestamp: result.timestamp,
      stickerCount: result.stickers.length,
    },
  };
}
