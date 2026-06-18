import 'dart:math';
import 'package:flutter/material.dart';
import '../theme/app_colors.dart';

class GlowButton extends StatefulWidget {
  final String text;
  final VoidCallback onPressed;
  final IconData? icon;
  final double? width;

  const GlowButton({
    super.key,
    required this.text,
    required this.onPressed,
    this.icon,
    this.width,
  });

  @override
  State<GlowButton> createState() => _GlowButtonState();
}

class _GlowButtonState extends State<GlowButton>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  bool _isPressed = false;

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
    return GestureDetector(
      onTapDown: (_) => setState(() => _isPressed = true),
      onTapUp: (_) {
        setState(() => _isPressed = false);
        widget.onPressed();
      },
      onTapCancel: () => setState(() => _isPressed = false),
      child: AnimatedBuilder(
        animation: _controller,
        builder: (context, child) {
          final glowOpacity = 0.3 + 0.2 * sin(_controller.value * 2 * pi);
          
          return AnimatedContainer(
            duration: const Duration(milliseconds: 100),
            transform: Matrix4.identity()..scale(_isPressed ? 0.95 : 1.0),
            child: Container(
              width: widget.width,
              padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 18),
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [Color(0xFFFF6BB0), AppColors.primary],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                borderRadius: BorderRadius.circular(999),
                boxShadow: [
                  BoxShadow(
                    color: const Color(0xFFFF6BB0).withOpacity(glowOpacity),
                    blurRadius: 20,
                    spreadRadius: 2,
                  ),
                  BoxShadow(
                    color: AppColors.primary.withOpacity(glowOpacity * 0.5),
                    blurRadius: 40,
                    spreadRadius: 5,
                  ),
                ],
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  if (widget.icon != null) ...[
                    Icon(widget.icon, color: Colors.white),
                    const SizedBox(width: 8),
                  ],
                  Text(
                    widget.text,
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 16,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ],
              ),
            ),
          );
        },
      ),
    );
  }
}
