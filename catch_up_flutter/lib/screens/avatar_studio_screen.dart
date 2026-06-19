import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_svg/flutter_svg.dart';
import '../design/tokens.dart';
import '../providers/auth_provider.dart';
import '../services/api_service.dart';
import 'bitmoji_creator_screen.dart';
import 'ai_avatar_screen.dart';

/// Avatar Studio — the hub for creating a profile avatar.
///
/// Two paths (both backed by real API endpoints):
///   • Notion Bitmoji  → POST /users/me/bitmoji/generate  (+ live customiser)
///   • AI Avatar       → POST /users/me/avatar/kyc-frames
class AvatarStudioScreen extends ConsumerStatefulWidget {
  const AvatarStudioScreen({super.key});

  @override
  ConsumerState<AvatarStudioScreen> createState() => _AvatarStudioScreenState();
}

class _AvatarStudioScreenState extends ConsumerState<AvatarStudioScreen> {
  String? _currentSvg;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _loadCurrent();
  }

  Future<void> _loadCurrent() async {
    final token = ref.read(authProvider).token;
    if (token == null) {
      setState(() => _loading = false);
      return;
    }
    try {
      final res = await ApiService().getBitmoji(token);
      if (mounted) setState(() => _currentSvg = res.svgString);
    } catch (_) {
      // No bitmoji yet — fine, show the empty state.
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final user = ref.watch(currentUserProvider);
    final hasNetworkAvatar =
        user?.avatarIpfsHash != null && user!.avatarIpfsHash!.isNotEmpty;

    return Scaffold(
      backgroundColor: AppTokens.bg,
      appBar: AppBar(
        backgroundColor: AppTokens.bg,
        elevation: 0,
        title: Text('Avatar Studio', style: AppTokens.textStyles.h2),
        iconTheme: const IconThemeData(color: AppTokens.textHi),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(AppTokens.s24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Center(child: _buildCurrentAvatar(hasNetworkAvatar, user?.avatarIpfsHash)),
            const SizedBox(height: AppTokens.s8),
            Center(
              child: Text(
                _currentSvg != null || hasNetworkAvatar
                    ? 'Your current avatar'
                    : 'No avatar yet — create one below',
                style: AppTokens.textStyles.bodySm,
              ),
            ),
            const SizedBox(height: AppTokens.s32),
            Text('CHOOSE A STYLE',
                style: AppTokens.textStyles.label
                    .copyWith(color: AppTokens.accent)),
            const SizedBox(height: AppTokens.s16),
            _buildOption(
              emoji: '🧑‍🎨',
              title: 'Notion Bitmoji',
              description:
                  'Cartoon avatar from your photo. Fully customisable — face, hair, glasses & more.',
              tag: 'POPULAR',
              onTap: () async {
                await Navigator.push(
                  context,
                  MaterialPageRoute(
                      builder: (_) => const BitmojiCreatorScreen()),
                );
                _loadCurrent();
              },
            ),
            const SizedBox(height: AppTokens.s16),
            _buildOption(
              emoji: '🪄',
              title: 'AI Avatar',
              description:
                  'Photo-realistic, stylised portrait. Pick from 8 art styles — anime, 3D, cyberpunk & more.',
              onTap: () async {
                await Navigator.push(
                  context,
                  MaterialPageRoute(builder: (_) => const AiAvatarScreen()),
                );
                if (mounted) ref.read(authProvider.notifier).refreshUser();
              },
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildCurrentAvatar(bool hasNetworkAvatar, String? ipfsHash) {
    const double size = 140;
    Widget child;
    if (_loading) {
      child = const Center(
          child: CircularProgressIndicator(color: AppTokens.accent));
    } else if (_currentSvg != null) {
      child = SvgPicture.string(_currentSvg!, width: size, height: size);
    } else if (hasNetworkAvatar) {
      child = ClipOval(
        child: Image.network(
          'https://gateway.pinata.cloud/ipfs/$ipfsHash',
          width: size,
          height: size,
          fit: BoxFit.cover,
          errorBuilder: (_, __, ___) => _placeholder(),
        ),
      );
    } else {
      child = _placeholder();
    }

    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        color: AppTokens.surface,
        shape: BoxShape.circle,
        border: Border.all(color: AppTokens.border, width: 2),
      ),
      clipBehavior: Clip.antiAlias,
      child: child,
    );
  }

  Widget _placeholder() => const Center(
        child: Icon(Icons.person_outline, color: AppTokens.textLow, size: 56),
      );

  Widget _buildOption({
    required String emoji,
    required String title,
    required String description,
    String? tag,
    required VoidCallback onTap,
  }) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(AppTokens.s16),
        decoration: BoxDecoration(
          color: AppTokens.surface,
          borderRadius: BorderRadius.circular(AppTokens.r16),
          border: Border.all(color: AppTokens.border),
        ),
        child: Row(
          children: [
            Container(
              width: 52,
              height: 52,
              decoration: BoxDecoration(
                color: AppTokens.surface2,
                borderRadius: BorderRadius.circular(AppTokens.r12),
              ),
              child: Center(child: Text(emoji, style: const TextStyle(fontSize: 26))),
            ),
            const SizedBox(width: AppTokens.s16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Text(title, style: AppTokens.textStyles.h3),
                      if (tag != null) ...[
                        const SizedBox(width: AppTokens.s8),
                        Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: AppTokens.s8, vertical: 2),
                          decoration: BoxDecoration(
                            color: AppTokens.accent.withOpacity(0.15),
                            borderRadius: BorderRadius.circular(AppTokens.r8),
                          ),
                          child: Text(tag,
                              style: AppTokens.textStyles.label
                                  .copyWith(color: AppTokens.accent)),
                        ),
                      ],
                    ],
                  ),
                  const SizedBox(height: AppTokens.s4),
                  Text(description,
                      style: AppTokens.textStyles.bodySm
                          .copyWith(color: AppTokens.textMid)),
                ],
              ),
            ),
            const SizedBox(width: AppTokens.s8),
            const Icon(Icons.chevron_right, color: AppTokens.textMid),
          ],
        ),
      ),
    );
  }
}
