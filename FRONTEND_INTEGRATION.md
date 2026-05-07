# Bae4U — Frontend Integration Guide
> For the Flutter mobile app developer. Everything you need to connect to the live backend.

---

## 1. Live Backend — Connection Details

| Item | Value |
|---|---|
| **API Base URL** | `https://baebackend-production.up.railway.app` |
| **Swagger UI** | `https://baebackend-production.up.railway.app/docs` |
| **OpenAPI JSON** | `https://baebackend-production.up.railway.app/docs/json` |
| **Health Check** | `GET /health` → `{"status":"ok","uptime":...}` |
| **Network** | Base Sepolia (Ethereum L2 testnet, chainId `84532`) |
| **Socket.io** | `wss://baebackend-production.up.railway.app` |

> Open the Swagger UI in any browser to see every request/response shape with live try-it-out.

---

## 2. On-Chain Contract Addresses (Base Sepolia)

These are needed for any direct on-chain interaction from the frontend (e.g. external MetaMask users submitting their own txs).

```dart
const PETS_CASH_ADDRESS     = "0x468577EB93f248c770036bFC7EFb5639DD66fF13";
const PETS_REGISTRY_ADDRESS = "0x3E86590FE85536a194693eBC83be224De1412aca";
const PETS_MARKET_ADDRESS   = "0xa21eA1176bd8c58870e22B0455A4B3B6eF06FfeF";
const PETS_RANKING_ADDRESS  = "0x21B029301734223757694a5A10a1ce4fACa7ec6C";
const CHAIN_ID              = 84532;
const RPC_URL               = "https://sepolia.base.org";  // or your Alchemy key
```

All 4 contracts are verified on Basescan — open `#code` tabs to read ABIs:
- PetsCash → https://sepolia.basescan.org/address/0x468577EB93f248c770036bFC7EFb5639DD66fF13#code
- PetsMarket → https://sepolia.basescan.org/address/0xa21eA1176bd8c58870e22B0455A4B3B6eF06FfeF#code

---

## 3. Authentication Flow

The app uses **SIWE (Sign-In With Ethereum)** — invisible to regular users, just an API call for them.

### For custodial / non-crypto users (most users)
The backend manages their wallet entirely. Frontend just:
1. Calls `POST /actions/setup-wallet` after first login → gets a wallet address back
2. All blockchain actions go through REST endpoints — no wallet SDK needed in the app

### For Web3 users (MetaMask / Coinbase Wallet)
They sign a message in their wallet. Frontend handles the signing.

### Full Auth Flow

```
Step 1:  GET /auth/nonce/{walletAddress}
         → { nonce: "abc123..." }

Step 2:  Build a SIWE message (see below) and sign it with the wallet

Step 3:  POST /auth/siwe
         Body: { message: "<siwe string>", signature: "0x..." }
         → { accessToken: "eyJ...", user: { id, wallet, tokenId, username, ... } }

Step 4:  Include JWT in all subsequent requests:
         Header: Authorization: Bearer eyJ...
```

### SIWE Message Format (Flutter)
```dart
String buildSiweMessage({
  required String address,
  required String nonce,
}) {
  return """baebackend-production.up.railway.app wants you to sign in with your Ethereum account:
$address

Sign in to Bae4U

URI: https://baebackend-production.up.railway.app
Version: 1
Chain ID: 84532
Nonce: $nonce
Issued At: ${DateTime.now().toUtc().toIso8601String()}""";
}
```

---

## 4. Complete API Reference

> All endpoints except `/health`, `/auth/nonce/:wallet`, and `/auth/siwe` require `Authorization: Bearer <jwt>` header.

### Auth
| Method | Path | Body / Params | Returns |
|---|---|---|---|
| `GET` | `/auth/nonce/:wallet` | wallet address in URL | `{ nonce: string }` |
| `POST` | `/auth/siwe` | `{ message, signature }` | `{ accessToken, user }` |

### User Profile
| Method | Path | Body / Params | Returns |
|---|---|---|---|
| `GET` | `/users/me` | — | Full profile object |
| `PUT` | `/users/me` | `{ username, displayName, bio, locationCity, countryCode, personalityVector }` | Updated profile |
| `GET` | `/users/:id` | — | Public profile |
| `GET` | `/users/by-wallet/:address` | — | Profile by wallet |
| `POST` | `/users/me/avatar` | `multipart/form-data` image (max 5MB, JPEG/PNG/WebP) | `{ cid, url }` |
| `POST` | `/users/me/push-token` | `{ token: "ExponentPushToken[...]", platform: "ios"\|"android"\|"web" }` | 204 |
| `DELETE` | `/users/me/push-token` | `{ token }` | 204 |

### Wallet Setup
| Method | Path | Body | Returns |
|---|---|---|---|
| `POST` | `/actions/setup-wallet` | `{}` | `{ walletAddress, type: "custodial" }` |

> Call this right after first login if `user.tokenId` is null. Backend creates a wallet and mints an SFT automatically.

### Pet Economy (Blockchain — all invisible)
| Method | Path | Body | Returns |
|---|---|---|---|
| `GET` | `/pets/` | `?page=1&limit=20&country=IN` | `{ pets: [], page, limit }` |
| `GET` | `/pets/:tokenId` | — | Full pet + owner profile |
| `GET` | `/pets/portfolio/:walletAddress` | — | All pets owned by address |
| `GET` | `/pets/history/:tokenId` | — | Buy/sell history |
| `GET` | `/pets/wishlist` | — | My wishlist |
| `POST` | `/pets/wishlist` | `{ targetTokenId, note? }` | 201 |
| `DELETE` | `/pets/wishlist/:tokenId` | — | `{ success: true }` |
| `POST` | `/actions/buy/:tokenId` | `{}` | `{ success, txHash, newPrice, blockNumber }` |
| `POST` | `/actions/lock/:tokenId` | `{ durationHours: 1-168 }` | `{ success, unlocksAt, txHash }` |
| `POST` | `/actions/gift` | `{ targetTokenId, amountPcash: "100000000000000000000" }` | `{ success, txHash }` |

### Matching & Discovery
| Method | Path | Body / Params | Returns |
|---|---|---|---|
| `GET` | `/matches/discover` | `?limit=10&country=IN` | `{ candidates: [], matchedBy: "pinecone"\|"random" }` |
| `GET` | `/matches/` | — | `{ matches: [] }` with last message per match |
| `POST` | `/matches/like/:targetUserId` | `{}` | `{ match, isNewMatch: bool }` |
| `POST` | `/matches/pass/:targetUserId` | `{}` | `{ passed: true }` |
| `DELETE` | `/matches/:matchId` | — | `{ success: true }` |

### Messaging (REST — for history)
| Method | Path | Params | Returns |
|---|---|---|---|
| `GET` | `/messages/:matchId` | `?before=<ISO date>&limit=50` | `{ messages: [] }` |

> For real-time messages use **Socket.io** (see Section 5).

### PCASH Bonus
| Method | Path | Returns |
|---|---|---|
| `GET` | `/bonus/status` | `{ canClaim, nextClaimAt, bonusAmount }` |
| `POST` | `/bonus/claim` | `{ signature, amount, timestamp, contractAddress }` — use this sig to call `claimBonus()` on-chain |

> 4-hour cooldown between claims. `429` response includes `nextClaimAt`.

### Rankings
| Method | Path | Returns |
|---|---|---|
| `GET` | `/rankings/global` | `{ rankings: [] }` |
| `GET` | `/rankings/weekly` | `{ rankings: [] }` |

### Fiat On-Ramp
| Method | Path | Body | Returns |
|---|---|---|---|
| `POST` | `/fiat/onramp-init` | `{ provider: "transak"\|"moonpay", amount, currency }` | `{ widgetUrl }` — open in WebView |
| `GET` | `/fiat/history` | — | `{ transactions: [] }` |

---

## 5. Real-Time — Socket.io

Use socket.io client in Flutter: `socket_io_client` package.

### Connect
```dart
import 'package:socket_io_client/socket_io_client.dart' as IO;

final socket = IO.io(
  'https://baebackend-production.up.railway.app',
  IO.OptionBuilder()
    .setTransports(['websocket'])
    .setExtraHeaders({'Authorization': 'Bearer $jwt'})
    .build()
);

socket.connect();
socket.on('connect', (_) => print('Connected'));
```

### Events to emit (client → server)
```dart
// Send a message in a match
socket.emit('send:message', {
  'matchId': 'uuid-here',
  'content': 'Hello!',
  'msgType': 'text',   // 'text' | 'image' | 'gift'
});

// Mark messages as read
socket.emit('mark:read', { 'matchId': 'uuid-here' });
```

### Events to listen (server → client)
```dart
// New incoming message
socket.on('message:new', (data) {
  // data = { id, matchId, senderId, content, msgType, sentAt, username, displayName, avatarIpfsHash }
});

// Messages marked as read by partner
socket.on('messages:read', (data) {
  // data = { matchId, readBy }
});

// Push if offline — handled by Expo push (see Section 6)
```

---

## 6. Push Notifications (Expo Push)

The backend sends push notifications via Expo Push Service for:
- `"pet_bought"` — someone bought your pet
- `"new_match"` — you got a match
- `"new_message"` — message received while offline

### Register token after login
```dart
// After getting Expo push token from device:
await api.post('/users/me/push-token', {
  'token': 'ExponentPushToken[xxxxxx]',
  'platform': Platform.isIOS ? 'ios' : 'android',
});

// On logout:
await api.delete('/users/me/push-token', body: {'token': expoPushToken});
```

---

## 7. IPFS Avatars

Avatars are stored on IPFS via Pinata. When you get `avatar_ipfs_hash` from any user response, construct the URL:

```dart
String ipfsUrl(String? cid) {
  if (cid == null || cid.isEmpty) return 'https://placeholder.com/avatar';
  return 'https://gateway.pinata.cloud/ipfs/$cid';
}
```

---

## 8. Data Models (Dart)

### User
```dart
class BaeUser {
  final String id;
  final String walletAddress;
  final int? tokenId;          // null until SFT minted
  final String? username;
  final String? displayName;
  final String? bio;
  final String? avatarIpfsHash;
  final String? countryCode;
  final bool isVerified;
  final bool isCreator;
  final String? bonusClaimedAt;
}
```

### Pet
```dart
class Pet {
  final int tokenId;
  final String ownerAddress;   // who currently owns it
  final String userAddress;    // who the SFT represents (the profile)
  final String currentPriceWei;
  final int totalPurchases;
  final bool isLocked;
  final String? lockExpiry;
  final String? username;
  final String? displayName;
  final String? avatarIpfsHash;
  final bool isVerified;
}
```

### Match
```dart
class Match {
  final String id;
  final String partnerId;
  final String? username;
  final String? displayName;
  final String? avatarIpfsHash;
  final String? lastMessage;
  final String? lastMessageAt;
  final double? compatibilityScore;
}
```

### Message
```dart
class ChatMessage {
  final String id;
  final String senderId;
  final String content;
  final String msgType;   // 'text' | 'image' | 'gift'
  final String sentAt;
  final String? displayName;
  final String? avatarIpfsHash;
}
```

---

## 9. Full User Journey — What to Build Screen by Screen

### Screen 1 — Splash / Onboarding
- `GET /health` to verify backend is alive
- Show onboarding if first launch

### Screen 2 — Login
**Option A — Social / Email (most users):**
1. User signs up via email/social (your auth provider, e.g. Firebase)
2. Generate a random local wallet OR use CDP embedded wallet
3. Call `GET /auth/nonce/{address}` → sign the SIWE message → `POST /auth/siwe` → get JWT
4. Store JWT securely (flutter_secure_storage)
5. Call `POST /actions/setup-wallet` → backend creates custodial wallet + mints SFT
6. User never sees any crypto UI

**Option B — MetaMask / Coinbase Wallet:**
1. Connect wallet (WalletConnect or Coinbase Wallet SDK)
2. Same SIWE nonce + sign + JWT flow
3. They sign their own txs when needed

### Screen 3 — Profile Setup
- `PUT /users/me` to set username, displayName, bio, countryCode
- `POST /users/me/avatar` with multipart image
- Set `personalityVector` (personality quiz result as a map of trait scores) → powers Pinecone matching

### Screen 4 — Discover / Swipe
- `GET /matches/discover?limit=10` — gets AI-matched or random candidates
- Swipe right → `POST /matches/like/:userId`
  - If `isNewMatch: true` → show match animation → navigate to chat
- Swipe left → `POST /matches/pass/:userId`

### Screen 5 — Matches / Inbox
- `GET /matches/` — all active matches with last message preview
- Tap match → Chat screen

### Screen 6 — Chat
- `GET /messages/:matchId` — load last 50 messages
- Connect Socket.io → emit `send:message` → listen `message:new`
- Show typing indicators (implement via socket emit)

### Screen 7 — Pet Market / Feed
- `GET /pets/?page=1&limit=20` — browse all pets sorted by price
- Tap pet → Detail screen → `GET /pets/:tokenId`
- Buy button → `POST /actions/buy/:tokenId` — backend handles all blockchain, shows new price

### Screen 8 — My Profile / Portfolio
- `GET /users/me` — own profile
- `GET /pets/portfolio/:walletAddress` — pets you own
- Lock your pet → `POST /actions/lock/:tokenId` with `{ durationHours: 24 }`
- Gift PCASH → `POST /actions/gift`

### Screen 9 — PCASH Bonus
- `GET /bonus/status` → show claim button or countdown timer
- Claim → `POST /bonus/claim` → shows how much PCASH was earned
- (Custodial users: backend auto-submits. External wallet users: submit the returned signature to PetsCash contract)

### Screen 10 — Rankings
- `GET /rankings/global` — leaderboard

---

## 10. What Can Be Tested Right Now (Testnet)

All of the following work live against the deployed backend on Base Sepolia testnet:

| Feature | Can Test Now | Notes |
|---|---|---|
| SIWE Login + JWT | ✅ | Full flow working |
| Custodial wallet creation | ✅ | `POST /actions/setup-wallet` |
| Profile SFT mint on signup | ✅ | Happens automatically in auth |
| Pet browse feed | ✅ | 3 test pets exist on testnet |
| Buy a pet | ✅ | `POST /actions/buy/:tokenId` — real on-chain tx |
| 10% price increase after buy | ✅ | Verified on-chain |
| Lock a pet | ✅ | `POST /actions/lock/:tokenId` |
| Gift PCASH | ✅ | `POST /actions/gift` |
| PCASH bonus claim | ✅ | `POST /bonus/claim` (4hr cooldown) |
| Discover feed | ✅ | Random candidates (Pinecone active if personality set) |
| Like / Match | ✅ | Full mutual-like detection |
| Swipe pass | ✅ | Excluded from future discovers |
| Chat via Socket.io | ✅ | Real-time send/receive |
| Chat history via REST | ✅ | `GET /messages/:matchId` |
| Push notification register | ✅ | `POST /users/me/push-token` |
| Avatar upload to IPFS | ✅ | Needs PINATA_JWT in server env |
| Rankings | ⚠️ | Returns empty — worker not yet scheduled |
| Fiat on-ramp | ⚠️ | Widget URL generated, needs Transak test API key |
| CDP embedded wallet | ⚠️ | Service built, API key format issue being fixed |

---

## 11. Error Handling

All errors return JSON: `{ "error": "message" }`

| Code | Meaning |
|---|---|
| `400` | Bad request / validation failed |
| `401` | No JWT or invalid JWT — re-login |
| `403` | Authenticated but not authorized (e.g. don't own this pet) |
| `404` | Resource not found |
| `409` | Conflict (already matched, pet locked, etc.) |
| `429` | Rate limited (bonus cooldown) — check `nextClaimAt` in response |
| `502` | Blockchain transaction failed — show retry UI |

---

## 12. Flutter Packages to Use

```yaml
dependencies:
  http: ^1.2.0                        # REST API calls
  socket_io_client: ^2.0.3+1          # Real-time chat
  flutter_secure_storage: ^9.0.0      # Store JWT securely
  web3dart: ^2.7.3                    # Ethereum signing (SIWE)
  convert: ^3.1.1                     # hex encoding
  cached_network_image: ^3.3.1        # IPFS avatar loading
  image_picker: ^1.0.7                # Avatar upload
  firebase_messaging: ^14.0.0         # Push notifications (if using Firebase)
```

---

## 13. Strategy — Web First, Then Flutter

If your frontend dev wants to test quickly before building Flutter:

1. **Build a Next.js web app first** — the same API, auth flow, and Socket.io work identically in a browser
2. Test all 10 screens as a web app first → validate UX + API integration
3. **Migrate to Flutter** — the API calls are 1:1, just swap `fetch` for `http.dart` and `socket.io-client` for `socket_io_client`
4. The backend has CORS already configured for `app.bae4u.com`, `localhost`, `*.expo.dev`

The SIWE signing flow is the only slightly tricky part on mobile — use `web3dart` to sign the SIWE message string with the local wallet private key.

---

## 14. Quick Start — Test the Backend in 2 Minutes

```bash
# 1. Check server is alive
curl https://baebackend-production.up.railway.app/health

# 2. Get a nonce for any Ethereum address
curl https://baebackend-production.up.railway.app/auth/nonce/0x1234...

# 3. See all API endpoints
open https://baebackend-production.up.railway.app/docs
```

Open the Swagger UI, click **Authorize**, paste your JWT, and try every endpoint live.

---

*Backend version: 1.0.0 | Network: Base Sepolia (testnet) | Last updated: May 2026*
