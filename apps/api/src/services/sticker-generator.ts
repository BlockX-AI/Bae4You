/**
 * Sticker Generator Service
 * 
 * Generates sticker packs from avatar images using Canvas.
 * Creates expression-based stickers and Bae4U-themed stickers.
 * All stickers have transparent backgrounds for messaging apps.
 * 
 * @module services/sticker-generator
 */

import { createCanvas, loadImage, CanvasRenderingContext2D } from "canvas";

// ============================================================================
// Type Definitions
// ============================================================================

export type StickerExpression = 
  | "smile" 
  | "love" 
  | "laugh" 
  | "cool" 
  | "surprised" 
  | "wink";

export type Bae4UStickerType = 
  | "red-thread" 
  | "connected-hearts" 
  | "crown" 
  | "trophy";

export interface StickerConfig {
  avatar: Buffer;
  expression?: StickerExpression;
  backgroundColor?: "transparent" | string;
  size?: number;
}

export interface StickerResult {
  buffer: Buffer;
  type: StickerExpression | Bae4UStickerType;
  size: number;
  format: "png";
}

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_SIZE = 512;
const BAE4U_COLORS = {
  red: "#FF2D55",
  gold: "#FFD700",
  cyan: "#00D9FF",
  white: "#FFFFFF",
  black: "#000000",
} as const;

// ============================================================================
// Main Functions
// ============================================================================

/**
 * Generates a single sticker from avatar with expression overlay.
 * 
 * @param config - Sticker configuration
 * @returns Promise<StickerResult> - Generated sticker
 */
export async function generateSticker(
  config: StickerConfig
): Promise<StickerResult> {
  const size = config.size || DEFAULT_SIZE;
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext("2d");

  // Background
  if (config.backgroundColor && config.backgroundColor !== "transparent") {
    ctx.fillStyle = config.backgroundColor;
    ctx.fillRect(0, 0, size, size);
  }

  // Draw avatar
  const avatar = await loadImage(config.avatar);
  ctx.drawImage(avatar, 0, 0, size, size);

  // Add expression overlay
  if (config.expression) {
    await drawExpressionOverlay(ctx, config.expression, size);
  }

  // Add sticker border
  drawStickerBorder(ctx, size);

  return {
    buffer: canvas.toBuffer("image/png"),
    type: config.expression || "smile",
    size,
    format: "png",
  };
}

/**
 * Generates complete Bae4U sticker pack from avatar.
 * Includes expression stickers and Bae4U-themed stickers.
 * 
 * @param avatar - Avatar image buffer
 * @param size - Sticker size (default: 512)
 * @returns Promise<StickerResult[]> - Array of stickers
 */
export async function generateBae4UStickers(
  avatar: Buffer,
  size: number = DEFAULT_SIZE
): Promise<StickerResult[]> {
  const stickers: StickerResult[] = [];

  // Basic expression stickers
  const expressions: StickerExpression[] = ["smile", "love", "laugh", "cool", "surprised", "wink"];
  for (const expr of expressions) {
    stickers.push(await generateSticker({ avatar, expression: expr, size }));
  }

  // Bae4U themed stickers
  stickers.push(await generateRedThreadSticker(avatar, size));
  stickers.push(await generateConnectedHeartsSticker(avatar, size));
  stickers.push(await generateCrownSticker(avatar, size));

  return stickers;
}

// ============================================================================
// Expression Overlay Functions
// ============================================================================

/**
 * Draws expression overlay on canvas.
 */
async function drawExpressionOverlay(
  ctx: CanvasRenderingContext2D,
  expression: StickerExpression,
  size: number
): Promise<void> {
  switch (expression) {
    case "love":
      drawHeartEyes(ctx, size);
      break;
    case "laugh":
      drawLaughTears(ctx, size);
      break;
    case "cool":
      drawSunglasses(ctx, size);
      break;
    case "surprised":
      drawSurprised(ctx, size);
      break;
    case "wink":
      drawWink(ctx, size);
      break;
    case "smile":
    default:
      drawSmile(ctx, size);
      break;
  }
}

/**
 * Draws heart eyes for "love" expression.
 */
function drawHeartEyes(ctx: CanvasRenderingContext2D, size: number): void {
  ctx.fillStyle = BAE4U_COLORS.red;
  ctx.shadowColor = BAE4U_COLORS.red;
  ctx.shadowBlur = 10;

  // Left heart
  drawHeart(ctx, size * 0.3, size * 0.4, size * 0.04);

  // Right heart
  drawHeart(ctx, size * 0.7, size * 0.4, size * 0.04);

  ctx.shadowBlur = 0;
}

/**
 * Draws heart shape at position.
 */
function drawHeart(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  scale: number
): void {
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.bezierCurveTo(x - scale, y - scale, x - scale * 2, y, x, y + scale);
  ctx.bezierCurveTo(x + scale * 2, y, x + scale, y - scale, x, y);
  ctx.fill();
}

/**
 * Draws sunglasses for "cool" expression.
 */
function drawSunglasses(ctx: CanvasRenderingContext2D, size: number): void {
  ctx.fillStyle = BAE4U_COLORS.black;
  ctx.strokeStyle = BAE4U_COLORS.gold;
  ctx.lineWidth = 2;

  // Left lens
  ctx.beginPath();
  ctx.ellipse(size * 0.3, size * 0.4, size * 0.12, size * 0.08, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Right lens
  ctx.beginPath();
  ctx.ellipse(size * 0.7, size * 0.4, size * 0.12, size * 0.08, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Bridge
  ctx.fillRect(size * 0.4, size * 0.38, size * 0.2, size * 0.04);
}

/**
 * Draws smile for "smile" expression.
 */
function drawSmile(ctx: CanvasRenderingContext2D, size: number): void {
  ctx.strokeStyle = BAE4U_COLORS.red;
  ctx.lineWidth = 3;
  ctx.lineCap = "round";

  ctx.beginPath();
  ctx.arc(size * 0.5, size * 0.5, size * 0.15, 0.2 * Math.PI, 0.8 * Math.PI);
  ctx.stroke();
}

/**
 * Draws laugh tears for "laugh" expression.
 */
function drawLaughTears(ctx: CanvasRenderingContext2D, size: number): void {
  ctx.fillStyle = BAE4U_COLORS.cyan;
  ctx.shadowColor = BAE4U_COLORS.cyan;
  ctx.shadowBlur = 5;

  // Left tear
  ctx.beginPath();
  ctx.ellipse(size * 0.25, size * 0.5, size * 0.03, size * 0.05, 0.3, 0, Math.PI * 2);
  ctx.fill();

  // Right tear
  ctx.beginPath();
  ctx.ellipse(size * 0.75, size * 0.5, size * 0.03, size * 0.05, -0.3, 0, Math.PI * 2);
  ctx.fill();

  ctx.shadowBlur = 0;
}

/**
 * Draws surprised expression.
 */
function drawSurprised(ctx: CanvasRenderingContext2D, size: number): void {
  ctx.strokeStyle = BAE4U_COLORS.black;
  ctx.lineWidth = 3;

  // Surprised eyebrows
  ctx.beginPath();
  ctx.moveTo(size * 0.25, size * 0.35);
  ctx.lineTo(size * 0.35, size * 0.32);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(size * 0.65, size * 0.32);
  ctx.lineTo(size * 0.75, size * 0.35);
  ctx.stroke();
}

/**
 * Draws wink expression.
 */
function drawWink(ctx: CanvasRenderingContext2D, size: number): void {
  ctx.strokeStyle = BAE4U_COLORS.black;
  ctx.lineWidth = 3;

  // Wink left eye
  ctx.beginPath();
  ctx.moveTo(size * 0.25, size * 0.4);
  ctx.lineTo(size * 0.35, size * 0.4);
  ctx.stroke();

  // Open right eye
  ctx.beginPath();
  ctx.arc(size * 0.7, size * 0.4, size * 0.05, 0, Math.PI * 2);
  ctx.stroke();
}

/**
 * Draws sticker border.
 */
function drawStickerBorder(ctx: CanvasRenderingContext2D, size: number): void {
  ctx.strokeStyle = "rgba(255, 255, 255, 0.5)";
  ctx.lineWidth = 4;
  ctx.strokeRect(2, 2, size - 4, size - 4);
}

// ============================================================================
// Bae4U Themed Stickers
// ============================================================================

/**
 * Generates red thread sticker (Bae4U branding).
 */
async function generateRedThreadSticker(
  avatar: Buffer,
  size: number
): Promise<StickerResult> {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext("2d");

  const img = await loadImage(avatar);
  ctx.drawImage(img, 0, 0, size, size);

  // Draw red thread
  ctx.strokeStyle = BAE4U_COLORS.red;
  ctx.lineWidth = 3;
  ctx.shadowColor = BAE4U_COLORS.red;
  ctx.shadowBlur = 10;

  ctx.beginPath();
  ctx.moveTo(0, size * 0.5);
  ctx.bezierCurveTo(
    size * 0.25, size * 0.4,
    size * 0.75, size * 0.6,
    size, size * 0.5
  );
  ctx.stroke();

  ctx.shadowBlur = 0;

  return {
    buffer: canvas.toBuffer("image/png"),
    type: "red-thread",
    size,
    format: "png",
  };
}

/**
 * Generates connected hearts sticker (couple theme).
 */
async function generateConnectedHeartsSticker(
  avatar: Buffer,
  size: number
): Promise<StickerResult> {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext("2d");

  const img = await loadImage(avatar);
  ctx.drawImage(img, 0, 0, size, size);

  // Draw connected hearts
  ctx.fillStyle = BAE4U_COLORS.red;
  ctx.shadowColor = BAE4U_COLORS.red;
  ctx.shadowBlur = 15;

  // Left heart
  drawHeart(ctx, size * 0.2, size * 0.5, size * 0.05);

  // Right heart
  drawHeart(ctx, size * 0.8, size * 0.5, size * 0.05);

  // Connection line
  ctx.strokeStyle = BAE4U_COLORS.red;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(size * 0.25, size * 0.5);
  ctx.lineTo(size * 0.75, size * 0.5);
  ctx.stroke();

  ctx.shadowBlur = 0;

  return {
    buffer: canvas.toBuffer("image/png"),
    type: "connected-hearts",
    size,
    format: "png",
  };
}

/**
 * Generates crown sticker (champion theme).
 */
async function generateCrownSticker(
  avatar: Buffer,
  size: number
): Promise<StickerResult> {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext("2d");

  const img = await loadImage(avatar);
  ctx.drawImage(img, 0, 0, size, size);

  // Draw crown
  ctx.fillStyle = BAE4U_COLORS.gold;
  ctx.shadowColor = BAE4U_COLORS.gold;
  ctx.shadowBlur = 20;

  const crownBaseY = size * 0.2;
  const crownHeight = size * 0.15;

  ctx.beginPath();
  ctx.moveTo(size * 0.3, crownBaseY);
  ctx.lineTo(size * 0.35, crownBaseY - crownHeight);
  ctx.lineTo(size * 0.4, crownBaseY - crownHeight * 0.5);
  ctx.lineTo(size * 0.5, crownBaseY - crownHeight * 1.2);
  ctx.lineTo(size * 0.6, crownBaseY - crownHeight * 0.5);
  ctx.lineTo(size * 0.65, crownBaseY - crownHeight);
  ctx.lineTo(size * 0.7, crownBaseY);
  ctx.closePath();
  ctx.fill();

  // Crown jewels
  ctx.fillStyle = BAE4U_COLORS.red;
  ctx.beginPath();
  ctx.arc(size * 0.5, crownBaseY - crownHeight * 0.8, size * 0.02, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = BAE4U_COLORS.cyan;
  ctx.beginPath();
  ctx.arc(size * 0.4, crownBaseY - crownHeight * 0.4, size * 0.015, 0, Math.PI * 2);
  ctx.fill();

  ctx.beginPath();
  ctx.arc(size * 0.6, crownBaseY - crownHeight * 0.4, size * 0.015, 0, Math.PI * 2);
  ctx.fill();

  ctx.shadowBlur = 0;

  return {
    buffer: canvas.toBuffer("image/png"),
    type: "crown",
    size,
    format: "png",
  };
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Validates sticker configuration.
 */
export function validateStickerConfig(config: StickerConfig): boolean {
  if (!config.avatar || config.avatar.length === 0) {
    return false;
  }

  if (config.size && (config.size < 64 || config.size > 2048)) {
    return false;
  }

  return true;
}

/**
 * Gets available expression types.
 */
export function getAvailableExpressions(): StickerExpression[] {
  return ["smile", "love", "laugh", "cool", "surprised", "wink"];
}

/**
 * Gets available Bae4U sticker types.
 */
export function getBae4UStickerTypes(): Bae4UStickerType[] {
  return ["red-thread", "connected-hearts", "crown", "trophy"];
}
