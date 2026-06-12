import 'package:flutter/material.dart';

class GradientAvatar extends StatelessWidget {
  final String? imageUrl;
  final String? emoji;
  final String? initials;
  final double size;
  final double borderWidth;
  final bool isOnline;
  final bool isVerified;

  const GradientAvatar({
    super.key,
    this.imageUrl,
    this.emoji,
    this.initials,
    this.size = 60,
    this.borderWidth = 3,
    this.isOnline = false,
    this.isVerified = false,
  });

  @override
  Widget build(BuildContext context) {
    return Stack(
      children: [
        // Main avatar container
        Container(
          width: size,
          height: size,
          decoration: BoxDecoration(
            gradient: const LinearGradient(
              colors: [Color(0xFFFF6BB0), Color(0xFF7B2FE8)],
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
            ),
            borderRadius: BorderRadius.circular(size / 2),
            boxShadow: [
              BoxShadow(
                color: const Color(0xFFFF6BB0).withOpacity(0.4),
                blurRadius: 15,
                spreadRadius: 2,
              ),
            ],
          ),
          padding: EdgeInsets.all(borderWidth),
          child: ClipOval(
            child: Container(
              color: const Color(0xFF2E0B5C),
              child: _buildContent(),
            ),
          ),
        ),

        // Online indicator
        if (isOnline)
          Positioned(
            bottom: 2,
            right: 2,
            child: Container(
              width: size * 0.25,
              height: size * 0.25,
              decoration: BoxDecoration(
                color: const Color(0xFF00FF88),
                border: Border.all(
                  color: const Color(0xFF2E0B5C),
                  width: 2,
                ),
                borderRadius: BorderRadius.circular(size * 0.125),
                boxShadow: [
                  BoxShadow(
                    color: const Color(0xFF00FF88).withOpacity(0.5),
                    blurRadius: 8,
                    spreadRadius: 1,
                  ),
                ],
              ),
            ),
          ),

        // Verified badge
        if (isVerified)
          Positioned(
            bottom: 0,
            left: 0,
            child: Container(
              width: size * 0.3,
              height: size * 0.3,
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [Color(0xFF00FF88), Color(0xFF00CC6A)],
                ),
                border: Border.all(
                  color: const Color(0xFF2E0B5C),
                  width: 2,
                ),
                borderRadius: BorderRadius.circular(size * 0.15),
              ),
              child: const Icon(
                Icons.verified,
                color: Colors.white,
                size: 14,
              ),
            ),
          ),
      ],
    );
  }

  Widget _buildContent() {
    if (imageUrl != null) {
      return Image.network(
        imageUrl!,
        fit: BoxFit.cover,
        errorBuilder: (context, error, stackTrace) => _buildFallback(),
      );
    }
    return _buildFallback();
  }

  Widget _buildFallback() {
    if (emoji != null) {
      return Center(
        child: Text(
          emoji!,
          style: TextStyle(fontSize: size * 0.5),
        ),
      );
    }

    if (initials != null) {
      return Center(
        child: Text(
          initials!,
          style: TextStyle(
            color: Colors.white,
            fontSize: size * 0.4,
            fontWeight: FontWeight.bold,
          ),
        ),
      );
    }

    return Icon(
      Icons.person,
      color: Colors.white.withOpacity(0.5),
      size: size * 0.5,
    );
  }
}
