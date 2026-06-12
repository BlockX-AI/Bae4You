import 'package:flutter/material.dart';
import 'dart:math';

class CustomPullToRefresh extends StatefulWidget {
  final Widget child;
  final Future<void> Function() onRefresh;
  final Color refreshIndicatorColor;

  const CustomPullToRefresh({
    super.key,
    required this.child,
    required this.onRefresh,
    this.refreshIndicatorColor = const Color(0xFFFF6BB0),
  });

  @override
  State<CustomPullToRefresh> createState() => _CustomPullToRefreshState();
}

class _CustomPullToRefreshState extends State<CustomPullToRefresh>
    with TickerProviderStateMixin {
  late AnimationController _spinnerController;

  @override
  void initState() {
    super.initState();
    _spinnerController = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 1),
    );
  }

  @override
  void dispose() {
    _spinnerController.dispose();
    super.dispose();
  }

  Future<void> _handleRefresh() async {
    _spinnerController.repeat();
    await widget.onRefresh();
    _spinnerController.stop();
  }

  @override
  Widget build(BuildContext context) {
    return RefreshIndicator(
      onRefresh: _handleRefresh,
      color: widget.refreshIndicatorColor,
      backgroundColor: Colors.white.withOpacity(0.2),
      strokeWidth: 3,
      displacement: 80,
      child: widget.child,
    );
  }
}

// Animated pull-to-refresh header
class PullToRefreshHeader extends StatefulWidget {
  final double dragOffset;
  final bool isRefreshing;

  const PullToRefreshHeader({
    super.key,
    required this.dragOffset,
    required this.isRefreshing,
  });

  @override
  State<PullToRefreshHeader> createState() => _PullToRefreshHeaderState();
}

class _PullToRefreshHeaderState extends State<PullToRefreshHeader>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 800),
    );
  }

  @override
  void didUpdateWidget(covariant PullToRefreshHeader oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.isRefreshing && !_controller.isAnimating) {
      _controller.repeat();
    } else if (!widget.isRefreshing) {
      _controller.stop();
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final progress = (widget.dragOffset / 100).clamp(0.0, 1.0);
    
    return Container(
      height: widget.dragOffset,
      alignment: Alignment.center,
      child: AnimatedBuilder(
        animation: _controller,
        builder: (context, child) {
          final rotation = widget.isRefreshing
              ? _controller.value * 2 * pi
              : progress * pi;
          
          return Transform.rotate(
            angle: rotation,
            child: Opacity(
              opacity: progress,
              child: Container(
                width: 40,
                height: 40,
                decoration: BoxDecoration(
                  gradient: const LinearGradient(
                    colors: [Color(0xFFFF6BB0), Color(0xFF7B2FE8)],
                  ),
                  borderRadius: BorderRadius.circular(20),
                  boxShadow: [
                    BoxShadow(
                      color: const Color(0xFFFF6BB0).withOpacity(0.5),
                      blurRadius: 20,
                      spreadRadius: 2,
                    ),
                  ],
                ),
                child: const Icon(
                  Icons.refresh,
                  color: Colors.white,
                ),
              ),
            ),
          );
        },
      ),
    );
  }
}
