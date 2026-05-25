/**
 * Bitmoji Generation Test Script
 * 
 * Tests the complete Bitmoji Identity Engine pipeline:
 * 1. Face analysis
 * 2. Avatar generation
 * 3. Sticker generation
 * 
 * Run: npm run bitmoji-test
 */

import fs from "fs";
import path from "path";
import { generateBitmojiFromPhoto } from "../src/services/bitmoji-service";

const TEST_IMAGE_PATH = process.argv[2] 
  ?? path.join(__dirname, "../public/images/test-photo.jpg");
const GENDER_OVERRIDE = (process.argv[3] as "male" | "female" | undefined);

async function main() {
  console.log("🎨 Bitmoji Identity Engine - Test Script");
  console.log("=========================================\n");

  try {
    // Check if test image exists
    if (!fs.existsSync(TEST_IMAGE_PATH)) {
      console.error("❌ Test image not found:", TEST_IMAGE_PATH);
      console.log("   Please place a test photo at:", TEST_IMAGE_PATH);
      process.exit(1);
    }

    // Read test image
    console.log("📸 Loading test image...");
    const photoBuffer = fs.readFileSync(TEST_IMAGE_PATH);
    console.log(`   Image size: ${photoBuffer.length} bytes\n`);

    // Generate bitmoji
    console.log("🤖 Generating Bitmoji...");
    console.log("   Stage 1: Face analysis...");
    console.log("   Stage 2: Avatar generation...");
    console.log("   Stage 3: Sticker generation...\n");

    const result = await generateBitmojiFromPhoto(photoBuffer, {
      style: "avataaars",
      gender: GENDER_OVERRIDE,
      generateStickers: true,
      stickerSize: 512,
      avatarSize: 512,
      debug: true,
    });

    console.log("✅ Bitmoji generation successful!\n");

    // Display results
    console.log("📊 Results:");
    console.log("---------");
    console.log(`Avatar size: ${result.avatar.size}x${result.avatar.size}`);
    console.log(`Avatar format: ${result.avatar.format}`);
    console.log(`Avatar buffer: ${result.avatar.buffer.length} bytes`);
    console.log(`Style: ${result.style}`);
    console.log(`Stickers generated: ${result.stickers.length}`);
    console.log(`Timestamp: ${new Date(result.timestamp).toISOString()}\n`);

    // Display face features
    console.log("👤 Face Features:");
    console.log("----------------");
    console.log(`Gender: ${result.features.gender}${GENDER_OVERRIDE ? " (overridden)" : " (auto-detected)"}`);
    console.log(`Face shape: ${result.features.faceShape}`);
    console.log(`Skin tone: ${result.features.skinTone}`);
    console.log(`Hair color: ${result.features.hairColor}`);
    console.log(`Eye color: ${result.features.eyeColor}`);
    console.log(`Has glasses: ${result.features.hasGlasses}`);
    console.log(`Has beard: ${result.features.hasBeard}`);
    console.log(`Expression: ${result.features.expression}`);
    console.log(`Confidence: ${(result.features.confidence * 100).toFixed(1)}%\n`);

    // Display sticker types
    console.log("🎭 Sticker Types:");
    console.log("-----------------");
    result.stickers.forEach((sticker, index) => {
      console.log(`${index + 1}. ${sticker.type} (${sticker.size}x${sticker.size})`);
    });
    console.log();

    // Save outputs
    const outputDir = path.join(__dirname, "../public/images/bitmoji-test");
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    console.log("💾 Saving outputs...");
    
    // Save avatar
    const avatarPath = path.join(outputDir, "avatar.png");
    fs.writeFileSync(avatarPath, result.avatar.buffer);
    console.log(`   Avatar saved: ${avatarPath}`);

    // Save stickers
    result.stickers.forEach((sticker, index) => {
      const stickerPath = path.join(outputDir, `sticker-${sticker.type}.png`);
      fs.writeFileSync(stickerPath, sticker.buffer);
      console.log(`   Sticker ${index + 1} saved: ${stickerPath}`);
    });

    console.log("\n✅ Test completed successfully!");
    console.log(`📁 Output directory: ${outputDir}`);

  } catch (error) {
    console.error("\n❌ Test failed:");
    console.error(error);
    process.exit(1);
  }
}

main();
