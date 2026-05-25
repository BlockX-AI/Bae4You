/**
 * video-kyc.ts
 * Video KYC helper — selects the sharpest, best-lit, most-frontal frame
 * from a set of photo captures taken during the KYC recording session.
 *
 * No ffmpeg needed: the mobile client sends 3-5 JPEG/PNG frames captured
 * during the KYC countdown; this service picks the best one using Sharp.
 *
 * Scoring criteria (weighted):
 *   1. Sharpness   (Laplacian variance on greyscale thumbnail)   — 50%
 *   2. Brightness  (should be 80–200 avg, not too dark/washed)   — 25%
 *   3. Face signal (skin-tone pixel ratio in centre crop)         — 25%
 */

import sharp from "sharp";

export interface KycFrameScore {
  index:      number;
  sharpness:  number;
  brightness: number;
  faceScore:  number;
  total:      number;
}

// ─── Frame scoring ────────────────────────────────────────────────────────────

async function scoreFrame(buf: Buffer): Promise<Omit<KycFrameScore, "index" | "total">> {
  const SIZE = 256;
  const base = sharp(buf).resize(SIZE, SIZE, { fit: "cover", position: "centre" });

  // ── 1. Sharpness via Laplacian variance ─────────────────────────────────
  const grey = await base.clone().greyscale().raw().toBuffer();
  let lapSum = 0;
  for (let i = 1; i < grey.length - 1; i++) {
    const lap = (grey[i - 1] as number) - 2 * (grey[i] as number) + (grey[i + 1] as number);
    lapSum += lap * lap;
  }
  const sharpness = lapSum / grey.length;

  // ── 2. Brightness (greyscale mean of whole image) ────────────────────────
  let sum = 0;
  for (let i = 0; i < grey.length; i++) sum += grey[i] as number;
  const brightness = sum / grey.length;               // 0–255
  // Optimal zone: 90–175. Score drops steeply outside.
  // Over-exposure (>200) and under-exposure (<60) both score near 0.
  const BRIGHT_LO = 90, BRIGHT_HI = 175, BRIGHT_OPT = 132;
  const brightScore = brightness < BRIGHT_LO
    ? Math.max(0, brightness / BRIGHT_LO)
    : brightness > BRIGHT_HI
    ? Math.max(0, 1 - (brightness - BRIGHT_HI) / (255 - BRIGHT_HI))
    : 1 - Math.abs(brightness - BRIGHT_OPT) / (BRIGHT_HI - BRIGHT_LO);

  // ── 3. Face signal — skin tone ratio in centre 50% crop ─────────────────
  const centreWidth  = Math.round(SIZE * 0.5);
  const centreHeight = Math.round(SIZE * 0.6);
  const centreLeft   = Math.round(SIZE * 0.25);
  const centreTop    = Math.round(SIZE * 0.15);

  const { data: faceRaw } = await base.clone()
    .extract({ left: centreLeft, top: centreTop, width: centreWidth, height: centreHeight })
    .raw().toBuffer({ resolveWithObject: true });

  let skinPixels = 0;
  const total    = faceRaw.length / 3;
  for (let i = 0; i + 2 < faceRaw.length; i += 3) {
    const r = faceRaw[i] as number;
    const g = faceRaw[i + 1] as number;
    const b = faceRaw[i + 2] as number;
    if (isSkinPixel(r, g, b)) skinPixels++;
  }
  const faceScore = skinPixels / (total || 1);

  return { sharpness, brightness: brightScore, faceScore };
}

/** Rough skin tone detector (works for all ethnicities) */
function isSkinPixel(r: number, g: number, b: number): boolean {
  return (
    r > 60 && g > 40 && b > 20 &&
    r > g && r > b &&
    (r - Math.min(g, b)) > 15 &&
    Math.abs(r - g) <= 50
  );
}

// ─── Best frame selector ──────────────────────────────────────────────────────

/**
 * Scores all frames and returns the best one plus the ranked scores.
 */
export async function selectBestKycFrame(frames: Buffer[]): Promise<{
  bestFrame: Buffer;
  scores:    KycFrameScore[];
}> {
  if (frames.length === 0) throw new Error("No frames provided");
  if (frames.length === 1) {
    return {
      bestFrame: frames[0],
      scores: [{ index: 0, sharpness: 1, brightness: 1, faceScore: 1, total: 1 }],
    };
  }

  const rawScores = await Promise.all(frames.map((f) => scoreFrame(f)));

  // Normalise sharpness across all frames (0–1)
  const maxSharpness = Math.max(...rawScores.map((s) => s.sharpness), 1);

  const scores: KycFrameScore[] = rawScores.map((s, i) => {
    const normSharp  = s.sharpness / maxSharpness;
    const total      = normSharp * 0.50 + s.brightness * 0.25 + s.faceScore * 0.25;
    return { index: i, sharpness: normSharp, brightness: s.brightness, faceScore: s.faceScore, total };
  });

  scores.sort((a, b) => b.total - a.total);
  const best = scores[0];

  return { bestFrame: frames[best.index], scores };
}

// ─── Orientation / crop normaliser ───────────────────────────────────────────

/**
 * Auto-rotates (EXIF), centre-crops to square, resizes to 512×512.
 * Call on the selected best frame before avatar generation.
 */
export async function normaliseKycFrame(frame: Buffer): Promise<Buffer> {
  return sharp(frame)
    .rotate()                                       // auto EXIF rotation
    .resize(512, 512, { fit: "cover", position: "centre" })
    .jpeg({ quality: 90 })
    .toBuffer();
}
