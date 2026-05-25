/// <reference types="node" />

import "dotenv/config";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "../src/config";
import { generateAiAvatar } from "../src/services/ai-avatar";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function run() {
  const inputPath = "/Users/prakharmishra/Desktop/bae4u/Bae4You/apps/api/public/images/frames/WhatsApp Image 2025-11-13 at 12.20.16.jpeg";
  const outDir = join(__dirname, "../public/images");
  mkdirSync(outDir, { recursive: true });

  const input = readFileSync(inputPath);
  console.log(`Input frame image loaded: ${(input.length / 1024).toFixed(1)} KB`);

  const female = await generateAiAvatar(input, "image/jpeg", "female", config.FAL_KEY, config.HUGGINGFACE_TOKEN);
  const femaleOut = join(outDir, "frame-test-female-ai-avatar.png");
  writeFileSync(femaleOut, female.buffer);
  console.log(`Female generated via ${female.provider}: ${(female.buffer.length / 1024).toFixed(1)} KB`);
  console.log(`Saved: ${femaleOut}`);

  const male = await generateAiAvatar(input, "image/jpeg", "male", config.FAL_KEY, config.HUGGINGFACE_TOKEN);
  const maleOut = join(outDir, "frame-test-male-ai-avatar.png");
  writeFileSync(maleOut, male.buffer);
  console.log(`Male generated via ${male.provider}: ${(male.buffer.length / 1024).toFixed(1)} KB`);
  console.log(`Saved: ${maleOut}`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
