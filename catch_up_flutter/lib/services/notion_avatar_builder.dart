import 'package:flutter/services.dart' show rootBundle;
import '../models/notion_avatar.dart';

/// Client-side Notion avatar composer.
///
/// Dart port of the backend `generateNotionSVG` (apps/api/src/services/
/// bitmoji-avatar.ts). Loads the bundled part SVGs, strips their outer
/// `<svg>` wrapper and assembles them into a single SVG string — identical
/// layering, background and line-rendering filter to the server — so the app
/// can render any avatar from its config offline with no network call.
class NotionAvatarBuilder {
  NotionAvatarBuilder._();

  static const _base = 'assets/notion-avatar-parts';

  // config key → asset folder name (mirrors backend PART_FOLDER)
  static const _folder = {
    'face': 'face',
    'eye': 'eyes',
    'eyebrow': 'eyebrows',
    'nose': 'nose',
    'mouth': 'mouth',
    'beard': 'beard',
    'glass': 'glasses',
    'accessory': 'accessories',
    'detail': 'details',
    'hair': 'hair',
  };

  // Cache loaded inner-content by "folder/index" so repeated renders are cheap.
  static final Map<String, String> _partCache = {};

  static final RegExp _openTag = RegExp(r'<svg[^>]*>', caseSensitive: false);
  static final RegExp _closeTag = RegExp(r'</svg>', caseSensitive: false);

  static Future<String> _readPart(String part, int index) async {
    final folder = _folder[part];
    if (folder == null) return '';
    final cacheKey = '$folder/$index';
    final cached = _partCache[cacheKey];
    if (cached != null) return cached;

    try {
      final raw = await rootBundle.loadString('$_base/$folder/$index.svg');
      final inner =
          raw.replaceAll(_openTag, '').replaceAll(_closeTag, '');
      _partCache[cacheKey] = inner;
      return inner;
    } catch (_) {
      // Missing asset (e.g. index out of range) — render nothing for this part.
      _partCache[cacheKey] = '';
      return '';
    }
  }

  /// Compose a full SVG string for [config], ready for `SvgPicture.string`.
  static Future<String> build(NotionAvatarConfig config) async {
    final isCircle = config.shape == 'circle';

    // Same draw order as the backend.
    final entries = <List<dynamic>>[
      ['face', config.face],
      ['eye', config.eye],
      ['eyebrow', config.eyebrow],
      ['nose', config.nose],
      ['mouth', config.mouth],
      ['beard', config.beard],
      ['glass', config.glass],
      ['accessory', config.accessory],
      ['detail', config.detail],
      ['hair', config.hair],
    ];

    final buffer = StringBuffer();
    for (final e in entries) {
      final part = e[0] as String;
      final index = e[1] as int;
      final content = await _readPart(part, index);
      if (content.trim().isEmpty) continue;
      final faceAttr = part == 'face' ? ' fill="#ffffff"' : '';
      buffer.writeln('<g id="notion-avatar-$part"$faceAttr>$content</g>');
    }

    final bgLayer = isCircle
        ? '<circle cx="540" cy="540" r="540" fill="${config.bgColor}"/>'
        : '<rect width="1080" height="1080" rx="162" fill="${config.bgColor}"/>';

    final clipShape = isCircle
        ? '<circle cx="540" cy="540" r="540"/>'
        : '<rect width="1080" height="1080" rx="162"/>';

    return '''<svg viewBox="0 0 1080 1080" fill="none" xmlns="http://www.w3.org/2000/svg" width="1080" height="1080">
  <defs>
    <filter id="filter" x="-20%" y="-20%" width="140%" height="140%" filterUnits="objectBoundingBox" primitiveUnits="userSpaceOnUse" color-interpolation-filters="linearRGB">
      <feColorMatrix type="matrix" values="1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 20 -10" in="SourceGraphic" result="colormatrix"/>
      <feBlend mode="normal" in="SourceGraphic" in2="colormatrix" result="blend"/>
    </filter>
    <clipPath id="avatar-clip">$clipShape</clipPath>
  </defs>
  <g clip-path="url(#avatar-clip)">
    $bgLayer
    <g id="notion-avatar" filter="url(#filter)">
      ${buffer.toString()}
    </g>
  </g>
</svg>''';
  }
}
