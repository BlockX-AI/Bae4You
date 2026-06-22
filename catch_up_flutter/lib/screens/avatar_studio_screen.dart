import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../design/tokens.dart';
import '../models/cartoon_avatar.dart';
import '../widgets/cartoon_avatar_painter.dart';
import '../providers/avatar_provider.dart';
import '../providers/auth_provider.dart';
import '../services/api_service.dart';
import 'avatar_builder_screen.dart';

/// Avatar Studio — shows the current cartoon avatar and opens the
/// build-from-scratch (Snapchat-style) builder. Fully offline.
class AvatarStudioScreen extends ConsumerWidget {
  const AvatarStudioScreen({super.key});

  Future<void> _openBuilder(BuildContext context) async {
    await Navigator.push(
      context,
      MaterialPageRoute(builder: (_) => const AvatarBuilderScreen()),
    );
  }

  /// Best-effort backend sync (JSON config + rendered PNG → IPFS). Non-blocking.
  Future<void> _syncToBackend(
      WidgetRef ref, String token, CartoonAvatar avatar) async {
    final api = ApiService();
    try {
      await api.updateCartoonAvatar(token: token, cartoonAvatar: avatar.toJson());
    } catch (_) {/* non-blocking */}
    try {
      final png = await renderAvatarToPng(avatar);
      await api.uploadAvatarPng(token: token, bytes: png);
      await ref.read(authProvider.notifier).refreshUser();
    } catch (_) {/* non-blocking */}
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final avatar = ref.watch(avatarProvider);
    final hasAvatar = avatar != null;

    return Scaffold(
      backgroundColor: AppTokens.bg,
      appBar: AppBar(
        backgroundColor: AppTokens.bg,
        elevation: 0,
        iconTheme: const IconThemeData(color: AppTokens.textHi),
        title: Text('Avatar Studio', style: AppTokens.textStyles.h2),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(AppTokens.s24),
        child: Column(
          children: [
            const SizedBox(height: AppTokens.s16),
            Container(
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                border: Border.all(color: AppTokens.border, width: 3),
                boxShadow: AppTokens.md,
              ),
              clipBehavior: Clip.antiAlias,
              child: CartoonAvatarView(
                avatar: avatar ?? CartoonAvatar(),
                size: 200,
              ),
            ),
            const SizedBox(height: AppTokens.s16),
            Text(
              hasAvatar ? 'Your avatar' : 'Create your avatar',
              style: AppTokens.textStyles.h1,
            ),
            const SizedBox(height: AppTokens.s8),
            Text(
              'Build a cartoon avatar from scratch — pick your hair, eyes, '
              'skin tone and more. No photo needed.',
              textAlign: TextAlign.center,
              style: AppTokens.textStyles.body.copyWith(color: AppTokens.textMid),
            ),
            const SizedBox(height: AppTokens.s32),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton.icon(
                onPressed: () => _openBuilder(context),
                icon: Icon(hasAvatar ? Icons.edit : Icons.auto_awesome, size: 20),
                label: Text(hasAvatar ? 'Edit avatar' : 'Start building'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppTokens.accent,
                  foregroundColor: AppTokens.textHi,
                  padding: const EdgeInsets.symmetric(vertical: AppTokens.s16),
                  shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(AppTokens.r12)),
                ),
              ),
            ),
            if (hasAvatar) ...[
              const SizedBox(height: AppTokens.s12),
              SizedBox(
                width: double.infinity,
                child: OutlinedButton.icon(
                  onPressed: () {
                    final surprise =
                        CartoonAvatar.random(DateTime.now().microsecond);
                    ref.read(avatarProvider.notifier).save(surprise);
                    final token = ref.read(authProvider).token;
                    if (token != null) {
                      _syncToBackend(ref, token, surprise);
                    }
                  },
                  icon: const Icon(Icons.casino_outlined,
                      size: 20, color: AppTokens.textHi),
                  label: Text('Surprise me', style: AppTokens.textStyles.body),
                  style: OutlinedButton.styleFrom(
                    side: const BorderSide(color: AppTokens.border),
                    padding: const EdgeInsets.symmetric(vertical: AppTokens.s16),
                    shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(AppTokens.r12)),
                  ),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
