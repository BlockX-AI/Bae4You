import 'package:flutter/material.dart';
import '../design/tokens.dart';
import 'auth_screen.dart';

class LandingScreen extends StatefulWidget {
  const LandingScreen({super.key});

  @override
  State<LandingScreen> createState() => _LandingScreenState();
}

class _LandingScreenState extends State<LandingScreen> {
  final ScrollController _scrollController = ScrollController();
  final GlobalKey _howItWorksKey = GlobalKey();

  void _openAuth({bool register = true}) {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => AuthScreen(startInRegister: register),
      ),
    );
  }

  void _scrollToHowItWorks() {
    final context = _howItWorksKey.currentContext;
    if (context != null) {
      Scrollable.ensureVisible(
        context,
        duration: const Duration(milliseconds: AppTokens.base),
        curve: Curves.easeOut,
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final width = MediaQuery.of(context).size.width;
    final isDesktop = width >= 900;

    return Scaffold(
      backgroundColor: AppTokens.bg,
      body: SingleChildScrollView(
        controller: _scrollController,
        child: Column(
          children: [
            _buildNav(isDesktop),
            _buildHero(isDesktop),
            _buildStatsStrip(isDesktop),
            _buildHowItWorks(isDesktop),
            _buildFooter(),
          ],
        ),
      ),
    );
  }

  Widget _buildNav(bool isDesktop) {
    return Container(
      height: 64,
      padding: EdgeInsets.symmetric(
        horizontal: isDesktop ? AppTokens.s24 : AppTokens.s16,
      ),
      decoration: const BoxDecoration(
        border: Border(
          bottom: BorderSide(color: AppTokens.border, width: 1),
        ),
      ),
      child: Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 1280),
          child: Row(
            children: [
              Text(
                'Catch Up',
                style: AppTokens.textStyles.display2,
              ),
              const Spacer(),
              if (isDesktop) ...[
                _buildNavLink('Pets'),
                _buildNavLink('Leaderboard'),
                _buildNavLink('How it works'),
                const SizedBox(width: AppTokens.s24),
                TextButton(
                  onPressed: () => _openAuth(register: false),
                  child: Text(
                    'Log in',
                    style: AppTokens.textStyles.body
                        .copyWith(color: AppTokens.textMid),
                  ),
                ),
                const SizedBox(width: AppTokens.s8),
                ElevatedButton(
                  onPressed: () => _openAuth(register: true),
                  child: const Text('Get started'),
                ),
              ] else
                IconButton(
                  onPressed: () {},
                  icon: const Icon(Icons.menu),
                  color: AppTokens.textHi,
                ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildNavLink(String text) {
    return MouseRegion(
      cursor: SystemMouseCursors.click,
      child: GestureDetector(
        onTap: () {
          if (text == 'How it works') _scrollToHowItWorks();
        },
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: AppTokens.s16),
          child: Text(
            text,
            style: AppTokens.textStyles.body.copyWith(
              color: AppTokens.textMid,
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildHero(bool isDesktop) {
    return Container(
      padding: EdgeInsets.symmetric(
        horizontal: isDesktop ? AppTokens.s24 : AppTokens.s16,
        vertical: isDesktop ? AppTokens.s64 : AppTokens.s32,
      ),
      child: Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 1280),
          child: isDesktop
              ? Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Expanded(
                      flex: 60,
                      child: _buildHeroContent(),
                    ),
                    const SizedBox(width: AppTokens.s48),
                    Expanded(
                      flex: 40,
                      child: Center(child: _buildHeroCard()),
                    ),
                  ],
                )
              : Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    _buildHeroContent(),
                    const SizedBox(height: AppTokens.s32),
                    Center(child: _buildHeroCard()),
                  ],
                ),
        ),
      ),
    );
  }

  Widget _buildHeroContent() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'THE MARKET FOR INTERESTING HUMANS',
          style: AppTokens.textStyles.label.copyWith(
            color: AppTokens.accent,
          ),
        ),
        const SizedBox(height: AppTokens.s16),
        Text(
          'Buy low. Sell high. Own people.',
          style: AppTokens.textStyles.display1,
        ),
        const SizedBox(height: AppTokens.s16),
        ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 480),
          child: Text(
            'Your collection is worth real PCASH. Trade pets, climb ranks, earn when your assets get bought.',
            style: AppTokens.textStyles.bodyLg.copyWith(
              color: AppTokens.textMid,
            ),
          ),
        ),
        const SizedBox(height: AppTokens.s24),
        ElevatedButton(
          onPressed: () => _openAuth(register: true),
          child: const Text('Get started'),
        ),
        const SizedBox(height: AppTokens.s12),
        TextButton(
          onPressed: _scrollToHowItWorks,
          child: Text(
            'How it works',
            style: AppTokens.textStyles.body.copyWith(
              color: AppTokens.textMid,
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildHeroCard() {
    return Transform.rotate(
      angle: 0.02,
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 360),
        child: Card(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              AspectRatio(
                aspectRatio: 4 / 3,
                child: Container(
                  color: AppTokens.surface2,
                  child: Center(
                    child: Text(
                      'MY',
                      style: AppTokens.textStyles.display1.copyWith(
                        color: AppTokens.textLow,
                      ),
                    ),
                  ),
                ),
              ),
              Padding(
                padding: const EdgeInsets.all(AppTokens.s16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Text(
                          'Maya, 24',
                          style: AppTokens.textStyles.h3,
                        ),
                        const Spacer(),
                        Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: AppTokens.s8,
                            vertical: AppTokens.s4,
                          ),
                          decoration: BoxDecoration(
                            color: AppTokens.surface2,
                            borderRadius: BorderRadius.circular(AppTokens.r24),
                            border: Border.all(color: AppTokens.border),
                          ),
                          child: Text(
                            'Bronze',
                            style: AppTokens.textStyles.label,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: AppTokens.s4),
                    Text(
                      'Mumbai',
                      style: AppTokens.textStyles.bodySm,
                    ),
                  ],
                ),
              ),
              const Divider(),
              Padding(
                padding: const EdgeInsets.all(AppTokens.s16),
                child: Row(
                  children: [
                    Text(
                      'PCASH 1,210',
                      style: AppTokens.textStyles.money,
                    ),
                    const Spacer(),
                    Row(
                      children: [
                        Icon(
                          Icons.arrow_drop_up,
                          color: AppTokens.success,
                          size: 16,
                        ),
                        Text(
                          '12%',
                          style: AppTokens.textStyles.moneySm.copyWith(
                            color: AppTokens.success,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildStatsStrip(bool isDesktop) {
    return Container(
      decoration: const BoxDecoration(
        border: Border(
          top: BorderSide(color: AppTokens.border, width: 1),
          bottom: BorderSide(color: AppTokens.border, width: 1),
        ),
      ),
      padding: EdgeInsets.symmetric(
        horizontal: isDesktop ? AppTokens.s24 : AppTokens.s16,
        vertical: AppTokens.s48,
      ),
      child: Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 1280),
          child: isDesktop
              ? Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    _buildStat('12,400', 'active traders'),
                    _buildStat('PCASH 4.2M', 'traded this week'),
                    _buildStat('6 cities', 'live now'),
                  ],
                )
              : Column(
                  children: [
                    _buildStat('12,400', 'active traders'),
                    const SizedBox(height: AppTokens.s24),
                    _buildStat('PCASH 4.2M', 'traded this week'),
                    const SizedBox(height: AppTokens.s24),
                    _buildStat('6 cities', 'live now'),
                  ],
                ),
        ),
      ),
    );
  }

  Widget _buildStat(String value, String label) {
    final isDesktop = MediaQuery.of(context).size.width >= 900;
    return Column(
      crossAxisAlignment:
          isDesktop ? CrossAxisAlignment.start : CrossAxisAlignment.center,
      children: [
        Text(
          value,
          style: AppTokens.textStyles.moneyLg,
        ),
        const SizedBox(height: AppTokens.s4),
        Text(
          label,
          style: AppTokens.textStyles.bodySm,
        ),
      ],
    );
  }

  Widget _buildHowItWorks(bool isDesktop) {
    return Container(
      key: _howItWorksKey,
      padding: EdgeInsets.symmetric(
        horizontal: isDesktop ? AppTokens.s24 : AppTokens.s16,
        vertical: AppTokens.s64,
      ),
      child: Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 1280),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'HOW IT WORKS',
                style: AppTokens.textStyles.label.copyWith(
                  color: AppTokens.accent,
                ),
              ),
              const SizedBox(height: AppTokens.s8),
              Text(
                'Three steps to your first pet',
                style: AppTokens.textStyles.h1,
              ),
              const SizedBox(height: AppTokens.s32),
              isDesktop
                  ? Row(
                      children: [
                        Expanded(
                          child: _buildStep(
                            '01',
                            'Browse',
                            'Find profiles by city, value, or interests.',
                          ),
                        ),
                        const SizedBox(width: AppTokens.s32),
                        Expanded(
                          child: _buildStep(
                            '02',
                            'Buy',
                            'Spend PCASH to add them to your collection.',
                          ),
                        ),
                        const SizedBox(width: AppTokens.s32),
                        Expanded(
                          child: _buildStep(
                            '03',
                            'Earn',
                            'Their value grows. You earn when they get bought.',
                          ),
                        ),
                      ],
                    )
                  : Column(
                      children: [
                        _buildStep(
                          '01',
                          'Browse',
                          'Find profiles by city, value, or interests.',
                        ),
                        const SizedBox(height: AppTokens.s32),
                        _buildStep(
                          '02',
                          'Buy',
                          'Spend PCASH to add them to your collection.',
                        ),
                        const SizedBox(height: AppTokens.s32),
                        _buildStep(
                          '03',
                          'Earn',
                          'Their value grows. You earn when they get bought.',
                        ),
                      ],
                    ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildStep(String number, String title, String description) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          number,
          style: AppTokens.textStyles.display2.copyWith(
            color: AppTokens.accentMuted,
          ),
        ),
        const SizedBox(height: AppTokens.s8),
        Text(
          title,
          style: AppTokens.textStyles.h3,
        ),
        const SizedBox(height: AppTokens.s4),
        Text(
          description,
          style: AppTokens.textStyles.body.copyWith(
            color: AppTokens.textMid,
          ),
        ),
      ],
    );
  }

  Widget _buildFooter() {
    return Container(
      decoration: const BoxDecoration(
        border: Border(
          top: BorderSide(color: AppTokens.border, width: 1),
        ),
      ),
      padding: const EdgeInsets.symmetric(
        horizontal: AppTokens.s24,
        vertical: AppTokens.s32,
      ),
      child: Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 1280),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'Catch Up',
                style: AppTokens.textStyles.h3,
              ),
              Row(
                children: [
                  TextButton(
                    onPressed: () {},
                    child: Text(
                      'Privacy',
                      style: AppTokens.textStyles.bodySm,
                    ),
                  ),
                  const SizedBox(width: AppTokens.s16),
                  TextButton(
                    onPressed: () {},
                    child: Text(
                      'Terms',
                      style: AppTokens.textStyles.bodySm,
                    ),
                  ),
                  const SizedBox(width: AppTokens.s16),
                  TextButton(
                    onPressed: () {},
                    child: Text(
                      'Contact',
                      style: AppTokens.textStyles.bodySm,
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}
