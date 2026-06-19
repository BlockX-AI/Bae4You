/// <reference types="node" />
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  generateAiAvatar,
  extractVisualTraits,
  buildPersonalisedPrompt,
} from "../src/services/ai-avatar";

const __filename = fileURLToPath(import.meta.url);
const __dirname  = dirname(__filename);

const HF_TOKEN      = process.env.HUGGINGFACE_TOKEN ?? "";
const CF_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID ?? "";
const CF_API_TOKEN  = process.env.CLOUDFLARE_API_TOKEN ?? "";

const PHOTO_PATH = "c:\\Users\\sarth\\bae4u\\Bae4You\\WhatsApp Image 2026-06-14 at 1.54.37 AM.jpeg";
const OUT_DIR    = join(__dirname, "../public/images/sarth-avatar");

async function run() {
  console.log("\n══════════════════════════════════════════════");
  console.log("  Generating Avatar for Sarth's Photo");
  console.log("══════════════════════════════════════════════\n");

  const photo = readFileSync(PHOTO_PATH);
  console.log(`  Input photo: ${(photo.length / 1024).toFixed(0)} KB JPEG`);

  // Step 1: extract traits from the real face
  console.log("\n── Step 1: Trait Extraction from your face");
  const traits = await extractVisualTraits(photo, "male", 0.9);
  const prompt = buildPersonalisedPrompt(traits);

  console.log(`  skin tone  : ${traits.skinTone}`);
  console.log(`  hair colour: ${traits.hairColour}  (corrected from raw pixel read)`);
  console.log(`  age class  : ${traits.ageClass}`);
  console.log(`  expression : ${traits.expression}`);
  console.log(`  has beard  : ${traits.hasBeard}`);
  console.log(`  ethnic hint: ${traits.ethnicRegion}`);
  console.log(`\n  Prompt (${prompt.length} chars — tighter for FLUX token limit):`);
  console.log(`  "${prompt.slice(0, 220)}..."`);

  // Step 2: generate avatar
  console.log("\n── Step 2: Generating Spider-Verse Avatar (HF FLUX)");
  console.log("  Calling AI... (~10-30s)");

  mkdirSync(OUT_DIR, { recursive: true });
  const t0 = Date.now();

  const result = await generateAiAvatar(
    photo,
    "image/jpeg",
    "male",
    undefined,   // FAL_KEY — no credits
    HF_TOKEN,
    undefined,   // REPLICATE_TOKEN — no credits
    undefined,
    {
      pulidEnabled:   false,
      restoreEnabled: false,
      bestOfN:        1,
      cfAccountId:    CF_ACCOUNT_ID,
      cfApiToken:     CF_API_TOKEN,
    }
  );

  const elapsed  = ((Date.now() - t0) / 1000).toFixed(1);
  const filename = `sarth-avatar-${Date.now()}.png`;
  const outPath  = join(OUT_DIR, filename);
  writeFileSync(outPath, result.buffer);

  console.log(`\n  ✅ Generated via: ${result.provider}`);
  console.log(`  ✅ Time: ${elapsed}s`);
  console.log(`  ✅ Size: ${(result.buffer.length / 1024).toFixed(0)} KB`);
  console.log(`  ✅ Saved: apps/api/public/images/sarth-avatar/${filename}`);
  console.log("\n══════════════════════════════════════════════\n");
}

run().catch((e) => {
  console.error("Fatal:", e instanceof Error ? e.message : e);
  process.exit(1);
});
