import 'dart:math';
import 'package:flutter/material.dart';
import '../theme/app_colors.dart';
import 'package:flutter/services.dart';

class MagneticButton extends StatefulWidget {
  final Widget child;
  final VoidCallback onPressed;
  final double magneticStrength;

  const MagneticButton({
    super.key,
    required this.child,
    required this.onPressed,
    this.magneticStrength = 0.3,
  });

  @override
  State<MagneticButton> createState() => _MagneticButtonState();
}

class _MagneticButtonState extends State<MagneticButton>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  Offset _position = Offset.zero;
  bool _isHovered = false;
  bool _isPressed = false;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 150),
    );
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  void _onHover(PointerEvent event, Size size) {
    final centerX = size.width / 2;
    final centerY = size.height / 2;
    final mouseX = event.localPosition.dx;
    final mouseY = event.localPosition.dy;

    setState(() {
      _position = Offset(
        (mouseX - centerX) * widget.magneticStrength,
        (mouseY - centerY) * widget.magneticStrength,
      );
      _isHovered = true;
    });
  }

  void _onExit(PointerEvent event) {
    setState(() {
      _position = Offset.zero;
      _isHovered = false;
    });
  }

  void _onTapDown(TapDownDetails details) {
    setState(() => _isPressed = true);
    HapticFeedback.lightImpact();
  }

  void _onTapUp(TapUpDetails details) {
    setState(() => _isPressed = false);
    widget.onPressed();
  }

  void _onTapCancel() {
    setState(() => _isPressed = false);
  }

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        return MouseRegion(
          onHover: (event) => _onHover(event, constraints.biggest),
          onExit: _onExit,
          child: GestureDetector(
            onTapDown: _onTapDown,
            onTapUp: _onTapUp,
            onTapCancel: _onTapCancel,
            child: AnimatedContainer(
              duration: const Duration(milliseconds: 150),
              curve: Curves.easeOut,
              transform: Matrix4.identity()
                ..translate(_position.dx, _position.dy)
                ..scale(_isPressed ? 0.95 : 1.0),
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(16),
                boxShadow: _isHovered
                    ? [
                        BoxShadow(
                          color: const Color(0xFFFF6BB0).withOpacity(0.4),
                          blurRadius: 30,
                          spreadRadius: 5,
                        ),
                      ]
                    : [],
              ),
              child: widget.child,
            ),
          ),
        );
      },
    );
  }
}

// Floating tooltip that appears on hover
class FloatingTooltip extends StatefulWidget {
  final Widget child;
  final String message;
  final Widget? icon;

  const FloatingTooltip({
    super.key,
    required this.child,
    required this.message,
    this.icon,
  });

  @override
  State<FloatingTooltip> createState() => _FloatingTooltipState();
}

class _FloatingTooltipState extends State<FloatingTooltip>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _opacityAnimation;
  late Animation<Offset> _slideAnimation;
  bool _isVisible = false;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 200),
    );
    
    _opacityAnimation = Tween<double>(begin: 0, end: 1).animate(
      CurvedAnimation(parent: _controller, curve: Curves.easeOut),
    );
    
    _slideAnimation = Tween<Offset>(
      begin: const Offset(0, 10),
      end: Offset.zero,
    ).animate(
      CurvedAnimation(parent: _controller, curve: Curves.easeOut),
    );
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  void _show() {
    if (!_isVisible) {
      setState(() => _isVisible = true);
      _controller.forward();
    }
  }

  void _hide() {
    if (_isVisible) {
      _controller.reverse().then((_) {
        if (mounted) setState(() => _isVisible = false);
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return MouseRegion(
      onEnter: (_) => _show(),
      onExit: (_) => _hide(),
      child: Stack(
        alignment: Alignment.center,
        clipBehavior: Clip.none,
        children: [
          widget.child,
          if (_isVisible)
            Positioned(
              top: -60,
              child: AnimatedBuilder(
                animation: _controller,
                builder: (context, child) {
                  return Opacity(
                    opacity: _opacityAnimation.value,
                    child: Transform.translate(
                      offset: _slideAnimation.value,
                      child: Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 16,
                          vertical: 10,
                        ),
                        decoration: BoxDecoration(
                          gradient: const LinearGradient(
                            colors: [Color(0xFFFF6BB0), AppColors.primary],
                          ),
                          borderRadius: BorderRadius.circular(12),
                          boxShadow: [
                            BoxShadow(
                              color: const Color(0xFFFF6BB0).withOpacity(0.4),
                              blurRadius: 20,
                              spreadRadius: 2,
                            ),
                          ],
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            if (widget.icon != null) ...[
                              widget.icon!,
                              const SizedBox(width: 8),
                            ],
                            Text(
                              widget.message,
                              style: const TextStyle(
                                color: Colors.white,
                                fontSize: 14,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  );
                },
              ),
            ),
        ],
      ),
    );
  }
}
