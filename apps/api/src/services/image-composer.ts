import sharp from 'sharp';
import path from 'path';
import fs from 'fs/promises';
import Redis from 'ioredis';
import { config } from '../config';

const redis = config.REDIS_URL ? new Redis(config.REDIS_URL) : null;

interface ComposeOptions {
  userPhotoUrl: string;
  framePath: string;
  outputPath?: string;
}

interface ComposeCoupleOptions {
  user1PhotoUrl: string;
  user2PhotoUrl: string;
  framePath: string;
  outputPath?: string;
}

// Cache TTL in seconds (24 hours)
const CACHE_TTL = 86400;

export class ImageComposer {
  private static readonly FRAMES_DIR = path.join(__dirname, '../../public/images/frames');
  private static readonly BADGES_DIR = path.join(__dirname, '../../public/images/badges');
  private static readonly GENERATED_DIR = path.join(__dirname, '../../public/images/generated');
  private static readonly DEFAULT_AVATAR = path.join(__dirname, '../../public/images/default-avatar.svg');

  /**
   * Compose user photo with card frame
   */
  static async composeCard(options: ComposeOptions): Promise<Buffer> {
    const cacheKey = `card:${Buffer.from(options.userPhotoUrl).toString('base64')}:${path.basename(options.framePath)}`;
    
    // Check Redis cache first
    if (redis) {
      const cached = await redis.getBuffer(cacheKey);
      if (cached) return cached;
    }

    // Download user photo
    const userPhotoBuffer = await this.downloadImage(options.userPhotoUrl);
    
    // Load frame
    const frameBuffer = await fs.readFile(options.framePath);

    // Compose images
    const composed = await sharp(userPhotoBuffer)
      .resize(400, 400, { fit: 'cover', position: 'center' })
      .composite([
        {
          input: frameBuffer,
          blend: 'over',
        },
      ])
      .png()
      .toBuffer();

    // Cache the result
    if (redis) {
      await redis.setex(cacheKey, CACHE_TTL, composed);
    }

    return composed;
  }

  /**
   * Compose two user photos with couple frame
   */
  static async composeCoupleCard(options: ComposeCoupleOptions): Promise<Buffer> {
    const cacheKey = `couple:${Buffer.from(options.user1PhotoUrl).toString('base64')}:${Buffer.from(options.user2PhotoUrl).toString('base64')}`;
    
    // Check Redis cache first
    if (redis) {
      const cached = await redis.getBuffer(cacheKey);
      if (cached) return cached;
    }

    // Download user photos
    const [user1Photo, user2Photo] = await Promise.all([
      this.downloadImage(options.user1PhotoUrl),
      this.downloadImage(options.user2PhotoUrl),
    ]);

    // Load frame
    const frameBuffer = await fs.readFile(options.framePath);

    // Resize photos to fit side by side (each 200x200)
    const [user1Resized, user2Resized] = await Promise.all([
      sharp(user1Photo).resize(200, 200, { fit: 'cover', position: 'center' }).png().toBuffer(),
      sharp(user2Photo).resize(200, 200, { fit: 'cover', position: 'center' }).png().toBuffer(),
    ]);

    // Create canvas with both photos side by side
    const canvas = sharp({
      create: {
        width: 400,
        height: 200,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      },
    });

    const composed = await canvas
      .composite([
        { input: user1Resized, left: 0, top: 0 },
        { input: user2Resized, left: 200, top: 0 },
        { input: frameBuffer, blend: 'over' },
      ])
      .png()
      .toBuffer();

    // Cache the result
    if (redis) {
      await redis.setex(cacheKey, CACHE_TTL, composed);
    }

    return composed;
  }

  /**
   * Get default avatar or user photo
   */
  static async getProfilePhoto(userPhotoUrl?: string): Promise<Buffer> {
    if (!userPhotoUrl) {
      return fs.readFile(this.DEFAULT_AVATAR);
    }
    return this.downloadImage(userPhotoUrl);
  }

  /**
   * Get badge image
   */
  static async getBadge(badgeId: number): Promise<Buffer> {
    const badgePath = path.join(this.BADGES_DIR, `badge-${badgeId}.png`);
    return fs.readFile(badgePath);
  }

  /**
   * Download image from URL
   */
  private static async downloadImage(url: string): Promise<Buffer> {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to download image: ${response.statusText}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  /**
   * Get frame path by rarity
   */
  static getFramePath(rarity: string): string {
    const frameMap: Record<string, string> = {
      common: 'frame-common.png',
      rare: 'frame-rare.png',
      epic: 'frame-epic.png',
      legend: 'frame-legend.png',
    };
    const filename = frameMap[rarity.toLowerCase()] || frameMap.common;
    return path.join(this.FRAMES_DIR, filename);
  }

  /**
   * Get couple frame path
   */
  static getCoupleFramePath(): string {
    return path.join(this.FRAMES_DIR, 'frame-couple.png');
  }
}
