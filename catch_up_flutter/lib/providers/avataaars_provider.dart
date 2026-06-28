import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'dart:convert';
import '../models/avataaars.dart';
import '../models/user_models.dart';
import 'auth_provider.dart';

/// Stores the user's Avataaars config locally (offline-first).
///
/// Mirrors [NotionAvatarNotifier]: the config is saved to secure storage as
/// JSON so it survives restarts and renders with no backend dependency.
class AvataaarsNotifier extends StateNotifier<AvataaarsConfig?> {
  static const _key = 'avataaars_v1';
  final _storage = const FlutterSecureStorage();

  AvataaarsNotifier() : super(null) {
    _load();
  }

  Future<void> _load() async {
    try {
      final raw = await _storage.read(key: _key);
      if (raw != null) {
        final json = jsonDecode(raw) as Map<String, dynamic>;
        state = AvataaarsConfig.fromJson(json);
      }
    } catch (_) {
      // first run / no avatar yet
    }
  }

  /// Persist a finished avatar.
  Future<void> save(AvataaarsConfig avatar) async {
    state = avatar;
    try {
      await _storage.write(key: _key, value: jsonEncode(avatar.toJson()));
    } catch (_) {
      // local save failed — keep in-memory state anyway
    }
  }

  /// Hydrate from a backend-provided config when there's no local avatar yet
  /// (fresh install / new device). Local edits always win, so only fill when
  /// state is currently null.
  Future<void> hydrateFromBackend(Map<String, dynamic>? config) async {
    if (state != null || config == null) return;
    try {
      final avatar = AvataaarsConfig.fromJson(config);
      state = avatar;
      await _storage.write(key: _key, value: jsonEncode(avatar.toJson()));
    } catch (_) {
      // malformed config — ignore
    }
  }

  Future<void> clear() async {
    state = null;
    try {
      await _storage.delete(key: _key);
    } catch (_) {}
  }

  bool get hasAvatar => state != null;
}

final avataaarsProvider =
    StateNotifierProvider<AvataaarsNotifier, AvataaarsConfig?>((ref) {
  final notifier = AvataaarsNotifier();
  // Hydrate from the authenticated user's avataaars config (fresh device),
  // but only if nothing is stored locally.
  ref.listen<User?>(currentUserProvider, (_, user) {
    notifier.hydrateFromBackend(user?.avataaarsConfig);
  }, fireImmediately: true);
  return notifier;
});
