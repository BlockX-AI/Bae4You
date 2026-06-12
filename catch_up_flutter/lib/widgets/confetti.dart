import 'dart:math';
import 'package:flutter/material.dart';

class ConfettiCelebration extends StatefulWidget {
  final VoidCallback? onComplete;

  const ConfettiCelebration({super.key, this.onComplete});

  @override
  State<ConfettiCelebration> createState() => _ConfettiCelebrationState();
}

class _ConfettiCelebrationState extends State<ConfettiCelebration>
    with TickerProviderStateMixin {
  late AnimationController _controller;
  final List<ConfettiParticle> particles = [];

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 3),
    );

    // Generate confetti particles
    for (int i = 0; i < 50; i++) {
      particles.add(ConfettiParticle.random());
    }

    _controller.forward().then((_) {
      widget.onComplete?.call();
    });
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _controller,
      builder: (context, child) {
        return Stack(
          children: particles.map((particle) {
            final progress = _controller.value;
            final x = particle.startX +
                particle.velocityX * progress * 300 +
                sin(progress * particle.frequency) * 50;
            final y = MediaQuery.of(context).size.height * 0.5 +
                particle.velocityY * progress * 400 +
                progress * progress * 200; // gravity
            final rotation = particle.rotationSpeed * progress * 2 * pi;
            final opacity = progress < 0.8 ? 1.0 : 1 - (progress - 0.8) * 5;

            return Positioned(
              left: x,
              top: y,
              child: Transform.rotate(
                angle: rotation,
                child: Opacity(
                  opacity: opacity,
                  child: Container(
                    width: particle.size,
                    height: particle.size,
                    decoration: BoxDecoration(
                      color: particle.color,
                      shape: particle.isRound ? BoxShape.circle : BoxShape.rectangle,
                      borderRadius: particle.isRound ? null : BorderRadius.circular(2),
                    ),
                  ),
                ),
              ),
            );
          }).toList(),
        );
      },
    );
  }
}

class ConfettiParticle {
  final double startX;
  final double velocityX;
  final double velocityY;
  final double rotationSpeed;
  final double size;
  final Color color;
  final bool isRound;
  final double frequency;

  ConfettiParticle({
    required this.startX,
    required this.velocityX,
    required this.velocityY,
    required this.rotationSpeed,
    required this.size,
    required this.color,
    required this.isRound,
    required this.frequency,
  });

  factory ConfettiParticle.random() {
    final random = Random();
    final colors = [
      const Color(0xFFFF6BB0),
      const Color(0xFF7B2FE8),
      const Color(0xFF00FF88),
      const Color(0xFFFFD700),
      const Color(0xFFFF1744),
    ];
    return ConfettiParticle(
      startX: random.nextDouble() * 400 - 200, // center around screen
      velocityX: (random.nextDouble() - 0.5) * 4,
      velocityY: -3 - random.nextDouble() * 2, // shoot up
      rotationSpeed: random.nextDouble() * 4 - 2,
      size: 8 + random.nextDouble() * 12,
      color: colors[random.nextInt(colors.length)],
      isRound: random.nextBool(),
      frequency: 2 + random.nextDouble() * 3,
    );
  }
}
