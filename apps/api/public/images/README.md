# NFT Image Assets - AI Generation Guide

This directory contains the static image assets needed for the Bae4U NFT system. You need to generate these images using AI (Gemini, DALL-E, Midjourney, etc.) and place them in the appropriate folders.

## Directory Structure

```
public/images/
├── frames/              # Card frames for Hero Cards and Couple Cards
│   ├── frame-common.png     # Grey border for Common rarity
│   ├── frame-rare.png       # Blue border for Rare rarity
│   ├── frame-epic.png       # Purple border for Epic rarity
│   ├── frame-legend.png     # Gold border for Legend rarity
│   └── frame-couple.png     # Heart/romantic border for Couple Cards
├── badges/              # Achievement badges for ranking tiers
│   ├── badge-1.png          # Bronze badge
│   ├── badge-2.png          # Silver badge
│   ├── badge-3.png          # Gold badge
│   ├── badge-4.png          # Diamond badge
│   └── badge-5.png          # Master badge
├── default-avatar.svg  # Default profile picture (already created)
└── generated/           # Dynamically generated images (auto-created)
```

## AI Image Prompts

### Card Frames (400x400 PNG with transparent center)

**frame-common.png (Grey Border)**
```
A trading card frame with a grey metallic border, 400x400 pixels, transparent center circle for photo placement, minimalist design, clean lines, professional sports card style, high quality
```

**frame-rare.png (Blue Border)**
```
A trading card frame with a glowing blue neon border, 400x400 pixels, transparent center circle for photo placement, futuristic design, energy effects, rare card aesthetic, high contrast, professional quality
```

**frame-epic.png (Purple Border)**
```
A trading card frame with a majestic purple gradient border, 400x400 pixels, transparent center circle for photo placement, magical effects, sparkles, epic card aesthetic, premium design, high quality
```

**frame-legend.png (Gold Border)**
```
A trading card frame with a luxurious gold metallic border, 400x400 pixels, transparent center circle for photo placement, crown decorations, shine effects, legendary card aesthetic, premium quality, ornate design
```

**frame-couple.png (Heart/Romantic Border)**
```
A romantic couple card frame with heart-shaped border design, 400x400 pixels, transparent center area for two photos side by side, pink and red gradient, romantic atmosphere, love theme, elegant design, high quality
```

### Badge Images (200x200 PNG)

**badge-1.png (Bronze)**
```
A bronze achievement badge trophy, 200x200 pixels, metallic bronze finish, third place design, simple and elegant, professional quality, transparent background
```

**badge-2.png (Silver)**
```
A silver achievement badge trophy, 200x200 pixels, metallic silver finish, second place design, clean and modern, professional quality, transparent background
```

**badge-3.png (Gold)**
```
A gold achievement badge trophy, 200x200 pixels, metallic gold finish, first place design, premium quality, shine effects, transparent background
```

**badge-4.png (Diamond)**
```
A diamond achievement badge, 200x200 pixels, crystal diamond design, sparkling effects, premium quality, transparent background, luxury aesthetic
```

**badge-5.png (Master)**
```
A master achievement badge, 200x200 pixels, crown and star design, rainbow gradient, ultimate achievement, premium quality, transparent background, legendary aesthetic
```

## Image Specifications

- **Card Frames**: 400x400 pixels, PNG with transparency
- **Badge Images**: 200x200 pixels, PNG with transparency
- **File Format**: PNG for all images (supports transparency)
- **Resolution**: High quality, minimum 72 DPI

## Generation Tools

You can use any of these AI tools to generate the images:

1. **Gemini (Google)**
   - Access via Google AI Studio
   - Good for consistent style
   - Free tier available

2. **DALL-E (OpenAI)**
   - Access via ChatGPT Plus or API
   - High quality results
   - Paid service

3. **Midjourney**
   - Discord-based
   - Excellent artistic quality
   - Paid subscription

4. **Stable Diffusion**
   - Open source
   - Can run locally
   - Free but requires GPU

## After Generation

1. Download each generated image
2. Rename them to match the filenames above
3. Place them in the appropriate directory:
   - Card frames → `public/images/frames/`
   - Badge images → `public/images/badges/`
4. Test the endpoints to ensure they load correctly

## Testing

Once images are in place, test these endpoints:

```bash
# Test badge metadata
curl https://api.bae4u.com/badges/1

# Test hero card metadata
curl https://api.bae4u.com/cards/rare/123.json

# Test profile metadata
curl https://api.bae4u.com/metadata/456.json

# Test couple card metadata
curl https://api.bae4u.com/couples/789.json
```

## Notes

- The center of card frames should be transparent so user photos show through
- Badge images should have transparent backgrounds
- Ensure consistent style across all images (same color palette, design language)
- Test image composition by calling the image generation endpoints after placing frames
