import 'dart:math' as math;
import 'package:flutter/material.dart';
import '../theme/app_colors.dart';

class AnimatedBackground extends StatefulWidget {
  const AnimatedBackground({super.key});

  @override
  State<AnimatedBackground> createState() => _AnimatedBackgroundState();
}

class _AnimatedBackgroundState extends State<AnimatedBackground>
    with TickerProviderStateMixin {
  late final List<AnimationController> _particleControllers;
  late final List<Animation<double>> _particleAnimations;

  @override
  void initState() {
    super.initState();
    
    // Create particle animations
    _particleControllers = List.generate(
      25,
      (index) => AnimationController(
        duration: Duration(seconds: 15 + (index % 20)),
        vsync: this,
      )..repeat(),
    );

    _particleAnimations = _particleControllers.map((controller) {
      return Tween<double>(begin: 0, end: 1).animate(
        CurvedAnimation(parent: controller, curve: Curves.linear),
      );
    }).toList();
  }

  @override
  void dispose() {
    for (final controller in _particleControllers) {
      controller.dispose();
    }
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Stack(
      children: [
        // Gradient background
        Container(
          decoration: const BoxDecoration(
            gradient: RadialGradient(
              center: Alignment.topCenter,
              radius: 1.2,
              colors: [
                Color(0xFFFF6BB0),
                AppColors.primary,
                AppColors.textPrimary,
              ],
              stops: [0.0, 0.4, 1.0],
            ),
          ),
        ),

        // Animated particles
        ...List.generate(25, (index) {
          final random = math.Random(index);
          final size = random.nextDouble() * 6 + 2;
          final left = random.nextDouble();
          final delay = random.nextDouble() * 20;

          return AnimatedBuilder(
            animation: _particleAnimations[index],
            builder: (context, child) {
              final progress = _particleAnimations[index].value;
              final y = 1.1 - (progress % 1.0);
              final opacity = y > 0.9
                  ? (1.1 - y) * 10
                  : y < 0.1
                      ? y * 10
                      : 1.0;

              return Positioned(
                left: left * MediaQuery.of(context).size.width +
                    (progress * 50),
                top: y * MediaQuery.of(context).size.height,
                child: Opacity(
                  opacity: opacity.clamp(0.0, 1.0),
                  child: Container(
                    width: size,
                    height: size,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      gradient: RadialGradient(
                        colors: [
                          Colors.white.withOpacity(0.8),
                          Colors.transparent,
                        ],
                      ),
                    ),
                  ),
                ),
              );
            },
          );
        }),

        // Sparkles
        ..._buildSparkles(),
      ],
    );
  }

  List<Widget> _buildSparkles() {
    final sparkles = [
      (0.1, 0.15, 20.0, 0.0),
      (0.25, 0.9, 16.0, 1.0),
      (0.7, 0.05, 14.0, 2.0),
    ];

    return sparkles.map((sparkle) {
      final (top, left, size, delay) = sparkle;
      return Positioned(
        top: top * MediaQuery.of(context).size.height,
        left: left * MediaQuery.of(context).size.width,
        child: _Sparkle(
          size: size,
          delay: Duration(seconds: delay.toInt()),
        ),
      );
    }).toList();
  }
}

class _Sparkle extends StatefulWidget {
  final double size;
  final Duration delay;

  const _Sparkle({required this.size, required this.delay});

  @override
  State<_Sparkle> createState() => _SparkleState();
}

class _SparkleState extends State<_Sparkle>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _animation;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      duration: const Duration(seconds: 3),
      vsync: this,
    );

    _animation = Tween<double>(begin: 0, end: 1).animate(
      CurvedAnimation(
        parent: _controller,
        curve: const Interval(0.0, 1.0, curve: Curves.easeInOut),
      ),
    );

    Future.delayed(widget.delay, () {
      if (mounted) _controller.repeat();
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
      animation: _animation,
      builder: (context, child) {
        final value = _animation.value;
        final scale = value < 0.5 ? value * 2 : (1 - value) * 2;
        final rotation = value * 180;
        final opacity = scale;

        return Transform.rotate(
          angle: rotation * math.pi / 180,
          child: Opacity(
            opacity: opacity,
            child: Text(
              '✦',
              style: TextStyle(
                fontSize: widget.size,
                color: Colors.white,
              ),
            ),
          ),
        );
      },
    );
  }
}
