/// <reference types="node" />

import "dotenv/config";
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { extname, join, parse } from "node:path";
import { config } from "../src/config";
import { generateAiAvatar } from "../src/services/ai-avatar";

const INPUT_DIR = join(process.cwd(), "public/images/input");
const FRAMES_DIR = join(process.cwd(), "public/images/frames");
const OUTPUT_DIR = join(process.cwd(), "public/images/generated/ai-avatar-input-tests");

const MIME_BY_EXT: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
};

async function run() {
  mkdirSync(OUTPUT_DIR, { recursive: true });

  const inputFiles = readdirSync(INPUT_DIR).filter((file) => MIME_BY_EXT[extname(file).toLowerCase()]);
  if (inputFiles.length === 0) {
    console.log(`No input images found in ${INPUT_DIR}`);
    return;
  }

  // Load first frame image as style reference
  const frameFiles = readdirSync(FRAMES_DIR).filter((file) => MIME_BY_EXT[extname(file).toLowerCase()]);
  if (frameFiles.length === 0) {
    console.log(`No frame images found in ${FRAMES_DIR}`);
    return;
  }

  const styleImagePath = join(FRAMES_DIR, frameFiles[0]);
  const styleImageBuffer = readFileSync(styleImagePath);

  console.log("\nBae4U Spider-Verse Style Transfer Batch Test");
  console.log("───────────────────────────────────────────────");
  console.log(`Input:      ${INPUT_DIR}`);
  console.log(`Style ref:  ${frameFiles[0]}`);
  console.log(`Output:     ${OUTPUT_DIR}`);
  console.log(`Files:      ${inputFiles.length}\n`);

  for (const file of inputFiles) {
    const inputPath = join(INPUT_DIR, file);
    const ext  = extname(file).toLowerCase();
    const mime = MIME_BY_EXT[ext];
    const buffer = readFileSync(inputPath);

    console.log(`▶ ${file}  (${(buffer.length / 1024).toFixed(1)} KB)`);

    // Pass style image for style transfer
    const result = await generateAiAvatar(buffer, mime, undefined, config.FAL_KEY, config.HUGGINGFACE_TOKEN, config.REPLICATE_TOKEN, styleImageBuffer);

    const t = result.traits;
    console.log(`  gender:     ${result.gender} (${(t.genderConf * 100).toFixed(1)}%)`);
    console.log(`  skinTone:   ${t.skinTone}`);
    console.log(`  hair:       ${t.hairColour}`);
    console.log(`  age:        ${t.ageClass}`);
    console.log(`  glasses:    ${t.hasGlasses}`);
    console.log(`  beard:      ${t.hasBeard}`);
    console.log(`  expression: ${t.expression}`);
    console.log(`  clothing:   ${t.dominantClothingHex}`);
    console.log(`  prompt:     ${result.prompt.slice(0, 180)}…`);
    console.log(`  provider:   ${result.provider}`);

    const slug = `${parse(file).name.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-${result.gender}-spiderverse.png`;
    writeFileSync(join(OUTPUT_DIR, slug), result.buffer);
    console.log(`  saved:      ${slug}  (${(result.buffer.length / 1024).toFixed(1)} KB)\n`);
  }

  console.log("✅ Batch complete. Open the output folder to inspect generated Spider-Verse style NFT images.");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
