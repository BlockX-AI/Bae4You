import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_svg/flutter_svg.dart';
import '../models/notion_avatar.dart';
import '../providers/notion_avatar_provider.dart';
import '../providers/auth_provider.dart';
import '../services/api_service.dart';
import '../widgets/notion_avatar_display.dart';
import '../theme/app_colors.dart';

class NotionAvatarBuilderScreen extends ConsumerStatefulWidget {
  const NotionAvatarBuilderScreen({super.key});

  @override
  ConsumerState<NotionAvatarBuilderScreen> createState() =>
      _NotionAvatarBuilderScreenState();
}

class _NotionAvatarBuilderScreenState
    extends ConsumerState<NotionAvatarBuilderScreen> {
  late NotionAvatarConfig _config;
  bool _isSaving = false;
  String _selectedPart = 'face';

  // Part ranges (max values)
  static const _partRanges = {
    'face': 15,
    'eye': 13,
    'eyebrow': 15,
    'glass': 13,
    'hair': 57,
    'mouth': 19,
    'nose': 13,
    'accessory': 13,
    'beard': 15,
    'detail': 12,
  };

  static const _partLabels = {
    'face': 'Face',
    'eye': 'Eyes',
    'eyebrow': 'Eyebrows',
    'glass': 'Glasses',
    'hair': 'Hair',
    'mouth': 'Mouth',
    'nose': 'Nose',
    'accessory': 'Accessory',
    'beard': 'Beard',
    'detail': 'Details',
  };

  @override
  void initState() {
    super.initState();
    // Load existing config or create random
    final existing = ref.read(notionAvatarProvider);
    _config = existing ?? NotionAvatarConfig.random();
  }

  void _updatePart(String part, int value) {
    setState(() {
      switch (part) {
        case 'face':
          _config = _config.copyWith(face: value);
        case 'eye':
          _config = _config.copyWith(eye: value);
        case 'eyebrow':
          _config = _config.copyWith(eyebrow: value);
        case 'glass':
          _config = _config.copyWith(glass: value);
        case 'hair':
          _config = _config.copyWith(hair: value);
        case 'mouth':
          _config = _config.copyWith(mouth: value);
        case 'nose':
          _config = _config.copyWith(nose: value);
        case 'accessory':
          _config = _config.copyWith(accessory: value);
        case 'beard':
          _config = _config.copyWith(beard: value);
        case 'detail':
          _config = _config.copyWith(detail: value);
      }
    });
  }

  int _getCurrentValue(String part) {
    switch (part) {
      case 'face':
        return _config.face;
      case 'eye':
        return _config.eye;
      case 'eyebrow':
        return _config.eyebrow;
      case 'glass':
        return _config.glass;
      case 'hair':
        return _config.hair;
      case 'mouth':
        return _config.mouth;
      case 'nose':
        return _config.nose;
      case 'accessory':
        return _config.accessory;
      case 'beard':
        return _config.beard;
      case 'detail':
        return _config.detail;
      default:
        return 0;
    }
  }

  Future<void> _save() async {
    setState(() => _isSaving = true);
    try {
      final token = ref.read(authProvider).token;
      if (token != null) {
        await ApiService().updateBitmoji(
          token: token,
          config: _config.toJson(),
        );
        await ref.read(notionAvatarProvider.notifier).save(_config);
        if (mounted) {
          Navigator.pop(context);
        }
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to save avatar: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _isSaving = false);
    }
  }

  Widget _buildPartPreview(String part, int index) {
    // For "none" options (index 0 for optional parts)
    if (index == 0 &&
        (part == 'glass' || part == 'beard' || part == 'accessory')) {
      return const Icon(Icons.close, color: Colors.white54, size: 32);
    }

    // Map part names to folder names
    final partFolder = {
      'face': 'face',
      'eye': 'eyes',
      'eyebrow': 'eyebrows',
      'glass': 'glasses',
      'hair': 'hair',
      'mouth': 'mouth',
      'nose': 'nose',
      'accessory': 'accessories',
      'beard': 'beard',
      'detail': 'details',
    }[part] ?? part;

    // Build URL to backend SVG part
    final baseUrl = ApiService.baseUrl;
    final svgUrl = '$baseUrl/public/notion-avatar-parts/$partFolder/$index.svg';

    // Use SvgPicture.network to load the part
    return SvgPicture.network(
      svgUrl,
      width: 60,
      height: 60,
      fit: BoxFit.contain,
      placeholderBuilder: (context) => const SizedBox(
        width: 20,
        height: 20,
        child: CircularProgressIndicator(strokeWidth: 2),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      appBar: AppBar(
        backgroundColor: Colors.black,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: Colors.white),
          onPressed: () => Navigator.pop(context),
        ),
        title: const Text(
          'Build your avatar',
          style: TextStyle(color: Colors.white),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.shuffle, color: Colors.white),
            onPressed: () {
              setState(() {
                _config = NotionAvatarConfig.random();
              });
            },
          ),
          TextButton(
            onPressed: _isSaving ? null : _save,
            child: _isSaving
                ? const SizedBox(
                    width: 20,
                    height: 20,
                    child: CircularProgressIndicator(
                      strokeWidth: 2,
                      color: AppColors.primary,
                    ),
                  )
                : const Text(
                    'Save',
                    style: TextStyle(
                      color: AppColors.primary,
                      fontSize: 16,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
          ),
        ],
      ),
      body: Column(
        children: [
          // Avatar preview
          Container(
            height: 300,
            color: const Color(0xFF1a1a1a),
            child: Center(
              child: NotionAvatarDisplay(
                config: _config,
                size: 240,
              ),
            ),
          ),

          // Part selector tabs
          Container(
            height: 80,
            color: const Color(0xFF0d0d0d),
            child: ListView(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 8),
              children: _partLabels.entries.map((entry) {
                final isSelected = _selectedPart == entry.key;
                return GestureDetector(
                  onTap: () => setState(() => _selectedPart = entry.key),
                  child: Container(
                    margin: const EdgeInsets.all(8),
                    padding: const EdgeInsets.symmetric(
                      horizontal: 20,
                      vertical: 12,
                    ),
                    decoration: BoxDecoration(
                      color: isSelected
                          ? AppColors.primary
                          : const Color(0xFF2a2a2a),
                      borderRadius: BorderRadius.circular(24),
                      border: isSelected
                          ? Border.all(color: AppColors.primary, width: 2)
                          : null,
                    ),
                    child: Center(
                      child: Text(
                        entry.value,
                        style: TextStyle(
                          color: isSelected ? Colors.black : Colors.white,
                          fontWeight:
                              isSelected ? FontWeight.w600 : FontWeight.normal,
                        ),
                      ),
                    ),
                  ),
                );
              }).toList(),
            ),
          ),

          // Options grid
          Expanded(
            child: GridView.builder(
              padding: const EdgeInsets.all(16),
              gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                crossAxisCount: 4,
                mainAxisSpacing: 12,
                crossAxisSpacing: 12,
                childAspectRatio: 1,
              ),
              itemCount: (_partRanges[_selectedPart] ?? 0) + 1,
              itemBuilder: (context, index) {
                final isSelected = _getCurrentValue(_selectedPart) == index;
                return GestureDetector(
                  onTap: () => _updatePart(_selectedPart, index),
                  child: Container(
                    decoration: BoxDecoration(
                      color: const Color(0xFF1a1a1a),
                      borderRadius: BorderRadius.circular(12),
                      border: isSelected
                          ? Border.all(color: AppColors.primary, width: 3)
                          : Border.all(color: const Color(0xFF2a2a2a)),
                    ),
                    child: Stack(
                      children: [
                        // Preview of the part
                        Center(
                          child: _buildPartPreview(_selectedPart, index),
                        ),
                        // Index label in corner
                        Positioned(
                          bottom: 4,
                          right: 4,
                          child: Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 6,
                              vertical: 2,
                            ),
                            decoration: BoxDecoration(
                              color: Colors.black54,
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: Text(
                              '$index',
                              style: const TextStyle(
                                color: Colors.white,
                                fontSize: 10,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}
