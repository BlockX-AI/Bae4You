# Avataaars Migration — Status Report

_Self-hosted clone of DiceBear's "Avataaars" avatar system (Approach 2: own the
parts + run our own composer)._ See `AVATAAARS_MIGRATION.md` for full detail.

Last updated: 2026-06-28

---

## TL;DR

| Phase | Scope | Status |
|-------|-------|--------|
| 0 | Extract 103 parts into repo | ✅ Done |
| 1 | Backend composer (`avataaars-avatar.ts`) | ✅ Done |
| 2 | API endpoints + DB migration | ✅ Done (migration not yet run on live DB) |
| 3 | Flutter port (model/composer/UI) | ✅ Done |
| 4 | Cutover | ✅ Done — **staged, no deletes** |
| — | Full cutover (cards/discover/match repoint, deletes, bulk backfill) | ⬜ Deferred |

The app now lets **you** build and view an Avataaars avatar on your own profile,
composed fully on-device. Other users' swipe cards still use the old bitmoji
avatars (intentionally, to avoid breaking them).

---

## What's Done

### Backend (`apps/api/`)
- **103 colour-tokenised SVG part fragments** extracted from DiceBear into
  `public/avataaars-parts/` (top/eyes/eyebrows/mouth/nose/facialHair/clothing/
  clothingGraphic/accessories) + structure files + `manifest.json`. We own the
  art; no `@dicebear` runtime dependency.
- **Composer** `src/services/avataaars-avatar.ts`: assembles a full avatar SVG by
  slot-injection + `{{token}}`→hex colour substitution, optional circle frame,
  280×280 canvas. Plus `getRandomAvataaarsConfig`, `traitsToAvataaarsConfig`,
  `sanitizeConfig` (manifest clamp), `rasterizeAvataaarsSVG` (PNG via sharp).
- **DB migration** `src/db/migrate-avataaars.ts` — adds `avataaars_config` /
  `avataaars_traits` JSONB columns + index. `schema.sql` updated for fresh DBs.
- **6 endpoints** in `src/routes/users.ts`:
  - `GET  /users/me/avataaars` — saved config + SVG
  - `GET  /users/:id/avataaars.svg` — public SVG
  - `POST /users/me/avataaars/generate` — photo → traits → config
  - `POST /users/me/avataaars/randomize`
  - `PATCH /users/me/avataaars` — customizer save (merge + clamp)
  - `POST /users/me/avataaars/rasterize` — PNG 64–1024px

### Flutter (`catch_up_flutter/`)
- **Assets**: all 103 fragments + structure + manifest copied into
  `assets/avataaars-parts/`, registered in `pubspec.yaml`.
- **Model** `lib/models/avataaars.dart`: `AvataaarsConfig` (+ `copyWith` with
  `clearX` sentinels for optional parts), variant lists, palettes, response DTO.
- **Composer** `lib/services/avataaars_builder.dart`: Dart port of the backend
  composer — renders fully offline from bundled assets. Verified parity
  (0 unresolved tokens).
- **Display + provider**: `widgets/avataaars_display.dart` (on-device compose →
  `SvgPicture.string`) + `providers/avataaars_provider.dart` (secure-storage
  persistence `avataaars_v1`, hydrates from backend only when nothing stored
  locally).
- **Customizer** `screens/avataaars_builder_screen.dart`: tabbed category grid
  (Hair/Eyes/Brows/Mouth/Beard/Clothes/Graphic/Glasses), each tile previews the
  part *in context*, "None" for optional parts, colour-swatch rows that show/hide
  by active parts, Shuffle + Save.
- **API plumbing**: `avataaarsConfig` on `User` model + 4 methods in
  `api_service.dart`.

### Phase 4 cutover (staged)
- `main.dart`: `/avataaars-builder` route registered.
- `profile_screen.dart`: own-profile avatar watches `avataaarsProvider`, renders
  `AvataaarsDisplay`; avatar tap + "Avatar Studio" menu → `/avataaars-builder`.

---

## What's Remaining

### Operational (before this works end-to-end in prod)
- [ ] **Run the DB migration** on the live database:
      `pnpm --filter api migrate:avataaars`. Until then the API endpoints will
      error on the missing columns.

### Full cutover (deferred — out of scope for the staged pass)
- [ ] Repoint **swipe-card `AvatarDisplay`**, discover feed, and match feed to
      Avataaars.
- [ ] Add `avataaars_config` to the backend **discover/match SELECT queries** and
      to the `Match` / `DiscoverCandidate` Flutter models.
- [ ] **Bulk-backfill** existing users to a generated Avataaars config (currently
      lazy: a config is only written on first Save / generate / randomize).
- [ ] **Delete old code** once the above is verified: `notion-avatar-parts/`,
      `bitmoji-avatar.ts`, `notion_avatar_builder.dart`, stale singular-named
      folders. Leave the `avatar_ipfs_hash` AI/KYC path intact.

### Nice-to-have
- [ ] Add the photo-driven "generate from selfie" entry point in the Flutter
      customizer UI (endpoint exists; UI currently uses Shuffle + manual edit).
- [ ] Wider QA pass on web vs native (secure storage behaves differently on web).

---

## How to Test Locally

1. App is launched on **Chrome** (`flutter run -d chrome`).
2. Sign in → go to **Profile**.
3. Tap your avatar (or **Avatar Studio**) → opens the Avataaars builder.
4. Switch category tabs, pick parts, change colours, **Shuffle**, then **Save**.
5. Return to Profile — your new avatar should render (composed on-device).

> Note on web: persistence uses `flutter_secure_storage`, which on web maps to
> browser storage and may behave differently than on a real device. If Save
> doesn't persist across reloads in Chrome, test on Windows desktop or a real
> device to confirm.
