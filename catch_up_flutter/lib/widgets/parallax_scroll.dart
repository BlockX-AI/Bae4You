import 'package:flutter/material.dart';
import '../theme/app_colors.dart';

class ParallaxScrollView extends StatefulWidget {
  final List<Widget> children;
  final List<double> parallaxFactors;

  const ParallaxScrollView({
    super.key,
    required this.children,
    required this.parallaxFactors,
  });

  @override
  State<ParallaxScrollView> createState() => _ParallaxScrollViewState();
}

class _ParallaxScrollViewState extends State<ParallaxScrollView> {
  final ScrollController _scrollController = ScrollController();
  double _scrollOffset = 0;

  @override
  void initState() {
    super.initState();
    _scrollController.addListener(() {
      setState(() {
        _scrollOffset = _scrollController.offset;
      });
    });
  }

  @override
  void dispose() {
    _scrollController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return CustomScrollView(
      controller: _scrollController,
      slivers: widget.children.asMap().entries.map((entry) {
        final index = entry.key;
        final child = entry.value;
        final factor = widget.parallaxFactors[index];

        return SliverToBoxAdapter(
          child: Transform.translate(
            offset: Offset(0, _scrollOffset * factor * 0.1),
            child: child,
          ),
        );
      }).toList(),
    );
  }
}

// Parallax image that moves slower than scroll
class ParallaxImage extends StatelessWidget {
  final String imageUrl;
  final double height;
  final double parallaxFactor;

  const ParallaxImage({
    super.key,
    required this.imageUrl,
    this.height = 300,
    this.parallaxFactor = 0.5,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      height: height,
      child: OverflowBox(
        maxHeight: height * (1 + parallaxFactor),
        child: Image.network(
          imageUrl,
          fit: BoxFit.cover,
        ),
      ),
    );
  }
}

// Sticky header with blur effect
class BlurStickyHeader extends StatelessWidget {
  final Widget child;
  final double blurAmount;

  const BlurStickyHeader({
    super.key,
    required this.child,
    this.blurAmount = 10,
  });

  @override
  Widget build(BuildContext context) {
    return SliverAppBar(
      floating: true,
      pinned: true,
      expandedHeight: 120,
      flexibleSpace: FlexibleSpaceBar(
        background: Container(
          decoration: BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.topCenter,
              end: Alignment.bottomCenter,
              colors: [
                AppColors.textPrimary.withOpacity(0.95),
                AppColors.textPrimary.withOpacity(0.8),
              ],
            ),
          ),
          child: child,
        ),
      ),
      backgroundColor: Colors.transparent,
      elevation: 0,
    );
  }
}
