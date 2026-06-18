import 'dart:math';
import 'package:flutter/material.dart';
import '../theme/app_colors.dart';

// Fade + scale page transition
class FadeScaleRoute extends PageRouteBuilder {
  final Widget page;

  FadeScaleRoute({required this.page})
      : super(
          pageBuilder: (context, animation, secondaryAnimation) => page,
          transitionsBuilder: (context, animation, secondaryAnimation, child) {
            final fadeAnimation = Tween<double>(begin: 0, end: 1).animate(
              CurvedAnimation(parent: animation, curve: Curves.easeOut),
            );
            final scaleAnimation = Tween<double>(begin: 0.9, end: 1).animate(
              CurvedAnimation(parent: animation, curve: Curves.easeOut),
            );

            return FadeTransition(
              opacity: fadeAnimation,
              child: ScaleTransition(
                scale: scaleAnimation,
                child: child,
              ),
            );
          },
          transitionDuration: const Duration(milliseconds: 400),
        );
}

// Slide from right page transition
class SlideRightRoute extends PageRouteBuilder {
  final Widget page;

  SlideRightRoute({required this.page})
      : super(
          pageBuilder: (context, animation, secondaryAnimation) => page,
          transitionsBuilder: (context, animation, secondaryAnimation, child) {
            final slideAnimation = Tween<Offset>(
              begin: const Offset(1, 0),
              end: Offset.zero,
            ).animate(
              CurvedAnimation(parent: animation, curve: Curves.easeOutCubic),
            );

            return SlideTransition(
              position: slideAnimation,
              child: child,
            );
          },
          transitionDuration: const Duration(milliseconds: 300),
        );
}

// 3D flip page transition
class FlipRoute extends PageRouteBuilder {
  final Widget page;

  FlipRoute({required this.page})
      : super(
          pageBuilder: (context, animation, secondaryAnimation) => page,
          transitionsBuilder: (context, animation, secondaryAnimation, child) {
            final flipAnimation = Tween<double>(begin: pi, end: 0).animate(
              CurvedAnimation(parent: animation, curve: Curves.easeOut),
            );

            return AnimatedBuilder(
              animation: flipAnimation,
              builder: (context, child) {
                return Transform(
                  transform: Matrix4.identity()
                    ..setEntry(3, 2, 0.001)
                    ..rotateY(flipAnimation.value),
                  alignment: Alignment.center,
                  child: child,
                );
              },
              child: child,
            );
          },
          transitionDuration: const Duration(milliseconds: 500),
        );
}

// Shared element hero transition wrapper
class HeroWrapper extends StatelessWidget {
  final String tag;
  final Widget child;

  const HeroWrapper({
    super.key,
    required this.tag,
    required this.child,
  });

  @override
  Widget build(BuildContext context) {
    return Hero(
      tag: tag,
      flightShuttleBuilder: (context, animation, flightDirection, fromHero, toHero) {
        return AnimatedBuilder(
          animation: animation,
          builder: (context, child) {
            return Container(
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(
                  24 * (1 - animation.value),
                ),
                gradient: const LinearGradient(
                  colors: [Color(0xFFFF6BB0), AppColors.primary],
                ),
              ),
              child: toHero.widget,
            );
          },
        );
      },
      child: Material(
        type: MaterialType.transparency,
        child: child,
      ),
    );
  }
}

