/**
 * Local hero card test — no IPFS, no auth
 * Run: node test-hero-card.mjs
 * Output: /tmp/card-common.png, /tmp/card-rare.png, /tmp/card-epic.png, /tmp/card-legendary.png
 */

import sharp from "sharp";
import path from "path";
import { writeFileSync, readFileSync, existsSync, mkdirSync } from "fs";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const CARD_W = 864;
const CARD_H = 1216;
const FRAME_DIR = path.join(__dirname, "public/images/herocard");

// ── Layout config (same as hero-card.service.ts) ─────────────────────────────

const LAYOUTS = {
  Common: {
    avatar:   { cx: 432, cy: 430, r: 235 },
    bgColor:  "#0d0d1a",
    name:     { x: 432, y: 845, size: 38, color: "#ffffff", anchor: "middle" },
    city:     { x: 432, y: 888, size: 18, color: "#94a3b8", anchor: "middle" },
    stats:    "single",
    statsY:   940,
    statsColor: "#ffffff",
    statsBg:  "#1a1a3e",
    showStats: ["vibe"],
    badgesY:  1055,
    badgesBg: "#2a2a5e",
    badgesTextColor: "#ffffff",
    align:    "center",
  },
  Rare: {
    avatar:   { cx: 432, cy: 460, r: 265 },
    bgColor:  "#0a0814",
    name:     { x: 432, y: 845, size: 38, color: "#c084fc", anchor: "middle" },
    city:     { x: 432, y: 888, size: 18, color: "#a855f7", anchor: "middle" },
    stats:    "double-row",
    statsY:   930,
    statsColor: "#c084fc",
    statsBg:  "#1a0a3e",
    showStats: ["vibe", "rizz"],
    badgesY:  1055,
    badgesBg: "#3b1278",
    badgesTextColor: "#c084fc",
    align:    "center",
  },
  Epic: {
    avatar:   { cx: 432, cy: 430, r: 235 },
    bgColor:  "#080608",
    name:     { x: 432, y: 845, size: 42, color: "#ffd700", anchor: "middle" },
    city:     { x: 432, y: 892, size: 18, color: "#c9a227", anchor: "middle" },
    stats:    "double-row",
    statsY:   930,
    statsColor: "#ffd700",
    statsBg:  "#1a0e00",
    showStats: ["vibe", "rizz", "drip"],
    badgesY:  1055,
    badgesBg: "#2a1800",
    badgesTextColor: "#ffd700",
    align:    "center",
  },
  Legendary: {
    avatar:   { cx: 432, cy: 455, r: 235 },
    bgColor:  "#000000",
    name:     { x: 432, y: 845, size: 46, color: "#ffd700", anchor: "middle" },
    city:     { x: 432, y: 895, size: 20, color: "#c9a227", anchor: "middle" },
    stats:    "grid-2x2",
    statsY:   930,
    statsColor: "#ffd700",
    statsBg:  "#0a0800",
    showStats: ["vibe", "rizz", "drip", "aura"],
    badgesY:  1055,
    badgesBg: "#0a0800",
    badgesTextColor: "#ffd700",
    align:    "center",
  },
};

const COVER_ZONES = {
  Common:    [{ top: 790, height: 320, left: 60, width: 744 }],
  Rare:      [{ top: 790, height: 320, left: 60, width: 744 }],
  Epic:      [{ top: 790, height: 320, left: 60, width: 744 }],
  Legendary: [{ top: 790, height: 320, left: 60, width: 744 }],
};

// ── Helpers ───────────────────────────────────────────────────────────────────

async function cropCircle(avatarBuf, r) {
  const d = r * 2;
  const svgMask = Buffer.from(
    `<svg width="${d}" height="${d}"><circle cx="${r}" cy="${r}" r="${r}" fill="white"/></svg>`
  );
  return sharp(avatarBuf)
    .resize(d, d, { fit: "cover", position: "top" })
    .composite([{ input: svgMask, blend: "dest-in" }])
    .png()
    .toBuffer();
}

function statBlocks(x, y, label, value, color, bgColor) {
  const blocks = 8;
  const filled  = Math.round((value / 100) * blocks);
  const bW = 22, bH = 18, bGap = 5;
  const labelW = 90;
  const barsX  = x + labelW;
  const scoreX = barsX + blocks * (bW + bGap) + 8;
  let rects = "";
  for (let i = 0; i < blocks; i++) {
    const bx = barsX + i * (bW + bGap);
    rects += `<rect x="${bx}" y="${y - 14}" width="${bW}" height="${bH}" rx="4"
      fill="${i < filled ? color : bgColor}" opacity="${i < filled ? 1 : 0.35}"/>`;
  }
  return `
    <text x="${x}" y="${y}" font-size="22" font-weight="700" fill="${color}"
      font-family="Arial Black, Arial" letter-spacing="1">${label}</text>
    ${rects}
    <text x="${scoreX}" y="${y}" font-size="22" font-weight="700" fill="${color}"
      font-family="Arial Black, Arial">${value}</text>`;
}

async function solidRect(w, h, hex) {
  const r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16);
  return sharp({ create: { width: w, height: h, channels: 4, background: { r, g, b, alpha: 1 } } }).png().toBuffer();
}

function buildOverlay(input, layout) {
  const { name, city, age, cardNumber, vibe, rizz = 0, drip = 0, aura = 0, badges = [], tier } = input;
  const L = layout;

  const coverSVG = "";

  const cardNumSVG = `<text x="40" y="80" font-size="28" font-weight="700" fill="${L.name.color}"
    font-family="Arial Black, Arial" text-anchor="start">#${String(cardNumber).padStart(4, "0")}</text>`;

  const nameSVG = `<text x="${L.name.x}" y="${L.name.y}" font-size="${L.name.size}" font-weight="900"
    fill="${L.name.color}" font-family="Arial Black, Arial" text-anchor="${L.name.anchor}"
    letter-spacing="2">${name.toUpperCase()}</text>`;

  const citySVG = `<text x="${L.city.x}" y="${L.city.y}" font-size="${L.city.size}"
    fill="${L.city.color}" font-family="Arial, sans-serif" text-anchor="${L.city.anchor}"
    letter-spacing="1">${city.toUpperCase()} • AGE ${age}</text>`;

  const sv = { vibe, rizz, drip, aura };
  const labels = { vibe: "VIBE", rizz: "RIZZ", drip: "DRIP", aura: "AURA" };
  let statsSVG = "";

  if (L.stats === "single") {
    statsSVG = statBlocks(432 - 150, L.statsY, "VIBE", vibe, L.statsColor, L.statsBg);
  } else if (L.stats === "double-row") {
    const show = L.showStats;
    statsSVG  = statBlocks(40,  L.statsY,      labels[show[0]], sv[show[0]] ?? 0, L.statsColor, L.statsBg);
    statsSVG += statBlocks(450, L.statsY,      labels[show[1]], sv[show[1]] ?? 0, L.statsColor, L.statsBg);
    if (show[2]) statsSVG += statBlocks(40, L.statsY + 50, labels[show[2]], sv[show[2]] ?? 0, L.statsColor, L.statsBg);
  } else {
    statsSVG  = statBlocks(40,  L.statsY,      "VIBE", vibe, L.statsColor, L.statsBg);
    statsSVG += statBlocks(450, L.statsY,      "RIZZ", rizz, L.statsColor, L.statsBg);
    statsSVG += statBlocks(40,  L.statsY + 55, "DRIP", drip, L.statsColor, L.statsBg);
    statsSVG += statBlocks(450, L.statsY + 55, "AURA", aura, L.statsColor, L.statsBg);
  }

  let badgesSVG = "";
  if (badges.length > 0) {
    let bx = L.align === "center" ? 432 - (badges.length * 160) / 2 : 55;
    for (const badge of badges) {
      const bw = badge.length * 12 + 40;
      badgesSVG += `
        <rect x="${bx}" y="${L.badgesY - 6}" width="${bw}" height="38" rx="19"
          fill="${L.badgesBg}" opacity="0.9"/>
        <text x="${bx + bw / 2}" y="${L.badgesY + 18}" font-size="18" font-weight="700"
          fill="${L.badgesTextColor}" font-family="Arial, sans-serif" text-anchor="middle">${badge}</text>`;
      bx += bw + 16;
    }
  }

  return Buffer.from(`<svg width="${CARD_W}" height="${CARD_H}" xmlns="http://www.w3.org/2000/svg">
    ${coverSVG}${cardNumSVG}${nameSVG}${citySVG}${statsSVG}${badgesSVG}
  </svg>`);
}

async function generateCard(avatarBuf, input) {
  const layout = LAYOUTS[input.tier];
  const L = layout;
  const frameBuf   = await sharp(path.join(FRAME_DIR, `${input.tier.toLowerCase()}.png`)).toBuffer();
  const circleBuf  = await cropCircle(avatarBuf, L.avatar.r);
  const svgOverlay = buildOverlay(input, layout);

  const coverPatches = await Promise.all(
    COVER_ZONES[input.tier].map(async ({ top, height, left = 60, width = 744 }) => ({
      input: await solidRect(width, height, L.bgColor),
      top,
      left,
    }))
  );

  return sharp(frameBuf).composite([
    ...coverPatches,
    { input: circleBuf,  top: L.avatar.cy - L.avatar.r, left: L.avatar.cx - L.avatar.r },
    { input: svgOverlay, top: 0, left: 0 },
  ]).png().toBuffer();
}

// ── Run test ──────────────────────────────────────────────────────────────────

const OUTPUT_DIR = path.join(__dirname, "public/images/herocard/generated");

// Avatar image path — update this to your avatar image
const AVATAR_PATH = process.argv[2] || "/tmp/test-avatar.png";

console.log("Loading avatar from:", AVATAR_PATH);
const avatarBuf = readFileSync(AVATAR_PATH);

const user = {
  name: "PRAKHAR",
  city: "MUMBAI",
  age: 21,
  cardNumber: 42,
  vibe: 97, rizz: 94, drip: 90, aura: 87,
  badges: ["OG MEMBER", "TOP 1%"],
};

console.log("Generating all 4 tiers...");

// Ensure output directory exists
if (!existsSync(OUTPUT_DIR)) {
  mkdirSync(OUTPUT_DIR, { recursive: true });
}

for (const tier of ["Common", "Rare", "Epic", "Legendary"]) {
  const vibeMap = { Common: 55, Rare: 72, Epic: 88, Legendary: 97 };
  const buf = await generateCard(avatarBuf, { ...user, tier, vibe: vibeMap[tier] });
  const outPath = path.join(OUTPUT_DIR, `card-${tier.toLowerCase()}.png`);
  writeFileSync(outPath, buf);
  console.log(`✅ ${tier} → ${outPath}`);
}

console.log(`\nDone! Open ${OUTPUT_DIR} to view all 4 cards.`);
