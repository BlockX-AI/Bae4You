import 'package:flutter/material.dart';
import '../widgets/gradient_avatar.dart';
import '../widgets/gradient_chip.dart';
import '../widgets/animated_stat.dart';
import '../widgets/gradient_progress.dart';
import '../widgets/custom_loaders.dart';
import '../widgets/premium_card.dart';
import '../widgets/gradient_toggle.dart';
import '../widgets/list_item.dart';
import '../widgets/section_header.dart';
import '../widgets/glow_button.dart';
import '../widgets/magnetic_button.dart';
import '../widgets/tilt_card.dart';
import '../widgets/animated_icon.dart';
import '../widgets/confetti.dart';

class UIShowcaseScreen extends StatefulWidget {
  const UIShowcaseScreen({super.key});

  @override
  State<UIShowcaseScreen> createState() => _UIShowcaseScreenState();
}

class _UIShowcaseScreenState extends State<UIShowcaseScreen> {
  bool _toggleValue = true;
  int _currentStep = 2;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF1A0033),
      body: Container(
        decoration: const BoxDecoration(
          gradient: RadialGradient(
            center: Alignment.topCenter,
            radius: 1.2,
            colors: [
              Color(0xFFFF6BB0),
              Color(0xFF7B2FE8),
              Color(0xFF2E0B5C),
            ],
          ),
        ),
        child: SafeArea(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Header
                const Text(
                  '🎨 UI Showcase',
                  style: TextStyle(
                    fontSize: 32,
                    fontWeight: FontWeight.bold,
                    color: Colors.white,
                  ),
                ),
                const SizedBox(height: 32),

                // SECTION: Avatars
                const GradientSectionHeader(
                  title: 'Avatars',
                  icon: Icons.person,
                ),
                Wrap(
                  spacing: 16,
                  runSpacing: 16,
                  children: [
                    GradientAvatar(
                      initials: 'JD',
                      size: 60,
                      isOnline: true,
                      isVerified: true,
                    ),
                    GradientAvatar(
                      emoji: '😊',
                      size: 60,
                      isOnline: true,
                    ),
                    GradientAvatar(
                      initials: 'AL',
                      size: 60,
                    ),
                  ],
                ),
                const SizedBox(height: 32),

                // SECTION: Chips
                const GradientSectionHeader(
                  title: 'Chips',
                  icon: Icons.label,
                ),
                Wrap(
                  spacing: 12,
                  runSpacing: 12,
                  children: [
                    const GradientChip(
                      label: 'Dating',
                      icon: Icons.favorite,
                      isSelected: true,
                    ),
                    const GradientChip(
                      label: 'Gaming',
                      icon: Icons.games,
                    ),
                    const InterestChip(
                      label: 'Music',
                      emoji: '🎸',
                      isSelected: true,
                    ),
                    const InterestChip(
                      label: 'Travel',
                      emoji: '✈️',
                    ),
                  ],
                ),
                const SizedBox(height: 32),

                // SECTION: Stats
                const GradientSectionHeader(
                  title: 'Animated Stats',
                  icon: Icons.trending_up,
                ),
                StatsRow(
                  stats: [
                    StatData(value: 42, label: 'Matches', icon: Icons.favorite, color: const Color(0xFFFF6BB0)),
                    StatData(value: 2800, label: 'PCASH', suffix: '', icon: Icons.token, color: const Color(0xFFFFD700)),
                    StatData(value: 15, label: 'Pets', icon: Icons.pets, color: const Color(0xFF00FF88)),
                  ],
                ),
                const SizedBox(height: 32),

                // SECTION: Progress
                const GradientSectionHeader(
                  title: 'Progress Bars',
                  icon: Icons.linear_scale,
                ),
                const GradientProgressBar(
                  progress: 0.75,
                  height: 8,
                  showGlow: true,
                ),
                const SizedBox(height: 24),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                  children: [
                    const CircularProgress(
                      progress: 0.65,
                      size: 80,
                      label: '65%',
                    ),
                    const SizedBox(width: 20),
                    Expanded(
                      child: SteppedProgress(
                        currentStep: _currentStep,
                        totalSteps: 4,
                        stepLabels: const ['Step 1', 'Step 2', 'Step 3', 'Step 4'],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 32),

                // SECTION: Loaders
                const GradientSectionHeader(
                  title: 'Loaders',
                  icon: Icons.refresh,
                ),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                  children: const [
                    PulsingLoader(size: 50),
                    DotsLoader(),
                    HeartLoader(),
                  ],
                ),
                const SizedBox(height: 32),

                // SECTION: Cards
                const GradientSectionHeader(
                  title: 'Premium Cards',
                  icon: Icons.credit_card,
                ),
                PremiumCard(
                  onTap: () {},
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          GradientAvatar(
                            emoji: '🌟',
                            size: 50,
                            isOnline: true,
                          ),
                          const SizedBox(width: 16),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                const Text(
                                  'Premium Card',
                                  style: TextStyle(
                                    color: Colors.white,
                                    fontSize: 18,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                                Text(
                                  'Glassmorphism with blur',
                                  style: TextStyle(
                                    color: Colors.white.withOpacity(0.7),
                                    fontSize: 14,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 16),
                const MatchCard(
                  name: 'Sarah',
                  age: 24,
                  location: 'New York',
                  compatibility: 0.85,
                ),
                const SizedBox(height: 32),

                // SECTION: Buttons
                const GradientSectionHeader(
                  title: 'Interactive Buttons',
                  icon: Icons.touch_app,
                ),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                  children: [
                    GlowButton(
                      text: 'Glow',
                      onPressed: () {},
                    ),
                    MagneticButton(
                      onPressed: () {},
                      child: Container(
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          gradient: const LinearGradient(
                            colors: [Color(0xFFFF6BB0), Color(0xFF7B2FE8)],
                          ),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: const Text(
                          'Magnetic',
                          style: TextStyle(color: Colors.white),
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 24),
                Center(
                  child: TiltCard(
                    onTap: () {},
                    child: Container(
                      padding: const EdgeInsets.all(30),
                      child: const Column(
                        children: [
                          Icon(Icons.touch_app, color: Colors.white, size: 32),
                          SizedBox(height: 8),
                          Text(
                            '3D Tilt Card',
                            style: TextStyle(color: Colors.white, fontSize: 16),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
                const SizedBox(height: 32),

                // SECTION: Toggles
                const GradientSectionHeader(
                  title: 'Controls',
                  icon: Icons.toggle_on,
                ),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text(
                      'Gradient Toggle',
                      style: TextStyle(color: Colors.white, fontSize: 16),
                    ),
                    GradientToggle(
                      value: _toggleValue,
                      onChanged: (value) => setState(() => _toggleValue = value),
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                Row(
                  children: [
                    ActionButton(
                      icon: Icons.edit,
                      label: 'Edit',
                      onPressed: () {},
                    ),
                    const SizedBox(width: 12),
                    ActionButton(
                      icon: Icons.save,
                      label: 'Save',
                      onPressed: () {},
                      isPrimary: true,
                    ),
                  ],
                ),
                const SizedBox(height: 32),

                // SECTION: List Items
                const GradientSectionHeader(
                  title: 'List Items',
                  icon: Icons.list,
                ),
                PremiumCard(
                  child: Column(
                    children: [
                      PremiumListItem(
                        title: 'Profile Settings',
                        subtitle: 'Manage your account',
                        leadingIcon: Icons.person,
                        onTap: () {},
                      ),
                      PremiumListItem(
                        title: 'Notifications',
                        subtitle: '5 new messages',
                        leadingIcon: Icons.notifications,
                        onTap: () {},
                      ),
                      PremiumListItem(
                        title: 'Privacy',
                        subtitle: 'Control your visibility',
                        leadingIcon: Icons.lock,
                        onTap: () {},
                        showDivider: false,
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 32),

                // SECTION: Confetti
                const GradientSectionHeader(
                  title: 'Celebration Effects',
                  icon: Icons.celebration,
                ),
                Center(
                  child: ElevatedButton(
                    onPressed: () {
                      showDialog(
                        context: context,
                        builder: (context) => Stack(
                          children: [
                            const ConfettiCelebration(),
                            Center(
                              child: Container(
                                padding: const EdgeInsets.all(24),
                                decoration: BoxDecoration(
                                  color: const Color(0xFF2E0B5C),
                                  borderRadius: BorderRadius.circular(16),
                                ),
                                child: Column(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    const Icon(
                                      Icons.celebration,
                                      color: Color(0xFFFF6BB0),
                                      size: 48,
                                    ),
                                    const SizedBox(height: 16),
                                    const Text(
                                      'It\'s a Match! 🎉',
                                      style: TextStyle(
                                        color: Colors.white,
                                        fontSize: 24,
                                        fontWeight: FontWeight.bold,
                                      ),
                                    ),
                                    const SizedBox(height: 16),
                                    ElevatedButton(
                                      onPressed: () => Navigator.pop(context),
                                      child: const Text('Awesome!'),
                                    ),
                                  ],
                                ),
                              ),
                            ),
                          ],
                        ),
                      );
                    },
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFFFF6BB0),
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(
                        horizontal: 32,
                        vertical: 16,
                      ),
                    ),
                    child: const Text('🎊 Trigger Match Celebration'),
                  ),
                ),
                const SizedBox(height: 32),

                // SECTION: Icons
                const GradientSectionHeader(
                  title: 'Animated Icons',
                  icon: Icons.animation,
                ),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                  children: [
                    AnimatedIconButton(
                      icon: Icons.favorite,
                      onPressed: () {},
                      tooltip: 'Like',
                      color: const Color(0xFFFF6BB0),
                      size: 32,
                    ),
                    AnimatedIconButton(
                      icon: Icons.star,
                      onPressed: () {},
                      tooltip: 'Favorite',
                      color: const Color(0xFFFFD700),
                      size: 32,
                    ),
                    AnimatedIconButton(
                      icon: Icons.bookmark,
                      onPressed: () {},
                      tooltip: 'Save',
                      color: const Color(0xFF7B2FE8),
                      size: 32,
                    ),
                  ],
                ),
                const SizedBox(height: 50),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
