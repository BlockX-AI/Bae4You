/**
 * Hero Card Generator — Test Script
 *
 * Usage:
 *   npx tsx scripts/hero-card-test.ts [photo] [name] [handle] [location]
 *
 * Generates all 4 rarity hero cards and saves to public/images/hero-card-test/
 */

import fs from "fs";
import path from "path";
import { analyzeFaceFromImage } from "../src/services/face-analysis";
import { generateAvatar, mapFaceFeaturesToAvatarConfig } from "../src/services/avatar-generator";
import { generateHeroCard, getCardRarities, type Rarity } from "../src/services/hero-card-generator";

const PHOTO_PATH   = process.argv[2] ?? path.join(__dirname, "../public/images/test-photo.jpg");
const USERNAME     = process.argv[3] ?? "Prakhar";
const HANDLE       = process.argv[4] ?? "@prakhar";
const LOCATION     = process.argv[5] ?? "Mumbai";
const OUT_DIR      = path.join(__dirname, "../public/images/hero-card-test");

const MOCK_STATS = { charm: 78, appeal: 85, vibe: 92, xp: 1840 };

async function main() {
  console.log("Bae4U Hero Card Generator — Test");
  console.log("==================================\n");

  if (!fs.existsSync(PHOTO_PATH)) {
    console.error("Photo not found:", PHOTO_PATH);
    process.exit(1);
  }

  fs.mkdirSync(OUT_DIR, { recursive: true });

  const photoBuffer = fs.readFileSync(PHOTO_PATH);
  console.log(`Photo loaded: ${photoBuffer.length} bytes`);

  console.log("\nAnalysing face...");
  const features = await analyzeFaceFromImage(photoBuffer);
  console.log(`  gender: ${features.gender}  skin: ${features.skinTone}  hair: ${features.hairColor}`);

  console.log("\nGenerating DiceBear avatar (512×512)...");
  const avatarConfig = mapFaceFeaturesToAvatarConfig(features, "avataaars");
  const avatar = await generateAvatar(avatarConfig, { size: 512 });
  console.log(`  Avatar: ${avatar.buffer.length} bytes`);
  fs.writeFileSync(path.join(OUT_DIR, "avatar-base.png"), avatar.buffer);

  console.log("\nGenerating hero cards (all 4 rarities)...\n");

  for (const rarity of getCardRarities()) {
    process.stdout.write(`  ${rarity.padEnd(10)} → `);
    const card = await generateHeroCard({
      username:        USERNAME,
      handle:          HANDLE,
      location:        LOCATION,
      rarity:          rarity as Rarity,
      stats:           MOCK_STATS,
      avatarPngBuffer: avatar.buffer,
      tokenId:         Math.floor(Math.random() * 9999),
    });
    const outPath = path.join(OUT_DIR, `card-${rarity}.png`);
    fs.writeFileSync(outPath, card.cardPngBuffer);
    console.log(`${card.cardPngBuffer.length} bytes  →  ${outPath}`);
  }

  console.log(`\nAll cards saved to: ${OUT_DIR}`);
}

main().catch((e) => {
  console.error("Error:", e.message);
  process.exit(1);
});
