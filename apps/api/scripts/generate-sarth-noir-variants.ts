/// <reference types="node" />
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { generateAiAvatar, extractVisualTraits } from "../src/services/ai-avatar";

const __filename = fileURLToPath(import.meta.url);
const __dirname  = dirname(__filename);

const CF_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID ?? "";
const CF_API_TOKEN  = process.env.CLOUDFLARE_API_TOKEN ?? "";
const PHOTO_PATH    = "c:\\Users\\sarth\\bae4u\\Bae4You\\WhatsApp Image 2026-06-14 at 1.54.37 AM.jpeg";
const OUT_DIR       = join(__dirname, "../public/images/sarth-avatar/noir-variants");

async function run() {
  console.log("\n══════════════════════════════════════════════");
  console.log("  Sarth — 3 Noir-Glamour Avatar Variants");
  console.log("  Provider: Cloudflare SDXL-Lightning fallback");
  console.log("══════════════════════════════════════════════\n");

  mkdirSync(OUT_DIR, { recursive: true });
  const photo  = readFileSync(PHOTO_PATH);
  const traits = await extractVisualTraits(photo, "male", 0.9);

  console.log(`Traits: skin=${traits.skinTone}, hair=${traits.hairColour}, expression=${traits.expression}, region=${traits.ethnicRegion}`);

  for (let i = 1; i <= 3; i++) {
    const t0 = Date.now();
    console.log(`\n── Variant ${i}/3`);
    const result = await generateAiAvatar(
      photo,
      "image/jpeg",
      "male",
      undefined,
      undefined,
      undefined,
      undefined,
      {
        pulidEnabled: false,
        restoreEnabled: false,
        bestOfN: 1,
        cfAccountId: CF_ACCOUNT_ID,
        cfApiToken: CF_API_TOKEN,
        style: "noir-glamour",
      },
    );

    const filename = `sarth-noir-${i}-${Date.now()}.png`;
    const outPath  = join(OUT_DIR, filename);
    writeFileSync(outPath, result.buffer);
    console.log(`✅ ${result.provider} | ${((Date.now() - t0) / 1000).toFixed(1)}s | ${(result.buffer.length / 1024).toFixed(0)} KB`);
    console.log(`✅ Saved: apps/api/public/images/sarth-avatar/noir-variants/${filename}`);
  }

  console.log("\nDone.\n");
}

run().catch((e) => {
  console.error("Fatal:", e instanceof Error ? e.message : e);
  process.exit(1);
});
