/// <reference types="node" />
import "dotenv/config";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { generateAiAvatar, type AvatarArtStyle } from "../src/services/ai-avatar";

const __filename = fileURLToPath(import.meta.url);
const __dirname  = dirname(__filename);

const PHOTO_PATH = join(__dirname, "my-photo.jpg");
const OUT_DIR    = join(__dirname, "../public/images/sarth-avatar/cloudflare-test");

const CF_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID ?? "";
const CF_API_TOKEN  = process.env.CLOUDFLARE_API_TOKEN ?? "";

async function runStyle(style: AvatarArtStyle): Promise<string> {
  const photo = readFileSync(PHOTO_PATH);
  const t0 = Date.now();

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
      geminiImageEnabled: false,
      cfAccountId: CF_ACCOUNT_ID,
      cfApiToken: CF_API_TOKEN,
      style,
    },
  );

  mkdirSync(OUT_DIR, { recursive: true });
  const filename = `sarth-cloudflare-${style}-${Date.now()}.png`;
  const outPath = join(OUT_DIR, filename);
  writeFileSync(outPath, result.buffer);

  console.log(`✅ ${style} generated via ${result.provider}`);
  console.log(`   time=${((Date.now() - t0) / 1000).toFixed(1)}s size=${(result.buffer.length / 1024).toFixed(0)}KB`);
  console.log(`   saved=apps/api/public/images/sarth-avatar/cloudflare-test/${filename}`);

  return outPath;
}

async function run() {
  console.log("\n══════════════════════════════════════════════");
  console.log("  Cloudflare SDXL Avatar Test (Gemini fallback)");
  console.log("══════════════════════════════════════════════\n");

  console.log(`Input: ${PHOTO_PATH}`);
  const cosmic = await runStyle("cosmic");
  const noir = await runStyle("noir-glamour");

  console.log("\nDone:");
  console.log(`- ${cosmic}`);
  console.log(`- ${noir}`);
}

run().catch((err) => {
  console.error("Fatal:", err instanceof Error ? err.message : err);
  process.exit(1);
});
