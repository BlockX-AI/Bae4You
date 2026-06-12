import 'package:flutter/material.dart';

class TiltCard extends StatefulWidget {
  final Widget child;
  final VoidCallback? onTap;

  const TiltCard({super.key, required this.child, this.onTap});

  @override
  State<TiltCard> createState() => _TiltCardState();
}

class _TiltCardState extends State<TiltCard> {
  double _rotateX = 0;
  double _rotateY = 0;
  bool _isHovered = false;

  void _onHover(PointerEvent event, Size size) {
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
              transform: Matrix4.identity()
                ..setEntry(3, 2, 0.001)
                ..rotateX(_rotateX)
                ..rotateY(_rotateY),
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
                borderRadius: BorderRadius.circular(24),
                child: widget.child,
              ),
            ),
          ),
        );
      },
    );
  }
}
