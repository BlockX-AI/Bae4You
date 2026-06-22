# Plan: Sync cartoon avatar to backend (JSON config + IPFS PNG)

Goal: persist the locally-built `CartoonAvatar` so it survives reinstall/new device
**and** shows to other users on swipe cards, match lists, and profiles.
Approach: **Both** — store the JSON config (for native re-rendering/editing) and
upload a rendered PNG to IPFS (for universal display / `avatar_ipfs_hash`).

## Backend (apps/api)

1. **Migration** `src/db/migrate-cartoon-avatar.ts` (idempotent, mirrors `migrate-patch.ts`):
   - `ALTER TABLE users ADD COLUMN IF NOT EXISTS cartoon_avatar JSONB;`
   - Add `"migrate:cartoon-avatar"` script to `apps/api/package.json`.
   - Also add the column to `schema.sql` users table so fresh DBs get it.

2. **`PUT /users/me`** (`src/routes/users.ts`):
   - Extend `updateSchema` with `cartoonAvatar: z.record(z.unknown()).optional()`
     (10 small int fields; validated loosely like `personalityVector`).
   - Add to the dynamic UPDATE: `cartoon_avatar = $i` with `JSON.stringify(...)`.

3. **Read endpoints** — add `cartoon_avatar` to the SELECT column lists in:
   - `GET /users/me`, `GET /users/:id` (users.ts)
   - `/matches/discover` (both Pinecone + fallback queries) and `/matches` (matches.ts)

4. **PNG path** — reuse the **existing** `POST /users/me/avatar` (multipart → Pinata
   IPFS → sets `avatar_ipfs_hash`). No backend change needed; client uploads the PNG.

## Flutter (catch_up_flutter)

5. **`ApiService`** (`lib/services/api_service.dart`):
   - `updateProfile(...)`: add optional `Map<String,dynamic>? cartoonAvatar` → include
     as `cartoonAvatar` in the PUT body.
   - Add `uploadAvatarPng(token, Uint8List bytes)` → multipart POST to `/users/me/avatar`
     (field name matches existing handler), returns `{cid, url}`.

6. **Render PNG from painter** — helper that paints `CartoonAvatarView` to PNG bytes via
   `PictureRecorder` + `toImage` (works on web/mobile; size ~256px).

7. **Save flow** (`avatar_builder_screen.dart` `_save()` and Studio "Surprise me"):
   - Keep local secure-storage save (offline-first, unchanged).
   - Then best-effort sync: `PUT /users/me { cartoonAvatar }` + render PNG → `uploadAvatarPng`
     → `refreshUser()`. Failures are non-blocking (snackbar), avatar still saved locally.

8. **Hydrate from backend** — on `getCurrentUser`, if local avatar is null and
   `user.cartoonAvatar` exists, load it into `avatarProvider`. Add `cartoonAvatar` to the
   `User` model (`user_models.dart`) + `DiscoverCandidate`.

9. **Display for others** — render real avatars instead of emoji placeholders:
   - `swipe_screen.dart` `_ProfileCard` photo area: if `candidate.cartoonAvatar != null`
     → `CartoonAvatarView`; else if `avatarIpfsHash != null` → `Image.network(gateway)`;
     else current emoji fallback.
   - `matches_screen.dart` row avatar: same precedence.

## Verification

- `flutter analyze` (0 errors) + extend `test/cartoon_avatar_test.dart` with a
  PNG-render test and a `User.fromJson` cartoon_avatar round-trip.
- `flutter build web` clean.
- Backend: `tsc`/build check on api; migration is idempotent and safe to re-run.
- Manual: build avatar → reload → still present (local); appears on another user's
  discover feed (JSON) and as IPFS image on non-Flutter consumers.

## Notes / scope

- Two sources of truth (JSON + PNG): JSON is authoritative for Flutter rendering;
  PNG/IPFS is the universal fallback. PNG re-uploaded on each save to stay in sync.
- I will NOT run the production migration or deploy — I'll prepare the migration +
  script and you run `pnpm --filter=api migrate:cartoon-avatar` against your DB.
- No new dependencies (uses dart:ui, existing dio multipart, existing IPFS service).
