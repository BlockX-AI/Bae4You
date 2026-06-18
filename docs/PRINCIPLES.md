# Design Principles — Catch Up

## 1. Visual Rules

- **One accent per screen.** The accent color (AppTokens.accent) appears only on the primary CTA and the single most important value indicator. Everything else is neutral.

- **No emoji in chrome.** Emoji belongs strictly to user-generated content (chat messages, bios). Navigation, headers, buttons, and labels use proper icons or text only.

- **Every pixel carries information.** Decorative elements are forbidden. Gradients must indicate state (selected, hover) or depth (elevation), not "premium feel."

- **Money in mono, always.** Currency values, wallet addresses, token IDs, and quantities use JetBrains Mono. Never use proportional fonts for numbers that users compare.

- **Cards: single 1px border.** AppTokens.border is the standard. No double borders, no inset shadows, no glow effects, no neon outlines. Elevation changes with state: default (none), hover (sm), pressed (md), modal (lg).

- **Profile placeholders: real photos or monograms.** Display real user-uploaded photography. Fallback is a neutral monogram (first letter of username, Inter 600, surface2 background). Never emoji avatars in product chrome.

---

## 2. Copy Rules

- **No em-dashes.** Use periods, commas, or line breaks to separate clauses.

- **No exclamation marks.** Exception: user-typed content. Product chrome is calm, direct, certain.

- **Forbidden verbs:** unlock, empower, reimagine, elevate, level up, transform, supercharge, revolutionize, unleash, discover the power of.

- **Forbidden openings:** "Welcome to the future of...", "Join the revolution...", "Imagine a world where...", "We're building..."

- **CTAs: 1-3 words, action-first.** "Buy now", "View collection", "Place bid", "Confirm swap", "Copy address". Not "Click here to...", "Learn more about..."

- **Digits, not words.** "5 pets" not "five pets". "1,240 PCASH" not "one thousand two hundred forty."

- **Product name rules.** "Catch Up" in UI chrome (title case). Lowercase "catch up" forbidden. Never abbreviate to "CU."

---

## 3. Naming (User-Visible)

- **Never name effects in UI.** Labels like "Glassmorphism 3D," "Parallax Card," or "50+ Premium Animations" are developer vanity, not user value. Delete.

- **Never use "demo."** The word "demo" does not appear in user-facing strings. Internal docs only.

- **Section headers describe goals.** "Your collection" not "Pets List." "Recent activity" not "Transactions." "Top ranked" not "Leaderboard Table."

---

## 4. State Rules

- **Five states minimum.** Every interactive element handles: default, hover, pressed, focused, disabled. Add loading if async.

- **Four list states.** Every list implements: empty, loading, error, populated.

- **No silent freezes.** Async actions show optimistic UI (immediate feedback) or clear loading indicators (skeletons, spinners). Never let the UI sit unresponsive.

- **Errors: what happened, then what to do.** "Transaction failed. Check your balance and try again." Not "Error." Not "Oops!"

---

## 5. Money Rules

- **Mono font, always.** JetBrains Mono for PCASH, GOLD, quantities, percentages, ratios.

- **Currency prefix.** "PCASH 1,240" not "1,240 PCASH." Symbol first establishes unit before magnitude.

- **Thousands separator.** 1,210 not 1210. 12,450 not 12450.

- **Deltas with color and direction.** Value-up: success color with ▲ triangle. Value-down: danger color with ▼ triangle. Never emoji arrows (⬆️ ⬇️).

- **Zero, not negative.** Never show negative balance. Show 0 and surface the error elsewhere (toast, banner, inline alert).

---

## 6. Forbidden Patterns (Concrete Examples)

Delete on sight:

| Forbidden | Replacement |
|-----------|-------------|
| "✨ Premium experience" | Delete entirely, or replace with functional description |
| "Welcome to the future of dating" | Delete entirely |
| "🎨 50+ animations" | Delete entirely |
| "Move cursor to see effect" | Delete instructional text, make the interaction self-evident |
| "👤 Profile" / "🏷️ Tags" as section headers | Proper icons (Icon.person, Icon.label) or text only |
| "Click here to discover..." | "Discover" or "Browse" |
| "Super Like 💥" | "Priority bid" or "Fast buy" — functional description |
| "Unlock your potential" | Delete entirely |

---

## Spirit

On first open, Catch Up should feel like opening a high-end trading terminal that happens to trade people-as-pets. Dark, dense with information, fast. No hand-holding tutorials. No confetti. The data is the decoration. If the user can't immediately see what they own, what it's worth, and how to trade, the design has failed.
