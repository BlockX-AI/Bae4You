import 'package:flutter/material.dart';
import '../theme/app_colors.dart';
import 'dart:math';

class PulsingLoader extends StatefulWidget {
  final double size;

  const PulsingLoader({super.key, this.size = 60});

  @override
  State<PulsingLoader> createState() => _PulsingLoaderState();
}

class _PulsingLoaderState extends State<PulsingLoader>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1500),
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
        final scale = 1 + 0.3 * sin(_controller.value * 2 * pi);
        final opacity = 0.5 + 0.5 * sin(_controller.value * 2 * pi);

        return Stack(
          alignment: Alignment.center,
          children: [
            // Outer pulse
            Transform.scale(
              scale: scale,
              child: Container(
                width: widget.size,
                height: widget.size,
                decoration: BoxDecoration(
                  gradient: const RadialGradient(
                    colors: [Color(0xFFFF6BB0), AppColors.primary],
                  ),
                  shape: BoxShape.circle,
                  boxShadow: [
                    BoxShadow(
                      color: const Color(0xFFFF6BB0).withOpacity(0.5 * opacity),
                      blurRadius: 30,
                      spreadRadius: 10,
                    ),
                  ],
                ),
              ),
            ),

            // Inner core
            Container(
              width: widget.size * 0.5,
              height: widget.size * 0.5,
              decoration: const BoxDecoration(
                gradient: LinearGradient(
                  colors: [Color(0xFFFF6BB0), AppColors.primary],
                ),
                shape: BoxShape.circle,
              ),
            ),
          ],
        );
      },
    );
  }
}

class DotsLoader extends StatefulWidget {
  final double size;
  final Color color;

  const DotsLoader({
    super.key,
    this.size = 12,
    this.color = const Color(0xFFFF6BB0),
  });

  @override
  State<DotsLoader> createState() => _DotsLoaderState();
}

class _DotsLoaderState extends State<DotsLoader>
    with TickerProviderStateMixin {
  late List<AnimationController> _controllers;

  @override
  void initState() {
    super.initState();
    _controllers = List.generate(
      3,
      (index) => AnimationController(
        vsync: this,
        duration: const Duration(milliseconds: 600),
      )..repeat(reverse: true),
    );

    // Stagger animations
    for (int i = 0; i < 3; i++) {
      Future.delayed(Duration(milliseconds: i * 150), () {
        if (mounted) _controllers[i].forward();
      });
    }
  }

  @override
  void dispose() {
    for (var controller in _controllers) {
      controller.dispose();
    }
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: List.generate(3, (index) {
        return AnimatedBuilder(
          animation: _controllers[index],
          builder: (context, child) {
            final scale = 0.5 + 0.5 * _controllers[index].value;
            final translateY = -10 * _controllers[index].value;

            return Container(
              margin: const EdgeInsets.symmetric(horizontal: 4),
              child: Transform.translate(
                offset: Offset(0, translateY),
                child: Transform.scale(
                  scale: scale,
                  child: Container(
                    width: widget.size,
                    height: widget.size,
                    decoration: BoxDecoration(
                      color: widget.color,
                      shape: BoxShape.circle,
                      boxShadow: [
                        BoxShadow(
                          color: widget.color.withOpacity(0.5),
                          blurRadius: 10,
                          spreadRadius: 2,
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            );
          },
        );
      }),
    );
  }
}

class HeartLoader extends StatefulWidget {
  final double size;

  const HeartLoader({super.key, this.size = 40});

  @override
  State<HeartLoader> createState() => _HeartLoaderState();
}

class _HeartLoaderState extends State<HeartLoader>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1000),
    )..repeat(reverse: true);
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
        final scale = 1 + 0.2 * _controller.value;

        return Transform.scale(
          scale: scale,
          child: Icon(
            Icons.favorite,
            color: const Color(0xFFFF6BB0),
            size: widget.size,
          ),
        );
      },
    );
  }
}

class LoadingOverlay extends StatelessWidget {
  final String? message;

  const LoadingOverlay({super.key, this.message});

  @override
  Widget build(BuildContext context) {
    return Container(
      color: AppColors.textPrimary.withOpacity(0.9),
      child: Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const PulsingLoader(),
            if (message != null) ...[
              const SizedBox(height: 24),
              Text(
                message!,
                style: TextStyle(
                  color: Colors.white.withOpacity(0.8),
                  fontSize: 16,
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
