# Bae4You Flutter App — State of the Repo Audit

## 1. STACK

| Item | Value | Evidence |
|------|-------|----------|
| **Flutter SDK** | `>=3.0.0 <4.0.0` | `pubspec.yaml:7` |
| **Dart** | 3.x (implied by SDK constraint) | `pubspec.yaml` |
| **State Management** | **Flutter Riverpod** (exclusively) | `main.dart:2`, `providers/auth_provider.dart:2`, `providers/match_provider.dart:1`, `providers/chat_provider.dart:1`, plus 16 screen files importing `flutter_riverpod` |
| **Routing** | **Navigator 1.0** (`MaterialApp.routes` + `MaterialPageRoute`) | `main.dart:128-145` defines named routes; `screens/matches_screen.dart:100`, `screens/chat_screen.dart:120`, `screens/swipe_screen.dart:475` use `MaterialPageRoute` |
| **Backend Client** | **Dio** (real REST + WebSocket) | `services/api_service.dart:1` imports `dio`; `services/chat_service.dart:3` imports `web_socket_channel` |
| **Web3 Libraries** | **web3dart** present but unused for actual signing | `pubspec.yaml:28`; no imports in lib/ except via transitive dependencies; `_signMessage` in `auth_provider.dart:209-217` fakes signature with random hex |

**Backend API Base URL:** `https://baebackend-production.up.railway.app` (`api_service.dart:12`)

---

## 2. STRUCTURE

### Top-level lib/ layout

```
lib/
├── main.dart                 # App entry, MaterialApp with routes, theme
├── models/                   # Data classes (User, Match, Pet, ChatMessage, Auth)
├── providers/                # Riverpod state notifiers (auth, match, chat)
├── screens/                  # 21 full-screen pages
├── services/                 # API client (Dio) + WebSocket chat service
├── theme/                    # Single file: AppColors (pink palette)
└── widgets/                  # 42 UI components (glass cards, buttons, effects)
```

### Every Screen (path + purpose)

| Path | Purpose |
|------|---------|
| `screens/chat_screen.dart` | Chat list + chat detail (matches → message history + WebSocket send) |
| `screens/edit_profile_screen.dart` | Edit profile form, calls `updateProfile` API |
| `screens/heroes_leaderboard_screen.dart` | Leaderboard with mock heroes data |
| `screens/home_screen.dart` | Main tab container with bottom nav |
| `screens/interactive_showcase.dart` | **Demo playground** — "✨ Interactive Demo" with tilt cards, glows, pulse animations |
| `screens/landing_screen.dart` | Auth entry — wallet connect modal + "UI Demo" button |
| `screens/matches_screen.dart` | List of mutual matches, navigates to chat |
| `screens/my_hero_stats_screen.dart` | Personal hero stats, calls `/heroes/me` API |
| `screens/my_pets_screen.dart` | Owned pets grid, calls `/pets/portfolio` API |
| `screens/notifications_screen.dart` | Static notification UI with mock data |
| `screens/onboarding_screen.dart` | **Unused** — old onboarding pages with pager |
| `screens/pet_detail_screen.dart` | Pet NFT detail view, calls `/pets/:tokenId` |
| `screens/pets_marketplace_screen.dart` | Browse pets, calls `/pets` API |
| `screens/profile_creation_screen.dart` | **Unused** — old profile creation form |
| `screens/profile_screen.dart` | User profile viewer with menu actions |
| `screens/profile_setup_screen.dart` | **Active onboarding** — 5-step flow (name → avatar → bio → interests → done) |
| `screens/settings_screen.dart` | Settings toggles + logout/delete dialogs |
| `screens/splash_screen.dart` | Animated splash with particle background |
| `screens/swipe_screen.dart` | Tinder-style swipe with real like/pass API calls |
| `screens/transaction_history_screen.dart` | Mock transaction list |
| `screens/ui_showcase_screen.dart` | **Demo** — component gallery (gradient avatars, toggles, loaders) |

### Every Reusable Widget (path + purpose)

| Path | Purpose |
|------|---------|
| `widgets/animated_background.dart` | Mesh gradient background animation |
| `widgets/animated_gradient.dart` | Radial gradient pulse effect |
| `widgets/animated_icon.dart` | Bouncing icon with scale animation |
| `widgets/animated_stat.dart` | Number counter animation |
| `widgets/cached_image.dart` | CachedNetworkImage wrapper with gradient fallback |
| `widgets/chat_timestamp.dart` | Timeago formatting for messages |
| `widgets/confetti.dart` | Particle burst celebration effect |
| `widgets/cursor_follower.dart` | Mouse cursor glow follower |
| `widgets/custom_loaders.dart` | Shimmer/gradient loading indicators |
| `widgets/error_widget.dart` | Error state UI |
| `widgets/floating_hearts.dart` | Background floating heart particles |
| `widgets/glass_card.dart` | Frosted glass card container |
| `widgets/glass_card_3d.dart` | 3D tilt glass card |
| `widgets/glass_navbar.dart` | Bottom nav with glass effect |
| `widgets/glass_search_bar.dart` | Search input with glass effect |
| `widgets/glass_toast.dart` | Toast notification overlay |
| `widgets/glow_button.dart` | Button with animated glow shadow |
| `widgets/gradient_avatar.dart` | Avatar with gradient border |
| `widgets/gradient_chip.dart` | Choice chip with gradient |
| `widgets/gradient_progress.dart` | Animated progress bars |
| `widgets/image_picker_widget.dart` | Photo upload UI with ImagePicker |
| `widgets/lottie_animations.dart` | Lottie JSON animation wrappers |
| `widgets/magnetic_button.dart` | Button that follows cursor magnetically |
| `widgets/page_transitions.dart` | Custom route transitions |
| `widgets/particle_background.dart` | Floating heart particle system |
| `widgets/premium_card.dart` | Premium-styled card container |
| `widgets/premium_effects_demo.dart` | Demo screen for all premium effects |
| `widgets/share_profile.dart` | Share sheet wrapper (share_plus) |
| `widgets/shimmer_card.dart` | Shimmer loading card |
| `widgets/sparkle_effect.dart` | Sparkle particle overlay |
| `widgets/swipe_card_stack.dart` | Tinder card stack with gestures |
| `widgets/tilt_card.dart` | 3D perspective tilt on hover |
| `widgets/wallet_modal.dart` | Wallet connection options bottom sheet |
| *(7 more small utilities)* | Gradients, toggles, list items, section headers |

### Files Over 300 Lines

| Path | Lines |
|------|-------|
| `screens/edit_profile_screen.dart` | 769 |
| `screens/profile_creation_screen.dart` | 743 |
| `screens/interactive_showcase.dart` | 743 |
| `screens/landing_screen.dart` | 738 |
| `screens/settings_screen.dart` | 712 |
| `screens/pets_marketplace_screen.dart` | 660 |
| `screens/transaction_history_screen.dart` | 655 |
| `screens/my_hero_stats_screen.dart` | 609 |
| `screens/heroes_leaderboard_screen.dart` | 557 |
| `screens/profile_screen.dart` | 509 |
| `screens/pet_detail_screen.dart` | 503 |
| `screens/swipe_screen.dart` | 490 |
| `screens/profile_setup_screen.dart` | 487 |
| `screens/chat_screen.dart` | 468 |
| `screens/ui_showcase_screen.dart` | 457 |
| `screens/my_pets_screen.dart` | 447 |
| `widgets/swipe_card_stack.dart` | 443 |
| `widgets/lottie_animations.dart` | 364 |
| `widgets/particle_background.dart` | 338 |
| `widgets/gradient_progress.dart` | 320 |

---

## 3. DEPENDENCIES

| Package | Import Found? | Verdict | Notes |
|---------|---------------|---------|-------|
| `google_fonts` | ✅ 47 files | **USED** | Primary typography |
| `shimmer` | ✅ `shimmer_card.dart`, `custom_loaders.dart` | **USED** | Loading effects |
| `flutter_riverpod` | ✅ 18 files | **USED** | State management |
| `dio` | ✅ `api_service.dart` | **USED** | HTTP client |
| `web_socket_channel` | ✅ `chat_service.dart` | **USED** | Real-time chat |
| `web3dart` | ❌ No direct imports | **UNUSED** | Listed but not imported in app code |
| `shared_preferences` | ❌ No imports | **UNUSED** | Listed, not used (secure storage used instead) |
| `flutter_secure_storage` | ✅ `auth_provider.dart` | **USED** | Token storage |
| `logger` | ✅ `api_service.dart` | **USED** | Request logging |
| `url_launcher` | ❌ No imports | **UNUSED** | Listed, never called |
| `http` | ❌ No imports | **UNUSED** | Dio used instead |
| `connectivity_plus` | ❌ No imports | **UNUSED** | Listed, not integrated |
| `cached_network_image` | ✅ `cached_image.dart` | **USED** | Profile image loading |
| `flutter_svg` | ❌ No imports | **UNUSED** | Listed, no SVG assets used |
| `lottie` | ✅ `lottie_animations.dart` | **USED** | JSON animations |
| `timeago` | ✅ `chat_timestamp.dart` | **USED** | Relative time formatting |
| `intl` | ✅ `chat_timestamp.dart` | **USED** | Date formatting |
| `share_plus` | ✅ `share_profile.dart` | **USED** | Share sheets |
| `image_picker` | ✅ `image_picker_widget.dart`, `edit_profile_screen.dart` | **USED** | Photo upload |
| `crypto` | ❌ No imports | **UNUSED** | Listed, never used |
| `uuid` | ❌ No imports | **UNUSED** | Listed, never used |

**Speculative additions never wired up:** `web3dart`, `shared_preferences`, `url_launcher`, `http`, `connectivity_plus`, `flutter_svg`, `crypto`, `uuid`.

---

## 4. ROUTES

### Named Routes (MaterialApp.routes)

| Route | Screen | Navigation Source | Status |
|-------|--------|-------------------|--------|
| `/` (implicit) | `AuthWrapper` | — | Entry point |
| `/home` | `HomeScreen` | `main.dart:144` (profile setup complete), `landing_screen.dart:207` | ✅ Reachable |
| `/ui-showcase` | `UIShowcaseScreen` | None from app UI | ⚠️ **Orphaned** — accessible via direct URL only |
| `/splash` | `SplashScreenWrapper` | `landing_screen.dart:207` ("UI Demo" button) | ✅ Reachable (demo path) |
| `/onboarding` | `OnboardingScreenWrapper` | None | ⚠️ **Orphaned** |
| `/interactive` | `InteractiveShowcase` | `main.dart:186` (from profile setup wrapper) | ⚠️ Demo path |
| `/create-profile` | `ProfileCreationScreen` | None | ⚠️ **Orphaned** (replaced by `/profile-setup`) |
| `/edit-profile` | `EditProfileScreen` | `profile_screen.dart:175` | ✅ Reachable |
| `/pets-marketplace` | `PetsMarketplaceScreen` | `home_screen.dart` (nav bar) | ✅ Reachable |
| `/my-pets` | `MyPetsScreen` | `profile_screen.dart:180`, `my_hero_stats.dart:423`, `pets_marketplace.dart:224` | ✅ Reachable |
| `/pet-detail` | `PetDetailScreen` | `my_pets.dart:255`, `pets_marketplace.dart:450` | ✅ Reachable |
| `/heroes-leaderboard` | `HeroesLeaderboardScreen` | `profile_screen.dart:185`, `home_screen.dart` | ✅ Reachable |
| `/my-hero-stats` | `MyHeroStatsScreen` | `heroes_leaderboard.dart:198` | ✅ Reachable |
| `/settings` | `SettingsScreen` | `profile_screen.dart:47` | ✅ Reachable |
| `/transaction-history` | `TransactionHistoryScreen` | `profile_screen.dart:190` | ✅ Reachable |
| `/notifications` | `NotificationsScreen` | None from in-app navigation | ⚠️ **Orphaned** — no nav call found |
| `/profile-setup` | `ProfileSetupScreen` | `main.dart:143` (auth wrapper after login) | ✅ Reachable |

**Note:** Navigation is primarily via `MaterialPageRoute` pushes rather than named routes, creating a hybrid approach.

---

## 5. DATA

### Data Sources by Screen

| Screen | Data Source | Details |
|--------|-------------|---------|
| `landing_screen` | **Hardcoded** + demoMode fallback | Wallet address hardcoded to `0x742d35...` (`auth_provider.dart:102`) |
| `profile_setup_screen` | **Mixed** | Form local state → calls real `updateProfile` API on complete |
| `swipe_screen` | **Mixed** | Calls real `/matches/discover` API; falls back to mock candidates on error (`match_provider.dart:19`) |
| `matches_screen` | **Mixed** | Calls real `/matches` API; falls back to mock matches on error (`match_provider.dart:37`) |
| `chat_screen` | **Mixed** | Loads history from REST `/messages/:matchId`, sends via WebSocket |
| `profile_screen` | **Real API** | Reads from `currentUserProvider` (user from auth state) |
| `edit_profile_screen` | **Real API** | Calls `updateProfile` then `refreshUser` |
| `pets_marketplace_screen` | **Real API** | Calls `/pets` endpoint |
| `my_pets_screen` | **Real API** | Calls `/pets/portfolio/:wallet` |
| `pet_detail_screen` | **Real API** | Calls `/pets/:tokenId` |
| `heroes_leaderboard_screen` | **Hardcoded mock** | `_mockHeroes` list (`heroes_leaderboard.dart:25`) |
| `my_hero_stats_screen` | **Real API** | Calls `/heroes/me` |
| `notifications_screen` | **Hardcoded** | Mock notification data inline |
| `transaction_history_screen` | **Hardcoded** | Mock transaction data |
| `settings_screen` | **Local state** | Toggles not persisted to backend |

### Hardcoded Mock Data Locations

| File:Line | Data |
|-----------|------|
| `providers/match_provider.dart:82-128` | `_mockCandidates` — 5 fake profiles (Priya, Arjun, Maya, Rahul, Ananya) |
| `providers/match_provider.dart:130-153` | `_mockMatches` — 2 fake matches (Neha, Vikram) |
| `screens/heroes_leaderboard_screen.dart:25-30` | `_mockHeroes` — 3 fake leaderboard entries |
| `services/api_service.dart:15` | `demoMode = false` flag (when true, all APIs return mock) |
| `services/api_service.dart:58-60` | Mock nonce response when demoMode |
| `services/api_service.dart:74-84` | Mock auth response when demoMode |
| `services/api_service.dart:100-112` | Mock user when demoMode |
| `services/api_service.dart:230-250` | Mock discover candidates when demoMode |
| `services/api_service.dart:277-289` | Mock matches when demoMode |
| `screens/swipe_screen.dart:208` | 30% random match popup chance (commented as "demo") |

### TODO / FIXME / HACK Comments

| File:Line | Text |
|-----------|------|
| `screens/edit_profile_screen.dart:193` | `// TODO: Implement image upload to IPFS or storage` |
| `screens/edit_profile_screen.dart:756` | `// TODO: Implement account deletion API call` |
| `screens/profile_creation_screen.dart:195` | `// TODO: Implement image upload to IPFS or storage` |

---

## 6. UI ASSETS & THEMING

### Theme Files

| Path | Purpose |
|------|---------|
| `theme/app_colors.dart` | Single source of truth — pink/rose color palette with 17 color constants and 3 gradients |

### Hardcoded Colors (Top 5 Offenders)

| File | Count of inline colors | Notes |
|------|------------------------|-------|
| `screens/splash_screen.dart` | 8 | Multiple `Color(0xFFFF6BB0)`, `Colors.white` with opacity variations |
| `screens/interactive_showcase.dart` | 7 | `Color(0xFFFF6BB0)`, `Colors.white`, `AppColors.textPrimary` used as gradient stop |
| `widgets/particle_background.dart` | 6 | `Colors.white`, `Color(0xFFFF6BB0)` in particle system |
| `screens/ui_showcase_screen.dart` | 5 | `Color(0xFF1A0033)` background, gradient colors |
| `screens/landing_screen.dart` | 4 | `Color(0xFFFF6BB0)` for UI demo button border |

**Total inline colors (approximate):** 50+ occurrences of `Color(0xFF...)` or `Colors.` across lib/.

### Assets Directory

```
assets/
├── fonts/     (empty)
└── images/    (empty)
```

**No actual assets present** — fonts loaded via `google_fonts` package (network), no local images.

---

## 7. DEAD CODE & RED FLAGS

### Commented-Out Code Blocks >5 Lines

**None found.**

### Auto-Generated / Forgotten Files

| Path | Issue |
|------|-------|
| `screens/onboarding_screen.dart` | **Dead** — old onboarding with pager; replaced by `profile_setup_screen.dart` |
| `screens/profile_creation_screen.dart` | **Dead** — replaced by 5-step `profile_setup_screen.dart` |
| `screens/ui_showcase_screen.dart` | **Demo-only** — component gallery never linked in production flow |
| `screens/interactive_showcase.dart` | **Demo-only** — accessible only via "UI Demo" button on landing |
| `widgets/premium_effects_demo.dart` | **Dead** — demo page for premium effects |
| `widgets/share_profile.dart` | **Half-dead** — imports `share_plus` but not integrated into profile screen |

### Flutter Create Defaults Remaining

**None.** App fully custom — no counter app scaffold, no default `MyApp`, no `flutter create` comments remain.

### The "Interactive Demo" Screen

**File:** `screens/interactive_showcase.dart` (744 lines)

**User-facing strings mentioning effects/animations:**

```
✨ Interactive Demo
```

**Features showcased (internal labels):**
- `GradientAvatar` with animated ring
- `GradientChip` selection
- `GlowButton` with pulse animation
- `TiltCard` with 3D perspective on hover
- Pulse animation on like button
- Floating emoji reactions
- Confetti burst on super-like

---

## 8. VERDICT

**What to keep:** The Riverpod + Dio architecture is sound and fully wired for auth, profile, matches, pets, and real-time chat. The `api_service.dart` covers all major backend endpoints with proper error handling. The pink theme in `app_colors.dart` is consistent and reusable.

**What to delete:** Two entire screens should be removed — `onboarding_screen.dart` and `profile_creation_screen.dart` are superseded by `profile_setup_screen.dart`. The three "demo/showcase" screens (`ui_showcase_screen.dart`, `interactive_showcase.dart`, `widgets/premium_effects_demo.dart`) and orphaned `notifications_screen.dart` bloat the bundle. Eight unused dependencies (`web3dart`, `shared_preferences`, `url_launcher`, `http`, `connectivity_plus`, `flutter_svg`, `crypto`, `uuid`) should be dropped from `pubspec.yaml`. The hardcoded mock data in `match_provider.dart` and `heroes_leaderboard_screen.dart` should be removed once backend seeding is reliable.

**What needs rewriting:** The wallet signing is completely fake — `_signMessage` generates random hex instead of calling Web3 libraries; this needs real SIWE message signing. The image picker TODOs (IPFS upload) need implementation or removal. The random 30% match popup in `swipe_screen.dart` should use the real `MatchResult.isNewMatch` from the API response.
