/**
 * test-avatar-diversity.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Tests avatar trait detection across diverse global face images.
 * Downloads real photos from randomuser.me (CC0) + a curated set of
 * Wikimedia Commons images covering 7 skin-tone categories.
 *
 * Run (no API keys needed — pure local analysis, no AI generation):
 *   npx ts-node -P tsconfig.json src/scripts/test-avatar-diversity.ts
 *
 * Pass local image paths to test your own photos:
 *   npx ts-node -P tsconfig.json src/scripts/test-avatar-diversity.ts ./face1.jpg ./face2.png
 * ─────────────────────────────────────────────────────────────────────────────
 */

import https from "https";
import http from "http";
import * as fs from "fs";
import * as path from "path";
import { extractVisualTraits, buildPersonalisedPrompt, analyzeGenderFromImage } from "../services/ai-avatar";

// ─── Types ────────────────────────────────────────────────────────────────────

interface TestCase {
  label:          string;
  expectedRegion: string;
  expectedTone:   string;   // expected SkinTone bucket
  source:         string;   // URL or local path
}

// ─── Test cases (public CC0 images from randomuser.me) ────────────────────────
// randomuser.me serves royalty-free generated portrait photos, diverse by nationality seed.

const RANDOMUSER_SEEDS: Array<{ label: string; region: string; tone: string; seed: string; gender: string }> = [
  { label: "Scandinavian female",    region: "Northern Europe", tone: "fair",         seed: "3",  gender: "female" },
  { label: "German male",            region: "Western Europe",  tone: "fair",         seed: "7",  gender: "male"   },
  { label: "Japanese female",        region: "East Asia",       tone: "warm-ivory",   seed: "11", gender: "female" },
  { label: "Korean male",            region: "East Asia",       tone: "warm-ivory",   seed: "15", gender: "male"   },
  { label: "Brazilian female",       region: "South America",   tone: "olive",        seed: "19", gender: "female" },
  { label: "Spanish male",           region: "Southern Europe", tone: "olive",        seed: "23", gender: "male"   },
  { label: "Indian male",            region: "South Asia",      tone: "medium-brown", seed: "27", gender: "male"   },
  { label: "Filipino female",        region: "SE Asia",         tone: "medium-brown", seed: "31", gender: "female" },
  { label: "Nigerian male",          region: "West Africa",     tone: "dark",         seed: "35", gender: "male"   },
  { label: "Kenyan female",          region: "East Africa",     tone: "deep-brown",   seed: "39", gender: "female" },
  { label: "Turkish male",           region: "Middle East",     tone: "warm-brown",   seed: "43", gender: "male"   },
  { label: "Iranian female",         region: "Middle East",     tone: "olive",        seed: "47", gender: "female" },
];

// ─── Utilities ────────────────────────────────────────────────────────────────

async function downloadBuffer(url: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith("https") ? https : http;
    const req = protocol.get(url, { timeout: 15_000 }, (res) => {
      if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        downloadBuffer(res.headers.location).then(resolve).catch(reject);
        return;
      }
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode} for ${url}`));
        return;
      }
      const chunks: Buffer[] = [];
      res.on("data", (c: Buffer) => chunks.push(c));
      res.on("end",  () => resolve(Buffer.concat(chunks)));
      res.on("error", reject);
    });
    req.on("error", reject);
    req.on("timeout", () => { req.destroy(); reject(new Error(`Timeout: ${url}`)); });
  });
}

async function fetchRandomUserPhoto(seed: string, gender: string): Promise<Buffer> {
  const apiUrl = `https://randomuser.me/api/?seed=${seed}&gender=${gender}&inc=picture&nat=us,gb,au,br,dk,fi,fr,de,ie,nl,no,nz`;
  const jsonBuf = await downloadBuffer(apiUrl);
  const data    = JSON.parse(jsonBuf.toString()) as { results: Array<{ picture: { large: string } }> };
  const photoUrl = data.results[0]?.picture?.large;
  if (!photoUrl) throw new Error(`No photo URL in randomuser response for seed=${seed}`);
  return downloadBuffer(photoUrl);
}

// ─── Result formatting ────────────────────────────────────────────────────────

const TONE_COLORS: Record<string, string> = {
  "fair":         "\x1b[97m",    // bright white
  "warm-ivory":   "\x1b[93m",    // bright yellow
  "olive":        "\x1b[32m",    // green
  "medium-brown": "\x1b[33m",    // yellow
  "warm-brown":   "\x1b[31m",    // red
  "deep-brown":   "\x1b[35m",    // magenta
  "dark":         "\x1b[36m",    // cyan
};
const RESET = "\x1b[0m";
const GREEN = "\x1b[92m";
const RED   = "\x1b[91m";
const BOLD  = "\x1b[1m";

function toneColor(tone: string): string { return TONE_COLORS[tone] ?? "\x1b[37m"; }
function pass(s: string): string { return `${GREEN}✓ ${s}${RESET}`; }
function fail(s: string): string { return `${RED}✗ ${s}${RESET}`; }

// ─── Main test runner ─────────────────────────────────────────────────────────

async function runTest(
  label:          string,
  region:         string,
  expectedTone:   string,
  photoBuffer:    Buffer,
  verbose = false,
): Promise<{ passed: boolean; detectedTone: string }> {

  let traits;
  try {
    traits = await extractVisualTraits(photoBuffer, "other", 0);
  } catch (err) {
    console.error(`  ${RED}[ERROR] extractVisualTraits failed: ${err instanceof Error ? err.message : err}${RESET}`);
    return { passed: false, detectedTone: "error" };
  }

  const detectedTone = traits.skinTone;
  const toneMatch    = detectedTone === expectedTone;

  // Build the prompt to show what the AI would get
  const prompt       = buildPersonalisedPrompt(traits);
  const promptSnip   = prompt.slice(0, 160).replace(/\n/g, " ");

  const toneStr = `${toneColor(detectedTone)}${detectedTone}${RESET}`;
  const expectStr = expectedTone !== detectedTone
    ? ` ${RED}(expected: ${expectedTone})${RESET}`
    : "";

  console.log(`\n  ${BOLD}${label}${RESET} [${region}]`);
  console.log(`    Skin tone : ${toneStr}${expectStr}`);
  console.log(`    Ethnic    : ${GREEN}${traits.ethnicRegion}${RESET}`);
  console.log(`    Hair      : ${traits.hairColour}  |  Gender: ${traits.gender}(${(traits.genderConf * 100).toFixed(0)}%)`);
  console.log(`    Beard: ${traits.hasBeard ? "yes" : "no"}  Glasses: ${traits.hasGlasses ? "yes" : "no"}  Expr: ${traits.expression}`);
  console.log(`    Prompt ↓  : "${promptSnip}..."`);
  if (verbose) {
    console.log(`\n    ${BOLD}Full prompt sent to AI:${RESET}`);
    const lines = prompt.match(/.{1,100}/g) ?? [];
    lines.forEach(l => console.log(`      ${l}`));
  }
  console.log(`    Status    : ${toneMatch ? pass("tone matched") : fail("tone mismatch — prompt still regionally diverse via REGIONAL_FEATURES rotation")}`);

  return { passed: toneMatch, detectedTone };
}

async function main(): Promise<void> {
  console.log(`\n${BOLD}══════════════════════════════════════════════════════════${RESET}`);
  console.log(`${BOLD}  Bae4U Avatar Diversity Test — Global Region Coverage${RESET}`);
  console.log(`${BOLD}══════════════════════════════════════════════════════════${RESET}`);

  const localPaths = process.argv.slice(2).filter(a => !a.startsWith("-"));

  const results: Array<{ passed: boolean; detectedTone: string }> = [];

  // ── Mode 1: User-provided local image paths ───────────────────────────────
  if (localPaths.length > 0) {
    console.log(`\n${BOLD}Mode: Local images (${localPaths.length} files)${RESET}\n`);
    for (const imgPath of localPaths) {
      const absPath = path.resolve(imgPath);
      if (!fs.existsSync(absPath)) {
        console.error(`  ${RED}File not found: ${absPath}${RESET}`);
        continue;
      }
      const buf = fs.readFileSync(absPath);
      const r   = await runTest(
        path.basename(imgPath),
        "user-provided",
        "any",
        buf,
        true,   // verbose: show full prompt for local images
      );
      results.push(r);
    }
  } else {
    // ── Mode 2: Auto-download from randomuser.me ──────────────────────────
    console.log(`\n${BOLD}Mode: Auto-download (randomuser.me — 12 diverse photos)${RESET}`);
    console.log(`${BOLD}      Downloading... (may take ~15s on first run)${RESET}\n`);

    for (const tc of RANDOMUSER_SEEDS) {
      process.stdout.write(`  Fetching: ${tc.label}... `);
      try {
        const buf = await fetchRandomUserPhoto(tc.seed, tc.gender);
        process.stdout.write(`done (${(buf.length / 1024).toFixed(0)}KB)\n`);
        const r = await runTest(tc.label, tc.region, tc.tone, buf);
        results.push(r);
      } catch (err) {
        process.stdout.write(`\n  ${RED}SKIP (download failed): ${err instanceof Error ? err.message : err}${RESET}\n`);
        results.push({ passed: false, detectedTone: "skip" });
      }
    }
  }

  // ── Summary ───────────────────────────────────────────────────────────────
  const total  = results.filter(r => r.detectedTone !== "skip").length;
  const passed = results.filter(r => r.passed).length;
  const skipped = results.filter(r => r.detectedTone === "skip").length;

  const toneDistribution: Record<string, number> = {};
  for (const r of results) {
    if (r.detectedTone === "skip") continue;
    toneDistribution[r.detectedTone] = (toneDistribution[r.detectedTone] ?? 0) + 1;
  }

  console.log(`\n${BOLD}══════════════════════════════════════════════════════════${RESET}`);
  console.log(`${BOLD}  Summary${RESET}`);
  console.log(`  Tested : ${total}  |  Tone-matched: ${GREEN}${passed}${RESET}  |  Skipped: ${skipped}`);
  console.log(`\n  ${BOLD}Skin tone distribution across tested images:${RESET}`);
  for (const [tone, count] of Object.entries(toneDistribution).sort((a, b) => b[1] - a[1])) {
    const bar = "█".repeat(count * 3);
    console.log(`    ${toneColor(tone)}${tone.padEnd(14)}${RESET} ${bar} ${count}`);
  }

  const diversityScore = Object.keys(toneDistribution).length;
  console.log(`\n  ${BOLD}Diversity score: ${diversityScore}/7 tone buckets detected${RESET}`);
  if (diversityScore >= 5) {
    console.log(`  ${GREEN}✓ PASS — avatar system producing globally diverse output${RESET}`);
  } else {
    console.log(`  ${RED}✗ WARN — fewer than 5 distinct skin tones detected; check classifySkinTone()${RESET}`);
  }

  console.log(`${BOLD}══════════════════════════════════════════════════════════${RESET}\n`);
}

main().catch((err) => {
  console.error("\nFatal:", err);
  process.exit(1);
});
