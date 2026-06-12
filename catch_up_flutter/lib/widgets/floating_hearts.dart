import 'dart:math';
import 'package:flutter/material.dart';

class FloatingHearts extends StatefulWidget {
  const FloatingHearts({super.key});

  @override
  State<FloatingHearts> createState() => _FloatingHeartsState();
}

class _FloatingHeartsState extends State<FloatingHearts>
    with TickerProviderStateMixin {
  late AnimationController _controller;
  final List<HeartParticle> hearts = [];

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 10),
    )..repeat();
    
    for (int i = 0; i < 15; i++) {
      hearts.add(HeartParticle.random());
    }
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
          children: hearts.map((heart) {
            final progress = ((_controller.value + heart.delay) % 1.0);
            final y = 1.2 - progress * 1.4;
            final x = heart.x + sin(progress * 4 * pi + heart.phase) * 0.05;
            final scale = 0.5 + heart.scale * (1 - progress);
            final opacity = progress < 0.1 
                ? progress * 10 
                : (progress > 0.9 ? (1 - progress) * 10 : heart.opacity);

            return Positioned(
              left: x * MediaQuery.of(context).size.width,
              top: y * MediaQuery.of(context).size.height,
              child: Transform.scale(
                scale: scale,
                child: Opacity(
                  opacity: opacity,
                  child: Icon(
                    Icons.favorite,
                    color: heart.color,
                    size: heart.size,
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

class HeartParticle {
  final double x;
  final double delay;
  final double phase;
  final double size;
  final double scale;
  final double opacity;
  final Color color;

  HeartParticle({
    required this.x,
    required this.delay,
    required this.phase,
    required this.size,
    required this.scale,
    required this.opacity,
    required this.color,
  });

  factory HeartParticle.random() {
    final random = Random();
    final colors = [
      const Color(0xFFFF6BB0),
      const Color(0xFFFF1744),
      const Color(0xFFE91E63),
      const Color(0xFFFF4081),
      const Color(0xFFF50057),
    ];
    return HeartParticle(
      x: 0.1 + random.nextDouble() * 0.8,
      delay: random.nextDouble(),
      phase: random.nextDouble() * 2 * pi,
      size: 20 + random.nextDouble() * 30,
      scale: 0.5 + random.nextDouble() * 0.5,
      opacity: 0.3 + random.nextDouble() * 0.4,
      color: colors[random.nextInt(colors.length)],
    );
  }
}
