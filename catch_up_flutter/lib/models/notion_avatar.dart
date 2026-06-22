/// Notion Avatar Model
/// Matches backend NotionAvatarConfig from bitmoji-avatar.ts
class NotionAvatarConfig {
  final int face;      // 0-15
  final int eye;       // 0-13
  final int eyebrow;   // 0-15
  final int glass;     // 0-13 (0 = none)
  final int hair;      // 0-57
  final int mouth;     // 0-19
  final int nose;      // 0-13
  final int accessory; // 0-13 (0 = none)
  final int beard;     // 0-15 (0 = none)
  final int detail;    // 0-12
  final String bgColor;
  final String shape;  // "circle" or "square"

  const NotionAvatarConfig({
    required this.face,
    required this.eye,
    required this.eyebrow,
    required this.glass,
    required this.hair,
    required this.mouth,
    required this.nose,
    required this.accessory,
    required this.beard,
    required this.detail,
    required this.bgColor,
    required this.shape,
  });

  factory NotionAvatarConfig.fromJson(Map<String, dynamic> json) {
    return NotionAvatarConfig(
      face: json['face'] as int,
      eye: json['eye'] as int,
      eyebrow: json['eyebrow'] as int,
      glass: json['glass'] as int,
      hair: json['hair'] as int,
      mouth: json['mouth'] as int,
      nose: json['nose'] as int,
      accessory: json['accessory'] as int,
      beard: json['beard'] as int,
      detail: json['detail'] as int,
      bgColor: json['bgColor'] as String,
      shape: json['shape'] as String,
    );
  }

  Map<String, dynamic> toJson() => {
        'face': face,
        'eye': eye,
        'eyebrow': eyebrow,
        'glass': glass,
        'hair': hair,
        'mouth': mouth,
        'nose': nose,
        'accessory': accessory,
        'beard': beard,
        'detail': detail,
        'bgColor': bgColor,
        'shape': shape,
      };

  NotionAvatarConfig copyWith({
    int? face,
    int? eye,
    int? eyebrow,
    int? glass,
    int? hair,
    int? mouth,
    int? nose,
    int? accessory,
    int? beard,
    int? detail,
    String? bgColor,
    String? shape,
  }) {
    return NotionAvatarConfig(
      face: face ?? this.face,
      eye: eye ?? this.eye,
      eyebrow: eyebrow ?? this.eyebrow,
      glass: glass ?? this.glass,
      hair: hair ?? this.hair,
      mouth: mouth ?? this.mouth,
      nose: nose ?? this.nose,
      accessory: accessory ?? this.accessory,
      beard: beard ?? this.beard,
      detail: detail ?? this.detail,
      bgColor: bgColor ?? this.bgColor,
      shape: shape ?? this.shape,
    );
  }

  /// Generate a random config for initial avatar
  factory NotionAvatarConfig.random() {
    final random = DateTime.now().millisecondsSinceEpoch;
    return NotionAvatarConfig(
      face: random % 16,
      eye: random % 14,
      eyebrow: (random * 2) % 16,
      glass: (random % 10) > 7 ? (random % 14) : 0,
      hair: random % 58,
      mouth: random % 20,
      nose: random % 14,
      accessory: 0,
      beard: (random % 10) > 7 ? (random % 16) : 0,
      detail: random % 13,
      bgColor: '#f3e0c8',
      shape: 'circle',
    );
  }
}

/// Visual traits extracted from photo (matches backend VisualTraits)
class VisualTraits {
  final String gender;
  final String skinTone;
  final String hairColour;
  final bool hasGlasses;
  final bool hasBeard;
  final String expression;
  final double genderConf;

  const VisualTraits({
    required this.gender,
    required this.skinTone,
    required this.hairColour,
    required this.hasGlasses,
    required this.hasBeard,
    required this.expression,
    required this.genderConf,
  });

  factory VisualTraits.fromJson(Map<String, dynamic> json) {
    return VisualTraits(
      gender: json['gender'] as String,
      skinTone: json['skinTone'] as String,
      hairColour: json['hairColour'] as String,
      hasGlasses: json['hasGlasses'] as bool,
      hasBeard: json['hasBeard'] as bool,
      expression: json['expression'] as String,
      genderConf: (json['genderConf'] as num).toDouble(),
    );
  }

  Map<String, dynamic> toJson() => {
        'gender': gender,
        'skinTone': skinTone,
        'hairColour': hairColour,
        'hasGlasses': hasGlasses,
        'hasBeard': hasBeard,
        'expression': expression,
        'genderConf': genderConf,
      };
}

/// Response from GET /users/me/bitmoji
class BitmojiResponse {
  final NotionAvatarConfig? config;
  final String? svgString;
  final VisualTraits? traits;

  const BitmojiResponse({
    this.config,
    this.svgString,
    this.traits,
  });

  factory BitmojiResponse.fromJson(Map<String, dynamic> json) {
    return BitmojiResponse(
      config: json['config'] != null
          ? NotionAvatarConfig.fromJson(json['config'] as Map<String, dynamic>)
          : null,
      svgString: json['svgString'] as String?,
      traits: json['traits'] != null
          ? VisualTraits.fromJson(json['traits'] as Map<String, dynamic>)
          : null,
    );
  }
}
