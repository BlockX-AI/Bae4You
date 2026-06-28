/**
 * Avataaars Avatar Service — self-hosted clone of DiceBear's "Avataaars" style.
 *
 * Renders a 280×280 SVG avatar by assembling the colour-tokenised SVG fragments
 * extracted in Phase 0 (apps/api/public/avataaars-parts/). We no longer depend on
 * @dicebear at runtime — the fragments are ours to compose, recolour and extend.
 *
 * Assembly mirrors DiceBear exactly (ground truth captured in manifest.json):
 *   - Canvas viewBox "0 0 280 280"; whole body wrapped in <g transform="translate(8)">.
 *   - Leaf parts are injected into the empty <g transform="..."> slot groups inside
 *     the body skeleton (_structure/base.svg). Each slot is matched by its transform.
 *   - clothingGraphic nests inside clothing.graphicShirt's own slot.
 *   - Colours are injected by substituting {{token}} placeholders with hex values.
 *   - Draw order (back→front): background → base(skin) → clothing → mouth → nose →
 *     eyes → eyebrows → top → facialHair → accessories.
 *
 * License: Avataaars art by Pablo Stanley (free for personal & commercial use,
 * https://avataaars.com/). Extraction tooling code was MIT (@dicebear).
 */

import fs   from "fs";
import path from "path";
import type { VisualTraits, SkinTone, HairColour } from "./ai-avatar";

// ─── Public types ─────────────────────────────────────────────────────────────

export interface AvataaarsConfig {
  // Part variant names (must exist in the corresponding category folder).
  // `null`/absent = part not drawn (valid for top / facialHair / accessories).
  top:             string | null;   // hair or hat
  eyes:            string;
  eyebrows:        string;
  mouth:           string;
  nose:            string;
  facialHair:      string | null;
  clothing:        string;
  clothingGraphic: string | null;   // only shown when clothing === "graphicShirt"
  accessories:     string | null;   // glasses / eyepatch

  // Colours — 6-digit hex WITHOUT leading '#'. `background` may be "transparent".
  skinColor:        string;
  hairColor:        string;
  facialHairColor:  string;
  clothesColor:     string;
  accessoriesColor: string;
  hatColor:         string;
  backgroundColor:  string;

  // Framing — "circle" draws the masked DiceBear circle frame; "default" = body only.
  shape: "circle" | "default";
}

export interface AvataaarsAvatarResult {
  config:    AvataaarsConfig;
  svgString: string;
  traits:    VisualTraits;
  userId:    string;
}

// ─── Asset location + manifest (single source of truth for valid variants) ─────

const PARTS_DIR = path.resolve(__dirname, "../../public/avataaars-parts");

interface Manifest {
  layoutTransforms: Record<string, string>;
  categories: Array<{ category: string; variants: string[] }>;
}

function loadManifest(): Manifest | null {
  try {
    const raw = fs.readFileSync(path.join(PARTS_DIR, "manifest.json"), "utf-8");
    return JSON.parse(raw) as Manifest;
  } catch {
    return null;
  }
}

const MANIFEST = loadManifest();

// category → ordered list of valid variant names
export const VARIANTS: Record<string, string[]> = (() => {
  const out: Record<string, string[]> = {};
  if (MANIFEST) for (const c of MANIFEST.categories) out[c.category] = c.variants;
  return out;
})();

// category → SVG transform of its slot inside base.svg
const LAYOUT: Record<string, string> = MANIFEST?.layoutTransforms ?? {
  clothing:        "translate(0 170)",
  mouth:           "translate(78 134)",
  nose:            "translate(104 122)",
  eyes:            "translate(76 90)",
  eyebrows:        "translate(76 82)",
  top:             "translate(-1)",
  facialHair:      "translate(49 72)",
  accessories:     "translate(62 42)",
  clothingGraphic: "translate(77 58)",
};

// ─── Default colour palettes (from DiceBear avataaars schema) ──────────────────

export const PALETTES = {
  skin:       ["614335", "d08b5b", "ae5d29", "edb98a", "ffdbb4", "fd9841", "f8d25c"],
  hair:       ["a55728", "2c1b18", "b58143", "d6b370", "724133", "4a312c", "f59797", "ecdcbf", "c93305", "e8e1e1"],
  facialHair: ["a55728", "2c1b18", "b58143", "d6b370", "724133", "4a312c", "f59797", "ecdcbf", "c93305", "e8e1e1"],
  clothes:    ["262e33", "65c9ff", "5199e4", "25557c", "e6e6e6", "929598", "3c4f5c", "b1e2ff", "a7ffc4", "ffafb9", "ffffb1", "ff488e", "ff5c5c", "ffffff"],
  accessories:["262e33", "65c9ff", "5199e4", "25557c", "e6e6e6", "929598", "3c4f5c", "b1e2ff", "a7ffc4", "ffdeb5", "ffafb9", "ffffb1", "ff488e", "ff5c5c", "ffffff"],
  hat:        ["262e33", "65c9ff", "5199e4", "25557c", "e6e6e6", "929598", "3c4f5c", "b1e2ff", "a7ffc4", "ffdeb5", "ffafb9", "ffffb1", "ff488e", "ff5c5c", "ffffff"],
  background: ["b6e3f4", "c0aede", "d1d4f9", "ffd5dc", "ffdfbf"],
};

// ─── Deterministic hash helper ────────────────────────────────────────────────

function hashToRange(seed: string, max: number): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (Math.imul(31, h) + seed.charCodeAt(i)) | 0;
  }
  return Math.abs(h) % (max + 1);
}

function pickFrom<T>(arr: T[], seed: string): T {
  return arr[hashToRange(seed, arr.length - 1)];
}

// ─── Fragment reading + colour substitution ────────────────────────────────────

const fragmentCache = new Map<string, string>();

function readFragment(category: string, variant: string): string {
  const key = `${category}/${variant}`;
  const cached = fragmentCache.get(key);
  if (cached !== undefined) return cached;

  const file = path.join(PARTS_DIR, category, `${variant}.svg`);
  let content = "";
  try {
    content = fs.readFileSync(file, "utf-8");
  } catch {
    content = "";
  }
  fragmentCache.set(key, content);
  return content;
}

function readStructure(name: string): string {
  return readFragment("_structure", name);
}

// {{token}} → hex (or "transparent"). Hex values get a leading '#'.
function applyColors(svg: string, config: AvataaarsConfig): string {
  const map: Record<string, string> = {
    skin:        toHex(config.skinColor),
    hair:        toHex(config.hairColor),
    facialHair:  toHex(config.facialHairColor),
    clothes:     toHex(config.clothesColor),
    accessories: toHex(config.accessoriesColor),
    hat:         toHex(config.hatColor),
    background:  toHex(config.backgroundColor),
  };
  return svg.replace(/\{\{(\w+)\}\}/g, (_, token: string) =>
    map[token] !== undefined ? map[token] : "transparent",
  );
}

function toHex(value: string): string {
  if (!value || value === "transparent") return "transparent";
  const v = value.startsWith("#") ? value.slice(1) : value;
  return /^[0-9a-fA-F]{6}$/.test(v) ? `#${v}` : "transparent";
}

// Inject `content` into the empty slot group `<g transform="${transform}"></g>`.
function injectSlot(host: string, transform: string, content: string): string {
  if (!content) return host; // leave slot empty
  const slot = `<g transform="${transform}"></g>`;
  return host.replace(slot, `<g transform="${transform}">${content}</g>`);
}

// ─── Core renderer ─────────────────────────────────────────────────────────────

export function generateAvataaarsSVG(config: AvataaarsConfig): string {
  if (!MANIFEST || !fs.existsSync(path.join(PARTS_DIR, "_structure", "base.svg"))) {
    return generateFallbackSVG(config);
  }

  // 1. Body skeleton (carries {{skin}} + 8 empty slot groups).
  let body = readStructure("base");

  // 2. Build clothing fragment, nesting clothingGraphic when graphicShirt.
  let clothing = readFragment("clothing", config.clothing);
  if (config.clothing === "graphicShirt" && config.clothingGraphic) {
    const graphic = readFragment("clothingGraphic", config.clothingGraphic);
    clothing = injectSlot(clothing, LAYOUT.clothingGraphic, graphic);
  }

  // 3. Inject every leaf part into its slot (only parts that exist).
  body = injectSlot(body, LAYOUT.clothing,   clothing);
  body = injectSlot(body, LAYOUT.mouth,      readFragment("mouth",      config.mouth));
  body = injectSlot(body, LAYOUT.nose,       readFragment("nose",       config.nose));
  body = injectSlot(body, LAYOUT.eyes,       readFragment("eyes",       config.eyes));
  body = injectSlot(body, LAYOUT.eyebrows,   readFragment("eyebrows",   config.eyebrows));
  if (config.top)         body = injectSlot(body, LAYOUT.top,         readFragment("top",         config.top));
  if (config.facialHair)  body = injectSlot(body, LAYOUT.facialHair,  readFragment("facialHair",  config.facialHair));
  if (config.accessories) body = injectSlot(body, LAYOUT.accessories, readFragment("accessories", config.accessories));

  // 4. Framing (circle = masked DiceBear frame with background; default = body only).
  let inner: string;
  if (config.shape === "circle") {
    const frame = readStructure("style-circle"); // has empty <g mask=...></g>
    inner = frame.replace(
      `<g mask="url(#styleCircle-a)"></g>`,
      `<g mask="url(#styleCircle-a)">${body}</g>`,
    );
  } else {
    inner = body;
  }

  // 5. Substitute colours + wrap in the 280×280 root.
  const composed = applyColors(`<g transform="translate(8)">${inner}</g>`, config);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 280 280" fill="none" shape-rendering="auto" width="280" height="280">${composed}</svg>`;
}

// Minimal placeholder if the parts directory is missing.
function generateFallbackSVG(config: AvataaarsConfig): string {
  const bg = toHex(config.backgroundColor);
  const fill = bg === "transparent" ? "#b6e3f4" : bg;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 280 280" width="280" height="280">
  <rect width="280" height="280" fill="${fill}"/>
  <circle cx="140" cy="120" r="60" fill="#edb98a"/>
  <circle cx="118" cy="112" r="7" fill="#000"/>
  <circle cx="162" cy="112" r="7" fill="#000"/>
  <path d="M116 145 Q140 165 164 145" stroke="#000" stroke-width="5" fill="none" stroke-linecap="round"/>
</svg>`;
}

// ─── Random config ─────────────────────────────────────────────────────────────

function randomVariant(category: string): string {
  const list = VARIANTS[category] ?? [];
  return list[Math.floor(Math.random() * list.length)] ?? "default";
}

function randomColor(key: keyof typeof PALETTES): string {
  const list = PALETTES[key];
  return list[Math.floor(Math.random() * list.length)];
}

export function getRandomAvataaarsConfig(): AvataaarsConfig {
  const clothing = randomVariant("clothing");
  return {
    top:             Math.random() > 0.05 ? randomVariant("top") : null,
    eyes:            randomVariant("eyes"),
    eyebrows:        randomVariant("eyebrows"),
    mouth:           randomVariant("mouth"),
    nose:            "default",
    facialHair:      Math.random() > 0.7 ? randomVariant("facialHair") : null,
    clothing,
    clothingGraphic: clothing === "graphicShirt" ? randomVariant("clothingGraphic") : null,
    accessories:     Math.random() > 0.8 ? randomVariant("accessories") : null,
    skinColor:        randomColor("skin"),
    hairColor:        randomColor("hair"),
    facialHairColor:  randomColor("facialHair"),
    clothesColor:     randomColor("clothes"),
    accessoriesColor: randomColor("accessories"),
    hatColor:         randomColor("hat"),
    backgroundColor:  randomColor("background"),
    shape:            "circle",
  };
}

// ─── Trait → config mapping ────────────────────────────────────────────────────

// Detected skin tone → Avataaars skin hex
const SKIN_BY_TONE: Record<SkinTone, string> = {
  "fair":         "ffdbb4",
  "warm-ivory":   "edb98a",
  "olive":        "f8d25c",
  "medium-brown": "d08b5b",
  "warm-brown":   "ae5d29",
  "deep-brown":   "614335",
  "dark":         "614335",
};

// Detected hair colour → Avataaars hair hex
const HAIR_BY_COLOUR: Record<HairColour, string> = {
  "jet-black":    "2c1b18",
  "dark-brown":   "4a312c",
  "medium-brown": "724133",
  "auburn":       "a55728",
  "silver-grey":  "e8e1e1",
  "white":        "ecdcbf",
  "light":        "d6b370",
};

const SHORT_HAIR = ["shortFlat", "shortRound", "shortWaved", "theCaesar", "sides", "shortCurly"];
const LONG_HAIR  = ["straight01", "straight02", "longButNotTooLong", "bob", "curvy", "bigHair"];

export function traitsToAvataaarsConfig(
  traits: VisualTraits,
  userId: string,
): AvataaarsConfig {
  const skinColor = SKIN_BY_TONE[traits.skinTone] ?? "edb98a";
  const hairColor = HAIR_BY_COLOUR[traits.hairColour] ?? "2c1b18";

  // Hair length biased by gender, then hashed within the bucket for variety.
  const hairPool = traits.gender === "female" ? LONG_HAIR : SHORT_HAIR;
  const top = pickFrom(hairPool, userId + ":top");

  const facialHair = traits.hasBeard
    ? pickFrom(["beardLight", "beardMedium", "beardMajestic"], userId + ":beard")
    : null;

  const accessories = traits.hasGlasses
    ? pickFrom(["round", "prescription01", "prescription02", "wayfarers"], userId + ":glasses")
    : null;

  let mouth: string;
  if (traits.expression === "warm-smile")      mouth = pickFrom(["smile", "twinkle", "default"], userId + ":mouth");
  else if (traits.expression === "serious")    mouth = pickFrom(["serious", "concerned"], userId + ":mouth");
  else                                         mouth = pickFrom(["default", "serious"], userId + ":mouth");

  const eyes     = pickFrom(VARIANTS.eyes     ?? ["default"], userId + ":eyes");
  const eyebrows = pickFrom(VARIANTS.eyebrows ?? ["default"], userId + ":eyebrows");
  const clothing = pickFrom(VARIANTS.clothing ?? ["shirtCrewNeck"], userId + ":clothing");

  return {
    top,
    eyes,
    eyebrows,
    mouth,
    nose: "default",
    facialHair,
    clothing,
    clothingGraphic: clothing === "graphicShirt"
      ? pickFrom(VARIANTS.clothingGraphic ?? ["bear"], userId + ":graphic")
      : null,
    accessories,
    skinColor,
    hairColor,
    facialHairColor:  hairColor,
    clothesColor:     pickFrom(PALETTES.clothes, userId + ":clothesColor"),
    accessoriesColor: "262e33",
    hatColor:         pickFrom(PALETTES.hat, userId + ":hatColor"),
    backgroundColor:  pickFrom(PALETTES.background, userId + ":bg"),
    shape:            "circle",
  };
}

// ─── Validation / clamping (for user-supplied PATCH configs) ───────────────────

function validVariant(category: string, value: string | null, allowNull: boolean): string | null {
  if (value === null || value === undefined) {
    return allowNull ? null : (VARIANTS[category]?.[0] ?? "default");
  }
  const list = VARIANTS[category] ?? [];
  if (list.includes(value)) return value;
  return allowNull ? null : (list[0] ?? "default");
}

function validColor(value: string | undefined, fallback: string, allowTransparent = false): string {
  if (allowTransparent && value === "transparent") return "transparent";
  if (!value) return fallback;
  const v = value.startsWith("#") ? value.slice(1) : value;
  return /^[0-9a-fA-F]{6}$/.test(v) ? v.toLowerCase() : fallback;
}

export function sanitizeConfig(input: Partial<AvataaarsConfig>): AvataaarsConfig {
  const clothing = validVariant("clothing", input.clothing ?? null, false) as string;
  return {
    top:             validVariant("top",        input.top ?? null,        true),
    eyes:            validVariant("eyes",        input.eyes ?? null,        false) as string,
    eyebrows:        validVariant("eyebrows",    input.eyebrows ?? null,    false) as string,
    mouth:           validVariant("mouth",       input.mouth ?? null,       false) as string,
    nose:            validVariant("nose",        input.nose ?? null,        false) as string,
    facialHair:      validVariant("facialHair",  input.facialHair ?? null,  true),
    clothing,
    clothingGraphic: clothing === "graphicShirt"
      ? validVariant("clothingGraphic", input.clothingGraphic ?? null, true)
      : null,
    accessories:     validVariant("accessories", input.accessories ?? null, true),
    skinColor:        validColor(input.skinColor,        "edb98a"),
    hairColor:        validColor(input.hairColor,        "2c1b18"),
    facialHairColor:  validColor(input.facialHairColor,  "2c1b18"),
    clothesColor:     validColor(input.clothesColor,     "65c9ff"),
    accessoriesColor: validColor(input.accessoriesColor, "262e33"),
    hatColor:         validColor(input.hatColor,         "262e33"),
    backgroundColor:  validColor(input.backgroundColor,  "b6e3f4", true),
    shape:            input.shape === "default" ? "default" : "circle",
  };
}

// ─── SVG → PNG rasterization ───────────────────────────────────────────────────

export async function rasterizeAvataaarsSVG(svgString: string, size = 512): Promise<Buffer> {
  const sharp = (await import("sharp")).default;
  return sharp(Buffer.from(svgString)).resize(size, size).png().toBuffer();
}

// ─── Full pipeline: traits → config → SVG ──────────────────────────────────────

export function generateAvataaarsFromTraits(
  traits: VisualTraits,
  userId: string,
): AvataaarsAvatarResult {
  const config    = traitsToAvataaarsConfig(traits, userId);
  const svgString = generateAvataaarsSVG(config);
  return { config, svgString, traits, userId };
}
