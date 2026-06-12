import 'dart:math' as math;
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';
import '../providers/auth_provider.dart';
import '../providers/match_provider.dart';
import '../models/user_models.dart';
import '../widgets/animated_background.dart';

class SwipeScreen extends ConsumerStatefulWidget {
  const SwipeScreen({super.key});

  @override
  ConsumerState<SwipeScreen> createState() => _SwipeScreenState();
}

class _SwipeScreenState extends ConsumerState<SwipeScreen> {
  @override
  Widget build(BuildContext context) {
    final candidatesAsync = ref.watch(discoverCandidatesProvider);

    return Scaffold(
      body: Container(
        decoration: const BoxDecoration(
          gradient: RadialGradient(
            center: Alignment.topCenter,
            radius: 1.2,
            colors: [
              Color(0xFFFF6BB0),
              Color(0xFF7B2FE8),
              Color(0xFF2E0B5C),
            ],
            stops: [0.0, 0.4, 1.0],
          ),
        ),
        child: SafeArea(
          child: Column(
            children: [
              // Header
              Padding(
                padding: const EdgeInsets.all(16),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      'Discover',
                      style: GoogleFonts.fredoka(
                        fontSize: 28,
                        fontWeight: FontWeight.w600,
                        color: Colors.white,
                      ),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 12,
                        vertical: 6,
                      ),
                      decoration: BoxDecoration(
                        color: Colors.white.withOpacity(0.1),
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(
                          color: Colors.white.withOpacity(0.2),
                        ),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          const Icon(
                            Icons.bolt,
                            color: Color(0xFFFFD700),
                            size: 16,
                          ),
                          const SizedBox(width: 4),
                          Text(
                            '2,450',
                            style: GoogleFonts.inter(
                              fontSize: 14,
                              fontWeight: FontWeight.w600,
                              color: Colors.white,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),

              // Cards
              Expanded(
                child: candidatesAsync.when(
                  data: (candidates) => _CardStack(candidates: candidates),
                  loading: () => const Center(
                    child: CircularProgressIndicator(
                      color: Colors.white,
                    ),
                  ),
                  error: (err, stack) => Center(
                    child: Text(
                      'Error loading profiles\n$err',
                      style: GoogleFonts.inter(
                        color: Colors.white,
                      ),
                      textAlign: TextAlign.center,
                    ),
                  ),
                ),
              ),

              // Bottom spacing
              const SizedBox(height: 20),
            ],
          ),
        ),
      ),
    );
  }
}

class _CardStack extends StatefulWidget {
  final List<DiscoverCandidate> candidates;

  const _CardStack({required this.candidates});

  @override
  State<_CardStack> createState() => _CardStackState();
}

class _CardStackState extends State<_CardStack> {
  int _currentIndex = 0;

  void _swipe(bool like) {
    if (_currentIndex < widget.candidates.length - 1) {
      setState(() => _currentIndex++);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_currentIndex >= widget.candidates.length) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Text(
              '🎉',
              style: GoogleFonts.fredoka(fontSize: 64),
            ),
            const SizedBox(height: 16),
            Text(
              'No more profiles!',
              style: GoogleFonts.fredoka(
                fontSize: 24,
                color: Colors.white,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              'Check back later for more matches',
              style: GoogleFonts.inter(
                fontSize: 14,
                color: Colors.white.withOpacity(0.7),
              ),
            ),
          ],
        ),
      );
    }

    return Stack(
      alignment: Alignment.center,
      children: [
        // Next card (preview)
        if (_currentIndex + 1 < widget.candidates.length)
          Transform.scale(
            scale: 0.95,
            child: _ProfileCard(
              candidate: widget.candidates[_currentIndex + 1],
              isTop: false,
            ),
          ),

        // Current card
        Draggable<
        Map
        <String, dynamic>>(
          data: {'like': true},
          feedback: _ProfileCard(
            candidate: widget.candidates[_currentIndex],
            isTop: true,
            isDragging: true,
          ),
          childWhenDragging: const SizedBox(),
          onDragEnd: (details) {
            if (details.offset.dx > 100) {
              _swipe(true);
            } else if (details.offset.dx < -100) {
              _swipe(false);
            }
          },
          child: _ProfileCard(
            candidate: widget.candidates[_currentIndex],
            isTop: true,
          ),
        ),
      ],
    );
  }
}

class _ProfileCard extends StatelessWidget {
  final DiscoverCandidate candidate;
  final bool isTop;
  final bool isDragging;

  const _ProfileCard({
    required this.candidate,
    required this.isTop,
    this.isDragging = false,
  });

  @override
  Widget build(BuildContext context) {
    final displayName = candidate.displayName ?? candidate.username ?? 'Anonymous';
    final avatarEmoji = _getEmojiForName(displayName);

    return Container(
      width: 340,
      height: 480,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(24),
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            const Color(0xFFFF6BB0).withOpacity(0.8),
            const Color(0xFF7B2FE8).withOpacity(0.8),
          ],
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.3),
            blurRadius: 20,
            offset: const Offset(0, 10),
          ),
        ],
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(24),
        child: Stack(
          children: [
            // Gradient overlay
            Positioned(
              bottom: 0,
              left: 0,
              right: 0,
              child: Container(
                height: 200,
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.topCenter,
                    end: Alignment.bottomCenter,
                    colors: [
                      Colors.transparent,
                      Colors.black.withOpacity(0.8),
                    ],
                  ),
                ),
              ),
            ),

            // Content
            Padding(
              padding: const EdgeInsets.all(20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Verification badge
                  if (candidate.isVerified == true)
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 10,
                        vertical: 5,
                      ),
                      decoration: BoxDecoration(
                        color: const Color(0xFF00FF88),
                        borderRadius: BorderRadius.circular(20),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          const Icon(
                            Icons.verified,
                            size: 14,
                            color: Color(0xFF1A0738),
                          ),
                          const SizedBox(width: 4),
                          Text(
                            'Verified',
                            style: GoogleFonts.inter(
                              fontSize: 12,
                              fontWeight: FontWeight.w600,
                              color: const Color(0xFF1A0738),
                            ),
                          ),
                        ],
                      ),
                    ),

                  const Spacer(),

                  // Avatar emoji
                  Center(
                    child: Text(
                      avatarEmoji,
                      style: const TextStyle(fontSize: 100),
                    ),
                  ),

                  const Spacer(),

                  // Name
                  Text(
                    displayName,
                    style: GoogleFonts.fredoka(
                      fontSize: 28,
                      fontWeight: FontWeight.w600,
                      color: Colors.white,
                    ),
                  ),

                  const SizedBox(height: 4),

                  // Location
                  if (candidate.countryCode != null)
                    Text(
                      '📍 ${candidate.countryCode}',
                      style: GoogleFonts.inter(
                        fontSize: 14,
                        color: Colors.white.withOpacity(0.8),
                      ),
                    ),

                  const SizedBox(height: 12),

                  // Bio
                  if (candidate.bio != null)
                    Text(
                      candidate.bio!,
                      style: GoogleFonts.inter(
                        fontSize: 14,
                        color: Colors.white.withOpacity(0.7),
                        height: 1.4,
                      ),
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  String _getEmojiForName(String name) {
    final emojis = ['😊', '🎨', '🎸', '📚', '🏔️', '☕', '🌟', '🎯', '🔥', '💫'];
    return emojis[name.length % emojis.length];
  }
}

class _ActionButton extends StatelessWidget {
  final IconData icon;
  final Color? color;
  final List<Color>? gradient;
  final Color iconColor;
  final VoidCallback onTap;
  final double size;

  const _ActionButton({
    required this.icon,
    this.color,
    this.gradient,
    required this.iconColor,
    required this.onTap,
    this.size = 56,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: size,
        height: size,
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          color: color,
          gradient: gradient != null
              ? LinearGradient(
                  colors: gradient!,
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                )
              : null,
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.2),
              blurRadius: 15,
              offset: const Offset(0, 5),
            ),
          ],
        ),
        child: Icon(
          icon,
          color: iconColor,
          size: size * 0.4,
        ),
      ),
    );
  }
}
