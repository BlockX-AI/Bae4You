# Bae4U NFT Visual Identity System — Master Design Brief

**Project:** Bae4U SocialFi Dating Protocol — NFT Image Assets  
**Client:** Bae4U Development Team  
**Deliverable:** 10 static image assets for dynamic NFT generation  
**Format:** PNG with transparency, production-ready  
**Timeline:** Critical path — blocks NFT metadata launch  

---

## Executive Summary

Bae4U is a Web3-native dating protocol on Base L2 where social popularity has financial value. Users' profiles are tradable ERC-1155 assets, and a fantasy layer adds collectible card gameplay. We need 10 static image assets (card frames + achievement badges) that will be dynamically composed with user photos to generate NFT metadata.

**Design Challenge:** Create visual assets that:
- Feel premium and collectible (like rare trading cards)
- Appeal to Gen Z/Millennial dating app users
- Work across 4 rarity tiers with clear visual hierarchy
- Scale dynamically with user photos of varying quality
- Represent the intersection of social connection + blockchain ownership

---

## Brand Context & Design Philosophy

### Product Architecture
```
Layer 1: Dating App — Swipe, match, chat, own profiles as "pets"
Layer 2: Fantasy Bae — Collectible cards, tournaments, couple co-minting
```

### Core Gamification Mechanics
- **Rarity Multipliers:** Common (100x) → Rare (180x) → Epic (320x) → Legend (600x)
- **Hero Scoring:** Real app activity drives tournament performance
- **Couple Cards:** Co-minted after 10+ messages, burned on unmatch
- **Badge Tiers:** Bronze → Silver → Gold → Diamond → Master (leaderboard rewards)

### Target Audience
- **Primary:** Gen Z (18-27) — Web3-native, mobile-first, value ownership
- **Secondary:** Millennials (28-40) — Crypto-curious, premium dating
- **Psychographics:** Values authenticity, digital ownership, social status, gamification

### Brand Personality
- **Tone:** Playful but premium, social but sophisticated
- **Vibe:** Modern dating meets rare collectibles
- **Differentiation:** Not just another dating app — social popularity = financial value

---

## Visual Identity System

### Primary Color Palette
```
Indigo/Purple (Brand Primary): #6366f1
Gradient Range: #4f46e5 → #818cf8 → #a5b4fc

Supporting Colors:
- Common: Slate Grey (#64748b → #94a3b8)
- Rare: Electric Blue (#0ea5e9 → #38bdf8)
- Epic: Royal Purple (#7c3aed → #a78bfa)
- Legend: Lux Gold (#f59e0b → #fbbf24)
- Couple: Romantic Pink (#ec4899 → #f472b6)
```

### Design Principles
1. **Clarity Over Complexity:** Rarity must be instantly recognizable at glance
2. **Premium Aesthetic:** Avoid cartoonish or game-like elements — aim for luxury collectible feel
3. **Dynamic Compatibility:** Frames must work with any user photo quality
4. **Scalability:** Design should work at 400x400 but feel high-res
5. **Web3 Native:** Subtle blockchain cues (geometric patterns, hex motifs) without being overwhelming

### Visual References & Inspiration
- **Trading Cards:** Panini, Topps, NBA Top Shot (premium sports collectibles)
- **Gaming:** Hearthstone card frames, MTG rare card borders
- **Luxury:** Watch bezels, premium jewelry, championship belts
- **Web3:** Ethereum visual language, Base L2 branding, NFT marketplace aesthetics

---

## Technical Specifications

### File Requirements
| Asset Type | Dimensions | Format | Transparency | Center Area |
|------------|-----------|---------|--------------|-------------|
| Card Frames | 400x400 px | PNG | Full | 300x300 px circle/rounded square |
| Badge Images | 200x200 px | PNG | Full | N/A (solid badges) |
| Color Mode | RGB | 8-bit/channel | - | - |
| Resolution | 72 DPI minimum (150 DPI preferred) | - | - | - |

### Critical Technical Constraints
- **Transparent centers:** Card frames MUST have fully transparent center areas for photo insertion
- **Anti-aliasing:** Clean edges, no jagged pixels at transparency boundaries
- **Color profiles:** sRGB for web consistency
- **File size:** Under 500KB per asset for fast loading
- **Layer structure:** Single flattened layer (no editable layers needed)

---

## Asset Specifications

### Asset 1: Common Card Frame
**Filename:** `frame-common.png`  
**Rarity:** Entry-level (100x score multiplier)  
**Psychology:** Accessible, approachable, everyday premium

**Visual Direction:**
- Minimalist, clean, professional
- Slate grey metallic border with subtle gradient
- Thin, elegant lines (2-3px stroke width)
- Matte finish with very subtle sheen
- Geometric pattern: subtle hex grid or circuit lines (Web3 cue)
- No glow effects — understated sophistication

**Composition:**
- Border width: 50px outer, 40px inner
- Center: 300x300 px rounded square (20px corner radius)
- Corner accents: Small metallic dots at each corner
- Text area: 40px bottom strip for rarity label (optional)

**Color Palette:**
```
Outer border: #64748b (slate-500)
Inner border: #94a3b8 (slate-400)
Gradient: Linear 135deg, #64748b → #94a3b8
Highlight: #cbd5e1 (subtle top-left sheen)
```

**Expert AI Prompt (Gemini/DALL-E/Midjourney):**
```
A premium trading card frame with slate grey metallic border, 400x400 pixels, transparent center 300x300px rounded square with 20px corner radius, minimalist design, clean 2px lines, subtle hexagonal grid pattern in border, matte finish with soft sheen, professional sports card aesthetic, high quality PNG with perfect transparency, no glow effects, understated luxury, Web3 blockchain aesthetic
```

---

### Asset 2: Rare Card Frame
**Filename:** `frame-rare.png`  
**Rarity:** Elevated (180x score multiplier)  
**Psychology:** Special, energetic, worth collecting

**Visual Direction:**
- Electric blue neon with cyberpunk energy
- Glowing edges with light bloom effect
- Dynamic, tech-inspired patterns
- Circuit board or geometric tech motifs
- High contrast, eye-catching but not overwhelming

**Composition:**
- Border width: 55px outer, 45px inner (slightly wider than common)
- Center: 300x300 px rounded square
- Glow effect: 15px outer glow, soft blur
- Tech elements: Circuit lines, data streams, or geometric nodes
- Animated feel: Motion lines or energy particles (static design)

**Color Palette:**
```
Primary: #0ea5e9 (sky-500)
Secondary: #38bdf8 (sky-400)
Gradient: Linear 135deg, #0ea5e9 → #38bdf8 → #7dd3fc
Glow: #0ea5e9 with 40% opacity, 15px blur
Highlight: #e0f2fe (bright cyan accent)
```

**Expert AI Prompt:**
```
A premium trading card frame with electric blue neon border, 400x400 pixels, transparent center 300x300px rounded square, glowing edges with 15px soft light bloom, cyberpunk aesthetic, circuit board pattern in border, tech-inspired geometric elements, high contrast, dynamic energy particles, Web3 blockchain vibe, premium collectible card, PNG with perfect transparency, clean anti-aliased edges
```

---

### Asset 3: Epic Card Frame
**Filename:** `frame-epic.png`  
**Rarity:** Premium (320x score multiplier)  
**Psychology:** Exceptional, magical, highly coveted

**Visual Direction:**
- Royal purple with magical energy
- Ornate, elegant patterns
- Sparkle effects and star motifs
- Fantasy game aesthetic but premium
- Mystical, enchanting atmosphere

**Composition:**
- Border width: 60px outer, 50px inner (wider still)
- Center: 300x300 px rounded square
- Ornate details: Filigree, scrollwork, or star patterns
- Sparkles: 8-12 small star accents distributed evenly
- Soft glow: 20px outer glow with purple tint

**Color Palette:**
```
Primary: #7c3aed (violet-600)
Secondary: #a78bfa (violet-400)
Gradient: Linear 135deg, #7c3aed → #a78bfa → #c4b5fd
Glow: #7c3aed with 35% opacity, 20px blur
Accent: #f5d0fe (light lavender sparkle)
```

**Expert AI Prompt:**
```
A premium trading card frame with royal purple gradient border, 400x400 pixels, transparent center 300x300px rounded square, ornate elegant filigree patterns, magical sparkle effects with 8-12 star accents, soft 20px purple glow, fantasy game aesthetic but premium, mystical enchanting atmosphere, Web3 collectible card, PNG with perfect transparency, clean anti-aliased edges, luxury feel
```

---

### Asset 4: Legend Card Frame
**Filename:** `frame-legend.png`  
**Rarity:** Ultimate (600x score multiplier)  
**Psychology:** Legendary, prestigious, apex achievement

**Visual Direction:**
- Luxurious gold with ornate decoration
- Crown or trophy motifs
- Strong shine and reflection effects
- Championship belt or premium watch aesthetic
- Most visually impressive frame

**Composition:**
- Border width: 65px outer, 55px inner (widest)
- Center: 300x300 px rounded square
- Crown elements: 3 crown points at top or integrated into border
- Diamond/gem accents: 4-6 small gem-like reflections
- Strong shine: Multi-layered reflection (top-left highlight)
- Ornate patterns: Scrollwork, laurel wreaths, or trophy motifs

**Color Palette:**
```
Primary: #f59e0b (amber-500)
Secondary: #fbbf24 (amber-400)
Gradient: Linear 135deg, #f59e0b → #fbbf24 → #fcd34d
Highlight: #fef3c7 (bright gold reflection)
Shadow: #b45309 (deep gold shadow)
Accent: #ffffff (white sparkle points)
```

**Expert AI Prompt:**
```
A premium legendary trading card frame with luxurious gold metallic border, 400x400 pixels, transparent center 300x300px rounded square, ornate crown decorations at top, multi-layered shine reflections, 4-6 diamond gem accents, scrollwork or laurel wreath patterns, championship belt aesthetic, strongest visual impact, Web3 ultimate collectible, PNG with perfect transparency, clean anti-aliased edges, premium luxury feel
```

---

### Asset 5: Couple Card Frame
**Filename:** `frame-couple.png`  
**Type:** Relationship milestone NFT  
**Psychology:** Romantic, shared, commitment

**Visual Direction:**
- Heart-shaped or romantic border design
- Pink/red gradient with warmth
- Two-photo layout (side-by-side)
- Elegant, not cheesy or cartoonish
- Celebratory but sophisticated

**Composition:**
- Overall: 400x400 px
- Photo areas: Two 180x180 px rounded squares side-by-side with 20px gap
- Border: Heart-shaped border surrounding both photos
- Decorations: Subtle hearts, flowers, or romantic motifs
- Color: Pink to red gradient, soft and warm
- Vibe: Elegant wedding invitation meets modern dating

**Color Palette:**
```
Primary: #ec4899 (pink-500)
Secondary: #f472b6 (pink-400)
Gradient: Linear 180deg, #ec4899 → #f472b6 → #fda4af
Accent: #fce7f3 (soft pink highlight)
Warmth: #be185d (deep pink shadow)
```

**Expert AI Prompt:**
```
A romantic couple card frame with heart-shaped border design, 400x400 pixels, transparent center area for two photos side-by-side 180x180px each with 20px gap, pink to red gradient, elegant romantic atmosphere, subtle heart decorations, sophisticated not cheesy, warm celebratory vibe, wedding invitation aesthetic, Web3 relationship NFT, PNG with perfect transparency, clean anti-aliased edges
```

---

### Asset 6: Bronze Badge
**Filename:** `badge-1.png`  
**Tier:** Third place achievement  
**Psychology:** Achievement recognized, foundation level

**Visual Direction:**
- Bronze metallic trophy/medal design
- Simple, elegant, professional
- Number "3" or "III" subtly incorporated
- Olympic medal aesthetic
- Subtle shine, not flashy

**Composition:**
- Shape: Circular medal or trophy icon
- Size: 200x200 px
- Metallic finish: Bronze gradient with realistic metal texture
- Number: "III" or "3" subtly engraved or embossed
- Ribbon: Optional ribbon element at bottom (can be omitted)
- Background: Fully transparent

**Color Palette:**
```
Primary: #cd7f32 (standard bronze)
Secondary: #b87333 (darker bronze)
Highlight: #e5a96e (bronze shine)
Shadow: #8b5a2b (bronze shadow)
Gradient: Radial, #cd7f32 → #b87333
```

**Expert AI Prompt:**
```
A bronze achievement badge medal, 200x200 pixels, circular trophy design, metallic bronze finish with realistic texture, number III subtly engraved in center, Olympic third place aesthetic, simple elegant professional, subtle shine not flashy, PNG with fully transparent background, clean anti-aliased edges, high quality metallic rendering
```

---

### Asset 7: Silver Badge
**Filename:** `badge-2.png`  
**Tier:** Second place achievement  
**Psychology:** High achievement, near the top

**Visual Direction:**
- Silver metallic trophy/medal design
- Clean, modern, bright
- Number "2" or "II" prominently displayed
- Olympic medal aesthetic
- Bright shine, reflective

**Composition:**
- Shape: Circular medal or trophy icon
- Size: 200x200 px
- Metallic finish: Silver gradient with high reflectivity
- Number: "II" or "2" prominently displayed
- Ribbon: Optional ribbon element at bottom
- Background: Fully transparent

**Color Palette:**
```
Primary: #c0c0c0 (standard silver)
Secondary: #e8e8e8 (bright silver)
Highlight: #ffffff (white reflection)
Shadow: #a0a0a0 (silver shadow)
Gradient: Radial, #c0c0c0 → #e8e8e8 → #ffffff
```

**Expert AI Prompt:**
```
A silver achievement badge medal, 200x200 pixels, circular trophy design, metallic silver finish with high reflectivity, number II prominently displayed in center, Olympic second place aesthetic, clean modern bright, strong shine reflections, PNG with fully transparent background, clean anti-aliased edges, premium metallic rendering
```

---

### Asset 8: Gold Badge
**Filename:** `badge-3.png`  
**Tier:** First place achievement  
**Psychology:** Top achievement, champion status

**Visual Direction:**
- Gold metallic trophy/medal design
- Premium, celebratory, prestigious
- Number "1" or "I" prominently displayed
- Olympic gold medal aesthetic
- Strong shine, celebratory feel

**Composition:**
- Shape: Circular medal or trophy icon
- Size: 200x200 px
- Metallic finish: Rich gold gradient with strong shine
- Number: "I" or "1" prominently displayed
- Ribbon: Optional ribbon element at bottom
- Background: Fully transparent

**Color Palette:**
```
Primary: #ffd700 (standard gold)
Secondary: #ffc125 (bright gold)
Highlight: #fffacd (gold reflection)
Shadow: #b8860b (gold shadow)
Gradient: Radial, #ffd700 → #ffc125 → #fffacd
```

**Expert AI Prompt:**
```
A gold achievement badge medal, 200x200 pixels, circular trophy design, metallic gold finish with rich gradient, number I prominently displayed in center, Olympic first place aesthetic, premium celebratory prestigious, strong shine reflections, champion status, PNG with fully transparent background, clean anti-aliased edges, luxury metallic rendering
```

---

### Asset 9: Diamond Badge
**Filename:** `badge-4.png`  
**Tier:** Ultra-premium achievement  
**Psychology:** Exceptional, beyond first place

**Visual Direction:**
- Crystal diamond design
- Sparkling light effects, prism reflections
- Geometric faceted appearance
- Luxury jewelry aesthetic
- Rainbow light refractions

**Composition:**
- Shape: Diamond or gemstone icon
- Size: 200x200 px
- Crystal finish: Transparent with light refractions
- Facets: Geometric diamond cut pattern
- Sparkles: Light reflection points
- Rainbow: Subtle prism rainbow effects
- Background: Fully transparent

**Color Palette:**
```
Primary: Transparent crystal with white base
Reflections: #ffffff (white light)
Rainbow: Subtle #ff0000 → #ffff00 → #00ff00 → #0000ff
Facets: Multiple light/dark facets for 3D effect
```

**Expert AI Prompt:**
```
A diamond achievement badge, 200x200 pixels, crystal diamond shape with geometric faceted cut, sparkling light effects with multiple reflection points, prism rainbow refractions, luxury jewelry aesthetic, transparent crystal finish with realistic light rendering, PNG with fully transparent background, clean anti-aliased edges, premium gemstone quality
```

---

### Asset 10: Master Badge
**Filename:** `badge-5.png`  
**Tier:** Ultimate achievement  
**Psychology:** Legendary, apex of achievement

**Visual Direction:**
- Crown and star design
- Rainbow or aurora gradient
- Ultimate achievement indicator
- Legendary game aesthetic
- Most prestigious badge

**Composition:**
- Shape: Crown with star or elaborate trophy
- Size: 200x200 px
- Crown elements: 3-5 crown points
- Star: Central star or "MASTER" text
- Gradient: Rainbow or aurora borealis effect
- Effects: Multiple layers, glow, shine
- Background: Fully transparent

**Color Palette:**
```
Rainbow Gradient: #ff0000 → #ff7f00 → #ffff00 → #00ff00 → #0000ff → #8b00ff
Crown: Gold #ffd700 with rainbow reflections
Star: White #ffffff with glow
Glow: Rainbow tint with 25px blur
```

**Expert AI Prompt:**
```
A master achievement badge with crown and star design, 200x200 pixels, 5-point crown with central star, rainbow aurora gradient across entire badge, ultimate achievement indicator, legendary game aesthetic, multiple effect layers with glow and shine, most prestigious badge, PNG with fully transparent background, clean anti-aliased edges, apex achievement quality
```

---

## AI Image Generation Strategy

### Recommended Tools & Workflows

#### Option A: Gemini (Google) — Best for Consistency
**Strengths:** Excellent at following detailed prompts, consistent style, free tier available  
**Workflow:**
1. Use the expert prompts above
2. Generate 4 variations per asset
3. Select best, refine with follow-up prompts
4. Upscale to 400x400 or 200x200 as needed
5. Export as PNG with transparency

**Refinement Prompts:**
- "Make the border thinner, more elegant"
- "Add more subtle glow, reduce intensity"
- "Increase metallic shine, make it look more realistic"
- "Make the center transparency cleaner, no artifacts"

#### Option B: DALL-E 3 (OpenAI) — Best for Quality
**Strengths:** Highest quality output, excellent at complex compositions  
**Workflow:**
1. Use expert prompts above
2. Generate 2 variations per asset (limit due to cost)
3. Use ChatGPT to refine prompts iteratively
4. Upscale and export as PNG

**Cost Consideration:** ~$0.04 per image, budget ~$0.40 for all 10 assets

#### Option C: Midjourney — Best for Artistic Quality
**Strengths:** Stunning artistic results, great for creative interpretation  
**Workflow:**
1. Use expert prompts with Midjourney parameters
2. Add parameters: `--ar 1:1 --style raw --no text --v 6`
3. Generate grid, upscale best variations
4. Remove background in post-processing
5. Export as PNG

**Example Midjourney Prompt:**
```
A premium trading card frame with slate grey metallic border, transparent center 300x300px rounded square, minimalist design, clean lines, subtle hexagonal grid pattern, matte finish, professional sports card aesthetic --ar 1:1 --style raw --no text --v 6
```

#### Option D: Stable Diffusion — Best for Cost Control
**Strengths:** Free, unlimited generations, full control  
**Workflow:**
1. Use expert prompts with ControlNet for precision
2. Use SDXL model for best quality
3. Generate 10+ variations per asset
4. Use img2img for refinements
5. Export as PNG

**Recommended Model:** SDXL Base 1.0 + Refiner

---

## Quality Assurance Checklist

### Pre-Delivery Review
Before final delivery, verify each asset:

**Technical Requirements:**
- [ ] Exact dimensions (400x400 for frames, 200x200 for badges)
- [ ] PNG format with full transparency
- [ ] sRGB color profile
- [ ] File size under 500KB
- [ ] No compression artifacts or banding

**Visual Requirements:**
- [ ] Center transparency is clean (no stray pixels)
- [ ] Anti-aliased edges are smooth
- [ ] Color palette matches specifications
- [ ] Rarity hierarchy is visually clear
- [ ] Design feels premium, not cartoonish
- [ ] Works with both light and dark user photos

**Brand Alignment:**
- [ ] Consistent design language across all assets
- [ ] Web3 cues are subtle, not overwhelming
- [ ] Feels appropriate for Gen Z/Millennial dating app
- [ ] Balances social + collectible aesthetics

### Testing Protocol
After delivery, test with real user photos:

1. **Photo Variety Test:** Compose with 10+ different user photos (various skin tones, lighting, backgrounds)
2. **Contrast Test:** Ensure frame is visible against both light and dark photos
3. **Scale Test:** Verify looks good at 400x400 and scaled down to 200x200
4. **Transparency Test:** Check center area is fully transparent in image editor
5. **File Load Test:** Verify fast loading in browser (under 100ms)

---

## Delivery Format

### File Naming Convention
```
apps/api/public/images/
├── frames/
│   ├── frame-common.png
│   ├── frame-rare.png
│   ├── frame-epic.png
│   ├── frame-legend.png
│   └── frame-couple.png
└── badges/
    ├── badge-1.png
    ├── badge-2.png
    ├── badge-3.png
    ├── badge-4.png
    └── badge-5.png
```

### Delivery Package
Include with final delivery:
- All 10 PNG files in correct directories
- Source files (if using manual design tools)
- Generation prompts used (for AI tools)
- Any variation files generated during process
- Brief notes on design decisions

---

## Post-Delivery Integration

After asset delivery, the development team will:

1. **Place files** in `apps/api/public/images/` directories
2. **Test endpoints:** 
   - `GET /metadata/:tokenId.json`
   - `GET /cards/:rarity/:tokenId.json`
   - `GET /badges/:id`
   - `GET /couples/:tokenId.json`
3. **Verify image composition** with real user photos
4. **Test caching** (Redis TTL: 24 hours)
5. **Performance test** (target: <100ms per image generation)

---

## Questions & Collaboration

If any aspect of this brief is unclear, please ask before starting:

**Design Questions:**
- Should card frames include rarity labels (text)?
- Should badges include ribbon elements or be medal-only?
- Any preference for geometric vs. ornate patterns?
- Should Web3/blockchain cues be more or less subtle?

**Technical Questions:**
- Any specific AI tool preference?
- Budget constraints for paid AI generation?
- Timeline flexibility for iterations?
- Need for source files (PSD, Figma, etc.)?

**Brand Questions:**
- Any existing brand assets to reference?
- Competitor designs to emulate or avoid?
- Specific cultural considerations for global audience?

---

## Approval Process

1. **Initial Draft Review:** Submit 2-3 variations of each asset for feedback
2. **Refinement Round:** Incorporate feedback, generate refined versions
3. **Final Review:** Submit final assets for sign-off
4. **Delivery:** Provide final files in specified format
5. **Integration Support:** Available for minor adjustments during integration

---

## Contact & Timeline

**Design Lead:** [Your contact information]  
**Technical Lead:** [Developer contact for integration questions]  
**Target Delivery:** [Date]  
**Review Schedule:** [Dates for draft, refinement, final reviews]

---

*This brief was created with input from top-tier design principles used at OpenAI, Google, and Apple, adapted for the Web3 SocialFi dating context. The goal is to create visual assets that feel premium, collectible, and perfectly aligned with the Bae4U brand identity.*
