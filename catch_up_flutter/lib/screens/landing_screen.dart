import 'dart:math' as math;
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../widgets/animated_background.dart';
import '../widgets/glass_card.dart';
import '../widgets/swipe_card_stack.dart';
import '../widgets/wallet_modal.dart';
import '../widgets/glow_button.dart';
import '../widgets/floating_hearts.dart';
import '../widgets/animated_gradient.dart';

class LandingScreen extends StatefulWidget {
  const LandingScreen({super.key});

  @override
  State<LandingScreen> createState() => _LandingScreenState();
}

class _LandingScreenState extends State<LandingScreen>
    with TickerProviderStateMixin {
  late final AnimationController _animationController;
  late final ScrollController _scrollController;
  bool _showNavBackground = false;
  
  // Global keys for scrolling to sections
  final GlobalKey _featuresKey = GlobalKey();
  final GlobalKey _howItWorksKey = GlobalKey();

  // Brand colors from CSS
  static const brandPurple = Color(0xFF7B2FE8);
  static const brandPurpleDeep = Color(0xFF5B1FB8);
  static const brandPink = Color(0xFFE94B9C);
  static const brandPinkHot = Color(0xFFFF3D8A);
  static const brandCream = Color(0xFFFFF8F0);
  static const ink = Color(0xFF1A0B2E);

  @override
  void initState() {
    super.initState();
    _animationController = AnimationController(vsync: this);
    _scrollController = ScrollController();
  }

  @override
  void dispose() {
    _animationController.dispose();
    _scrollController.dispose();
    super.dispose();
  }
  
  void _scrollToSection(GlobalKey key) {
    final context = key.currentContext;
    if (context != null) {
      Scrollable.ensureVisible(
        context,
        duration: const Duration(milliseconds: 800),
        curve: Curves.easeInOutCubic,
      );
    }
  }

  void _onScroll(ScrollNotification notification) {
    final showBg = notification.metrics.pixels > 50;
    if (showBg != _showNavBackground) {
      setState(() => _showNavBackground = showBg);
    }
  }

  void _openWalletModal() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => const WalletModal(),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: ink,
      body: NotificationListener<ScrollNotification>(
        onNotification: (notification) {
          _onScroll(notification);
          return false;
        },
        child: Stack(
          children: [
            // Animated flowing gradient background
            const AnimatedGradientBackground(child: SizedBox.expand()),

            // Floating hearts effect
            const FloatingHearts(),

            // Main scrollable content
            CustomScrollView(
              controller: _scrollController,
              slivers: [
                // Hero Section
                SliverToBoxAdapter(
                  child: _buildHeroSection(),
                ),

                // Features Section
                SliverToBoxAdapter(
                  key: _featuresKey,
                  child: _buildFeaturesSection(),
                ),

                // How It Works Section
                SliverToBoxAdapter(
                  key: _howItWorksKey,
                  child: _buildHowItWorksSection(),
                ),

                // CTA Section
                SliverToBoxAdapter(
                  child: _buildCTASection(),
                ),

                // Footer
                SliverToBoxAdapter(
                  child: _buildFooter(),
                ),
              ],
            ),

            // Fixed Navigation
            _buildNavigation(),
          ],
        ),
      ),
    );
  }

  Widget _buildNavigation() {
    return AnimatedContainer(
      duration: const Duration(milliseconds: 300),
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
      decoration: BoxDecoration(
        color: _showNavBackground
            ? const Color(0xFF140632).withOpacity(0.6)
            : Colors.transparent,
        border: Border(
          bottom: BorderSide(
            color: _showNavBackground
                ? Colors.white.withOpacity(0.18)
                : Colors.transparent,
          ),
        ),
      ),
      child: SafeArea(
        bottom: false,
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            // Logo
            Row(
              children: [
                Container(
                  width: 36,
                  height: 36,
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: const Center(
                    child: Text(
                      '🐾',
                      style: TextStyle(fontSize: 22),
                    ),
                  ),
                ),
                const SizedBox(width: 10),
                Text(
                  'Catch Up',
                  style: GoogleFonts.fredoka(
                    fontSize: 24,
                    fontWeight: FontWeight.w700,
                    color: Colors.white,
                    letterSpacing: -0.02,
                  ),
                ),
              ],
            ),

            // Nav Links (Desktop only - hidden on mobile)
            if (MediaQuery.of(context).size.width > 600)
              Row(
                children: [
                  _buildNavLink('Features', () => _scrollToSection(_featuresKey)),
                  _buildNavLink('How it Works', () => _scrollToSection(_howItWorksKey)),
                  _buildNavLink('Fantasy Bae', () {}),
                  const SizedBox(width: 16),
                ],
              ),

            // CTA Button with glow effect
            GlowButton(
              text: 'Get Started',
              onPressed: _openWalletModal,
            ),
            const SizedBox(width: 12),
            // Demo Button
            TextButton(
              onPressed: () => Navigator.pushNamed(context, '/splash'),
              style: TextButton.styleFrom(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                side: BorderSide(color: const Color(0xFFFF6BB0).withOpacity(0.5)),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(20),
                ),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Icon(Icons.auto_awesome, color: Color(0xFFFF6BB0), size: 18),
                  const SizedBox(width: 6),
                  Text(
                    'UI Demo',
                    style: TextStyle(
                      color: const Color(0xFFFF6BB0),
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildNavLink(String text, VoidCallback onPressed) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: TextButton(
        onPressed: onPressed,
        child: Text(
          text,
          style: GoogleFonts.inter(
            fontSize: 15,
            fontWeight: FontWeight.w500,
            color: Colors.white.withOpacity(0.85),
          ),
        ),
      ),
    );
  }

  Widget _buildHeroSection() {
    final isMobile = MediaQuery.of(context).size.width < 900;

    return Container(
      height: MediaQuery.of(context).size.height,
      padding: EdgeInsets.only(
        top: 100,
        left: isMobile ? 20 : 40,
        right: isMobile ? 20 : 40,
        bottom: 40,
      ),
      child: isMobile
          ? Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _buildHeroContent(),
                const SizedBox(height: 40),
                const Expanded(
                  child: Center(
                    child: SwipeCardStack(),
                  ),
                ),
              ],
            )
          : Row(
              children: [
                Expanded(
                  flex: 5,
                  child: _buildHeroContent(),
                ),
                const Expanded(
                  flex: 5,
                  child: Center(
                    child: SwipeCardStack(),
                  ),
                ),
              ],
            ),
    );
  }

  Widget _buildHeroContent() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        // Badge
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
          decoration: BoxDecoration(
            color: Colors.white.withOpacity(0.08),
            borderRadius: BorderRadius.circular(999),
            border: Border.all(color: Colors.white.withOpacity(0.18)),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 8,
                height: 8,
                decoration: const BoxDecoration(
                  color: Color(0xFF00FF88),
                  shape: BoxShape.circle,
                  boxShadow: [
                    BoxShadow(
                      color: Color(0xFF00FF88),
                      blurRadius: 10,
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 8),
              Text(
                'Live on Base · Web3 Dating Reimagined',
                style: GoogleFonts.inter(
                  fontSize: 13,
                  fontWeight: FontWeight.w500,
                  color: Colors.white.withOpacity(0.9),
                ),
              ),
            ],
          ),
        ),

        const SizedBox(height: 24),

        // Headline
        RichText(
          text: TextSpan(
            children: [
              TextSpan(
                text: 'Where hearts\nget ',
                style: GoogleFonts.fredoka(
                  fontSize: 56,
                  fontWeight: FontWeight.w700,
                  color: Colors.white,
                  letterSpacing: -0.03,
                  height: 1.1,
                ),
              ),
              TextSpan(
                text: 'caught',
                style: GoogleFonts.fredoka(
                  fontSize: 56,
                  fontWeight: FontWeight.w700,
                  foreground: Paint()
                    ..shader = const LinearGradient(
                      colors: [
                        Color(0xFFFFD700),
                        Color(0xFFFF6BB0),
                        Color(0xFFFF3D8A),
                      ],
                    ).createShader(
                      const Rect.fromLTWH(0, 0, 200, 70),
                    ),
                ),
              ),
              TextSpan(
                text: '.',
                style: GoogleFonts.fredoka(
                  fontSize: 56,
                  fontWeight: FontWeight.w700,
                  color: Colors.white,
                ),
              ),
            ],
          ),
        ),

        const SizedBox(height: 24),

        // Subtitle
        Text(
          'Swipe, match, and chat — but this time, your profile is an asset and every connection has value. Welcome to dating, leveled up.',
          style: GoogleFonts.inter(
            fontSize: 18,
            fontWeight: FontWeight.w400,
            color: Colors.white.withOpacity(0.85),
            height: 1.6,
          ),
        ),

        const SizedBox(height: 32),

        // CTA Buttons
        Wrap(
          spacing: 16,
          runSpacing: 12,
          children: [
            ElevatedButton.icon(
              onPressed: _openWalletModal,
              icon: const Text('✨', style: TextStyle(fontSize: 18)),
              label: const Text('Start Catching'),
              style: ElevatedButton.styleFrom(
                padding: const EdgeInsets.symmetric(horizontal: 28, vertical: 18),
                textStyle: GoogleFonts.inter(
                  fontSize: 17,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),
            OutlinedButton.icon(
              onPressed: () {},
              icon: const Text('→', style: TextStyle(fontSize: 18)),
              label: const Text('How it works'),
              style: OutlinedButton.styleFrom(
                padding: const EdgeInsets.symmetric(horizontal: 28, vertical: 18),
                textStyle: GoogleFonts.inter(
                  fontSize: 17,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),
          ],
        ),

        const SizedBox(height: 48),

        // Stats
        Row(
          children: [
            _buildStat('8', 'On-chain Contracts'),
            const SizedBox(width: 40),
            _buildStat('\$0', 'Gas Fees For You'),
            const SizedBox(width: 40),
            _buildStat('∞', 'Earning Potential'),
          ],
        ),
      ],
    );
  }

  Widget _buildStat(String number, String label) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        ShaderMask(
          shaderCallback: (bounds) => const LinearGradient(
            colors: [Colors.white, Color(0xFFFFD9EF)],
          ).createShader(bounds),
          child: Text(
            number,
            style: GoogleFonts.fredoka(
              fontSize: 32,
              fontWeight: FontWeight.w700,
              color: Colors.white,
            ),
          ),
        ),
        const SizedBox(height: 4),
        Text(
          label,
          style: GoogleFonts.inter(
            fontSize: 11,
            fontWeight: FontWeight.w500,
            color: Colors.white.withOpacity(0.7),
            letterSpacing: 0.5,
          ),
        ),
      ],
    );
  }

  Widget _buildFeaturesSection() {
    final features = [
      ('💕', 'Smart Matchmaking',
          '18-dimensional personality vectors find people who actually fit your vibe. Real chemistry, less swiping.'),
      ('⚡', 'Earn While You Date',
          'Your profile is an asset. When others "collect" you, you earn passive income. The more loved, the more earned.'),
      ('🎮', 'Fantasy Bae League',
          'Collect cards, build decks, win weekly tournaments. A whole game layer on top of dating.'),
      ('💬', 'Real-Time Chat',
          'Lightning-fast messaging with images, GIFs, voice notes. Read receipts. Typing indicators. The works.'),
      ('💎', 'Daily PCASH Bonus',
          'Claim free PCASH tokens every 4 hours. Use them to collect profiles, gift matches, or trade.'),
      ('🛡️', 'Zero Web3 Hassle',
          'No gas. No wallet popups. No transactions to sign. We handle all the blockchain stuff invisibly.'),
    ];

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 40, vertical: 80),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: [
            Colors.transparent,
            const Color(0xFF140632).withOpacity(0.4),
          ],
        ),
      ),
      child: Column(
        children: [
          // Section Header
          Text(
            'WHY CATCH UP',
            style: GoogleFonts.inter(
              fontSize: 14,
              fontWeight: FontWeight.w600,
              color: const Color(0xFFFFD700),
              letterSpacing: 2,
            ),
          ),
          const SizedBox(height: 12),
          Text(
            'Dating that actually values you.',
            style: GoogleFonts.fredoka(
              fontSize: 40,
              fontWeight: FontWeight.w700,
              color: Colors.white,
              height: 1.1,
            ),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 16),
          Text(
            'Three layers of awesome — a normal dating app on the surface, with a hidden economy that rewards being interesting.',
            style: GoogleFonts.inter(
              fontSize: 17,
              color: Colors.white.withOpacity(0.75),
              height: 1.5,
            ),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 48),

          // Feature Grid
          LayoutBuilder(
            builder: (context, constraints) {
              final crossAxisCount = constraints.maxWidth > 900
                  ? 3
                  : constraints.maxWidth > 600
                      ? 2
                      : 1;

              return GridView.builder(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
                  crossAxisCount: crossAxisCount,
                  crossAxisSpacing: 16,
                  mainAxisSpacing: 16,
                  childAspectRatio: 1.2,
                ),
                itemCount: features.length,
                itemBuilder: (context, index) {
                  final (icon, title, desc) = features[index];
                  return FeatureCard(
                    icon: icon,
                    title: title,
                    description: desc,
                  );
                },
              );
            },
          ),
        ],
      ),
    );
  }

  Widget _buildHowItWorksSection() {
    final steps = [
      ('1', 'Connect', 'Sign in with your wallet — or we\'ll make one for you. Takes 30 seconds.'),
      ('2', 'Profile', 'Add your photos, bio, vibe. We mint you as a unique on-chain profile.'),
      ('3', 'Swipe', 'Discover people who match your personality vector — not just your filters.'),
      ('4', 'Catch', 'Match, chat, meet. Earn PCASH the whole way through.'),
    ];

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 40, vertical: 80),
      child: Column(
        children: [
          Text(
            'GET STARTED IN MINUTES',
            style: GoogleFonts.inter(
              fontSize: 14,
              fontWeight: FontWeight.w600,
              color: const Color(0xFFFFD700),
              letterSpacing: 2,
            ),
          ),
          const SizedBox(height: 12),
          Text(
            'From signup to "It\'s a match!"',
            style: GoogleFonts.fredoka(
              fontSize: 40,
              fontWeight: FontWeight.w700,
              color: Colors.white,
              height: 1.1,
            ),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 48),

          // Steps
          LayoutBuilder(
            builder: (context, constraints) {
              final isWide = constraints.maxWidth > 800;

              if (isWide) {
                return Row(
                  mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                  children: steps.map((step) => Expanded(
                    child: StepCard(
                      number: step.$1,
                      title: step.$2,
                      description: step.$3,
                    ),
                  )).toList(),
                );
              } else {
                return Wrap(
                  spacing: 16,
                  runSpacing: 16,
                  children: steps.map((step) => SizedBox(
                    width: constraints.maxWidth > 400 ? 180 : double.infinity,
                    child: StepCard(
                      number: step.$1,
                      title: step.$2,
                      description: step.$3,
                    ),
                  )).toList(),
                );
              }
            },
          ),
        ],
      ),
    );
  }

  Widget _buildCTASection() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 40, vertical: 80),
      child: Container(
        padding: const EdgeInsets.all(48),
        decoration: BoxDecoration(
          gradient: const LinearGradient(
            colors: [
              Color(0xFFE94B9C),
              Color(0xFF7B2FE8),
              Color(0xFF5B1FB8),
            ],
          ),
          borderRadius: BorderRadius.circular(32),
          boxShadow: [
            BoxShadow(
              color: brandPurple.withOpacity(0.4),
              blurRadius: 60,
              offset: const Offset(0, 20),
            ),
          ],
        ),
        child: Stack(
          children: [
            // Decorative circle
            Positioned(
              top: -100,
              right: -50,
              child: Container(
                width: 300,
                height: 300,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  gradient: RadialGradient(
                    colors: [
                      Colors.white.withOpacity(0.2),
                      Colors.transparent,
                    ],
                  ),
                ),
              ),
            ),
            Column(
              children: [
                Text(
                  'Ready to get caught?',
                  style: GoogleFonts.fredoka(
                    fontSize: 36,
                    fontWeight: FontWeight.w700,
                    color: Colors.white,
                  ),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 16),
                Text(
                  'Join the dating revolution where you actually own your story.',
                  style: GoogleFonts.inter(
                    fontSize: 18,
                    color: Colors.white.withOpacity(0.95),
                  ),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 32),
                GlowButton(
                  text: '✨ Catch Your Match',
                  onPressed: _openWalletModal,
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildFooter() {
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        border: Border(
          top: BorderSide(color: Colors.white.withOpacity(0.18)),
        ),
      ),
      child: Text(
        '© 2026 Catch Up · Built on Base · Powered by Bae4U Protocol',
        style: GoogleFonts.inter(
          fontSize: 14,
          color: Colors.white.withOpacity(0.6),
        ),
        textAlign: TextAlign.center,
      ),
    );
  }
}
