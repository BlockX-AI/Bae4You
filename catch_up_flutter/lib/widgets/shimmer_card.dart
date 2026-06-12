import 'package:flutter/material.dart';
import 'package:shimmer/shimmer.dart';

class ShimmerCard extends StatefulWidget {
  final Widget child;
  final VoidCallback? onTap;

  const ShimmerCard({super.key, required this.child, this.onTap});

  @override
  State<ShimmerCard> createState() => _ShimmerCardState();
}

class _ShimmerCardState extends State<ShimmerCard> {
  bool _isHovered = false;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: widget.onTap,
      child: MouseRegion(
        onEnter: (_) => setState(() => _isHovered = true),
        onExit: (_) => setState(() => _isHovered = false),
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 200),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(24),
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
                color: const Color(0xFFFF6BB0).withOpacity(_isHovered ? 0.3 : 0.1),
                blurRadius: _isHovered ? 40 : 20,
                spreadRadius: _isHovered ? 5 : 0,
              ),
            ],
          ),
          child: ClipRRect(
            borderRadius: BorderRadius.circular(24),
            child: _isHovered
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
    );
  }
}
