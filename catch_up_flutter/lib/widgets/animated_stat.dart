import 'dart:math';
import 'package:flutter/material.dart';

class AnimatedStat extends StatefulWidget {
  final int value;
  final String label;
  final String? suffix;
  final IconData? icon;
  final Color? color;

  const AnimatedStat({
    super.key,
    required this.value,
    required this.label,
    this.suffix,
    this.icon,
    this.color,
  });

  @override
  State<AnimatedStat> createState() => _AnimatedStatState();
}

class _AnimatedStatState extends State<AnimatedStat>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _animation;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1500),
    );
    _animation = Tween<double>(begin: 0, end: widget.value.toDouble()).animate(
      CurvedAnimation(parent: _controller, curve: Curves.easeOutCubic),
    );
    _controller.forward();
  }

  @override
  void didUpdateWidget(AnimatedStat oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.value != widget.value) {
      _animation = Tween<double>(
        begin: oldWidget.value.toDouble(),
        end: widget.value.toDouble(),
      ).animate(
        CurvedAnimation(parent: _controller, curve: Curves.easeOutCubic),
      );
      _controller.forward(from: 0);
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  String _formatValue(double value) {
    if (value >= 1000000) {
      return '${(value / 1000000).toStringAsFixed(1)}M';
    } else if (value >= 1000) {
      return '${(value / 1000).toStringAsFixed(1)}K';
    }
    return value.toStringAsFixed(0);
  }

  @override
  Widget build(BuildContext context) {
    final displayColor = widget.color ?? const Color(0xFFFF6BB0);

    return AnimatedBuilder(
      animation: _animation,
      builder: (context, child) {
        return Container(
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
          decoration: BoxDecoration(
            color: displayColor.withOpacity(0.1),
            borderRadius: BorderRadius.circular(16),
            border: Border.all(
              color: displayColor.withOpacity(0.3),
              width: 1,
            ),
          ),
          child: Column(
            children: [
              if (widget.icon != null)
                Icon(
                  widget.icon,
                  color: displayColor,
                  size: 24,
                ),
              if (widget.icon != null) const SizedBox(height: 8),
              Text(
                '${_formatValue(_animation.value)}${widget.suffix ?? ''}',
                style: TextStyle(
                  color: displayColor,
                  fontSize: 28,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 4),
              Text(
                widget.label,
                style: TextStyle(
                  color: Colors.white.withOpacity(0.7),
                  fontSize: 12,
                ),
              ),
            ],
          ),
        );
      },
    );
  }
}

class StatsRow extends StatelessWidget {
  final List<StatData> stats;

  const StatsRow({super.key, required this.stats});

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceEvenly,
      children: stats.map((stat) {
        return Expanded(
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 8),
            child: AnimatedStat(
              value: stat.value,
              label: stat.label,
              suffix: stat.suffix,
              icon: stat.icon,
              color: stat.color,
            ),
          ),
        );
      }).toList(),
    );
  }
}

class StatData {
  final int value;
  final String label;
  final String? suffix;
  final IconData? icon;
  final Color? color;

  StatData({
    required this.value,
    required this.label,
    this.suffix,
    this.icon,
    this.color,
  });
}
