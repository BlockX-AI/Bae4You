/**
 * video-kyc-test.ts
 *
 * End-to-end offline test for the video KYC → avatar → hero card pipeline.
 * No API keys required — exercises every step that runs locally.
 *
 * Usage:
 *   npx tsx scripts/video-kyc-test.ts [photo-path]
 *
 * Outputs to: public/images/test/output/
 */

import fs   from "fs";
import path from "path";
import sharp from "sharp";

import { selectBestKycFrame, normaliseKycFrame, type KycFrameScore } from "../src/services/video-kyc";
import { analyzeFaceFromImage }                                        from "../src/services/face-analysis";
import { generateAvatar, mapFaceFeaturesToAvatarConfig }              from "../src/services/avatar-generator";
import { generateHeroCard, getCardRarities, type Rarity }             from "../src/services/hero-card-generator";

// ─── Config ───────────────────────────────────────────────────────────────────

const TEST_DIR  = path.join(__dirname, "../public/images/test");
const OUT_DIR   = path.join(TEST_DIR, "output");
const PHOTO     = process.argv[2] ?? path.join(TEST_DIR, "WhatsApp Image 2025-11-13 at 12.20.16.jpeg");

// ─── Helpers ──────────────────────────────────────────────────────────────────

function log(msg: string)    { console.log(`  ${msg}`); }
function ok(msg: string)     { console.log(`  ✓ ${msg}`); }
function fail(msg: string)   { console.error(`  ✗ ${msg}`); }
function header(msg: string) { console.log(`\n${"─".repeat(55)}\n  ${msg}\n${"─".repeat(55)}`); }

function kbytes(buf: Buffer) { return `${(buf.length / 1024).toFixed(1)} KB`; }

/** Create degraded variants of an image to simulate different-quality KYC frames */
async function makeFrameVariants(original: Buffer): Promise<Buffer[]> {
  const [sharp80, sharp40, sharp20, sharp95] = await Promise.all([
    // frame0: slight blur (simulates motion)
    sharp(original).blur(1.2).jpeg({ quality: 80 }).toBuffer(),
    // frame1: darker exposure (back-lit face)
    sharp(original).modulate({ brightness: 0.65 }).jpeg({ quality: 80 }).toBuffer(),
    // frame2: very blurry (bad frame)
    sharp(original).blur(4.0).jpeg({ quality: 60 }).toBuffer(),
    // frame3: best quality — slight sharpen
    sharp(original).sharpen({ sigma: 0.6 }).jpeg({ quality: 95 }).toBuffer(),
  ]);
  // frame4: washed-out (over-exposed)
  const washed = await sharp(original).modulate({ brightness: 1.45 }).jpeg({ quality: 80 }).toBuffer();
  return [sharp80, sharp40, sharp20, sharp95, washed, original];
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("\nBae4U — Video KYC Pipeline Test");
  console.log("================================");

  if (!fs.existsSync(PHOTO)) {
    fail(`Photo not found: ${PHOTO}`);
    process.exit(1);
  }
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const original = fs.readFileSync(PHOTO);
  log(`Source photo: ${path.basename(PHOTO)}  (${kbytes(original)})`);

  // ── STEP 1: Simulate video frames ─────────────────────────────────────────
  header("STEP 1 — Simulate 6 video KYC frames");

  const frames = await makeFrameVariants(original);
  const labels = ["blur-1.2", "dark-0.65x", "blur-4.0", "sharp-0.6", "bright-1.45x", "original"];
  frames.forEach((f, i) => {
    fs.writeFileSync(path.join(OUT_DIR, `frame-${i}-${labels[i]}.jpg`), f);
    log(`frame-${i}: ${labels[i].padEnd(14)} ${kbytes(f)}`);
  });
  ok("6 frames written to output/");

  // ── STEP 2: Best frame selection ──────────────────────────────────────────
  header("STEP 2 — selectBestKycFrame()");

  const { bestFrame, scores } = await selectBestKycFrame(frames);

  console.log("\n  idx  label             sharp    bright   face     total");
  console.log("  " + "─".repeat(57));
  scores.forEach((s: KycFrameScore) => {
    const marker = s.index === scores[0].index ? " ← BEST" : "";
    console.log(
      `  [${s.index}]  ${labels[s.index].padEnd(14)}  ` +
      `${s.sharpness.toFixed(3)}    ${s.brightness.toFixed(3)}    ` +
      `${s.faceScore.toFixed(3)}    ${s.total.toFixed(3)}${marker}`
    );
  });

  fs.writeFileSync(path.join(OUT_DIR, "best-frame-raw.jpg"), bestFrame);
  ok(`Best frame: [${scores[0].index}] ${labels[scores[0].index]} (total=${scores[0].total.toFixed(3)})`);

  // ── STEP 3: Normalise ─────────────────────────────────────────────────────
  header("STEP 3 — normaliseKycFrame() → 512×512");

  const normalised = await normaliseKycFrame(bestFrame);
  const meta       = await sharp(normalised).metadata();
  fs.writeFileSync(path.join(OUT_DIR, "normalised-512.jpg"), normalised);
  ok(`Normalised: ${meta.width}×${meta.height}  ${kbytes(normalised)}`);

  // ── STEP 4: Face analysis ─────────────────────────────────────────────────
  header("STEP 4 — analyzeFaceFromImage()");

  const features = await analyzeFaceFromImage(normalised);
  ok(`gender:     ${features.gender}`);
  ok(`skinTone:   ${features.skinTone}`);
  ok(`hairColor:  ${features.hairColor}`);
  ok(`age:        ${(features as any).ageClass ?? "N/A"}`);
  ok(`expression: ${(features as any).expression ?? "N/A"}`);

  // ── STEP 5: DiceBear avatar ───────────────────────────────────────────────
  header("STEP 5 — DiceBear avatar (512×512, no API key)");

  const avatarConfig = mapFaceFeaturesToAvatarConfig(features, "avataaars");
  const avatar       = await generateAvatar(avatarConfig, { size: 512 });
  fs.writeFileSync(path.join(OUT_DIR, "avatar-dicebear.png"), avatar.buffer);
  ok(`DiceBear avatar: ${kbytes(avatar.buffer)}`);

  // ── STEP 6: Hero cards for all rarities ───────────────────────────────────
  header("STEP 6 — generateHeroCard() × 4 rarities");

  const username = "Prakhar";
  const handle   = "@prakhar";
  const location = "Mumbai, IN";
  const stats    = { charm: 81, appeal: 76, vibe: 93, xp: 2140 };
  const tokenId  = 42;

  let allPassed = true;
  for (const rarity of getCardRarities()) {
    try {
      const card = await generateHeroCard({
        username, handle, location, rarity: rarity as Rarity,
        stats, avatarPngBuffer: avatar.buffer, tokenId,
      });
      const outPath = path.join(OUT_DIR, `hero-card-${rarity}.png`);
      fs.writeFileSync(outPath, card.cardPngBuffer);
      ok(`${rarity.padEnd(10)} ${kbytes(card.cardPngBuffer)}  → output/hero-card-${rarity}.png`);
    } catch (e: unknown) {
      fail(`${rarity}: ${e instanceof Error ? e.message : String(e)}`);
      allPassed = false;
    }
  }

  // ── Summary ───────────────────────────────────────────────────────────────
  header("SUMMARY");

  const outFiles = fs.readdirSync(OUT_DIR);
  ok(`${outFiles.length} files written to: ${OUT_DIR}`);
  outFiles.forEach(f => log(f));

  if (allPassed) {
    console.log("\n  ✅ All offline steps PASSED\n");
    console.log("  To test AI generation (requires API key):");
    console.log("  REPLICATE_API_TOKEN=xxx npx tsx scripts/ai-avatar-test.ts\n");
  } else {
    console.log("\n  ⚠️  Some steps failed — see above\n");
    process.exit(1);
  }
}

main().catch((e) => {
  console.error("\nFATAL:", e);
  process.exit(1);
});
