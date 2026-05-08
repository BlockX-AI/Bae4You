# Fantasy Bae Frontend Integration Guide

## Overview

Fantasy Bae is a gamification layer on top of the Bae4U dating platform that introduces:
- **Hero Cards**: Tradeable NFT cards representing popular users
- **Tournaments**: Competitive gameplay with card decks
- **Couple Cards**: Special NFTs for verified couples
- **Hero Scores**: Reputation system based on user activity

## Architecture

### Smart Contracts (Base Sepolia)

| Contract | Address | Purpose |
|----------|---------|---------|
| PetsRegistry | `0xAb49505dDA3304BB976878b2103F717674d0C47A` | Profile NFTs (ERC-721) |
| BaeCardRegistry | `0xf220F9d3fb4Fe7B91cdEB53F113C551c55880a58` | Hero Card NFTs (ERC-721) |
| BaeCardMarket | `0x1cBEBC20DF461430d0673C71Ba78672C8799090C` | Card trading marketplace |
| TournamentEngine | `0xf07D28F6B26168e35D2771ba293713bB91877c34` | Tournament management |
| CoupleCard | `0xEe13aF76c55A83CC9b34f296040AFC60C772BA00` | Couple NFTs (ERC-721) |
| PetsCash | `0x10239e1127Ed9e179B98c94530b5C8EC7834Da8D` | Utility token (ERC-20) |

### Backend API

Base URL: `https://baebackend-production.up.railway.app`

## 1. Authentication

All API endpoints require JWT authentication via SIWE (Sign-In with Ethereum).

```typescript
// 1. Get nonce
const nonceResponse = await fetch(`/auth/nonce/${walletAddress}`);
const { nonce } = await nonceResponse.json();

// 2. Create SIWE message
const message = new SiweMessage({
  domain: "baebackend-production.up.railway.app",
  address: walletAddress,
  statement: "Sign in to Bae4U",
  uri: "https://baebackend-production.up.railway.app",
  version: "1",
  chainId: 84532,
  nonce,
});

// 3. Sign message
const signature = await signer.signMessage(message.prepareMessage());

// 4. Verify and get JWT
const authResponse = await fetch("/auth/siwe", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    message: message.prepareMessage(),
    signature,
    address: walletAddress,
  }),
});
const { accessToken } = await authResponse.json();

// 5. Use JWT in subsequent requests
const headers = {
  "Authorization": `Bearer ${accessToken}`,
  "Content-Type": "application/json",
};
```

## 2. Hero Cards System

### 2.1 Card Rarities & Multipliers

| Rarity | Multiplier | Color | Description |
|--------|------------|-------|-------------|
| Common | 1.00× | Gray | Basic hero cards |
| Rare | 1.80× | Blue | Enhanced hero cards |
| Epic | 3.20× | Purple | Premium hero cards |
| Legend | 6.00× | Gold | Legendary hero cards |

### 2.2 Get Hero Cards

```typescript
// Get all listed cards
const cardsResponse = await fetch("/cards", { headers });
const cards = await cardsResponse.json();

// Get specific card details
const cardResponse = await fetch(`/cards/${tokenId}`, { headers });
const card = await cardResponse.json();
```

### 2.3 Buy Hero Cards

```typescript
// Get transaction data for buying a card
const txDataResponse = await fetch(`/actions/tx-data/buy/${tokenId}`, { headers });
const { steps } = await txDataResponse.json();

// Execute transaction steps
for (const step of steps) {
  const tx = await signer.sendTransaction({
    to: step.to,
    data: step.data,
    value: step.value || "0x0",
  });
  await tx.wait();
}
```

### 2.4 Card Market Features

- **Bonding Curve**: Each trade increases price by 8%
- **Royalties**: 1.5% of trade volume goes to card subject
- **Upgrade System**: Burn 3 same-rarity cards + PCASH fee → 1 next tier

## 3. Tournaments

### 3.1 Tournament Flow

1. **Open Tournament**: Admin creates tournament with duration
2. **Lock Deck**: Players select 5 cards and lock them
3. **Submit Scores**: Oracle submits final scores
4. **Claim Prizes**: Winners claim PCASH rewards

### 3.2 Tournament API

```typescript
// Get current tournament
const currentResponse = await fetch("/tournaments/current", { headers });
const tournament = await currentResponse.json();

// Get tournament leaderboard
const leaderboardResponse = await fetch("/tournaments/leaderboard", { headers });
const leaderboard = await leaderboardResponse.json();

// Lock deck (requires PCASH allowance)
const lockResponse = await fetch("/tournaments/deck", {
  method: "POST",
  headers,
  body: JSON.stringify({
    cardIds: [1, 2, 3, 4, 5], // Array of 5 card token IDs
  }),
});
```

### 3.3 Deck Building Strategy

- **Balance**: Mix of rarities for optimal score
- **Synergy**: Cards from same users provide bonuses
- **Meta**: Adjust based on tournament rules

## 4. Couple Cards

### 4.1 Couple Card Requirements

- Mutual match between two users
- 10+ messages exchanged
- Backend-signed EIP-712 proof

### 4.2 Mint Couple Cards

```typescript
// Backend provides signed proof
const coupleProof = {
  userA: "0x...",
  userB: "0x...",
  matchId: "0x...",
  timestamp: 1234567890,
  signature: "0x...",
};

// Mint couple cards (contract interaction)
const coupleContract = new ethers.Contract(COUPLE_CARD_ADDRESS, COUPLE_CARD_ABI, signer);
const tx = await coupleContract.mintCouple(
  coupleProof.userA,
  coupleProof.userB,
  coupleProof.matchId,
  coupleProof.timestamp,
  coupleProof.signature
);
await tx.wait();
```

### 4.3 Couple Card Features

- **Pair NFTs**: Each partner gets one NFT
- **Linked**: Burning one burns both
- **Royalties**: 0.75% to each partner on trades
- **Verification**: On-chain proof of genuine relationship

## 5. Hero Scores

### 5.1 Score Calculation

Hero scores are based on:
- **Activity**: Messages sent, matches made
- **Popularity**: Likes received, profile views
- **Engagement**: Time spent in app
- **Quality**: Response rates, conversation depth

### 5.2 Score API

```typescript
// Get user's hero score
const scoreResponse = await fetch("/heroes/me", { headers });
const { score, rank } = await scoreResponse.json();

// Get leaderboard
const leaderboardResponse = await fetch("/heroes/leaderboard", { headers });
const { heroes } = await leaderboardResponse.json();

// Get specific user's score
const userScoreResponse = await fetch(`/heroes/${address}/score`, { headers });
const { score } = await userScoreResponse.json();
```

### 5.3 Score Benefits

- **Card Eligibility**: High scores can become hero cards
- **Tournament Bonus**: Higher scores = better tournament rewards
- **Visibility**: Top scores shown in leaderboards
- **Royalties**: Hero card subjects earn trade royalties

## 6. Wallet Integration

### 6.1 Wallet Types

| Type | Description | Use Case |
|------|-------------|----------|
| Custodial | Server-managed wallet | New users, gasless experience |
| CDP | Coinbase Smart Wallet | Advanced users, self-custody |
| External | User's own wallet | Power users, full control |

### 6.2 Wallet Setup

```typescript
// Create custodial wallet
const walletResponse = await fetch("/actions/setup-wallet", {
  method: "POST",
  headers,
});
const { address, encryptedPrivateKey } = await walletResponse.json();

// Get wallet balance
const balanceResponse = await fetch("/wallet/balance", { headers });
const { balance } = await balanceResponse.json();
```

## 7. Error Handling

### 7.1 Common Error Codes

| Code | Description | Solution |
|------|-------------|----------|
| 401 | Unauthorized | Refresh JWT token |
| 403 | Forbidden | Check user permissions |
| 429 | Rate Limited | Implement exponential backoff |
| 500 | Server Error | Retry with jitter |

### 7.2 Transaction Errors

```typescript
try {
  const tx = await contract.method(params);
  await tx.wait();
} catch (error) {
  if (error.code === "UNPREDICTABLE_GAS_LIMIT") {
    // Estimate gas manually
    const gasEstimate = await contract.estimateGas.method(params);
    const tx = await contract.method(params, { gasLimit: gasEstimate * 120n / 100n });
    await tx.wait();
  } else if (error.message.includes("insufficient funds")) {
    // Show insufficient funds UI
    showInsufficientFunds();
  }
}
```

## 8. UI Components

### 8.1 Card Display

```typescript
interface CardProps {
  tokenId: number;
  subject: string;
  rarity: "Common" | "Rare" | "Epic" | "Legend";
  multiplier: number;
  price: string;
  owner: string;
}

const CardDisplay: React.FC<CardProps> = ({ tokenId, subject, rarity, multiplier, price, owner }) => {
  const rarityColors = {
    Common: "border-gray-400",
    Rare: "border-blue-500",
    Epic: "border-purple-500",
    Legend: "border-yellow-500",
  };

  return (
    <div className={`border-2 ${rarityColors[rarity]} rounded-lg p-4`}>
      <img src={`https://api.bae4u.com/cards/${tokenId}.json`} alt={`Card ${tokenId}`} />
      <h3>{subject}</h3>
      <p>{rarity}</p>
      <p>{multiplier}×</p>
      <p>{price} PCASH</p>
      <button onClick={() => buyCard(tokenId)}>Buy Card</button>
    </div>
  );
};
```

### 8.2 Tournament Display

```typescript
const TournamentCard: React.FC = () => {
  const [tournament, setTournament] = useState(null);
  const [deck, setDeck] = useState<number[]>([]);

  useEffect(() => {
    fetch("/tournaments/current", { headers })
      .then(res => res.json())
      .then(setTournament);
  }, []);

  const lockDeck = async () => {
    await fetch("/tournaments/deck", {
      method: "POST",
      headers,
      body: JSON.stringify({ cardIds: deck }),
    });
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h2>Tournament</h2>
      {tournament ? (
        <div>
          <p>Ends: {new Date(tournament.endTime).toLocaleString()}</p>
          <p>Prize Pool: {tournament.prizePool} PCASH</p>
          <DeckSelector selected={deck} onChange={setDeck} />
          <button onClick={lockDeck} disabled={deck.length !== 5}>
            Lock Deck
          </button>
        </div>
      ) : (
        <p>No active tournament</p>
      )}
    </div>
  );
};
```

## 9. Performance Optimization

### 9.1 Caching Strategy

- **Card Metadata**: Cache for 1 hour
- **User Scores**: Cache for 5 minutes
- **Tournament Data**: Cache for 30 seconds
- **Leaderboards**: Cache for 1 minute

### 9.2 Lazy Loading

```typescript
// Infinite scroll for card market
const useCardMarket = () => {
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const loadMore = async () => {
    if (loading || !hasMore) return;
    setLoading(true);
    
    const response = await fetch(`/cards?offset=${cards.length}&limit=20`, { headers });
    const newCards = await response.json();
    
    setCards(prev => [...prev, ...newCards]);
    setHasMore(newCards.length === 20);
    setLoading(false);
  };

  return { cards, loading, hasMore, loadMore };
};
```

## 10. Testing

### 10.1 Unit Tests

```typescript
describe("Card Market", () => {
  it("should display card rarity correctly", () => {
    const card = {
      rarity: "Rare",
      multiplier: 180,
    };
    expect(card.multiplier).toBe(180);
  });

  it("should calculate price after trade", () => {
    const initialPrice = ethers.parseEther("100");
    const newPrice = (initialPrice * 10800n) / 10000n;
    expect(newPrice).toBe(ethers.parseEther("108"));
  });
});
```

### 10.2 Integration Tests

```typescript
describe("Full Flow", () => {
  it("should buy card and update ownership", async () => {
    // Mock contract interaction
    const mockContract = {
      buyCard: jest.fn().mockResolvedValue({ wait: () => Promise.resolve() }),
    };
    
    await buyCard(mockContract, 1);
    expect(mockContract.buyCard).toHaveBeenCalledWith(1);
  });
});
```

## 11. Deployment Checklist

- [ ] Update contract addresses in config
- [ ] Verify all API endpoints work
- [ ] Test wallet connections
- [ ] Check error handling
- [ ] Validate transaction flows
- [ ] Performance testing
- [ ] Security audit
- [ ] Documentation review

## 12. Support

For integration issues:
- Check API status: `/health`
- Review contract addresses
- Verify JWT tokens
- Check gas settings
- Monitor error logs

## 13. Changelog

### v2.0.0 (Current)
- Converted profiles from SFT to NFT
- Added Fantasy Bae contracts
- Implemented tournament system
- Added couple cards
- Enhanced scoring system

### v1.0.0
- Basic dating functionality
- SIWE authentication
- Profile NFTs (SFT)
- Pet marketplace
