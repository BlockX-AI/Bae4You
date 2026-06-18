import 'package:flutter/material.dart';
import '../theme/app_colors.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';
import '../providers/auth_provider.dart';
import '../services/api_service.dart';

/// My Hero Stats Screen - Personal Fantasy Bae League statistics

class MyHeroStatsScreen extends ConsumerStatefulWidget {
  const MyHeroStatsScreen({super.key});

  @override
  ConsumerState<MyHeroStatsScreen> createState() => _MyHeroStatsScreenState();
}

class _MyHeroStatsScreenState extends ConsumerState<MyHeroStatsScreen> {
  final ApiService _apiService = ApiService();
  bool _isLoading = true;
  String _error = '';
  
  // Mock stats
  final Map<String, dynamic> _stats = {
    'rank': 42,
    'score': 8750,
    'totalMatches': 156,
    'winRate': 0.68,
    'streak': 7,
    'bestStreak': 15,
    'totalPetsOwned': 5,
    'petsValue': 2.45,
    'bonusClaimed': false,
    'bonusAmount': 100,
  };

  @override
  void initState() {
    super.initState();
    _loadStats();
  }

  Future<void> _loadStats() async {
    setState(() {
      _isLoading = true;
      _error = '';
    });

    try {
      final token = ref.read(authProvider).token;
      if (token == null) throw Exception('Not authenticated');

      // Try to load from API
      // final stats = await _apiService.getMyHeroStats(token);
      
      // Use mock data for now
      await Future.delayed(const Duration(milliseconds: 500));
      
      setState(() => _isLoading = false);
    } catch (e) {
      setState(() => _isLoading = false);
    }
  }

  Future<void> _claimBonus() async {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => const Center(
        child: CircularProgressIndicator(color: Color(0xFFFFD700)),
      ),
    );

    // Simulate API call
    await Future.delayed(const Duration(seconds: 2));
    
    if (mounted) {
      Navigator.pop(context); // Close loading
      
      setState(() {
        _stats['bonusClaimed'] = true;
      });
      
      _showBonusClaimedDialog();
    }
  }

  void _showBonusClaimedDialog() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: AppColors.textPrimary,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Text('🎉', style: TextStyle(fontSize: 64)),
            const SizedBox(height: 16),
            Text(
              'Bonus Claimed!',
              style: GoogleFonts.fredoka(
                fontSize: 24,
                fontWeight: FontWeight.bold,
                color: Colors.white,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              '+${_stats['bonusAmount']} PCASH',
              style: GoogleFonts.fredoka(
                fontSize: 32,
                fontWeight: FontWeight.bold,
                color: const Color(0xFFFFD700),
              ),
            ),
            const SizedBox(height: 8),
            Text(
              'has been added to your account',
              style: GoogleFonts.inter(
                color: Colors.white70,
                fontSize: 14,
              ),
            ),
          ],
        ),
        actions: [
          ElevatedButton(
            onPressed: () => Navigator.pop(context),
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFFFF6BB0),
              foregroundColor: Colors.white,
              minimumSize: const Size(double.infinity, 48),
            ),
            child: const Text('Awesome!'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final user = ref.watch(currentUserProvider);
    
    return Scaffold(
      body: Container(
        decoration: const BoxDecoration(
          gradient: RadialGradient(
            center: Alignment.topCenter,
            radius: 1.2,
            colors: [
              Color(0xFFFF6BB0),
              AppColors.primary,
              AppColors.textPrimary,
            ],
            stops: [0.0, 0.4, 1.0],
          ),
        ),
        child: SafeArea(
          child: Column(
            children: [
              // Header
              Padding(
                padding: const EdgeInsets.all(16),
                child: Row(
                  children: [
                    IconButton(
                      onPressed: () => Navigator.pop(context),
                      icon: const Icon(Icons.arrow_back, color: Colors.white),
                    ),
                    Expanded(
                      child: Text(
                        'My Hero Stats',
                        textAlign: TextAlign.center,
                        style: GoogleFonts.fredoka(
                          fontSize: 22,
                          fontWeight: FontWeight.bold,
                          color: Colors.white,
                        ),
                      ),
                    ),
                    const SizedBox(width: 48),
                  ],
                ),
              ),

              Expanded(
                child: _isLoading
                    ? const Center(child: CircularProgressIndicator(color: Color(0xFFFF6BB0)))
                    : SingleChildScrollView(
                        padding: const EdgeInsets.all(20),
                        child: Column(
                          children: [
                            // Profile Card
                            Container(
                              padding: const EdgeInsets.all(24),
                              decoration: BoxDecoration(
                                gradient: const LinearGradient(
                                  colors: [Color(0xFFFF6BB0), AppColors.primary],
                                ),
                                borderRadius: BorderRadius.circular(24),
                                boxShadow: [
                                  BoxShadow(
                                    color: const Color(0xFFFF6BB0).withOpacity(0.4),
                                    blurRadius: 20,
                                    spreadRadius: 5,
                                  ),
                                ],
                              ),
                              child: Column(
                                children: [
                                  // Avatar
                                  Container(
                                    width: 100,
                                    height: 100,
                                    decoration: BoxDecoration(
                                      color: Colors.white.withOpacity(0.2),
                                      shape: BoxShape.circle,
                                      border: Border.all(color: Colors.white.withOpacity(0.3), width: 3),
                                    ),
                                    child: Center(
                                      child: Text(
                                        user?.emoji ?? '👤',
                                        style: const TextStyle(fontSize: 48),
                                      ),
                                    ),
                                  ),
                                  const SizedBox(height: 16),
                                  Text(
                                    user?.displayName ?? 'Hero',
                                    style: GoogleFonts.fredoka(
                                      fontSize: 24,
                                      fontWeight: FontWeight.bold,
                                      color: Colors.white,
                                    ),
                                  ),
                                  const SizedBox(height: 8),
                                  Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
                                    decoration: BoxDecoration(
                                      color: Colors.white.withOpacity(0.2),
                                      borderRadius: BorderRadius.circular(20),
                                    ),
                                    child: Row(
                                      mainAxisSize: MainAxisSize.min,
                                      children: [
                                        const Icon(Icons.emoji_events, color: Color(0xFFFFD700), size: 18),
                                        const SizedBox(width: 8),
                                        Text(
                                          'Rank #${_stats['rank']}',
                                          style: GoogleFonts.inter(
                                            color: Colors.white,
                                            fontWeight: FontWeight.bold,
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                ],
                              ),
                            ),

                            const SizedBox(height: 24),

                            // Daily Bonus Card
                            if (!_stats['bonusClaimed'])
                              Container(
                                margin: const EdgeInsets.only(bottom: 24),
                                padding: const EdgeInsets.all(20),
                                decoration: BoxDecoration(
                                  gradient: const LinearGradient(
                                    colors: [Color(0xFFFFD700), Color(0xFFFFA000)],
                                  ),
                                  borderRadius: BorderRadius.circular(16),
                                  boxShadow: [
                                    BoxShadow(
                                      color: const Color(0xFFFFD700).withOpacity(0.4),
                                      blurRadius: 15,
                                      spreadRadius: 5,
                                    ),
                                  ],
                                ),
                                child: Column(
                                  children: [
                                    const Text('🎁', style: TextStyle(fontSize: 40)),
                                    const SizedBox(height: 12),
                                    Text(
                                      'Daily Bonus Available!',
                                      style: GoogleFonts.fredoka(
                                        fontSize: 20,
                                        fontWeight: FontWeight.bold,
                                        color: AppColors.textPrimary,
                                      ),
                                    ),
                                    const SizedBox(height: 8),
                                    Text(
                                      'Claim +${_stats['bonusAmount']} PCASH now',
                                      style: GoogleFonts.inter(
                                        color: AppColors.textPrimary.withOpacity(0.8),
                                      ),
                                    ),
                                    const SizedBox(height: 16),
                                    ElevatedButton(
                                      onPressed: _claimBonus,
                                      style: ElevatedButton.styleFrom(
                                        backgroundColor: AppColors.textPrimary,
                                        foregroundColor: Colors.white,
                                        minimumSize: const Size(double.infinity, 48),
                                        shape: RoundedRectangleBorder(
                                          borderRadius: BorderRadius.circular(12),
                                        ),
                                      ),
                                      child: const Text(
                                        'Claim Bonus',
                                        style: TextStyle(
                                          fontSize: 16,
                                          fontWeight: FontWeight.bold,
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
                              ),

                            // Stats Grid
                            Container(
                              padding: const EdgeInsets.all(20),
                              decoration: BoxDecoration(
                                color: Colors.white.withOpacity(0.1),
                                borderRadius: BorderRadius.circular(16),
                                border: Border.all(color: Colors.white.withOpacity(0.2)),
                              ),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    'Performance Stats',
                                    style: GoogleFonts.inter(
                                      fontSize: 18,
                                      fontWeight: FontWeight.bold,
                                      color: Colors.white,
                                    ),
                                  ),
                                  const SizedBox(height: 20),
                                  Row(
                                    children: [
                                      _buildStatCard(
                                        icon: Icons.star,
                                        label: 'Total Score',
                                        value: '${_stats['score']}',
                                        color: const Color(0xFFFFD700),
                                      ),
                                      _buildStatCard(
                                        icon: Icons.favorite,
                                        label: 'Matches',
                                        value: '${_stats['totalMatches']}',
                                        color: const Color(0xFFFF6BB0),
                                      ),
                                    ],
                                  ),
                                  const SizedBox(height: 12),
                                  Row(
                                    children: [
                                      _buildStatCard(
                                        icon: Icons.trending_up,
                                        label: 'Win Rate',
                                        value: '${(_stats['winRate'] * 100).toInt()}%',
                                        color: const Color(0xFF00FF88),
                                      ),
                                      _buildStatCard(
                                        icon: Icons.local_fire_department,
                                        label: 'Streak',
                                        value: '${_stats['streak']} 🔥',
                                        color: Colors.orange,
                                      ),
                                    ],
                                  ),
                                ],
                              ),
                            ),

                            const SizedBox(height: 24),

                            // Pet Portfolio
                            Container(
                              padding: const EdgeInsets.all(20),
                              decoration: BoxDecoration(
                                color: Colors.white.withOpacity(0.1),
                                borderRadius: BorderRadius.circular(16),
                                border: Border.all(color: Colors.white.withOpacity(0.2)),
                              ),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    'Pet Portfolio',
                                    style: GoogleFonts.inter(
                                      fontSize: 18,
                                      fontWeight: FontWeight.bold,
                                      color: Colors.white,
                                    ),
                                  ),
                                  const SizedBox(height: 20),
                                  Row(
                                    children: [
                                      Expanded(
                                        child: _buildPortfolioItem(
                                          icon: Icons.pets,
                                          label: 'Pets Owned',
                                          value: '${_stats['totalPetsOwned']}',
                                        ),
                                      ),
                                      Expanded(
                                        child: _buildPortfolioItem(
                                          icon: Icons.account_balance_wallet,
                                          label: 'Total Value',
                                          value: '${_stats['petsValue']} ETH',
                                        ),
                                      ),
                                    ],
                                  ),
                                  const SizedBox(height: 16),
                                  ElevatedButton.icon(
                                    onPressed: () => Navigator.pushNamed(context, '/my-pets'),
                                    icon: const Icon(Icons.pets),
                                    label: const Text('View My Pets'),
                                    style: ElevatedButton.styleFrom(
                                      backgroundColor: const Color(0xFFFF6BB0).withOpacity(0.2),
                                      foregroundColor: Colors.white,
                                      minimumSize: const Size(double.infinity, 48),
                                    ),
                                  ),
                                ],
                              ),
                            ),

                            const SizedBox(height: 24),

                            // Achievements
                            Container(
                              padding: const EdgeInsets.all(20),
                              decoration: BoxDecoration(
                                color: Colors.white.withOpacity(0.1),
                                borderRadius: BorderRadius.circular(16),
                                border: Border.all(color: Colors.white.withOpacity(0.2)),
                              ),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    'Recent Achievements',
                                    style: GoogleFonts.inter(
                                      fontSize: 18,
                                      fontWeight: FontWeight.bold,
                                      color: Colors.white,
                                    ),
                                  ),
                                  const SizedBox(height: 16),
                                  _buildAchievementItem(
                                    icon: '🔥',
                                    title: '7 Day Streak',
                                    description: 'Swiped for 7 consecutive days',
                                    color: Colors.orange,
                                  ),
                                  const SizedBox(height: 12),
                                  _buildAchievementItem(
                                    icon: '💎',
                                    title: 'Pet Collector',
                                    description: 'Own 5 or more pets',
                                    color: AppColors.primary,
                                  ),
                                  const SizedBox(height: 12),
                                  _buildAchievementItem(
                                    icon: '💘',
                                    title: 'Match Maker',
                                    description: 'Got 100+ matches',
                                    color: const Color(0xFFFF6BB0),
                                  ),
                                ],
                              ),
                            ),

                            const SizedBox(height: 40),
                          ],
                        ),
                      ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildStatCard({
    required IconData icon,
    required String label,
    required String value,
    required Color color,
  }) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.all(16),
        margin: const EdgeInsets.symmetric(horizontal: 6),
        decoration: BoxDecoration(
          color: color.withOpacity(0.15),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: color.withOpacity(0.3)),
        ),
        child: Column(
          children: [
            Icon(icon, color: color, size: 28),
            const SizedBox(height: 8),
            Text(
              value,
              style: GoogleFonts.fredoka(
                fontSize: 24,
                fontWeight: FontWeight.bold,
                color: color,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              label,
              style: GoogleFonts.inter(
                color: Colors.white.withOpacity(0.7),
                fontSize: 12,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildPortfolioItem({
    required IconData icon,
    required String label,
    required String value,
  }) {
    return Column(
      children: [
        Icon(icon, color: const Color(0xFFFFD700), size: 32),
        const SizedBox(height: 8),
        Text(
          value,
          style: GoogleFonts.fredoka(
            fontSize: 20,
            fontWeight: FontWeight.bold,
            color: Colors.white,
          ),
        ),
        const SizedBox(height: 4),
        Text(
          label,
          style: GoogleFonts.inter(
            color: Colors.white.withOpacity(0.7),
            fontSize: 12,
          ),
        ),
      ],
    );
  }

  Widget _buildAchievementItem({
    required String icon,
    required String title,
    required String description,
    required Color color,
  }) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: color.withOpacity(0.1),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: color.withOpacity(0.3)),
      ),
      child: Row(
        children: [
          Text(icon, style: const TextStyle(fontSize: 32)),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: GoogleFonts.inter(
                    fontWeight: FontWeight.bold,
                    color: Colors.white,
                    fontSize: 15,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  description,
                  style: GoogleFonts.inter(
                    color: Colors.white.withOpacity(0.6),
                    fontSize: 12,
                  ),
                ),
              ],
            ),
          ),
          Icon(Icons.check_circle, color: color, size: 24),
        ],
      ),
    );
  }
}
