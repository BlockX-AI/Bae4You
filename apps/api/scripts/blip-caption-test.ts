/// <reference types="node" />
import "dotenv/config";
import { readdirSync, readFileSync } from "node:fs";
import { join, extname } from "node:path";
import { HfInference } from "@huggingface/inference";

const hf = new HfInference(process.env.HUGGINGFACE_TOKEN);
const INPUT_DIR = "/Users/prakharmishra/Desktop/bae4u/Bae4You/apps/api/public/images/input";

async function tryModel(label: string, fn: () => Promise<unknown>) {
  try {
    const r = await fn();
    console.log(`  ✅ ${label}:`, JSON.stringify(r).slice(0, 200));
  } catch (e: unknown) {
    console.log(`  ❌ ${label}: ${e instanceof Error ? e.message.slice(0,120) : e}`);
  }
}

async function run() {
  const files2 = readdirSync(INPUT_DIR).filter(f =>
    [".jpg",".jpeg",".png",".webp"].includes(extname(f).toLowerCase())
  );
  const file = join(INPUT_DIR, files2[0]);
  console.log("Using file:", JSON.stringify(files2[0]));
  const buf = readFileSync(file);
  const blob = new Blob([new Uint8Array(buf)], { type: "image/png" });

  console.log("\n=== Image Caption Models ===");
  await tryModel("nlpconnect/vit-gpt2-image-captioning", () =>
    hf.imageToText({ model: "nlpconnect/vit-gpt2-image-captioning", data: blob }));
  await tryModel("microsoft/git-base-coco", () =>
    hf.imageToText({ model: "microsoft/git-base-coco", data: blob }));
  await tryModel("microsoft/git-large-coco", () =>
    hf.imageToText({ model: "microsoft/git-large-coco", data: blob }));
  await tryModel("ydshieh/vit-gpt2-coco-en", () =>
    hf.imageToText({ model: "ydshieh/vit-gpt2-coco-en", data: blob }));

  console.log("\n=== Zero-Shot Image Classification (face attributes) ===");
  const attrs = ["wearing glasses", "not wearing glasses", "has beard", "no beard", "young person", "old person", "dark skin", "light skin", "medium skin"];
  await tryModel("openai/clip-vit-large-patch14", () =>
    hf.zeroShotImageClassification({ model: "openai/clip-vit-large-patch14", inputs: { image: blob }, parameters: { candidate_labels: attrs } }));
  await tryModel("patrickjohncyh/fashion-clip", () =>
    hf.zeroShotImageClassification({ model: "patrickjohncyh/fashion-clip", inputs: { image: blob }, parameters: { candidate_labels: attrs } }));
  await tryModel("laion/CLIP-ViT-H-14-laion2B-s32B-b79K", () =>
    hf.zeroShotImageClassification({ model: "laion/CLIP-ViT-H-14-laion2B-s32B-b79K", inputs: { image: blob }, parameters: { candidate_labels: attrs } }));
}
run().catch(console.error);
