import 'dart:math';
import 'package:flutter/material.dart';

class CursorFollower extends StatefulWidget {
  final Widget child;

  const CursorFollower({super.key, required this.child});

  @override
  State<CursorFollower> createState() => _CursorFollowerState();
}

class _CursorFollowerState extends State<CursorFollower>
    with TickerProviderStateMixin {
  late AnimationController _controller;
  Offset _mousePosition = Offset.zero;
  Offset _followerPosition = Offset.zero;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 16),
    )..addListener(() {
        setState(() {
          _followerPosition = Offset.lerp(
            _followerPosition,
            _mousePosition,
            0.1,
          )!;
        });
      });
    _controller.repeat();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  void _onHover(PointerEvent event) {
    setState(() {
      _mousePosition = event.localPosition;
    });
  }

  @override
  Widget build(BuildContext context) {
    return MouseRegion(
      onHover: _onHover,
      child: Stack(
        children: [
          widget.child,
          // Cursor glow effect
          Positioned(
            left: _followerPosition.dx - 100,
            top: _followerPosition.dy - 100,
            child: IgnorePointer(
              child: Container(
                width: 200,
                height: 200,
                decoration: BoxDecoration(
                  gradient: RadialGradient(
                    colors: [
                      const Color(0xFFFF6BB0).withOpacity(0.15),
                      const Color(0xFFFF6BB0).withOpacity(0),
                    ],
                  ),
                  shape: BoxShape.circle,
                ),
              ),
            ),
          ),
          // Cursor dot
          Positioned(
            left: _followerPosition.dx - 4,
            top: _followerPosition.dy - 4,
            child: IgnorePointer(
              child: Container(
                width: 8,
                height: 8,
                decoration: BoxDecoration(
                  color: const Color(0xFFFF6BB0).withOpacity(0.8),
                  shape: BoxShape.circle,
                  boxShadow: [
                    BoxShadow(
                      color: const Color(0xFFFF6BB0).withOpacity(0.5),
                      blurRadius: 10,
                      spreadRadius: 2,
                    ),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
