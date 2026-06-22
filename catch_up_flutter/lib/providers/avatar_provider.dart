import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import '../models/cartoon_avatar.dart';
import '../models/user_models.dart';
import 'auth_provider.dart';

/// Stores the user's cartoon avatar locally (offline-first).
///
/// The avatar is saved to secure storage as JSON, so it survives restarts
/// and never depends on the backend.
class AvatarNotifier extends StateNotifier<CartoonAvatar?> {
  static const _key = 'cartoon_avatar_v1';
  final _storage = const FlutterSecureStorage();

  AvatarNotifier() : super(null) {
    _load();
  }

  Future<void> _load() async {
    try {
      final raw = await _storage.read(key: _key);
      final parsed = CartoonAvatar.tryParse(raw);
      if (parsed != null) state = parsed;
    } catch (_) {
      // ignore – first run / no avatar yet
    }
  }

  /// Persist a finished avatar.
  Future<void> save(CartoonAvatar avatar) async {
    state = avatar.copy();
    try {
      await _storage.write(key: _key, value: avatar.toJsonString());
    } catch (_) {
      // local save failed — keep in-memory state anyway
    }
  }

  /// Hydrate from a backend-provided config when there's no local avatar yet
  /// (e.g. fresh install / new device). Local edits always take precedence, so
  /// we only fill in when state is currently null.
  Future<void> hydrateFromBackend(Map<String, dynamic>? config) async {
    if (state != null || config == null) return;
    try {
      final avatar = CartoonAvatar.fromJson(config);
      state = avatar;
      await _storage.write(key: _key, value: avatar.toJsonString());
    } catch (_) {
      // malformed config — ignore
    }
  }

  /// Clear the saved avatar.
  Future<void> clear() async {
    state = null;
    try {
      await _storage.delete(key: _key);
    } catch (_) {}
  }

  bool get hasAvatar => state != null;
}

final avatarProvider =
    StateNotifierProvider<AvatarNotifier, CartoonAvatar?>((ref) {
  final notifier = AvatarNotifier();
  // When the authenticated user carries a cartoon avatar (e.g. fresh device),
  // hydrate local state from it — but only if nothing is stored locally.
  ref.listen<User?>(currentUserProvider, (_, user) {
    notifier.hydrateFromBackend(user?.cartoonAvatar);
  }, fireImmediately: true);
  return notifier;
});
