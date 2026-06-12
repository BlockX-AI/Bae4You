import 'dart:math' as math;
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

class SwipeCardStack extends StatefulWidget {
  const SwipeCardStack({super.key});

  @override
  State<SwipeCardStack> createState() => _SwipeCardStackState();
}

class _SwipeCardStackState extends State<SwipeCardStack>
    with TickerProviderStateMixin {
  late final List<AnimationController> _cardControllers;
  final List<CardData> _cards = [
    CardData(
      emoji: '🐱',
      name: 'Priya, 26',
      location: 'Indore · 1 km away',
      badge: '⭐ Master',
      price: '2,100 PCASH',
      tags: ['📚 Bookworm', '🍜 Foodie', '✈️ Travel'],
      gradient: const [
        Color(0xFF7B2FE8),
        Color(0xFF4ECDC4),
      ],
      rotation: -2,
      offset: -10,
    ),
    CardData(
      emoji: '🐻',
      name: 'Arjun, 27',
      location: 'Bangalore · 5 km away',
      badge: '💎 Epic',
      price: '1,540 PCASH',
      tags: ['🎸 Musician', '🏔️ Adventure'],
      gradient: const [
        Color(0xFF9B4FFF),
        Color(0xFFFF6BB0),
      ],
      rotation: 3,
      offset: 0,
    ),
    CardData(
      emoji: '🦊',
      name: 'Maya, 24',
      location: 'Mumbai · 2 km away',
      badge: '🏆 Bronze',
      price: '1,210 PCASH',
      tags: ['🎨 Artist', '🌱 Wellness', '☕ Coffee'],
      gradient: const [
        Color(0xFFFF6BB0),
        Color(0xFFFFB347),
      ],
      rotation: -6,
      offset: 0,
    ),
  ];

  int _topCardIndex = 0;

  @override
  void initState() {
    super.initState();
    _cardControllers = List.generate(
      3,
      (index) => AnimationController(
        duration: const Duration(milliseconds: 400),
        vsync: this,
      ),
    );
  }

  @override
  void dispose() {
    for (final controller in _cardControllers) {
      controller.dispose();
    }
    super.dispose();
  }

  void _onLike() {
    _swipeCard(1);
  }

  void _onPass() {
    _swipeCard(-1);
  }

  void _swipeCard(double direction) {
    final controller = _cardControllers[_topCardIndex];
    
    controller.forward(from: 0).then((_) {
      setState(() {
        _topCardIndex = (_topCardIndex + 1) % 3;
      });
      controller.reset();
    });
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 400,
      height: 550,
      padding: const EdgeInsets.all(20),
      child: Stack(
        alignment: Alignment.center,
        children: [
          // Cards
          ...List.generate(3, (index) {
            final cardIndex = (index + _topCardIndex) % 3;
            final card = _cards[cardIndex];
            final isTop = index == 0;
            final zIndex = 3 - index;

            return AnimatedBuilder(
              animation: _cardControllers[cardIndex],
              builder: (context, child) {
                final progress = _cardControllers[cardIndex].value;
                
                // Calculate transform based on animation progress
                final baseRotation = card.rotation * math.pi / 180;
                final xOffset = isTop && progress > 0
                    ? progress * 400 * (progress > 0.5 ? 1 : -1)
                    : 0.0;
                final yOffset = card.offset.toDouble();
                final rotation = isTop && progress > 0
                    ? baseRotation + (progress * 0.5 * (progress > 0.5 ? 1 : -1))
                    : baseRotation;
                final opacity = isTop ? 1 - progress : 1.0;

                return Transform.translate(
                  offset: Offset(xOffset, yOffset),
                  child: Transform.rotate(
                    angle: rotation,
                    child: Transform.scale(
                      scale: 1 - (index * 0.02),
                      child: Opacity(
                        opacity: opacity,
                        child: _SwipeCard(
                          data: card,
                          onTap: isTop ? () {} : null,
                        ),
                      ),
                    ),
                  ),
                );
              },
            );
          }),

          // Action buttons
          Positioned(
            bottom: 40,
            left: 60,
            child: _ActionButton(
              icon: '✕',
              color: Colors.white,
              iconColor: const Color(0xFFFF3D8A),
              onTap: _onPass,
            ),
          ),

          Positioned(
            bottom: 40,
            right: 60,
            child: _ActionButton(
              icon: '💜',
              color: Colors.white,
              iconColor: const Color(0xFF7B2FE8),
              onTap: _onLike,
            ),
          ),
        ],
      ),
    );
  }
}

class CardData {
  final String emoji;
  final String name;
  final String location;
  final String badge;
  final String price;
  final List<String> tags;
  final List<Color> gradient;
  final double rotation;
  final double offset;

  CardData({
    required this.emoji,
    required this.name,
    required this.location,
    required this.badge,
    required this.price,
    required this.tags,
    required this.gradient,
    required this.rotation,
    required this.offset,
  });
}

class _SwipeCard extends StatelessWidget {
  final CardData data;
  final VoidCallback? onTap;

  const _SwipeCard({
    required this.data,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: 320,
        height: 440,
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(32),
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: data.gradient,
          ),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.4),
              blurRadius: 40,
              offset: const Offset(0, 20),
            ),
          ],
        ),
        child: ClipRRect(
          borderRadius: BorderRadius.circular(32),
          child: Stack(
            children: [
              // Gradient overlay at bottom
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
                        Colors.black.withOpacity(0.7),
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
                    // Top row
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        // Badge
                        Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 10,
                            vertical: 5,
                          ),
                          decoration: BoxDecoration(
                            color: Colors.white.withOpacity(0.95),
                            borderRadius: BorderRadius.circular(999),
                          ),
                          child: Text(
                            data.badge,
                            style: GoogleFonts.inter(
                              fontSize: 12,
                              fontWeight: FontWeight.w700,
                              color: const Color(0xFF5B1FB8),
                            ),
                          ),
                        ),

                        // Price
                        Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 10,
                            vertical: 5,
                          ),
                          decoration: BoxDecoration(
                            color: Colors.black.withOpacity(0.4),
                            borderRadius: BorderRadius.circular(999),
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              const Text('⚡', style: TextStyle(fontSize: 12)),
                              const SizedBox(width: 4),
                              Text(
                                data.price,
                                style: GoogleFonts.inter(
                                  fontSize: 13,
                                  fontWeight: FontWeight.w600,
                                  color: Colors.white,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),

                    const Spacer(),

                    // Emoji
                    Center(
                      child: Text(
                        data.emoji,
                        style: const TextStyle(fontSize: 80),
                      ),
                    ),

                    const Spacer(),

                    // Info
                    Text(
                      data.name,
                      style: GoogleFonts.fredoka(
                        fontSize: 24,
                        fontWeight: FontWeight.w600,
                        color: Colors.white,
                      ),
                    ),

                    const SizedBox(height: 4),

                    Text(
                      '📍 ${data.location}',
                      style: GoogleFonts.inter(
                        fontSize: 14,
                        color: Colors.white.withOpacity(0.9),
                      ),
                    ),

                    const SizedBox(height: 12),

                    // Tags
                    Wrap(
                      spacing: 6,
                      runSpacing: 6,
                      children: data.tags.map((tag) {
                        return Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 8,
                            vertical: 4,
                          ),
                          decoration: BoxDecoration(
                            color: Colors.white.withOpacity(0.2),
                            borderRadius: BorderRadius.circular(999),
                            border: Border.all(
                              color: Colors.white.withOpacity(0.2),
                            ),
                          ),
                          child: Text(
                            tag,
                            style: GoogleFonts.inter(
                              fontSize: 11,
                              color: Colors.white,
                            ),
                          ),
                        );
                      }).toList(),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _ActionButton extends StatelessWidget {
  final String icon;
  final Color? color;
  final List<Color>? gradient;
  final Color iconColor;
  final VoidCallback onTap;

  const _ActionButton({
    required this.icon,
    this.color,
    this.gradient,
    required this.iconColor,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: 56,
        height: 56,
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          color: color,
          gradient: gradient != null
              ? LinearGradient(
                  colors: gradient!,
                )
              : null,
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.3),
              blurRadius: 20,
              offset: const Offset(0, 6),
            ),
          ],
        ),
        child: Center(
          child: Text(
            icon,
            style: TextStyle(
              fontSize: 24,
              color: iconColor,
            ),
          ),
        ),
      ),
    );
  }
}

