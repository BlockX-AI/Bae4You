import 'package:flutter/material.dart';
import 'package:shimmer/shimmer.dart';

class SkeletonLoader extends StatelessWidget {
  final double width;
  final double height;
  final double borderRadius;

  const SkeletonLoader({
    super.key,
    required this.width,
    required this.height,
    this.borderRadius = 12,
  });

  @override
  Widget build(BuildContext context) {
    return Shimmer.fromColors(
      baseColor: Colors.white.withOpacity(0.1),
      highlightColor: Colors.white.withOpacity(0.2),
      period: const Duration(seconds: 2),
      child: Container(
        width: width,
        height: height,
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(borderRadius),
        ),
      ),
    );
  }
}

class CardSkeleton extends StatelessWidget {
  const CardSkeleton({super.key});

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.all(16),
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.05),
        borderRadius: BorderRadius.circular(24),
        border: Border.all(
          color: Colors.white.withOpacity(0.1),
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Avatar skeleton
          Row(
            children: [
              const SkeletonLoader(width: 60, height: 60, borderRadius: 30),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const SkeletonLoader(width: 120, height: 16),
                    const SizedBox(height: 8),
                    const SkeletonLoader(width: 80, height: 12),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 20),
          // Content skeleton
          const SkeletonLoader(width: double.infinity, height: 12),
          const SizedBox(height: 8),
          const SkeletonLoader(width: double.infinity, height: 12),
          const SizedBox(height: 8),
          const SkeletonLoader(width: 200, height: 12),
        ],
      ),
    );
  }
}

class ProfileSkeleton extends StatelessWidget {
  const ProfileSkeleton({super.key});

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        const SizedBox(height: 40),
        // Avatar
        const SkeletonLoader(width: 120, height: 120, borderRadius: 60),
        const SizedBox(height: 20),
        // Name
        const SkeletonLoader(width: 150, height: 24),
        const SizedBox(height: 12),
        // Stats
        Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Column(
              children: [
                const SkeletonLoader(width: 40, height: 28),
                const SizedBox(height: 4),
                const SkeletonLoader(width: 60, height: 12),
              ],
            ),
            const SizedBox(width: 40),
            Column(
              children: [
                const SkeletonLoader(width: 50, height: 28),
                const SizedBox(height: 4),
                const SkeletonLoader(width: 50, height: 12),
              ],
            ),
            const SizedBox(width: 40),
            Column(
              children: [
                const SkeletonLoader(width: 30, height: 28),
                const SizedBox(height: 4),
                const SkeletonLoader(width: 40, height: 12),
              ],
            ),
          ],
        ),
        const SizedBox(height: 40),
        // Menu items
        for (int i = 0; i < 5; i++) ...[
          const CardSkeleton(),
        ],
      ],
    );
  }
}
