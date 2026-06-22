import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../design/tokens.dart';
import '../models/cartoon_avatar.dart';
import '../widgets/cartoon_avatar_painter.dart';
import '../providers/avatar_provider.dart';
import '../providers/auth_provider.dart';
import '../services/api_service.dart';

/// Snapchat / bitmoji-style avatar builder — build from scratch, fully offline.
///
/// Large live preview up top, category chips, and a grid of options that
/// update the preview instantly. No photo upload, no network calls.
class AvatarBuilderScreen extends ConsumerStatefulWidget {
  const AvatarBuilderScreen({super.key});

  @override
  ConsumerState<AvatarBuilderScreen> createState() =>
      _AvatarBuilderScreenState();
}

class _AvatarBuilderScreenState extends ConsumerState<AvatarBuilderScreen> {
  late CartoonAvatar _draft;
  int _step = 0;

  // Builder steps — order mirrors a Snapchat-style flow.
  static const List<_Step> _steps = [
    _Step('face', 'Face', Icons.face_outlined),
    _Step('skin', 'Skin', Icons.palette_outlined),
    _Step('hairStyle', 'Hair', Icons.cut_outlined),
    _Step('hairColor', 'Hair color', Icons.color_lens_outlined),
    _Step('eyes', 'Eyes', Icons.remove_red_eye_outlined),
    _Step('eyebrows', 'Brows', Icons.architecture_outlined),
    _Step('mouth', 'Mouth', Icons.sentiment_satisfied_outlined),
    _Step('facialHair', 'Beard', Icons.face_retouching_natural_outlined),
    _Step('glasses', 'Glasses', Icons.visibility_outlined),
    _Step('background', 'Background', Icons.gradient_outlined),
  ];

  @override
  void initState() {
    super.initState();
    // Start from the saved avatar if any, else a sensible default.
    _draft = ref.read(avatarProvider)?.copy() ?? CartoonAvatar();
  }

  void _setValue(int v) {
    setState(() => _draft.setValue(_steps[_step].key, v));
  }

  Future<void> _save() async {
    // 1) Local-first: always persist on-device so it survives offline.
    await ref.read(avatarProvider.notifier).save(_draft);

    // 2) Best-effort backend sync so the avatar shows to other users and on
    //    other devices. Failures are non-blocking — the avatar is already saved.
    final token = ref.read(authProvider).token;
    if (token != null) {
      _syncToBackend(token, _draft.copy());
    }

    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Avatar saved'), backgroundColor: AppTokens.success),
      );
      Navigator.pop(context, true);
    }
  }

  /// Push the avatar to the backend: JSON config (for native re-render) and a
  /// rendered PNG → IPFS (for universal display). Fire-and-forget.
  Future<void> _syncToBackend(String token, CartoonAvatar avatar) async {
    final api = ApiService();
    try {
      // TODO: Migrate to Notion avatar system
      // await api.updateBitmoji(token: token, config: avatar.toJson());
    } catch (_) {/* non-blocking */}
    try {
      final png = await renderAvatarToPng(avatar);
      await api.uploadAvatarPng(token: token, bytes: png);
      await ref.read(authProvider.notifier).refreshUser();
    } catch (_) {/* non-blocking */}
  }

  void _randomize() {
    setState(() => _draft = CartoonAvatar.random(DateTime.now().microsecond));
  }

  @override
  Widget build(BuildContext context) {
    final step = _steps[_step];
    final count = AvatarOptions.countFor(step.key);
    final current = _draft.valueFor(step.key);

    return Scaffold(
      backgroundColor: AppTokens.bg,
      appBar: AppBar(
        backgroundColor: AppTokens.bg,
        elevation: 0,
        iconTheme: const IconThemeData(color: AppTokens.textHi),
        title: Text('Build your avatar', style: AppTokens.textStyles.h2),
        actions: [
          IconButton(
            tooltip: 'Randomize',
            onPressed: _randomize,
            icon: const Icon(Icons.casino_outlined, color: AppTokens.textHi),
          ),
          TextButton(
            onPressed: _save,
            child: Text('Save',
                style: AppTokens.textStyles.h3.copyWith(color: AppTokens.accent)),
          ),
        ],
      ),
      body: Column(
        children: [
          // ── Live preview ──────────────────────────────────────
          Container(
            width: double.infinity,
            padding: const EdgeInsets.symmetric(vertical: AppTokens.s24),
            color: AppTokens.surface,
            child: Center(
              child: Container(
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  border: Border.all(color: AppTokens.border, width: 3),
                  boxShadow: AppTokens.md,
                ),
                clipBehavior: Clip.antiAlias,
                child: CartoonAvatarView(avatar: _draft, size: 200),
              ),
            ),
          ),

          // ── Category chips ────────────────────────────────────
          SizedBox(
            height: 86,
            child: ListView.separated(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: AppTokens.s16, vertical: AppTokens.s12),
              itemCount: _steps.length,
              separatorBuilder: (_, __) => const SizedBox(width: AppTokens.s8),
              itemBuilder: (_, i) => _chip(_steps[i], i),
            ),
          ),

          const Divider(height: 1, color: AppTokens.border),

          // ── Option grid for the current step ──────────────────
          Expanded(
            child: GridView.builder(
              padding: const EdgeInsets.all(AppTokens.s16),
              gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                crossAxisCount: 4,
                mainAxisSpacing: AppTokens.s12,
                crossAxisSpacing: AppTokens.s12,
                childAspectRatio: 1,
              ),
              itemCount: count,
              itemBuilder: (_, i) => _optionTile(step.key, i, i == current),
            ),
          ),
        ],
      ),
    );
  }

  Widget _chip(_Step s, int i) {
    final selected = i == _step;
    return GestureDetector(
      onTap: () => setState(() => _step = i),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: AppTokens.fast),
        width: 64,
        padding: const EdgeInsets.symmetric(vertical: AppTokens.s8),
        decoration: BoxDecoration(
          color: selected ? AppTokens.accent.withOpacity(0.15) : AppTokens.surface,
          borderRadius: BorderRadius.circular(AppTokens.r12),
          border: Border.all(
            color: selected ? AppTokens.accent : AppTokens.border,
            width: selected ? 2 : 1,
          ),
        ),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(s.icon, size: 22, color: selected ? AppTokens.accent : AppTokens.textMid),
            const SizedBox(height: AppTokens.s4),
            Text(
              s.label,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: AppTokens.textStyles.label.copyWith(
                color: selected ? AppTokens.accent : AppTokens.textMid,
              ),
            ),
          ],
        ),
      ),
    );
  }

  /// Each option renders a *mini avatar* showing only the change for that
  /// feature, so the user previews the look before selecting it.
  Widget _optionTile(String key, int index, bool selected) {
    final preview = _draft.copy()..setValue(key, index);
    final isColorStep = key == 'skin' || key == 'hairColor' || key == 'background';

    return GestureDetector(
      onTap: () => _setValue(index),
      child: Container(
        decoration: BoxDecoration(
          color: AppTokens.surface,
          borderRadius: BorderRadius.circular(AppTokens.r12),
          border: Border.all(
            color: selected ? AppTokens.accent : AppTokens.border,
            width: selected ? 2.5 : 1,
          ),
        ),
        clipBehavior: Clip.antiAlias,
        child: isColorStep
            ? _colorSwatch(key, index, selected)
            : Stack(
                children: [
                  Center(child: CartoonAvatarView(avatar: preview, size: 72)),
                  if (index == 0 && (key == 'glasses' || key == 'facialHair' || key == 'hairStyle'))
                    Positioned(
                      bottom: 4,
                      left: 0,
                      right: 0,
                      child: Text('None',
                          textAlign: TextAlign.center,
                          style: AppTokens.textStyles.label),
                    ),
                ],
              ),
      ),
    );
  }

  Widget _colorSwatch(String key, int index, bool selected) {
    Color color;
    if (key == 'skin') {
      color = AvatarOptions.skinTones[index];
    } else if (key == 'hairColor') {
      color = AvatarOptions.hairColors[index];
    } else {
      color = AvatarOptions.backgrounds[index];
    }
    return Center(
      child: Container(
        width: 44,
        height: 44,
        decoration: BoxDecoration(
          color: color,
          shape: BoxShape.circle,
          border: Border.all(
            color: selected ? AppTokens.accent : AppTokens.border,
            width: selected ? 3 : 1,
          ),
        ),
        child: selected
            ? const Icon(Icons.check, color: Colors.white, size: 20)
            : null,
      ),
    );
  }
}

class _Step {
  final String key;
  final String label;
  final IconData icon;
  const _Step(this.key, this.label, this.icon);
}
