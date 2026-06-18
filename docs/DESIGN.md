# Design System — Catch Up

## 1. References

| App | What We Steal |
|-----|---------------|
| **NBA Top Shot** | Card-as-asset mental model; pack-opening moment; serial number prominence |
| **Sorare** | Clean dark card grid; live stat badges; scarcity indicators (limited, rare) |
| **Phantom Wallet** | Transaction clarity; address display patterns; copy-to-clipboard UX |
| **Linear** | Dense information density; keyboard-first navigation; zero decorative chrome |
| **Robinhood** | Portfolio total as hero; sparkline charts; buy/sell toggle |
| **Coinbase Wallet** | Send/receive clarity; network indicator; secure transaction signing flow |
| **Add: Blur** | Floor price display; collection-wide bidding; trait-based rarity |
| **Add: Sudoswap** | AMM-style liquidity for NFTs; instant sell quotes; bonding curves |

**Not on this list:** Tinder, Hinge, Bumble — wrong category entirely. We are not a dating app with swiping. We are a trading interface with social collateral.

---

## 2. Color Philosophy

### Dark-Dominant
Background (AppTokens.bg) is near-black. Surfaces (surface, surface2) are subtle lifts. The UI feels like a terminal or cockpit — information-forward, not decoration-forward.

### One Accent
AppTokens.accent (red-pink) appears only on:
- Primary CTA button in active state
- Value-up indicators and positive deltas
- User-generated highlights (theirs, not ours)

Everything else is grayscale with semantic color for money (success/danger/warning).

### Mono Numerals
All numbers that users compare — prices, quantities, ranks, deltas — use JetBrains Mono. This includes "PCASH 1,240" and "#47" and "+12.5%". Proportional fonts are for reading; mono is for scanning.

---

## 3. Card Anatomy

The card is the fundamental unit. Every card displays an asset (pet/person) with tradeable metadata.

```
┌─────────────────────────────┐
│  [PHOTO AREA — 4:3 ratio]   │  ← Real photography, not emoji
│                             │
│  [BADGE — top-left corner]  │  ← Limited, Rare, etc.
│                             │
│       [VALUE — overlay]     │  ← PCASH amount, mono font, bottom-left
└─────────────────────────────┘
│  @username     ▲ 12%        │  ← Name left, delta right
│  Owner: @buyer              │  ← Secondary metadata
├─────────────────────────────┤
│  [BUY] or [PLACE BID]       │  ← Single action, full width
└─────────────────────────────┘
```

**Rules:**
- Photo area is 4:3, never square, never circular.
- Badge is a 16px chip, mono font, background tinted toward accentMuted.
- Value is moneyLg, always white (textHi), overlay with scrim if on photo.
- Username is h3 style, truncated with ellipsis.
- Delta is moneySm, success/danger color, with ▲/▼ triangle (not emoji).
- Footer button is the single primary action. No secondary ghost buttons on cards.

---

## 4. Layout Grid

**Base unit:** 4pt (AppTokens.s4)

**Max content width:** 1280px (desktop web), full-bleed (mobile)

**Card grid:**
- Mobile: 2 columns, 12px gutter (s12)
- Tablet: 3 columns, 16px gutter (s16)
- Desktop: 4 columns, 20px gutter (s20)

**Page padding:** s16 (mobile), s24 (tablet), s32 (desktop)

**Section spacing:** s32 between distinct sections, s16 between related groups

---

## 5. Motion Philosophy

### Subtle, Fast, Purposeful
Motion indicates state change or spatial relationship. It never entertains.

### Allowed in v1

| Animation | Use Case | Duration |
|-----------|----------|----------|
| State transition | Button default → pressed → loading | AppTokens.fast (120ms) |
| Value-change pulse | Number updates (new bid, price change) | AppTokens.slow (320ms) |
| Card flip on tap | Reveal details/back of card | AppTokens.base (200ms) |
| Skeleton loaders | Async content loading | shimmer, 1.5s loop |
| Page push | Standard Material route | AppTokens.base (200ms) |
| Sheet slide | Modal from bottom | AppTokens.base (200ms) |
| Fade | Crossfade images, opacity change | AppTokens.fast (120ms) |

### Banned

Do not implement:
- Parallax scrolling
- 3D tilt on hover
- Glassmorphism blur sweeps
- Animated gradients (moving backgrounds)
- Particle effects (confetti, floating hearts, sparks)
- Decorative floating elements
- Magnetic buttons that follow cursor
- Cursor followers or custom cursors
- Elastic / bounce overshoot on anything except error shake

The only "delight" is speed. The UI should feel instantaneous. If an animation lasts longer than 320ms, it should indicate a meaningful state change (success, navigation) not decoration.
