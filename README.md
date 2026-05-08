# Bae4U

**Web3 SocialFi Dating Protocol on Base L2**

[![API Status](https://img.shields.io/badge/API-live-brightgreen)](https://baebackend-production.up.railway.app/health)
[![Chain](https://img.shields.io/badge/chain-Base%20Sepolia-0052FF)](https://sepolia.basescan.org)
[![License](https://img.shields.io/badge/license-MIT-blue)](LICENSE)
[![Node](https://img.shields.io/badge/node-20.x-339933)](https://nodejs.org)
[![pnpm](https://img.shields.io/badge/pnpm-9.0-F69220)](https://pnpm.io)
[![OpenAPI](https://img.shields.io/badge/docs-OpenAPI%202.0-85EA2D)](https://baebackend-production.up.railway.app/docs)

[**Live API**](https://baebackend-production.up.railway.app) &nbsp;·&nbsp; [**Swagger UI**](https://baebackend-production.up.railway.app/docs) &nbsp;·&nbsp; [**Fantasy Bae API**](docs/FANTASY_BAE_API_REFERENCE.md) &nbsp;·&nbsp; [**Frontend Integration**](docs/FANTASY_BAE_FRONTEND_INTEGRATION.md) &nbsp;·&nbsp; [**Contracts on Basescan**](#deployed-contracts)

</div>

---

## TL;DR

Bae4U is a Web3 SocialFi protocol where:

- Every user profile is an **on-chain asset** (ERC-1155 SFT on Base)
- Owning someone's profile SFT earns **passive income** on every resale
- Users **never see blockchain complexity** — gas, wallets, and transactions are handled server-side
- A second layer — **Fantasy Bae** — adds a card-game economy on top

**Current status:**
- Live API deployed on Railway — `baebackend-production.up.railway.app`
- 8 smart contracts deployed + verified on Base Sepolia
- Full E2E test suite: 93/95 sections passing
- k6 load tests defined (smoke → 6-hour endurance)
- Production-ready architecture with Pimlico ERC-4337, Coinbase CDP, and custodial wallet relay

**Stack at a glance:**
```
Frontend  — Next.js 15 · Tailwind 4 · framer-motion · SIWE auth
Backend   — Fastify · PostgreSQL · Redis · Socket.io · BullMQ
Contracts — Solidity 0.8.20 · OpenZeppelin · Base Sepolia (chain 84532)
Relay     — Pimlico ERC-4337 · Coinbase CDP MPC · AES-256-CBC custodial
External  — Alchemy · Pinecone · Pinata · Expo Push · Transak · MoonPay
```

---

## Who Is This For

| Reader | What to focus on |
|---|---|
| **New backend developer** | [Quick Start](#quick-start) → [Architecture](#architecture-overview) → [API Reference](#api-reference) |
| **Smart contract auditor** | [Deployed Contracts](#deployed-contracts) → [Security](#security) → [Contracts source](sepolia/contracts/) |
| **Mobile / frontend developer** | [Auth Flow](#auth-flow) → [API Reference](#api-reference) → [Frontend Integration](FRONTEND_INTEGRATION.md) |
| **SRE / infrastructure engineer** | [Deployment](#deployment) → [Scaling Model](#scaling-model) → [Failure Handling](#failure-handling) → [Load Testing](#load-testing) |
| **Product / investor** | [What is Bae4U](#what-is-bae4u) → [Application Layers](#application-layers) → [Roadmap](#roadmap) |
| **Integration partner / AI agent** | [API Reference](#api-reference) → [Fantasy Bae API Reference](docs/FANTASY_BAE_API_REFERENCE.md) |

---

## Quick Start

Get the API running locally in under 5 minutes.

```bash
# 1. Clone + install
git clone https://github.com/your-org/bae4u.git
cd bae4u
pnpm install

# 2. Configure environment
cp .env.example .env
# Minimum required: DATABASE_URL, REDIS_URL, JWT_SECRET,
#                   BASE_SEPOLIA_RPC_URL, DEPLOYER_PRIVATE_KEY,
#                   SIGNER_PRIVATE_KEY, contract addresses

# 3. Run database migrations
pnpm --filter=api migrate

# 4. Start API
pnpm dev:api
# → http://localhost:3000
# → Swagger UI: http://localhost:3000/docs

# 5. Verify it's working
curl http://localhost:3000/health
```

Start the frontend separately:
```bash
pnpm --filter=web dev   # → http://localhost:3001
```

> Full environment variable reference: [`.env.example`](.env.example)  
> Full migration order: [Database Schema](#database-schema)  
> Deploy contracts to a fresh chain: [Deploying Contracts](#deploying-contracts)

---

## Table of Contents

- [What is Bae4U](#what-is-bae4u)
- [Architecture Overview](#architecture-overview)
- [System Boundaries](#system-boundaries)
- [Application Layers](#application-layers)
- [Deployed Contracts](#deployed-contracts)
- [Auth Flow](#auth-flow)
- [Transaction Relay — Invisible UX](#transaction-relay--invisible-ux)
- [Database Schema](#database-schema)
- [External Services](#external-services)
- [API Reference](#api-reference)
- [Repo Structure](#repo-structure)
- [Local Development](#local-development)
- [E2E Test Suites](#e2e-test-suites)
- [Load Testing](#load-testing)
- [Deployment](#deployment)
- [Environment Variables](#environment-variables)
- [Failure Handling](#failure-handling)
- [Scaling Model](#scaling-model)
- [Security](#security)
- [Key Design Decisions](#key-design-decisions)
- [Tradeoffs](#tradeoffs)
- [Known Limitations](#known-limitations)
- [Roadmap](#roadmap)
- [Further Reading](#further-reading)

---

## What is Bae4U

Bae4U merges a Tinder-style dating app with a pet-trading game economy. The core insight: **social popularity has financial value**. Every user mints an ERC-1155 profile SFT on Base. Other users can buy that SFT — the price rises 10% on every purchase. The previous owner earns 50% of that gain automatically. The more desirable your profile, the more passive income you generate just by existing on the app.

**Layer 1 — Dating + Pet Economy:**  
Swipe, match, chat. Own other users' profiles as "pets". Earn passive income when your pets get resold. Claim daily PCASH bonus tokens. Badge system rewards top-ranked users.

**Layer 2 — Fantasy Bae:**  
A fantasy-sports card game layered on top. Collect Bae Cards (4 rarities), build decks, enter weekly tournaments where real app activity drives card scores, and mint Couple Cards with your match as a co-signed EIP-712 NFT.

**The invisible UX principle:**  
Every blockchain interaction is handled server-side. Users log in with a wallet signature (SIWE) and from that point on never interact with gas, approvals, or raw transactions. The backend routes everything through custodial, CDP, or ERC-4337 paymaster flows depending on the user's wallet type.

---

## Architecture Overview

Bae4U is structured into 5 layers. Understanding the separation between them is key before reading the code.

```
1. Client        — Next.js web + React Native mobile (planned)
2. API           — Fastify HTTP + Socket.io WebSocket
3. Services      — Wallet relay, ranking, matching, push
4. Persistence   — PostgreSQL, Redis, Pinata/IPFS
5. Blockchain    — 8 contracts on Base Sepolia
```

### System Diagram

```mermaid
graph TB
    subgraph Client["Client Layer"]
        WEB["Next.js 15\napps/web · port 3001"]
        MOBILE["React Native (planned)\nExpo SDK"]
    end

    subgraph API["Backend — Fastify · Railway\nbaebackend-production.up.railway.app"]
        ROUTES["15 Route Modules"]
        SOCKET["Socket.io\nReal-time chat"]
        RELAY["TX Relay Layer\ntx-relay.ts"]
        PIMLICO_SVC["Pimlico ERC-4337\npimlico-relay.ts"]
        CDP_SVC["Coinbase CDP\ncdp-wallet.ts"]
        CUSTODIAL["Custodial Wallets\nAES-256-CBC"]
    end

    subgraph DB["Persistence"]
        PG["PostgreSQL"]
        REDIS["Redis"]
        IPFS["Pinata / IPFS"]
    end

    subgraph CHAIN["Base Sepolia — Chain 84532"]
        CORE["PetsCash · PetsRegistry\nPetsMarket · PetsRanking"]
        FANTASY["BaeCardRegistry · BaeCardMarket\nTournamentEngine · CoupleCard"]
    end

    subgraph EXT["External Services"]
        ALCHEMY["Alchemy RPC"]
        PINECONE["Pinecone Vectors"]
        NOTIF["Expo Push · Sentry · Mixpanel"]
        FIAT["Transak · MoonPay"]
    end

    WEB -->|HTTPS + JWT| API
    MOBILE -->|HTTPS + JWT| API
    WEB <-->|WebSocket| SOCKET
    RELAY --> PIMLICO_SVC & CDP_SVC & CUSTODIAL
    PIMLICO_SVC & CDP_SVC & CUSTODIAL -->|signed tx| CHAIN
    API --> PG & REDIS & IPFS & PINECONE & NOTIF
    API --> ALCHEMY --> CHAIN
    FIAT -->|webhook| API
```

### Production-Grade Qualities

| Area | Implementation |
|---|---|
| **Security** | SIWE auth · EIP-712 proofs · AES-256 key encryption · TLS pinning · CORS whitelist · Zod env validation |
| **Performance** | GIN indexes on JSONB · Redis caching · connection pooling · paginated endpoints |
| **Observability** | Pino structured logs · Sentry error tracking · `/health` endpoint · Mixpanel analytics |
| **Reliability** | Retry-with-backoff on RPC · BullMQ background workers · graceful DB failure handling |
| **Scalability** | Stateless API · BullMQ job queues · read-replica ready schema · CDN-served IPFS assets |

---

## System Boundaries

Clear ownership prevents confusion when debugging across layers.

```
┌─────────────────────────────────────────────────────────┐
│  FRONTEND owns:                                         │
│  • UI rendering, animations, navigation                 │
│  • Wallet connection (MetaMask/WC/Coinbase/InApp/CDP)   │
│  • JWT storage and auth state                           │
│  • External wallet tx signing + broadcast               │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│  BACKEND owns:                                          │
│  • Authentication (SIWE verify + JWT issue)             │
│  • Matchmaking logic (Pinecone vector + DB)             │
│  • Real-time messaging (Socket.io)                      │
│  • Transaction relay (all 3 wallet types)               │
│  • EIP-712 signature generation (bonus + badge proofs)  │
│  • Ranking computation (BullMQ worker)                  │
│  • Push notifications                                   │
│  • Chain → DB state sync (pets-sync worker)             │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│  BLOCKCHAIN owns:                                       │
│  • Asset ownership (ERC-1155/ERC-721 ledger)            │
│  • Market price state (10% curve, per-tokenId)          │
│  • Bonus and badge claim validity (replay prevention)   │
│  • Tournament prize distribution                        │
│  • Couple Card co-ownership                             │
└─────────────────────────────────────────────────────────┘
```

---

## Application Layers

### Layer 1 — Core Dating App (Pet Economy)

```
User signs up
  └─ SIWE login
       └─ Backend mints ERC-1155 profile SFT (PetsRegistry)
            └─ Backend initialises pet in market (PetsMarket)
                 └─ Profile appears in Discover feed
                      └─ Swipe right → stored in DB
                           └─ Pinecone personality match check
                                └─ Mutual like → Match + Socket.io chat
                                     └─ Daily PCASH bonus (EIP-712 claim)
                                          └─ Buy other users' SFTs
                                               └─ Price +10% on each buy
                                                    ├─ Previous owner: +50% of gain
                                                    └─ Pet profile: +50% of gain
```

### Layer 2 — Fantasy Bae

```
Collect Bae Cards  (4 rarities: Common / Rare / Epic / Legendary)
  └─ Cards represent real dating app user profiles
       └─ Build a 5-card deck
            └─ Enter weekly tournament: TournamentEngine.lockDeck()
                 └─ Hero oracle scores each card from real app activity
                      └─ Backend: TournamentEngine.submitScores()
                           └─ Winners: TournamentEngine.claimPrize() → PCASH
                                └─ Couple Card: mutual EIP-712 → CoupleCard.mintCouple()
                                     └─ NFT burned if couple unmatch
```

---

## Deployed Contracts

### Base Sepolia (Chain ID: 84532)

> Latest deployment: `2026-05-07` — [`sepolia/deployments.json`](sepolia/deployments.json)  
> Deployer / Treasury / Signer: `0xa58DCCb0F17279abD1d0D9069Aa8711Df4a4c58E`

#### Core Protocol

| Contract | Standard | Address | Source |
|---|---|---|---|
| **PetsCash** — in-game currency (PCASH) | ERC-20 | `0x10239e1127Ed9e179B98c94530b5C8EC7834Da8D` | [Basescan ↗](https://sepolia.basescan.org/address/0x10239e1127Ed9e179B98c94530b5C8EC7834Da8D#code) |
| **PetsRegistry** — profile SFTs | ERC-1155 | `0xAb49505dDA3304BB976878b2103F717674d0C47A` | [Basescan ↗](https://sepolia.basescan.org/address/0xAb49505dDA3304BB976878b2103F717674d0C47A#code) |
| **PetsMarket** — bonding curve | — | `0x067Dd0189805bb716673d24fb44BDd054A5Debed` | [Basescan ↗](https://sepolia.basescan.org/address/0x067Dd0189805bb716673d24fb44BDd054A5Debed#code) |
| **PetsRanking** — badge SFTs | ERC-1155 | `0x001F9838556De79Ff94f924Ac409a2E3a1ab021D` | [Basescan ↗](https://sepolia.basescan.org/address/0x001F9838556De79Ff94f924Ac409a2E3a1ab021D#code) |

#### Fantasy Bae Layer

| Contract | Standard | Address | Source |
|---|---|---|---|
| **BaeCardRegistry** — collectible cards | ERC-721 | `0xf220F9d3fb4Fe7B91cdEB53F113C551c55880a58` | [Basescan ↗](https://sepolia.basescan.org/address/0xf220F9d3fb4Fe7B91cdEB53F113C551c55880a58#code) |
| **BaeCardMarket** — card trading | — | `0x1cBEBC20DF461430d0673C71Ba78672C8799090C` | [Basescan ↗](https://sepolia.basescan.org/address/0x1cBEBC20DF461430d0673C71Ba78672C8799090C#code) |
| **TournamentEngine** — weekly prizes | — | `0xf07D28F6B26168e35D2771ba293713bB91877c34` | [Basescan ↗](https://sepolia.basescan.org/address/0xf07D28F6B26168e35D2771ba293713bB91877c34#code) |
| **CoupleCard** — EIP-712 co-mint | ERC-721 | `0xEe13aF76c55A83CC9b34f296040AFC60C772BA00` | [Basescan ↗](https://sepolia.basescan.org/address/0xEe13aF76c55A83CC9b34f296040AFC60C772BA00#code) |

#### On-Chain Mechanics

| Action | Function | Rules |
|---|---|---|
| Profile mint | `PetsRegistry.mintProfile()` | Called by backend on first SIWE login |
| PCASH bonus claim | `PetsCash.claimBonus()` | EIP-712 signed by `SIGNER_PRIVATE_KEY`; 4-hour cooldown on-chain |
| Buy a pet | `PetsMarket.buy()` | Price +10% per buy; 50% to prev owner, 50% to pet profile, 2.5% treasury fee |
| Lock a pet | `PetsMarket.lockPet()` | Owner locks for up to 7 days; auto-expires on next buy |
| Gift cash | `PetsMarket.giftCash()` | Ranked owner sends PCASH to pet profile; max 10/day |
| Issue badge | `PetsRanking.issueBadge()` | EIP-712 proof signed by backend; tiers: Bronze → Master |
| Mint Bae Card | `BaeCardRegistry.mintCard()` | 4 rarities; rarity multiplier boosts tournament score |
| Mint Couple Card | `CoupleCard.mintCouple()` | Both parties sign EIP-712; NFT burned on unmatch |
| Tournament | `TournamentEngine` | Open → lockDeck → submitScores → claimPrize |

---

## Auth Flow

### Simple (4 steps)

```
1. User signs a SIWE message in their wallet
2. Backend verifies signature + consumes nonce (Redis, single-use)
3. First login only: backend mints profile SFT on-chain, stores token_id
4. JWT issued → stored in localStorage → used for all subsequent requests
```

### Detailed Sequence

```mermaid
sequenceDiagram
    participant User
    participant Frontend
    participant API
    participant Chain

    User->>Frontend: Connect Wallet
    Frontend->>Frontend: Show 5-option modal<br/>(MetaMask · WalletConnect · Coinbase · InApp · CDP)

    alt External Wallet
        Frontend->>API: GET /auth/nonce
        API-->>Frontend: nonce (stored in Redis, TTL 5 min)
        Frontend->>User: Request SIWE signature
        User-->>Frontend: signed message
        Frontend->>API: POST /auth/siwe
    else In-App / CDP Wallet
        Frontend->>Frontend: Generate or load local key
        Frontend->>API: POST /auth/siwe (self-signed)
    end

    API->>API: Verify SIWE sig + nonce
    API->>API: Upsert user in PostgreSQL

    alt First Login
        API->>Chain: PetsRegistry.mintProfile(address, startPrice)
        Chain-->>API: ProfileMinted event { tokenId }
        API->>Chain: PetsMarket.initPet(tokenId, owner, price)
        API->>API: Persist token_id in DB
    end

    API-->>Frontend: { jwt, userId }
    Frontend->>API: GET /users/me
    API-->>Frontend: Full user profile
```

---

## Transaction Relay — Invisible UX

Every on-chain mutation (`buy`, `lock`, `gift`) routes through the relay layer. Users never touch gas, approvals, or raw transactions.

### How it works (simple)

```
User taps "Buy Pet"
  └─ Backend checks: what wallet type does this user have?
       ├─ custodial  → decrypt key → Pimlico ERC-4337 (gasless) or direct tx
       ├─ cdp        → Coinbase MPC signs and relays
       └─ external   → return unsigned tx steps → user signs in wallet
```

### Detailed Flow

```mermaid
flowchart TD
    A["User taps Buy Pet"] --> B["POST /actions/buy/:tokenId\nBearer JWT"]

    B --> C{"wallet_type\nfrom DB"}

    C -->|custodial| D["Decrypt AES-256 key\nfrom PostgreSQL"]
    C -->|cdp| E["Coinbase CDP SDK\nMPC sign"]
    C -->|external| F["Return unsigned TxStep[]\nUser signs in wallet"]

    D --> G{"PIMLICO_API_KEY\nset?"}
    G -->|yes — gasless| H["Build ERC-4337 UserOp\nencode approve + buy"]
    G -->|no — sponsorship| I["ensureGasBalance()\nPlatform tops up ETH\nthen sendTransaction"]

    H --> J["Pimlico Bundler\neth_sendUserOperation"]
    I --> K["ethers signer\ncustodial key"]
    E --> L["CDP relay\ncdp-wallet.ts"]
    F --> M["POST /wallet/broadcast"]

    J & K & L & M --> N["PetsMarket.buy(tokenId)\nBase Sepolia"]

    N --> O["Price +10%\nProfit split 50/50\nTreasury 2.5%"]
    O --> P["Backend polls receipt\nUpdates pets DB"]
    P --> Q["200 OK { txHash, newPrice }"]
```

**Gas priority order:**
1. `PIMLICO_API_KEY` set → **fully gasless** via ERC-4337 paymaster
2. Platform ETH sponsorship → deployer tops up wallet balance
3. External wallet → **user signs and broadcasts** themselves

---

## Database Schema

PostgreSQL on Railway. 13 tables across 6 migration files.

| Table | Purpose |
|---|---|
| `users` | Wallet address, display name, bio, country, personality vector (JSONB), token_id, wallet_type, avatar |
| `pets` | On-chain state mirror: owner, price, isLocked, lockExpiry, totalBuys, status |
| `matches` | Swipe outcomes: `pending` / `matched` / `unmatched` |
| `messages` | Chat per match — types: text / image / gif / audio |
| `swipe_passes` | Left-swipes; excluded from discover feed per user |
| `push_tokens` | Expo device tokens for iOS + Android push |
| `rankings` | Leaderboard snapshots — daily / weekly / monthly |
| `fiat_orders` | Transak / MoonPay on-ramp transaction records |
| `custodial_wallets` | AES-256-CBC encrypted keys; wallet_address indexed |
| `bonus_claims` | On-chain bonus claim history per user |
| `bae_cards` | Fantasy card ownership, rarity, subject_address, multiplier |
| `tournaments` | Rounds, decks, submitted scores |
| `couple_cards` | Co-minted NFTs, partner addresses, on-chain token_id |

### Migration Order

```bash
pnpm --filter=api migrate              # Base: users, pets, matches, messages
pnpm --filter=api migrate:patch        # Custodial wallet columns
pnpm --filter=api migrate:features     # Rankings, push tokens, swipe passes
pnpm --filter=api migrate:fantasy      # Hero scores, bae_cards
pnpm --filter=api migrate:fantasy-bae  # Tournaments, couple_cards
pnpm --filter=api migrate-performance  # GIN indexes, query planner tuning
```

---

## External Services

| Service | Purpose | Required? | Key Env Var(s) |
|---|---|---|---|
| **Alchemy** | Base Sepolia RPC + archive node | **Yes** | `BASE_SEPOLIA_RPC_URL` |
| **Railway** | API hosting, PostgreSQL, Redis | **Yes** | Auto-injected |
| **Pimlico** | ERC-4337 bundler + paymaster for gasless txs | Optional | `PIMLICO_API_KEY` |
| **Coinbase CDP** | MPC wallets — private key never fully on server | Optional | `CDP_API_KEY_ID`, `CDP_API_KEY_SECRET` |
| **Pinecone** | 18-dimensional personality vector matching | Optional | `PINECONE_API_KEY`, `PINECONE_INDEX` |
| **Pinata** | IPFS avatar image pinning and CDN delivery | Optional | `PINATA_JWT` |
| **Expo** | iOS + Android push notifications | Optional | `EXPO_ACCESS_TOKEN` |
| **Transak** | Fiat → crypto card payment on-ramp | Optional | `TRANSAK_API_KEY` |
| **MoonPay** | Fiat → crypto alternative on-ramp | Optional | `MOONPAY_API_KEY` |
| **Sentry** | Error tracking and performance monitoring | Optional | `SENTRY_DSN` |
| **Mixpanel** | Product analytics and funnel tracking | Optional | `MIXPANEL_TOKEN` |
| **Basescan** | Contract verification (Etherscan V2, chainId=84532) | Dev only | `BASESCAN_API_KEY` |

> All optional services degrade gracefully when their env var is absent. The API boots and serves all routes without them.

---

## API Reference

**Base URL:** `https://baebackend-production.up.railway.app`  
**Auth:** `Authorization: Bearer <jwt>` on all routes except `/health` and `/auth/*`

**Interactive Swagger UI:** [`/docs`](https://baebackend-production.up.railway.app/docs)  
**OpenAPI JSON spec:** [`/docs/json`](https://baebackend-production.up.railway.app/docs/json)

### Summary

- REST API with JWT auth on all protected routes
- All list endpoints are paginated with `{ data, total, page, limit }` shape
- On-chain mutations go through invisible relay — single HTTP call, tx hash returned
- Real-time events via Socket.io at `wss://baebackend-production.up.railway.app`

### Routes

| Prefix | Endpoints | Purpose |
|---|---|---|
| `/auth` | `GET /nonce` · `POST /siwe` | SIWE login, JWT issued |
| `/users` | `GET /me` · `PATCH /me` · `POST /me/avatar` · `POST /me/push-token` | Profile + IPFS avatar upload |
| `/pets` | `GET /` · `GET /:id` · `GET /portfolio/:address` · `GET /:id/history` | Market feed, detail, portfolio, tx history |
| `/actions` | `POST /buy/:tokenId` · `POST /lock/:tokenId` · `POST /gift/:tokenId` · `POST /setup-wallet` | All on-chain mutations via relay |
| `/bonus` | `POST /claim` · `GET /status` | EIP-712 PCASH bonus claim (4-hour cooldown) |
| `/matches` | `GET /` · `GET /discover` · `POST /like/:userId` · `DELETE /:matchId` | Swipe queue and match lifecycle |
| `/messages` | `GET /:matchId` | Paginated chat history per match |
| `/rankings` | `GET /global` · `GET /badge-proof/:userId` | Leaderboard + EIP-712 badge proof |
| `/wallet` | `GET /balance` · `GET /history` · `POST /broadcast` | PCASH balance, history, external tx relay |
| `/fiat` | `POST /transak/webhook` · `POST /moonpay/webhook` | On-ramp webhooks |
| `/heroes` | `GET /leaderboard` · `GET /me` · `POST /score` | Fantasy hero scores and oracle |
| `/cards` | `GET /` · `GET /:id` · `POST /list` · `POST /buy` · `POST /upgrade` | Bae Card marketplace |
| `/tournaments` | `GET /` · `GET /active` · `POST /enter` · `POST /deck` · `POST /claim` | Tournament lifecycle |
| `/couples` | `GET /` · `POST /propose` · `POST /accept` · `DELETE /:id` | Couple Card EIP-712 co-mint |
| `/admin` | `GET /users` · `POST /suspend` · `POST /mint` | Internal admin (restricted) |

### Socket.io Events

| Event | Direction | Payload |
|---|---|---|
| `join_match` | Client → Server | `{ matchId }` |
| `send_message` | Client → Server | `{ matchId, content, type }` |
| `new_message` | Server → Client | `{ message }` |
| `match_notification` | Server → Client | `{ matchId, partnerName }` |

---

## Repo Structure

### High-Level Overview

```
bae4u/
├── apps/
│   ├── api/          # Fastify backend — Node.js 20
│   └── web/          # Next.js 15 frontend
├── packages/
│   └── contracts/    # Original 4 core contracts (Hardhat)
├── sepolia/          # Full 8-contract suite — current deployment
├── load-tests/       # k6 performance scenarios
├── docs/             # API reference + integration guides
└── .github/          # CI/CD workflows
```

### Detailed Structure

```
apps/api/src/
├── config.ts                 # Zod env validation — server exits if invalid
├── index.ts                  # Bootstrap: plugins, routes, TLS pin hook
├── db/
│   ├── schema.sql            # Base schema (run once on fresh instance)
│   ├── migrate*.ts           # 6 ordered migration runners
│   └── migrate-performance.ts
├── plugins/
│   ├── db.ts                 # PostgreSQL connection pool
│   ├── redis.ts              # ioredis client
│   ├── auth.ts               # @fastify/jwt + SIWE nonce verifier
│   └── socket.ts             # Socket.io real-time chat
├── middleware/
│   └── rateLimiter.ts        # Redis token bucket + admin key bypass
├── routes/                   # 15 route modules (see API Reference)
├── services/
│   ├── tx-relay.ts           # Invisible UX core dispatcher
│   ├── pimlico-relay.ts      # ERC-4337 UserOp builder + submission
│   ├── custodial-wallet.ts   # AES-256-CBC key encrypt/decrypt/sign
│   ├── cdp-wallet.ts         # Coinbase CDP MPC wallet management
│   ├── eip712-signer.ts      # Bonus + badge EIP-712 signature issuer
│   ├── pinecone-match.ts     # 18-dim personality vector match engine
│   ├── ranking-engine.ts     # Leaderboard score computation
│   ├── hero-oracle.ts        # Fantasy hero score oracle
│   ├── pets-sync.ts          # Chain → DB pet state sync
│   ├── token-gate.ts         # Badge-gated feature access checks
│   ├── ipfs.ts               # Pinata avatar upload + URL resolution
│   └── push.ts               # Expo push notification sender
└── workers/
    ├── pets-sync.worker.ts   # BullMQ: periodic chain → DB sync
    └── ranking.worker.ts     # BullMQ: weekly leaderboard compute

apps/web/
├── app/
│   ├── page.tsx              # Landing — aurora hero + animated text
│   ├── discover/page.tsx     # Swipe cards + country filter + match popup
│   ├── pets/page.tsx         # Pet marketplace — relay buy/lock
│   ├── matches/page.tsx      # Real-time chat + match list
│   └── profile/page.tsx      # Profile + avatar upload + bonus timer
├── components/
│   ├── auth-provider.tsx     # React context: session, login, logout
│   ├── wallet-modal.tsx      # 5-option connect modal
│   └── navbar.tsx            # Top bar + mobile bottom nav
└── lib/
    ├── api.ts                # All API calls + JWT header injection
    ├── wallet.ts             # MetaMask / WalletConnect / Coinbase / InApp
    └── store.ts              # AuthContext type definitions

sepolia/
├── contracts/                # 8 Solidity contracts (current deployment)
├── deployments.json          # Canonical deployed addresses + timestamps
└── hardhat.config.ts
```

---

## Local Development

### Prerequisites

- Node.js 20+, pnpm 9+
- PostgreSQL 15+, Redis 7+
- Alchemy API key for Base Sepolia RPC
- Deployer wallet with Base Sepolia ETH ([Quicknode faucet](https://faucet.quicknode.com/base/sepolia))

### Full Setup

```bash
# Clone + install
git clone https://github.com/your-org/bae4u.git
cd bae4u && pnpm install

# Configure
cp .env.example .env
# Fill in: DATABASE_URL, REDIS_URL, JWT_SECRET, BASE_SEPOLIA_RPC_URL,
#          DEPLOYER_PRIVATE_KEY, SIGNER_PRIVATE_KEY, all contract addresses

# Run all migrations in order
pnpm --filter=api migrate
pnpm --filter=api migrate:patch
pnpm --filter=api migrate:features
pnpm --filter=api migrate:fantasy
pnpm --filter=api migrate:fantasy-bae
pnpm --filter=api migrate-performance

# Start API (hot-reload via tsx watch)
pnpm dev:api               # → http://localhost:3000/docs

# Start frontend
pnpm --filter=web dev      # → http://localhost:3001

# Start background workers (separate terminals)
pnpm --filter=api worker:pets     # chain → DB sync
pnpm --filter=api worker:ranking  # weekly ranking compute
```

### Deploying Contracts

```bash
cd sepolia
# Set DEPLOYER_PRIVATE_KEY + BASE_SEPOLIA_RPC_URL in .env

pnpm deploy:contracts   # deploys all 8, writes deployments.json
pnpm verify:contracts   # verifies on Basescan (Etherscan V2 API)

# Update backend env with new addresses
railway variables --set "PETS_CASH_ADDRESS=0x..."
```

---

## E2E Test Suites

All suites run against real Base Sepolia RPC and the live deployed backend. No mocks.

```bash
# On-chain core protocol
pnpm --filter=api gameflow           # 9/9   — PetsCash, PetsRegistry, PetsMarket, PetsRanking
pnpm --filter=api pimlico-e2e        # 6/6   — ERC-4337 fully gasless via Pimlico
pnpm --filter=api cdp-smoke          # pass  — Coinbase CDP MPC wallet smoke

# Fantasy Bae layer
pnpm --filter=api gameflow-v2        # BaeCardRegistry, BaeCardMarket, TournamentEngine, CoupleCard
pnpm --filter=api fantasy-bae-e2e   # Full Fantasy Bae integration

# Full-stack integration
pnpm --filter=api full-e2e           # 93/95 — DB + chain + all services
pnpm --filter=api railway-e2e        # 28/28 — live HTTP against Railway
pnpm --filter=api multiuser          # Concurrent multi-user flows
```

| Suite | Status | Coverage |
|---|---|---|
| `gameflow` | 9/9 | wallet setup, mintProfile, initPet, EIP-712 claimBonus, buy() price invariant (1000→1100 PCASH), lockPet revert, giftCash, badge proof |
| `pimlico-e2e` | 6/6 | EOA with 0 ETH executes `claimBonus` + `lockPet` via ERC-4337 paymaster |
| `cdp-smoke` | pass | CDP MPC provisioning, SEC1→PKCS8 key normalisation, tx signing |
| `full-stack-e2e` | 93/95 | PostgreSQL, Redis, 8 contracts, custodial wallets, dating triangle, Fantasy Bae, Railway HTTP |
| `railway-e2e` | 28/28 | auth, pets, discover, matches, rankings, push tokens, wallet, contract reads |

> The 2 failing `full-stack-e2e` checks are TLS pin header validation (`X-Cert-Sha256`) — infra config only, no logic issues.

---

## Load Testing

Production-grade [k6](https://k6.io) suite in [`load-tests/`](load-tests/). Full SLA targets: [`load-tests/README.md`](load-tests/README.md).

```bash
cd load-tests && npm install
export BASE_URL="https://baebackend-production.up.railway.app"

k6 run smoke-test.js            # 5 VUs, 1 min — sanity check
k6 run mobile-session.js        # 50 VUs, 10 min — average user session
k6 run login-burst.js           # 500 concurrent logins
k6 run discover-swipe-flow.js   # Swipe + match user journey
k6 run cards-market-flow.js     # NFT marketplace browsing
k6 run tournament-flow.js       # Tournament entry + claim
k6 run spike-test.js            # 0 → 1000 VUs in 30 seconds
k6 run endurance-test.js        # 6-hour stability run
```

---

## Deployment

The API auto-deploys to Railway on every push to `main`.

```mermaid
flowchart LR
    A["git push main"] --> B["GitHub Actions\ndeploy-api.yml"]
    B --> C["Docker build\nnode:20-alpine"]
    C --> D["pnpm install\n--filter=api"]
    D --> E["tsc build → dist/"]
    E --> F["railway deploy"]
    F --> G["CMD: migrate.js\n→ index.js"]
    G --> H["/health → 200 OK"]
```

```bash
railway up                              # Manual deploy from local
railway logs                            # Stream live logs
railway variables --set "KEY=value"     # Set environment variable
```

**Health check endpoint:** `GET /health` → `{ status, uptime, version, tlsPins }`

Docker start sequence: run all migrations → `node apps/api/dist/index.js`

---

## Environment Variables

> Full reference with all defaults: [`.env.example`](.env.example)

The API validates all vars at startup via Zod in `config.ts`. **The server will not boot if any required variable is missing or malformed.**

```bash
# ── Required ──────────────────────────────────────────────────────────
PORT=3000
NODE_ENV=production
DATABASE_URL=postgresql://user:pass@host:5432/bae4u
REDIS_URL=redis://host:6379
JWT_SECRET=<64-char random hex>
JWT_REFRESH_SECRET=<64-char random hex>
BASE_SEPOLIA_RPC_URL=https://base-sepolia.g.alchemy.com/v2/<key>
DEPLOYER_PRIVATE_KEY=0x...   # holds ETH for gas sponsorship + on-chain calls
SIGNER_PRIVATE_KEY=0x...     # EIP-712 only — holds no ETH
PETS_CASH_ADDRESS=0x10239e1127Ed9e179B98c94530b5C8EC7834Da8D
PETS_REGISTRY_ADDRESS=0xAb49505dDA3304BB976878b2103F717674d0C47A
PETS_MARKET_ADDRESS=0x067Dd0189805bb716673d24fb44BDd054A5Debed
PETS_RANKING_ADDRESS=0x001F9838556De79Ff94f924Ac409a2E3a1ab021D

# ── Optional — feature flags (graceful degradation when unset) ────────
PIMLICO_API_KEY=             # enables ERC-4337 gasless transactions
CDP_API_KEY_ID=              # enables Coinbase CDP MPC wallets
CDP_API_KEY_SECRET=
CDP_WALLET_SECRET=
PINECONE_API_KEY=            # enables AI personality matching
PINATA_JWT=                  # enables IPFS avatar uploads
EXPO_ACCESS_TOKEN=           # enables push notifications
TRANSAK_API_KEY=             # enables fiat on-ramp
MOONPAY_API_KEY=             # enables MoonPay on-ramp
SENTRY_DSN=                  # enables error tracking
MIXPANEL_TOKEN=              # enables analytics

# ── Game economics ────────────────────────────────────────────────────
BONUS_AMOUNT_PCASH=100000000000000000000      # 100 PCASH
STARTING_PRICE_PCASH=1000000000000000000000  # 1000 PCASH
```

**Frontend** (`apps/web/.env.local`):

```bash
NEXT_PUBLIC_API_URL=https://baebackend-production.up.railway.app
NEXT_PUBLIC_CHAIN_ID=84532
NEXT_PUBLIC_PETS_CASH_ADDRESS=0x10239e1127Ed9e179B98c94530b5C8EC7834Da8D
NEXT_PUBLIC_PETS_MARKET_ADDRESS=0x067Dd0189805bb716673d24fb44BDd054A5Debed
NEXT_PUBLIC_PETS_REGISTRY_ADDRESS=0xAb49505dDA3304BB976878b2103F717674d0C47A
NEXT_PUBLIC_WC_PROJECT_ID=       # from cloud.walletconnect.com
```

---

## Failure Handling

How the system behaves when individual components fail.

| Failure | Behaviour |
|---|---|
| **RPC node unreachable** | Retry with exponential backoff (max 3 attempts); return `503` if all fail; DB state unaffected |
| **Transaction reverted** | Error propagated to caller; DB state rolled back; no partial writes; user sees actionable message |
| **PostgreSQL down** | Server fails fast; no partial writes; Fastify returns `503`; on-start migration gate prevents boot with bad DB |
| **Redis down** | Rate limiting degrades to allow-all; session nonces fall back to in-memory TTL; app continues serving |
| **Pimlico bundler unavailable** | Falls back to platform gas sponsorship (direct tx with deployer ETH top-up) |
| **CDP wallet error** | Falls back to custodial wallet path if `CDP_API_KEY_ID` call fails |
| **Pinecone unavailable** | Discover feed falls back to random candidate selection from DB |
| **Expo push failure** | Logged and silently dropped; non-blocking; push tokens cleaned on repeated failure |
| **IPFS upload failure** | Avatar update returns error; existing avatar URL unchanged in DB |

---

## Scaling Model

### Current (Single Region)

```
Railway Region (US-West)
├── 1× Fastify API instance
├── 1× PostgreSQL primary
├── 1× Redis instance
└── 2× BullMQ workers (pets-sync, ranking)
```

### Next Steps (Horizontal Scale)

```
Load Balancer
├── N× Fastify API (stateless — scales horizontally)
│   └── shared JWT_SECRET enables any instance to verify tokens
├── PostgreSQL primary + read replicas
│   └── SELECT queries routed to replicas
├── Redis cluster
│   └── rate limit state, Socket.io adapter
└── BullMQ workers (separate Railway services)
    └── pets-sync.worker.ts, ranking.worker.ts
```

### Tested Limits

Validated with k6 in [`load-tests/`](load-tests/):

| Scenario | Tested load | Notes |
|---|---|---|
| Concurrent logins | 500 VUs | `login-burst.js` |
| Spike traffic | 0 → 1000 VUs in 30s | `spike-test.js` |
| Sustained load | 50 VUs for 10 min | `mobile-session.js` |
| Endurance | TBD VUs for 6 hours | `endurance-test.js` |

---

## Security

| Mechanism | Implementation detail |
|---|---|
| **Authentication** | SIWE (EIP-4361) — Ethereum wallet signature; nonce in Redis, single-use, 5-min TTL |
| **Session tokens** | JWT (HS256) + refresh token; `localStorage` on web, SecureStore on mobile |
| **EIP-712 typed data** | Domain separator + chain ID in every bonus/badge signature — prevents cross-chain and cross-app replay |
| **Replay prevention** | `usedSigs` (PetsCash) and `usedProofs` (PetsRanking) store digests permanently on-chain |
| **Rate limiting** | Redis token bucket per IP/user; admin API key bypass for internal tooling |
| **Custodial key storage** | AES-256-CBC encryption; secret in env only, ciphertext in DB — never stored together |
| **CDP wallets** | Coinbase MPC — private key never exists in full at any single location |
| **TLS pinning** | `X-Cert-Sha256` on every response; React Native validates cert hash before parsing data |
| **CORS** | Origin whitelist: `app.bae4u.com`, `admin.bae4u.com`, Railway domain, Expo dev tunnels |
| **Reentrancy guard** | `ReentrancyGuard` on `PetsMarket.buy()` |
| **CEI pattern** | Check-Effects-Interactions enforced in all market and bonus contract functions |
| **Emergency pause** | `PetsMarket` pausable by `ADMIN_ROLE` |
| **Access control** | OpenZeppelin `AccessControl` on all 8 contracts; 6 roles: `ADMIN_ROLE` `MINTER_ROLE` `SIGNER_ROLE` `MARKET_ROLE` `ISSUER_ROLE` `AUTOMATION_ROLE` |
| **Startup validation** | Zod schema in `config.ts` — server exits if any required env var is missing or malformed |

---

## Key Design Decisions

| Decision | Reasoning |
|---|---|
| **Fastify over Express** | Native TypeScript support, schema-based validation, 2× throughput in benchmarks, built-in Swagger serialisation |
| **Base L2 over Ethereum mainnet** | Sub-cent gas costs make per-profile minting economically viable; EVM-compatible toolchain; Coinbase ecosystem synergy |
| **ERC-1155 for profiles** | Semi-fungible allows batch minting + richer metadata per token vs ERC-721; single contract manages all profiles |
| **Custodial + CDP hybrid wallets** | Dating app users are not crypto-native; server-side key management with three escalating levels of custody lets us serve all user segments without friction |
| **EIP-712 for proofs (not oracles)** | Bonus claims and badge issuance require off-chain backend authority but on-chain verifiability; EIP-712 typed signatures give both without a separate oracle contract |
| **Off-chain ranking + on-chain badges** | Computing rankings on-chain would cost gas per user per week; backend computes, issues a signed proof, user redeems on-chain once — cost-efficient and auditable |
| **BullMQ workers for chain sync** | Keeps API response times fast; chain reads are expensive; background workers sync state periodically rather than on every API call |
| **Pinecone for matchmaking** | 18-dimensional personality vectors allow semantic matching beyond simple demographic filters; Pinecone handles cosine similarity at scale without a dedicated ML service |

---

## Tradeoffs

| Tradeoff | Accepted because |
|---|---|
| **Custodial wallets vs self-custody** | Onboarding friction is unacceptable for a dating app; custodial is opt-in with clear migration path to external wallet |
| **Backend relay vs direct chain calls from client** | Direct calls expose users to gas UX; relay lets us abstract wallet type, sponsor gas, and retry failed txs — worth the centralisation risk at this stage |
| **Off-chain ranking vs on-chain** | On-chain ranking costs ~$0.10/user/week at Base gas prices with 10k users; backend is significantly cheaper and just as auditable via signed proofs |
| **Single-region Railway deployment** | Latency for non-US users is suboptimal; accepted for MVP; multi-region routing is defined in the scaling plan |
| **PostgreSQL vs NoSQL** | Relational integrity between users/matches/messages is hard to replicate in NoSQL; JSONB columns give document flexibility where needed (personality vectors) |

---

## Known Limitations

- **Single-region deployment** — all traffic routes through one Railway region; users outside US-West may see higher latency
- **Base Sepolia testnet** — all contracts are on testnet; mainnet deployment pending audit completion
- **No multi-tenant DB isolation** — all user data in a single schema; tenant isolation will be needed for enterprise integrations
- **RPC single-provider dependency** — Alchemy is the sole RPC provider; no automatic failover to a secondary node
- **CDP key rotation** — CDP API keys must be manually rotated and updated via `railway variables`; no automated rotation
- **Chain → DB sync lag** — `pets-sync.worker.ts` runs on a timer; DB state may lag by up to 30s behind on-chain truth in peak load

---

## Roadmap

| Phase | Milestone | Status |
|---|---|---|
| **Testnet** | 8 contracts deployed + verified on Base Sepolia | Done |
| **Testnet** | Full E2E + load test suite | Done |
| **Testnet** | Railway production deployment + CI/CD | Done |
| **Audit** | Smart contract formal audit (core 4 + Fantasy layer 4) | Pending |
| **Mainnet** | Base mainnet deployment post-audit | Planned |
| **Mobile** | React Native app (Expo) — iOS + Android | In progress |
| **Infra** | Multi-region Railway deployment | Planned |
| **Infra** | PostgreSQL read replicas + Redis cluster | Planned |
| **Feature** | Agent integration layer (AI-powered dating suggestions) | Planned |
| **Feature** | Mainnet fiat on-ramp (Transak + MoonPay live) | Planned |
| **Feature** | DAO governance for protocol parameter changes | Researching |

---

## Further Reading

| Document | What it contains |
|---|---|
| [`docs/FANTASY_BAE_API_REFERENCE.md`](docs/FANTASY_BAE_API_REFERENCE.md) | Full Fantasy Bae REST API — heroes, cards, tournaments, couples with request/response schemas |
| [`docs/FANTASY_BAE_FRONTEND_INTEGRATION.md`](docs/FANTASY_BAE_FRONTEND_INTEGRATION.md) | Screen-by-screen frontend integration guide for the Fantasy Bae game layer |
| [`FRONTEND_INTEGRATION.md`](FRONTEND_INTEGRATION.md) | Core dating app frontend integration for Flutter and React Native |
| [`load-tests/README.md`](load-tests/README.md) | k6 load test scenarios, VU configs, and SLA targets |
| [`PRODUCTION_READINESS_AUDIT.md`](PRODUCTION_READINESS_AUDIT.md) | Full production readiness assessment across all layers |
| [`LAUNCH_READINESS_REPORT.md`](LAUNCH_READINESS_REPORT.md) | Launch checklist and go/no-go gate criteria |
| [`sepolia/deployments.json`](sepolia/deployments.json) | Canonical contract addresses with deployment timestamps |
| [Live Swagger UI](https://baebackend-production.up.railway.app/docs) | Interactive API explorer |

**Basescan verified sources:**
[PetsCash](https://sepolia.basescan.org/address/0x10239e1127Ed9e179B98c94530b5C8EC7834Da8D#code) ·
[PetsRegistry](https://sepolia.basescan.org/address/0xAb49505dDA3304BB976878b2103F717674d0C47A#code) ·
[PetsMarket](https://sepolia.basescan.org/address/0x067Dd0189805bb716673d24fb44BDd054A5Debed#code) ·
[PetsRanking](https://sepolia.basescan.org/address/0x001F9838556De79Ff94f924Ac409a2E3a1ab021D#code) ·
[BaeCardRegistry](https://sepolia.basescan.org/address/0xf220F9d3fb4Fe7B91cdEB53F113C551c55880a58#code) ·
[BaeCardMarket](https://sepolia.basescan.org/address/0x1cBEBC20DF461430d0673C71Ba78672C8799090C#code) ·
[TournamentEngine](https://sepolia.basescan.org/address/0xf07D28F6B26168e35D2771ba293713bB91877c34#code) ·
[CoupleCard](https://sepolia.basescan.org/address/0xEe13aF76c55A83CC9b34f296040AFC60C772BA00#code)

---

<div align="center">

Built on [Base](https://base.org) &nbsp;·&nbsp; Deployed on [Railway](https://railway.app) &nbsp;·&nbsp; Gasless via [Pimlico](https://pimlico.io) &nbsp;·&nbsp; MPC wallets by [Coinbase CDP](https://cdp.coinbase.com)

</div>
