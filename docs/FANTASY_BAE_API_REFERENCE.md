# Fantasy Bae API Reference

## Base URL

```
https://baebackend-production.up.railway.app
```

## Authentication

All endpoints require JWT authentication via the `Authorization` header:

```
Authorization: Bearer <your_jwt_token>
```

## Response Format

All responses follow this structure:

```json
{
  "data": { ... },
  "error": "Error message (if any)",
  "timestamp": "2026-05-08T10:00:00.000Z"
}
```

## Heroes API

### GET /heroes/leaderboard

Get the global heroes leaderboard.

**Response:**
```json
{
  "heroes": [
    {
      "address": "0x...",
      "score": 1500,
      "rank": 1,
      "cardCount": 5,
      "lastActive": "2026-05-08T09:30:00.000Z"
    }
  ],
  "total": 100,
  "page": 1
}
```

### GET /heroes/me

Get current user's hero score and stats.

**Response:**
```json
{
  "score": {
    "rawScore": 1250,
    "rank": 15,
    "percentile": 85,
    "cardEligible": true,
    "nextMilestone": 1500
  },
  "stats": {
    "messagesSent": 245,
    "matchesMade": 12,
    "likesReceived": 89,
    "responseRate": 0.92
  }
}
```

### GET /heroes/:address/score

Get a specific user's hero score.

**Parameters:**
- `address` (path): User's wallet address

**Response:**
```json
{
  "address": "0x...",
  "score": 1250,
  "rank": 15,
  "stats": {
    "messagesSent": 245,
    "matchesMade": 12,
    "likesReceived": 89
  },
  "cards": [
    {
      "tokenId": 1,
      "rarity": "Rare",
      "multiplier": 180
    }
  ]
}
```

### GET /heroes/:address/cards

Get cards for a specific hero.

**Parameters:**
- `address` (path): User's wallet address

**Response:**
```json
{
  "cards": [
    {
      "tokenId": 1,
      "rarity": "Rare",
      "multiplier": 180,
      "owner": "0x...",
      "price": "200000000000000000000",
      "listed": true,
      "totalTrades": 5
    }
  ]
}
```

### POST /heroes/recompute (Admin)

Recompute hero scores (admin only).

**Response:**
```json
{
  "message": "Score recompute initiated",
  "jobId": "job_123456"
}
```

## Cards API

### GET /cards

Get all listed cards with pagination.

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20)
- `rarity` (optional): Filter by rarity (Common|Rare|Epic|Legend)
- `subject` (optional): Filter by subject address
- `minPrice` (optional): Minimum price in wei
- `maxPrice` (optional): Maximum price in wei

**Response:**
```json
{
  "cards": [
    {
      "tokenId": 1,
      "subject": "0x...",
      "subjectName": "Alice",
      "rarity": "Rare",
      "multiplier": 180,
      "price": "200000000000000000000",
      "owner": "0x...",
      "listed": true,
      "totalTrades": 5,
      "mintedAt": "2026-05-01T10:00:00.000Z",
      "image": "https://api.bae4u.com/cards/1.png",
      "metadata": {
        "description": "Rare hero card for Alice",
        "attributes": [
          {
            "trait_type": "Rarity",
            "value": "Rare"
          },
          {
            "trait_type": "Multiplier",
            "value": 180
          }
        ]
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "pages": 8
  }
}
```

### GET /cards/:tokenId

Get details for a specific card.

**Parameters:**
- `tokenId` (path): Card token ID

**Response:**
```json
{
  "tokenId": 1,
  "subject": "0x...",
  "subjectName": "Alice",
  "rarity": "Rare",
  "multiplier": 180,
  "price": "200000000000000000000",
  "owner": "0x...",
  "listed": true,
  "totalTrades": 5,
  "mintedAt": "2026-05-01T10:00:00.000Z",
  "tradeHistory": [
    {
      "from": "0x...",
      "to": "0x...",
      "price": "180000000000000000000",
      "timestamp": "2026-05-07T15:30:00.000Z"
    }
  ],
  "royalties": {
    "totalEarned": "4500000000000000000",
    "pending": "500000000000000000"
  }
}
```

### POST /cards/:tokenId/buy

Get transaction data to buy a card.

**Parameters:**
- `tokenId` (path): Card token ID

**Response:**
```json
{
  "steps": [
    {
      "to": "0x1cBEBC20DF461430d0673C71Ba78672C8799090C",
      "data": "0x...",
      "value": "216000000000000000000",
      "description": "Approve PCASH spending"
    },
    {
      "to": "0x1cBEBC20DF461430d0673C71Ba78672C8799090C",
      "data": "0x...",
      "value": "0",
      "description": "Buy card"
    }
  ],
  "totalPrice": "216000000000000000000",
  "gasEstimate": "150000"
}
```

## Tournaments API

### GET /tournaments/current

Get the currently active tournament.

**Response:**
```json
{
  "tournament": {
    "id": 1,
    "status": "active",
    "startTime": "2026-05-08T10:00:00.000Z",
    "endTime": "2026-05-15T10:00:00.000Z",
    "prizePool": "10000000000000000000000",
    "entryFee": "100000000000000000000",
    "participants": 150,
    "rules": {
      "deckSize": 5,
      "maxCopies": 1,
      "scoring": "multiplier_based"
    }
  }
}
```

### GET /tournaments/leaderboard

Get tournament leaderboard.

**Query Parameters:**
- `tournamentId` (optional): Tournament ID (default: current)

**Response:**
```json
{
  "leaderboard": [
    {
      "rank": 1,
      "address": "0x...",
      "score": 4500,
      "deck": [1, 2, 3, 4, 5],
      "prize": "5000000000000000000000"
    }
  ],
  "userRank": {
    "rank": 25,
    "score": 3200,
    "prize": null
  }
}
```

### GET /tournaments/deck

Get user's locked tournament deck.

**Response:**
```json
{
  "deck": [1, 2, 3, 4, 5],
  "locked": true,
  "lockTime": "2026-05-08T11:00:00.000Z",
  "score": 3200,
  "canModify": false
}
```

### POST /tournaments/deck

Lock a deck for the tournament.

**Request Body:**
```json
{
  "cardIds": [1, 2, 3, 4, 5]
}
```

**Response:**
```json
{
  "success": true,
  "deckId": "deck_123456",
  "lockTime": "2026-05-08T11:00:00.000Z",
  "txHash": "0x..."
}
```

### GET /tournaments/history

Get user's tournament history.

**Response:**
```json
{
  "tournaments": [
    {
      "id": 1,
      "rank": 15,
      "score": 3200,
      "prize": "100000000000000000000",
      "deck": [1, 2, 3, 4, 5],
      "finishedAt": "2026-05-01T10:00:00.000Z"
    }
  ]
}
```

## Couples API

### GET /couples/my

Get user's couple cards.

**Response:**
```json
{
  "couples": [
    {
      "tokenId": 1,
      "partnerTokenId": 2,
      "partner": "0x...",
      "partnerName": "Bob",
      "matchId": "0x...",
      "mintedAt": "2026-05-01T10:00:00.000Z",
      "active": true,
      "messageCount": 25,
      "royalties": {
        "earned": "1500000000000000000",
        "pending": "250000000000000000"
      }
    }
  ]
}
```

### POST /couples/proof

Submit a couple proof for minting (backend only).

**Request Body:**
```json
{
  "userA": "0x...",
  "userB": "0x...",
  "matchId": "0x...",
  "messageCount": 25,
  "timestamp": 1234567890
}
```

**Response:**
```json
{
  "proof": {
    "userA": "0x...",
    "userB": "0x...",
    "matchId": "0x...",
    "timestamp": 1234567890,
    "signature": "0x..."
  },
  "readyToMint": true
}
```

## Wallet API

### GET /wallet/balance

Get user's wallet balances.

**Response:**
```json
{
  "balances": {
    "PCASH": "5000000000000000000000",
    "ETH": "1000000000000000000"
  },
  "wallet": {
    "address": "0x...",
    "type": "custodial",
    "createdAt": "2026-04-01T10:00:00.000Z"
  }
}
```

### POST /wallet/transfer

Transfer tokens between wallets.

**Request Body:**
```json
{
  "to": "0x...",
  "amount": "100000000000000000000",
  "token": "PCASH"
}
```

**Response:**
```json
{
  "txHash": "0x...",
  "status": "pending",
  "from": "0x...",
  "to": "0x...",
  "amount": "100000000000000000000"
}
```

### GET /wallet/transactions

Get wallet transaction history.

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20)
- `type` (optional): Filter by type (send|receive|buy|sell)

**Response:**
```json
{
  "transactions": [
    {
      "hash": "0x...",
      "type": "buy",
      "token": "PCASH",
      "amount": "200000000000000000000",
      "from": "0x...",
      "to": "0x...",
      "timestamp": "2026-05-08T10:00:00.000Z",
      "status": "confirmed",
      "details": {
        "cardTokenId": 1,
        "price": "200000000000000000000"
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 50
  }
}
```

## Actions API

### GET /actions/tx-data/buy/:tokenId

Get transaction data for buying a card.

**Parameters:**
- `tokenId` (path): Card token ID

**Response:**
```json
{
  "steps": [
    {
      "to": "0x10239e1127Ed9e179B98c94530b5C8EC7834Da8D",
      "data": "0x...",
      "value": "0",
      "description": "Approve PCASH"
    },
    {
      "to": "0x1cBEBC20DF461430d0673C71Ba78672C8799090C",
      "data": "0x...",
      "value": "216000000000000000000",
      "description": "Buy card"
    }
  ],
  "totalPrice": "216000000000000000000",
  "gasEstimate": "200000"
}
```

### GET /actions/tx-data/lock/:tokenId

Get transaction data for locking a pet.

**Parameters:**
- `tokenId` (path): Pet token ID

**Response:**
```json
{
  "steps": [
    {
      "to": "0x067Dd0189805bb716673d24fb44BDd054A5Debed",
      "data": "0x...",
      "value": "0",
      "description": "Lock pet for 24 hours"
    }
  ],
  "duration": 86400,
  "gasEstimate": "100000"
}
```

### POST /actions/tx-data/gift

Get transaction data for gifting PCASH.

**Request Body:**
```json
{
  "to": "0x...",
  "amount": "100000000000000000000",
  "tokenId": 1
}
```

**Response:**
```json
{
  "steps": [
    {
      "to": "0x10239e1127Ed9e179B98c94530b5C8EC7834Da8D",
      "data": "0x...",
      "value": "0",
      "description": "Approve PCASH"
    },
    {
      "to": "0x067Dd0189805bb716673d24fb44BDd054A5Debed",
      "data": "0x...",
      "value": "0",
      "description": "Gift PCASH to pet"
    }
  ],
  "totalAmount": "100000000000000000000",
  "gasEstimate": "150000"
}
```

## Error Codes

| Code | Description | Example |
|------|-------------|---------|
| 400 | Bad Request | Invalid parameters |
| 401 | Unauthorized | Invalid or missing JWT |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Resource doesn't exist |
| 409 | Conflict | Resource already exists |
| 422 | Unprocessable Entity | Validation failed |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Server error |

## Rate Limits

- **General API**: 100 requests/minute
- **Auth endpoints**: 10 requests/minute
- **Transaction data**: 20 requests/minute
- **Wallet operations**: 30 requests/minute

## Webhooks

### POST /webhooks/score-updated

Triggered when a user's hero score is updated.

**Payload:**
```json
{
  "user": "0x...",
  "oldScore": 1200,
  "newScore": 1250,
  "rank": 15,
  "timestamp": "2026-05-08T10:00:00.000Z"
}
```

### POST /webhooks/card-traded

Triggered when a card is traded.

**Payload:**
```json
{
  "tokenId": 1,
  "from": "0x...",
  "to": "0x...",
  "price": "216000000000000000000",
  "royalty": "3240000000000000000",
  "timestamp": "2026-05-08T10:00:00.000Z"
}
```

## SDK Examples

### JavaScript/TypeScript

```typescript
import { Bae4UClient } from '@bae4u/sdk';

const client = new Bae4UClient({
  baseURL: 'https://baebackend-production.up.railway.app',
  jwt: 'your_jwt_token'
});

// Get hero leaderboard
const leaderboard = await client.heroes.getLeaderboard();

// Buy a card
const txData = await client.cards.getBuyTxData(1);
const tx = await signer.sendTransaction(txData.steps[0]);
await tx.wait();

// Lock tournament deck
await client.tournaments.lockDeck([1, 2, 3, 4, 5]);
```

### React Hook

```typescript
import { useBae4U } from '@bae4u/react';

function MyComponent() {
  const { heroes, cards, tournaments } = useBae4U();
  
  const { data: leaderboard } = heroes.useLeaderboard();
  const { data: myCards } = cards.useMyCards();
  const { data: currentTournament } = tournaments.useCurrent();
  
  return (
    <div>
      <h1>Leaderboard</h1>
      {leaderboard?.heroes.map(hero => (
        <div key={hero.address}>
          {hero.address}: {hero.score}
        </div>
      ))}
    </div>
  );
}
```

## Testing

### Test Environment

```
https://baebackend-staging.up.railway.app
```

### Test Accounts

| Role | Address | Private Key |
|------|---------|-------------|
| Admin | 0xa58DCCb0F17279abD1d0D9069Aa8711Df4a4c58E | In staging env |
| User | 0x7C022be91c72f4715EE5AAFa718C23646aF9DAfE | In staging env |

## Changelog

### v2.0.0
- Added Heroes API
- Added Cards API
- Added Tournaments API
- Added Couples API
- Added Wallet API
- Added Actions API

### v1.0.0
- Basic auth endpoints
- Profile management
- Matching system
- Messaging
