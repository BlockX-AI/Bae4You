import 'dart:math';
import 'package:flutter/material.dart';

class ParticleBackground extends StatefulWidget {
  final int particleCount;
  final Color color;

  const ParticleBackground({
    super.key,
    this.particleCount = 50,
    this.color = Colors.white,
  });

  @override
  State<ParticleBackground> createState() => _ParticleBackgroundState();
}

class _ParticleBackgroundState extends State<ParticleBackground>
    with TickerProviderStateMixin {
  late final List<Particle> particles;
  late final List<AnimationController> controllers;

  @override
  void initState() {
    super.initState();
    particles = List.generate(
      widget.particleCount,
      (index) => Particle.random(),
    );
    controllers = List.generate(
      widget.particleCount,
      (index) => AnimationController(
        vsync: this,
        duration: Duration(seconds: 3 + Random().nextInt(7)),
      )..repeat(),
    );
  }

  @override
  void dispose() {
    for (var controller in controllers) {
      controller.dispose();
    }
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Stack(
      children: List.generate(
        widget.particleCount,
        (index) => AnimatedBuilder(
          animation: controllers[index],
          builder: (context, child) {
            final particle = particles[index];
            final value = controllers[index].value;
            
            return Positioned(
              left: particle.x * MediaQuery.of(context).size.width,
              top: particle.y * MediaQuery.of(context).size.height + 
                   (sin(value * 2 * pi + particle.phase) * 30),
              child: Opacity(
                opacity: particle.opacity * (0.5 + 0.5 * sin(value * 2 * pi)),
                child: Container(
                  width: particle.size,
                  height: particle.size,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    gradient: RadialGradient(
                      colors: [
                        widget.color.withOpacity(1),
                        widget.color.withOpacity(0),
                      ],
                    ),
                    boxShadow: [
                      BoxShadow(
                        color: widget.color.withOpacity(0.3),
                        blurRadius: particle.size,
                        spreadRadius: particle.size * 0.5,
                      ),
                    ],
                  ),
                ),
              ),
            );
          },
        ),
      ),
    );
  }
}

class Particle {
  final double x;
  final double y;
  final double size;
  final double opacity;
  final double phase;

  Particle({
    required this.x,
    required this.y,
    required this.size,
    required this.opacity,
    required this.phase,
  });

  factory Particle.random() {
    final random = Random();
    return Particle(
      x: random.nextDouble(),
      y: random.nextDouble(),
      size: 2 + random.nextDouble() * 6,
      opacity: 0.3 + random.nextDouble() * 0.5,
      phase: random.nextDouble() * 2 * pi,
    );
  }
}

// Floating hearts for romantic effect
class FloatingHearts extends StatefulWidget {
  const FloatingHearts({super.key});

  @override
  State<FloatingHearts> createState() => _FloatingHeartsState();
}

class _FloatingHeartsState extends State<FloatingHearts>
    with TickerProviderStateMixin {
  late final AnimationController _controller;
  final List<HeartParticle> hearts = [];

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 10),
    )..repeat();
    
    // Generate hearts
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

// Sparkle effect
class SparkleEffect extends StatefulWidget {
  final Widget child;
  
  const SparkleEffect({super.key, required this.child});

  @override
  State<SparkleEffect> createState() => _SparkleEffectState();
}

class _SparkleEffectState extends State<SparkleEffect>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller;
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
