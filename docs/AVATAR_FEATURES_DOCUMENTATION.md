# Bae4U AI Avatar Generation Documentation

## Overview

Bae4U uses Cloudflare's AI model for high-quality avatar generation with advanced prompt engineering. Users can create stunning, professional-grade avatars that rival Bitmoji, Notion, and other top avatar platforms.

## Technology Stack

- **AI Model**: Cloudflare Workers AI (Stable Diffusion XL)
- **Image Processing**: Sharp for optimization
- **Storage**: IPFS (Pinata) for decentralized storage
- **Prompt Engineering**: Custom high-quality prompt templates

## Avatar Styles

### 1. Viral Gen-Z Creator

**Vibe**: Trendy, social media influencer aesthetic

**Positive Prompt**:
```
ultra stylish Gen-Z digital creator avatar, confident young influencer, sharp jawline, expressive eyes with subtle catchlights, trendy streetwear, luxury casual aesthetic, clean skin texture, modern social media profile picture, vibrant neon gradient background, cinematic rim lighting, soft glow effects, highly detailed face, symmetrical composition, centered portrait, face occupying 75% of frame, Instagram influencer aesthetic, TikTok creator vibe, modern digital art, premium branding, trending internet personality, vibrant colors, ultra sharp focus, masterpiece quality, highly detailed, social media avatar, professional creator identity, clean background, eye contact with viewer
```

**Negative Prompt**:
```
blurry, low quality, extra fingers, extra eyes, watermark, logo, text, ugly face, deformed anatomy, old fashioned clothing, dark shadows, low contrast, grainy, horror, creepy, dull colors, photobomb, multiple people
```

---

### 2. Professional Notion-Style

**Vibe**: Clean, minimalist, professional

**Positive Prompt**:
```
professional minimalist avatar, clean geometric design, soft pastel color palette, elegant simplicity, modern corporate aesthetic, friendly but professional expression, crisp lines, flat design style, subtle gradients, centered composition, high contrast, clean background, minimalist portrait, business professional, tech startup founder vibe, modern flat illustration, vector art style, sophisticated color scheme, soft shadows, balanced composition, eye contact, approachable yet professional, clean lines, geometric shapes, premium minimalist design
```

**Negative Prompt**:
```
realistic photo, photorealistic, messy, cluttered, dark colors, aggressive, angry expression, complex patterns, noise, grain, low resolution, cartoonish, childish, neon colors, chaotic, asymmetrical, distorted
```

---

### 3. Classic Bitmoji-Style

**Vibe**: Cartoon, expressive, fun

**Positive Prompt**:
```
expressive cartoon avatar, bitmoji style, friendly smile, vibrant colors, clean vector illustration, rounded features, expressive eyes, cartoon aesthetic, playful design, modern cartoon style, bold outlines, flat colors, cheerful expression, stylized portrait, cartoon character design, friendly approachable look, bright color palette, clean lines, animated style, social media cartoon avatar, fun personality, expressive facial features, cartoon illustration, vector art, bold colors, clean design
```

**Negative Prompt**:
```
realistic, photorealistic, 3D render, dark, gloomy, scary, creepy, distorted proportions, messy lines, low quality, blurry, watercolor, oil painting, realistic photo, hyperrealistic, uncanny valley
```

---

### 4. Elegant Lorelei-Style

**Vibe**: Feminine, soft, elegant

**Positive Prompt**:
```
elegant feminine avatar, soft delicate features, graceful expression, flowing hair, sophisticated style, pastel color palette, soft lighting, romantic aesthetic, feminine beauty, gentle smile, elegant portrait, refined design, soft gradients, delicate lines, graceful composition, modern feminine illustration, elegant fashion sense, soft focus, dreamy atmosphere, sophisticated color scheme, feminine charm, gentle curves, soft shadows, premium elegant design, refined beauty, graceful pose
```

**Negative Prompt**:
```
masculine features, harsh lines, dark colors, aggressive expression, cartoonish, childish, low quality, blurry, distorted, masculine, rough, gritty, dark shadows, harsh lighting, unrefined
```

---

### 5. Expressive Big Smile

**Vibe**: Friendly, warm, approachable

**Positive Prompt**:
```
warm friendly avatar, big genuine smile, approachable personality, bright cheerful expression, warm color palette, happy vibes, friendly face, welcoming presence, warm lighting, joyful expression, approachable design, cheerful portrait, friendly character, warm colors, soft lighting, inviting atmosphere, big smile, happy mood, warm welcome, friendly illustration, cheerful design, approachable aesthetic, warm welcome, happy vibes, friendly personality
```

**Negative Prompt**:
```
angry, sad, serious, stoic, cold, distant, unfriendly, dark colors, harsh expression, cold vibes, unapproachable, gloomy, serious, stern, cold colors, distant, unwelcoming
```

---

### 6. Cyberpunk Tech Style

**Vibe**: Futuristic, tech, neon

**Positive Prompt**:
```
futuristic cyberpunk avatar, neon colors, tech aesthetic, digital art style, glowing elements, cybernetic features, futuristic fashion, neon lighting, tech-savvy vibe, digital portrait, cyberpunk aesthetic, vibrant neon colors, glowing effects, futuristic design, tech-inspired, cybernetic enhancements, neon glow, digital art, cyberpunk style, futuristic technology, neon accents, tech fashion, cyber design, glowing features, futuristic portrait
```

**Negative Prompt**:
```
vintage, retro, old-fashioned, natural, organic, muted colors, traditional, rustic, natural lighting, earth tones, non-tech, traditional style, old world, classical, natural aesthetic
```

---

### 7. Luxury Fashion

**Vibe**: High-end, sophisticated, stylish

**Positive Prompt**:
```
luxury fashion avatar, high-end style, sophisticated elegance, premium aesthetic, designer fashion, refined taste, luxury brand vibe, elegant clothing, sophisticated expression, premium design, high-fashion aesthetic, luxury portrait, refined style, elegant fashion, premium quality, sophisticated color palette, luxury design, high-end fashion, elegant pose, refined aesthetic, premium luxury, sophisticated beauty, fashion-forward, luxury brand aesthetic
```

**Negative Prompt**:
```
casual, streetwear, cheap, low quality, basic, simple, budget, mass market, ordinary, plain, unsophisticated, basic design, low-end, cheap materials
```

---

### 8. Anime/Manga Style

**Vibe**: Japanese animation, vibrant, expressive

**Positive Prompt**:
```
anime style avatar, manga aesthetic, vibrant colors, expressive anime eyes, anime character design, Japanese animation style, vibrant hair, anime portrait, manga illustration, anime art style, expressive features, vibrant color palette, anime character, manga style, Japanese anime aesthetic, anime illustration, vibrant anime design, expressive anime face, anime character portrait, manga art, anime style illustration, vibrant anime colors
```

**Negative Prompt**:
```
realistic, photorealistic, western cartoon, 3D render, realistic photo, western style, non-anime, realistic art, photorealistic, western animation
```

---

## API Endpoints

### POST `/users/me/avatar` - Generate AI Avatar

**Authentication**: Required (JWT)

**Request Body**:
```json
{
  "style": "gen-z-creator" | "notion-style" | "bitmoji-style" | "lorelei-style" | "big-smile" | "cyberpunk" | "luxury-fashion" | "anime-style",
  "customPrompt": "string (optional - overrides style prompt)",
  "negativePrompt": "string (optional - overrides default negative prompt)",
  "width": 512 (optional, default: 512),
  "height": 512 (optional, default: 512),
  "steps": 30 (optional, default: 30),
  "seed": 12345 (optional, for reproducibility)
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "url": "https://ipfs.io/ipfs/Qm...",
    "ipfsHash": "Qm...",
    "width": 512,
    "height": 512,
    "style": "gen-z-creator",
    "prompt": "ultra stylish Gen-Z digital creator avatar...",
    "seed": 12345,
    "timestamp": 1686123456789
  }
}
```

---

### POST `/users/me/avatar/from-photo` - Generate Avatar from Photo

**Authentication**: Required (JWT)

**Request**: Multipart form data
- `photo`: Image file (JPEG, PNG, WebP) - Required
- `style`: Same as above - Optional
- `strength`: 0.5-1.0 (how much to follow the photo, default: 0.7)

**Response**: Same as above

---

### GET `/users/me/avatar/styles` - Available Styles

**Authentication**: Required (JWT)

**Response**:
```json
{
  "success": true,
  "data": {
    "styles": [
      {
        "id": "gen-z-creator",
        "name": "Viral Gen-Z Creator",
        "description": "Trendy social media influencer aesthetic",
        "prompt": "ultra stylish Gen-Z digital creator avatar...",
        "negativePrompt": "blurry, low quality, extra fingers..."
      },
      {
        "id": "notion-style",
        "name": "Professional Notion-Style",
        "description": "Clean, minimalist, professional",
        "prompt": "professional minimalist avatar...",
        "negativePrompt": "realistic photo, photorealistic..."
      }
    ]
  }
}
```

---

## Prompt Engineering Best Practices

### Quality Elements

**Always Include**:
- Style descriptor (cartoon, realistic, anime, etc.)
- Quality keywords (masterpiece, highly detailed, ultra sharp)
- Composition details (centered, symmetrical, face occupying 75%)
- Lighting (cinematic rim lighting, soft glow, vibrant)
- Mood/atmosphere (friendly, professional, elegant)
- Negative prompt to avoid artifacts

**Avoid**:
- Ambiguous descriptions
- Conflicting style instructions
- Overly complex prompts (under 200 words ideal)
- Generic terms without context

### Prompt Structure

```
[Style] + [Subject] + [Features] + [Clothing] + [Background] + [Lighting] + [Quality] + [Composition]
```

**Example**:
```
Style: professional minimalist avatar
Subject: confident young professional
Features: sharp jawline, expressive eyes, clean skin
Clothing: business casual attire
Background: soft pastel gradient
Lighting: soft studio lighting
Quality: highly detailed, ultra sharp, masterpiece
Composition: centered portrait, symmetrical
```

---

## Rate Limiting

| Endpoint | Limit | Window |
|----------|-------|--------|
| `/users/me/avatar` | 10 req | 1 hour |
| `/users/me/avatar/from-photo` | 5 req | 1 hour |

---

## Storage & IPFS

All generated avatars are stored on IPFS:
- **Primary Gateway**: `https://ipfs.io/ipfs/{hash}`
- **Pinata Gateway**: `https://gateway.pinata.cloud/ipfs/{hash}`
- **Hash Storage**: Database stores IPFS hashes for retrieval

---

## Error Handling

**Common Errors**:
- `400`: Invalid style or prompt format
- `400`: Image validation failed (invalid file type or size)
- `429`: Rate limit exceeded
- `500`: Cloudflare AI generation failed
- `502`: External service timeout

**Error Response Format**:
```json
{
  "error": "Error type",
  "message": "Detailed message",
  "details": {}
}
```

---

## Usage Examples

### Generate Gen-Z Creator Avatar

```bash
curl -X POST https://api.bae4u.com/users/me/avatar \
  -H "Authorization: Bearer {jwt}" \
  -H "Content-Type: application/json" \
  -d '{
    "style": "gen-z-creator",
    "width": 512,
    "height": 512,
    "steps": 30
  }'
```

### Generate Avatar from Photo

```bash
curl -X POST https://api.bae4u.com/users/me/avatar/from-photo \
  -H "Authorization: Bearer {jwt}" \
  -F "photo=@profile.jpg" \
  -F "style=notion-style" \
  -F "strength=0.7"
```

### Custom Prompt

```bash
curl -X POST https://api.bae4u.com/users/me/avatar \
  -H "Authorization: Bearer {jwt}" \
  -H "Content-Type: application/json" \
  -d '{
    "customPrompt": "professional tech founder avatar, clean minimalist design, modern aesthetic",
    "negativePrompt": "blurry, low quality, cartoonish",
    "width": 512,
    "height": 512
  }'
```

---

## Integration Notes

### Frontend Integration

**Generate Avatar**:
```typescript
const response = await fetch('/users/me/avatar', {
  method: 'POST',
  headers: { 
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    style: 'gen-z-creator',
    width: 512,
    height: 512
  })
});

const { data } = await response.json();
// data.url contains IPFS URL
```

**Upload Photo**:
```typescript
const formData = new FormData();
formData.append('photo', file);
formData.append('style', 'notion-style');
formData.append('strength', '0.7');

const response = await fetch('/users/me/avatar/from-photo', {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${token}` },
  body: formData
});
```

### Profile Integration

Generated avatars are automatically:
1. Stored in `users.avatar_ipfs_hash`
2. Used in NFT metadata generation
3. Displayed in profile cards
4. Used in hero card generation

---

## Performance Considerations

**Optimizations**:
- Redis caching for generated avatars (24h TTL)
- Image compression before IPFS upload
- CDN gateway for IPFS content
- Lazy loading in frontend

**Cost Management**:
- Rate limiting on AI generation
- Efficient prompt engineering
- Cloudflare Workers AI pricing optimization
- IPFS pinning for persistence

---

## Security Considerations

**Image Validation**:
- File type verification (MIME type check)
- File size limits (10MB max)
- Malicious file detection
- Sharp-based processing (safe image handling)

**Privacy**:
- No biometric data stored
- IPFS hashes only stored in database
- User can delete/regenerate avatars
- Prompt data not logged

---

## Support & Troubleshooting

**Common Issues**:

**Issue**: Avatar generation fails
**Solution**: Check Cloudflare API credentials, verify prompt format

**Issue**: IPFS upload fails
**Solution**: Check PINATA_JWT environment variable

**Issue**: Rate limit exceeded
**Solution**: Wait for window to expire

**Issue**: Poor quality output
**Solution**: Adjust prompt, increase steps parameter, try different style

---

## API Version Compatibility

- **Current Version**: v3.0.0
- **Breaking Changes**: Removed DiceBear, face analysis, sticker generation
- **New Features**: Cloudflare AI integration, advanced prompt engineering

---

## References

- **Cloudflare Workers AI**: https://developers.cloudflare.com/workers-ai/
- **Stable Diffusion XL**: https://stability.ai/
- **IPFS Documentation**: https://docs.ipfs.io/
- **Prompt Engineering Guide**: https://promptingguide.ai/
