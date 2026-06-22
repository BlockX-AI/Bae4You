import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';
import '../models/notion_avatar.dart';
import '../services/api_service.dart';

/// Displays a Notion avatar from config or fetches SVG from backend
class NotionAvatarDisplay extends StatelessWidget {
  final NotionAvatarConfig? config;
  final String? userId;
  final double size;
  final bool showBorder;
  final Color? borderColor;

  const NotionAvatarDisplay({
    super.key,
    this.config,
    this.userId,
    this.size = 120,
    this.showBorder = false,
    this.borderColor,
  });

  @override
  Widget build(BuildContext context) {
    if (config == null && userId == null) {
      return _buildPlaceholder();
    }

    if (userId != null) {
      // Fetch SVG from backend endpoint
      return FutureBuilder<String>(
        future: _fetchSvg(userId!),
        builder: (context, snapshot) {
          if (snapshot.hasData) {
            return _buildSvgAvatar(snapshot.data!);
          }
          if (snapshot.hasError) {
            return _buildPlaceholder();
          }
          return _buildLoading();
        },
      );
    }

    // For local config, we'd need to render it client-side or fetch from backend
    // For now, show placeholder - will implement client-side rendering next
    return _buildPlaceholder();
  }

  Future<String> _fetchSvg(String userId) async {
    final baseUrl = ApiService.baseUrl;
    // Note: This endpoint returns SVG directly
    // We'll need to fetch it as text
    return '''<svg viewBox="0 0 1080 1080" fill="none" xmlns="http://www.w3.org/2000/svg" width="1080" height="1080">
      <circle cx="540" cy="540" r="540" fill="#f3e0c8"/>
    </svg>'''; // Placeholder - will implement proper fetch
  }

  Widget _buildSvgAvatar(String svgString) {
    final avatar = SvgPicture.string(
      svgString,
      width: size,
      height: size,
      fit: BoxFit.cover,
    );

    if (!showBorder) return avatar;

    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        border: Border.all(
          color: borderColor ?? Colors.white,
          width: 3,
        ),
      ),
      child: ClipOval(child: avatar),
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
            ? Border.all(
                color: borderColor ?? Colors.white,
                width: 3,
              )
            : null,
      ),
      child: Icon(
        Icons.person,
        size: size * 0.5,
        color: Colors.grey[600],
      ),
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

/// Simplified version that takes SVG string directly
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

    if (!showBorder) return avatar;

    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        border: Border.all(
          color: borderColor ?? Colors.white,
          width: 3,
        ),
      ),
      child: ClipOval(child: avatar),
    );
  }
}
