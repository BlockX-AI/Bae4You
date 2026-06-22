import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';
import '../models/notion_avatar.dart';
import '../services/notion_avatar_builder.dart';

/// Displays a Notion avatar composed on-device from a [NotionAvatarConfig].
///
/// The SVG is assembled from bundled parts via [NotionAvatarBuilder] — no
/// network call — so it renders instantly and works offline. Pass a [config];
/// when null a neutral placeholder is shown.
class NotionAvatarDisplay extends StatelessWidget {
  final NotionAvatarConfig? config;
  final double size;
  final bool showBorder;
  final Color? borderColor;

  /// Optional widget shown when [config] is null (e.g. initial / emoji).
  final Widget? fallback;

  const NotionAvatarDisplay({
    super.key,
    this.config,
    this.size = 120,
    this.showBorder = false,
    this.borderColor,
    this.fallback,
  });

  @override
  Widget build(BuildContext context) {
    if (config == null) {
      return fallback ?? _buildPlaceholder();
    }

    return FutureBuilder<String>(
      future: NotionAvatarBuilder.build(config!),
      builder: (context, snapshot) {
        if (snapshot.hasData) {
          return NotionAvatarFromSvg(
            svgString: snapshot.data!,
            size: size,
            showBorder: showBorder,
            borderColor: borderColor,
          );
        }
        if (snapshot.hasError) {
          return fallback ?? _buildPlaceholder();
        }
        return _buildLoading();
      },
    );
  }

  Widget _buildPlaceholder() {
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        color: Colors.grey[300],
        border: showBorder
            ? Border.all(color: borderColor ?? Colors.white, width: 3)
            : null,
      ),
      child: Icon(Icons.person, size: size * 0.5, color: Colors.grey[600]),
    );
  }

  Widget _buildLoading() {
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        color: Colors.grey[200],
      ),
      child: Center(
        child: SizedBox(
          width: size * 0.3,
          height: size * 0.3,
          child: const CircularProgressIndicator(strokeWidth: 2),
        ),
      ),
    );
  }
}

/// Renders a ready SVG string (e.g. one already composed or fetched).
class NotionAvatarFromSvg extends StatelessWidget {
  final String svgString;
  final double size;
  final bool showBorder;
  final Color? borderColor;

  const NotionAvatarFromSvg({
    super.key,
    required this.svgString,
    this.size = 120,
    this.showBorder = false,
    this.borderColor,
  });

  @override
  Widget build(BuildContext context) {
    final avatar = SvgPicture.string(
      svgString,
      width: size,
      height: size,
      fit: BoxFit.cover,
    );

    if (!showBorder) return ClipOval(child: avatar);

    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        border: Border.all(color: borderColor ?? Colors.white, width: 3),
      ),
      child: ClipOval(child: avatar),
    );
  }
}
