import 'dart:math';
import 'package:flutter/material.dart';

class GradientProgressBar extends StatelessWidget {
  final double progress; // 0.0 to 1.0
  final double height;
  final bool showGlow;

  const GradientProgressBar({
    super.key,
    required this.progress,
    this.height = 8,
    this.showGlow = true,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      height: height,
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.1),
        borderRadius: BorderRadius.circular(height / 2),
      ),
      child: Stack(
        children: [
          AnimatedContainer(
            duration: const Duration(milliseconds: 500),
            curve: Curves.easeOut,
            width: MediaQuery.of(context).size.width * progress.clamp(0, 1),
            decoration: BoxDecoration(
              gradient: const LinearGradient(
                colors: [Color(0xFFFF6BB0), Color(0xFF7B2FE8)],
              ),
              borderRadius: BorderRadius.circular(height / 2),
              boxShadow: showGlow
                  ? [
                      BoxShadow(
                        color: const Color(0xFFFF6BB0).withOpacity(0.5),
                        blurRadius: 10,
                        spreadRadius: 2,
                      ),
                    ]
                  : [],
            ),
          ),
        ],
      ),
    );
  }
}

class CircularProgress extends StatefulWidget {
  final double progress;
  final double size;
  final double strokeWidth;
  final String? label;

  const CircularProgress({
    super.key,
    required this.progress,
    this.size = 100,
    this.strokeWidth = 8,
    this.label,
  });

  @override
  State<CircularProgress> createState() => _CircularProgressState();
}

class _CircularProgressState extends State<CircularProgress>
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
        return SizedBox(
          width: widget.size,
          height: widget.size,
          child: Stack(
            alignment: Alignment.center,
            children: [
              // Background circle
              Container(
                width: widget.size,
                height: widget.size,
                decoration: BoxDecoration(
                  color: Colors.white.withOpacity(0.1),
                  shape: BoxShape.circle,
                ),
              ),

              // Progress arc
              CustomPaint(
                size: Size(widget.size, widget.size),
                painter: _ProgressArcPainter(
                  progress: widget.progress,
                  strokeWidth: widget.strokeWidth,
                  gradientColors: const [Color(0xFFFF6BB0), Color(0xFF7B2FE8)],
                ),
              ),

              // Center content
              if (widget.label != null)
                Text(
                  widget.label!,
                  style: TextStyle(
                    color: Colors.white,
                    fontSize: widget.size * 0.25,
                    fontWeight: FontWeight.bold,
                  ),
                ),

              // Glow effect
              Positioned(
                left: widget.size / 2 +
                    cos(widget.progress * 2 * pi - pi / 2) *
                        (widget.size / 2 - widget.strokeWidth) -
                    4,
                top: widget.size / 2 +
                    sin(widget.progress * 2 * pi - pi / 2) *
                        (widget.size / 2 - widget.strokeWidth) -
                    4,
                child: Container(
                  width: 8,
                  height: 8,
                  decoration: BoxDecoration(
                    color: const Color(0xFFFF6BB0),
                    shape: BoxShape.circle,
                    boxShadow: [
                      BoxShadow(
                        color: const Color(0xFFFF6BB0).withOpacity(0.8),
                        blurRadius: 10,
                        spreadRadius: 2,
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        );
      },
    );
  }
}

class _ProgressArcPainter extends CustomPainter {
  final double progress;
  final double strokeWidth;
  final List<Color> gradientColors;

  _ProgressArcPainter({
    required this.progress,
    required this.strokeWidth,
    required this.gradientColors,
  });

  @override
  void paint(Canvas canvas, Size size) {
    final rect = Rect.fromLTWH(
      strokeWidth / 2,
      strokeWidth / 2,
      size.width - strokeWidth,
      size.height - strokeWidth,
    );

    final gradient = SweepGradient(
      colors: gradientColors,
      startAngle: -pi / 2,
      endAngle: -pi / 2 + 2 * pi * progress,
    );

    final paint = Paint()
      ..shader = gradient.createShader(rect)
      ..style = PaintingStyle.stroke
      ..strokeWidth = strokeWidth
      ..strokeCap = StrokeCap.round;

    canvas.drawArc(
      rect,
      -pi / 2,
      2 * pi * progress,
      false,
      paint,
    );
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => true;
}

class SteppedProgress extends StatelessWidget {
  final int currentStep;
  final int totalSteps;
  final List<String>? stepLabels;

  const SteppedProgress({
    super.key,
    required this.currentStep,
    required this.totalSteps,
    this.stepLabels,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Row(
          children: List.generate(totalSteps, (index) {
            final isCompleted = index < currentStep;
            final isCurrent = index == currentStep;

            return Expanded(
              child: Row(
                children: [
                  // Step indicator
                  Container(
                    width: 32,
                    height: 32,
                    decoration: BoxDecoration(
                      gradient: isCompleted || isCurrent
                          ? const LinearGradient(
                              colors: [Color(0xFFFF6BB0), Color(0xFF7B2FE8)],
                            )
                          : null,
                      color: isCompleted || isCurrent
                          ? null
                          : Colors.white.withOpacity(0.1),
                      shape: BoxShape.circle,
                      border: Border.all(
                        color: isCurrent
                            ? const Color(0xFFFF6BB0)
                            : Colors.white.withOpacity(0.3),
                        width: 2,
                      ),
                      boxShadow: isCurrent
                          ? [
                              BoxShadow(
                                color: const Color(0xFFFF6BB0).withOpacity(0.5),
                                blurRadius: 10,
                                spreadRadius: 2,
                              ),
                            ]
                          : [],
                    ),
                    child: Center(
                      child: isCompleted
                          ? const Icon(Icons.check, color: Colors.white, size: 16)
                          : Text(
                              '${index + 1}',
                              style: TextStyle(
                                color: isCurrent ? Colors.white : Colors.white.withOpacity(0.5),
                                fontSize: 14,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                    ),
                  ),

                  // Connector line
                  if (index < totalSteps - 1)
                    Expanded(
                      child: Container(
                        height: 2,
                        margin: const EdgeInsets.symmetric(horizontal: 8),
                        decoration: BoxDecoration(
                          gradient: isCompleted
                              ? const LinearGradient(
                                  colors: [Color(0xFFFF6BB0), Color(0xFF7B2FE8)],
                                )
                              : null,
                          color: isCompleted ? null : Colors.white.withOpacity(0.1),
                          borderRadius: BorderRadius.circular(1),
                        ),
                      ),
                    ),
                ],
              ),
            );
          }),
        ),

        if (stepLabels != null) ...[
          const SizedBox(height: 8),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: stepLabels!.map((label) {
              return Text(
                label,
                style: TextStyle(
                  color: Colors.white.withOpacity(0.6),
                  fontSize: 12,
                ),
              );
            }).toList(),
          ),
        ],
      ],
    );
  }
}
