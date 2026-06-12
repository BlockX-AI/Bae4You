import 'dart:math';
import 'package:flutter/material.dart';

class SparkleEffect extends StatefulWidget {
  final Widget child;
  
  const SparkleEffect({super.key, required this.child});

  @override
  State<SparkleEffect> createState() => _SparkleEffectState();
}

class _SparkleEffectState extends State<SparkleEffect>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  final List<Sparkle> sparkles = [];

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 2),
    )..repeat();
    
    for (int i = 0; i < 8; i++) {
      sparkles.add(Sparkle.random());
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Stack(
      children: [
        widget.child,
        AnimatedBuilder(
          animation: _controller,
          builder: (context, child) {
            return Stack(
              children: sparkles.map((sparkle) {
                final progress = ((_controller.value + sparkle.delay) % 1.0);
                final opacity = progress < 0.2 
                    ? progress * 5 
                    : (progress > 0.8 ? (1 - progress) * 5 : 1.0);
                final scale = sparkle.maxScale * 
                    (0.5 + 0.5 * sin(progress * pi));

                return Positioned(
                  left: sparkle.x,
                  top: sparkle.y,
                  child: Opacity(
                    opacity: opacity,
                    child: Transform.scale(
                      scale: scale,
                      child: Container(
                        width: sparkle.size,
                        height: sparkle.size,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          gradient: RadialGradient(
                            colors: [
                              Colors.white,
                              Colors.white.withOpacity(0),
                            ],
                          ),
                        ),
                      ),
                    ),
                  ),
                );
              }).toList(),
            );
          },
        ),
      ],
    );
  }
}

class Sparkle {
  final double x;
  final double y;
  final double size;
  final double maxScale;
  final double delay;

  Sparkle({
    required this.x,
    required this.y,
    required this.size,
    required this.maxScale,
    required this.delay,
  });

  factory Sparkle.random() {
    final random = Random();
    return Sparkle(
      x: random.nextDouble() * 200,
      y: random.nextDouble() * 100,
      size: 4 + random.nextDouble() * 8,
      maxScale: 1.0 + random.nextDouble(),
      delay: random.nextDouble(),
    );
  }
}
