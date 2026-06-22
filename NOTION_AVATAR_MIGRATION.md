# Notion Avatar Migration - Complete

## Summary
Successfully replaced the Flutter cartoon avatar system with proper Notion avatar integration, connecting to the existing backend Notion avatar endpoints.

## Backend (Already Exists)
- ✅ `apps/api/src/services/bitmoji-avatar.ts` - Notion avatar trait mapping & SVG generation
- ✅ `apps/api/src/services/bitmoji-service.ts` - Photo analysis & avatar generation
- ✅ `apps/api/src/routes/users.ts` - Notion avatar API endpoints:
  - `GET /users/me/bitmoji` - Fetch current config + SVG
  - `GET /users/:id/bitmoji.svg` - Public SVG endpoint
  - `POST /users/me/bitmoji/generate` - Generate from photo
  - `PATCH /users/me/bitmoji` - Update config (customizer)
  - `POST /users/me/bitmoji/rasterize` - Get PNG buffer
- ✅ Database: `bitmoji_config` and `bitmoji_traits` JSONB columns in `users` table

## Flutter Changes Completed

### 1. Models
- ✅ **Created** `lib/models/notion_avatar.dart`
  - `NotionAvatarConfig` - matches backend schema (face, eye, eyebrow, glass, hair, mouth, nose, accessory, beard, detail, bgColor, shape)
  - `VisualTraits` - photo analysis traits
  - `BitmojiResponse` - API response wrapper
  - `NotionAvatarConfig.random()` - random config generator

- ✅ **Updated** `lib/models/user_models.dart`
  - Replaced `cartoonAvatar` → `bitmojiConfig` in User, Match, DiscoverCandidate
  - Added `_parseInt()` helper for string-to-int parsing (backend bigint serialization)
  - Updated all `fromJson()` and `toJson()` methods

### 2. API Service
- ✅ **Updated** `lib/services/api_service.dart`
  - Added `getBitmoji()` - GET /users/me/bitmoji
  - Added `updateBitmoji()` - PATCH /users/me/bitmoji
  - Added `generateBitmoji()` - POST /users/me/bitmoji/generate (from photo)
  - Removed `updateCartoonAvatar()` (deprecated)
  - Added import for `notion_avatar.dart`

### 3. Providers
- ✅ **Created** `lib/providers/notion_avatar_provider.dart`
  - `NotionAvatarNotifier` - state management for Notion avatar config
  - Offline-first: saves to FlutterSecureStorage
  - Auto-hydrates from backend `bitmojiConfig` on login
  - `notionAvatarProvider` - Riverpod provider

- ✅ **Updated** `lib/providers/avatar_provider.dart`
  - Fixed to use `bitmojiConfig` instead of `cartoonAvatar` (temporary - will deprecate)

### 4. Widgets
- ✅ **Created** `lib/widgets/notion_avatar_display.dart`
  - `NotionAvatarDisplay` - displays Notion avatar from config or userId
  - `NotionAvatarFromSvg` - renders SVG string directly
  - Uses `flutter_svg` package (already in dependencies)
  - Supports border, size customization
  - Placeholder & loading states

### 5. Screens
- ✅ **Created** `lib/screens/notion_avatar_builder_screen.dart`
  - Full Notion avatar customizer
  - Part selector tabs (Face, Eyes, Eyebrows, Glasses, Hair, Mouth, Nose, Accessory, Beard, Details)
  - Grid view for selecting part variants
  - Live SVG preview from backend
  - Random avatar generator
  - Saves to backend + local storage

- ✅ **Updated** `lib/screens/profile_setup_screen.dart`
  - Removed `cartoonAvatar` from profile update call
  - Simplified avatar step to use emoji (Notion avatar builder available separately)
  - Removed unused imports

- ✅ **Updated** `lib/screens/swipe_screen.dart`
  - Changed `candidate.cartoonAvatar` → `candidate.bitmojiConfig`

- ✅ **Updated** `lib/screens/avatar_builder_screen.dart`
  - Commented out old `updateCartoonAvatar()` call
  - Added TODO for Notion avatar migration

- ✅ **Updated** `lib/screens/avatar_studio_screen.dart`
  - Commented out old `updateCartoonAvatar()` call
  - Added TODO for Notion avatar migration

## How to Use

### For Users
1. **Profile Setup**: Users can select an emoji during onboarding
2. **Avatar Builder**: Navigate to Notion avatar builder to create/customize avatar
3. **Auto-sync**: Avatar config syncs to backend automatically

### For Developers
```dart
// Get current avatar
final avatar = ref.watch(notionAvatarProvider);

// Display avatar
NotionAvatarDisplay(
  config: user.bitmojiConfig != null 
    ? NotionAvatarConfig.fromJson(user.bitmojiConfig!) 
    : null,
  size: 120,
  showBorder: true,
)

// Or from SVG string
NotionAvatarFromSvg(
  svgString: svgString,
  size: 120,
)

// Open avatar builder
Navigator.push(
  context,
  MaterialPageRoute(builder: (_) => const NotionAvatarBuilderScreen()),
)
```

## Migration Path for Old Cartoon Avatars

### Option 1: Keep Both Systems (Recommended for Transition)
- Old users keep their cartoon avatars
- New users get Notion avatars
- Gradually migrate users with a "Upgrade your avatar" prompt

### Option 2: Full Migration
- Run a backend script to convert `cartoon_avatar` → `bitmoji_config`
- Use a default/random Notion config for existing users
- Delete old cartoon avatar files

## Files to Eventually Remove (After Full Migration)
- `lib/models/cartoon_avatar.dart`
- `lib/widgets/cartoon_avatar_painter.dart`
- `lib/screens/avatar_builder_screen.dart` (old cartoon builder)
- `lib/providers/avatar_provider.dart` (replace with notion_avatar_provider)

## Testing Checklist
- [ ] Register new user → emoji selection works
- [ ] Open Notion avatar builder → parts load correctly
- [ ] Customize avatar → SVG updates in real-time
- [ ] Save avatar → syncs to backend
- [ ] Refresh app → avatar persists from backend
- [ ] Swipe screen → avatars display correctly
- [ ] Profile screen → avatar displays correctly
- [ ] Match screen → partner avatars display correctly

## Known Issues / TODOs
1. **SVG Fetching**: `NotionAvatarDisplay` currently has placeholder SVG fetch - need to implement proper HTTP fetch for `/users/:id/bitmoji.svg`
2. **Photo Upload**: `generateBitmoji()` endpoint exists but no UI to upload photo yet
3. **Avatar in Profile Setup**: Currently using emoji - can add Notion avatar builder button
4. **Old Screens**: `avatar_builder_screen.dart` and `avatar_studio_screen.dart` still reference old system - need full replacement or removal

## Next Steps
1. Test the Notion avatar builder screen
2. Add photo upload UI for `generateBitmoji()`
3. Implement proper SVG fetching in `NotionAvatarDisplay`
4. Add Notion avatar builder to profile setup flow
5. Migrate existing users' avatars
6. Remove old cartoon avatar system files
