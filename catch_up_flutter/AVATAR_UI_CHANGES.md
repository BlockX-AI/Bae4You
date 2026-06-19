# Catch Up (Flutter) — Avatar & Onboarding UI Changes

> Added the missing avatar-creation flows (Notion Bitmoji + AI Avatar) and wired
> them into onboarding and the profile menu, per `BAE4U_USERFLOW.md` §3 and §4.
> Date: 2026-06-19

---

## TL;DR

The Flutter app (`catch_up_flutter`) had a full backend for avatars
(`/users/me/bitmoji/*` and `/users/me/avatar/kyc-frames`) but **no UI** for it —
onboarding only offered a static emoji picker. This change adds the complete
client surface so users can:

1. **Authenticate** — (already worked via the wallet modal; unchanged, verified).
2. **Create a Notion-style bitmoji** from a photo and fully customise it.
3. **Generate an AI avatar** from a photo in 8 art styles.

All new screens call **real backend endpoints** — no mock data.

---

## New Files

| File | Purpose |
|---|---|
| `lib/models/avatar_models.dart` | `NotionAvatarConfig` (12 fields + field helpers), `BitmojiResponse`, `AiAvatarStyle` (8 styles), `AiAvatarResponse`. Mirrors the backend's `bitmoji-avatar.ts` shapes. |
| `lib/screens/avatar_studio_screen.dart` | Hub screen. Shows current avatar (SVG bitmoji or IPFS image) and routes to the two creators. |
| `lib/screens/bitmoji_creator_screen.dart` | Photo → generate bitmoji → **live customiser** (10 trait steppers, 8 background swatches, circle/square toggle). |
| `lib/screens/ai_avatar_screen.dart` | Photo → pick 1 of 8 art styles → generate → result preview. |

## Modified Files

| File | Change |
|---|---|
| `lib/services/api_service.dart` | Added 4 methods: `getBitmoji`, `generateBitmoji` (multipart), `updateBitmoji` (PATCH), `generateAiAvatar` (multipart + style, extended 120s timeout). Added `dart:typed_data` + avatar models imports. |
| `lib/main.dart` | Registered `/avatar-studio` route + import. |
| `lib/screens/profile_screen.dart` | Added **"Avatar Studio"** menu item (between Edit Profile and My Pets). |
| `lib/screens/profile_setup_screen.dart` | Added a **"Create bitmoji / AI avatar"** CTA on the avatar onboarding step (step 2), above the emoji grid. |
| `pubspec.yaml` | Added `flutter_svg: ^2.0.10` to render the backend's SVG bitmoji client-side. |

---

## API Mapping (UI → Backend)

All endpoints exist in `apps/api/src/routes/users.ts` and are unchanged.

| UI action | Method | Endpoint |
|---|---|---|
| Load saved bitmoji | `GET` | `/users/me/bitmoji` → `{ config, svgString, traits }` |
| Generate bitmoji from photo | `POST` (multipart `frame0`) | `/users/me/bitmoji/generate` |
| Customise (each tweak, debounced) | `PATCH` | `/users/me/bitmoji` → re-rendered SVG |
| Generate AI avatar | `POST` (multipart `frame0` + `style`) | `/users/me/avatar/kyc-frames` → `{ data: { url, ipfsHash, provider, … } }` |

**AI styles wired** (backend `VALID_STYLES`): `gen-z-creator`, `bitmoji-style`,
`3d-cartoon`, `anime-style`, `cyberpunk`, `noir-glamour`, `luxury-fashion`,
`professional-headshot`.

---

## UX Flow

```
Onboarding (profile-setup, step 2)
  └─ "Create bitmoji / AI avatar" ─┐
                                   ↓
Profile tab ── "Avatar Studio" ──→ AvatarStudioScreen (hub)
                                   ├─→ BitmojiCreatorScreen
                                   │     photo → generate → live customiser → Done
                                   └─→ AiAvatarScreen
                                         photo → style → generate → "Use this avatar"
```

- The bitmoji customiser renders the live SVG returned by the backend on every
  change (debounced 350 ms) so the preview always matches what's saved.
- After AI generation the app calls `refreshUser()` so the new
  `avatar_ipfs_hash` propagates across the app immediately.
- Errors (rate limits, provider failures, network) surface inline via the
  existing `ApiException` handling — no silent failures.

---

## Design Consistency

- Uses the app-shell design system (`AppTokens` — colours, spacing, type,
  radii). No inline colours or magic numbers in new screens.
- The onboarding CTA uses `AppColors` (the pink onboarding palette) to match the
  surrounding `profile_setup_screen` styling.

---

## Verification

- `flutter pub get` — resolves `flutter_svg` (+ vector_graphics) cleanly.
- `flutter analyze` on all new/changed files — **0 errors**. Remaining items are
  `withOpacity` deprecation `info`s, consistent with the existing codebase.

## Notes / Follow-ups

- New screens read the JWT from `authProvider`; they require a real (non-demo)
  token to hit the backend. With `ApiService.demoMode = false` (current), they
  call Railway directly.
- `flutter_svg` renders the backend's self-contained Notion SVG (verified: the
  SVG embeds its own `<defs>`/filter, no external part refs at runtime).
- Camera/gallery use `image_picker` (already a dependency). Android camera
  permission is handled by the plugin; no manifest change was required for
  gallery, but verify camera permission on a physical device build.
