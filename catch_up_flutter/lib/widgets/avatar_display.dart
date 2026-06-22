import 'package:flutter/material.dart';
import '../models/cartoon_avatar.dart';
import 'cartoon_avatar_painter.dart';

/// Renders a user's avatar with a clear precedence:
///   1. cartoon avatar JSON config  → native CustomPainter (crisp at any size)
///   2. avatar IPFS hash            → network image
///   3. emoji / initial fallback    → caller-supplied widget
///
/// Used on swipe cards, match rows and anywhere another user's avatar shows.
class AvatarDisplay extends StatelessWidget {
  final Map<String, dynamic>? cartoonConfig;
  final String? avatarIpfsHash;
  final double size;
  final bool showBackground;

  /// Shown when neither a cartoon config nor an IPFS image is available.
  final Widget fallback;

  const AvatarDisplay({
    super.key,
    required this.cartoonConfig,
    required this.avatarIpfsHash,
    required this.fallback,
    this.size = 120,
    this.showBackground = true,
  });

  static const _gateway = 'https://gateway.pinata.cloud/ipfs';

  @override
  Widget build(BuildContext context) {
    final cartoon = CartoonAvatar.tryParse(_encode(cartoonConfig));
    if (cartoon != null) {
      return ClipOval(
        child: CartoonAvatarView(
          avatar: cartoon,
          size: size,
          showBackground: showBackground,
        ),
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

  // CartoonAvatar.tryParse takes a JSON string; encode the map (or null).
  String? _encode(Map<String, dynamic>? m) {
    if (m == null) return null;
    final a = CartoonAvatar.fromJson(m);
    return a.toJsonString();
  }
}
