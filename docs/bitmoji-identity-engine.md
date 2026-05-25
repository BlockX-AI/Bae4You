# Bae4U Bitmoji Identity Engine - Complete Documentation

## 📋 Table of Contents

1. [Overview](#overview)
2. [System Architecture](#system-architecture)
3. [Features](#features)
4. [Technology Stack](#technology-stack)
5. [Implementation Guide](#implementation-guide)
6. [API Documentation](#api-documentation)
7. [Cost Analysis](#cost-analysis)
8. [Phased Rollout](#phased-rollout)
9. [Code Examples](#code-examples)
10. [Troubleshooting](#troubleshooting)

---

## Overview

### What is the Bitmoji Identity Engine?

The Bae4U Bitmoji Identity Engine is a **free, open-source system** that transforms user photos/videos into personalized cartoon avatars, sticker packs, and animated reactions. Unlike generic Bitmoji clones, this system is specifically designed for **relationship-focused digital identity**.

### Key Differentiators

- **100% Free**: No paid APIs, no subscription costs
- **Relationship-Centric**: Couple-connected avatars, red thread integration
- **Bae4U Branded**: Custom stickers, tournament overlays, NFT integration
- **Social Native**: Optimized for WhatsApp, Instagram, TikTok sharing
- **Privacy-First**: Face analysis runs locally, no data sent to third parties

### Use Cases

- User profile pictures
- Couple avatar matching
- Sticker packs for messaging
- Tournament champion overlays
- NFT collectible generation
- Animated reactions for video calls

---

## System Architecture

### Pipeline Overview

```
User Input (Photo/Video)
    ↓
Face Detection & Analysis (MediaPipe)
    ↓
Feature Extraction (Face Shape, Hair, Eyes, etc.)
    ↓
Avatar Generation (DiceBear API)
    ↓
Sticker Pack Generation (Canvas)
    ↓
Animated Reactions (Optional: SadTalker)
    ↓
Output: Avatar + Stickers + Animations
```

### Component Diagram

```
┌─────────────────────────────────────────────────────────┐
│                    Frontend Layer                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │ Photo Upload │  │ Video Upload │  │ Camera Capture│  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│                    API Layer                              │
│  ┌──────────────────────────────────────────────────┐   │
│  │ POST /api/users/me/bitmoji                        │   │
│  │ POST /api/users/me/bitmoji/stickers               │   │
│  │ POST /api/users/me/bitmoji/animate                │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│                  Service Layer                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │ Face Analysis│  │Avatar Generator│ │Sticker Generator│ │
│  │  (MediaPipe) │  │  (DiceBear)  │  │   (Canvas)   │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
│  ┌──────────────┐  ┌──────────────┐                     │
│  │Video Animator│  │Image Processor│                     │
│  │ (SadTalker)  │  │   (Sharp)    │                     │
│  └──────────────┘  └──────────────┘                     │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│                  Storage Layer                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │ Local Storage│  │    IPFS      │  │    Cloud     │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
└─────────────────────────────────────────────────────────┘
```

---

## Features

### Core Features

#### 1. Face Analysis
- **Face Shape Detection**: Oval, round, square, heart, diamond
- **Skin Tone Classification**: Fair, medium, olive, brown, dark
- **Hair Analysis**: Color, style, texture
- **Eye Detection**: Shape, color, glasses
- **Expression Detection**: Smile, laugh, surprise, serious
- **Beard Detection**: Presence, style

#### 2. Avatar Generation
- **Multiple Styles**: Avataaars, Lorelei, Notionists, Big-Smile
- **Personalization**: Based on detected features
- **Customization**: Accessories, clothing, background
- **High Quality**: 512x512px output

#### 3. Sticker Pack Generation
- **Expression Stickers**: Smile, love, laugh, cool, surprised, wink
- **Action Stickers**: Thumbs up, heart hands, wave, dancing
- **Bae4U Stickers**: Red thread, connected hearts, crown, trophy
- **Transparent Background**: Ready for messaging apps

#### 4. Animated Reactions (Phase 2+)
- **Simple Animation**: Canvas-based frame animation
- **Video-Based**: SadTalker/LivePortrait integration
- **Expression Loops**: Smile, laugh, blink
- **Bae4U Animations**: Red thread glow, crown sparkle

### Bae4U-Specific Features

#### Couple Integration
- **Matching Avatars**: Visual connection between partners
- **Red Thread**: Integrated across all avatars
- **Bonded State**: Special overlay for bonded couples
- **Couple Stickers**: Partner-specific reactions

#### Tournament Integration
- **Champion Overlay**: Trophy/crown for winners
- **Rank-Based Styling**: Visual indication of achievement
- **Season Themes**: Seasonal avatar variations

#### NFT Integration
- **Avatar as NFT**: Mint avatar as collectible
- **Rarity Tiers**: Common, Rare, Epic, Legend
- **Dynamic Metadata**: Tournament wins, relationship milestones

---

## Technology Stack

### Free Tools & Libraries

| Component | Tool | Version | Cost | License |
|-----------|------|---------|------|---------|
| Face Detection | MediaPipe Face Mesh | Latest | Free | Apache 2.0 |
| Avatar Generation | DiceBear API | 7.x | Free | MIT |
| Image Processing | Sharp | 0.33.x | Free | Apache 2.0 |
| Sticker Generation | Canvas (Node) | 2.x | Free | MIT |
| Video Processing | FFmpeg | Latest | Free | GPL |
| Animation | gif-encoder-2 | 1.x | Free | MIT |
| Advanced Animation | SadTalker | Latest | Free | MIT |
| Advanced Animation | LivePortrait | Latest | Free | Apache 2.0 |

### Dependencies

```json
{
  "dependencies": {
    "@mediapipe/face-mesh": "^0.4.0",
    "@mediapipe/camera_utils": "^0.4.0",
    "sharp": "^0.33.0",
    "canvas": "^2.11.0",
    "gif-encoder-2": "^1.0.5",
    "fluent-ffmpeg": "^2.1.2",
    "axios": "^1.6.0"
  }
}
```

---

## Implementation Guide

### Phase 1: MVP (1-2 weeks)

#### Step 1: Install Dependencies

```bash
cd apps/api
npm install @mediapipe/face-mesh @mediapipe/camera_utils sharp canvas gif-encoder-2 fluent-ffmpeg axios
```

#### Step 2: Create Service Files

Create the following files in `apps/api/src/services/`:

1. `face-analysis.ts` - Face detection and feature extraction
2. `avatar-generator.ts` - DiceBear avatar generation
3. `sticker-generator.ts` - Canvas-based sticker creation
4. `bitmoji-service.ts` - Main service orchestrator

#### Step 3: Create API Endpoint

Create `apps/api/src/routes/bitmoji.ts` with the main endpoint.

#### Step 4: Test Locally

```bash
npm run dev
# Test with curl or Postman
```

### Phase 2: Enhanced (2-3 weeks)

#### Step 1: Add Video Support

- Install FFmpeg
- Add video frame extraction
- Implement video-based face analysis

#### Step 2: Add Animation

- Implement canvas-based animation
- Create GIF encoder integration
- Add expression loops

#### Step 3: Expand Sticker Library

- Add Bae4U-themed stickers
- Create couple-specific stickers
- Add tournament overlays

### Phase 3: Advanced (Optional)

#### Step 1: Install SadTalker/LivePortrait

```bash
git clone https://github.com/OpenTalker/SadTalker.git
cd SadTalker
python scripts/download_models.py
```

#### Step 2: Integrate with API

- Create video animation service
- Add GPU server integration
- Implement lip-sync features

---

## API Documentation

### POST /api/users/me/bitmoji

Generate a Bitmoji avatar from a photo.

#### Request

```typescript
POST /api/users/me/bitmoji
Content-Type: multipart/form-data

{
  photo: File,           // User photo
  style: "avataaars" | "lorelei" | "notionists" | "big-smile",
  generateStickers: boolean  // Optional, default: true
}
```

#### Response

```typescript
{
  success: true,
  data: {
    avatar: {
      url: string,        // IPFS or local URL
      ipfsHash: string,
      features: {
        faceShape: string,
        skinTone: string,
        hairColor: string,
        eyeColor: string,
        hasGlasses: boolean,
        hasBeard: boolean,
        expression: string
      }
    },
    stickers: [
      {
        url: string,
        type: "smile" | "love" | "laugh" | "cool" | "surprised" | "wink",
        ipfsHash: string
      }
    ]
  }
}
```

#### Example

```bash
curl -X POST http://localhost:3000/api/users/me/bitmoji \
  -F "photo=@user-photo.jpg" \
  -F "style=avataaars" \
  -F "generateStickers=true"
```

### POST /api/users/me/bitmoji/video

Generate avatar and animation from video.

#### Request

```typescript
POST /api/users/me/bitmoji/video
Content-Type: multipart/form-data

{
  video: File,           // User video
  style: "avataaars" | "lorelei" | "notionists" | "big-smile",
  animate: boolean       // Optional, default: false
}
```

#### Response

```typescript
{
  success: true,
  data: {
    avatar: {
      url: string,
      ipfsHash: string,
      features: FaceFeatures
    },
    personality: {
      energy: "high" | "medium" | "low",
      expressiveness: string,
      vibe: string,
      socialStyle: string
    },
    animation?: {
      url: string,      // GIF or video URL
      format: "gif" | "mp4",
      ipfsHash: string
    },
    stickers: Sticker[]
  }
}
```

### POST /api/users/me/bitmoji/couple

Generate matching couple avatars.

#### Request

```typescript
POST /api/users/me/bitmoji/couple
Content-Type: multipart/form-data

{
  photo1: File,          // Partner 1 photo
  photo2: File,          // Partner 2 photo
  style: "avataaars" | "lorelei",
  bonded: boolean        // Apply bonded overlay
}
```

#### Response

```typescript
{
  success: true,
  data: {
    avatar1: AvatarData,
    avatar2: AvatarData,
    coupleStickers: Sticker[],
    redThreadOverlay: {
      url: string,
      ipfsHash: string
    }
  }
}
```

---

## Cost Analysis

### Per User Generation Cost

| Component | Tool | Cost | Notes |
|-----------|------|------|-------|
| Face Detection | MediaPipe | $0 | Runs locally |
| Avatar Generation | DiceBear | $0 | Free API |
| Sticker Generation | Canvas | $0 | Pure JS |
| Image Processing | Sharp | $0 | Node library |
| Simple Animation | Canvas/GIF | $0 | No GPU |
| **Total (Phase 1)** | | **$0** | 100% free |

### Optional Advanced Features

| Component | Tool | Cost | Notes |
|-----------|------|------|-------|
| Video Animation | SadTalker | $0 (software) | GPU server optional |
| GPU Server | Various | $0.10-0.50/hr | Only if needed |
| Cloud Storage | IPFS/Cloud | $0-0.01/GB | Optional |

### Infrastructure Cost

- **Development**: $0 (local machine)
- **Production**: $0 (Railway/Render free tier)
- **Storage**: $0 (IPFS or local)
- **Bandwidth**: $0 (within free tier limits)

---

## Phased Rollout

### Phase 1: MVP (Weeks 1-2)

**Features:**
- ✅ Photo upload → Bitmoji avatar
- ✅ Basic sticker pack (6 stickers)
- ✅ Face detection and analysis
- ✅ Multiple avatar styles
- ✅ Simple API endpoint

**Deliverables:**
- `face-analysis.ts` service
- `avatar-generator.ts` service
- `sticker-generator.ts` service
- `bitmoji.ts` route
- Basic documentation

**Testing:**
- Unit tests for face analysis
- Integration tests for avatar generation
- Manual testing with sample photos

### Phase 2: Enhanced (Weeks 3-4)

**Features:**
- ✅ Video upload support
- ✅ Full sticker pack (15 stickers)
- ✅ Bae4U-themed stickers
- ✅ Simple canvas-based animation
- ✅ Expression detection from video
- ✅ Couple avatar generation

**Deliverables:**
- Video frame extraction
- Enhanced sticker library
- Animation service
- Couple endpoint
- Advanced documentation

**Testing:**
- Video processing tests
- Animation quality tests
- Couple avatar matching tests

### Phase 3: Advanced (Weeks 5-6, Optional)

**Features:**
- ✅ SadTalker/LivePortrait integration
- ✅ High-quality video animation
- ✅ Lip-sync with audio
- ✅ Advanced personality detection
- ✅ GPU server setup

**Deliverables:**
- SadTalker integration
- GPU server configuration
- Advanced animation API
- Performance optimization

**Testing:**
- Animation quality benchmarks
- GPU performance tests
- Lip-sync accuracy tests

---

## Code Examples

### Face Analysis Service

```typescript
// apps/api/src/services/face-analysis.ts

import { FaceMesh } from "@mediapipe/face-mesh";
import sharp from "sharp";

export interface FaceFeatures {
  faceShape: "oval" | "round" | "square" | "heart" | "diamond";
  skinTone: "fair" | "medium" | "olive" | "brown" | "dark";
  hairColor: "black" | "brown" | "blonde" | "red" | "grey" | "white";
  eyeColor: "brown" | "blue" | "green" | "hazel" | "black";
  hasGlasses: boolean;
  hasBeard: boolean;
  expression: "neutral" | "smile" | "laugh" | "surprise" | "serious";
}

export async function analyzeFaceFromImage(
  imageBuffer: Buffer
): Promise<FaceFeatures> {
  const faceMesh = new FaceMesh({
    locateFile: (file) => 
      `https://cdn.jsdelivr.net/npm/@mediapipe/face-mesh/${file}`
  });

  await faceMesh.initialize();

  const results = await faceMesh.send({ image: imageBuffer });
  const landmarks = results.multiFaceLandmarks?.[0];

  if (!landmarks) {
    throw new Error("No face detected in image");
  }

  // Analyze features from landmarks
  return {
    faceShape: detectFaceShape(landmarks),
    skinTone: detectSkinTone(imageBuffer, landmarks),
    hairColor: detectHairColor(imageBuffer, landmarks),
    eyeColor: detectEyeColor(imageBuffer, landmarks),
    hasGlasses: detectGlasses(landmarks),
    hasBeard: detectBeard(imageBuffer, landmarks),
    expression: detectExpression(landmarks)
  };
}

function detectFaceShape(landmarks: any): FaceFeatures["faceShape"] {
  // Implement face shape detection from landmarks
  // This is a simplified version
  const jawWidth = calculateDistance(landmarks[234], landmarks[454]);
  const faceHeight = calculateDistance(landmarks[10], landmarks[152]);
  const ratio = jawWidth / faceHeight;

  if (ratio > 0.8) return "round";
  if (ratio < 0.6) return "oval";
  return "square";
}

function calculateDistance(p1: any, p2: any): number {
  return Math.sqrt(
    Math.pow(p2.x - p1.x, 2) + 
    Math.pow(p2.y - p1.y, 2)
  );
}

// Additional detection functions...
```

### Avatar Generator Service

```typescript
// apps/api/src/services/avatar-generator.ts

import sharp from "sharp";
import axios from "axios";

export interface AvatarConfig {
  style: "avataaars" | "lorelei" | "notionists" | "big-smile";
  gender: "male" | "female";
  hairColor: string;
  skinColor: string;
  eyeColor: string;
  accessories?: string[];
  clothing?: string;
}

export async function generateAvatar(
  config: AvatarConfig
): Promise<Buffer> {
  const baseUrl = "https://api.dicebear.com/7.x";
  const style = config.style;
  
  const params = new URLSearchParams({
    gender: config.gender,
    hairColor: config.hairColor,
    skinColor: config.skinColor,
    eyes: config.eyeColor,
    backgroundColor: "transparent"
  });

  if (config.accessories) {
    params.append("accessories", config.accessories.join(","));
  }

  if (config.clothing) {
    params.append("clothing", config.clothing);
  }

  const url = `${baseUrl}/${style}/svg?${params.toString()}`;

  const response = await axios.get(url, { responseType: "arraybuffer" });
  const svg = Buffer.from(response.data);

  // Convert SVG to PNG
  const png = await sharp(svg)
    .resize(512, 512)
    .png()
    .toBuffer();

  return png;
}

export function mapFaceFeaturesToAvatarConfig(
  features: FaceFeatures
): AvatarConfig {
  return {
    style: "avataaars",
    gender: features.hasBeard ? "male" : "female",
    hairColor: mapHairColor(features.hairColor),
    skinColor: mapSkinTone(features.skinTone),
    eyeColor: mapEyeColor(features.eyeColor),
    accessories: features.hasGlasses ? ["roundGlasses"] : [],
    clothing: "blazerAndShirt"
  };
}

function mapHairColor(color: string): string {
  const colorMap: Record<string, string> = {
    "black": "0C0C0C",
    "brown": "4A3728",
    "blonde": "E8CE87",
    "red": "A52A2A",
    "grey": "808080",
    "white": "F5F5F5"
  };
  return colorMap[color] || "0C0C0C";
}

function mapSkinTone(tone: string): string {
  const toneMap: Record<string, string> = {
    "fair": "F8D9CE",
    "medium": "E0AC69",
    "olive": "C68642",
    "brown": "8D5524",
    "dark": "5C3317"
  };
  return toneMap[tone] || "F8D9CE";
}

function mapEyeColor(color: string): string {
  const colorMap: Record<string, string> = {
    "brown": "5C3317",
    "blue": "1E90FF",
    "green": "228B22",
    "hazel": "8E7616",
    "black": "0C0C0C"
  };
  return colorMap[color] || "5C3317";
}
```

### Sticker Generator Service

```typescript
// apps/api/src/services/sticker-generator.ts

import { createCanvas, loadImage } from "canvas";

export interface StickerConfig {
  avatar: Buffer;
  expression: "smile" | "love" | "laugh" | "cool" | "surprised" | "wink";
  backgroundColor?: "transparent" | string;
  size?: number;
}

export async function generateSticker(
  config: StickerConfig
): Promise<Buffer> {
  const size = config.size || 512;
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext("2d");

  // Background
  if (config.backgroundColor !== "transparent") {
    ctx.fillStyle = config.backgroundColor || "transparent";
    ctx.fillRect(0, 0, size, size);
  }

  // Draw avatar
  const avatar = await loadImage(config.avatar);
  ctx.drawImage(avatar, 0, 0, size, size);

  // Add expression overlay
  switch (config.expression) {
    case "love":
      drawHeartEyes(ctx, size);
      break;
    case "laugh":
      drawLaughTears(ctx, size);
      break;
    case "cool":
      drawSunglasses(ctx, size);
      break;
    case "surprised":
      drawSurprised(ctx, size);
      break;
    case "wink":
      drawWink(ctx, size);
      break;
    default:
      drawSmile(ctx, size);
  }

  // Add sticker border
  ctx.strokeStyle = "rgba(255, 255, 255, 0.5)";
  ctx.lineWidth = 4;
  ctx.strokeRect(2, 2, size - 4, size - 4);

  return canvas.toBuffer("image/png");
}

function drawHeartEyes(ctx: CanvasRenderingContext2D, size: number) {
  ctx.fillStyle = "#FF2D55";
  ctx.shadowColor = "#FF2D55";
  ctx.shadowBlur = 10;

  // Left heart
  ctx.beginPath();
  ctx.moveTo(size * 0.3, size * 0.4);
  ctx.bezierCurveTo(size * 0.25, size * 0.35, size * 0.2, size * 0.4, size * 0.25, size * 0.45);
  ctx.bezierCurveTo(size * 0.3, size * 0.5, size * 0.35, size * 0.45, size * 0.3, size * 0.4);
  ctx.fill();

  // Right heart
  ctx.beginPath();
  ctx.moveTo(size * 0.7, size * 0.4);
  ctx.bezierCurveTo(size * 0.65, size * 0.35, size * 0.6, size * 0.4, size * 0.65, size * 0.45);
  ctx.bezierCurveTo(size * 0.7, size * 0.5, size * 0.75, size * 0.45, size * 0.7, size * 0.4);
  ctx.fill();

  ctx.shadowBlur = 0;
}

function drawSunglasses(ctx: CanvasRenderingContext2D, size: number) {
  ctx.fillStyle = "#1a1a1a";
  ctx.strokeStyle = "#FFD700";
  ctx.lineWidth = 2;

  // Left lens
  ctx.beginPath();
  ctx.ellipse(size * 0.3, size * 0.4, size * 0.12, size * 0.08, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Right lens
  ctx.beginPath();
  ctx.ellipse(size * 0.7, size * 0.4, size * 0.12, size * 0.08, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Bridge
  ctx.fillRect(size * 0.4, size * 0.38, size * 0.2, size * 0.04);
}

function drawSmile(ctx: CanvasRenderingContext2D, size: number) {
  ctx.strokeStyle = "#FF2D55";
  ctx.lineWidth = 3;
  ctx.lineCap = "round";

  ctx.beginPath();
  ctx.arc(size * 0.5, size * 0.5, size * 0.15, 0.2 * Math.PI, 0.8 * Math.PI);
  ctx.stroke();
}

function drawLaughTears(ctx: CanvasRenderingContext2D, size: number) {
  ctx.fillStyle = "#00D9FF";
  
  // Left tear
  ctx.beginPath();
  ctx.ellipse(size * 0.25, size * 0.5, size * 0.03, size * 0.05, 0.3, 0, Math.PI * 2);
  ctx.fill();

  // Right tear
  ctx.beginPath();
  ctx.ellipse(size * 0.75, size * 0.5, size * 0.03, size * 0.05, -0.3, 0, Math.PI * 2);
  ctx.fill();
}

function drawSurprised(ctx: CanvasRenderingContext2D, size: number) {
  ctx.strokeStyle = "#000";
  ctx.lineWidth = 3;

  // Surprised eyebrows
  ctx.beginPath();
  ctx.moveTo(size * 0.25, size * 0.35);
  ctx.lineTo(size * 0.35, size * 0.32);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(size * 0.65, size * 0.32);
  ctx.lineTo(size * 0.75, size * 0.35);
  ctx.stroke();
}

function drawWink(ctx: CanvasRenderingContext2D, size: number) {
  // Wink left eye
  ctx.strokeStyle = "#000";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(size * 0.25, size * 0.4);
  ctx.lineTo(size * 0.35, size * 0.4);
  ctx.stroke();

  // Open right eye
  ctx.beginPath();
  ctx.arc(size * 0.7, size * 0.4, size * 0.05, 0, Math.PI * 2);
  ctx.stroke();
}

export async function generateBae4UStickers(
  avatar: Buffer
): Promise<Buffer[]> {
  const stickers = [];

  // Basic expressions
  const expressions = ["smile", "love", "laugh", "cool", "surprised", "wink"];
  for (const expr of expressions) {
    stickers.push(await generateSticker({ avatar, expression: expr as any }));
  }

  // Bae4U themed stickers
  stickers.push(await generateRedThreadSticker(avatar));
  stickers.push(await generateConnectedHeartsSticker(avatar));
  stickers.push(await generateCrownSticker(avatar));

  return stickers;
}

async function generateRedThreadSticker(avatar: Buffer): Promise<Buffer> {
  const canvas = createCanvas(512, 512);
  const ctx = canvas.getContext("2d");

  const img = await loadImage(avatar);
  ctx.drawImage(img, 0, 0, 512, 512);

  // Draw red thread
  ctx.strokeStyle = "#FF2D55";
  ctx.lineWidth = 3;
  ctx.shadowColor = "#FF2D55";
  ctx.shadowBlur = 10;

  ctx.beginPath();
  ctx.moveTo(0, 256);
  ctx.bezierCurveTo(128, 200, 384, 312, 512, 256);
  ctx.stroke();

  ctx.shadowBlur = 0;

  return canvas.toBuffer("image/png");
}

async function generateConnectedHeartsSticker(avatar: Buffer): Promise<Buffer> {
  const canvas = createCanvas(512, 512);
  const ctx = canvas.getContext("2d");

  const img = await loadImage(avatar);
  ctx.drawImage(img, 0, 0, 512, 512);

  // Draw connected hearts
  ctx.fillStyle = "#FF2D55";
  ctx.shadowColor = "#FF2D55";
  ctx.shadowBlur = 15;

  // Left heart
  ctx.beginPath();
  ctx.moveTo(100, 256);
  ctx.bezierCurveTo(80, 220, 60, 256, 100, 292);
  ctx.bezierCurveTo(140, 328, 180, 292, 160, 256);
  ctx.bezierCurveTo(140, 220, 120, 220, 100, 256);
  ctx.fill();

  // Right heart
  ctx.beginPath();
  ctx.moveTo(352, 256);
  ctx.bezierCurveTo(332, 220, 312, 256, 352, 292);
  ctx.bezierCurveTo(392, 328, 432, 292, 412, 256);
  ctx.bezierCurveTo(392, 220, 372, 220, 352, 256);
  ctx.fill();

  // Connection line
  ctx.strokeStyle = "#FF2D55";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(160, 256);
  ctx.lineTo(352, 256);
  ctx.stroke();

  ctx.shadowBlur = 0;

  return canvas.toBuffer("image/png");
}

async function generateCrownSticker(avatar: Buffer): Promise<Buffer> {
  const canvas = createCanvas(512, 512);
  const ctx = canvas.getContext("2d");

  const img = await loadImage(avatar);
  ctx.drawImage(img, 0, 0, 512, 512);

  // Draw crown
  ctx.fillStyle = "#FFD700";
  ctx.shadowColor = "#FFD700";
  ctx.shadowBlur = 20;

  ctx.beginPath();
  ctx.moveTo(156, 100);
  ctx.lineTo(176, 50);
  ctx.lineTo(206, 90);
  ctx.lineTo(256, 30);
  ctx.lineTo(306, 90);
  ctx.lineTo(336, 50);
  ctx.lineTo(356, 100);
  ctx.closePath();
  ctx.fill();

  // Crown jewels
  ctx.fillStyle = "#FF2D55";
  ctx.beginPath();
  ctx.arc(256, 60, 8, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#00D9FF";
  ctx.beginPath();
  ctx.arc(206, 80, 6, 0, Math.PI * 2);
  ctx.fill();

  ctx.beginPath();
  ctx.arc(306, 80, 6, 0, Math.PI * 2);
  ctx.fill();

  ctx.shadowBlur = 0;

  return canvas.toBuffer("image/png");
}
```

### Main Bitmoji Service

```typescript
// apps/api/src/services/bitmoji-service.ts

import { analyzeFaceFromImage, FaceFeatures } from "./face-analysis";
import { generateAvatar, mapFaceFeaturesToAvatarConfig } from "./avatar-generator";
import { generateBae4UStickers } from "./sticker-generator";

export interface BitmojiResult {
  avatar: Buffer;
  stickers: Buffer[];
  features: FaceFeatures;
  style: string;
}

export async function generateBitmojiFromPhoto(
  photoBuffer: Buffer,
  style: "avataaars" | "lorelei" | "notionists" | "big-smile" = "avataaars",
  generateStickers: boolean = true
): Promise<BitmojiResult> {
  // Step 1: Analyze face
  const features = await analyzeFaceFromImage(photoBuffer);

  // Step 2: Generate avatar
  const config = mapFaceFeaturesToAvatarConfig(features);
  config.style = style;
  const avatar = await generateAvatar(config);

  // Step 3: Generate stickers
  let stickers: Buffer[] = [];
  if (generateStickers) {
    stickers = await generateBae4UStickers(avatar);
  }

  return {
    avatar,
    stickers,
    features,
    style
  };
}
```

### API Route

```typescript
// apps/api/src/routes/bitmoji.ts

import express from "express";
import multer from "multer";
import { generateBitmojiFromPhoto } from "../services/bitmoji-service";
import { uploadToIPFS } from "../services/ipfs";

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.post("/me/bitmoji", upload.single("photo"), async (req, res) => {
  try {
    const { photo } = req.file;
    const { style = "avataaars", generateStickers = "true" } = req.body;

    if (!photo) {
      return res.status(400).json({ error: "Photo is required" });
    }

    const result = await generateBitmojiFromPhoto(
      photo.buffer,
      style,
      generateStickers === "true"
    );

    // Upload to IPFS
    const avatarIpfs = await uploadToIPFS(result.avatar);
    const stickerIpfs = await Promise.all(
      result.stickers.map(s => uploadToIPFS(s))
    );

    res.json({
      success: true,
      data: {
        avatar: {
          url: avatarIpfs.url,
          ipfsHash: avatarIpfs.hash,
          features: result.features
        },
        stickers: stickerIpfs.map((ipfs, index) => ({
          url: ipfs.url,
          ipfsHash: ipfs.hash,
          type: ["smile", "love", "laugh", "cool", "surprised", "wink", "red-thread", "hearts", "crown"][index]
        }))
      }
    });
  } catch (error) {
    console.error("Bitmoji generation error:", error);
    res.status(500).json({ error: "Failed to generate bitmoji" });
  }
});

export default router;
```

---

## Troubleshooting

### Common Issues

#### 1. Face Detection Fails

**Problem:** MediaPipe doesn't detect a face in the image.

**Solutions:**
- Ensure image is well-lit and face is clearly visible
- Check image format (JPEG/PNG recommended)
- Try a different photo with better lighting
- Increase image resolution (minimum 256x256)

#### 2. Avatar Generation Fails

**Problem:** DiceBear API returns error or timeout.

**Solutions:**
- Check internet connection
- Verify DiceBear API is accessible
- Try different avatar style
- Check parameters are valid

#### 3. Sticker Generation Fails

**Problem:** Canvas rendering fails or produces corrupted images.

**Solutions:**
- Ensure canvas library is properly installed
- Check Node.js version (canvas requires specific versions)
- Verify avatar buffer is valid PNG
- Try with smaller image size

#### 4. Video Processing Fails

**Problem:** FFmpeg not found or video extraction fails.

**Solutions:**
- Install FFmpeg: `brew install ffmpeg` (Mac) or `apt-get install ffmpeg` (Linux)
- Verify FFmpeg is in PATH
- Check video format (MP4 recommended)
- Try shorter video clips

#### 5. Animation Fails

**Problem:** SadTalker/LivePortrait fails to generate animation.

**Solutions:**
- Ensure models are downloaded
- Check GPU availability
- Verify Python environment
- Try with smaller video resolution

### Performance Optimization

#### 1. Slow Face Detection

**Optimizations:**
- Reduce image resolution before processing
- Use face detection first, then face mesh for detected faces
- Cache face analysis results
- Process multiple images in parallel

#### 2. Slow Avatar Generation

**Optimizations:**
- Cache DiceBear responses
- Pre-generate common avatar combinations
- Use CDN for avatar images
- Implement request queuing

#### 3. Memory Issues

**Optimizations:**
- Process images in streams instead of loading full buffer
- Clean up temporary files immediately
- Limit concurrent processing
- Use worker threads for CPU-intensive tasks

### Debug Mode

Enable debug logging:

```typescript
// In service files
const DEBUG = process.env.DEBUG === "true";

if (DEBUG) {
  console.log("[Bitmoji Service]", message);
}
```

Run with debug mode:

```bash
DEBUG=true npm run dev
```

---

## Additional Resources

### Documentation Links

- [MediaPipe Face Mesh](https://google.github.io/mediapipe/solutions/face_mesh.html)
- [DiceBear API](https://dicebear.com/)
- [Canvas Node.js](https://github.com/Automattic/node-canvas)
- [SadTalker](https://github.com/OpenTalker/SadTalker)
- [LivePortrait](https://github.com/KwaiVGI/LivePortrait)

### Community

- Bae4U Discord: [Link]
- GitHub Issues: [Link]
- Documentation: [Link]

### Support

For issues or questions:
- Create a GitHub issue
- Contact development team
- Check troubleshooting section above

---

## License

This system uses open-source libraries with permissive licenses:
- MediaPipe: Apache 2.0
- DiceBear: MIT
- Canvas: MIT
- Sharp: Apache 2.0
- SadTalker: MIT

All Bae4U-specific code is proprietary.

---

## Version History

- **v1.0.0** (2026-05-24): Initial MVP documentation
- Future versions will be updated as features are added
