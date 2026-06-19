# Bae4U — Complete User Flow & Feature Guide

> **Platform**: SocialFi dating app on Base Sepolia (testnet)  
> **Stack**: Flutter (mobile APK) + Next.js (web) · Fastify API · PostgreSQL · Redis · Base Sepolia blockchain  
> **Auth**: Sign-In with Ethereum (SIWE) — your wallet IS your account. No email, no password.  
> **Gas**: Zero for users — Coinbase Paymaster (ERC-4337) covers all gas fees.

---

## Table of Contents

1. [Onboarding & Authentication](#1-onboarding--authentication)
2. [Profile Setup](#2-profile-setup)
3. [Avatar Creation (Notion-Style Bitmoji)](#3-avatar-creation-notion-style-bitmoji)
4. [AI Avatar Generation](#4-ai-avatar-generation)
5. [Discover & Swiping](#5-discover--swiping)
6. [Matches & Chat](#6-matches--chat)
7. [Couple Cards](#7-couple-cards)
8. [Pets Game — Core Loop](#8-pets-game--core-loop)
9. [Pets Cash (PCASH) Economy](#9-pets-cash-pcash-economy)
10. [Rankings & Leaderboards](#10-rankings--leaderboards)
11. [Bae Cards (Fantasy Layer)](#11-bae-cards-fantasy-layer)
12. [Hero System & Tournaments](#12-hero-system--tournaments)
13. [Wallet & Fiat](#13-wallet--fiat)
14. [Admin / KYC](#14-admin--kyc)
15. [Screen Map](#15-screen-map)

---

## 1. Onboarding & Authentication

### Entry Point
- User lands on the **home/landing page** (`/` or Flutter launch screen)
- Sees hero section: *"Find Your Bae. On-Chain."*
- Two CTAs: **Connect Wallet** (to start) or **Browse Pets** (guest browse)

### Wallet Connection Flow
```
User taps "Connect Wallet"
  ↓
Wallet modal opens — choose:
  ├── MetaMask / WalletConnect (external wallet)
  ├── Coinbase Embedded Wallet (CDP — no seed phrase, invisible)
  └── Custodial wallet (auto-created by backend, invisible to user)
  ↓
GET /auth/nonce/:wallet  →  backend generates one-time nonce (5 min expiry)
  ↓
User signs SIWE message (wallet signs, not a blockchain tx)
  ↓
POST /auth/siwe  →  backend verifies signature + domain + chainId + nonce
  ↓
If NEW user:
  ├── Backend deployer mints PetsRegistry ERC-721 NFT (profile token)
  ├── PetsMarket.initPet() called — sets starting pet value
  └── User row created in DB with wallet address
  ↓
Returns: JWT (1 hour) + Refresh Token (30 days)
  ↓
User is logged in — redirected to /discover
```

### Session Management
- JWT stored in localStorage / secure storage
- Auto-refresh via refresh token
- `POST /auth/refresh` — get new JWT silently
- `POST /auth/logout` — invalidates refresh token

---

## 2. Profile Setup

### First-Time Setup (`/profile`)
After login, users should complete their profile:

| Field | Description |
|---|---|
| **Display Name** | Shown on cards and pet listings |
| **Bio** | Short description (shown on profile/discover cards) |
| **Country** | Used for country rankings + discovery filters |
| **Profile Photo** | Upload photo → pinned to IPFS via Pinata → `avatar_ipfs_hash` stored |
| **Age / Gender** | Used for matching and pet filters |

### Profile API Actions
- `GET /users/me` — fetch own profile
- `PATCH /users/me` — update display name, bio, country, gender, age
- `POST /users/me/photo` — upload profile photo (multipart) → IPFS
- `GET /users/:id` — view another user's public profile

### On-Chain Identity
- Each user has one **PetsRegistry NFT** (ERC-721) representing their profile
- NFT metadata includes: display name, avatar IPFS hash, value
- Viewable at: `GET /metadata/:tokenId`

---

## 3. Avatar Creation (Notion-Style Bitmoji)

> Deterministic, combinatorial cartoon avatar based on your face traits.  
> Powered by the Mayandev/notion-avatar SVG asset system.

### Generation Flow
```
User opens Avatar section → taps "Generate Notion Avatar"
  ↓
POST /users/me/bitmoji/generate  (multipart: photo upload)
  ↓
Backend pipeline:
  1. analyzeGenderFromImage()  →  detect gender (HuggingFace / fallback)
  2. extractVisualTraits()     →  skin tone, hair colour, glasses, beard,
                                  expression, ethnicity (pixel analysis)
  3. traitsToNotionConfig()    →  map traits → NotionAvatarConfig JSON
     {face, eye, eyebrow, nose, mouth, hair, beard, glass, accessory, detail, bgColor, shape}
  4. generateNotionSVG()       →  assemble SVG from 190 part files (1080×1080)
  5. rasterizeNotionSVG()      →  sharp → 512×512 PNG
  ↓
Config + SVG saved to DB (bitmoji_config, bitmoji_traits columns)
Returns: { config, svgString, pngBase64 }
```

### Customisation
- `PATCH /users/me/bitmoji` — send any NotionAvatarConfig fields to override
- `GET /users/:id/bitmoji.svg` — serve the raw SVG (for Flutter SVG widget)
- `POST /users/me/bitmoji/rasterize` — get PNG buffer at custom size

### NotionAvatarConfig Fields

| Key | Range | Description |
|---|---|---|
| `face` | 0–15 | Face shape |
| `eye` | 0–12 | Eye style |
| `eyebrow` | 0–14 | Eyebrow style |
| `nose` | 0–12 | Nose style |
| `mouth` | 0–18 | Mouth/expression |
| `hair` | 0–57 | Hairstyle |
| `beard` | 0–15 | Beard (0 = none) |
| `glass` | 0–13 | Glasses (0 = none) |
| `accessory` | 0–13 | Accessory (0 = none) |
| `detail` | 0–12 | Face detail |
| `bgColor` | hex | Background colour |
| `shape` | circle/square | Avatar container shape |

### Sticker Variants
The system generates 3 expression sticker variants automatically:
- 😊 `smile` — warm-smile mouth override
- 😐 `neutral` — neutral expression
- 😑 `serious` — serious expression

---

## 4. AI Avatar Generation

> Photo-realistic → stylized avatar using multiple AI providers.  
> Located at `/avatar` (web) or Avatar screen (Flutter).

### Flow
```
User opens /avatar
  ↓
Step 1 — Capture
  ├── Take photo with camera (live video → frame capture)
  └── Upload photo from device
  ↓
Step 2 — Choose Style
  ├── Comic         — expressive cartoon
  ├── Anime         — Studio Ghibli anime style
  ├── Cosmic        — surreal galactic art
  ├── Noir Glamour  — noir black-and-white
  ├── Fantasy Hero  — epic fantasy warrior
  └── Bitmoji Style — cartoon bitmoji
  ↓
Step 3 — Generate
  POST /users/me/avatar/kyc-frames  (multipart: frames[] + style)
  ↓
Backend provider waterfall (tries in order until success):
  1. Modal PuLID-FLUX      — face-preserving, highest quality
  2. Gemini 2.5 Flash      — Google identity-preserving image gen
  3. Replicate SDXL        — fal.ai / Replicate image gen
  4. HuggingFace SDXL      — self-hosted diffusion
  5. Cloudflare Workers AI — fastest fallback
  ↓
Returns: { imageBase64, provider, style, width, height }
  ↓
Avatar saved to IPFS + DB (avatar_ipfs_hash updated)
```

### Prompt Lab (`/prompt-lab`)
Advanced mode for power users:
- Custom positive/negative prompts
- Model selection (Cloudflare / HuggingFace)
- Adjustable steps (1–50) and guidance scale
- Saves last 12 generated results in session
- `POST /users/avatar/prompt-lab`

---

## 5. Discover & Swiping

### Screen: `/discover`
```
GET /matches/discover?limit=10&country=IN
  ↓
Backend: Pinecone vector similarity on personality_vector
  ├── Excludes already-interacted users
  ├── Excludes already-passed users
  └── Falls back to random sample if no vector stored
  ↓
Returns: { candidates: [{ id, display_name, age, country, avatar_ipfs_hash, pet_value, pcash }] }
```

### Swiping Actions

| Action | API | Result |
|---|---|---|
| ❤️ **Like** | `POST /matches/like` `{ targetId }` | Stores like; if mutual → **Match created** |
| 👋 **Pass** | `POST /matches/pass` `{ targetId }` | Stores pass; hidden from future discover |
| 🔁 **Refresh** | Re-call discover | Load next batch of candidates |

### Match Detection
- When two users mutually like each other → `isNewMatch: true` in response
- Match popup animates on screen
- Match record created in DB → appears in Matches tab
- Push notification sent (Expo push tokens)

### Country Filter
- Dropdown to filter by country code
- Calls `GET /matches/discover?country=XX`

---

## 6. Matches & Chat

### Screen: `/matches`
- Lists all mutual matches with last message preview + timestamp
- Tap a match → opens **ChatWindow**

### Chat (`ChatWindow`)
```
GET /messages/:matchId?limit=50&before=<cursor>
  ↓
Infinite scroll (pagination by cursor)
  ↓
User types message → POST /messages/:matchId { content }
  ↓
Push notification sent to other user (Expo)
  ↓
Messages update in real-time (polling or websocket)
```

### Message Features
- Text messages
- Message count tracked per match (needed for Couple Card eligibility)
- `10+ messages` in a match unlocks **Couple Card** minting

---

## 7. Couple Cards

> ERC-721 NFTs representing on-chain relationship status between two matched users.

### How to Mint
```
Requirement: 10+ messages exchanged in a match
  ↓
POST /couples/proof  { matchId }
  ↓
Backend verifies message count ≥ 10
Backend signs EIP-712 CoupleProof (backend private key)
Returns: { proof, deadline, partner1, partner2 }
  ↓
User calls CoupleCard.mintCouple(proof) on-chain
  (gasless via Pimlico paymaster)
  ↓
POST /couples/record  { txHash, matchId }  — records NFT in DB
```

### Couple Card NFT
- Both partners get the same ERC-721 token
- **0.75% royalty** per trade goes to each partner
- If users **unmatch**: `CoupleCard.burnCouple()` called → NFT destroyed
- `GET /couples/my` — list own couple cards
- `GET /couples/:id` — view couple card details

---

## 8. Pets Game — Core Loop

> Fantasy trading game where users buy/own/sell other members as virtual "pets."

### Overview
```
You browse Pets → buy a member (spend PCASH) → they appear in your Pets tab
Their value increases 10% each time they're bought
When someone buys YOUR pet: profit split 50/50 between you (owner) and the pet
You can own up to 400 pets simultaneously
```

### Pets Screen (`/pets`)
- Browse all members as buyable pets
- Filters: gender, age, country, value range
- Each card shows: avatar, name, current value, owner

### Core Pet Actions

#### Buy a Pet
```
POST /actions/buy/:tokenId
  ↓
Backend checks: user has enough PCASH, pet not locked
  ↓
routeRelay() → gasless tx via:
  1. CDP wallet → cdpCall()
  2. Pimlico ERC-4337 paymaster → UserOperation
  3. EOA fallback → ensureGasBalance() + submit
  ↓
PetsMarket.buy() on-chain:
  - +10% bonding curve on value (PRICE_MULT = 11000)
  - 2.5% platform fee deducted
  - 50/50 profit split: previous owner + pet profile
  ↓
pet_transactions recorded in DB
pets_state updated (hybrid on-chain mirror)
```

#### Lock a Pet
```
POST /actions/lock/:tokenId  { hours: 1–168 }
  ↓
PetsMarket.lockPet() on-chain
  ↓
Pet cannot be bought by others until lock expires
Max lock: 7 days (168 hours)
```

#### Gift Pets Cash
```
POST /actions/gift  { targetTokenId, amount }
  ↓
PetsMarket.giftCash() on-chain
  ↓
Limits: 10 gift transactions per 24 hours
Gifting raises the pet's value
```

#### Buy Again
```
Requirement: both you AND the pet are ranked
  ↓
POST /actions/buy/:tokenId  (while already owning)
  ↓
Pays only the value DIFFERENCE (delta between current and new value)
Profit split: owner + pet
```

### Pets Portfolio
- `GET /pets/portfolio/:wallet` — list all pets owned by a wallet
- `GET /pets/market?limit=20&offset=0` — browse all pets on the market
- `GET /pets/owned-by/:wallet` — pets someone currently owns

### Wish List
- Add a pet to your Wish List for later purchase
- `POST /pets/wishlist/:tokenId` — add to wish list
- `DELETE /pets/wishlist/:tokenId` — remove
- `GET /pets/wishlist` — view your wish list (max 500)
- Wishers: people who added YOU to their wish list
- `GET /pets/wishers` — see who wants to buy you

### Ghost Pets
- When a user deactivates their account → becomes a Ghost Pet
- Still tradeable, limited profile info shown
- `PATCH /users/me/deactivate` — deactivate account

### Value System
```
Starting value: set at PetsMarket.initPet()
Each purchase: +10% to value
Your net worth = PCASH balance + sum of all pet purchase prices you hold
```

---

## 9. Pets Cash (PCASH) Economy

> PCASH is the in-game currency used to buy pets.  
> On-chain ERC-20 token (PetsCash.sol) on Base Sepolia.

### How to Earn PCASH

| Source | Details |
|---|---|
| **Login Bonus** | Claim every 4 hours via `POST /bonus/claim` |
| **First 5 daily purchases** | Bonus PCASH awarded per purchase (first 5 per day) |
| **Pet bought** | When someone buys you: 50% of profit goes to you |
| **Your pet bought** | When someone buys one of your pets: 50% profit to you |
| **First Owner bonus** | Extra PCASH for being the first ever owner of a newly listed pet |
| **Gifts** | Other ranked players can gift you PCASH (10 tx/day limit) |
| **Gold conversion** | Convert Bae4u Gold → PCASH via `PetsCash.convertToGold()` |

### Claiming the Login Bonus
```
GET /bonus/status → { canClaim: true/false, nextClaimAt: "ISO datetime" }
  ↓
POST /bonus/claim
  ↓
Backend generates EIP-712 signed claim voucher
PetsCash.claimBonus(voucher) called on-chain (gasless)
4-hour cooldown starts
```

### PCASH Balance
- `GET /users/me` → includes `pcash_balance`
- On-chain: `PetsCash.balanceOf(wallet)`

### Assets Calculation
```
Assets = PCASH balance + Σ(purchase price of each pet currently owned)

Example:
  PCASH: $10,000
  Pet A: bought at $1,000
  Pet B: bought at $2,000
  Pet C: bought at $5,000
  ─────────────────────
  Total Assets: $18,000
```

---

## 10. Rankings & Leaderboards

### Ranking Eligibility
To appear on rankings, you must meet a **ratio requirement**:
- Minimum PCASH to pet value ratio (set by PetsRanking.sol)
- Keep some PCASH liquid — spending all on pets can knock you off rankings

### Leaderboard Types

| Type | Metric | Endpoint |
|---|---|---|
| **Assets** | Total PCASH + pet portfolio value | `GET /rankings/assets` |
| **Value** | Your own profile trade value | `GET /rankings/value` |
| **Country** | Rankings filtered by country | `GET /rankings?country=IN` |
| **Weekly Standings** | Rolling 7-day performance | `GET /rankings/weekly` |
| **Monthly Standings** | Rolling 30-day performance | `GET /rankings/monthly` |

### Badges
Top performers in weekly/monthly standings earn on-chain badge NFTs:

| Badge | Rank Requirement |
|---|---|
| 🏆 Master | Top 1% |
| 💎 Diamond | Top 5% |
| 🥇 Gold | Top 15% |
| 🥈 Silver | Top 30% |
| 🥉 Bronze | Top 50% |

- `GET /rankings/badges/:wallet` — view all earned badges
- `GET /rankings/snapshot` — latest rankings snapshot from DB

---

## 11. Bae Cards (Fantasy Layer)

> ERC-1155 collectible cards based on real user profiles. Four rarity tiers.

### Card Rarities

| Rarity | Colour | Relative Frequency |
|---|---|---|
| Common | Grey | Most frequent |
| Rare | Blue | Uncommon |
| Epic | Purple | Rare |
| Legend | Gold | Very rare |

### Card Packs
```
POST /cards/packs/buy  { quantity: 1 }
  ↓
BaeCardMarket.buyPack() on-chain
  ├── 5 cards per pack
  ├── Dynamic pack price (bonding curve)
  └── Cards assigned random rarity
  ↓
Returns: { cards: [{ tokenId, subject, rarity }] }
```

### Card Trading
```
POST /cards/buy/:tokenId
  ↓
BaeCardMarket.buy() on-chain:
  - +8% bonding curve
  - 1.5% royalty to the card's subject (the user depicted)
  - 2.5% platform fee
```

### Card Upgrading
```
POST /cards/upgrade  { cardIds: [id1, id2, id3] }
  ↓
Requirement: 3 cards of the SAME rarity
  ↓
BaeCardMarket.upgrade() on-chain:
  - Burns 3 same-rarity cards + PCASH fee
  - Mints 1 card of the next tier up
  - Common×3 → Rare
  - Rare×3 → Epic
  - Epic×3 → Legend
```

### Card Endpoints
- `GET /cards/my` — list your owned cards
- `GET /cards/market` — browse all cards for sale
- `GET /cards/subject/:userId` — cards depicting a specific user
- `GET /cards/:tokenId` — single card details

---

## 12. Hero System & Tournaments

### Hero Scores
Your weekly hero score is computed off-chain by the Oracle:

```
Score = matches×20 + messages×2 + likes×8 + pet_trades×15 + PCASH_earned×1
```

- Scores stored in `hero_scores` table
- Oracle runs weekly → submits Merkle root to `TournamentEngine.submitScores()`
- `GET /heroes/scores` — view current leaderboard
- `GET /heroes/my-score` — your own current week score

### Tournaments

#### Entry
```
POST /tournaments/enter  { deckCardIds: [5 card IDs] }
  ↓
Requirement: 5 Bae Cards selected
  ↓
TournamentEngine.lockDeck() on-chain
  - 10 PCASH entry fee
  - Deck locked for the tournament duration (weekly)
```

#### Scoring & Prize Claim
```
Weekly oracle runs → computes scores → submits Merkle root
  ↓
GET /tournaments/my-rank  →  { rank, score, merkleProof }
  ↓
POST /tournaments/claim
  ↓
TournamentEngine.claimPrize(merkleProof) on-chain
```

#### Prize Pool Distribution

| Position | Share |
|---|---|
| 1st place | 15% of prize pool |
| 2nd–5th | 4% each |
| 6th–20th | 1% each |
| 21st–100th | 0.3% each |

- `GET /tournaments/current` — current tournament details
- `GET /tournaments/history` — past tournaments + your results

---

## 13. Wallet & Fiat

### Wallet Types

| Type | Description | Gas |
|---|---|---|
| **Custodial EOA** | Auto-created by backend, AES-256-CBC encrypted key in DB | Backend pays |
| **Coinbase CDP** | Embedded wallet via Coinbase Developer Platform | Pimlico paymaster |
| **External** (MetaMask/WC) | User's own wallet — SIWE sign-in | User signs, backend relays |

### Transaction Relay (Invisible UX)
```
Any game action triggers routeRelay():
  1. CDP wallet? → cdpCall() (fully seamless)
  2. Pimlico API key set? → buildSmartAccountRelay() → UserOperation
     (ERC-4337, fully gasless for user)
  3. Fallback → ensureGasBalance() tops up from deployer → submit EOA tx
```

### External Wallet Flow (MetaMask)
```
POST /actions/buy/:tokenId (external wallet)
  ↓
Returns: { txSteps: [{ to, data, value }] }  (unsigned tx steps)
  ↓
User signs in wallet
  ↓
POST /actions/broadcast  { signedTx }
  ↓
Backend submits to chain
```

### Fiat On-Ramp
- `POST /fiat/checkout` — initiate fiat purchase (converts fiat → PCASH/Gold)
- `GET /fiat/history` — transaction history
- Powered by third-party payment processor (fiat_transactions table)

### Wallet Endpoints
- `GET /wallet/balance` — PCASH + ETH balance
- `GET /wallet/transactions` — on-chain tx history
- `POST /wallet/provision` — create/provision a CDP wallet

---

## 14. Admin / KYC

### KYC (Video)
```
POST /kyc/video-frames  (multipart: frames[])
  ↓
Liveness check + identity verification
  ↓
Updates: is_verified flag on user
```

- `GET /kyc/status` — check own verification status
- Verified users get ✓ badge on their profile cards

### Admin Routes (`/admin`)
- User management (ban, unban, verify)
- Platform fee withdrawal
- Oracle management (submit Merkle roots manually)
- Rankings snapshot trigger
- `GET /admin/stats` — platform-wide stats

---

## 15. Screen Map

### Web (`apps/web/app/`)

| Route | Screen | Auth Required |
|---|---|---|
| `/` | Landing page — hero, features, stats | No |
| `/discover` | Swipe cards — like/pass | Yes |
| `/pets` | Pet market — browse, buy, lock | Yes |
| `/matches` | Match list + chat | Yes |
| `/avatar` | AI avatar generation | Yes |
| `/prompt-lab` | Custom AI prompt lab | Yes |
| `/profile` | Own profile, portfolio, bonus, rankings | Yes |

### API Modules (`apps/api/src/routes/`)

| Module | Prefix | Key Functions |
|---|---|---|
| `auth.ts` | `/auth` | SIWE login, nonce, refresh, logout |
| `users.ts` | `/users` | Profile CRUD, avatar, bitmoji |
| `matches.ts` | `/matches` | Discover, like, pass |
| `messages.ts` | `/messages` | Chat CRUD |
| `pets.ts` | `/pets` | Market, portfolio, wishlist |
| `actions.ts` | `/actions` | Buy, lock, gift, broadcast |
| `bonus.ts` | `/bonus` | PCASH claim (4h cooldown) |
| `rankings.ts` | `/rankings` | Leaderboards, badges, snapshot |
| `heroes.ts` | `/heroes` | Hero scores, oracle |
| `cards.ts` | `/cards` | Bae Cards market, packs, upgrade |
| `tournaments.ts` | `/tournaments` | Enter, claim, history |
| `couples.ts` | `/couples` | Proof, record, list |
| `kyc.ts` | `/kyc` | Video KYC, verification status |
| `wallet.ts` | `/wallet` | Balance, provision, transactions |
| `fiat.ts` | `/fiat` | Fiat checkout, history |
| `images.ts` | `/images` | Serve profile images |
| `metadata.ts` | `/metadata` | NFT metadata (OpenSea compatible) |
| `admin.ts` | `/admin` | Admin panel |

### Smart Contracts (`sepolia/contracts/`)

| Contract | Standard | Role |
|---|---|---|
| `PetsRegistry.sol` | ERC-721 | One NFT per user profile |
| `PetsCash.sol` | ERC-20 | PCASH in-game currency |
| `PetsMarket.sol` | — | Core pet trading engine |
| `PetsRanking.sol` | — | On-chain ranking badges |
| `BaeCardRegistry.sol` | ERC-1155 | Collectible Bae Cards |
| `BaeCardMarket.sol` | — | Card trading + upgrades |
| `TournamentEngine.sol` | — | Weekly fantasy tournaments |
| `CoupleCard.sol` | ERC-721 | Relationship NFTs |

---

## Full User Journey (End-to-End)

```
1. LAND         → Visit bae4u app / web
2. CONNECT      → Connect wallet (MetaMask / Coinbase / custodial)
3. SIWE         → Sign message → JWT issued
4. PROFILE      → Set display name, bio, country, upload photo
5. AVATAR       → Generate Notion-style bitmoji OR AI avatar
6. DISCOVER     → Swipe through profiles (like / pass)
7. MATCH        → Mutual like → match created → push notification
8. CHAT         → Exchange 10+ messages → unlock Couple Card eligibility
9. COUPLE CARD  → Mint ERC-721 couple NFT (if both agree)
10. PETS        → Buy other users as pets (spend PCASH)
11. LOCK        → Lock valuable pets so others can't buy them
12. BONUS       → Claim PCASH every 4 hours (login bonus)
13. WISHLIST    → Add pets you want to buy later (max 500)
14. GIFT        → Gift PCASH to pets to raise their value
15. RANK        → Appear on Assets/Value leaderboards
16. BAE CARDS   → Buy packs, collect cards, upgrade rarities
17. TOURNAMENT  → Lock 5-card deck, earn weekly score, claim prize
18. KYC         → Complete video KYC for verified badge ✓
```

---

*Last updated: June 2026 · Bae4U v1.0 · Base Sepolia Testnet*
