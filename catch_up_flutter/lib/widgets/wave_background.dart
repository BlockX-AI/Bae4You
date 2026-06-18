import 'dart:math';
import 'package:flutter/material.dart';
import '../theme/app_colors.dart';

class WaveBackground extends StatefulWidget {
  final Widget child;

  const WaveBackground({super.key, required this.child});

  @override
  State<WaveBackground> createState() => _WaveBackgroundState();
}

class _WaveBackgroundState extends State<WaveBackground>
    with TickerProviderStateMixin {
  late AnimationController _controller;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 5),
    )..repeat();
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
        // Base gradient
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
            ),
          ),
        ),
        
        // Animated waves
        AnimatedBuilder(
          animation: _controller,
          builder: (context, child) {
            return CustomPaint(
              size: Size.infinite,
              painter: WavePainter(
                progress: _controller.value,
                color: AppColors.primary,
              ),
            );
          },
        ),
        
        // Content
        widget.child,
      ],
    );
  }
}

class WavePainter extends CustomPainter {
  final double progress;
  final Color color;

  WavePainter({required this.progress, required this.color});

  @override
  void paint(Canvas canvas, Size size) {
    // First wave
    final paint1 = Paint()
      ..color = color.withOpacity(0.3)
      ..style = PaintingStyle.fill;

    final path1 = Path();
    path1.moveTo(0, size.height * 0.8);
    
    for (double x = 0; x <= size.width; x += 10) {
      final y = size.height * 0.8 +
          30 * sin((x / size.width) * 2 * pi + progress * 2 * pi);
      path1.lineTo(x, y);
    }
    
    path1.lineTo(size.width, size.height);
    path1.lineTo(0, size.height);
    path1.close();
    canvas.drawPath(path1, paint1);

    // Second wave
    final paint2 = Paint()
      ..color = color.withOpacity(0.2)
      ..style = PaintingStyle.fill;
    
    final path2 = Path();
    path2.moveTo(0, size.height * 0.85);
    
    for (double x = 0; x <= size.width; x += 10) {
      final y = size.height * 0.85 +
          40 * sin((x / size.width) * 2 * pi + progress * 2 * pi + pi);
      path2.lineTo(x, y);
    }
    
    path2.lineTo(size.width, size.height);
    path2.lineTo(0, size.height);
    path2.close();
    canvas.drawPath(path2, paint2);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => true;
}
