import 'dart:math';
import 'package:flutter/material.dart';
import 'package:shimmer/shimmer.dart';

class GlassCard3D extends StatefulWidget {
  final Widget child;
  final double borderRadius;
  final EdgeInsets padding;
  final EdgeInsets margin;
  final VoidCallback? onTap;
  final bool enableShimmer;
  final bool enableHover;

  const GlassCard3D({
    super.key,
    required this.child,
    this.borderRadius = 24,
    this.padding = const EdgeInsets.all(20),
    this.margin = EdgeInsets.zero,
    this.onTap,
    this.enableShimmer = false,
    this.enableHover = true,
  });

  @override
  State<GlassCard3D> createState() => _GlassCard3DState();
}

class _GlassCard3DState extends State<GlassCard3D>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  double _rotateX = 0;
  double _rotateY = 0;
  bool _isHovered = false;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 200),
    );
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  void _onHover(PointerEvent event, Size size) {
    if (!widget.enableHover) return;
    
    final x = event.localPosition.dx;
    final y = event.localPosition.dy;
    
    setState(() {
      _rotateY = (x / size.width - 0.5) * 0.2;
      _rotateX = (y / size.height - 0.5) * -0.2;
      _isHovered = true;
    });
  }

  void _onExit(PointerEvent event) {
    setState(() {
      _rotateX = 0;
      _rotateY = 0;
      _isHovered = false;
    });
  }

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        return MouseRegion(
          onHover: (event) => _onHover(event, constraints.biggest),
          onExit: _onExit,
          child: GestureDetector(
            onTap: widget.onTap,
            child: AnimatedContainer(
              duration: const Duration(milliseconds: 150),
              curve: Curves.easeOut,
              margin: widget.margin,
              transform: Matrix4.identity()
                ..setEntry(3, 2, 0.001)
                ..rotateX(_rotateX)
                ..rotateY(_rotateY),
              child: Container(
                padding: widget.padding,
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(widget.borderRadius),
                  gradient: LinearGradient(
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                    colors: [
                      Colors.white.withOpacity(_isHovered ? 0.25 : 0.15),
                      Colors.white.withOpacity(_isHovered ? 0.15 : 0.08),
                    ],
                  ),
                  border: Border.all(
                    color: Colors.white.withOpacity(_isHovered ? 0.4 : 0.25),
                    width: 1.5,
                  ),
                  boxShadow: [
                    BoxShadow(
                      color: const Color(0xFFFF6BB0).withOpacity(_isHovered ? 0.3 : 0.15),
                      blurRadius: _isHovered ? 40 : 20,
                      spreadRadius: _isHovered ? 5 : 0,
                    ),
                    BoxShadow(
                      color: Colors.black.withOpacity(0.2),
                      blurRadius: 20,
                      offset: const Offset(0, 10),
                    ),
                  ],
                ),
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(widget.borderRadius - 4),
                  child: widget.enableShimmer
                      ? Shimmer.fromColors(
                          baseColor: Colors.white.withOpacity(0.8),
                          highlightColor: Colors.white.withOpacity(1),
                          period: const Duration(seconds: 2),
                          child: widget.child,
                        )
                      : widget.child,
                ),
              ),
            ),
          ),
        );
      },
    );
  }
}

// 3D Swipe Card with premium effects
class SwipeCard3D extends StatefulWidget {
  final Widget child;
  final double width;
  final double height;
  final VoidCallback? onSwipeLeft;
  final VoidCallback? onSwipeRight;
  final bool showActionOverlay;

  const SwipeCard3D({
    super.key,
    required this.child,
    required this.width,
    required this.height,
    this.onSwipeLeft,
    this.onSwipeRight,
    this.showActionOverlay = true,
  });

  @override
  State<SwipeCard3D> createState() => _SwipeCard3DState();
}

class _SwipeCard3DState extends State<SwipeCard3D>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  Offset _position = Offset.zero;
  double _angle = 0;
  bool _isDragging = false;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 300),
    );
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  void _onPanStart(DragStartDetails details) {
    setState(() => _isDragging = true);
  }

  void _onPanUpdate(DragUpdateDetails details) {
    setState(() {
      _position += details.delta;
      _angle = _position.dx * 0.001;
    });
  }

  void _onPanEnd(DragEndDetails details) {
    setState(() => _isDragging = false);
    
    final velocity = details.velocity.pixelsPerSecond.dx;
    final threshold = widget.width * 0.25;
    
    if (_position.dx.abs() > threshold || velocity.abs() > 1000) {
      if (_position.dx > 0 || velocity > 1000) {
        _swipeRight();
      } else {
        _swipeLeft();
      }
    } else {
      _resetPosition();
    }
  }

  void _swipeLeft() {
    _animatePosition(Offset(-widget.width * 1.5, 0), -0.3);
    Future.delayed(const Duration(milliseconds: 300), () {
      widget.onSwipeLeft?.call();
      _resetPosition();
    });
  }

  void _swipeRight() {
    _animatePosition(Offset(widget.width * 1.5, 0), 0.3);
    Future.delayed(const Duration(milliseconds: 300), () {
      widget.onSwipeRight?.call();
      _resetPosition();
    });
  }

  void _resetPosition() {
    _animatePosition(Offset.zero, 0);
  }

  void _animatePosition(Offset target, double targetAngle) {
    final startPosition = _position;
    final startAngle = _angle;
    
    _controller.animateTo(1, duration: const Duration(milliseconds: 300)).then((_) {
      setState(() {
        _position = target;
        _angle = targetAngle;
      });
      _controller.value = 0;
    });
    
    _controller.addListener(() {
      if (!mounted) return;
      setState(() {
        _position = Offset.lerp(startPosition, target, _controller.value)!;
        _angle = startAngle + (targetAngle - startAngle) * _controller.value;
      });
    });
    
    _controller.forward(from: 0);
  }

  @override
  Widget build(BuildContext context) {
    final double progress = (_position.dx / (widget.width * 0.5)).clamp(-1.0, 1.0);
    
    return GestureDetector(
      onPanStart: _onPanStart,
      onPanUpdate: _onPanUpdate,
      onPanEnd: _onPanEnd,
      child: Stack(
        children: [
          // Card with 3D transform
          Transform(
            alignment: Alignment.center,
            transform: Matrix4.identity()
              ..setEntry(3, 2, 0.001)
              ..translate(_position.dx, _position.dy)
              ..rotateZ(_angle),
            child: Container(
              width: widget.width,
              height: widget.height,
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(24),
                gradient: LinearGradient(
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                  colors: [
                    Colors.white.withOpacity(0.2),
                    Colors.white.withOpacity(0.1),
                  ],
                ),
                border: Border.all(
                  color: Colors.white.withOpacity(0.3),
                  width: 2,
                ),
                boxShadow: [
                  BoxShadow(
                    color: progress > 0
                        ? const Color(0xFF00FF88).withOpacity(progress.abs() * 0.5)
                        : const Color(0xFFFF1744).withOpacity(progress.abs() * 0.5),
                    blurRadius: 30,
                    spreadRadius: 5,
                  ),
                  BoxShadow(
                    color: Colors.black.withOpacity(0.3),
                    blurRadius: 30,
                    offset: Offset(_position.dx * 0.1, 20),
                  ),
                ],
              ),
              child: ClipRRect(
                borderRadius: BorderRadius.circular(24),
                child: widget.child,
              ),
            ),
          ),
          
          // Action overlays
          if (widget.showActionOverlay && _isDragging)
            Positioned.fill(
              child: IgnorePointer(
                child: Stack(
                  children: [
                    // Like overlay
                    if (progress > 0)
                      Positioned(
                        top: 40,
                        left: 20,
                        child: Opacity(
                          opacity: progress.clamp(0, 1),
                          child: Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 20,
                              vertical: 10,
                            ),
                            decoration: BoxDecoration(
                              border: Border.all(
                                color: const Color(0xFF00FF88),
                                width: 4,
                              ),
                              borderRadius: BorderRadius.circular(12),
                              color: const Color(0xFF00FF88).withOpacity(0.2),
                            ),
                            child: const Text(
                              'LIKE',
                              style: TextStyle(
                                color: Color(0xFF00FF88),
                                fontSize: 32,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ),
                        ),
                      ),
                    
                    // Pass overlay
                    if (progress < 0)
                      Positioned(
                        top: 40,
                        right: 20,
                        child: Opacity(
                          opacity: (-progress).clamp(0, 1),
                          child: Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 20,
                              vertical: 10,
                            ),
                            decoration: BoxDecoration(
                              border: Border.all(
                                color: const Color(0xFFFF1744),
                                width: 4,
                              ),
                              borderRadius: BorderRadius.circular(12),
                              color: const Color(0xFFFF1744).withOpacity(0.2),
                            ),
                            child: const Text(
                              'PASS',
                              style: TextStyle(
                                color: Color(0xFFFF1744),
                                fontSize: 32,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ),
                        ),
                      ),
                  ],
                ),
              ),
            ),
        ],
      ),
    );
  }
}

// Premium glowing button
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
            transform: Matrix4.identity()
              ..scale(_isPressed ? 0.95 : 1.0),
            child: Container(
              width: widget.width,
              padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 18),
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [
                    Color(0xFFFF6BB0),
                    Color(0xFF7B2FE8),
                  ],
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
                    color: const Color(0xFF7B2FE8).withOpacity(glowOpacity * 0.5),
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
