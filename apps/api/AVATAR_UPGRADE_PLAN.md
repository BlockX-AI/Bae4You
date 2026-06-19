# Avatar System Upgrade — Implementation Plan

## Diagnosis Summary

| Problem | Current State | Impact |
|---------|--------------|--------|
| Identity destroyed | FLUX img2img @ `strength: 0.72` repaints 72% of image | Faces come out generic/same-y |
| Pixel-based trait extraction noisy | Sharp region sampling → wrong 30-40% of the time | Wrong traits → wrong prompt → wrong avatar |
| No face restoration | Raw diffusion output shipped to user | Mushy eyes, weird teeth, asymmetric features |
| Single-shot generation | 1 image generated and shipped | Unlucky bad generations reach users |
| No structure control | No ControlNet, no pose preservation | Pose/angle drift vs source photo |

---

## Target Architecture (3-layer)

```
User Photo
    ↓
[Layer 1: Identity Injection]
  InsightFace → face detection, alignment, ArcFace embedding
  PuLID-FLUX → identity-conditioned generation (all styles)
    ↓
[Layer 2: Structure Control]  (Phase 3+)
  MediaPipe 478 landmarks → accurate trait extraction
  ControlNet-Pose (optional) → preserve head angle
    ↓
[Layer 3: Post-Processing]
  CodeFormer (fidelity=0.7) → face artifact restoration
  Real-ESRGAN → 2x upscale for hero card compositing
  ArcFace best-of-N scoring → ship highest-similarity candidate
    ↓
IPFS Upload → user gets avatar
```

---

## Phase 1: Quick Wins (3-5 days)

**Goal**: Visible quality improvement with minimal architectural change.

### 1A. Add CodeFormer/GFPGAN Post-Processing

**What**: After any avatar generation, run face restoration before IPFS upload.

**How**: Call Replicate's `sczhou/codeformer` model (or `tencentarc/gfpgan`).

**Cost**: ~$0.001/image on Replicate.

**Implementation**:
```typescript
// New function in ai-avatar.ts
export async function restoreFace(
  imageBuffer: Buffer,
  replicateToken: string,
  fidelityWeight?: number,  // 0.0–1.0, default 0.7
): Promise<Buffer> {
  // Call Replicate: sczhou/codeformer
  // Input: base64 image
  // Parameters: fidelity_weight, upscale: 1 (no upscale, just restore)
  // Return: restored image buffer
}
```

**Where to call**: Insert right before `uploadToIPFS()` in:
- `POST /users/me/avatar/kyc-frames` (after `aiBuffer` is generated)
- `POST /users/me/avatar/edit` (after `aiBuffer` is generated)
- `generateAiAvatar()` return path

**Files to modify**:
- `apps/api/src/services/ai-avatar.ts` — add `restoreFace()` function
- `apps/api/src/routes/users.ts` — call `restoreFace()` before IPFS upload

---

### 1B. Add Real-ESRGAN Upscale for Hero Cards

**What**: Upscale avatar from 1024→2048 before compositing onto 864×1216 card.

**How**: Replicate `xinntao/realesrgan` or `nightmareai/real-esrgan`.

**Cost**: ~$0.002/image.

**Implementation**:
```typescript
export async function upscaleImage(
  imageBuffer: Buffer,
  replicateToken: string,
  scale?: number,  // 2 or 4, default 2
): Promise<Buffer> {
  // Call Replicate: nightmareai/real-esrgan
  // Input: base64 image, scale factor
  // Return: upscaled buffer
}
```

**Where to call**: In `hero-card.service.ts` → `generateHeroCard()`, upscale `avatarBuffer` before `scaleAvatarForCircle()`.

---

### 1C. Replace Pixel-Based Trait Extraction with DeepFace (Python Sidecar)

**What**: Replace `extractVisualTraits()` pixel-sampling with real ML models.

**How**: Lightweight Python FastAPI sidecar using `deepface` + `mediapipe`.

**Output**: Same `VisualTraits` JSON shape — drop-in replacement.

**Sidecar spec**:
```python
# apps/api/sidecar/face_analysis.py
# FastAPI server on port 5050
# POST /analyze  body: { image_base64, mime_type }
# Response: { gender, genderConf, skinTone, hairColour, ageClass,
#             hasGlasses, hasBeard, expression, ethnicRegion, ... }
```

**Models used**:
- `deepface.analyze()` → age, gender, race, emotion (replaces all pixel heuristics)
- `mediapipe.FaceMesh` → 478 landmarks → glasses detection, expression, face alignment
- Skin tone from face-crop RGB (keep existing logic, but on properly-aligned face)

**Node-side change**:
```typescript
// Replace extractVisualTraits() body with HTTP call:
export async function extractVisualTraits(photoBuffer, gender, genderConf) {
  const resp = await fetch("http://localhost:5050/analyze", {
    method: "POST",
    body: JSON.stringify({ image_base64: photoBuffer.toString("base64"), mime_type: "image/jpeg" }),
    headers: { "Content-Type": "application/json" },
  });
  return resp.json() as VisualTraits;
}
```

**Deployment**: Run sidecar as a separate Railway service (Python, ~256MB RAM).

**Fallback**: Keep existing pixel-based extraction as fallback if sidecar is unreachable.

---

## Phase 2: Primary Generation Upgrade (1-2 weeks)

**Goal**: Replace default generation with identity-preserving PuLID-FLUX.

### 2A. Add `generateViaPulidFlux()` Provider

**What**: PuLID-FLUX as default generation for ALL styles (not just noir-glamour).

**Where**: Available on fal.ai and Replicate.

**Implementation**:
```typescript
export interface PulidFluxParams {
  id_weight?:       number;   // 0.8–1.0 (identity strength)
  start_step?:      number;   // 0–2 (early injection = stronger identity)
  true_cfg?:        number;   // 1.0–1.5 (prompt adherence)
  num_steps?:       number;   // 20–25
  guidance_scale?:  number;   // 3.5–5.0
  width?:           number;   // 1024
  height?:          number;   // 1024
}

export async function generateViaPulidFlux(
  photoBuffer:    Buffer,
  mimeType:       string,
  prompt:         string,
  negativePrompt: string,
  falApiKey:      string,
  params?:        PulidFluxParams,
): Promise<Buffer> {
  fal.config({ credentials: falApiKey });
  
  const result = await fal.subscribe("fal-ai/pulid", {
    input: {
      reference_images: [{
        image_url: `data:${mimeType};base64,${photoBuffer.toString("base64")}`,
      }],
      prompt,
      negative_prompt:  negativePrompt,
      id_weight:        params?.id_weight      ?? 0.9,
      start_step:       params?.start_step     ?? 1,
      true_cfg:         params?.true_cfg       ?? 1.2,
      num_inference_steps: params?.num_steps   ?? 24,
      guidance_scale:   params?.guidance_scale  ?? 4.0,
      num_images:       1,
      image_size:       "square_hd",
    },
    logs: false,
  });
  
  const output = result.data as { images?: Array<{ url: string }> };
  if (!output?.images?.length) throw new Error("PuLID-FLUX returned no images");
  
  const res = await fetch(output.images[0].url);
  return Buffer.from(await res.arrayBuffer());
}
```

**Provider Priority (new order)**:
1. PuLID-FLUX (fal.ai) — default for ALL styles
2. InstantID (fal.ai) — fallback for face-preserving styles
3. Cloudflare SDXL — free fallback
4. HuggingFace FLUX — free fallback

### 2B. Try InfiniteYou (ByteDance) as Alternative

**What**: ByteDance's InfU beats PuLID-FLUX in user studies (72.8% preference).

**Why**: Better text-image alignment, avoids "copy-paste face" problem.

**Available on**: Replicate (`bytedance/infiniteyou-flux`).

**Strategy**: A/B test PuLID vs InfU for 100 generations, measure ArcFace similarity + user preference. Use winner as primary.

---

## Phase 3: Best-of-N Quality Scoring (1 week)

**Goal**: Never ship a bad generation again.

### 3A. Add ArcFace Similarity Scoring

**What**: Generate N candidates, compute face-similarity to source, ship highest scorer.

**How**: Use InsightFace `buffalo_l` ArcFace model via the Python sidecar.

**Implementation**:

```python
# In face_analysis.py sidecar
# POST /similarity  body: { source_base64, candidates: [base64, ...] }
# Response: { scores: [0.85, 0.72, 0.91, 0.88], best_index: 2 }
```

```typescript
// Node-side wrapper
export async function pickBestCandidate(
  sourceBuffer: Buffer,
  candidates: Buffer[],
): Promise<{ best: Buffer; score: number; index: number }> {
  const resp = await fetch("http://localhost:5050/similarity", {
    method: "POST",
    body: JSON.stringify({
      source_base64: sourceBuffer.toString("base64"),
      candidates: candidates.map(b => b.toString("base64")),
    }),
    headers: { "Content-Type": "application/json" },
  });
  const { scores, best_index } = await resp.json();
  return { best: candidates[best_index], score: scores[best_index], index: best_index };
}
```

### 3B. Best-of-N Generation Flow

**Free tier**: best-of-1 (current behavior)  
**KYC avatar**: best-of-4 (higher quality matters for identity card)  
**Paid users**: best-of-4 always

**Cost**: 4× inference cost per generation (~$0.12-$0.20 for KYC)

**Implementation change** in `generateAiAvatar()`:
```typescript
const N = isKycAvatar ? 4 : 1;
const candidates = await Promise.all(
  Array.from({ length: N }, () => generateViaPulidFlux(photoBuffer, mimeType, prompt, neg, falKey))
);
if (N > 1) {
  const { best } = await pickBestCandidate(photoBuffer, candidates);
  buffer = best;
} else {
  buffer = candidates[0];
}
```

---

## Phase 4: Premium Path (Future — when revenue allows)

### 4A. FaceChain LoRA Training

**What**: Train a tiny personal LoRA on user's 3-5 KYC frames for max identity fidelity.

**How**: FaceChain trains in 5-10 min on 1 GPU. Cache LoRA weights per user.

**When**: Paid tier only, or for "creator" users.

**Cost**: ~$0.30-$0.50 per training run (Replicate A100).

### 4B. Multi-Photo Identity (PhotoMaker v2)

**What**: Use ALL 3-5 KYC frames as identity references instead of discarding 4.

**Why**: Stronger identity embedding from multiple angles/lighting.

**When**: Phase 4 — requires PhotoMaker endpoint (Replicate available).

---

## Implementation Order & Timeline

| Phase | Task | Time | Cost/img | Quality Gain |
|-------|------|------|----------|-------------|
| 1A | CodeFormer post-processing | 1 day | +$0.001 | ★★★ (fixes artifacts) |
| 1B | Real-ESRGAN for hero cards | 0.5 day | +$0.002 | ★★ (sharper cards) |
| 1C | Python sidecar (DeepFace) | 2-3 days | $0 (self-host) | ★★★ (accurate traits) |
| 2A | PuLID-FLUX provider | 2-3 days | ~$0.03/img | ★★★★★ (face preservation) |
| 2B | InfiniteYou A/B test | 1-2 days | ~$0.03/img | ★★★★★ (if wins) |
| 3A | ArcFace scoring sidecar | 1 day | $0 (self-host) | ★★★ (consistency) |
| 3B | Best-of-4 for KYC | 0.5 day | 4× generation | ★★★★ (no bad outputs) |
| 4A | FaceChain LoRA | 3-5 days | $0.50/train | ★★★★★ (premium only) |

**Total estimated timeline**: 2-3 weeks for Phases 1-3.

---

## Environment Variables to Add

| Variable | Purpose | When |
|----------|---------|------|
| `FACE_SIDECAR_URL` | Python sidecar base URL (default: `http://localhost:5050`) | Phase 1C |
| `AVATAR_RESTORE_ENABLED` | Enable CodeFormer post-processing (default: `true`) | Phase 1A |
| `AVATAR_UPSCALE_ENABLED` | Enable Real-ESRGAN for hero cards (default: `true`) | Phase 1B |
| `PULID_ENABLED` | Use PuLID-FLUX as primary (default: `false` until tested) | Phase 2A |
| `AVATAR_BEST_OF_N` | Number of candidates for KYC (default: `1`) | Phase 3B |

---

## File Changes Map

### Phase 1A (CodeFormer)
- `apps/api/src/services/ai-avatar.ts` — add `restoreFace()` export
- `apps/api/src/routes/users.ts` — call `restoreFace()` before IPFS in KYC + edit routes
- `apps/api/src/config.ts` — add `AVATAR_RESTORE_ENABLED` env var

### Phase 1B (Real-ESRGAN)
- `apps/api/src/services/ai-avatar.ts` — add `upscaleImage()` export
- `apps/api/src/services/hero-card.service.ts` — call `upscaleImage()` on avatar before compositing
- `apps/api/src/config.ts` — add `AVATAR_UPSCALE_ENABLED` env var

### Phase 1C (Python Sidecar)
- NEW: `apps/api/sidecar/face_analysis.py` — FastAPI server
- NEW: `apps/api/sidecar/requirements.txt` — deepface, mediapipe, fastapi, uvicorn
- NEW: `apps/api/sidecar/Dockerfile` — Python 3.11 + ONNX runtime
- `apps/api/src/services/ai-avatar.ts` — refactor `extractVisualTraits()` to call sidecar
- `apps/api/src/config.ts` — add `FACE_SIDECAR_URL` env var

### Phase 2A (PuLID-FLUX)
- `apps/api/src/services/ai-avatar.ts` — add `generateViaPulidFlux()`, update priority chain
- `apps/api/src/routes/users.ts` — use PuLID as default in KYC + edit routes
- `apps/api/src/config.ts` — add `PULID_ENABLED` env var

### Phase 3 (Best-of-N)
- `apps/api/sidecar/face_analysis.py` — add `/similarity` endpoint
- `apps/api/src/services/ai-avatar.ts` — add `pickBestCandidate()`, wrap generation in N-loop
- `apps/api/src/config.ts` — add `AVATAR_BEST_OF_N` env var

---

## Cost Projection (per avatar generation)

| Scenario | Current | After Phase 1 | After Phase 2 | After Phase 3 |
|----------|---------|---------------|---------------|---------------|
| Free user | $0.03 (fal) | $0.031 | $0.031 | $0.031 (best-of-1) |
| KYC avatar | $0.03 | $0.031 | $0.031 | $0.124 (best-of-4) |
| Paid user | $0.03 | $0.031 | $0.031 | $0.124 (best-of-4) |
| Hero card | $0 | $0.002 | $0.002 | $0.002 |

Monthly cost at 1000 users/month doing KYC: **~$124** (up from ~$30).

---

## Rollback Strategy

Each phase is additive and gated by env vars:
- `AVATAR_RESTORE_ENABLED=false` → skip CodeFormer
- `PULID_ENABLED=false` → use existing provider chain
- `AVATAR_BEST_OF_N=1` → single generation (current behavior)
- `FACE_SIDECAR_URL` not set → use pixel-based extraction (current fallback)

No existing functionality breaks. All changes are backwards-compatible.

---

## What to Do Right Now

1. **Start Phase 1A** — Add `restoreFace()` using Replicate CodeFormer. This is a 1-function addition + 2 call sites. Visible improvement within hours.
2. **Start Phase 2A in parallel** — Add `generateViaPulidFlux()` using fal.ai. Test with your own photo. Compare output vs current.
3. **Defer Phase 1C** (sidecar) until PuLID is working — PuLID makes trait extraction less critical since the face is preserved from the photo directly.
