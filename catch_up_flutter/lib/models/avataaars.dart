/// Avataaars Avatar Model
///
/// Dart mirror of the backend `AvataaarsConfig`
/// (apps/api/src/services/avataaars-avatar.ts). A config is a set of part
/// variant *names* (strings, unlike Notion's integer indices) plus seven
/// colours and a framing shape. Optional parts (top / facialHair /
/// accessories / clothingGraphic) may be null = "not drawn".
class AvataaarsConfig {
  final String? top;             // hair or hat (null = bald)
  final String eyes;
  final String eyebrows;
  final String mouth;
  final String nose;
  final String? facialHair;      // null = none
  final String clothing;
  final String? clothingGraphic; // only shown when clothing == "graphicShirt"
  final String? accessories;     // glasses / eyepatch (null = none)

  // Colours — 6-digit hex WITHOUT leading '#'. `backgroundColor` may be "transparent".
  final String skinColor;
  final String hairColor;
  final String facialHairColor;
  final String clothesColor;
  final String accessoriesColor;
  final String hatColor;
  final String backgroundColor;

  final String shape; // "circle" or "default"

  const AvataaarsConfig({
    required this.top,
    required this.eyes,
    required this.eyebrows,
    required this.mouth,
    required this.nose,
    required this.facialHair,
    required this.clothing,
    required this.clothingGraphic,
    required this.accessories,
    required this.skinColor,
    required this.hairColor,
    required this.facialHairColor,
    required this.clothesColor,
    required this.accessoriesColor,
    required this.hatColor,
    required this.backgroundColor,
    required this.shape,
  });

  factory AvataaarsConfig.fromJson(Map<String, dynamic> json) {
    return AvataaarsConfig(
      top: json['top'] as String?,
      eyes: json['eyes'] as String? ?? 'default',
      eyebrows: json['eyebrows'] as String? ?? 'default',
      mouth: json['mouth'] as String? ?? 'default',
      nose: json['nose'] as String? ?? 'default',
      facialHair: json['facialHair'] as String?,
      clothing: json['clothing'] as String? ?? 'shirtCrewNeck',
      clothingGraphic: json['clothingGraphic'] as String?,
      accessories: json['accessories'] as String?,
      skinColor: json['skinColor'] as String? ?? 'edb98a',
      hairColor: json['hairColor'] as String? ?? '2c1b18',
      facialHairColor: json['facialHairColor'] as String? ?? '2c1b18',
      clothesColor: json['clothesColor'] as String? ?? '65c9ff',
      accessoriesColor: json['accessoriesColor'] as String? ?? '262e33',
      hatColor: json['hatColor'] as String? ?? '262e33',
      backgroundColor: json['backgroundColor'] as String? ?? 'b6e3f4',
      shape: json['shape'] as String? ?? 'circle',
    );
  }

  Map<String, dynamic> toJson() => {
        'top': top,
        'eyes': eyes,
        'eyebrows': eyebrows,
        'mouth': mouth,
        'nose': nose,
        'facialHair': facialHair,
        'clothing': clothing,
        'clothingGraphic': clothingGraphic,
        'accessories': accessories,
        'skinColor': skinColor,
        'hairColor': hairColor,
        'facialHairColor': facialHairColor,
        'clothesColor': clothesColor,
        'accessoriesColor': accessoriesColor,
        'hatColor': hatColor,
        'backgroundColor': backgroundColor,
        'shape': shape,
      };

  /// copyWith — uses sentinels so callers can explicitly clear optional parts
  /// (pass `clearTop: true` etc.) vs. leaving them unchanged.
  AvataaarsConfig copyWith({
    String? top,
    bool clearTop = false,
    String? eyes,
    String? eyebrows,
    String? mouth,
    String? nose,
    String? facialHair,
    bool clearFacialHair = false,
    String? clothing,
    String? clothingGraphic,
    bool clearClothingGraphic = false,
    String? accessories,
    bool clearAccessories = false,
    String? skinColor,
    String? hairColor,
    String? facialHairColor,
    String? clothesColor,
    String? accessoriesColor,
    String? hatColor,
    String? backgroundColor,
    String? shape,
  }) {
    return AvataaarsConfig(
      top: clearTop ? null : (top ?? this.top),
      eyes: eyes ?? this.eyes,
      eyebrows: eyebrows ?? this.eyebrows,
      mouth: mouth ?? this.mouth,
      nose: nose ?? this.nose,
      facialHair: clearFacialHair ? null : (facialHair ?? this.facialHair),
      clothing: clothing ?? this.clothing,
      clothingGraphic: clearClothingGraphic
          ? null
          : (clothingGraphic ?? this.clothingGraphic),
      accessories:
          clearAccessories ? null : (accessories ?? this.accessories),
      skinColor: skinColor ?? this.skinColor,
      hairColor: hairColor ?? this.hairColor,
      facialHairColor: facialHairColor ?? this.facialHairColor,
      clothesColor: clothesColor ?? this.clothesColor,
      accessoriesColor: accessoriesColor ?? this.accessoriesColor,
      hatColor: hatColor ?? this.hatColor,
      backgroundColor: backgroundColor ?? this.backgroundColor,
      shape: shape ?? this.shape,
    );
  }

  /// A neutral default config (no randomness — deterministic for first paint).
  factory AvataaarsConfig.initial() => const AvataaarsConfig(
        top: 'shortFlat',
        eyes: 'default',
        eyebrows: 'default',
        mouth: 'smile',
        nose: 'default',
        facialHair: null,
        clothing: 'shirtCrewNeck',
        clothingGraphic: null,
        accessories: null,
        skinColor: 'edb98a',
        hairColor: '2c1b18',
        facialHairColor: '2c1b18',
        clothesColor: '65c9ff',
        accessoriesColor: '262e33',
        hatColor: '262e33',
        backgroundColor: 'b6e3f4',
        shape: 'circle',
      );

  /// Pseudo-random config seeded by wall-clock — used for "shuffle".
  factory AvataaarsConfig.random() {
    final r = DateTime.now().millisecondsSinceEpoch;
    String pick(List<String> list, int salt) =>
        list[((r ~/ (salt + 1)) % list.length).abs()];

    final clothing = pick(AvataaarsVariants.clothing, 7);
    return AvataaarsConfig(
      top: (r % 20) == 0 ? null : pick(AvataaarsVariants.top, 1),
      eyes: pick(AvataaarsVariants.eyes, 2),
      eyebrows: pick(AvataaarsVariants.eyebrows, 3),
      mouth: pick(AvataaarsVariants.mouth, 4),
      nose: 'default',
      facialHair: (r % 3) == 0 ? pick(AvataaarsVariants.facialHair, 5) : null,
      clothing: clothing,
      clothingGraphic: clothing == 'graphicShirt'
          ? pick(AvataaarsVariants.clothingGraphic, 6)
          : null,
      accessories:
          (r % 4) == 0 ? pick(AvataaarsVariants.accessories, 8) : null,
      skinColor: pick(AvataaarsPalettes.skin, 9),
      hairColor: pick(AvataaarsPalettes.hair, 10),
      facialHairColor: pick(AvataaarsPalettes.hair, 11),
      clothesColor: pick(AvataaarsPalettes.clothes, 12),
      accessoriesColor: '262e33',
      hatColor: pick(AvataaarsPalettes.hat, 13),
      backgroundColor: pick(AvataaarsPalettes.background, 14),
      shape: 'circle',
    );
  }
}

/// Valid part variant names per category — kept in sync with the backend
/// manifest (apps/api/public/avataaars-parts/manifest.json). The customizer
/// builds its option grids from these lists.
class AvataaarsVariants {
  AvataaarsVariants._();

  static const top = [
    'hat', 'hijab', 'turban', 'winterHat1', 'winterHat02', 'winterHat03',
    'winterHat04', 'bob', 'bun', 'curly', 'curvy', 'dreads', 'frida', 'fro',
    'froBand', 'longButNotTooLong', 'miaWallace', 'shavedSides', 'straight02',
    'straight01', 'straightAndStrand', 'dreads01', 'dreads02', 'frizzle',
    'shaggy', 'shaggyMullet', 'shortCurly', 'shortFlat', 'shortRound',
    'shortWaved', 'sides', 'theCaesar', 'theCaesarAndSidePart', 'bigHair',
  ];

  static const eyes = [
    'closed', 'cry', 'default', 'eyeRoll', 'happy', 'hearts', 'side',
    'squint', 'surprised', 'winkWacky', 'wink', 'xDizzy',
  ];

  static const eyebrows = [
    'angryNatural', 'defaultNatural', 'flatNatural', 'frownNatural',
    'raisedExcitedNatural', 'sadConcernedNatural', 'unibrowNatural',
    'upDownNatural', 'angry', 'default', 'raisedExcited', 'sadConcerned',
    'upDown',
  ];

  static const mouth = [
    'concerned', 'default', 'disbelief', 'eating', 'grimace', 'sad',
    'screamOpen', 'serious', 'smile', 'tongue', 'twinkle', 'vomit',
  ];

  static const nose = ['default'];

  static const facialHair = [
    'beardLight', 'beardMajestic', 'beardMedium', 'moustacheFancy',
    'moustacheMagnum',
  ];

  static const clothing = [
    'blazerAndShirt', 'blazerAndSweater', 'collarAndSweater', 'graphicShirt',
    'hoodie', 'overall', 'shirtCrewNeck', 'shirtScoopNeck', 'shirtVNeck',
  ];

  static const clothingGraphic = [
    'bat', 'bear', 'cumbia', 'deer', 'diamond', 'hola', 'pizza', 'resist',
    'skull', 'skullOutline',
  ];

  static const accessories = [
    'kurt', 'prescription01', 'prescription02', 'round', 'sunglasses',
    'wayfarers', 'eyepatch',
  ];

  /// `top` variants that are headwear (use {{hat}} colour) rather than hair
  /// (use {{hair}} colour). Lets the customizer show the right colour picker.
  static const hatTops = {
    'hat', 'hijab', 'turban', 'winterHat1', 'winterHat02', 'winterHat03',
    'winterHat04',
  };
}

/// Default colour palettes (mirror backend PALETTES).
class AvataaarsPalettes {
  AvataaarsPalettes._();

  static const skin = [
    '614335', 'd08b5b', 'ae5d29', 'edb98a', 'ffdbb4', 'fd9841', 'f8d25c',
  ];

  static const hair = [
    'a55728', '2c1b18', 'b58143', 'd6b370', '724133', '4a312c', 'f59797',
    'ecdcbf', 'c93305', 'e8e1e1',
  ];

  static const clothes = [
    '262e33', '65c9ff', '5199e4', '25557c', 'e6e6e6', '929598', '3c4f5c',
    'b1e2ff', 'a7ffc4', 'ffafb9', 'ffffb1', 'ff488e', 'ff5c5c', 'ffffff',
  ];

  static const hat = [
    '262e33', '65c9ff', '5199e4', '25557c', 'e6e6e6', '929598', '3c4f5c',
    'b1e2ff', 'a7ffc4', 'ffdeb5', 'ffafb9', 'ffffb1', 'ff488e', 'ff5c5c',
    'ffffff',
  ];

  static const background = [
    'b6e3f4', 'c0aede', 'd1d4f9', 'ffd5dc', 'ffdfbf',
  ];
}

/// Response from GET /users/me/avataaars
class AvataaarsResponse {
  final AvataaarsConfig? config;
  final String? svgString;

  const AvataaarsResponse({this.config, this.svgString});

  factory AvataaarsResponse.fromJson(Map<String, dynamic> json) {
    return AvataaarsResponse(
      config: json['config'] != null
          ? AvataaarsConfig.fromJson(json['config'] as Map<String, dynamic>)
          : null,
      svgString: json['svgString'] as String?,
    );
  }
}
