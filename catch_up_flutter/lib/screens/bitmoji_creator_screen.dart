import 'dart:async';
import 'dart:typed_data';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'package:image_picker/image_picker.dart';
import '../design/tokens.dart';
import '../providers/auth_provider.dart';
import '../services/api_service.dart';
import '../models/avatar_models.dart';

/// Notion Bitmoji creator.
///
/// Flow: pick/take a photo → POST /users/me/bitmoji/generate (traits → config)
/// → live customiser that PATCHes /users/me/bitmoji on each tweak and shows
/// the SVG the backend returns.
class BitmojiCreatorScreen extends ConsumerStatefulWidget {
  const BitmojiCreatorScreen({super.key});

  @override
  ConsumerState<BitmojiCreatorScreen> createState() =>
      _BitmojiCreatorScreenState();
}

class _BitmojiCreatorScreenState extends ConsumerState<BitmojiCreatorScreen> {
  final _picker = ImagePicker();
  final _api = ApiService();

  bool _loading = true;
  bool _generating = false;
  String? _error;

  NotionAvatarConfig? _config;
  String? _svg;

  // Debounce rapid slider changes into a single PATCH.
  Timer? _debounce;

  // Editable fields shown as steppers, with friendly labels + icons.
  static const List<_Field> _fields = [
    _Field('hair', 'Hair', Icons.cut),
    _Field('face', 'Face', Icons.face_retouching_natural),
    _Field('eye', 'Eyes', Icons.remove_red_eye_outlined),
    _Field('eyebrow', 'Brows', Icons.architecture),
    _Field('nose', 'Nose', Icons.air),
    _Field('mouth', 'Mouth', Icons.sentiment_satisfied_outlined),
    _Field('beard', 'Beard', Icons.face),
    _Field('glass', 'Glasses', Icons.visibility_outlined),
    _Field('accessory', 'Accessory', Icons.star_outline),
    _Field('detail', 'Detail', Icons.auto_awesome_outlined),
  ];

  static const List<String> _bgColors = [
    '#fde2e4', '#fff4e0', '#e8f0d4', '#f3e0c8',
    '#e8d3b8', '#d9e4f5', '#e4d9f5', '#d4f0ed',
  ];

  @override
  void initState() {
    super.initState();
    _loadExisting();
  }

  @override
  void dispose() {
    _debounce?.cancel();
    super.dispose();
  }

  Future<void> _loadExisting() async {
    final token = ref.read(authProvider).token;
    if (token == null) {
      setState(() => _loading = false);
      return;
    }
    try {
      final res = await _api.getBitmoji(token);
      if (res.hasAvatar && mounted) {
        setState(() {
          _config = res.config;
          _svg = res.svgString;
        });
      }
    } catch (_) {
      // none yet
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _pickAndGenerate(ImageSource source) async {
    final token = ref.read(authProvider).token;
    if (token == null) return;

    final XFile? file = await _picker.pickImage(
      source: source,
      maxWidth: 1024,
      imageQuality: 85,
    );
    if (file == null) return;

    setState(() {
      _generating = true;
      _error = null;
    });

    try {
      final Uint8List bytes = await file.readAsBytes();
      final res = await _api.generateBitmoji(
        token: token,
        photoBytes: bytes,
        filename: file.name,
      );
      if (mounted) {
        setState(() {
          _config = res.config;
          _svg = res.svgString;
        });
      }
    } catch (e) {
      if (mounted) setState(() => _error = _msg(e));
    } finally {
      if (mounted) setState(() => _generating = false);
    }
  }

  void _changeField(String key, int value) {
    if (_config == null) return;
    final max = NotionAvatarConfig.maxValues[key] ?? 0;
    final clamped = value < 0 ? max : (value > max ? 0 : value); // wrap around
    setState(() => _config = _config!.withField(key, clamped));
    _pushChange({key: clamped});
  }

  void _changeBg(String hex) {
    if (_config == null) return;
    setState(() => _config = _config!.copyWith(bgColor: hex));
    _pushChange({'bgColor': hex});
  }

  /// Debounced PATCH — keeps the SVG in sync with edits without spamming the API.
  void _pushChange(Map<String, dynamic> changes) {
    final token = ref.read(authProvider).token;
    if (token == null) return;
    _debounce?.cancel();
    _debounce = Timer(const Duration(milliseconds: 350), () async {
      try {
        final res = await _api.updateBitmoji(token: token, changes: changes);
        if (res.hasAvatar && mounted) {
          setState(() {
            _config = res.config;
            _svg = res.svgString;
          });
        }
      } catch (_) {
        // Keep the optimistic local config; surface nothing intrusive.
      }
    });
  }

  String _msg(Object e) =>
      e is ApiException ? e.message : 'Something went wrong. Try again.';

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTokens.bg,
      appBar: AppBar(
        backgroundColor: AppTokens.bg,
        elevation: 0,
        title: Text('Notion Bitmoji', style: AppTokens.textStyles.h2),
        iconTheme: const IconThemeData(color: AppTokens.textHi),
        actions: [
          if (_config != null)
            TextButton(
              onPressed: () => Navigator.pop(context, true),
              child: Text('Done',
                  style: AppTokens.textStyles.h3
                      .copyWith(color: AppTokens.accent)),
            ),
        ],
      ),
      body: _loading
          ? const Center(
              child: CircularProgressIndicator(color: AppTokens.accent))
          : _config == null
              ? _buildCapture()
              : _buildCustomiser(),
    );
  }

  // ── Empty / capture state ──────────────────────────────────────
  Widget _buildCapture() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(AppTokens.s24),
      child: Column(
        children: [
          const SizedBox(height: AppTokens.s32),
          Container(
            width: 160,
            height: 160,
            decoration: BoxDecoration(
              color: AppTokens.surface,
              shape: BoxShape.circle,
              border: Border.all(color: AppTokens.border, width: 2),
            ),
            child: const Center(
                child: Text('🧑‍🎨', style: TextStyle(fontSize: 64))),
          ),
          const SizedBox(height: AppTokens.s24),
          Text('Turn your photo into a bitmoji',
              textAlign: TextAlign.center, style: AppTokens.textStyles.h1),
          const SizedBox(height: AppTokens.s8),
          Text(
            'We read your face traits — skin tone, hair, glasses — and build a '
            'cartoon avatar you can fully customise.',
            textAlign: TextAlign.center,
            style: AppTokens.textStyles.body.copyWith(color: AppTokens.textMid),
          ),
          const SizedBox(height: AppTokens.s32),
          if (_error != null) ...[
            _errorBanner(_error!),
            const SizedBox(height: AppTokens.s16),
          ],
          _primaryButton(
            label: _generating ? 'Generating…' : 'Take a photo',
            icon: Icons.camera_alt_outlined,
            onTap: _generating ? null : () => _pickAndGenerate(ImageSource.camera),
          ),
          const SizedBox(height: AppTokens.s12),
          _secondaryButton(
            label: 'Upload from gallery',
            icon: Icons.photo_library_outlined,
            onTap:
                _generating ? null : () => _pickAndGenerate(ImageSource.gallery),
          ),
          if (_generating) ...[
            const SizedBox(height: AppTokens.s24),
            const CircularProgressIndicator(color: AppTokens.accent),
          ],
        ],
      ),
    );
  }

  // ── Customiser state ───────────────────────────────────────────
  Widget _buildCustomiser() {
    return Column(
      children: [
        // Preview
        Container(
          padding: const EdgeInsets.symmetric(vertical: AppTokens.s24),
          width: double.infinity,
          color: AppTokens.surface,
          child: Column(
            children: [
              Container(
                width: 180,
                height: 180,
                decoration: BoxDecoration(
                  borderRadius:
                      BorderRadius.circular(_config!.shape == 'circle' ? 90 : 24),
                  border: Border.all(color: AppTokens.border, width: 2),
                ),
                clipBehavior: Clip.antiAlias,
                child: _svg != null
                    ? SvgPicture.string(_svg!, width: 180, height: 180)
                    : const SizedBox(),
              ),
              const SizedBox(height: AppTokens.s16),
              // Background swatches
              Wrap(
                spacing: AppTokens.s8,
                children: _bgColors.map((hex) {
                  final selected = _config!.bgColor.toLowerCase() == hex;
                  return GestureDetector(
                    onTap: () => _changeBg(hex),
                    child: Container(
                      width: 28,
                      height: 28,
                      decoration: BoxDecoration(
                        color: Color(int.parse('FF${hex.substring(1)}', radix: 16)),
                        shape: BoxShape.circle,
                        border: Border.all(
                          color: selected ? AppTokens.accent : AppTokens.border,
                          width: selected ? 3 : 1,
                        ),
                      ),
                    ),
                  );
                }).toList(),
              ),
            ],
          ),
        ),
        // Field steppers
        Expanded(
          child: ListView(
            padding: const EdgeInsets.all(AppTokens.s16),
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text('CUSTOMISE',
                      style: AppTokens.textStyles.label
                          .copyWith(color: AppTokens.accent)),
                  _shapeToggle(),
                ],
              ),
              const SizedBox(height: AppTokens.s8),
              ..._fields.map(_buildStepper),
              const SizedBox(height: AppTokens.s24),
              _secondaryButton(
                label: 'Retake photo',
                icon: Icons.refresh,
                onTap: () => setState(() {
                  _config = null;
                  _svg = null;
                }),
              ),
              const SizedBox(height: AppTokens.s24),
            ],
          ),
        ),
      ],
    );
  }

  Widget _shapeToggle() {
    final isCircle = _config!.shape == 'circle';
    return GestureDetector(
      onTap: () {
        final next = isCircle ? 'square' : 'circle';
        setState(() => _config = _config!.copyWith(shape: next));
        _pushChange({'shape': next});
      },
      child: Container(
        padding:
            const EdgeInsets.symmetric(horizontal: AppTokens.s12, vertical: 6),
        decoration: BoxDecoration(
          color: AppTokens.surface2,
          borderRadius: BorderRadius.circular(AppTokens.r24),
          border: Border.all(color: AppTokens.border),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(isCircle ? Icons.circle_outlined : Icons.crop_square,
                size: 16, color: AppTokens.textMid),
            const SizedBox(width: AppTokens.s4),
            Text(isCircle ? 'Circle' : 'Square',
                style: AppTokens.textStyles.bodySm),
          ],
        ),
      ),
    );
  }

  Widget _buildStepper(_Field f) {
    final value = _config!.valueFor(f.key);
    final max = NotionAvatarConfig.maxValues[f.key] ?? 0;
    return Container(
      margin: const EdgeInsets.only(bottom: AppTokens.s8),
      padding: const EdgeInsets.symmetric(
          horizontal: AppTokens.s16, vertical: AppTokens.s8),
      decoration: BoxDecoration(
        color: AppTokens.surface,
        borderRadius: BorderRadius.circular(AppTokens.r12),
        border: Border.all(color: AppTokens.border),
      ),
      child: Row(
        children: [
          Icon(f.icon, size: 20, color: AppTokens.textMid),
          const SizedBox(width: AppTokens.s12),
          Expanded(child: Text(f.label, style: AppTokens.textStyles.body)),
          _roundBtn(Icons.remove, () => _changeField(f.key, value - 1)),
          SizedBox(
            width: 56,
            child: Text('${value + 1}/${max + 1}',
                textAlign: TextAlign.center,
                style: AppTokens.textStyles.moneySm),
          ),
          _roundBtn(Icons.add, () => _changeField(f.key, value + 1)),
        ],
      ),
    );
  }

  Widget _roundBtn(IconData icon, VoidCallback onTap) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: 32,
        height: 32,
        decoration: BoxDecoration(
          color: AppTokens.surface2,
          shape: BoxShape.circle,
          border: Border.all(color: AppTokens.border),
        ),
        child: Icon(icon, size: 18, color: AppTokens.textHi),
      ),
    );
  }

  // ── Shared button styles ───────────────────────────────────────
  Widget _primaryButton(
      {required String label, required IconData icon, VoidCallback? onTap}) {
    return SizedBox(
      width: double.infinity,
      child: ElevatedButton.icon(
        onPressed: onTap,
        icon: Icon(icon, size: 20),
        label: Text(label),
        style: ElevatedButton.styleFrom(
          backgroundColor: AppTokens.accent,
          foregroundColor: AppTokens.textHi,
          padding: const EdgeInsets.symmetric(vertical: AppTokens.s16),
          shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(AppTokens.r12)),
        ),
      ),
    );
  }

  Widget _secondaryButton(
      {required String label, required IconData icon, VoidCallback? onTap}) {
    return SizedBox(
      width: double.infinity,
      child: OutlinedButton.icon(
        onPressed: onTap,
        icon: Icon(icon, size: 20, color: AppTokens.textHi),
        label: Text(label, style: AppTokens.textStyles.body),
        style: OutlinedButton.styleFrom(
          side: const BorderSide(color: AppTokens.border),
          padding: const EdgeInsets.symmetric(vertical: AppTokens.s16),
          shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(AppTokens.r12)),
        ),
      ),
    );
  }

  Widget _errorBanner(String text) {
    return Container(
      padding: const EdgeInsets.all(AppTokens.s12),
      decoration: BoxDecoration(
        color: AppTokens.danger.withOpacity(0.1),
        borderRadius: BorderRadius.circular(AppTokens.r12),
        border: Border.all(color: AppTokens.danger.withOpacity(0.3)),
      ),
      child: Row(
        children: [
          const Icon(Icons.error_outline, color: AppTokens.danger, size: 20),
          const SizedBox(width: AppTokens.s8),
          Expanded(
              child: Text(text,
                  style: AppTokens.textStyles.bodySm
                      .copyWith(color: AppTokens.danger))),
        ],
      ),
    );
  }
}

class _Field {
  final String key;
  final String label;
  final IconData icon;
  const _Field(this.key, this.label, this.icon);
}
