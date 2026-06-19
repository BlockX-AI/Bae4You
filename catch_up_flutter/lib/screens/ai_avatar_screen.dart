import 'dart:typed_data';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:image_picker/image_picker.dart';
import '../design/tokens.dart';
import '../providers/auth_provider.dart';
import '../services/api_service.dart';
import '../models/avatar_models.dart';

/// AI Avatar generation.
///
/// Flow: pick/take a photo → choose an art style → POST
/// /users/me/avatar/kyc-frames (backend provider waterfall) → show result.
class AiAvatarScreen extends ConsumerStatefulWidget {
  const AiAvatarScreen({super.key});

  @override
  ConsumerState<AiAvatarScreen> createState() => _AiAvatarScreenState();
}

class _AiAvatarScreenState extends ConsumerState<AiAvatarScreen> {
  final _picker = ImagePicker();
  final _api = ApiService();

  Uint8List? _photoBytes;
  String _photoName = 'frame0.jpg';
  String _selectedStyle = AiAvatarStyle.all.first.id;

  bool _generating = false;
  String? _error;
  AiAvatarResponse? _result;

  Future<void> _pickPhoto(ImageSource source) async {
    final XFile? file = await _picker.pickImage(
      source: source,
      maxWidth: 1024,
      imageQuality: 90,
    );
    if (file == null) return;
    final bytes = await file.readAsBytes();
    setState(() {
      _photoBytes = bytes;
      _photoName = file.name;
      _result = null;
      _error = null;
    });
  }

  Future<void> _generate() async {
    final token = ref.read(authProvider).token;
    if (token == null || _photoBytes == null) return;

    setState(() {
      _generating = true;
      _error = null;
    });

    try {
      final res = await _api.generateAiAvatar(
        token: token,
        photoBytes: _photoBytes!,
        style: _selectedStyle,
        filename: _photoName,
      );
      if (mounted) setState(() => _result = res);
      // Refresh the user so the new avatar_ipfs_hash propagates app-wide.
      await ref.read(authProvider.notifier).refreshUser();
    } catch (e) {
      if (mounted) {
        setState(() => _error =
            e is ApiException ? e.message : 'Generation failed. Try again.');
      }
    } finally {
      if (mounted) setState(() => _generating = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTokens.bg,
      appBar: AppBar(
        backgroundColor: AppTokens.bg,
        elevation: 0,
        title: Text('AI Avatar', style: AppTokens.textStyles.h2),
        iconTheme: const IconThemeData(color: AppTokens.textHi),
      ),
      body: _result != null ? _buildResult() : _buildEditor(),
    );
  }

  Widget _buildEditor() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(AppTokens.s24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Photo
          Center(child: _photoCircle()),
          const SizedBox(height: AppTokens.s12),
          Center(
            child: TextButton.icon(
              onPressed: _generating ? null : _showSourceSheet,
              icon: const Icon(Icons.add_a_photo_outlined,
                  size: 18, color: AppTokens.accent),
              label: Text(_photoBytes == null ? 'Add a photo' : 'Change photo',
                  style: AppTokens.textStyles.body
                      .copyWith(color: AppTokens.accent)),
            ),
          ),
          const SizedBox(height: AppTokens.s24),
          Text('PICK A STYLE',
              style:
                  AppTokens.textStyles.label.copyWith(color: AppTokens.accent)),
          const SizedBox(height: AppTokens.s12),
          GridView.count(
            crossAxisCount: 2,
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            mainAxisSpacing: AppTokens.s12,
            crossAxisSpacing: AppTokens.s12,
            childAspectRatio: 2.4,
            children: AiAvatarStyle.all.map(_styleCard).toList(),
          ),
          const SizedBox(height: AppTokens.s24),
          if (_error != null) ...[
            _errorBanner(_error!),
            const SizedBox(height: AppTokens.s16),
          ],
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed:
                  (_photoBytes == null || _generating) ? null : _generate,
              style: ElevatedButton.styleFrom(
                backgroundColor: AppTokens.accent,
                foregroundColor: AppTokens.textHi,
                disabledBackgroundColor: AppTokens.surface2,
                padding: const EdgeInsets.symmetric(vertical: AppTokens.s16),
                shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(AppTokens.r12)),
              ),
              child: _generating
                  ? const Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        SizedBox(
                            width: 18,
                            height: 18,
                            child: CircularProgressIndicator(
                                color: AppTokens.textHi, strokeWidth: 2)),
                        SizedBox(width: AppTokens.s12),
                        Text('Generating… this can take a moment'),
                      ],
                    )
                  : const Text('Generate avatar'),
            ),
          ),
          const SizedBox(height: AppTokens.s8),
          Center(
            child: Text(
              _photoBytes == null
                  ? 'Add a photo to continue'
                  : 'Powered by on-device-quality AI · ~10–30s',
              style: AppTokens.textStyles.bodySm,
            ),
          ),
        ],
      ),
    );
  }

  Widget _photoCircle() {
    const double size = 150;
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        color: AppTokens.surface,
        shape: BoxShape.circle,
        border: Border.all(color: AppTokens.border, width: 2),
      ),
      clipBehavior: Clip.antiAlias,
      child: _photoBytes != null
          ? Image.memory(_photoBytes!, fit: BoxFit.cover)
          : const Center(
              child:
                  Icon(Icons.person_outline, color: AppTokens.textLow, size: 56),
            ),
    );
  }

  Widget _styleCard(AiAvatarStyle style) {
    final selected = style.id == _selectedStyle;
    return GestureDetector(
      onTap: () => setState(() => _selectedStyle = style.id),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: AppTokens.fast),
        padding: const EdgeInsets.all(AppTokens.s12),
        decoration: BoxDecoration(
          color: selected ? AppTokens.accent.withOpacity(0.12) : AppTokens.surface,
          borderRadius: BorderRadius.circular(AppTokens.r12),
          border: Border.all(
            color: selected ? AppTokens.accent : AppTokens.border,
            width: selected ? 2 : 1,
          ),
        ),
        child: Row(
          children: [
            Text(style.emoji, style: const TextStyle(fontSize: 26)),
            const SizedBox(width: AppTokens.s8),
            Expanded(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(style.label,
                      style: AppTokens.textStyles.h3.copyWith(
                        color: selected ? AppTokens.accent : AppTokens.textHi,
                      )),
                  Text(style.description,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: AppTokens.textStyles.bodySm),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildResult() {
    final url = _result!.url;
    return SingleChildScrollView(
      padding: const EdgeInsets.all(AppTokens.s24),
      child: Column(
        children: [
          const SizedBox(height: AppTokens.s16),
          Text('Your new avatar ✨',
              style: AppTokens.textStyles.h1, textAlign: TextAlign.center),
          const SizedBox(height: AppTokens.s24),
          Container(
            width: 240,
            height: 240,
            decoration: BoxDecoration(
              color: AppTokens.surface,
              borderRadius: BorderRadius.circular(AppTokens.r16),
              border: Border.all(color: AppTokens.border, width: 2),
            ),
            clipBehavior: Clip.antiAlias,
            child: url != null
                ? Image.network(url,
                    fit: BoxFit.cover,
                    loadingBuilder: (c, child, p) => p == null
                        ? child
                        : const Center(
                            child: CircularProgressIndicator(
                                color: AppTokens.accent)),
                    errorBuilder: (_, __, ___) => const Center(
                        child: Icon(Icons.broken_image_outlined,
                            color: AppTokens.textLow, size: 48)))
                : const SizedBox(),
          ),
          const SizedBox(height: AppTokens.s12),
          if (_result!.provider != null)
            Text('Style: $_selectedStyle · via ${_result!.provider}',
                style: AppTokens.textStyles.bodySm),
          const SizedBox(height: AppTokens.s32),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: () => Navigator.pop(context, true),
              style: ElevatedButton.styleFrom(
                backgroundColor: AppTokens.accent,
                foregroundColor: AppTokens.textHi,
                padding: const EdgeInsets.symmetric(vertical: AppTokens.s16),
                shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(AppTokens.r12)),
              ),
              child: const Text('Use this avatar'),
            ),
          ),
          const SizedBox(height: AppTokens.s12),
          SizedBox(
            width: double.infinity,
            child: OutlinedButton(
              onPressed: () => setState(() => _result = null),
              style: OutlinedButton.styleFrom(
                side: const BorderSide(color: AppTokens.border),
                padding: const EdgeInsets.symmetric(vertical: AppTokens.s16),
                shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(AppTokens.r12)),
              ),
              child: Text('Try another style',
                  style: AppTokens.textStyles.body),
            ),
          ),
        ],
      ),
    );
  }

  void _showSourceSheet() {
    showModalBottomSheet(
      context: context,
      backgroundColor: AppTokens.surface,
      shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(AppTokens.r16))),
      builder: (_) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const SizedBox(height: AppTokens.s8),
            ListTile(
              leading:
                  const Icon(Icons.camera_alt_outlined, color: AppTokens.textHi),
              title: Text('Take a photo', style: AppTokens.textStyles.body),
              onTap: () {
                Navigator.pop(context);
                _pickPhoto(ImageSource.camera);
              },
            ),
            ListTile(
              leading: const Icon(Icons.photo_library_outlined,
                  color: AppTokens.textHi),
              title:
                  Text('Choose from gallery', style: AppTokens.textStyles.body),
              onTap: () {
                Navigator.pop(context);
                _pickPhoto(ImageSource.gallery);
              },
            ),
            const SizedBox(height: AppTokens.s8),
          ],
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
