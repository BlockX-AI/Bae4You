import 'package:flutter/material.dart';
import 'animated_gradient.dart';
import 'floating_hearts.dart';
import 'glow_button.dart';
import 'magnetic_button.dart';
import 'cursor_follower.dart';
import 'animated_icon.dart';
import 'confetti.dart';
import 'skeleton_loader.dart';
import 'tilt_card.dart';
import 'sparkle_effect.dart';

// Demo screen showing all premium effects
class PremiumEffectsDemo extends StatelessWidget {
  const PremiumEffectsDemo({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: AnimatedGradientBackground(
        child: SafeArea(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Premium UI Effects',
                  style: TextStyle(
                    fontSize: 32,
                    fontWeight: FontWeight.bold,
                    color: Colors.white,
                  ),
                ),
                const SizedBox(height: 32),

                // Glow Button
                _buildSection('Glow Button'),
                GlowButton(
                  text: 'Get Started',
                  onPressed: () {},
                ),
                const SizedBox(height: 32),

                // Magnetic Button
                _buildSection('Magnetic Button'),
                MagneticButton(
                  onPressed: () {},
                  child: Container(
                    padding: const EdgeInsets.all(20),
                    decoration: BoxDecoration(
                      gradient: const LinearGradient(
                        colors: [Color(0xFFFF6BB0), Color(0xFF7B2FE8)],
                      ),
                      borderRadius: BorderRadius.circular(16),
                    ),
                    child: const Text(
                      'Hover Me!',
                      style: TextStyle(color: Colors.white, fontSize: 16),
                    ),
                  ),
                ),
                const SizedBox(height: 32),

                // Tilt Card
                _buildSection('3D Tilt Card'),
                TiltCard(
                  onTap: () {},
                  child: Container(
                    padding: const EdgeInsets.all(40),
                    child: const Column(
                      children: [
                        Icon(
                          Icons.touch_app,
                          size: 48,
                          color: Colors.white,
                        ),
                        SizedBox(height: 16),
                        Text(
                          'Hover to tilt!',
                          style: TextStyle(color: Colors.white, fontSize: 18),
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 32),

                // Animated Icon
                _buildSection('Animated Icon Button'),
                AnimatedIconButton(
                  icon: Icons.favorite,
                  onPressed: () {},
                  tooltip: 'Like',
                  color: const Color(0xFFFF6BB0),
                  size: 32,
                ),
                const SizedBox(height: 32),

                // Floating Tooltip
                _buildSection('Floating Tooltip'),
                FloatingTooltip(
                  message: 'Premium Feature!',
                  icon: const Icon(Icons.star, color: Colors.white, size: 16),
                  child: Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: Colors.white.withOpacity(0.1),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: const Icon(
                      Icons.touch_app,
                      color: Colors.white,
                      size: 32,
                    ),
                  ),
                ),
                const SizedBox(height: 32),

                // Pulsing Badge
                _buildSection('Pulsing Badge'),
                PulsingBadge(
                  count: 5,
                  child: Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: Colors.white.withOpacity(0.1),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: const Icon(
                      Icons.notifications,
                      color: Colors.white,
                      size: 32,
                    ),
                  ),
                ),
                const SizedBox(height: 32),

                // Sparkle Effect
                _buildSection('Sparkle Effect'),
                SparkleEffect(
                  child: Container(
                    padding: const EdgeInsets.all(24),
                    decoration: BoxDecoration(
                      gradient: const LinearGradient(
                        colors: [Color(0xFFFF6BB0), Color(0xFF7B2FE8)],
                      ),
                      borderRadius: BorderRadius.circular(16),
                    ),
                    child: const Text(
                      '✨ Sparkling!',
                      style: TextStyle(
                        color: Colors.white,
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                ),
                const SizedBox(height: 32),

                // Skeleton Loader
                _buildSection('Skeleton Loader'),
                const CardSkeleton(),
                const SizedBox(height: 32),

                // Confetti Button
                _buildSection('Confetti Celebration'),
                ElevatedButton(
                  onPressed: () {
                    showDialog(
                      context: context,
                      builder: (context) => const ConfettiCelebration(),
                    );
                  },
                  child: const Text('Trigger Confetti!'),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildSection(String title) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: Text(
        title,
        style: TextStyle(
          fontSize: 14,
          fontWeight: FontWeight.w600,
          color: Colors.white.withOpacity(0.7),
        ),
      ),
    );
  }
}
