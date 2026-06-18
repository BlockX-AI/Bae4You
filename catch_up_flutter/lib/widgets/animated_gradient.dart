import 'dart:math';
import 'package:flutter/material.dart';
import '../theme/app_colors.dart';

class AnimatedGradientBackground extends StatefulWidget {
  final Widget child;

  const AnimatedGradientBackground({super.key, required this.child});

  @override
  State<AnimatedGradientBackground> createState() => _AnimatedGradientBackgroundState();
}

class _AnimatedGradientBackgroundState extends State<AnimatedGradientBackground>
    with TickerProviderStateMixin {
  late AnimationController _controller;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 8),
    )..repeat();
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
        final value = _controller.value;
        
        return Container(
          decoration: BoxDecoration(
            gradient: RadialGradient(
              center: Alignment(
                0.5 + 0.3 * sin(value * 2 * pi),
                0.3 + 0.2 * cos(value * 2 * pi),
              ),
              radius: 1.2 + 0.2 * sin(value * 2 * pi),
              colors: [
                AppColors.primaryLight.withOpacity(0.8 + 0.2 * sin(value * 2 * pi)),
                AppColors.bgMid.withOpacity(0.9),
                AppColors.bgTop,
              ],
              stops: [
                0.0,
                0.4 + 0.1 * sin(value * 2 * pi),
                1.0,
              ],
            ),
          ),
          child: widget.child,
        );
      },
    );
  }
}
