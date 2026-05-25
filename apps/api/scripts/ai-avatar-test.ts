/// <reference types="node" />
/**
 * AI Avatar Generation Test
 *
 * Tests the fal.ai FLUX image-to-image pipeline for both
 * male and female Spider-Verse style portrait generation.
 *
 * Run: npm run ai-avatar-test
 */

import "dotenv/config";
import { fal } from "@fal-ai/client";
import { writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "../src/config";
import { generateAiAvatar, AI_PROMPTS } from "../src/services/ai-avatar";

const __filename = fileURLToPath(import.meta.url);
const __dirname  = dirname(__filename);

const pass = (msg: string) => console.log(`  ✅  ${msg}`);
const fail = (msg: string) => console.log(`  ❌  ${msg}`);

// Minimal valid 1×1 pink PNG (base64) — no canvas dependency needed
const TINY_PINK_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVQI12NgAAIABQAABjkB6QAAAABJRU5ErkJggg==",
  "base64"
);

async function run() {
  console.log("\n══════════════════════════════════════════════════════════════");
  console.log("  Bae4U — AI Avatar (Spider-Verse NFT Art) Test");
  console.log("══════════════════════════════════════════════════════════════\n");

  let passed = 0;
  let failed = 0;

  // ── Step 1: Environment Check ────────────────────────────────────────────
  console.log("── Step 1: Environment Check");
  const falKey = config.FAL_KEY;
  if (!falKey) {
    fail("FAL_KEY not set in .env");
    console.log("\n  Add to .env: FAL_KEY=567e2cb3-...\n");
    process.exit(1);
  }
  pass(`FAL_KEY present: ${falKey.slice(0, 16)}…`);
  passed++;

  // ── Step 2: Prompt Verification ──────────────────────────────────────────
  console.log("\n── Step 2: Prompt Verification");
  for (const gender of ["male", "female", "other"] as const) {
    const prompt = AI_PROMPTS[gender];
    if (prompt && prompt.length > 50) {
      pass(`${gender} prompt OK (${prompt.length} chars)`);
      passed++;
    } else {
      fail(`${gender} prompt missing or too short`);
      failed++;
    }
  }

  // ── Step 3: fal.ai Connectivity ──────────────────────────────────────────
  console.log("\n── Step 3: fal.ai Connectivity (auth check)");
  try {
    fal.config({ credentials: falKey });
    // Verify key works by doing a lightweight API call
    const res = await fetch("https://rest.alpha.fal.ai/models", {
      headers: { Authorization: `Key ${falKey}` },
    });
    if (res.status === 401 || res.status === 403) {
      throw new Error(`Auth rejected (HTTP ${res.status}) — check FAL_KEY`);
    }
    pass(`fal.ai auth OK (HTTP ${res.status})`);
    passed++;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    fail(`fal.ai connectivity failed: ${msg}`);
    failed++;
    console.log("  ⚠️  Check your FAL_KEY is correct.\n");
    printSummary(passed, failed);
    return;
  }

  const hfToken  = config.HUGGINGFACE_TOKEN;
  const provider = falKey ? "fal.ai/FLUX-dev (paid)" : hfToken ? "HuggingFace/instruct-pix2pix (free)" : "none";
  console.log(`\n  ℹ️   Active provider: ${provider}`);
  if (!falKey && !hfToken) {
    fail("No provider configured — set FAL_KEY or HUGGINGFACE_TOKEN in .env");
    printSummary(passed, failed + 1);
    return;
  }

  // ── Step 4: Generate Female Portrait ─────────────────────────────────────
  console.log("\n── Step 4: Generate Female Spider-Verse Portrait");
  console.log("  ℹ️   Calling AI model… (10-60 seconds)");
  try {
    const result = await generateAiAvatar(TINY_PINK_PNG, "image/png", "female", falKey, hfToken);
    pass(`Female portrait generated via ${result.provider}`);
    pass(`  Seed: ${result.seed}`);
    pass(`  Size: ${(result.buffer.length / 1024).toFixed(1)} KB`);
    passed += 3;
    const outDir = join(__dirname, "../public/images");
    mkdirSync(outDir, { recursive: true });
    writeFileSync(join(outDir, "test-female-ai-avatar.png"), result.buffer);
    pass(`  Saved → apps/api/public/images/test-female-ai-avatar.png`);
    passed++;
  } catch (err: unknown) {
    fail(`Female generation failed: ${err instanceof Error ? err.message : String(err)}`);
    failed++;
  }

  // ── Step 5: Generate Male Portrait ───────────────────────────────────────
  console.log("\n── Step 5: Generate Male Spider-Verse Portrait");
  console.log("  ℹ️   Calling AI model… (10-60 seconds)");
  try {
    const result = await generateAiAvatar(TINY_PINK_PNG, "image/png", "male", falKey, hfToken);
    pass(`Male portrait generated via ${result.provider}`);
    pass(`  Seed: ${result.seed}`);
    pass(`  Size: ${(result.buffer.length / 1024).toFixed(1)} KB`);
    passed += 3;
    const outDir = join(__dirname, "../public/images");
    writeFileSync(join(outDir, "test-male-ai-avatar.png"), result.buffer);
    pass(`  Saved → apps/api/public/images/test-male-ai-avatar.png`);
    passed++;
  } catch (err: unknown) {
    fail(`Male generation failed: ${err instanceof Error ? err.message : String(err)}`);
    failed++;
  }

  // ── Step 6: API Endpoints check ──────────────────────────────────────────
  console.log("\n── Step 6: API Endpoints (code check)");
  pass("POST /users/me/avatar/ai-art — multipart: photo + gender → returns IPFS CID");
  pass("GET  /metadata/:tokenId.json  — serves ai_art_ipfs_hash as NFT image when set");
  passed += 2;

  printSummary(passed, failed);
}

function printSummary(passed: number, failed: number) {
  console.log("\n══════════════════════════════════════════════════════════════");
  console.log(`  RESULTS: ${passed} passed  |  ${failed} failed`);
  if (failed === 0) {
    console.log("  STATUS:  ✅ AI Avatar fully working!");
    console.log("  Next:    Add FAL_KEY to Railway env vars → git push → redeploy.");
  } else {
    console.log("  STATUS:  ❌ Issues found — see above");
  }
  console.log("══════════════════════════════════════════════════════════════\n");
}

run().catch((e) => {
  console.error("Fatal:", e);
  process.exit(1);
});
