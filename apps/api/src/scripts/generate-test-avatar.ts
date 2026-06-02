/**
 * generate-test-avatar.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Runs the FULL avatar generation pipeline on a local photo.
 * Loads API keys from .env, detects traits, builds the AI prompt,
 * calls the generation chain (Replicate → fal.ai → HuggingFace fallback),
 * and saves the result to public/images/test/output/.
 *
 * Usage:
 *   npx ts-node -P tsconfig.json src/scripts/generate-test-avatar.ts <image-path>
 *
 * Example:
 *   npx ts-node -P tsconfig.json src/scripts/generate-test-avatar.ts \
 *     public/images/test/images.jpeg
 * ─────────────────────────────────────────────────────────────────────────────
 */

import * as dotenv from "dotenv";
dotenv.config();

import * as fs   from "fs";
import * as path from "path";
import {
  generateAiAvatar,
  extractVisualTraits,
  buildPersonalisedPrompt,
  ETHNIC_REGION_DESCRIPTORS,
} from "../services/ai-avatar";

// ─── Config ───────────────────────────────────────────────────────────────────

const FAL_KEY          = process.env["FAL_KEY"]?.trim();
const HUGGINGFACE_TOKEN = process.env["HUGGINGFACE_TOKEN"]?.trim();
const REPLICATE_TOKEN  = process.env["REPLICATE_API_TOKEN"]?.trim();

const BOLD  = "\x1b[1m";
const GREEN = "\x1b[92m";
const CYAN  = "\x1b[96m";
const YELLOW = "\x1b[93m";
const RED   = "\x1b[91m";
const RESET = "\x1b[0m";

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const imgArg = process.argv[2];
  if (!imgArg) {
    console.error(`\nUsage: npx ts-node -P tsconfig.json src/scripts/generate-test-avatar.ts <image-path>\n`);
    process.exit(1);
  }

  const imgPath = path.resolve(imgArg);
  if (!fs.existsSync(imgPath)) {
    console.error(`${RED}File not found: ${imgPath}${RESET}`);
    process.exit(1);
  }

  const photoBuffer = fs.readFileSync(imgPath);
  const ext         = path.extname(imgPath).toLowerCase();
  const mimeType    = ext === ".png" ? "image/png" : "image/jpeg";

  console.log(`\n${BOLD}══════════════════════════════════════════════════════════════${RESET}`);
  console.log(`${BOLD}  Bae4U AI Avatar Generator — Full Pipeline Test${RESET}`);
  console.log(`${BOLD}══════════════════════════════════════════════════════════════${RESET}`);
  console.log(`\n  Input : ${CYAN}${imgPath}${RESET}  (${(photoBuffer.length / 1024).toFixed(1)} KB)`);

  // ── Step 1: Show API key status ─────────────────────────────────────────────
  console.log(`\n  ${BOLD}API Keys:${RESET}`);
  console.log(`    Replicate   : ${REPLICATE_TOKEN  ? `${GREEN}✓ found${RESET}` : `${RED}✗ missing${RESET}`}`);
  console.log(`    fal.ai      : ${FAL_KEY          ? `${GREEN}✓ found${RESET}` : `${RED}✗ missing${RESET}`}`);
  console.log(`    HuggingFace : ${HUGGINGFACE_TOKEN ? `${GREEN}✓ found${RESET}` : `${RED}✗ missing${RESET}`}`);

  if (!FAL_KEY && !HUGGINGFACE_TOKEN && !REPLICATE_TOKEN) {
    console.error(`\n${RED}No API keys found in .env. Cannot generate avatar.${RESET}\n`);
    process.exit(1);
  }

  // ── Step 2: Run trait extraction (preview before generation) ────────────────
  console.log(`\n  ${BOLD}Detecting traits from photo...${RESET}`);
  const traits = await extractVisualTraits(photoBuffer, "other", 0);
  const regionDesc = ETHNIC_REGION_DESCRIPTORS[traits.ethnicRegion];

  console.log(`\n  ${BOLD}Detected Traits:${RESET}`);
  console.log(`    Ethnic Region : ${GREEN}${traits.ethnicRegion}${RESET}`);
  console.log(`    Skin Tone     : ${YELLOW}${traits.skinTone}${RESET}`);
  console.log(`    Hair Colour   : ${traits.hairColour}`);
  console.log(`    Expression    : ${traits.expression}`);
  console.log(`    Glasses       : ${traits.hasGlasses ? "yes" : "no"}   Beard: ${traits.hasBeard ? "yes" : "no"}`);
  console.log(`\n  ${BOLD}Region Profile:${RESET}`);
  console.log(`    Face : ${regionDesc.face}`);
  console.log(`    Eyes : ${regionDesc.eyes}`);
  console.log(`    Nose : ${regionDesc.nose}`);
  console.log(`    Jaw  : ${regionDesc.jaw}`);

  const previewPrompt = buildPersonalisedPrompt(traits);
  console.log(`\n  ${BOLD}AI Prompt Preview (first 250 chars):${RESET}`);
  console.log(`  ${CYAN}"${previewPrompt.slice(0, 250)}..."${RESET}`);

  // ── Step 3: Generate the avatar ─────────────────────────────────────────────
  console.log(`\n  ${BOLD}Generating avatar... (this may take 15–60 seconds)${RESET}`);
  const startMs = Date.now();

  let result;
  try {
    result = await generateAiAvatar(
      photoBuffer,
      mimeType,
      undefined,          // let it auto-detect gender via HuggingFace
      FAL_KEY,
      HUGGINGFACE_TOKEN,
      REPLICATE_TOKEN,
    );
  } catch (err) {
    console.error(`\n${RED}Generation failed: ${err instanceof Error ? err.message : String(err)}${RESET}\n`);
    process.exit(1);
  }

  const elapsed = ((Date.now() - startMs) / 1000).toFixed(1);
  console.log(`\n  ${GREEN}✓ Avatar generated in ${elapsed}s via ${result.provider}${RESET}`);
  console.log(`    Gender detected : ${result.gender}`);
  console.log(`    Seed            : ${result.seed}`);

  // ── Step 4: Save the output ─────────────────────────────────────────────────
  const outDir  = path.resolve("public/images/test/output");
  fs.mkdirSync(outDir, { recursive: true });

  const baseName  = path.basename(imgPath, path.extname(imgPath));
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const outPath   = path.join(outDir, `avatar-${baseName}-${timestamp}.png`);

  fs.writeFileSync(outPath, result.buffer);

  console.log(`\n  ${BOLD}Output saved:${RESET}`);
  console.log(`    ${GREEN}${outPath}${RESET}  (${(result.buffer.length / 1024).toFixed(1)} KB)`);
  console.log(`\n${BOLD}══════════════════════════════════════════════════════════════${RESET}\n`);
}

main().catch((err) => {
  console.error("\nFatal:", err);
  process.exit(1);
});
