import 'package:flutter/material.dart';
import '../models/notion_avatar.dart';
import 'notion_avatar_display.dart';

/// Renders a user's avatar with a clear precedence:
///   1. Notion avatar config  → composed on-device (crisp at any size, offline)
///   2. avatar IPFS hash       → network image
///   3. emoji / initial        → caller-supplied [fallback]
///
/// Used on swipe cards, match rows and anywhere another user's avatar shows.
class AvatarDisplay extends StatelessWidget {
  /// The user's Notion avatar config (backend `bitmoji_config`).
  final Map<String, dynamic>? notionConfig;
  final String? avatarIpfsHash;
  final double size;
  final bool showBackground;

  /// Shown when neither a Notion config nor an IPFS image is available.
  final Widget fallback;

  const AvatarDisplay({
    super.key,
    required this.notionConfig,
    required this.avatarIpfsHash,
    required this.fallback,
    this.size = 120,
    this.showBackground = true,
  });

  static const _gateway = 'https://gateway.pinata.cloud/ipfs';

  @override
  Widget build(BuildContext context) {
    final config = _tryParse(notionConfig);
    if (config != null) {
      return NotionAvatarDisplay(
        config: config,
        size: size,
        fallback: fallback,
      );
    }

    final hash = avatarIpfsHash;
    if (hash != null && hash.isNotEmpty) {
      return ClipOval(
        child: Image.network(
          '$_gateway/$hash',
          width: size,
          height: size,
          fit: BoxFit.cover,
          errorBuilder: (_, __, ___) => fallback,
        ),
      );
    }

    return fallback;
  }

  NotionAvatarConfig? _tryParse(Map<String, dynamic>? m) {
    if (m == null) return null;
    try {
      return NotionAvatarConfig.fromJson(m);
    } catch (_) {
      return null;
    }
  }
}
