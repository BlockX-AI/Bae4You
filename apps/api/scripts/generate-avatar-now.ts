/// <reference types="node" />
/**
 * Quick avatar generation — runs against live HuggingFace API.
 * No DB, no Redis, no config validation required.
 *
 * Generates one female + one male avatar and saves them locally.
 *
 * Run:
 *   node "c:\Users\sarth\bae4u\Bae4You\node_modules\.pnpm\tsx@4.21.0\node_modules\tsx\dist\cli.cjs" scripts/generate-avatar-now.ts
 */

import { writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import {
  generateAiAvatar,
  extractVisualTraits,
  buildPersonalisedPrompt,
} from "../src/services/ai-avatar";

const __filename = fileURLToPath(import.meta.url);
const __dirname  = dirname(__filename);

// ── Config from env ───────────────────────────────────────────────────────────
const HF_TOKEN        = process.env.HUGGINGFACE_TOKEN ?? "";
const CF_ACCOUNT_ID   = process.env.CLOUDFLARE_ACCOUNT_ID ?? "";
const CF_API_TOKEN    = process.env.CLOUDFLARE_API_TOKEN ?? "";
// fal.ai intentionally omitted — 403 Forbidden, no credits
// Replicate intentionally omitted — 402 on face-to-many, no credits
// PuLID Modal intentionally omitted — not deployed yet

const OUT_DIR = join(__dirname, "../public/images/generated");

// ── Skin tone variations to test ──────────────────────────────────────────────
const TEST_FACES = [
  { name: "warm-skin",  bg: { r: 210, g: 160, b: 120 }, gender: "female" as const },
  { name: "deep-skin",  bg: { r: 120, g:  80, b:  55 }, gender: "male"   as const },
  { name: "fair-skin",  bg: { r: 240, g: 210, b: 185 }, gender: "female" as const },
];

async function makePhoto(bg: { r: number; g: number; b: number }): Promise<Buffer> {
  // 128×128 solid-colour square — enough for sharp pixel trait extraction
  return sharp({
    create: { width: 128, height: 128, channels: 3, background: bg },
  }).png().toBuffer();
}

async function run() {
  console.log("\n══════════════════════════════════════════");
  console.log("  Bae4U — Live Avatar Generation");
  console.log("  Provider: HuggingFace FLUX-schnell (free)");
  console.log("══════════════════════════════════════════\n");

  mkdirSync(OUT_DIR, { recursive: true });

  for (const face of TEST_FACES) {
    console.log(`\n── Generating ${face.gender} [${face.name}]`);

    const photo  = await makePhoto(face.bg);

    // Show what traits we extract before calling the AI
    const traits = await extractVisualTraits(photo, face.gender, 0.9);
    const prompt = buildPersonalisedPrompt(traits);
    console.log(`   skin=${traits.skinTone}  hair=${traits.hairColour}  age=${traits.ageClass}  expression=${traits.expression}`);
    console.log(`   prompt: "${prompt.slice(0, 100)}..."`);

    const t0 = Date.now();
    try {
      const result = await generateAiAvatar(
        photo,
        "image/png",
        face.gender,
        undefined,   // FAL_KEY — skipped (403)
        HF_TOKEN,
        undefined,   // REPLICATE_TOKEN — skipped (402)
        undefined,
        {
          pulidEnabled:   false,
          restoreEnabled: false,
          bestOfN:        1,
          cfAccountId:    CF_ACCOUNT_ID,
          cfApiToken:     CF_API_TOKEN,
        }
      );

      const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
      const filename = `${face.name}-${face.gender}-${Date.now()}.png`;
      const outPath  = join(OUT_DIR, filename);
      writeFileSync(outPath, result.buffer);

      console.log(`   ✅ Done in ${elapsed}s via ${result.provider}`);
      console.log(`   ✅ Size: ${(result.buffer.length / 1024).toFixed(0)} KB`);
      console.log(`   ✅ Saved: public/images/generated/${filename}`);

    } catch (err: unknown) {
      console.log(`   ❌ Failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  console.log("\n══════════════════════════════════════════");
  console.log("  Done — check apps/api/public/images/generated/");
  console.log("══════════════════════════════════════════\n");
}

run().catch((e) => {
  console.error("Fatal:", e instanceof Error ? e.message : e);
  process.exit(1);
});
