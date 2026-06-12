import 'package:flutter/material.dart';
import 'dart:ui';

class GlassSearchBar extends StatefulWidget {
  final String hint;
  final Function(String) onChanged;
  final VoidCallback? onClear;

  const GlassSearchBar({
    super.key,
    this.hint = 'Search...',
    required this.onChanged,
    this.onClear,
  });

  @override
  State<GlassSearchBar> createState() => _GlassSearchBarState();
}

class _GlassSearchBarState extends State<GlassSearchBar> {
  final TextEditingController _controller = TextEditingController();
  bool _isFocused = false;

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return ClipRRect(
      borderRadius: BorderRadius.circular(16),
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 20, sigmaY: 20),
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 200),
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          decoration: BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: _isFocused
                  ? [
                      Colors.white.withOpacity(0.2),
                      Colors.white.withOpacity(0.1),
                    ]
                  : [
                      Colors.white.withOpacity(0.1),
                      Colors.white.withOpacity(0.05),
                    ],
            ),
            borderRadius: BorderRadius.circular(16),
            border: Border.all(
              color: _isFocused
                  ? const Color(0xFFFF6BB0).withOpacity(0.5)
                  : Colors.white.withOpacity(0.2),
              width: 1.5,
            ),
            boxShadow: _isFocused
                ? [
                    BoxShadow(
                      color: const Color(0xFFFF6BB0).withOpacity(0.3),
                      blurRadius: 20,
                      spreadRadius: 2,
                    ),
                  ]
                : [],
          ),
          child: Row(
            children: [
              Icon(
                Icons.search,
                color: _isFocused
                    ? const Color(0xFFFF6BB0)
                    : Colors.white.withOpacity(0.5),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Focus(
                  onFocusChange: (focused) {
                    setState(() => _isFocused = focused);
                  },
                  child: TextField(
                    controller: _controller,
                    onChanged: widget.onChanged,
                    style: const TextStyle(color: Colors.white),
                    decoration: InputDecoration(
                      hintText: widget.hint,
                      hintStyle: TextStyle(
                        color: Colors.white.withOpacity(0.5),
                      ),
                      border: InputBorder.none,
                      isDense: true,
                      contentPadding: EdgeInsets.zero,
                    ),
                  ),
                ),
              ),
              if (_controller.text.isNotEmpty)
                GestureDetector(
                  onTap: () {
                    _controller.clear();
                    widget.onClear?.call();
                    setState(() {});
                  },
                  child: Icon(
                    Icons.close,
                    color: Colors.white.withOpacity(0.5),
                    size: 20,
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }
}
