import 'package:flutter/material.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'dart:io';

/// Cached network image widget with premium loading states

class CachedProfileImage extends StatelessWidget {
  final String imageUrl;
  final double size;
  final double borderRadius;
  final String? placeholder;

  const CachedProfileImage({
    super.key,
    required this.imageUrl,
    this.size = 100,
    this.borderRadius = 50,
    this.placeholder,
  });

  @override
  Widget build(BuildContext context) {
    return CachedNetworkImage(
      imageUrl: imageUrl,
      imageBuilder: (context, imageProvider) => Container(
        width: size,
        height: size,
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(borderRadius),
          image: DecorationImage(
            image: imageProvider,
            fit: BoxFit.cover,
          ),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.2),
              blurRadius: 10,
              offset: const Offset(0, 4),
            ),
          ],
        ),
      ),
      placeholder: (context, url) => _buildPlaceholder(),
      errorWidget: (context, url, error) => _buildErrorWidget(),
    );
  }

  Widget _buildPlaceholder() {
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [Color(0xFFFF6BB0), Color(0xFF7B2FE8)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(borderRadius),
      ),
      child: Center(
        child: placeholder != null
            ? Text(
                placeholder!,
                style: const TextStyle(fontSize: 40),
              )
            : const CircularProgressIndicator(
                color: Colors.white,
                strokeWidth: 2,
              ),
      ),
    );
  }

  Widget _buildErrorWidget() {
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        color: Colors.grey[800],
        borderRadius: BorderRadius.circular(borderRadius),
      ),
      child: const Center(
        child: Icon(
          Icons.person,
          color: Colors.white54,
          size: 40,
        ),
      ),
    );
  }
}

class CachedCardImage extends StatelessWidget {
  final String imageUrl;
  final double width;
  final double height;
  final String? emoji;

  const CachedCardImage({
    super.key,
    required this.imageUrl,
    this.width = 300,
    this.height = 400,
    this.emoji,
  });

  @override
  Widget build(BuildContext context) {
    return CachedNetworkImage(
      imageUrl: imageUrl,
      imageBuilder: (context, imageProvider) => Container(
        width: width,
        height: height,
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(24),
          image: DecorationImage(
            image: imageProvider,
            fit: BoxFit.cover,
          ),
        ),
      ),
      placeholder: (context, url) => _buildCardPlaceholder(),
      errorWidget: (context, url, error) => _buildCardErrorWidget(),
    );
  }

  Widget _buildCardPlaceholder() {
    return Container(
      width: width,
      height: height,
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [
            const Color(0xFF7B2FE8).withOpacity(0.8),
            const Color(0xFFFF6BB0).withOpacity(0.8),
          ],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(24),
      ),
      child: Center(
        child: emoji != null
            ? Text(emoji!, style: const TextStyle(fontSize: 80))
            : const CircularProgressIndicator(color: Colors.white),
      ),
    );
  }

  Widget _buildCardErrorWidget() {
    return Container(
      width: width,
      height: height,
      decoration: BoxDecoration(
        color: const Color(0xFF2E0B5C),
        borderRadius: BorderRadius.circular(24),
      ),
      child: Center(
        child: emoji != null
            ? Text(emoji!, style: const TextStyle(fontSize: 80))
            : const Icon(Icons.image, color: Colors.white54, size: 60),
      ),
    );
  }
}

class ShimmerLoadingImage extends StatelessWidget {
  final String imageUrl;
  final BoxFit fit;
  final double? width;
  final double? height;

  const ShimmerLoadingImage({
    super.key,
    required this.imageUrl,
    this.fit = BoxFit.cover,
    this.width,
    this.height,
  });

  @override
  Widget build(BuildContext context) {
    return CachedNetworkImage(
      imageUrl: imageUrl,
      fit: fit,
      width: width,
      height: height,
      placeholder: (context, url) => _buildShimmerPlaceholder(),
      errorWidget: (context, url, error) => const Icon(Icons.error),
    );
  }

  Widget _buildShimmerPlaceholder() {
    return Container(
      width: width,
      height: height,
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [
            Colors.grey[800]!,
            Colors.grey[700]!,
            Colors.grey[800]!,
          ],
          stops: const [0.0, 0.5, 1.0],
        ),
      ),
      child: const Center(
        child: CircularProgressIndicator(
          color: Color(0xFFFF6BB0),
          strokeWidth: 2,
        ),
      ),
    );
  }
}

class LocalImageWidget extends StatelessWidget {
  final File imageFile;
  final double size;
  final double borderRadius;

  const LocalImageWidget({
    super.key,
    required this.imageFile,
    this.size = 100,
    this.borderRadius = 50,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(borderRadius),
        image: DecorationImage(
          image: FileImage(imageFile),
          fit: BoxFit.cover,
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.2),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
    );
  }
}
