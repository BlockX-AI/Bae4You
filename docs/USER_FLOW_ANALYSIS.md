# Bae4U Application - Complete User Flow Analysis

## Overview

Bae4U is a SocialFi dating application that combines social networking, dating, Web3 wallet management, pet trading, and avatar generation. The application uses blockchain as a backend with invisible complexity for users.

## Core Features

1. **Web3 Authentication** - Sign-In with Ethereum (SIWE)
2. **Pet Trading Marketplace** - Buy/sell pets with PetsCash token
3. **Dating/Matching System** - Swipe, match, and message
4. **Avatar Generation** - AI-powered avatars and Bitmoji
5. **KYC Verification** - Identity verification for PetCash access
6. **Bonus System** - Daily PCASH token claims
7. **Hero Cards** - Profile cards with rarity tiers
8. **Rankings & Badges** - Leaderboards and achievements
9. **Fiat On-Ramp/Off-Ramp** - Transak, MoonPay, Ramp integration
10. **Messaging** - Encrypted in-match communication

---

## User Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER ONBOARDING                          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │  Connect Wallet │
                    │  (SIWE Auth)     │
                    └─────────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │  Create Profile │
                    │  (Username, Bio) │
                    └─────────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │  Upload Avatar  │
                    │  (Photo/AI)     │
                    └─────────────────┘
                              │
              ┌───────────────┴───────────────┐
              │                               │
              ▼                               ▼
    ┌─────────────────┐              ┌─────────────────┐
    │  KYC Verification│              │  Skip KYC       │
    │  (Photo + Video)│              │  (Limited Access)│
    └─────────────────┘              └─────────────────┘
              │                               │
              ▼                               │
    ┌─────────────────┐                       │
    │  PetCash Access │                       │
    │  + Blue Tick    │                       │
    └─────────────────┘                       │
              │                               │
              └───────────────┬───────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                         MAIN APPLICATION                         │
└─────────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
        ▼                     ▼                     ▼
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│  Dating      │    │  Pet Market  │    │  Hero Cards  │
│  (Swipe/Match)│    │  (Trade Pets)│    │  (Profile)   │
└──────────────┘    └──────────────┘    └──────────────┘
        │                     │                     │
        ▼                     ▼                     ▼
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│  Messages    │    │  Portfolio   │    │  Rankings    │
│  (Chat)       │    │  (My Pets)   │    │  (Leaderboard)│
└──────────────┘    └──────────────┘    └──────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │  Fiat On-Ramp   │
                    │  (Buy PCASH)    │
                    └─────────────────┘
```

---

## Detailed User Flows

### 1. Authentication Flow

```
User opens app
    │
    ▼
Connect Wallet button
    │
    ▼
GET /auth/nonce/:wallet
    - Generates random nonce
    - Stores in database (5 min expiry)
    │
    ▼
User signs SIWE message with wallet
    │
    ▼
POST /auth/siwe
    - Verifies signature
    - Validates nonce
    - Checks domain & chain ID
    - Issues JWT token
    │
    ▼
JWT stored in app
    - Used for authenticated requests
    - Auto-refresh mechanism
```

**Key Endpoints:**
- `GET /auth/nonce/:wallet` - Get nonce for SIWE
- `POST /auth/siwe` - Verify signature and get JWT

**Security Features:**
- 5-minute nonce expiry
- Domain validation
- Chain ID validation
- EIP-712 structured signing

---

### 2. Profile Creation Flow

```
After authentication
    │
    ▼
GET /users/me
    - Check if profile exists
    │
    ▼
PUT /users/me
    - Set username (unique)
    - Set display name
    - Set bio (max 500 chars)
    - Set birth date
    - Set location city
    - Set country code
    - Set personality vector (optional)
    │
    ▼
POST /users/me/avatar
    - Upload photo (JPEG/PNG/WebP)
    - Max 5MB
    - Uploaded to IPFS
    - Hash stored in database
    │
    ▼
POST /users/me/push-token
    - Register push notification token
    - Platform: iOS/Android/Web
```

**Key Endpoints:**
- `GET /users/me` - Get current user profile
- `PUT /users/me` - Update profile
- `POST /users/me/avatar` - Upload avatar
- `POST /users/me/push-token` - Register push token

**Profile Fields:**
- Username (unique, 3-50 chars)
- Display name (1-100 chars)
- Bio (max 500 chars)
- Birth date
- Location city
- Country code (2-letter)
- Avatar (IPFS hash)
- Personality vector (JSON)

---

### 3. KYC Verification Flow

```
User wants PetCash access
    │
    ▼
POST /kyc/photo
    - Upload photo (base64)
    - Stored in database
    - Status: pending
    │
    ▼
POST /kyc/video
    - Submit 3-10 video frames
    - System selects best frame
    - Face matching with photo
    │
    ├─ Match score ≥ 70%
    │   │
    │   ▼
    │   Auto-approved
    │   - Status: approved
    │   - can_access_petcash: true
    │   - Blue tick enabled
    │
    ├─ Match score 50-70%
    │   │
    │   ▼
    │   Manual review
    │   - Status: pending
    │   - Admin reviews
    │
    └─ Match score < 50%
        │
        ▼
        Rejected
        - Status: rejected
        - Reason: Face match failed
```

**Key Endpoints:**
- `POST /kyc/photo` - Upload verification photo
- `POST /kyc/video` - Submit video frames
- `GET /kyc/status/:userId` - Get verification status
- `GET /kyc/bluetick/:userId` - Check blue tick status
- `POST /kyc/approve` - Admin approval
- `POST /kyc/reject` - Admin rejection
- `POST /kyc/revoke` - Admin revocation
- `GET /kyc/pending` - Get pending verifications

**Verification States:**
- `pending` - Awaiting verification
- `approved` - Verified with PetCash access
- `rejected` - Verification failed
- `revoked` - Verification removed

**PetCash Access:**
- Only verified users can access PetCash
- Revoked users lose access immediately
- Blue tick badge shows verification status

---

### 4. Pet Trading Flow

```
User browses pet marketplace
    │
    ▼
GET /pets
    - Paginated list (default 20)
    - Filter by country
    - Sort by price (descending)
    │
    ▼
GET /pets/:tokenId
    - View pet details
    - Owner info
    - Transaction history
    │
    ▼
POST /actions/buy
    - Lock pet (15 min)
    - Gas sponsorship (Pimlico)
    - User signs EIP-712
    - Transaction relayed
    │
    ▼
Pet purchased
    - New price set
    - Profit split (pet + seller)
    - Transaction recorded
    │
    ▼
GET /pets/portfolio/:walletAddress
    - View owned pets
    - Sort by price
```

**Key Endpoints:**
- `GET /pets` - Browse marketplace
- `GET /pets/:tokenId` - Pet details
- `GET /pets/portfolio/:walletAddress` - Owned pets
- `GET /pets/history/:tokenId` - Transaction history
- `POST /actions/buy` - Buy pet (gas sponsored)
- `POST /actions/lock` - Lock pet

**Pet Pricing:**
- Current price in wei
- Price increases on each sale
- Profit split:
  - 10% to pet (burned)
  - 90% to seller

**Gas Sponsorship:**
- Pimlico ERC-4337 paymaster
- EIP-712 signature required
- User never pays gas directly

---

### 5. Dating/Matching Flow

```
User opens dating section
    │
    ▼
GET /matches/discovery
    - Get potential matches
    - Filter by country
    - Pinecone similarity search
    - Exclude passed users
    │
    ▼
View user profile
    - Username, bio, avatar
    - Pet portfolio
    - Verification status
    │
    ├─ Like
    │   │
    │   ▼
    │   POST /matches/like
    │   - If mutual like → Match!
    │   - If first like → Pending
    │   - Push notification sent
    │
    └─ Pass
        │
        ▼
        POST /matches/pass
        - User added to swipe_passes
        - Won't appear again
```

**Key Endpoints:**
- `GET /matches/discovery` - Discovery queue
- `POST /matches/like` - Like user
- `POST /matches/pass` - Pass user
- `GET /matches` - Get active matches
- `GET /matches/:matchId/messages` - Get messages
- `POST /matches/:matchId/messages` - Send message

**Matching Logic:**
- Mutual like = Match
- Compatibility score via Pinecone
- Personality vector matching
- Country-based filtering

**Messaging:**
- Encrypted at rest
- Text, image, GIF, audio
- Real-time via Socket.IO
- Push notifications

---

### 6. Bonus Claiming Flow

```
User wants daily bonus
    │
    ▼
GET /bonus/status
    - Check if claimable
    - 4-hour cooldown
    │
    ▼
POST /bonus/claim
    - Update bonus_claimed_at
    - Generate EIP-712 signature
    - User submits to contract
    │
    ▼
Contract call
    - PetsCash.claimBonus()
    - Signature verified on-chain
    - PCASH tokens transferred
```

**Key Endpoints:**
- `GET /bonus/status` - Check claim status
- `POST /bonus/claim` - Claim bonus

**Bonus Details:**
- Amount: Configured in env
- Cooldown: 4 hours
- Trustless: Contract verifies signature
- Backend never calls contract

---

### 7. Avatar Generation Flow

```
User wants to set avatar
    │
    ▼
Option 1: Upload Photo
    │
    ▼
POST /users/me/avatar
    - Upload photo
    - Stored on IPFS
    │
    ▼
Option 2: AI Avatar
    │
    ▼
POST /users/me/ai-avatar
    - Upload photo
    - Face analysis
    - Visual traits extraction
    - AI generation (FLUX)
    - Upload to IPFS
    │
    ▼
Option 3: Bitmoji
    │
    ▼
POST /users/bitmoji
    - Upload photo
    - Face analysis
    - DiceBear generation
    - Sticker pack generation
    - Upload to IPFS
```

**Key Endpoints:**
- `POST /users/me/avatar` - Upload photo avatar
- `POST /users/me/ai-avatar` - Generate AI avatar
- `POST /users/bitmoji` - Generate Bitmoji
- `POST /users/bitmoji/couple` - Generate couple Bitmoji

**Avatar Types:**
- Photo upload (direct)
- AI avatar (FLUX generation)
- Bitmoji (DiceBear)
- Couple Bitmoji (2 people)

---

### 8. Hero Cards Flow

```
User wants hero card
    │
    ▼
POST /users/me/hero-card
    - Analyze profile
    - Calculate scores:
      - Vibe score
      - Rizz score
      - Drip score
      - Aura score
    - Determine tier (Common → Legendary)
    - Generate card image
    - Upload to IPFS
    │
    ▼
GET /users/me/hero-cards
    - View all cards
    - Sort by card number
    │
    ▼
GET /cards/market
    - Browse card market
    - Buy/sell cards
```

**Key Endpoints:**
- `POST /users/me/hero-card` - Generate hero card
- `GET /users/me/hero-cards` - Get user's cards
- `GET /cards/market` - Card marketplace

**Card Tiers:**
- Common
- Rare
- Epic
- Legendary

**Scores:**
- Vibe (personality)
- Rizz (charisma)
- Drip (style)
- Aura (presence)

---

### 9. Rankings Flow

```
User wants to see rankings
    │
    ▼
GET /rankings
    - Period: daily/weekly/monthly
    - Categories:
      - Assets rank
      - Value rank
      - Country rank
    - Badge tier assignment
    │
    ▼
GET /rankings/badges
    - Badge proof
    - On-chain verification
    │
    ▼
Badge Tiers
    - Bronze
    - Silver
    - Gold
    - Diamond
    - Master
```

**Key Endpoints:**
- `GET /rankings` - Get rankings
- `GET /rankings/badges` - Get badge proofs

**Ranking Categories:**
- Assets (pet portfolio value)
- Value (total PCASH holdings)
- Country (regional ranking)

---

### 10. Fiat On-Ramp/Off-Ramp Flow

```
User wants to buy PCASH
    │
    ▼
GET /fiat/onramp
    - Get provider options
    - Transak, MoonPay, Ramp
    │
    ▼
POST /fiat/onramp
    - Create transaction
    - Redirect to provider
    - User completes payment
    - Callback updates status
    │
    ▼
GET /fiat/transactions
    - View transaction history
    - Status tracking
```

**Key Endpoints:**
- `GET /fiat/onramp` - Get on-ramp options
- `POST /fiat/onramp` - Create on-ramp transaction
- `GET /fiat/offramp` - Get off-ramp options
- `POST /fiat/offramp` - Create off-ramp transaction
- `GET /fiat/transactions` - Transaction history

**Providers:**
- Transak
- MoonPay
- Ramp

**Transaction States:**
- pending
- processing
- completed
- failed

---

## User Journey Summary

### New User Journey

1. **Download App** → Install from app store
2. **Connect Wallet** → SIWE authentication
3. **Create Profile** → Username, bio, avatar
4. **Choose Path**:
   - Complete KYC → Full PetCash access + blue tick
   - Skip KYC → Limited access
5. **Explore Features**:
   - Browse pet marketplace
   - Start dating (swipe/match)
   - Generate avatar
   - Claim daily bonus
   - View rankings

### Daily Active User Journey

1. **Open App** → Auto-login with JWT
2. **Check Bonus** → Claim if available (4h cooldown)
3. **Browse Pets** → Check marketplace for deals
4. **Dating** → Swipe through discovery queue
5. **Messages** → Reply to matches
6. **Rankings** → Check leaderboard position

### Pet Trader Journey

1. **Browse Marketplace** → Find undervalued pets
2. **Research** → Check transaction history
3. **Buy Pet** → Gas-sponsored purchase
4. **Hold/Flip** → Wait for price increase
5. **Sell** → Profit from price appreciation
6. **Repeat** → Build portfolio

### Dater Journey

1. **Discovery** → Swipe through potential matches
2. **Match** → Mutual like creates match
3. **Chat** → Send messages
4. **Build Connection** → Get to know each other
5. **Meet** → Take conversation offline (optional)

---

## Data Flow Diagram

```
┌─────────────┐
│   Frontend  │
│  (React/Expo)│
└──────┬──────┘
       │
       │ HTTP/HTTPS
       │ JWT Auth
       ▼
┌─────────────┐
│  Fastify API │
│  (Node.js)   │
└──────┬──────┘
       │
       ├─► PostgreSQL (User data, matches, messages)
       ├─► Pinecone (Personality matching)
       ├─► IPFS (Avatar storage)
       ├─► Blockchain (Pets, PCASH, Hero Cards)
       └─► External APIs (Transak, MoonPay, Ramp, FAL.ai)
```

---

## Security & Privacy

### Authentication
- SIWE (Sign-In with Ethereum)
- JWT tokens with expiry
- Nonce-based replay protection
- Domain validation

### Data Privacy
- Messages encrypted at rest
- Personality vectors optional
- KYC data stored securely
- Push tokens stored separately

### Blockchain Security
- EIP-712 structured signing
- ERC-4337 gas sponsorship
- Contract verifies signatures
- Trustless bonus claiming

---

## Technical Stack

### Backend
- **Framework**: Fastify (Node.js)
- **Database**: PostgreSQL
- **ORM**: Native SQL queries
- **Authentication**: SIWE + JWT
- **Blockchain**: ethers.js
- **Gas Sponsorship**: Pimlico (ERC-4337)
- **Vector Search**: Pinecone
- **Storage**: IPFS (Pinata)
- **Image Processing**: Sharp
- **AI Generation**: FAL.ai FLUX

### Frontend
- **Framework**: React Native (Expo)
- **State**: React Context/Redux
- **Web3**: WalletConnect
- **Push**: Expo Notifications
- **Navigation**: React Navigation

---

## API Summary

### Authentication
- `GET /auth/nonce/:wallet`
- `POST /auth/siwe`

### Users
- `GET /users/me`
- `PUT /users/me`
- `GET /users/:id`
- `POST /users/me/avatar`
- `POST /users/me/ai-avatar`
- `POST /users/me/push-token`

### KYC
- `POST /kyc/photo`
- `POST /kyc/video`
- `GET /kyc/status/:userId`
- `GET /kyc/bluetick/:userId`
- `POST /kyc/approve` (admin)
- `POST /kyc/reject` (admin)
- `POST /kyc/revoke` (admin)
- `GET /kyc/pending` (admin)

### Pets
- `GET /pets`
- `GET /pets/:tokenId`
- `GET /pets/portfolio/:walletAddress`
- `GET /pets/history/:tokenId`
- `POST /actions/buy`
- `POST /actions/lock`

### Matches
- `GET /matches/discovery`
- `GET /matches`
- `POST /matches/like`
- `POST /matches/pass`
- `GET /matches/:matchId/messages`
- `POST /matches/:matchId/messages`

### Bonus
- `GET /bonus/status`
- `POST /bonus/claim`

### Wallet
- `GET /wallet/balance`
- `GET /wallet/transactions`

### Fiat
- `GET /fiat/onramp`
- `POST /fiat/onramp`
- `GET /fiat/offramp`
- `POST /fiat/offramp`
- `GET /fiat/transactions`

### Rankings
- `GET /rankings`
- `GET /rankings/badges`

### Hero Cards
- `POST /users/me/hero-card`
- `GET /users/me/hero-cards`
- `GET /cards/market`

---

## Conclusion

Bae4U is a comprehensive SocialFi application that seamlessly integrates:
- Web3 authentication
- Social networking
- Dating/matching
- Pet trading marketplace
- Avatar generation
- KYC verification
- Bonus systems
- Rankings and achievements

The user experience is designed to be smooth and intuitive, with blockchain complexity hidden behind simple UI interactions. The application prioritizes security, privacy, and user control while providing engaging features for social interaction and financial activities.
