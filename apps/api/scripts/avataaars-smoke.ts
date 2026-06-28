/**
 * Phase 1 smoke test for the Avataaars composer.
 * Renders several configs to /tmp PNGs and asserts no unresolved {{tokens}}.
 * Run: npx tsx scripts/avataaars-smoke.ts
 */
import fs from "fs";
import os from "os";
import path from "path";
import {
  generateAvataaarsSVG,
  getRandomAvataaarsConfig,
  traitsToAvataaarsConfig,
  rasterizeAvataaarsSVG,
  sanitizeConfig,
  VARIANTS,
  type AvataaarsConfig,
} from "../src/services/avataaars-avatar";
import type { VisualTraits } from "../src/services/ai-avatar";

const OUT = os.tmpdir();

function assertNoTokens(label: string, svg: string) {
  const leftover = svg.match(/\{\{\w+\}\}/g);
  if (leftover) throw new Error(`${label}: unresolved tokens ${leftover.join(",")}`);
}

async function render(label: string, config: AvataaarsConfig) {
  const svg = generateAvataaarsSVG(config);
  assertNoTokens(label, svg);
  const png = await rasterizeAvataaarsSVG(svg, 256);
  const file = path.join(OUT, `avataaars-${label}.png`);
  fs.writeFileSync(file, png);
  console.log(`  ✓ ${label}: svg ${svg.length}b → png ${png.length}b  (${file})`);
}

async function main() {
  console.log("Variant counts:",
    Object.fromEntries(Object.entries(VARIANTS).map(([k, v]) => [k, v.length])));

  // 1. A deterministic hand-built config exercising every slot incl. graphicShirt.
  const full = sanitizeConfig({
    top: "shortFlat", eyes: "happy", eyebrows: "default", mouth: "smile",
    nose: "default", facialHair: "beardLight", clothing: "graphicShirt",
    clothingGraphic: "skull", accessories: "round",
    skinColor: "edb98a", hairColor: "2c1b18", facialHairColor: "2c1b18",
    clothesColor: "65c9ff", accessoriesColor: "262e33", hatColor: "262e33",
    backgroundColor: "b6e3f4", shape: "circle",
  });
  await render("full", full);

  // 2. A hat variant (exercises {{hat}} token) with default (no-frame) shape.
  await render("hat", sanitizeConfig({
    top: "winterHat02", eyes: "wink", eyebrows: "raisedExcited", mouth: "twinkle",
    nose: "default", clothing: "hoodie", hatColor: "ff488e", shape: "default",
  }));

  // 3. Minimal: no top, no facial hair, no accessories.
  await render("minimal", sanitizeConfig({
    top: null, eyes: "default", eyebrows: "flatNatural", mouth: "serious",
    nose: "default", facialHair: null, clothing: "shirtCrewNeck", accessories: null,
    backgroundColor: "transparent",
  }));

  // 4. Random configs.
  for (let i = 0; i < 3; i++) await render(`random${i}`, getRandomAvataaarsConfig());

  // 5. Trait-driven config.
  const traits: VisualTraits = {
    gender: "female", genderConf: 0.9, skinTone: "warm-ivory", hairColour: "auburn",
    ageClass: "young-adult", hasGlasses: true, hasBeard: false, expression: "warm-smile",
    dominantClothingHex: "#ff5c5c", ethnicRegion: "southern-european",
  };
  await render("traits", traitsToAvataaarsConfig(traits, "user-abc-123"));

  console.log("\n✅ All renders passed, no unresolved tokens.");
}

main().catch((e) => { console.error("SMOKE FAIL:", e); process.exit(1); });
