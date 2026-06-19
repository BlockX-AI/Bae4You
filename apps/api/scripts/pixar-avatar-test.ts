/// <reference types="node" />
import "dotenv/config";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname  = dirname(__filename);

const PHOTO_PATH = join(__dirname, "my-photo.jpg");
const OUT_DIR = join(__dirname, "../public/images/sarth-avatar/pixar-test");

const ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;
const API_TOKEN = process.env.CLOUDFLARE_API_TOKEN;

const PROMPT = [
  "3D Pixar character avatar portrait, big head proportions, oversized expressive eyes with detailed iris highlights and soft eyelashes,",
  "smooth rounded soft features, warm gentle friendly smile showing slight teeth,",
  "flat-shaded skin with subtle gradient highlights and soft cheek blush,",
  "modern Disney-Pixar animation character design, plain simple casual crew-neck t-shirt in solid muted color,",
  "clean shoulders visible, centered bust composition portrait, solid soft pastel background,",
  "professional 3D character render, glossy clean polished cinematic look, high quality character illustration,",
  "studio lighting with soft key light and gentle rim light, 1024x1024 square avatar"
].join(" ");

const NEGATIVE = [
  "headphones, earphones, earbuds, microphone, glasses, sunglasses, eyewear,",
  "hat, cap, beanie, helmet, hood, hoodie, scarf, mask, jewelry, necklace, earrings, piercings, tattoos,",
  "busy patterns on clothing, logos, text, photorealistic, photograph, photograph skin, realistic skin texture, gritty,",
  "anime, manga, 2d flat, sketch, line art, cartoon network style, deformed, ugly, asymmetric face, blurry, low quality,",
  "watermark, dark background, multiple people, character sheet, side profile, full body"
].join(" ");

async function generateVariant(seedHint: number): Promise<string> {
  if (!ACCOUNT_ID || !API_TOKEN) {
    throw new Error("Cloudflare env vars missing");
  }

  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/ai/run/@cf/stabilityai/stable-diffusion-xl-base-1.0`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${API_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        prompt: PROMPT,
        negative_prompt: NEGATIVE,
        num_steps: 20,
        guidance: 7.2,
        seed: seedHint,
      }),
    },
  );

  if (!response.ok) {
    throw new Error(`Cloudflare AI failed: ${await response.text()}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());

  mkdirSync(OUT_DIR, { recursive: true });
  const filename = `sarth-pixar-${seedHint}-${Date.now()}.png`;
  const outPath = join(OUT_DIR, filename);
  writeFileSync(outPath, buffer);
  console.log(`saved=apps/api/public/images/sarth-avatar/pixar-test/${filename}`);
  return outPath;
}

async function run() {
  console.log("Generating 4 Pixar-style Cloudflare variants...");
  console.log(`Reference photo available at ${PHOTO_PATH}, but this run prioritizes style quality over identity preservation.`);
  const variants = [1122, 2233, 3344, 4455];
  for (const seed of variants) {
    const path = await generateVariant(seed);
    console.log(path);
  }
}

run().catch((err) => {
  console.error("Fatal:", err instanceof Error ? err.message : err);
  process.exit(1);
});
