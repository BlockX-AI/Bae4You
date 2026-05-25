# Bae4U Backend — Complete NFT Architecture

> Last updated: May 2026 | Network: Base Sepolia → Base Mainnet (planned)

---

## 1. Overview — What NFT Assets Exist?

Bae4U has **5 distinct NFT/token assets** on-chain. Every one is served, tracked, and
mediated by the Fastify API (`apps/api`).

| Asset | Contract | Standard | Who Mints | Purpose |
|---|---|---|---|---|
| **Profile Pet** | `PetsRegistry` | ERC-721 | Backend (auto on register) | Tradeable social identity |
| **PCASH Token** | `PetsCash` | ERC-20 | Contract (claim/trade events) | In-app currency |
| **Bae Card** | `BaeCardRegistry` | ERC-721 | Admin/Oracle | Hero card NFT (4 rarities) |
| **Couple Card** | `CoupleCard` | ERC-721 | User (backend-signed proof) | Relationship NFT |
| **Creator Pass** | Custom SFT | ERC-1155 | Creator | Subscription pass |

---

## 2. Smart Contract → API Mapping

```
Smart Contract                   API Route File            DB Table
─────────────────────────────────────────────────────────────────────────
PetsRegistry.mintProfile()    →  routes/actions.ts         users.token_id
PetsMarket.buy()              →  routes/actions.ts         pets_state, pet_transactions
PetsMarket.lockPet()          →  routes/actions.ts         pets_state.is_locked
PetsMarket.giftCash()         →  routes/actions.ts         (event-synced)
PetsCash (ERC-20)             →  routes/wallet.ts          (live RPC query)
BaeCardRegistry.mintCard()    →  routes/cards.ts           bae_cards, card_states
BaeCardMarket.buyCard()       →  routes/cards.ts           card_states
CoupleCard.mintCouple()       →  routes/couples.ts         couple_cards
TournamentEngine              →  routes/tournaments.ts     tournaments, tournament_decks
PetsRanking                   →  routes/rankings.ts        rankings_snapshot
```

---

## 3. Deep Dive: Each NFT Asset

---

### 3.1 Profile Pet (PetsRegistry ERC-721)

**What is it?**  
Every user who registers gets a Profile Pet NFT. It's their tradeable on-chain identity —
like Friend.tech shares but for dating.

**How price works:**
- Price starts low, increases with each purchase (bonding curve)
- `profit_to_pet_wei` → flows back to the subject of the Pet  
- `profit_to_seller_wei` → flows to current owner

**Backend flow:**
```
User registers (POST /auth/register)
  → createCustodialWallet() or CDP wallet
  → PetsRegistry.mintProfile(userWallet, startingPrice)
  → tx confirmed → INSERT INTO users (token_id = ...)
  → INSERT INTO pets_state (...)
```

**Buying a Pet (Invisible UX):**
```
POST /actions/buy/:tokenId
  → routeRelay() checks wallet_type
  │
  ├── custodial: relayBuyPet() → getCustodialSigner() → market.buy(tokenId)
  ├── ERC-4337:  buildSmartAccountRelay() via Pimlico (gasless)
  ├── CDP:       cdpRelayBuyPet() via Coinbase CDP SDK
  └── external:  throws ExternalWalletError → returns unsigned TxSteps to sign in-app
```

**DB Tables touched:**
- `pets_state` — mirrors `PetsMarket.states(tokenId)` (owner, price, lock)
- `pet_transactions` — every `PetPurchased` event indexed by `pets-sync.worker.ts`
- `wish_list` — users can wishlist pets before buying

**Metadata endpoint:** `GET /metadata/:tokenId.json`
```json
{
  "name": "Prakhar #42",
  "description": "A Bae4U profile NFT — tradeable social identity on Base.",
  "image": "https://gateway.pinata.cloud/ipfs/<ai_art_ipfs_hash OR avatar_ipfs_hash>",
  "attributes": [
    { "trait_type": "Art Style", "value": "Spider-Verse AI Art" },
    { "trait_type": "Verified",  "value": true }
  ]
}
```
> **Image priority:** `ai_art_ipfs_hash` → `avatar_ipfs_hash` → fallback generated URL

---

### 3.2 PCASH Token (PetsCash ERC-20)

**What is it?**  
The native currency of the Bae4U economy. Used for:
- Buying Pets
- Gifting to Pets (`giftCash`)
- Tournament entry fees
- Upgrading Bae Cards (PCASH sink)
- Unlocking locks on Pets

**Backend flow:**
```
GET /wallet/balance
  → ethers.Contract(PETS_CASH_ADDRESS).balanceOf(userWallet)
  → returns { pcash: { wei, formatted } }
```

**Claiming PCASH:**  
Backend signs EIP-712 `PetsCashClaim` struct → user submits to `PetsCash.claim()`

**DB note:** PCASH balance is read live from chain (no DB cache). Trade profits are  
indexed in `pet_transactions.profit_to_pet_wei` for analytics.

---

### 3.3 Bae Cards (BaeCardRegistry ERC-721)

**What is it?**  
Hero cards featuring top users. 4 rarity tiers tied to platform activity scores.
Other users can collect/trade them.

**Rarity system (cards.ts RARITY_MULTIPLIERS):**
```
common  → 100× score multiplier  |  50 PCASH floor price
rare    → 180× score multiplier  | 100 PCASH floor price
epic    → 320× score multiplier  | 150 PCASH floor price
legend  → 600× score multiplier  | 200 PCASH floor price
```

**Minting flow:**
```
POST /cards/mint (admin only)
  → validate subjectAddress + rarity
  → BaeCardRegistry.mintCard(subjectAddress, rarityIndex)
  → tx confirmed → event CardMinted(tokenId)
  → INSERT INTO bae_cards (token_id, subject_address, rarity, tx_hash)
  → INSERT INTO card_states (token_id, owner_address, current_price_wei)
```

**How rarity is earned:**
```
GET /heroes/leaderboard (hero-oracle.ts)
  → computeHeroScores() queries:
     matches × 20pts + messages × 2pts + likes × 8pts
     + pet_trades × 15pts + PCASH_earned × 1pt
  → top scorers get higher rarity cards
```

**Hero Card Image (being built):**
```
hero-card-generator.ts (SVG + Sharp)
  → generateHeroCard({ avatarBuffer, displayName, rarity })
  → SVG frame (crown/flame/crystal/stars per rarity)
  → Composite circular avatar via Sharp
  → PNG → uploadToIPFS() → stored in bae_cards.card_image_hash (TODO)
```

**Card metadata endpoint:** `GET /cards/:rarity/:tokenId.json`  
> ⚠️ Currently returns placeholder. Needs DB fetch wired up.

**Trading:**
```
GET /cards/buyTxData/:tokenId
  → returns unsigned tx for BaeCardMarket.buyCard()
  → frontend signs + broadcasts
  → POST /cards/sync (TODO) records new owner
```

---

### 3.4 Couple Cards (CoupleCard ERC-721)

**What is it?**  
A romantic NFT minted when two matched users exchange at least **10 messages**.
It commemorates the connection. Burned if they unmatch.

**Minting flow (backend-signed proof):**
```
POST /couples/proof  (user requests proof)
  → verify match status = 'matched'
  → verify message_count >= 10
  → sign EIP-712 CoupleProof { userA, userB, matchId, timestamp }
  → return { proof: { sig, userA, userB, matchId, timestamp } }

User calls CoupleCard.mintCouple(proof, sig) on-chain

POST /couples/record  (user reports back after tx confirms)
  → INSERT INTO couple_cards (match_id, token_id_a, token_id_b, tx_hash)
```

**Burning:**
```
DELETE /couples/:matchId
  → UPDATE couple_cards SET is_active=false, burned_at=NOW()
  → (actual on-chain burn not yet triggered — TODO)
```

**Metadata endpoint:** `GET /couples/:tokenId.json`  
> ⚠️ Currently returns placeholder. Needs couple data from DB.

---

### 3.5 Fantasy Cards

**What is it?**  
Used in the Fantasy Tournament system. Players lock 5 cards into a deck and compete
for weekly prizes based on their cards' real-world performance scores.

**DB Tables:**
- `fantasy_cards` — same as bae_cards but separate table (rarity 0-3)
- `tournaments` — weekly tournaments with prize pool
- `tournament_participants` — player deck (5 card_ids array)

---

## 4. Avatar → NFT Pipeline

This is the complete journey of a user's image to their NFT:

```
1. User uploads photo
   POST /users/me/avatar
   └── uploadToIPFS(buffer) → Pinata → CID stored in users.avatar_ipfs_hash

2. AI Art Generation (optional, premium)
   POST /users/me/avatar/ai-art
   └── generateAiAvatar(photo, gender)
       ├── fal.ai flux-lora-portrait (~$0.03, best quality)
       └── HuggingFace FLUX.1-schnell (free fallback)
   └── uploadToIPFS() → CID stored in users.ai_art_ipfs_hash

3. Bitmoji/DiceBear Avatar
   POST /bitmoji/generate
   └── analyzeFaceFromImage() — Sharp pixel sampling (gender, skin, hair)
   └── generateAvatar() — DiceBear API v7
   └── generateStickerPack() — Canvas-based stickers
   └── uploadToIPFS() → CID stored in users.avatar_ipfs_hash

4. Hero Card Generation (being built)
   POST /users/me/hero-card (planned)
   └── generateHeroCard({ avatarBuffer, displayName, rarity })
       └── SVG frame per rarity (crown/flame/crystal/stars)
       └── Sharp.composite(circularAvatar)
   └── uploadToIPFS() → CID stored in bae_cards.card_image_hash (TODO)

5. Metadata served on-chain
   GET /metadata/:tokenId.json
   └── priority: ai_art_ipfs_hash → avatar_ipfs_hash → fallback URL
```

---

## 5. Wallet Architecture (3 Modes)

Every NFT action routes through one of three wallet paths:

```
wallet_type = 'custodial'     → Backend holds encrypted private key
                               → getCustodialSigner() decrypts + signs
                               → Pimlico ERC-4337 paymaster (gasless) preferred
                               → Platform gas sponsorship (fallback)

wallet_type = 'cdp'           → Coinbase Developer Platform SDK
                               → cdpRelayBuyPet() / cdpRelayLockPet() etc.

wallet_type = 'self_custody'  → throws ExternalWalletError
                               → API returns unsigned TxSteps
                               → Frontend (MetaMask / WalletConnect) signs
```

**Gas Strategy (tx-relay.ts):**
```
1st priority: Pimlico ERC-4337 Paymaster → PIMLICO_API_KEY set → fully gasless
2nd priority: ensureGasBalance() → deployer tops up user wallet with ETH
```

---

## 6. IPFS Storage (Pinata)

All NFT images and metadata are stored on IPFS via Pinata:

```
services/ipfs.ts
  uploadToIPFS(buffer, filename, mimeType) → POST Pinata API → returns CID
  ipfsGatewayUrl(cid) → "https://gateway.pinata.cloud/ipfs/<cid>"

Where CIDs are stored in DB:
  users.avatar_ipfs_hash     → regular photo/bitmoji avatar
  users.ai_art_ipfs_hash     → AI-generated art (Spider-Verse style)
  bae_cards.card_image_hash  → hero card PNG (TODO: column not yet added)
  couple_cards (no hash yet) → TODO
```

**Required env:** `PINATA_JWT`

---

## 7. NFT Metadata Endpoints Summary

| Endpoint | NFT | Status | Image Source |
|---|---|---|---|
| `GET /metadata/:tokenId.json` | Profile Pet | ✅ Live | ai_art_ipfs_hash → avatar_ipfs_hash |
| `GET /cards/:rarity/:tokenId.json` | Bae Card | ⚠️ Placeholder | Static URL (TODO: DB fetch) |
| `GET /badges/:id` | Badge (1-5) | ✅ Live | Static URL |
| `GET /couples/:tokenId.json` | Couple Card | ⚠️ Placeholder | Static URL (TODO: DB fetch) |

---

## 8. Event Sync Workers

On-chain events are indexed into DB by background workers:

```
workers/pets-sync.worker.ts
  → listens for PetPurchased events from PetsMarket
  → upserts pets_state (owner, price)
  → inserts pet_transactions

workers/ranking.worker.ts
  → runs computeHeroScores() weekly
  → upserts hero_scores table
  → updates rankings_snapshot with badge_tier
```

---

## 9. What's Connected — Full Dependency Map

```
               ┌─────────────────────────────────────────┐
               │             FASTIFY API                  │
               │                                          │
  User Photo ──► /users/me/avatar        ──► Pinata IPFS  ──► users.avatar_ipfs_hash
  User Photo ──► /users/me/avatar/ai-art ──► fal.ai/HF   ──► users.ai_art_ipfs_hash
               │                                          │
  Register   ──► /auth/register          ──► PetsRegistry ──► users.token_id
  Buy Pet    ──► /actions/buy/:id        ──► PetsMarket   ──► pets_state + pet_txns
  Lock Pet   ──► /actions/lock/:id       ──► PetsMarket   ──► pets_state.is_locked
  Gift PCASH ──► /actions/gift/:id       ──► PetsCash     ──► (event-synced)
  Balance    ──► /wallet/balance         ──► PetsCash RPC
               │                                          │
  Admin Mint ──► /cards/mint             ──► BaeCardRegistry ──► bae_cards
  Buy Card   ──► /cards/buyTxData/:id    ──► BaeCardMarket   ──► card_states
               │                                          │
  10 msgs    ──► /couples/proof          ──► EIP-712 sig  ──► CoupleCard.mintCouple()
  After mint ──► /couples/record         ──────────────────► couple_cards
               │                                          │
  Hero Score ──► /heroes/leaderboard     ──► hero-oracle  ──► hero_scores
  Card Art   ──► hero-card-generator.ts  ──► SVG+Sharp    ──► (→ IPFS, planned)
               │                                          │
  NFT View   ──► /metadata/:tokenId.json ──► IPFS gateway ──► OpenSea/Wallet
               └─────────────────────────────────────────┘
```

---

## 10. Pending / Incomplete Items

| Item | File | Status | Priority |
|---|---|---|---|
| Hero card image stored in DB | `bae_cards` | ❌ Column missing | High |
| Hero card IPFS upload after generation | `routes/cards.ts` | ❌ Not wired | High |
| Bae Card metadata from DB | `routes/metadata.ts` line 76 | ⚠️ TODO comment | High |
| Couple card metadata from DB | `routes/metadata.ts` line 142 | ⚠️ TODO comment | Medium |
| On-chain couple card burn trigger | `routes/couples.ts` line 174 | ⚠️ DB only, no tx | Medium |
| Hero card generator (Canvas→SVG+Sharp) | `services/hero-card-generator.ts` | 🔧 In progress | High |
| BaeCard event sync worker | No worker exists | ❌ Missing | High |
| Creator passes route | No route file | ❌ Missing | Low |
| Fantasy cards metadata endpoint | No endpoint | ❌ Missing | Medium |

---

## 11. Required Environment Variables (NFT-related)

```env
# Chain
BASE_SEPOLIA_RPC_URL=
CHAIN_ID=84532
DEPLOYER_PRIVATE_KEY=        # mints Profile Pets + Bae Cards
SIGNER_PRIVATE_KEY=          # signs CoupleCard EIP-712 proofs

# Contracts (stored in kv_store DB table after deploy)
PETS_REGISTRY_ADDRESS=
PETS_MARKET_ADDRESS=
PETS_CASH_ADDRESS=
BAE_CARD_MARKET_ADDRESS=
COUPLE_CARD_ADDRESS=

# Storage
PINATA_JWT=                  # IPFS uploads for all NFT images

# AI Avatar (for Profile NFT image)
FAL_KEY=                     # fal.ai (~$0.03/image, best quality)
HUGGINGFACE_TOKEN=           # free fallback (FLUX.1-schnell)

# Gasless transactions
PIMLICO_API_KEY=             # ERC-4337 paymaster (fully gasless for users)
```

---

## 12. Quick Reference: API Calls for NFT Actions

```bash
# Get my wallet + PCASH balance
GET /wallet/balance

# Buy a Pet (gasless for custodial users)
POST /actions/buy/:tokenId

# Get my Profile NFT metadata
GET /metadata/:tokenId.json

# Generate AI art for Profile NFT
POST /users/me/avatar/ai-art   (multipart: photo + gender)

# Get all Bae Cards market
GET /cards?rarity=legend&limit=20

# Get my hero score (for card rarity eligibility)
GET /heroes/me

# Get couple card mint proof (needs 10+ messages)
POST /couples/proof   { "matchId": "uuid" }

# View couple card metadata
GET /couples/:tokenId.json
```
