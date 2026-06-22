import 'package:flutter/material.dart';
import '../design/tokens.dart';
import 'dart:math';

class AnimatedSplashScreen extends StatefulWidget {
  final VoidCallback onComplete;

  const AnimatedSplashScreen({super.key, required this.onComplete});

  @override
  State<AnimatedSplashScreen> createState() => _AnimatedSplashScreenState();
}

class _AnimatedSplashScreenState extends State<AnimatedSplashScreen>
    with TickerProviderStateMixin {
  late AnimationController _logoController;
  late AnimationController _particleController;
  late Animation<double> _logoScale;
  late Animation<double> _logoRotate;
  late Animation<double> _fadeIn;

  @override
  void initState() {
    super.initState();
    
    _logoController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 2000),
    );
    
    _particleController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 3000),
    )..repeat();

    _logoScale = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(
        parent: _logoController,
        curve: Curves.elasticOut,
      ),
    );

    _logoRotate = Tween<double>(begin: -2 * pi, end: 0).animate(
      CurvedAnimation(
        parent: _logoController,
        curve: const Interval(0.0, 0.5, curve: Curves.easeOut),
      ),
    );

    _fadeIn = Tween<double>(begin: 0, end: 1).animate(
      CurvedAnimation(
        parent: _logoController,
        curve: const Interval(0.3, 0.8, curve: Curves.easeOut),
      ),
    );

    _logoController.forward().then((_) {
      Future.delayed(const Duration(milliseconds: 500), () {
        widget.onComplete();
      });
    });
  }

  @override
  void dispose() {
    _logoController.dispose();
    _particleController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Container(
        decoration: const BoxDecoration(
          gradient: RadialGradient(
            center: Alignment.center,
            radius: 1.5,
            colors: [
              AppTokens.accent,
              AppTokens.accent,
              AppTokens.textHi,
              AppTokens.bg,
            ],
            stops: [0.0, 0.3, 0.6, 1.0],
          ),
        ),
        child: Stack(
          children: [
            // Animated background particles
            AnimatedBuilder(
              animation: _particleController,
              builder: (context, child) {
                return CustomPaint(
                  size: Size.infinite,
                  painter: SplashParticlePainter(
                    progress: _particleController.value,
                  ),
                );
              },
            ),

            // Center content
            Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  // Animated logo
                  AnimatedBuilder(
                    animation: _logoController,
                    builder: (context, child) {
                      return Transform.scale(
                        scale: _logoScale.value,
                        child: Transform.rotate(
                          angle: _logoRotate.value,
                          child: Container(
                            width: 150,
                            height: 150,
                            decoration: BoxDecoration(
                              gradient: const LinearGradient(
                                colors: [AppTokens.accent, AppTokens.accent],
                                begin: Alignment.topLeft,
                                end: Alignment.bottomRight,
                              ),
                              borderRadius: BorderRadius.circular(30),
                              boxShadow: [
                                BoxShadow(
                                  color: AppTokens.accent.withOpacity(0.6),
                                  blurRadius: 60,
                                  spreadRadius: 20,
                                ),
                              ],
                            ),
                            child: const Icon(
                              Icons.favorite,
                              color: AppTokens.textHi,
                              size: 80,
                            ),
                          ),
                        ),
                      );
                    },
                  ),

                  const SizedBox(height: 40),

                  // App name with fade
                  FadeTransition(
                    opacity: _fadeIn,
                    child: Column(
                      children: [
                        const Text(
                          'Catch Up',
                          style: TextStyle(
                            color: AppTokens.textHi,
                            fontSize: 48,
                            fontWeight: FontWeight.bold,
                            letterSpacing: 2,
                          ),
                        ),
                        const SizedBox(height: 12),
                        Text(
                          'Find Your Match',
                          style: TextStyle(
                            color: AppTokens.textHi.withOpacity(0.8),
                            fontSize: 18,
                            letterSpacing: 4,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),

            // Bottom loading indicator
            Positioned(
              bottom: 60,
              left: 0,
              right: 0,
              child: FadeTransition(
                opacity: _fadeIn,
                child: Center(
                  child: Container(
                    width: 200,
                    height: 4,
                    decoration: BoxDecoration(
                      color: AppTokens.textHi.withOpacity(0.2),
                      borderRadius: BorderRadius.circular(2),
                    ),
                    child: AnimatedBuilder(
                      animation: _logoController,
                      builder: (context, child) {
                        return FractionallySizedBox(
                          alignment: Alignment.centerLeft,
                          widthFactor: _logoController.value,
                          child: Container(
                            decoration: BoxDecoration(
                              gradient: const LinearGradient(
                                colors: [AppTokens.accent, AppTokens.accent],
                              ),
                              borderRadius: BorderRadius.circular(2),
                              boxShadow: [
                                BoxShadow(
                                  color: AppTokens.accent.withOpacity(0.8),
                                  blurRadius: 10,
                                  spreadRadius: 2,
                                ),
                              ],
                            ),
                          ),
                        );
                      },
                    ),
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class SplashParticlePainter extends CustomPainter {
  final double progress;

  SplashParticlePainter({required this.progress});

  @override
  void paint(Canvas canvas, Size size) {
    final random = Random(42); // Fixed seed for consistency
    final paint = Paint()
      ..color = AppTokens.textHi.withOpacity(0.3)
      ..style = PaintingStyle.fill;

    for (int i = 0; i < 30; i++) {
      final x = random.nextDouble() * size.width;
      final y = random.nextDouble() * size.height;
      final radius = 2 + random.nextDouble() * 4;
      final phase = random.nextDouble() * 2 * pi;
      
      final animatedRadius = radius * (1 + 0.5 * sin(progress * 2 * pi + phase));
      final opacity = 0.3 + 0.2 * sin(progress * 2 * pi + phase);
      
      paint.color = AppTokens.textHi.withOpacity(opacity);
      canvas.drawCircle(Offset(x, y), animatedRadius, paint);
    }
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => true;
}
