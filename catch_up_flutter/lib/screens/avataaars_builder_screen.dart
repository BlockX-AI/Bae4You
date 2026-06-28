import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/avataaars.dart';
import '../providers/avataaars_provider.dart';
import '../providers/auth_provider.dart';
import '../services/api_service.dart';
import '../widgets/avataaars_display.dart';
import '../theme/app_colors.dart';

/// Avataaars customizer — the upgrade over the Notion builder.
///
/// Two editing modes per the DiceBear model:
///   - **Parts**: a tab per category (Hair, Eyes, …) with a grid of variants;
///     optional categories (Hair, Beard, Glasses, Graphic) include a "None"
///     tile. Each tile renders the *actual* part live, composed on-device.
///   - **Colours**: swatch rows for skin / hair / clothes / background (and
///     hat / facial-hair when relevant), drawn from the shared palettes.
class AvataaarsBuilderScreen extends ConsumerStatefulWidget {
  const AvataaarsBuilderScreen({super.key});

  @override
  ConsumerState<AvataaarsBuilderScreen> createState() =>
      _AvataaarsBuilderScreenState();
}

class _AvataaarsBuilderScreenState
    extends ConsumerState<AvataaarsBuilderScreen> {
  late AvataaarsConfig _config;
  bool _isSaving = false;
  String _selectedCat = 'top';

  // category key → (label, variant list, optional?)
  static const _cats = <String, String>{
    'top': 'Hair',
    'eyes': 'Eyes',
    'eyebrows': 'Brows',
    'mouth': 'Mouth',
    'facialHair': 'Beard',
    'clothing': 'Clothes',
    'clothingGraphic': 'Graphic',
    'accessories': 'Glasses',
  };

  // categories where "None" (null) is a valid choice
  static const _optional = {'top', 'facialHair', 'accessories', 'clothingGraphic'};

  @override
  void initState() {
    super.initState();
    _config = ref.read(avataaarsProvider) ?? AvataaarsConfig.initial();
  }

  List<String> _variantsFor(String cat) {
    switch (cat) {
      case 'top':
        return AvataaarsVariants.top;
      case 'eyes':
        return AvataaarsVariants.eyes;
      case 'eyebrows':
        return AvataaarsVariants.eyebrows;
      case 'mouth':
        return AvataaarsVariants.mouth;
      case 'facialHair':
        return AvataaarsVariants.facialHair;
      case 'clothing':
        return AvataaarsVariants.clothing;
      case 'clothingGraphic':
        return AvataaarsVariants.clothingGraphic;
      case 'accessories':
        return AvataaarsVariants.accessories;
      default:
        return const [];
    }
  }

  String? _currentVariant(String cat) {
    switch (cat) {
      case 'top':
        return _config.top;
      case 'eyes':
        return _config.eyes;
      case 'eyebrows':
        return _config.eyebrows;
      case 'mouth':
        return _config.mouth;
      case 'facialHair':
        return _config.facialHair;
      case 'clothing':
        return _config.clothing;
      case 'clothingGraphic':
        return _config.clothingGraphic;
      case 'accessories':
        return _config.accessories;
      default:
        return null;
    }
  }

  void _selectVariant(String cat, String? value) {
    setState(() {
      switch (cat) {
        case 'top':
          _config = _config.copyWith(top: value, clearTop: value == null);
        case 'eyes':
          _config = _config.copyWith(eyes: value);
        case 'eyebrows':
          _config = _config.copyWith(eyebrows: value);
        case 'mouth':
          _config = _config.copyWith(mouth: value);
        case 'facialHair':
          _config = _config.copyWith(
              facialHair: value, clearFacialHair: value == null);
        case 'clothing':
          // switching away from graphicShirt drops the graphic
          _config = _config.copyWith(
            clothing: value,
            clearClothingGraphic: value != 'graphicShirt',
            clothingGraphic: value == 'graphicShirt'
                ? (_config.clothingGraphic ?? AvataaarsVariants.clothingGraphic.first)
                : null,
          );
        case 'clothingGraphic':
          _config = _config.copyWith(
              clothingGraphic: value, clearClothingGraphic: value == null);
        case 'accessories':
          _config = _config.copyWith(
              accessories: value, clearAccessories: value == null);
      }
    });
  }

  void _setColor(String field, String hex) {
    setState(() {
      switch (field) {
        case 'skin':
          _config = _config.copyWith(skinColor: hex);
        case 'hair':
          _config = _config.copyWith(hairColor: hex);
        case 'facialHair':
          _config = _config.copyWith(facialHairColor: hex);
        case 'clothes':
          _config = _config.copyWith(clothesColor: hex);
        case 'hat':
          _config = _config.copyWith(hatColor: hex);
        case 'background':
          _config = _config.copyWith(backgroundColor: hex);
      }
    });
  }

  Future<void> _save() async {
    setState(() => _isSaving = true);
    try {
      final token = ref.read(authProvider).token;
      if (token != null) {
        await ApiService().updateAvataaars(token: token, config: _config.toJson());
        await ref.read(avataaarsProvider.notifier).save(_config);
        if (mounted) Navigator.pop(context);
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
        title: const Text('Build your avatar',
            style: TextStyle(color: Colors.white)),
        actions: [
          IconButton(
            icon: const Icon(Icons.shuffle, color: Colors.white),
            onPressed: () => setState(() => _config = AvataaarsConfig.random()),
          ),
          TextButton(
            onPressed: _isSaving ? null : _save,
            child: _isSaving
                ? const SizedBox(
                    width: 20,
                    height: 20,
                    child: CircularProgressIndicator(
                        strokeWidth: 2, color: AppColors.primary),
                  )
                : const Text('Save',
                    style: TextStyle(
                        color: AppColors.primary,
                        fontSize: 16,
                        fontWeight: FontWeight.w600)),
          ),
        ],
      ),
      body: Column(
        children: [
          // Live preview (composed on-device)
          Container(
            height: 260,
            color: const Color(0xFF1a1a1a),
            child: Center(child: AvataaarsDisplay(config: _config, size: 220)),
          ),

          // Colour swatch rows
          _buildColorBar(),

          // Category tabs
          Container(
            height: 64,
            color: const Color(0xFF0d0d0d),
            child: ListView(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 8),
              children: _cats.entries.map((e) {
                final selected = _selectedCat == e.key;
                return GestureDetector(
                  onTap: () => setState(() => _selectedCat = e.key),
                  child: Container(
                    margin: const EdgeInsets.all(8),
                    padding: const EdgeInsets.symmetric(
                        horizontal: 18, vertical: 10),
                    decoration: BoxDecoration(
                      color: selected
                          ? AppColors.primary
                          : const Color(0xFF2a2a2a),
                      borderRadius: BorderRadius.circular(24),
                    ),
                    child: Center(
                      child: Text(
                        e.value,
                        style: TextStyle(
                          color: selected ? Colors.black : Colors.white,
                          fontWeight:
                              selected ? FontWeight.w600 : FontWeight.normal,
                        ),
                      ),
                    ),
                  ),
                );
              }).toList(),
            ),
          ),

          // Variant grid
          Expanded(child: _buildVariantGrid()),
        ],
      ),
    );
  }

  Widget _buildVariantGrid() {
    final cat = _selectedCat;
    final variants = _variantsFor(cat);
    final optional = _optional.contains(cat);
    final current = _currentVariant(cat);

    // graphic only relevant when wearing the graphic shirt
    if (cat == 'clothingGraphic' && _config.clothing != 'graphicShirt') {
      return const Center(
        child: Padding(
          padding: EdgeInsets.all(24),
          child: Text(
            'Pick the "graphicShirt" in Clothes to choose a graphic.',
            textAlign: TextAlign.center,
            style: TextStyle(color: Colors.white54),
          ),
        ),
      );
    }

    final items = <String?>[if (optional) null, ...variants];

    return GridView.builder(
      padding: const EdgeInsets.all(16),
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 4,
        mainAxisSpacing: 12,
        crossAxisSpacing: 12,
        childAspectRatio: 1,
      ),
      itemCount: items.length,
      itemBuilder: (context, i) {
        final variant = items[i];
        final selected = variant == current;
        return GestureDetector(
          onTap: () => _selectVariant(cat, variant),
          child: Container(
            decoration: BoxDecoration(
              color: const Color(0xFF1a1a1a),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(
                color: selected ? AppColors.primary : const Color(0xFF2a2a2a),
                width: selected ? 3 : 1,
              ),
            ),
            child: variant == null
                ? const Center(
                    child: Icon(Icons.close, color: Colors.white54, size: 28))
                : ClipRRect(
                    borderRadius: BorderRadius.circular(10),
                    child: AvataaarsDisplay(
                      // Isolated preview: just this part on the face, circle frame.
                      config: _previewConfig(cat, variant),
                      size: 72,
                    ),
                  ),
          ),
        );
      },
    );
  }

  /// A config that shows the current avatar but with [cat] swapped to [variant],
  /// so each grid tile previews the choice in context.
  AvataaarsConfig _previewConfig(String cat, String variant) {
    switch (cat) {
      case 'top':
        return _config.copyWith(top: variant);
      case 'eyes':
        return _config.copyWith(eyes: variant);
      case 'eyebrows':
        return _config.copyWith(eyebrows: variant);
      case 'mouth':
        return _config.copyWith(mouth: variant);
      case 'facialHair':
        return _config.copyWith(facialHair: variant);
      case 'clothing':
        return _config.copyWith(
          clothing: variant,
          clearClothingGraphic: variant != 'graphicShirt',
          clothingGraphic: variant == 'graphicShirt'
              ? (_config.clothingGraphic ?? AvataaarsVariants.clothingGraphic.first)
              : null,
        );
      case 'clothingGraphic':
        return _config.copyWith(clothingGraphic: variant);
      case 'accessories':
        return _config.copyWith(accessories: variant);
      default:
        return _config;
    }
  }

  Widget _buildColorBar() {
    // Which colour rows are relevant given the current parts.
    final topIsHat =
        _config.top != null && AvataaarsVariants.hatTops.contains(_config.top);
    final rows = <_ColorRow>[
      _ColorRow('Skin', 'skin', AvataaarsPalettes.skin, _config.skinColor),
      if (_config.top != null && topIsHat)
        _ColorRow('Hat', 'hat', AvataaarsPalettes.hat, _config.hatColor)
      else
        _ColorRow('Hair', 'hair', AvataaarsPalettes.hair, _config.hairColor),
      if (_config.facialHair != null)
        _ColorRow('Beard', 'facialHair', AvataaarsPalettes.hair,
            _config.facialHairColor),
      _ColorRow('Clothes', 'clothes', AvataaarsPalettes.clothes,
          _config.clothesColor),
      _ColorRow('Background', 'background', AvataaarsPalettes.background,
          _config.backgroundColor),
    ];

    return Container(
      color: const Color(0xFF141414),
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Column(
        children: rows.map(_buildColorRow).toList(),
      ),
    );
  }

  Widget _buildColorRow(_ColorRow row) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
      child: Row(
        children: [
          SizedBox(
            width: 72,
            child: Text(row.label,
                style: const TextStyle(color: Colors.white70, fontSize: 12)),
          ),
          Expanded(
            child: SizedBox(
              height: 32,
              child: ListView.separated(
                scrollDirection: Axis.horizontal,
                itemCount: row.palette.length,
                separatorBuilder: (_, __) => const SizedBox(width: 8),
                itemBuilder: (context, i) {
                  final hex = row.palette[i];
                  final selected = hex.toLowerCase() == row.current.toLowerCase();
                  return GestureDetector(
                    onTap: () => _setColor(row.field, hex),
                    child: Container(
                      width: 32,
                      height: 32,
                      decoration: BoxDecoration(
                        color: Color(int.parse('FF$hex', radix: 16)),
                        shape: BoxShape.circle,
                        border: Border.all(
                          color: selected ? AppColors.primary : Colors.white24,
                          width: selected ? 3 : 1,
                        ),
                      ),
                    ),
                  );
                },
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _ColorRow {
  final String label;
  final String field;
  final List<String> palette;
  final String current;
  const _ColorRow(this.label, this.field, this.palette, this.current);
}
