# Avataaars Avatar Migration

Replacing the Notion-style avatar system with a **self-hosted clone of DiceBear's
"Avataaars"** style. We chose **Approach 2 (clone the parts into our repo and run
our own composer)** over rendering through DiceBear at runtime, so we fully own
the art and can add/extend parts later.

Status legend: ✅ done · 🟡 in progress · ⬜ not started

---

## Phase 0 — Extract parts into our repo ✅ DONE

**Goal:** pull every Avataaars part out of the `@dicebear/avataaars` package into
standalone, colour-tokenised SVG fragments that this project owns, so we no longer
depend on `@dicebear` at runtime.

### What was done
- Installed `@dicebear/core@9.4.2` + `@dicebear/avataaars@9.4.2` as **devDependencies**
  in `apps/api` (build/extract tooling only — not shipped at runtime).
- Wrote `apps/api/scripts/extract-avataaars-parts.ts` (run via
  `pnpm --filter api avataaars:extract`, or `npx tsx scripts/extract-avataaars-parts.ts`).
- Extracted **103 part fragments + 3 structure files + a manifest** into
  `apps/api/public/avataaars-parts/`.
- Verified: composed a full avatar from the fragments + a real palette and
  rasterised it to PNG with `sharp` — renders correctly (skin, hair, eyes, brows,
  beard, clothing, glasses, background all assemble on the shared canvas).

### How the extractor works (the important part)
DiceBear does **not** ship loose SVGs. Each part is a JS function
`(components, colors) => "<svg fragment string>"`. The extractor calls every
variant with two proxies:
- **`colors` proxy** → returns a sentinel `"{{<key>}}"` for any colour access
  (`colors.skin` → `"{{skin}}"`). So every fragment is **recolourable later by
  plain string substitution** — colours are NOT baked into the geometry.
- **`components` proxy** → every member is `undefined`, so nested sub-components
  render as **empty `<g transform=...>` placeholders**. Those empty groups are the
  exact injection slots the composer fills in Phase 1.

Only three things nest other components (confirmed by grep): `base`, `style`, and
`clothing.graphicShirt` (nests `clothingGraphic`). Every other variant is a
standalone leaf.

### Extracted output — `apps/api/public/avataaars-parts/`
```
manifest.json                 ← categories, variants, colour tokens, layout transforms, draw order
_structure/
  base.svg                    ← body/skin skeleton with 8 empty slot groups + {{skin}} token
  style-circle.svg            ← circular frame: bg circle + luminance mask
  style-default.svg           ← no-frame variant
top/              34 variants  (hair + hats/hijab/turban)   tokens: {{hair}} or {{hat}}
eyes/             12 variants
eyebrows/         13 variants
mouth/            12 variants
nose/              1 variant
facialHair/        5 variants                                token: {{facialHair}}
clothing/          9 variants                                token: {{clothes}}
clothingGraphic/  10 variants  (graphic printed on graphicShirt clothing)
accessories/       7 variants  (glasses/eyepatch)            token: {{accessories}}
```
Total leaf parts: **103**. (DiceBear schema counts confirmed exactly.)

### DiceBear internals captured (ground truth for Phase 1)
- **Canvas:** `viewBox="0 0 280 280"`, whole body wrapped in `translate(8)`.
- **Colour tokens** (7): `skin`, `hair`, `facialHair`, `clothes`, `accessories`,
  `hat`, `background`. Each appears as `{{token}}` in the fragments.
- **Draw order** (back → front): background → base(skin) → clothing → mouth →
  nose → eyes → eyebrows → top → facialHair → accessories.
- **Per-category transforms** (from `base.js`, also in `manifest.json`):
  | category        | transform              |
  |-----------------|------------------------|
  | clothing        | `translate(0 170)`     |
  | mouth           | `translate(78 134)`    |
  | nose            | `translate(104 122)`   |
  | eyes            | `translate(76 90)`     |
  | eyebrows        | `translate(76 82)`     |
  | top             | `translate(-1)`        |
  | facialHair      | `translate(49 72)`     |
  | accessories     | `translate(62 42)`     |
  | clothingGraphic | `translate(77 58)` (nested in clothing.graphicShirt) |

### License
- `@dicebear/avataaars` **code: MIT**.
- **Art: Avataaars by Pablo Stanley** — "free for personal and commercial use"
  (https://avataaars.com/). Cloning into our repo is permitted; keep attribution.
- The DiceBear devDependency can be removed after Phase 1 if desired — the
  fragments under `public/avataaars-parts/` are now ours.

---

## Can we add more parts later? YES

This is the whole reason for Approach 2. To add a hairstyle / mouth / glasses:
1. Drop a new fragment `public/avataaars-parts/<category>/<name>.svg`.
2. Add its name to the category's valid-variant set (backend clamp + Flutter tabs).
3. New art must be drawn on the **same 280×280 canvas at the same anchor** as
   existing parts, and use the matching `{{token}}` (e.g. `fill="{{hair}}"`) to be
   recolourable.

Caveats:
- "More hairstyles/mouths/glasses/clothes" = clean add (net-new SVG art in the
  Avataaars visual style — DiceBear has no hidden extra parts to pull).
- **Face *shapes*** are the weak spot: Avataaars has a single face base (only
  `skinColor` varies, not shape). Multiple face shapes = net-new art on `base.svg`.

---

## Phase 1 — Backend composer ✅ DONE
`apps/api/src/services/avataaars-avatar.ts` (mirror of `bitmoji-avatar.ts`):
- `AvataaarsConfig` interface: one variant key per category + 7 colour fields + `shape`.
- `generateAvataaarsSVG(config)`: reads fragments, nests `clothingGraphic` into
  `graphicShirt`, injects leaf parts into `base.svg`'s slot groups (matched by
  transform), substitutes `{{token}}`→hex, applies optional circle frame, wraps
  in the 280×280 root with `translate(8)`.
- `getRandomAvataaarsConfig()` and `traitsToAvataaarsConfig(traits, userId)`
  (maps existing `VisualTraits` — skin tone, hair colour, gender-biased hair
  length, beard/glasses/expression — onto the new categories, deterministic per userId).
- `sanitizeConfig()` clamps user PATCH configs against the manifest's valid variants.
- Reuses `sharp` for PNG rasterization (`rasterizeAvataaarsSVG`).

### Verification
- `apps/api/scripts/avataaars-smoke.ts` renders 7 configs (full w/ graphicShirt+
  skull+beard+round glasses on circle frame, hat variant, minimal, 3× random,
  trait-driven) → valid PNGs, **0 unresolved `{{tokens}}`** across all.
- `tsc --noEmit` clean for the new files.
- Visually confirmed `full` and `hat` PNGs assemble faithfully (correct part
  stacking, colours, framing).

## Phase 2 — API + DB ✅ DONE
**DB migration** — `apps/api/src/db/migrate-avataaars.ts` (run via
`pnpm --filter api migrate:avataaars`):
- `ALTER TABLE users ADD COLUMN IF NOT EXISTS avataaars_config JSONB, avataaars_traits JSONB`.
- Partial-presence index `idx_users_avataaars_config`.
- `bitmoji_config` is left untouched during the transition.

**schema.sql backfill** — added `avataaars_config` / `avataaars_traits` (and the
previously-missing `bitmoji_config` / `bitmoji_traits`) to the `users` table def
so fresh DBs match migrated ones.

**Endpoints** (`apps/api/src/routes/users.ts`, mirror of the bitmoji routes,
wired to `services/avataaars-avatar.ts`):
| method | path | purpose |
|--------|------|---------|
| GET    | `/users/me/avataaars`            | saved config + SVG (auth) |
| GET    | `/users/:id/avataaars.svg`       | public SVG (cards/profiles), `Cache-Control` |
| POST   | `/users/me/avataaars/generate`   | photo frames → traits → config → save |
| POST   | `/users/me/avataaars/randomize`  | fresh random config → save |
| PATCH  | `/users/me/avataaars`            | customiser: merge partial → `sanitizeConfig` clamp → save |
| POST   | `/users/me/avataaars/rasterize`  | PNG (64–1024px) for hero-card compositing |

- PATCH merges the incoming partial onto the current config then runs it through
  `sanitizeConfig()` — every variant/colour is clamped to the manifest's valid set
  (vs the bitmoji route's per-field numeric clamps), so invalid part names can't be stored.
- `generate` reuses the same `ai-avatar` trait-extraction pipeline as bitmoji.

### Verification
- `tsc --noEmit` clean across the whole `apps/api` project (0 errors).
- DB migration not yet run against a live DB (no DB in this environment) — run
  `pnpm --filter api migrate:avataaars` on deploy.

## Phase 3 — Flutter ✅ DONE
All under `catch_up_flutter/`.

**Assets** — copied all 103 fragments + `_structure/` + `manifest.json` into
`assets/avataaars-parts/` and registered every category folder in `pubspec.yaml`.

**Model** — `lib/models/avataaars.dart`:
- `AvataaarsConfig` (variant *name* strings + 7 colours + `shape`), mirrors the
  backend type. Optional parts (`top`/`facialHair`/`accessories`/
  `clothingGraphic`) are nullable; `copyWith` takes `clearX` sentinels so a part
  can be explicitly removed vs. left unchanged.
- `fromJson`/`toJson`/`initial()`/`random()`.
- `AvataaarsVariants` (valid names per category, kept in sync with the manifest;
  includes `hatTops` set) + `AvataaarsPalettes` (skin/hair/clothes/hat/background)
  + `AvataaarsResponse` DTO.

**Composer** — `lib/services/avataaars_builder.dart`: Dart port of
`generateAvataaarsSVG`. Same slot-injection-by-transform, `clothingGraphic`
nesting, `{{token}}`→hex substitution, circle frame, 280×280 root. Loads
fragments from bundled assets via `rootBundle`, caches them, renders fully
offline. Falls back to a placeholder face if assets are missing.

**Display + provider** — `lib/widgets/avataaars_display.dart` (`AvataaarsDisplay`
composes on-device via `FutureBuilder` → `SvgPicture.string`; `AvataaarsFromSvg`
renders a ready string) and `lib/providers/avataaars_provider.dart` (secure-
storage persistence `avataaars_v1`, hydrates from `user.avataaarsConfig` only
when nothing is stored locally — local edits always win).

**Customizer** — `lib/screens/avataaars_builder_screen.dart`: the upgrade over
the Notion builder. Category tabs (Hair/Eyes/Brows/Mouth/Beard/Clothes/Graphic/
Glasses) over a variant grid where **each tile previews the choice in context**
(current avatar with just that part swapped), "None" tiles for optional
categories, plus **colour-swatch rows** (skin / hair-or-hat / beard / clothes /
background) that show/hide based on the active parts. Shuffle + Save (PATCH).

**Plumbing** — added `avataaarsConfig` to the `User` model (JSON in/out/copyWith)
and `getAvataaars`/`updateAvataaars`/`randomizeAvataaars`/`generateAvataaars`
methods to `api_service.dart`.

### Verification
- `flutter analyze` on all 7 changed/new files → **No issues found**.
- Simulated the composer's slot-injection + colour substitution against the
  actual bundled Flutter assets → **0 unresolved `{{tokens}}`**, slots fill
  correctly (parity with the proven backend composer).

## Phase 4 — Cutover ✅ DONE (staged, no deletes)

Chosen approach: **staged cutover with no deletions** + **lazy/on-next-edit
backfill** (no bulk DB migration). The aggressive "full repoint + delete old
code" plan was rejected because swipe cards (`AvatarDisplay`), `Match`, and
`DiscoverCandidate` all read `bitmoji_config`, and the backend discover/match
SELECTs don't return `avataaars_config` — a naive repoint/delete would blank
out other users' avatars on the cards.

### What was wired to Avataaars (`catch_up_flutter/`)
- `lib/main.dart`: registered route `'/avataaars-builder' → AvataaarsBuilderScreen`
  (Notion route kept).
- `lib/screens/profile_screen.dart`: the **own-profile avatar** now watches
  `avataaarsProvider` and renders `AvataaarsDisplay`; the avatar tap and the
  "Avatar Studio" menu item both navigate to `/avataaars-builder`.

### Deliberately kept / deferred (NOT changed)
- Swipe-card `AvatarDisplay`, discover & match feeds still render
  `bitmoji_config` (backend queries unchanged) — other users' cards keep working.
- All Notion + bitmoji files and routes retained (`notion_avatar_*`,
  `bitmoji-avatar.ts`, `notion-avatar-parts/`, etc.). Nothing deleted.
- The `avatar_ipfs_hash` AI/KYC path is untouched.

### Backfill = lazy / on next edit
- No DB backfill script. A user's `avataaars_config` is written the first time
  they open the customizer and Save (PATCH), generate from a photo, or randomize.
  Until then `avataaarsProvider` is null and the profile shows the initial-letter
  fallback.

### Verification
- `flutter analyze lib/screens/profile_screen.dart lib/main.dart` → no errors
  (only pre-existing `withOpacity` deprecation infos).

### Remaining for a future full cutover (out of scope for the staged pass)
- Repoint swipe-card `AvatarDisplay` + add `avataaars_config` to discover/match
  SELECTs and to `Match`/`DiscoverCandidate` models.
- Bulk-backfill existing users to a generated Avataaars config.
- Remove `notion-avatar-parts/`, `bitmoji-avatar.ts`, `notion_avatar_builder.dart`
  and stale singular-named folders. Leave the `avatar_ipfs_hash` AI/KYC path intact.

---

## Files added in Phase 0
- `apps/api/scripts/extract-avataaars-parts.ts` — the extractor.
- `apps/api/package.json` — added `avataaars:extract` script + DiceBear devDeps.
- `apps/api/public/avataaars-parts/**` — 103 fragments + structure + manifest.
- `AVATAAARS_MIGRATION.md` — this file.
