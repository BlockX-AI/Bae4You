# Bae4U Avatar System — Complete Documentation

## Overview

The Bae4U avatar system is a multi-stage pipeline that converts user photos into:
1. **KYC Avatar** — A comic-style portrait used for profile verification
2. **Hero Card** — A tiered trading card (Common/Rare/Epic/Legendary) displaying user stats

The system uses AI image generation (Cloudflare, HuggingFace, fal.ai) combined with pixel-level visual analysis to create unique, personality-driven avatars that preserve the user's actual facial identity.

---

## Architecture

```
User uploads photo/video
        ↓
Video KYC (mobile) → sends 3-5 frames
        ↓
Backend: selectBestKycFrame() → picks sharpest, best-lit frame
        ↓
Backend: normaliseKycFrame() → auto-rotate, square crop, 512×512
        ↓
Backend: extractVisualTraits() → pixel analysis (gender, skin tone, hair, age, ethnicity)
        ↓
Backend: buildPersonalisedPrompt() → generates unique prompt from traits
        ↓
AI Generation (Cloudflare SDXL / fal.ai InstantID / HuggingFace FLUX)
        ↓
IPFS upload → avatar_ipfs_hash stored in users table
        ↓
Hero Card Generation (optional) → composite onto tiered template → IPFS
```

---

## 1. Video KYC Frame Selection (`video-kyc.ts`)

**Purpose**: Select the best frame from a set of 3-5 photo captures taken during the KYC recording session.

**Scoring Criteria** (weighted):
- **Sharpness (50%)** — Laplacian variance on greyscale thumbnail
- **Brightness (25%)** — Should be 90–175 avg (not too dark/washed)
- **Face Signal (25%)** — Skin-tone pixel ratio in centre crop

**Key Functions**:

### `selectBestKycFrame(frames: Buffer[])`
- Scores all frames using the above criteria
- Returns the best frame + ranked scores
- Falls back to single frame if only 1 provided

### `normaliseKycFrame(frame: Buffer)`
- Auto-rotates using EXIF data
- Centre-crops to square
- Resizes to 512×512
- Outputs JPEG at 90% quality

---

## 2. Visual Trait Extraction (`ai-avatar.ts`)

**Purpose**: Extract 11 visual traits from the user's photo using pixel-level analysis (Sharp library, zero API cost).

**Traits Extracted**:

| Trait | Type | Detection Method |
|-------|------|------------------|
| `gender` | `"male" \| "female" \| "other"` | HuggingFace gender classifier (rizvandwiki/gender-classification) |
| `genderConf` | `number` | Confidence score from HF model |
| `skinTone` | `"fair" \| "warm-ivory" \| "olive" \| "medium-brown" \| "warm-brown" \| "deep-brown" \| "dark"` | HSL lightness + warmth (r-b ratio) from face crop |
| `hairColour` | `"jet-black" \| "dark-brown" \| "medium-brown" \| "auburn" \| "silver-grey" \| "white" \| "light"` | Brightness + saturation from top strip |
| `ageClass` | `"teen" \| "young-adult" \| "adult" \| "mature" \| "elder"` | Hair saturation + brightness |
| `hasGlasses` | `boolean` | Edge density in eye strip (>0.14) |
| `hasBeard` | `boolean` | Chin region darkness for males |
| `expression` | `"warm-smile" \| "neutral" \| "serious"` | Mouth region brightness |
| `dominantClothingHex` | `string` | Bottom strip average RGB → hex |
| `ethnicRegion` | `"east-asian" \| "south-asian" \| "southeast-asian" \| "middle-eastern" \| "northern-european" \| "southern-european" \| "african" \| "latin-american"` | Multi-signal scoring: skin tone + hue + eye edge density + nose width ratio |

**Key Functions**:

### `analyzeGenderFromImage(photoBuffer, mimeType, hfToken)`
- Calls HuggingFace `rizvandwiki/gender-classification` model
- Returns gender + confidence

### `extractVisualTraits(photoBuffer, gender, genderConf)`
- Resizes image to 256×256 for analysis
- Extracts 11 traits using region-based pixel sampling
- Returns `VisualTraits` object

**Analysis Regions** (on 256×256 normalized image):
- **Face crop**: y=25–65%, x=20–80% → skin tone
- **Top strip**: y=0–12% → hair colour
- **Chin crop**: y=55–85% → beard hint
- **Eye strip**: y=30–50% → glasses hint (edge density)
- **Mouth region**: y=68–83% → expression
- **Bottom strip**: y=82–97% → clothing colour
- **Nose strip**: y=50–60% → nose width ratio (ethnicity)

---

## 3. Personalized Prompt Building (`ai-avatar.ts`)

**Purpose**: Generate a unique, personality-driven prompt for AI image generation using the extracted visual traits.

**Art Style Anchor** (constant):
```
cosmic Gen-Z NFT trading card portrait, bold india-ink outlines,
halftone dot shadows, neon glitch colour fringe,
deep-space galaxy background with detailed nebulae, swirling cosmic dust,
complex planetary rings, luminous stardust particles,
celestial cosmic energy aura radiating from the subject as a light source,
multi-source lighting with cool blue rim light and warm golden face illumination,
dramatic chiaroscuro contrast, volumetric light beams,
highly detailed hair with individual strand texture,
clothing with intricate fold rendering and fabric texture,
galaxy background interacting with the figure, energy wisps connecting subject to nebulae,
comic panel energy, hand-painted brush texture blended with sculpted 3-D anatomy,
highly detailed digital illustration, 1024×1024 square, studio portrait framing
```

**Negative Prompt** (constant):
```
photorealistic, photograph, 3d render, blurry, low quality,
watermark, text, logo, ugly, extra limbs, bad anatomy, nsfw, nude,
generic face, same face, blue eyes, white skin unless accurate, fantasy hair colour
```

**Prompt Vocabulary Maps**:

| Skin Tone | Description |
|-----------|-------------|
| `fair` | fair porcelain skin with cool rosy-pink undertones |
| `warm-ivory` | warm ivory skin with soft golden-yellow undertones |
| `olive` | warm olive skin with golden-green undertones |
| `medium-brown` | medium warm-brown skin with rich amber undertones |
| `warm-brown` | rich warm brown skin with deep caramel and amber undertones |
| `deep-brown` | deep brown skin with warm mahogany and copper undertones |
| `dark` | deep rich dark skin with cool blue-black undertones |

| Hair Colour | Description |
|-------------|-------------|
| `jet-black` | short jet-black hair with sharp clean lines |
| `dark-brown` | dark chestnut-brown hair |
| `medium-brown` | medium warm-brown hair |
| `auburn` | auburn reddish-brown hair |
| `silver-grey` | distinguished silver-grey hair, salt-and-pepper streaks |
| `white` | bright white or platinum hair |
| `light` | light sandy or blonde hair |

| Age Class | Description |
|----------|-------------|
| `teen` | Gen-Z teenager, soft round face, youthful glowing skin, trendy energy |
| `young-adult` | Gen-Z young adult in early 20s, smooth defined features, fresh confident look |
| `adult` | Gen-Z adult in mid-20s, sharp defined features, confident modern look, youthful energy |
| `mature` | young adult in late 20s, defined strong features, cool modern vibe |
| `elder` | stylish young adult, sharp expressive features, bold Gen-Z presence |

**Ethnic Region Descriptors** (used for accurate facial feature prompts):

| Region | Face | Eyes | Nose | Jaw | Keywords |
|--------|------|------|------|-----|----------|
| `east-asian` | smooth oval face, high wide flat cheekbones, smooth broad forehead | almond-shaped eyes with delicate single or double eyelid, refined arched brow | low-bridged delicate refined nose, subtle rounded tip | soft defined jaw, smooth narrow pointed chin | East Asian facial aesthetics, Korean Japanese Chinese appearance, smooth porcelain-to-golden luminous skin |
| `south-asian` | defined oval face, prominent angular cheekbones, strong expressive bone structure | large expressive almond eyes, strong dark defined arched brow | medium-bridged defined prominent nose, slightly flared nostrils | strong angular jaw, defined prominent chin | South Asian facial features, Indian Pakistani appearance, warm golden-to-caramel brown skin |
| `southeast-asian` | broad rounded face, wide prominent flat cheekbones, soft warm features | wide-set almond eyes, gentle monolid or soft double lid, wide flat brow | broad low-bridged nose, wide nostrils, rounded tip | rounded broad jaw, soft wide chin | Southeast Asian facial features, Filipino Thai Vietnamese Indonesian appearance, warm golden-tawny skin |
| `middle-eastern` | strong defined face, high prominent angular cheekbones, bold bone structure | large deep-set expressive eyes, heavy defined bold brow ridge | long prominent nose, defined high bridge, angular refined tip | strong angular jaw, defined prominent chin | Middle Eastern facial features, Arab Persian Turkish appearance, warm olive to golden-brown skin |
| `northern-european` | angular defined face, sharp high cheekbones, prominent defined bone structure | wide-set prominent eyes, light defined brow ridge | narrow straight or slightly aquiline nose, well-defined bridge | sharp angular jaw, narrow defined chin | Northern European facial features, Scandinavian British German appearance, fair cool porcelain skin |
| `southern-european` | oval-to-angular face, defined prominent cheekbones, expressive strong features | large expressive dark eyes, strong arched brow, slightly hooded lid | prominent nose, strong bridge, defined angular tip | strong defined jaw, square prominent chin | Mediterranean Southern European facial features, Italian Spanish Greek appearance, warm olive complexion |
| `african` | strong broad face, wide prominent cheekbones, robust expressive bone structure | wide expressive eyes, full heavy brow ridge, prominent orbital area | broad wide nose, prominent nostrils, flat low bridge | strong broad jaw, defined prominent chin, naturally full lips | African facial features, West East African appearance, rich deep warm mahogany-to-ebony skin |
| `latin-american` | oval-to-round face, warm prominent cheekbones, mixed expressive features | large expressive eyes, full defined dark brow, warm energy | medium-to-broad nose, rounded tip, medium bridge | rounded strong jaw, warm full features, defined chin | Latin American facial features, Hispanic Latino appearance, warm mixed-heritage golden-to-caramel skin |

**Key Function**:

### `buildPersonalisedPrompt(traits: VisualTraits)`
- Combines all trait descriptors into a single prompt
- Includes uniqueness token `[uid:skinTone-ethnicRegion-hairColour-rand]`
- Returns full prompt string

---

## 4. AI Generation Providers (`ai-avatar.ts`)

### Provider A: fal.ai InstantID (Face-Preserving)

**Model**: `fal-ai/instant-id`

**Best For**: Styles where the user's actual facial identity must be clearly recognizable (e.g., `noir-glamour`)

**Cost**: ~$0.05/image on fal.ai

**Env Var**: `FAL_KEY`

**Parameters**:
- `identitynet_strength_ratio` (0.0–1.0) — how much to preserve the face (higher = more like the user)
- `adapter_strength_ratio` (0.0–1.0) — how much to apply the art style (higher = more stylized)
- `guidance_scale` — prompt adherence (higher = stronger style but may distort)
- `num_inference_steps` — generation quality (30 recommended)

**Function**: `generateViaFalInstantId(photoBuffer, mimeType, prompt, negativePrompt, falApiKey, params?)`

### Provider B: fal.ai FLUX dev img2img

**Model**: `fal-ai/flux/dev/image-to-image`

**Best For**: General avatar generation with good quality

**Cost**: ~$0.03/img

**Env Var**: `FAL_KEY`

**Parameters**:
- `strength` (0.0–1.0) — how much to transform the input (0.72 recommended)
- `guidance_scale` — prompt adherence (7.5 recommended)
- `num_inference_steps` — generation quality (28 recommended)
- `seed` — random seed for reproducibility

**Function**: `generateViaFal(photoBuffer, mimeType, prompt, falApiKey, seed)`

### Provider C: HuggingFace FLUX.1-schnell (Free)

**Model**: `black-forest-labs/FLUX.1-schnell`

**Best For**: Free fallback when fal.ai credits run out

**Cost**: Free

**Env Var**: `HUGGINGFACE_TOKEN`

**Parameters**:
- `num_inference_steps` — max 50 for FLUX
- `guidance_scale` — prompt adherence
- `width` / `height` — 1024×1024

**Used in**: `/users/avatar/prompt-lab` endpoint

### Provider D: Cloudflare SDXL

**Model**: `@cf/stabilityai/stable-diffusion-xl-base-1.0` or `@cf/bytedance/stable-diffusion-xl-lightning`

**Best For**: General avatar generation, fallback when fal.ai unavailable

**Cost**: Free (Cloudflare Workers AI)

**Env Vars**: `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_API_TOKEN`

**Parameters**:
- `num_steps` — 30 for SDXL, 20 for Lightning
- `strength` — 0.7 recommended
- `guidance` — prompt adherence

**Function**: `generateAvatarWithCloudflare(imageBuffer, prompt, negativePrompt, accountId, apiToken)`

---

## 5. API Endpoints

### KYC Avatar Generation

**POST `/users/me/avatar/kyc-frames`**

Upload 3-5 frames from video KYC session. Backend selects the best frame and generates avatar.

**Request**:
- `multipart/form-data`
- `frames[]` — array of image files (JPEG/PNG)
- `style` — art style (optional, defaults to `gen-z-creator`)
- `customPrompt` — custom prompt override (optional)

**Response**:
```json
{
  "avatarUrl": "https://gateway.pinata.cloud/ipfs/...",
  "ipfsHash": "Qm...",
  "style": "gen-z-creator",
  "traits": {
    "gender": "male",
    "skinTone": "warm-brown",
    "hairColour": "jet-black",
    "ageClass": "young-adult",
    "hasGlasses": false,
    "hasBeard": true,
    "expression": "warm-smile",
    "dominantClothingHex": "#1a2b3c",
    "ethnicRegion": "south-asian"
  }
}
```

**Special Case — `noir-glamour` style**:
- Prefers fal.ai InstantID for face preservation
- Falls back to Cloudflare SDXL if FAL_KEY missing or InstantID fails

### Avatar Edit

**POST `/users/me/avatar/edit`**

Regenerate avatar with a different style or custom prompt.

**Request**:
- `multipart/form-data`
- `avatar` — current avatar image
- `style` — new art style
- `customPrompt` — custom prompt (optional)
- `negativePrompt` — custom negative prompt (optional)

**Response**: Same as KYC avatar generation

### Prompt Lab (Test Playground)

**POST `/users/avatar/prompt-lab`**

Free-form prompt testing for avatar generation.

**Request**:
```json
{
  "prompt": "pop art comic book portrait...",
  "negativePrompt": "photorealistic...",
  "model": "cloudflare" | "huggingface",
  "style": "string",
  "steps": 25,
  "guidance": 7.5
}
```

**Response**:
```json
{
  "imageBase64": "iVBORw0KGgo...",
  "mimeType": "image/png",
  "provider": "cloudflare/sdxl-lightning",
  "prompt": "...",
  "negativePrompt": "...",
  "model": "cloudflare",
  "steps": 25,
  "guidance": 7.5
}
```

---

## 6. Hero Card Generation (`hero-card.service.ts`)

**Purpose**: Composite the KYC avatar onto tier-specific card templates with user stats.

**Card Tiers**:
- **Common** (vibe < 60) — Single stat (VIBE)
- **Rare** (vibe 60–79) — Double-row stats (VIBE, RIZZ)
- **Epic** (vibe 80–94) — Double-row + DRIP
- **Legendary** (vibe ≥ 95) — 2×2 grid (VIBE, RIZZ, DRIP, AURA)

**Card Dimensions**: 864×1216 px

**Template Location**: `apps/api/public/images/herocard/{tier}.png`

**Key Functions**:

### `generateHeroCard(input: HeroCardInput)`

**Input**:
```typescript
{
  avatarBuffer: Buffer,      // KYC-generated comic avatar
  name: string,              // "PRAKHAR"
  city: string,              // "MUMBAI"
  age: number,               // 21
  cardNumber: number,        // Auto-assigned from sequence
  tier: CardTier,            // "Common" | "Rare" | "Epic" | "Legendary"
  vibe: number,              // 0–100
  rizz?: number,             // Derived from vibe
  drip?: number,             // Derived from vibe
  aura?: number,             // Derived from vibe
  badges?: string[],         // ["OG MEMBER", "TOP 1%"]
  tagline?: string,          // Auto-computed if omitted
  petValuePcash?: number,    // Current pet price (Epic+ only)
  seriesLabel?: string       // "GENESIS SERIES" (Legendary only)
}
```

**Process**:
1. Load frame template (PNG with transparent circular hole)
2. Scale avatar to fill circle bounding box
3. Cut circular hole from frame (frame never bleeds through)
4. Build opaque cover patches for info area (clean background for text)
5. Build SVG text overlay (name, city, stats, badges, tagline)
6. Composite: solid bg → avatar → frame-with-hole → cover patches → text

**Output**: Buffer — final 864×1216 PNG ready for IPFS upload

### `tierFromVibe(vibe: number)`

Auto-calculate tier from vibe score:
- vibe ≥ 95 → Legendary
- vibe ≥ 80 → Epic
- vibe ≥ 60 → Rare
- else → Common

### `computeTagline(tier, vibe, rizz, drip, aura)`

Auto-compute earned title based on stats:
- **Common**: "CATCHING FIRE", "RISING STAR", "FINDING FLOW", "NEW IN TOWN"
- **Rare**: "IRRESISTIBLE", "MAGNETIC", "CHARMING", "CONNECTED"
- **Epic**: "STYLE ICON", "HEARTBREAKER", "VIBE SETTER", "APEX PREDATOR", "ELITE"
- **Legendary**: "THE ICON", "THE ONE", "UNTOUCHABLE", "THE CHOSEN ONE", "LEGENDARY"

**API Endpoint**: `POST /users/me/hero-card`

---

## 7. Storage

### IPFS (Pinata)

All generated avatars and hero cards are uploaded to IPFS via Pinata.

**Functions**:
- `uploadToIPFS(buffer, filename, mimeType)` — returns CID string
- `ipfsGatewayUrl(cid)` — returns `https://gateway.pinata.cloud/ipfs/{cid}`

**Database Storage**:
- `users.avatar_ipfs_hash` — KYC avatar CID
- `hero_cards.card_ipfs_hash` — Hero card CID

---

## 8. Environment Variables Required

| Variable | Purpose | Provider |
|----------|---------|----------|
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare Workers AI auth | Cloudflare |
| `CLOUDFLARE_API_TOKEN` | Cloudflare Workers AI auth | Cloudflare |
| `FAL_KEY` | fal.ai API key (credits) | fal.ai |
| `HUGGINGFACE_TOKEN` | HuggingFace API token (free) | HuggingFace |
| `PINATA_JWT` | IPFS upload auth | Pinata |

---

## 9. Flow Summary

### Complete KYC + Avatar Flow

1. **User records video** on mobile app during KYC
2. **Mobile app captures 3-5 frames** from the video (at countdown points)
3. **POST `/users/me/avatar/kyc-frames`** with frames
4. **Backend**:
   - `selectBestKycFrame()` → picks sharpest, best-lit frame
   - `normaliseKycFrame()` → 512×512 square crop
   - `analyzeGenderFromImage()` → gender via HuggingFace
   - `extractVisualTraits()` → 11 traits via pixel analysis
   - `buildPersonalisedPrompt()` → unique prompt from traits
   - **AI generation**:
     - If `style === "noir-glamour"` and `FAL_KEY` → `generateViaFalInstantId()`
     - Else if `FAL_KEY` → `generateViaFal()`
     - Else → `generateAvatarWithCloudflare()`
   - `uploadToIPFS()` → store avatar CID
   - Update `users.avatar_ipfs_hash`
5. **Response**: avatar URL + traits

### Hero Card Flow

1. **User has KYC avatar** stored in `users.avatar_ipfs_hash`
2. **POST `/users/me/hero-card`** with optional vibe/stats
3. **Backend**:
   - Fetch user profile + avatar from DB
   - Calculate tier from vibe (`tierFromVibe()`)
   - Compute tagline (`computeTagline()`)
   - `generateHeroCard()` → composite onto template
   - `uploadToIPFS()` → store card CID
   - Insert into `hero_cards` table
4. **Response**: card URL + tier + stats

---

## 10. Art Styles Available

| Style | Provider | Description |
|-------|----------|-------------|
| `gen-z-creator` | Cloudflare/fal.ai | Ultra stylish Gen-Z digital creator avatar |
| `notion-style` | Cloudflare/fal.ai | Professional minimalist avatar |
| `bitmoji-style` | Cloudflare/fal.ai | Expressive cartoon avatar |
| `lorelei-style` | Cloudflare/fal.ai | Elegant feminine avatar |
| `big-smile` | Cloudflare/fal.ai | Warm friendly avatar |
| `cyberpunk` | Cloudflare/fal.ai | Futuristic cyberpunk avatar |
| `luxury-fashion` | Cloudflare/fal.ai | Luxury fashion avatar |
| `anime-style` | Cloudflare/fal.ai | Anime style avatar |
| `3d-cartoon` | Cloudflare/fal.ai | 3D cartoon avatar (Pixar style) |
| `professional-headshot` | Cloudflare/fal.ai | LinkedIn-style professional headshot |
| `retro-90s` | Cloudflare/fal.ai | Retro 90s aesthetic avatar |
| `noir-glamour` | fal.ai InstantID | Noir sketch style (face-preserving) |

---

## 11. Key Design Decisions

### Why Pixel Analysis Instead of Full AI for Traits?
- **Zero API cost** — Sharp library is free and fast
- **Consistent across ethnicities** — Skin-tone detection works for all skin types
- **Deterministic** — Same photo always produces same traits
- **Privacy** — No external API calls for trait extraction

### Why Multiple AI Providers?
- **Redundancy** — If one fails, fallback to another
- **Cost optimization** — Use free providers when possible
- **Style-specific optimization** — InstantID for face-preserving styles, SDXL for general

### Why Face-Preserving for `noir-glamour`?
- Noir sketch style needs recognizable facial identity
- Generic SDXL often changes the face too much
- InstantID locks the face embedding while applying style

### Why Keep Original Photo After Avatar Generation?
- Future re-generation with different styles
- Hero card generation requires avatar as input
- User may want to edit avatar later

---

## 12. Testing

### Local Testing

**KYC Avatar Test**:
```bash
pnpm ai-avatar-test
```

**Hero Card Test**:
```bash
pnpm hero-card-test
```

**Video KYC Test Page**:
- Visit `/video-kyc-test.html` (dev only)
- Upload 3-5 frames
- See selected best frame + scores

**Prompt Lab Test Page**:
- Visit `/prompt-lab.html` (dev only)
- Test custom prompts + parameters
- See real-time generation

---

## 13. Troubleshooting

### Avatar Generation Fails
- Check `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_API_TOKEN` are set
- Check `FAL_KEY` has credits (for InstantID)
- Check `HUGGINGFACE_TOKEN` is set (fallback)
- Check image buffer is valid (not corrupted)

### Hero Card Generation Fails
- Check template files exist in `public/images/herocard/`
- Check avatar buffer is valid
- Check Sharp is installed (`npm install sharp`)

### Traits Look Wrong
- Check photo is well-lit and front-facing
- Check photo resolution (minimum 256×256)
- Check gender classification is working (HuggingFace token)

---

## 14. Future Enhancements

- [ ] Add more art styles (e.g., watercolor, oil painting)
- [ ] Support custom user-uploaded card templates
- [ ] Add avatar editing tools (adjust brightness, contrast)
- [ ] Batch avatar generation for multiple styles
- [ ] Avatar gallery for users to select best result
- [ ] Animated hero cards (GIF/WebP)
