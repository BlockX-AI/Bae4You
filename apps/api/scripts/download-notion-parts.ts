/**
 * Downloads the CC0-licensed Notion Avatar SVG part files from
 * Mayandev/notion-avatar GitHub repo into apps/api/public/notion-avatar-parts/
 *
 * Run once: npx tsx scripts/download-notion-parts.ts
 *
 * The parts are licensed CC0 (public domain) — safe for commercial use.
 * Source: https://github.com/Mayandev/notion-avatar/tree/main/public/notion
 */

import fs   from "fs";
import path from "path";
import https from "https";

const BASE_URL = "https://raw.githubusercontent.com/Mayandev/notion-avatar/main/public/avatar/part";
const OUT_DIR  = path.resolve(__dirname, "../public/notion-avatar-parts");

// folder name → { singular file prefix, count }
// Actual repo structure: /public/avatar/part/{folder}/{singular}-{i}.svg
const PARTS: Record<string, { singular: string; count: number }> = {
  face:        { singular: "face",        count: 16 },
  nose:        { singular: "nose",        count: 13 },
  mouth:       { singular: "mouth",       count: 19 },
  eyes:        { singular: "eyes",        count: 13 },
  eyebrows:    { singular: "eyebrows",    count: 15 },
  beard:       { singular: "beard",       count: 16 },
  glasses:     { singular: "glasses",     count: 13 },
  accessories: { singular: "accessories", count: 14 },
  details:     { singular: "details",     count: 13 },
  hair:        { singular: "hair",        count: 58 },
};

function downloadFile(url: string, dest: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (fs.existsSync(dest)) { resolve(); return; }

    const file = fs.createWriteStream(dest);
    const req  = https.get(url, (res) => {
      if (res.statusCode === 302 || res.statusCode === 301) {
        file.close();
        fs.unlinkSync(dest);
        downloadFile(res.headers.location!, dest).then(resolve).catch(reject);
        return;
      }
      if (res.statusCode !== 200) {
        file.close();
        fs.unlinkSync(dest);
        reject(new Error(`HTTP ${res.statusCode} for ${url}`));
        return;
      }
      res.pipe(file);
      file.on("finish", () => { file.close(); resolve(); });
    });
    req.on("error", (err) => { fs.existsSync(dest) && fs.unlinkSync(dest); reject(err); });
  });
}

async function main() {
  let total   = 0;
  let skipped = 0;
  let failed  = 0;

  for (const [folder, { singular, count }] of Object.entries(PARTS)) {
    const dir = path.join(OUT_DIR, folder);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    for (let i = 0; i < count; i++) {
      const url  = `${BASE_URL}/${folder}/${singular}-${i}.svg`;
      const dest = path.join(dir, `${singular}-${i}.svg`);

      if (fs.existsSync(dest) && fs.statSync(dest).size > 0) {
        skipped++;
        continue;
      }

      try {
        await downloadFile(url, dest);
        process.stdout.write(`✓ ${folder}/${singular}-${i}.svg  \r`);
        total++;
      } catch (err) {
        console.warn(`\n⚠  Failed: ${folder}/${singular}-${i}.svg — ${(err as Error).message}`);
        failed++;
      }

      // Small delay to avoid rate limiting
      await new Promise(r => setTimeout(r, 50));
    }
  }

  console.log(`\n✅ Done! Downloaded ${total} parts, ${skipped} already existed, ${failed} failed.`);
  console.log(`📁 Output: ${OUT_DIR}`);
}

main().catch(console.error);
