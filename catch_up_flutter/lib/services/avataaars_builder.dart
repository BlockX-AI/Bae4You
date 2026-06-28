import 'package:flutter/services.dart' show rootBundle;
import '../models/avataaars.dart';

/// Client-side Avataaars composer.
///
/// Dart port of the backend `generateAvataaarsSVG`
/// (apps/api/src/services/avataaars-avatar.ts). Assembles the colour-tokenised
/// SVG fragments bundled under `assets/avataaars-parts/` into a single 280×280
/// SVG string — identical canvas, transforms, draw order, nesting and colour
/// substitution to the server — so the app renders any avatar from its config
/// offline with no network call.
///
/// How it works (mirrors DiceBear):
///   - The body skeleton `_structure/base.svg` carries the `{{skin}}` token and
///     eight EMPTY `<g transform="...">` slot groups.
///   - Each leaf part is injected into the slot whose transform matches its
///     category (LAYOUT below). `clothingGraphic` nests inside the
///     `graphicShirt` clothing fragment's own slot.
///   - Colours are applied last by replacing every `{{token}}` with a hex value.
///   - `shape == "circle"` wraps the body in the masked circle frame
///     (`_structure/style-circle.svg`); "default" renders the body alone.
class AvataaarsBuilder {
  AvataaarsBuilder._();

  static const _base = 'assets/avataaars-parts';

  // category → SVG transform of its slot inside base.svg (ground truth from
  // the backend manifest's layoutTransforms).
  static const _layout = {
    'clothing': 'translate(0 170)',
    'mouth': 'translate(78 134)',
    'nose': 'translate(104 122)',
    'eyes': 'translate(76 90)',
    'eyebrows': 'translate(76 82)',
    'top': 'translate(-1)',
    'facialHair': 'translate(49 72)',
    'accessories': 'translate(62 42)',
    'clothingGraphic': 'translate(77 58)',
  };

  // Cache loaded fragments by "category/variant" so repeated renders are cheap.
  static final Map<String, String> _cache = {};

  static Future<String> _read(String category, String variant) async {
    final key = '$category/$variant';
    final cached = _cache[key];
    if (cached != null) return cached;
    try {
      final raw = await rootBundle.loadString('$_base/$category/$variant.svg');
      _cache[key] = raw;
      return raw;
    } catch (_) {
      _cache[key] = '';
      return '';
    }
  }

  /// Inject [content] into the empty slot group `<g transform="$transform"></g>`.
  static String _injectSlot(String host, String transform, String content) {
    if (content.isEmpty) return host; // leave slot empty
    final slot = '<g transform="$transform"></g>';
    return host.replaceFirst(
        slot, '<g transform="$transform">$content</g>');
  }

  /// "rrggbb" / "#rrggbb" → "#rrggbb"; "transparent" / invalid → "transparent".
  static String _toHex(String value) {
    if (value.isEmpty || value == 'transparent') return 'transparent';
    final v = value.startsWith('#') ? value.substring(1) : value;
    final ok = RegExp(r'^[0-9a-fA-F]{6}$').hasMatch(v);
    return ok ? '#$v' : 'transparent';
  }

  /// Replace every {{token}} with its hex colour (or "transparent").
  static String _applyColors(String svg, AvataaarsConfig c) {
    final map = {
      'skin': _toHex(c.skinColor),
      'hair': _toHex(c.hairColor),
      'facialHair': _toHex(c.facialHairColor),
      'clothes': _toHex(c.clothesColor),
      'accessories': _toHex(c.accessoriesColor),
      'hat': _toHex(c.hatColor),
      'background': _toHex(c.backgroundColor),
    };
    return svg.replaceAllMapped(RegExp(r'\{\{(\w+)\}\}'),
        (m) => map[m.group(1)] ?? 'transparent');
  }

  /// Compose a full SVG string for [config], ready for `SvgPicture.string`.
  static Future<String> build(AvataaarsConfig config) async {
    // 1. Body skeleton (carries {{skin}} + 8 empty slot groups).
    var body = await _read('_structure', 'base');
    if (body.isEmpty) return _fallback(config);

    // 2. Build clothing, nesting clothingGraphic when graphicShirt.
    var clothing = await _read('clothing', config.clothing);
    if (config.clothing == 'graphicShirt' && config.clothingGraphic != null) {
      final graphic = await _read('clothingGraphic', config.clothingGraphic!);
      clothing = _injectSlot(clothing, _layout['clothingGraphic']!, graphic);
    }

    // 3. Inject every leaf part into its slot (draw order matches base.svg).
    body = _injectSlot(body, _layout['clothing']!, clothing);
    body = _injectSlot(body, _layout['mouth']!, await _read('mouth', config.mouth));
    body = _injectSlot(body, _layout['nose']!, await _read('nose', config.nose));
    body = _injectSlot(body, _layout['eyes']!, await _read('eyes', config.eyes));
    body = _injectSlot(
        body, _layout['eyebrows']!, await _read('eyebrows', config.eyebrows));
    if (config.top != null) {
      body = _injectSlot(body, _layout['top']!, await _read('top', config.top!));
    }
    if (config.facialHair != null) {
      body = _injectSlot(body, _layout['facialHair']!,
          await _read('facialHair', config.facialHair!));
    }
    if (config.accessories != null) {
      body = _injectSlot(body, _layout['accessories']!,
          await _read('accessories', config.accessories!));
    }

    // 4. Framing.
    String inner;
    if (config.shape == 'circle') {
      final frame = await _read('_structure', 'style-circle');
      inner = frame.replaceFirst('<g mask="url(#styleCircle-a)"></g>',
          '<g mask="url(#styleCircle-a)">$body</g>');
    } else {
      inner = body;
    }

    // 5. Substitute colours + wrap in the 280×280 root.
    final composed =
        _applyColors('<g transform="translate(8)">$inner</g>', config);
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 280 280" '
        'fill="none" shape-rendering="auto" width="280" height="280">'
        '$composed</svg>';
  }

  /// Minimal placeholder if the parts assets are missing.
  static String _fallback(AvataaarsConfig config) {
    final bg = _toHex(config.backgroundColor);
    final fill = bg == 'transparent' ? '#b6e3f4' : bg;
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 280 280" '
        'width="280" height="280">'
        '<rect width="280" height="280" fill="$fill"/>'
        '<circle cx="140" cy="120" r="60" fill="#edb98a"/>'
        '<circle cx="118" cy="112" r="7" fill="#000"/>'
        '<circle cx="162" cy="112" r="7" fill="#000"/>'
        '<path d="M116 145 Q140 165 164 145" stroke="#000" stroke-width="5" '
        'fill="none" stroke-linecap="round"/></svg>';
  }
}
