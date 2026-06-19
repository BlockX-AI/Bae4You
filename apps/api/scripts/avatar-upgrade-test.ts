/// <reference types="node" />
/**
 * Avatar Upgrade Test — Phase 1 validation
 *
 * Tests the new provider chain without needing a full DB/Redis stack.
 * Reads AI keys directly from process.env (no config validation).
 *
 * Run:
 *   cd apps/api
 *   FAL_KEY=xxx HUGGINGFACE_TOKEN=xxx npx tsx scripts/avatar-upgrade-test.ts
 *
 *   Or with .env file:
 *   npx tsx --env-file=../../.env scripts/avatar-upgrade-test.ts
 */

import "dotenv/config";
import { writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  generateAiAvatar,
  extractVisualTraits,
  buildPersonalisedPrompt,
} from "../src/services/ai-avatar";

const __filename = fileURLToPath(import.meta.url);
const __dirname  = dirname(__filename);

// ── Helpers ───────────────────────────────────────────────────────────────────

const ok   = (msg: string) => console.log(`  ✅  ${msg}`);
const warn = (msg: string) => console.log(`  ⚠️   ${msg}`);
const fail = (msg: string) => console.log(`  ❌  ${msg}`);
const hr   = ()            => console.log("─".repeat(62));

// 64×64 solid skin-tone PNG generated at runtime via sharp — no file dependency
import sharp from "sharp";

async function makeDummyPhoto(): Promise<Buffer> {
  // 64×64 solid warm-skin-tone rectangle — enough for sharp pixel analysis
  return sharp({
    create: { width: 64, height: 64, channels: 3, background: { r: 210, g: 160, b: 120 } },
  }).png().toBuffer();
}

// ── Read env directly (no Zod validation — avoids DB/Redis requirement) ───────

const FAL_KEY            = process.env.FAL_KEY;
const HF_TOKEN           = process.env.HUGGINGFACE_TOKEN;
const REPLICATE_TOKEN    = process.env.REPLICATE_TOKEN ?? process.env.REPLICATE_API_TOKEN;
const MODAL_PULID_URL    = process.env.MODAL_PULID_URL;
const PULID_ENABLED      = process.env.PULID_ENABLED === "true";
const RESTORE_ENABLED    = process.env.AVATAR_RESTORE_ENABLED === "true";
const BEST_OF_N          = parseInt(process.env.AVATAR_BEST_OF_N ?? "1", 10);
const CF_ACCOUNT_ID      = process.env.CLOUDFLARE_ACCOUNT_ID;
const CF_API_TOKEN       = process.env.CLOUDFLARE_API_TOKEN;
const GEMINI_API_KEY     = process.env.GEMINI_API_KEY;
const GEMINI_ENABLED     = process.env.GEMINI_IMAGE_ENABLED === "true";

// ── Main ──────────────────────────────────────────────────────────────────────

async function run() {
  console.log("\n" + "═".repeat(62));
  console.log("  Bae4U — Avatar Upgrade Phase 1 Test");
  console.log("  " + new Date().toISOString());
  console.log("═".repeat(62) + "\n");

  const DUMMY_PHOTO = await makeDummyPhoto();

  let passed = 0;
  let failed = 0;

  // ── Step 1: Provider inventory ─────────────────────────────────────────────
  console.log("── Step 1: Provider Inventory");
  hr();

  const providers = [
    { name: "Modal PuLID-FLUX",     key: MODAL_PULID_URL,   flag: "MODAL_PULID_URL",            active: PULID_ENABLED && !!MODAL_PULID_URL },
    { name: "Gemini Flash Image",   key: GEMINI_API_KEY,    flag: "GEMINI_API_KEY",             active: GEMINI_ENABLED && !!GEMINI_API_KEY },
    { name: "Replicate (face-to-many)", key: REPLICATE_TOKEN, flag: "REPLICATE_TOKEN",           active: !!REPLICATE_TOKEN },
    { name: "fal.ai FLUX img2img",  key: FAL_KEY,           flag: "FAL_KEY",                    active: !!FAL_KEY },
    { name: "HuggingFace FLUX",     key: HF_TOKEN,          flag: "HUGGINGFACE_TOKEN",          active: !!HF_TOKEN },
    { name: "Cloudflare SDXL",      key: CF_API_TOKEN,      flag: "CLOUDFLARE_API_TOKEN",       active: !!(CF_ACCOUNT_ID && CF_API_TOKEN) },
    { name: "CodeFormer restore",   key: REPLICATE_TOKEN,   flag: "REPLICATE_TOKEN (restore)",  active: RESTORE_ENABLED && !!REPLICATE_TOKEN },
    { name: "Best-of-N",            key: String(BEST_OF_N), flag: "AVATAR_BEST_OF_N",           active: BEST_OF_N > 1 },
  ];

  let activeCount = 0;
  for (const p of providers) {
    if (p.active) {
      ok(`${p.name.padEnd(28)} [ACTIVE]`);
      activeCount++;
      passed++;
    } else if (p.key) {
      warn(`${p.name.padEnd(28)} key present but flag off`);
    } else {
      warn(`${p.name.padEnd(28)} ${p.flag} not set`);
    }
  }

  if (activeCount === 0) {
    fail("No AI providers configured. Set at least one of: FAL_KEY, HUGGINGFACE_TOKEN, CLOUDFLARE_ACCOUNT_ID+CLOUDFLARE_API_TOKEN");
    console.log("\n  ℹ️  Run with env vars:");
    console.log("     FAL_KEY=your_key npx tsx scripts/avatar-upgrade-test.ts\n");
    printSummary(passed, failed + 1);
    return;
  }

  // ── Step 2: Visual trait extraction (offline, no AI call) ─────────────────
  console.log("\n── Step 2: Visual Trait Extraction (offline, sharp pixel analysis)");
  hr();
  try {
    const traits = await extractVisualTraits(DUMMY_PHOTO, "female", 0.9);
    const prompt = buildPersonalisedPrompt(traits);
    ok(`Trait extraction succeeded`);
    ok(`  skin=${traits.skinTone}  hair=${traits.hairColour}  age=${traits.ageClass}  expression=${traits.expression}`);
    ok(`  Prompt length: ${prompt.length} chars`);
    ok(`  Prompt preview: "${prompt.slice(0, 80)}…"`);
    passed += 4;
  } catch (err: unknown) {
    fail(`Trait extraction failed: ${err instanceof Error ? err.message : String(err)}`);
    failed++;
  }

  // ── Step 3: Priority chain smoke test (uses cheapest active provider) ──────
  console.log("\n── Step 3: Priority Chain — Live Generation Test");
  hr();

  // Determine which provider we expect to hit given current env
  let expectedProvider = "none";
  if (PULID_ENABLED && MODAL_PULID_URL)      expectedProvider = "modal/pulid-flux";
  else if (GEMINI_ENABLED && GEMINI_API_KEY) expectedProvider = "gemini-2.5-flash-image";
  else if (REPLICATE_TOKEN)                  expectedProvider = "replicate/fofr-face-to-many";
  else if (FAL_KEY)                          expectedProvider = "fal.ai/flux-dev-img2img";
  else if (HF_TOKEN)                         expectedProvider = "huggingface/flux-schnell";
  else if (CF_ACCOUNT_ID && CF_API_TOKEN)    expectedProvider = "cloudflare/sdxl-lightning";

  console.log(`  ℹ️   Expected to hit: ${expectedProvider}`);
  console.log(`  ℹ️   Best-of-N=${BEST_OF_N}  Restore=${RESTORE_ENABLED}`);
  console.log("  ℹ️   Calling AI model… (10–60 seconds)\n");

  const outDir = join(__dirname, "../public/images/avatar-upgrade-test");
  mkdirSync(outDir, { recursive: true });

  for (const gender of ["female", "male"] as const) {
    try {
      const t0     = Date.now();
      const result = await generateAiAvatar(
        DUMMY_PHOTO,
        "image/png",
        gender,
        FAL_KEY,
        HF_TOKEN,
        REPLICATE_TOKEN,
        undefined,
        {
          modalPulidUrl:  MODAL_PULID_URL,
          pulidEnabled:   PULID_ENABLED,
          restoreEnabled: RESTORE_ENABLED,
          bestOfN:        BEST_OF_N,
          cfAccountId:    CF_ACCOUNT_ID,
          cfApiToken:     CF_API_TOKEN,
          geminiApiKey:   GEMINI_API_KEY,
          geminiImageEnabled: GEMINI_ENABLED,
        }
      );
      const elapsed = ((Date.now() - t0) / 1000).toFixed(1);

      ok(`${gender} generated via: ${result.provider}`);
      ok(`  Time: ${elapsed}s  |  Size: ${(result.buffer.length / 1024).toFixed(1)} KB`);
      ok(`  Seed: ${result.seed}`);
      ok(`  Prompt: "${result.prompt.slice(0, 70)}…"`);

      const filename = `${gender}-avatar-${Date.now()}.png`;
      const outPath  = join(outDir, filename);
      writeFileSync(outPath, result.buffer);
      ok(`  Saved: apps/api/public/images/avatar-upgrade-test/${filename}`);
      passed += 5;

      // Flag if we hit a worse provider than expected
      if (expectedProvider !== "none" && !result.provider.startsWith(expectedProvider.split("/")[0])) {
        warn(`  Provider mismatch — expected '${expectedProvider}', got '${result.provider}'`);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      fail(`${gender} generation failed: ${msg}`);
      failed++;
    }
  }

  // ── Step 4: Env var checklist for deployment ───────────────────────────────
  console.log("\n── Step 4: Railway Deployment Checklist");
  hr();

  const checklist = [
    { var: "FAL_KEY",                 value: FAL_KEY,         needed: "fal.ai provider (current main)" },
    { var: "HUGGINGFACE_TOKEN",       value: HF_TOKEN,        needed: "HF fallback" },
    { var: "REPLICATE_TOKEN",         value: REPLICATE_TOKEN, needed: "InstantID + CodeFormer" },
    { var: "CLOUDFLARE_ACCOUNT_ID",   value: CF_ACCOUNT_ID,   needed: "last-resort fallback" },
    { var: "CLOUDFLARE_API_TOKEN",    value: CF_API_TOKEN,    needed: "last-resort fallback" },
    { var: "GEMINI_API_KEY",          value: GEMINI_API_KEY,  needed: "Gemini face-preserving fallback" },
    { var: "GEMINI_IMAGE_ENABLED",    value: String(GEMINI_ENABLED), needed: "flip to 'true' after Gemini test" },
    { var: "MODAL_PULID_URL",         value: MODAL_PULID_URL, needed: "PuLID — deploy modal_pulid.py first" },
    { var: "PULID_ENABLED",           value: String(PULID_ENABLED), needed: "flip to 'true' after Modal deploy" },
    { var: "AVATAR_RESTORE_ENABLED",  value: String(RESTORE_ENABLED), needed: "CodeFormer post-processing" },
    { var: "AVATAR_BEST_OF_N",        value: String(BEST_OF_N),       needed: "best-of-2 for KYC quality" },
  ];

  for (const item of checklist) {
    if (item.value && item.value !== "false" && item.value !== "undefined" && item.value !== "1") {
      ok(`${item.var.padEnd(30)} = ${String(item.value).slice(0, 20)}`);
      passed++;
    } else if (item.value === "1" || item.value === "false") {
      warn(`${item.var.padEnd(30)} = ${item.value}  (${item.needed})`);
    } else {
      warn(`${item.var.padEnd(30)} not set  (${item.needed})`);
    }
  }

  // ── Summary ────────────────────────────────────────────────────────────────
  printSummary(passed, failed);

  if (failed === 0) {
    console.log("  🚀  Next steps:");
    if (!MODAL_PULID_URL) {
      console.log("       1. pip install modal && modal token new");
      console.log("       2. modal deploy apps/api/modal/modal_pulid.py");
      console.log("       3. Copy printed URL → Railway MODAL_PULID_URL");
      console.log("       4. Set PULID_ENABLED=true on Railway → re-test");
    } else if (!PULID_ENABLED) {
      console.log("       Set PULID_ENABLED=true on Railway to activate PuLID");
    } else {
      console.log("       PuLID is active. Monitor Modal billing at https://modal.com/usage");
    }
    if (!RESTORE_ENABLED) {
      console.log("       Set AVATAR_RESTORE_ENABLED=true + REPLICATE_TOKEN for CodeFormer");
    }
    if (BEST_OF_N < 2) {
      console.log("       Set AVATAR_BEST_OF_N=2 on Railway for best-of-2 quality boost");
    }
    console.log("");
  }
}

function printSummary(passed: number, failed: number) {
  console.log("\n" + "═".repeat(62));
  console.log(`  RESULTS: ${passed} passed  |  ${failed} failed`);
  if (failed === 0) {
    console.log("  STATUS:  ✅  Avatar upgrade wired correctly");
  } else {
    console.log("  STATUS:  ❌  Issues found — see above");
  }
  console.log("═".repeat(62) + "\n");
}

run().catch((e) => {
  console.error("\nFatal error:", e instanceof Error ? e.message : e);
  process.exit(1);
});
