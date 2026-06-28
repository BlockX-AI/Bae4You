/**
 * Phase 0 — DiceBear "Avataaars" part extractor.
 *
 * Reads the locally-installed @dicebear/avataaars component library and writes
 * every variant of every category to a standalone, colour-tokenised SVG fragment
 * that THIS project owns. After this runs we no longer depend on @dicebear at
 * runtime — the fragments under public/avataaars-parts/ are ours to render,
 * recolour, and extend.
 *
 * How it works:
 *   Each DiceBear part is a function (components, colors) => svgFragmentString.
 *   - `colors` is replaced with a Proxy that returns a "{{token}}" sentinel for
 *     every colour access (colors.skin -> "{{skin}}"), so the dumped fragment is
 *     recolourable later by simple string substitution.
 *   - `components` is replaced with a Proxy whose every member is undefined, so
 *     nested sub-components (base nests everything; clothing.graphicShirt nests
 *     clothingGraphic) render as EMPTY <g transform=...> placeholders. Those
 *     empty groups are exactly the injection points the Phase 1 composer fills.
 *
 * Output:
 *   public/avataaars-parts/<category>/<variant>.svg   — leaf part fragments
 *   public/avataaars-parts/_structure/base.svg        — body skeleton w/ slots
 *   public/avataaars-parts/_structure/style-circle.svg
 *   public/avataaars-parts/_structure/style-default.svg
 *   public/avataaars-parts/manifest.json              — categories, variants, tokens
 *
 * Run: pnpm --filter api avataaars:extract   (or: npx tsx scripts/extract-avataaars-parts.ts)
 *
 * License: @dicebear/avataaars code is MIT; the Avataaars artwork is by Pablo
 * Stanley, "free for personal and commercial use" (https://avataaars.com/).
 */

import fs from "fs";
import path from "path";
import { pathToFileURL } from "url";

// ─── Paths ──────────────────────────────────────────────────────────────────
const LIB_DIR = path.resolve(
  __dirname,
  "../node_modules/@dicebear/avataaars/lib/components",
);
const OUT_DIR = path.resolve(__dirname, "../public/avataaars-parts");

// Leaf part categories we extract as individually selectable parts.
const PART_CATEGORIES = [
  "top",
  "eyes",
  "eyebrows",
  "mouth",
  "nose",
  "facialHair",
  "clothing",
  "clothingGraphic",
  "accessories",
] as const;

// Colour keys exposed by DiceBear's getColors(). Each becomes a {{token}}.
const COLOR_KEYS = [
  "skin",
  "hair",
  "facialHair",
  "clothes",
  "accessories",
  "hat",
  "background",
] as const;

// ─── Sentinel proxies ───────────────────────────────────────────────────────
// colors.<key> -> "{{<key>}}"   (unknown key -> "{{<key>}}" too, fail-loud-ish)
const colorsProxy = new Proxy(
  {},
  {
    get: (_t, prop: string | symbol) =>
      typeof prop === "string" ? `{{${prop}}}` : undefined,
  },
);

// components.<anything> -> undefined  (nested groups render empty)
const componentsProxy = new Proxy(
  {},
  { get: () => undefined },
);

// ─── Helpers ────────────────────────────────────────────────────────────────
function ensureDir(dir: string) {
  fs.mkdirSync(dir, { recursive: true });
}

function tokensUsed(svg: string): string[] {
  const found = new Set<string>();
  for (const key of COLOR_KEYS) {
    if (svg.includes(`{{${key}}}`)) found.add(key);
  }
  return [...found];
}

async function loadComponentMap(
  category: string,
): Promise<Record<string, (c: unknown, col: unknown) => string>> {
  const file = path.join(LIB_DIR, `${category}.js`);
  const mod = await import(pathToFileURL(file).href);
  // Each file exports `export const <category> = {...}`
  const map = mod[category];
  if (!map || typeof map !== "object") {
    throw new Error(`Component map '${category}' not found in ${file}`);
  }
  return map;
}

// ─── Extraction ─────────────────────────────────────────────────────────────
interface CategoryReport {
  category: string;
  variants: string[];
  count: number;
  colorTokensByVariant: Record<string, string[]>;
}

async function extractCategory(category: string): Promise<CategoryReport> {
  const map = await loadComponentMap(category);
  const outDir = path.join(OUT_DIR, category);
  ensureDir(outDir);

  const variants = Object.keys(map);
  const colorTokensByVariant: Record<string, string[]> = {};

  for (const variant of variants) {
    const fn = map[variant];
    if (typeof fn !== "function") {
      console.warn(`  ! ${category}/${variant} is not a function — skipped`);
      continue;
    }
    const fragment = fn(componentsProxy, colorsProxy);
    if (typeof fragment !== "string" || !fragment.trim()) {
      console.warn(`  ! ${category}/${variant} produced empty output`);
    }
    fs.writeFileSync(path.join(outDir, `${variant}.svg`), fragment, "utf-8");
    colorTokensByVariant[variant] = tokensUsed(fragment);
  }

  console.log(`  ✓ ${category}: ${variants.length} variants`);
  return {
    category,
    variants,
    count: variants.length,
    colorTokensByVariant,
  };
}

async function extractStructure() {
  const structDir = path.join(OUT_DIR, "_structure");
  ensureDir(structDir);

  // base.default — full body skeleton with empty slot groups + {{skin}} tokens
  const baseMap = await loadComponentMap("base");
  const baseSvg = baseMap["default"](componentsProxy, colorsProxy);
  fs.writeFileSync(path.join(structDir, "base.svg"), baseSvg, "utf-8");

  // style.circle / style.default — outer framing (background circle + mask)
  const styleMap = await loadComponentMap("style");
  for (const key of Object.keys(styleMap)) {
    const svg = styleMap[key](componentsProxy, colorsProxy);
    fs.writeFileSync(path.join(structDir, `style-${key}.svg`), svg, "utf-8");
  }
  console.log(`  ✓ _structure: base + style(${Object.keys(styleMap).join(",")})`);
}

async function main() {
  console.log("Extracting DiceBear Avataaars parts → " + OUT_DIR);
  ensureDir(OUT_DIR);

  const reports: CategoryReport[] = [];
  for (const cat of PART_CATEGORIES) {
    reports.push(await extractCategory(cat));
  }
  await extractStructure();

  // The base.js layout defines where each category is placed on the 280×280
  // canvas. Captured verbatim from node_modules so Phase 1 has ground truth.
  const layoutTransforms: Record<string, string> = {
    clothing: "translate(0 170)",
    mouth: "translate(78 134)",
    nose: "translate(104 122)",
    eyes: "translate(76 90)",
    eyebrows: "translate(76 82)",
    top: "translate(-1)",
    facialHair: "translate(49 72)",
    accessories: "translate(62 42)",
    clothingGraphic: "translate(77 58)", // nested inside clothing.graphicShirt
  };

  const manifest = {
    generatedFrom: "@dicebear/avataaars@9.4.2",
    license: {
      code: "MIT",
      art: "Avataaars by Pablo Stanley — free for personal and commercial use",
      url: "https://avataaars.com/",
    },
    canvas: { viewBox: "0 0 280 280", rootTransform: "translate(8)" },
    colorTokens: COLOR_KEYS,
    layoutTransforms,
    drawOrder: [
      "style(background)",
      "base(skin)",
      "clothing",
      "mouth",
      "nose",
      "eyes",
      "eyebrows",
      "top",
      "facialHair",
      "accessories",
    ],
    categories: reports.map((r) => ({
      category: r.category,
      count: r.count,
      variants: r.variants,
      colorTokensByVariant: r.colorTokensByVariant,
    })),
  };
  fs.writeFileSync(
    path.join(OUT_DIR, "manifest.json"),
    JSON.stringify(manifest, null, 2),
    "utf-8",
  );

  const totalParts = reports.reduce((n, r) => n + r.count, 0);
  console.log(`\n✅ Done. ${totalParts} part fragments + structure + manifest.`);
  console.log(`📁 ${OUT_DIR}`);
}

main().catch((err) => {
  console.error("Extraction failed:", err);
  process.exit(1);
});
