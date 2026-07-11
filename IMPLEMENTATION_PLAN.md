# Bae4You — Implementation Plan (Complete Dating App)

**Scope agreed with owner:** gender + full orientation matching, age + gender filters, reporting + moderation, FCM push (with graceful fallback), and token auto-refresh + error UX. **Explicitly out of scope for now:** verification flow, in-app purchases, referral system, password reset, distance/GPS filter.

This plan corrects several inaccuracies in `FEATURE_AUDIT.md` based on reading the actual code (see "Audit corrections" at the end).

---

## Guiding facts (verified in code)

- Backend: Fastify + TypeScript at `apps/api`, Postgres via `db.query`, migrations auto-run on boot in `apps/api/src/index.ts` (`ALTER TABLE ... ADD COLUMN IF NOT EXISTS`) **and** as standalone scripts in `apps/api/src/db/migrate-*.ts`.
- Frontend: bare Flutter app at `catch_up_flutter` (Riverpod + Dio + socket_io_client). **Not** an Expo app.
- Photos already work end-to-end (Pinata). With `PINATA_JWT` now set, this needs **verification only**, no code.
- Push service (`apps/api/src/services/push.ts`) currently targets **Expo** — dead code, since the Flutter app has no Expo token source. Will be replaced with FCM.
- `/matches/report/:targetUserId` exists but only writes a block row — no reports table, no moderation queue.
- `/auth/refresh` exists on the backend but the Flutter Dio client never calls it; a 401 just logs the user out.

---

## Phase 1 — Gender & Orientation Matching (core)

**Goal:** every user has a `gender` and an `interested_in` preference; discovery only shows mutually-compatible candidates.

### 1.1 DB migration
- New file `apps/api/src/db/migrate-gender.ts` (mirrors `migrate-safety.ts` style) **and** add the same `ALTER TABLE` to the auto-migrate block in `index.ts` (~line 222) so Railway picks it up on deploy:
  ```sql
  ALTER TABLE users
    ADD COLUMN IF NOT EXISTS gender        VARCHAR(20),   -- 'male' | 'female' | 'nonbinary' | 'other'
    ADD COLUMN IF NOT EXISTS interested_in VARCHAR(20);   -- 'male' | 'female' | 'everyone'
  ```
- Also add to `schema.sql` for fresh installs.

### 1.2 Backend — accept & return the fields
- `apps/api/src/routes/users.ts`:
  - Extend `updateSchema` (zod) with `gender` and `interestedIn` enums.
  - Add both to the PUT `/me` update builder.
  - Add both to the `SELECT` in GET `/me` and GET `/:id`.

### 1.3 Backend — filter discovery by orientation
- `apps/api/src/routes/matches.ts`, `/matches/discover`:
  - Load the current user's `gender` + `interested_in` alongside `personality_vector`.
  - Add a SQL `WHERE` clause on both the Pinecone-ordered fetch and the random fallback:
    - candidate matches my preference: `(my interested_in = 'everyone' OR candidate.gender = my interested_in)`
    - I match candidate's preference: `(candidate.interested_in = 'everyone' OR candidate.interested_in = my gender OR candidate.interested_in IS NULL)`
  - Null-safe: users who haven't set orientation yet are still discoverable (treat null as 'everyone') so we don't strand existing rows.

### 1.4 Flutter — capture in onboarding
- `catch_up_flutter/lib/screens/profile_setup_screen.dart`:
  - Insert a new step after "Name" (bump `_totalSteps` 6 → 7, update `_stepTitle`, `_canProceed`, `PageView` children, progress bar): **"About you"** with two pickers — *I am* (gender) and *Interested in*.
  - Pass `gender` + `interestedIn` into the existing `updateProfile(...)` call in `_saveAndComplete`.
- `catch_up_flutter/lib/services/api_service.dart`: add `gender` + `interestedIn` params to `updateProfile`.
- `catch_up_flutter/lib/models/user_models.dart`: add `gender` / `interestedIn` to `User` (fromJson/toJson/copyWith).
- Also surface these as editable in `edit_profile_screen.dart`.

---

## Phase 2 — Advanced Filters (age + gender)

**Goal:** the existing (currently inert) filter sheet in `swipe_screen.dart` actually filters.

### 2.1 Backend
- Discovery already has `birth_date`; add optional query params to `/matches/discover`: `minAge`, `maxAge`, `gender` (override of the stored preference for a session).
  - Age → `birth_date BETWEEN now()-maxAge*interval AND now()-minAge*interval` (null birth_date excluded only when a range is explicitly set).
  - Include `birth_date`/derived `age` and `gender` in the candidate SELECT so cards can show age.

### 2.2 Flutter
- `swipe_screen.dart` `_showFilterSheet()` currently has dead `Slider`/`RangeSlider` widgets. Wire them to state (`_minAge`, `_maxAge`, `_genderFilter`), and on **Apply** pass them through the provider.
  - Remove/hide the "Near Me" distance slider (out of scope) to avoid implying a feature that does nothing — replace with the gender selector.
- `match_provider.dart`: convert `discoverCandidatesProvider` to a `FutureProvider.family` (or add a `filters` state provider it watches) so changing filters refetches.
- `api_service.dart`: add `minAge` / `maxAge` / `gender` to `discoverMatches`.
- Remove the silent `catch → _mockCandidates` fallback in the provider (it masks real errors — replaced by proper error UX in Phase 4).

---

## Phase 3 — Reporting & Moderation

**Goal:** real reports with reasons + an admin queue to action them.

### 3.1 DB migration (`migrate-reports.ts` + `index.ts` auto-migrate + `schema.sql`)
```sql
CREATE TABLE IF NOT EXISTS reports (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reporter_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reported_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reason       VARCHAR(50) NOT NULL,   -- 'spam'|'harassment'|'fake'|'inappropriate'|'other'
  details      TEXT,
  status       VARCHAR(20) NOT NULL DEFAULT 'open',  -- 'open'|'reviewed'|'actioned'|'dismissed'
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_at  TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_reports_reported ON reports (reported_id);
CREATE INDEX IF NOT EXISTS idx_reports_status   ON reports (status);
```

### 3.2 Backend
- Upgrade `/matches/report/:targetUserId` (`matches.ts`) to also insert a `reports` row with a validated `reason` + optional `details` (keeps the existing block-and-unmatch behavior).
- `admin.ts`: add `GET /admin/reports` (filter by status, paginated, joins reporter/reported names) and `PUT /admin/reports/:id` (set status; optionally suspend the reported user in the same call).

### 3.3 Flutter
- Add a report bottom-sheet with reason chips (reachable from the swipe card overflow and the chat screen), calling a new `api_service.dart` `reportUser(targetId, reason, details)`.

### 3.4 Admin moderation UI (minimal)
- `apps/web` is a Next.js app. Add a protected `apps/web/app/admin/reports/page.tsx` that lists open reports and lets an admin dismiss or suspend. Reuse the existing `apps/web/lib/api.ts` client + admin JWT. Keep it minimal (table + two buttons) — this is an internal tool.

---

## Phase 4 — Token Auto-Refresh + Error UX

**Goal:** a stale (1h) access token silently refreshes instead of logging the user out; API errors surface cleanly.

### 4.1 Flutter Dio interceptor
- `catch_up_flutter/lib/services/api_service.dart`:
  - Add an `onError` path for `401`: call `POST /auth/refresh` with the stored `refresh_token`, persist the new access token, retry the original request once. On refresh failure → clear tokens and bubble an `UnauthorizedException` (which the auth layer already treats as sign-out).
  - Add `refreshAccessToken(refreshToken)` method.
  - The interceptor needs read/write access to secure storage; inject a token accessor/refresh callback from `AuthNotifier` rather than newing `ApiService()` ad hoc (note: several screens currently call `ApiService()` directly — route them through `apiServiceProvider` so they share the interceptor).
- `auth_provider.dart`: expose a refresh method + keep `access_token`/`refresh_token` in `FlutterSecureStorage` (already stored on login/register).

### 4.2 Error surfacing
- Replace the two `catch → _mock*` fallbacks in `match_provider.dart` with real error propagation so the `swipe_screen` error UI (already built) shows actual failures.
- Standardize user-facing messages via the existing typed exceptions in `api_service.dart`.

---

## Phase 5 — Push Notifications via FCM (graceful fallback)

**Goal:** replace dead Expo push with FCM; app never crashes if Firebase isn't configured yet.

### 5.1 Backend
- Add `firebase-admin` to `apps/api/package.json`.
- New `apps/api/src/services/fcm.ts`: init `firebase-admin` from a `FIREBASE_SERVICE_ACCOUNT` env var (JSON string) **lazily**; if unset, `sendPush` becomes a no-op that logs once. `messaging().sendEachForMulticast(...)` to the stored tokens; prune tokens that come back `UNREGISTERED`.
- Rewrite `apps/api/src/services/push.ts` to delegate to `fcm.ts` (keep the `registerPushToken` / `sendPushToUser` signatures so `matches.ts` and `socket.ts` callers are unchanged).
- Remove `expo-server-sdk` usage. Add `FIREBASE_SERVICE_ACCOUNT` to `config.ts` as optional and to `.env.example`.
- `push_tokens` table already exists and fits FCM tokens as-is.

### 5.2 Flutter
- Add `firebase_core` + `firebase_messaging` to `pubspec.yaml`.
- New `catch_up_flutter/lib/services/push_service.dart`:
  - Guard `Firebase.initializeApp()` in try/catch — if no `google-services.json` present, log and no-op (**graceful fallback**).
  - Request notification permission, fetch FCM token, register via existing `POST /users/me/push-token` (extend the Flutter `registerPushToken` to send `platform`).
  - Handle foreground messages (in-app banner) + `onMessageOpenedApp` → navigate to the relevant chat via `matchId` in the payload (payloads already include `{type, matchId}` from `matches.ts`/`socket.ts`).
- Call push init from `main.dart` after auth is confirmed (in `AuthWrapper`), on a post-frame callback.
- Android: add the `com.google.gms.google-services` plugin wiring to `android/build.gradle.kts` + `android/app/build.gradle.kts`, commented/ready so it activates once `google-services.json` is dropped in.

### 5.3 Owner setup (documented, not code)
- Create a Firebase project, add Android app (package `com.blockx.bae4you` per `MainActivity.kt`), download `google-services.json` → `android/app/`.
- Generate a service account key → set `FIREBASE_SERVICE_ACCOUNT` on Railway.
- iOS later (needs Apple Developer account + APNs key).

---

## Sequencing & verification

1. **Phase 1** (gender/orientation) — foundational; do first.
2. **Phase 2** (filters) — builds on Phase 1's gender field.
3. **Phase 4** (token refresh/errors) — small, unblocks clean testing of everything else.
4. **Phase 3** (reporting/moderation) — independent.
5. **Phase 5** (FCM) — independent; lands with fallback so it's safe to ship before Firebase creds exist.

**Verification per phase:**
- Backend: `cd apps/api && npm run build` (tsc) must pass; hit new endpoints with the `/dev/token` or `/auth/team-login` path.
- Flutter: `cd catch_up_flutter && flutter analyze` must pass.
- Migrations: confirm the `ALTER TABLE ... IF NOT EXISTS` blocks are idempotent (safe re-run on boot).
- No secrets committed; new env vars documented in `.env.example`.

---

## Audit corrections (FEATURE_AUDIT.md was wrong on these)

- **Push is Expo, not FCM-ready.** Audit said "backend infrastructure ready" — it's ready for Expo, which this app can't use. Hence the FCM migration.
- **Reporting partially exists.** `/matches/report` already blocks+unmatches; it just lacks a reports table/queue.
- **Discovery already uses Pinecone** vector matching with a random fallback — not "random discovery with basic exclusions."
- **Photos are fully wired** to Pinata; only the env var was missing (now set) — no code change, verify only.
- **Admin routes exist** (`suspend`/`activate`/`verify`/`stats`/`fiat`) — the gap is a web UI + a reports endpoint, not the whole panel.
