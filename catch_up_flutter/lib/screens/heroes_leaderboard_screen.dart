import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';
import '../providers/auth_provider.dart';
import '../services/api_service.dart';

/// Fantasy Bae League - Heroes Leaderboard Screen

class HeroesLeaderboardScreen extends ConsumerStatefulWidget {
  const HeroesLeaderboardScreen({super.key});

  @override
  ConsumerState<HeroesLeaderboardScreen> createState() => _HeroesLeaderboardScreenState();
}

class _HeroesLeaderboardScreenState extends ConsumerState<HeroesLeaderboardScreen> {
  final ApiService _apiService = ApiService();
  List<dynamic> _heroes = [];
  bool _isLoading = true;
  String _error = '';
  int _currentPage = 1;
  String _timeFilter = 'all_time'; // all_time, monthly, weekly

  final List<Map<String, dynamic>> _mockHeroes = [
    {'rank': 1, 'username': 'crypto_king', 'displayName': 'Alex', 'score': 15420, 'matches': 342, 'avatar': '👑', 'change': 2},
    {'rank': 2, 'username': 'web3_queen', 'displayName': 'Sarah', 'score': 14850, 'matches': 318, 'avatar': '💎', 'change': 0},
    {'rank': 3, 'username': 'nft_collector', 'displayName': 'Mike', 'score': 14200, 'matches': 295, 'avatar': '🎨', 'change': -1},
    {'rank': 4, 'username': 'defi_master', 'displayName': 'Emma', 'score': 13800, 'matches': 280, 'avatar': '🚀', 'change': 5},
    {'rank': 5, 'username': 'blockchain_dev', 'displayName': 'David', 'score': 13500, 'matches': 267, 'avatar': '💻', 'change': 3},
    {'rank': 6, 'username': 'ethereum_maxi', 'displayName': 'Lisa', 'score': 13100, 'matches': 254, 'avatar': 'Ξ', 'change': -2},
    {'rank': 7, 'username': 'metaverse_pro', 'displayName': 'Tom', 'score': 12800, 'matches': 241, 'avatar': '🌐', 'change': 1},
    {'rank': 8, 'username': 'dao_builder', 'displayName': 'Anna', 'score': 12500, 'matches': 238, 'avatar': '🏛️', 'change': 4},
    {'rank': 9, 'username': 'token_trader', 'displayName': 'Chris', 'score': 12200, 'matches': 225, 'avatar': '📈', 'change': -3},
    {'rank': 10, 'username': 'smart_contract', 'displayName': 'Jenny', 'score': 11900, 'matches': 212, 'avatar': '📜', 'change': 0},
  ];

  @override
  void initState() {
    super.initState();
    _loadLeaderboard();
  }

  Future<void> _loadLeaderboard() async {
    setState(() {
      _isLoading = true;
      _error = '';
    });

    try {
      final token = ref.read(authProvider).token;
      if (token == null) throw Exception('Not authenticated');

      // Try to load from API
      // final response = await _apiService.getHeroLeaderboard(
      //   token: token,
      //   page: _currentPage.toString(),
      //   limit: '50',
      // );
      // _heroes = response.heroes;

      // For now, use mock data
      await Future.delayed(const Duration(milliseconds: 800));
      
      setState(() {
        _heroes = _mockHeroes;
        _isLoading = false;
      });
    } catch (e) {
      setState(() {
        _heroes = _mockHeroes;
        _isLoading = false;
      });
    }
  }

  String _formatScore(int score) {
    if (score >= 1000) {
      return '${(score / 1000).toStringAsFixed(1)}K';
    }
    return score.toString();
  }

  Color _getRankColor(int rank) {
    switch (rank) {
      case 1:
        return const Color(0xFFFFD700); // Gold
      case 2:
        return const Color(0xFFC0C0C0); // Silver
      case 3:
        return const Color(0xFFCD7F32); // Bronze
      default:
        return Colors.white;
    }
  }

  Widget _buildRankBadge(int rank) {
    if (rank <= 3) {
      return Container(
        width: 36,
        height: 36,
        decoration: BoxDecoration(
          color: _getRankColor(rank),
          shape: BoxShape.circle,
          boxShadow: [
            BoxShadow(
              color: _getRankColor(rank).withOpacity(0.5),
              blurRadius: 10,
              spreadRadius: 2,
            ),
          ],
        ),
        child: Center(
          child: Text(
            '#$rank',
            style: GoogleFonts.fredoka(
              color: rank == 1 ? const Color(0xFF2E0B5C) : Colors.white,
              fontWeight: FontWeight.bold,
              fontSize: 14,
            ),
          ),
        ),
      );
    }
    
    return Container(
      width: 36,
      height: 36,
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.1),
        shape: BoxShape.circle,
      ),
      child: Center(
        child: Text(
          '#$rank',
          style: GoogleFonts.inter(
            color: Colors.white,
            fontWeight: FontWeight.w600,
            fontSize: 12,
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
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
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Fantasy Bae League',
                            style: GoogleFonts.fredoka(
                              fontSize: 22,
                              fontWeight: FontWeight.bold,
                              color: Colors.white,
                            ),
                          ),
                          Text(
                            'Top Heroes Leaderboard',
                            style: GoogleFonts.inter(
                              fontSize: 13,
                              color: Colors.white.withOpacity(0.7),
                            ),
                          ),
                        ],
                      ),
                    ),
                    // My Stats button
                    GestureDetector(
                      onTap: () => Navigator.pushNamed(context, '/my-hero-stats'),
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                        decoration: BoxDecoration(
                          color: Colors.white.withOpacity(0.1),
                          borderRadius: BorderRadius.circular(20),
                          border: Border.all(color: Colors.white.withOpacity(0.2)),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            const Icon(Icons.emoji_events, color: Color(0xFFFFD700), size: 16),
                            const SizedBox(width: 6),
                            Text(
                              'My Stats',
                              style: GoogleFonts.inter(
                                color: Colors.white,
                                fontWeight: FontWeight.w600,
                                fontSize: 12,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ],
                ),
              ),

              // Time Filter
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                child: Container(
                  padding: const EdgeInsets.all(4),
                  decoration: BoxDecoration(
                    color: Colors.white.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Row(
                    children: [
                      _buildFilterTab('All Time', 'all_time'),
                      _buildFilterTab('Monthly', 'monthly'),
                      _buildFilterTab('Weekly', 'weekly'),
                    ],
                  ),
                ),
              ),

              const SizedBox(height: 16),

              // Top 3 Podium
              if (_heroes.isNotEmpty && !_isLoading)
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      // #2
                      if (_heroes.length > 1)
                        _buildPodiumItem(_heroes[1], 2, 100),
                      // #1
                      _buildPodiumItem(_heroes[0], 1, 140),
                      // #3
                      if (_heroes.length > 2)
                        _buildPodiumItem(_heroes[2], 3, 80),
                    ],
                  ),
                ),

              const SizedBox(height: 20),

              // Leaderboard List
              Expanded(
                child: _isLoading
                    ? const Center(child: CircularProgressIndicator(color: Color(0xFFFF6BB0)))
                    : _error.isNotEmpty && _heroes.isEmpty
                        ? _buildErrorWidget()
                        : Container(
                            decoration: BoxDecoration(
                              color: Colors.white.withOpacity(0.05),
                              borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
                            ),
                            child: ListView.builder(
                              padding: const EdgeInsets.all(16),
                              itemCount: _heroes.length,
                              itemBuilder: (context, index) {
                                // Skip top 3 in list (shown in podium)
                                if (index < 3) return const SizedBox.shrink();
                                return _buildHeroListItem(_heroes[index]);
                              },
                            ),
                          ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildFilterTab(String label, String value) {
    final isSelected = _timeFilter == value;
    
    return Expanded(
      child: GestureDetector(
        onTap: () {
          setState(() => _timeFilter = value);
          _loadLeaderboard();
        },
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 10),
          decoration: BoxDecoration(
            color: isSelected ? const Color(0xFFFF6BB0) : Colors.transparent,
            borderRadius: BorderRadius.circular(8),
          ),
          child: Text(
            label,
            textAlign: TextAlign.center,
            style: GoogleFonts.inter(
              color: isSelected ? Colors.white : Colors.white70,
              fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
              fontSize: 13,
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildPodiumItem(dynamic hero, int rank, double height) {
    final rankEmojis = {1: '🥇', 2: '🥈', 3: '🥉'};
    
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 8),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.end,
        children: [
          // Avatar
          Container(
            width: rank == 1 ? 80 : 60,
            height: rank == 1 ? 80 : 60,
            decoration: BoxDecoration(
              gradient: const LinearGradient(
                colors: [Color(0xFFFF6BB0), Color(0xFF7B2FE8)],
              ),
              shape: BoxShape.circle,
              border: Border.all(
                color: _getRankColor(rank),
                width: 3,
              ),
              boxShadow: [
                BoxShadow(
                  color: _getRankColor(rank).withOpacity(0.5),
                  blurRadius: 20,
                  spreadRadius: 5,
                ),
              ],
            ),
            child: Center(
              child: Text(
                hero['avatar'] ?? '👤',
                style: TextStyle(fontSize: rank == 1 ? 40 : 30),
              ),
            ),
          ),
          const SizedBox(height: 8),
          Text(
            rankEmojis[rank]!,
            style: const TextStyle(fontSize: 24),
          ),
          Text(
            hero['displayName'] ?? hero['username'],
            style: GoogleFonts.inter(
              color: Colors.white,
              fontWeight: FontWeight.bold,
              fontSize: rank == 1 ? 16 : 14,
            ),
          ),
          Text(
            '${_formatScore(hero['score'])} pts',
            style: GoogleFonts.inter(
              color: _getRankColor(rank),
              fontWeight: FontWeight.bold,
              fontSize: rank == 1 ? 14 : 12,
            ),
          ),
          const SizedBox(height: 8),
          // Podium block
          Container(
            width: rank == 1 ? 100 : 80,
            height: height,
            decoration: BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topCenter,
                end: Alignment.bottomCenter,
                colors: [
                  _getRankColor(rank).withOpacity(0.8),
                  _getRankColor(rank).withOpacity(0.3),
                ],
              ),
              borderRadius: const BorderRadius.vertical(top: Radius.circular(12)),
            ),
            child: Center(
              child: Text(
                '#$rank',
                style: GoogleFonts.fredoka(
                  color: Colors.white,
                  fontWeight: FontWeight.bold,
                  fontSize: rank == 1 ? 28 : 20,
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildHeroListItem(dynamic hero) {
    final rank = hero['rank'] as int;
    final change = hero['change'] as int;
    
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.1),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.white.withOpacity(0.1)),
      ),
      child: Row(
        children: [
          _buildRankBadge(rank),
          const SizedBox(width: 12),
          
          // Avatar
          Container(
            width: 44,
            height: 44,
            decoration: BoxDecoration(
              gradient: const LinearGradient(
                colors: [Color(0xFFFF6BB0), Color(0xFF7B2FE8)],
              ),
              shape: BoxShape.circle,
            ),
            child: Center(
              child: Text(
                hero['avatar'] ?? '👤',
                style: const TextStyle(fontSize: 22),
              ),
            ),
          ),
          const SizedBox(width: 12),
          
          // Info
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  hero['displayName'] ?? hero['username'],
                  style: GoogleFonts.inter(
                    color: Colors.white,
                    fontWeight: FontWeight.bold,
                    fontSize: 15,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  '@${hero['username']}',
                  style: GoogleFonts.inter(
                    color: Colors.white.withOpacity(0.6),
                    fontSize: 12,
                  ),
                ),
              ],
            ),
          ),
          
          // Rank change
          if (change != 0)
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
              decoration: BoxDecoration(
                color: change > 0 
                    ? const Color(0xFF00FF88).withOpacity(0.2)
                    : Colors.red.withOpacity(0.2),
                borderRadius: BorderRadius.circular(4),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(
                    change > 0 ? Icons.arrow_upward : Icons.arrow_downward,
                    color: change > 0 ? const Color(0xFF00FF88) : Colors.red,
                    size: 12,
                  ),
                  const SizedBox(width: 2),
                  Text(
                    '${change.abs()}',
                    style: TextStyle(
                      color: change > 0 ? const Color(0xFF00FF88) : Colors.red,
                      fontSize: 11,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ],
              ),
            ),
          
          const SizedBox(width: 12),
          
          // Score
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text(
                _formatScore(hero['score']),
                style: GoogleFonts.inter(
                  color: const Color(0xFFFFD700),
                  fontWeight: FontWeight.bold,
                  fontSize: 16,
                ),
              ),
              Text(
                '${hero['matches']} matches',
                style: GoogleFonts.inter(
                  color: Colors.white.withOpacity(0.5),
                  fontSize: 11,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildErrorWidget() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const Icon(Icons.error_outline, color: Colors.red, size: 48),
          const SizedBox(height: 16),
          Text(
            'Failed to load leaderboard',
            style: GoogleFonts.inter(color: Colors.white, fontSize: 16),
          ),
          const SizedBox(height: 16),
          ElevatedButton(
            onPressed: _loadLeaderboard,
            child: const Text('Retry'),
          ),
        ],
      ),
    );
  }
}
