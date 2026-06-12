import 'package:flutter/material.dart';
import 'package:lottie/lottie.dart';

/// Pre-built Lottie animation widgets for premium UI effects

class MatchSuccessAnimation extends StatelessWidget {
  final VoidCallback? onComplete;

  const MatchSuccessAnimation({super.key, this.onComplete});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Container(
        width: 300,
        height: 300,
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(20),
          boxShadow: [
            BoxShadow(
              color: const Color(0xFFFF6BB0).withOpacity(0.3),
              blurRadius: 30,
              spreadRadius: 10,
            ),
          ],
        ),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            // Heart explosion animation using Flutter's built-in
            TweenAnimationBuilder<double>(
              tween: Tween(begin: 0, end: 1),
              duration: const Duration(milliseconds: 800),
              curve: Curves.elasticOut,
              builder: (context, value, child) {
                return Transform.scale(
                  scale: value,
                  child: Container(
                    width: 120,
                    height: 120,
                    decoration: const BoxDecoration(
                      gradient: LinearGradient(
                        colors: [Color(0xFFFF6BB0), Color(0xFF7B2FE8)],
                      ),
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(
                      Icons.favorite,
                      color: Colors.white,
                      size: 60,
                    ),
                  ),
                );
              },
            ),
            const SizedBox(height: 20),
            const Text(
              'It\'s a Match!',
              style: TextStyle(
                fontSize: 28,
                fontWeight: FontWeight.bold,
                color: Color(0xFF7B2FE8),
              ),
            ),
            const SizedBox(height: 8),
            Text(
              'Start chatting now',
              style: TextStyle(
                fontSize: 16,
                color: Colors.grey[600],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class LoadingLottie extends StatelessWidget {
  final double size;
  final Color? color;

  const LoadingLottie({
    super.key,
    this.size = 100,
    this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Container(
        width: size,
        height: size,
        decoration: BoxDecoration(
          gradient: const LinearGradient(
            colors: [Color(0xFFFF6BB0), Color(0xFF7B2FE8)],
          ),
          shape: BoxShape.circle,
          boxShadow: [
            BoxShadow(
              color: const Color(0xFFFF6BB0).withOpacity(0.4),
              blurRadius: 20,
              spreadRadius: 5,
            ),
          ],
        ),
        child: const Center(
          child: CircularProgressIndicator(
            color: Colors.white,
            strokeWidth: 3,
          ),
        ),
      ),
    );
  }
}

class HeartBurstAnimation extends StatefulWidget {
  final VoidCallback? onComplete;

  const HeartBurstAnimation({super.key, this.onComplete});

  @override
  State<HeartBurstAnimation> createState() => _HeartBurstAnimationState();
}

class _HeartBurstAnimationState extends State<HeartBurstAnimation>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1200),
    );

    _controller.forward().then((_) {
      widget.onComplete?.call();
    });
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _controller,
      builder: (context, child) {
        return Stack(
          alignment: Alignment.center,
          children: [
            // Burst circles
            ...List.generate(3, (index) {
              final delay = index * 0.2;
              final adjustedValue = (_controller.value - delay).clamp(0, 1);
              
              if (adjustedValue <= 0) return const SizedBox.shrink();
              
              return Transform.scale(
                scale: 1 + adjustedValue * 2,
                child: Opacity(
                  opacity: 1 - adjustedValue,
                  child: Container(
                    width: 100,
                    height: 100,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      border: Border.all(
                        color: const Color(0xFFFF6BB0).withOpacity(0.5),
                        width: 2,
                      ),
                    ),
                  ),
                ),
              );
            }),
            
            // Center heart
            Transform.scale(
              scale: Curves.elasticOut.transform(
                _controller.value < 0.3 ? _controller.value / 0.3 : 1,
              ),
              child: Container(
                width: 80,
                height: 80,
                decoration: const BoxDecoration(
                  gradient: LinearGradient(
                    colors: [Color(0xFFFF6BB0), Color(0xFF7B2FE8)],
                  ),
                  shape: BoxShape.circle,
                ),
                child: const Icon(
                  Icons.favorite,
                  color: Colors.white,
                  size: 40,
                ),
              ),
            ),
          ],
        );
      },
    );
  }
}

class SwipeIndicator extends StatelessWidget {
  final bool isLike;

  const SwipeIndicator({super.key, required this.isLike});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
      decoration: BoxDecoration(
        border: Border.all(
          color: isLike ? const Color(0xFF00FF88) : const Color(0xFFFF1744),
          width: 3,
        ),
        borderRadius: BorderRadius.circular(12),
        color: (isLike ? const Color(0xFF00FF88) : const Color(0xFFFF1744))
            .withOpacity(0.2),
      ),
      child: Text(
        isLike ? 'LIKE' : 'NOPE',
        style: TextStyle(
          fontSize: 32,
          fontWeight: FontWeight.bold,
          color: isLike ? const Color(0xFF00FF88) : const Color(0xFFFF1744),
          letterSpacing: 2,
        ),
      ),
    );
  }
}

class ConfettiCelebration extends StatelessWidget {
  final Widget child;

  const ConfettiCelebration({super.key, required this.child});

  @override
  Widget build(BuildContext context) {
    return Stack(
      alignment: Alignment.center,
      children: [
        child,
        // Confetti particles
        ...List.generate(20, (index) {
          return _ConfettiParticle(
            delay: Duration(milliseconds: index * 50),
            color: [
              const Color(0xFFFF6BB0),
              const Color(0xFF7B2FE8),
              const Color(0xFFFFD700),
              const Color(0xFF00FF88),
            ][index % 4],
          );
        }),
      ],
    );
  }
}

class _ConfettiParticle extends StatefulWidget {
  final Duration delay;
  final Color color;

  const _ConfettiParticle({required this.delay, required this.color});

  @override
  State<_ConfettiParticle> createState() => _ConfettiParticleState();
}

class _ConfettiParticleState extends State<_ConfettiParticle>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _xAnimation;
  late Animation<double> _yAnimation;
  late Animation<double> _rotationAnimation;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1500),
    );

    // Random trajectories
    final random = DateTime.now().millisecondsSinceEpoch;
    final xDirection = (random % 2 == 0) ? 1.0 : -1.0;
    final distance = 100.0 + (random % 100);

    _xAnimation = Tween<double>(begin: 0, end: xDirection * distance).animate(
      CurvedAnimation(
        parent: _controller,
        curve: Curves.easeOut,
      ),
    );

    _yAnimation = Tween<double>(begin: 0, end: -200).animate(
      CurvedAnimation(
        parent: _controller,
        curve: Curves.easeOut,
      ),
    );

    _rotationAnimation = Tween<double>(begin: 0, end: random % 4 * 3.14).animate(
      CurvedAnimation(
        parent: _controller,
        curve: Curves.easeOut,
      ),
    );

    Future.delayed(widget.delay, () {
      if (mounted) {
        _controller.forward();
      }
    });
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _controller,
      builder: (context, child) {
        return Transform.translate(
          offset: Offset(_xAnimation.value, _yAnimation.value),
          child: Transform.rotate(
            angle: _rotationAnimation.value,
            child: Opacity(
              opacity: 1 - _controller.value,
              child: Container(
                width: 8,
                height: 8,
                decoration: BoxDecoration(
                  color: widget.color,
                  shape: BoxShape.circle,
                ),
              ),
            ),
          ),
        );
      },
    );
  }
}
