// Avatar models — mirror the backend's Notion-style bitmoji + AI avatar APIs.
//
// Backend reference (apps/api/src/services/bitmoji-avatar.ts):
//   NotionAvatarConfig { face, eye, eyebrow, glass, hair, mouth, nose,
//                        accessory, beard, detail, bgColor, shape }
// All numeric fields are 0-based indices into the Notion avatar part library.

/// The 12-field config that fully describes a Notion-style bitmoji.
class NotionAvatarConfig {
  final int face; // 0–15
  final int eye; // 0–13
  final int eyebrow; // 0–15
  final int glass; // 0–13 (0 = none)
  final int hair; // 0–57
  final int mouth; // 0–19
  final int nose; // 0–13
  final int accessory; // 0–13 (0 = none)
  final int beard; // 0–15 (0 = none)
  final int detail; // 0–12
  final String bgColor; // hex
  final String shape; // "circle" | "square"

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

  /// Inclusive max value for each editable field — used by the customiser
  /// sliders and kept in sync with the backend's clamp() ranges.
  static const Map<String, int> maxValues = {
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

  factory NotionAvatarConfig.fromJson(Map<String, dynamic> json) =>
      NotionAvatarConfig(
        face: (json['face'] ?? 0) as int,
        eye: (json['eye'] ?? 0) as int,
        eyebrow: (json['eyebrow'] ?? 0) as int,
        glass: (json['glass'] ?? 0) as int,
        hair: (json['hair'] ?? 0) as int,
        mouth: (json['mouth'] ?? 0) as int,
        nose: (json['nose'] ?? 0) as int,
        accessory: (json['accessory'] ?? 0) as int,
        beard: (json['beard'] ?? 0) as int,
        detail: (json['detail'] ?? 0) as int,
        bgColor: (json['bgColor'] ?? '#fde2e4') as String,
        shape: (json['shape'] ?? 'circle') as String,
      );

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

  /// Read a field by its key (used by the generic slider builder).
  int valueFor(String key) {
    switch (key) {
      case 'face':
        return face;
      case 'eye':
        return eye;
      case 'eyebrow':
        return eyebrow;
      case 'glass':
        return glass;
      case 'hair':
        return hair;
      case 'mouth':
        return mouth;
      case 'nose':
        return nose;
      case 'accessory':
        return accessory;
      case 'beard':
        return beard;
      case 'detail':
        return detail;
      default:
        return 0;
    }
  }

  /// Return a copy with a single field overridden by key.
  NotionAvatarConfig withField(String key, int value) => NotionAvatarConfig(
        face: key == 'face' ? value : face,
        eye: key == 'eye' ? value : eye,
        eyebrow: key == 'eyebrow' ? value : eyebrow,
        glass: key == 'glass' ? value : glass,
        hair: key == 'hair' ? value : hair,
        mouth: key == 'mouth' ? value : mouth,
        nose: key == 'nose' ? value : nose,
        accessory: key == 'accessory' ? value : accessory,
        beard: key == 'beard' ? value : beard,
        detail: key == 'detail' ? value : detail,
        bgColor: bgColor,
        shape: shape,
      );

  NotionAvatarConfig copyWith({String? bgColor, String? shape}) =>
      NotionAvatarConfig(
        face: face,
        eye: eye,
        eyebrow: eyebrow,
        glass: glass,
        hair: hair,
        mouth: mouth,
        nose: nose,
        accessory: accessory,
        beard: beard,
        detail: detail,
        bgColor: bgColor ?? this.bgColor,
        shape: shape ?? this.shape,
      );
}

/// Response from GET/PATCH/POST bitmoji endpoints — config + ready-to-render SVG.
class BitmojiResponse {
  final NotionAvatarConfig? config;
  final String? svgString;
  final Map<String, dynamic>? traits;

  BitmojiResponse({this.config, this.svgString, this.traits});

  factory BitmojiResponse.fromJson(Map<String, dynamic> json) => BitmojiResponse(
        config: json['config'] != null
            ? NotionAvatarConfig.fromJson(json['config'] as Map<String, dynamic>)
            : null,
        svgString: json['svgString'] as String?,
        traits: json['traits'] as Map<String, dynamic>?,
      );

  bool get hasAvatar => config != null && svgString != null;
}

/// One selectable AI avatar art style (backend `style` query value + UI label).
class AiAvatarStyle {
  final String id; // backend style key
  final String label;
  final String emoji;
  final String description;

  const AiAvatarStyle({
    required this.id,
    required this.label,
    required this.emoji,
    required this.description,
  });

  /// The styles the backend accepts on POST /users/me/avatar/kyc-frames.
  static const List<AiAvatarStyle> all = [
    AiAvatarStyle(
      id: 'gen-z-creator',
      label: 'Gen-Z Creator',
      emoji: '✨',
      description: 'Trendy influencer look with neon glow',
    ),
    AiAvatarStyle(
      id: 'bitmoji-style',
      label: 'Cartoon',
      emoji: '😄',
      description: 'Playful bitmoji-style cartoon',
    ),
    AiAvatarStyle(
      id: '3d-cartoon',
      label: '3D Pixar',
      emoji: '🎬',
      description: 'Pixar-style 3D animated character',
    ),
    AiAvatarStyle(
      id: 'anime-style',
      label: 'Anime',
      emoji: '🌸',
      description: 'Studio anime / manga aesthetic',
    ),
    AiAvatarStyle(
      id: 'cyberpunk',
      label: 'Cyberpunk',
      emoji: '🤖',
      description: 'Futuristic neon tech vibe',
    ),
    AiAvatarStyle(
      id: 'noir-glamour',
      label: 'Noir',
      emoji: '🖤',
      description: 'Black & white hollywood sketch',
    ),
    AiAvatarStyle(
      id: 'luxury-fashion',
      label: 'Luxury',
      emoji: '💎',
      description: 'High-fashion editorial portrait',
    ),
    AiAvatarStyle(
      id: 'professional-headshot',
      label: 'Headshot',
      emoji: '👔',
      description: 'Clean LinkedIn-style portrait',
    ),
  ];
}

/// Response from the AI avatar generation endpoint.
class AiAvatarResponse {
  final String? url; // gateway URL to the generated avatar
  final String? ipfsHash;
  final String? style;
  final String? provider;

  AiAvatarResponse({this.url, this.ipfsHash, this.style, this.provider});

  factory AiAvatarResponse.fromJson(Map<String, dynamic> json) => AiAvatarResponse(
        url: json['url'] as String?,
        ipfsHash: (json['ipfsHash'] ?? json['ipfs_hash']) as String?,
        style: json['style'] as String?,
        provider: json['provider'] as String?,
      );
}
