import 'package:flutter/material.dart';
import 'dart:math';

class SwipeCard3D extends StatefulWidget {
  final Widget child;
  final double width;
  final double height;
  final VoidCallback? onSwipeLeft;
  final VoidCallback? onSwipeRight;

  const SwipeCard3D({
    super.key,
    required this.child,
    required this.width,
    required this.height,
    this.onSwipeLeft,
    this.onSwipeRight,
  });

  @override
  State<SwipeCard3D> createState() => _SwipeCard3DState();
}

class _SwipeCard3DState extends State<SwipeCard3D>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  Offset _position = Offset.zero;
  double _angle = 0;

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

  void _onPanUpdate(DragUpdateDetails details) {
    setState(() {
      _position += details.delta;
      _angle = _position.dx * 0.001;
    });
  }

  void _onPanEnd(DragEndDetails details) {
    final threshold = widget.width * 0.25;
    
    if (_position.dx.abs() > threshold) {
      if (_position.dx > 0) {
        _swipeRight();
      } else {
        _swipeLeft();
      }
    } else {
      _resetPosition();
    }
  }

  void _swipeLeft() {
    _animateOut(Offset(-widget.width * 1.5, 0), -0.3);
    Future.delayed(const Duration(milliseconds: 300), () {
      widget.onSwipeLeft?.call();
    });
  }

  void _swipeRight() {
    _animateOut(Offset(widget.width * 1.5, 0), 0.3);
    Future.delayed(const Duration(milliseconds: 300), () {
      widget.onSwipeRight?.call();
    });
  }

  void _animateOut(Offset target, double angle) {
    final startPos = _position;
    final startAngle = _angle;
    
    _controller.addListener(() {
      setState(() {
        _position = Offset.lerp(startPos, target, _controller.value)!;
        _angle = startAngle + (angle - startAngle) * _controller.value;
      });
    });
    
    _controller.forward(from: 0).then((_) {
      setState(() {
        _position = Offset.zero;
        _angle = 0;
      });
    });
  }

  void _resetPosition() {
    final startPos = _position;
    final startAngle = _angle;
    
    _controller.addListener(() {
      setState(() {
        _position = Offset.lerp(startPos, Offset.zero, _controller.value)!;
        _angle = startAngle * (1 - _controller.value);
      });
    });
    
    _controller.forward(from: 0).then((_) {
      _controller.removeListener(() {});
    });
  }

  @override
  Widget build(BuildContext context) {
    final progress = (_position.dx / (widget.width * 0.5)).clamp(-1.0, 1.0);
    final isRight = progress > 0;
    
    return GestureDetector(
      onPanUpdate: _onPanUpdate,
      onPanEnd: _onPanEnd,
      child: Stack(
        children: [
          // 3D Card
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
                    color: isRight
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
          
          // Action overlay
          if (_position.dx.abs() > 10)
            Positioned(
              top: 40,
              left: isRight ? 20 : null,
              right: isRight ? null : 20,
              child: Opacity(
                opacity: progress.abs().clamp(0, 1),
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
                  decoration: BoxDecoration(
                    border: Border.all(
                      color: isRight ? const Color(0xFF00FF88) : const Color(0xFFFF1744),
                      width: 4,
                    ),
                    borderRadius: BorderRadius.circular(12),
                    color: isRight 
                        ? const Color(0xFF00FF88).withOpacity(0.2)
                        : const Color(0xFFFF1744).withOpacity(0.2),
                  ),
                  child: Text(
                    isRight ? 'LIKE' : 'PASS',
                    style: TextStyle(
                      color: isRight ? const Color(0xFF00FF88) : const Color(0xFFFF1744),
                      fontSize: 32,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }
}
