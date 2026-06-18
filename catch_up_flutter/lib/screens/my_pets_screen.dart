import 'package:flutter/material.dart';
import '../theme/app_colors.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';
import '../providers/auth_provider.dart';
import '../services/api_service.dart';
import '../models/pet_models.dart';

/// My Pets Screen - View user's owned pet portfolio

class MyPetsScreen extends ConsumerStatefulWidget {
  const MyPetsScreen({super.key});

  @override
  ConsumerState<MyPetsScreen> createState() => _MyPetsScreenState();
}

class _MyPetsScreenState extends ConsumerState<MyPetsScreen> {
  final ApiService _apiService = ApiService();
  List<Pet> _myPets = [];
  bool _isLoading = true;
  String _error = '';
  double _totalPortfolioValue = 0;

  @override
  void initState() {
    super.initState();
    _loadMyPets();
  }

  Future<void> _loadMyPets() async {
    setState(() {
      _isLoading = true;
      _error = '';
    });

    try {
      final token = ref.read(authProvider).token;
      final user = ref.read(authProvider).user;
      
      if (token == null || user == null) throw Exception('Not authenticated');

      final pets = await _apiService.getPortfolio(user.walletAddress, token);

      // Calculate total value
      double totalValue = 0;
      for (final pet in pets) {
        final price = int.tryParse(pet.currentPriceWei ?? '0') ?? 0;
        totalValue += price / 1e18;
      }

      setState(() {
        _myPets = pets;
        _totalPortfolioValue = totalValue;
        _isLoading = false;
      });
    } catch (e) {
      setState(() {
        _error = e.toString();
        _isLoading = false;
      });
    }
  }

  String _formatPrice(String? priceWei) {
    if (priceWei == null) return '0 ETH';
    final price = int.tryParse(priceWei) ?? 0;
    final eth = price / 1e18;
    return '${eth.toStringAsFixed(4)} ETH';
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
                        'My Pets',
                        style: GoogleFonts.fredoka(
                          fontSize: 24,
                          fontWeight: FontWeight.bold,
                          color: Colors.white,
                        ),
                      ),
                    ),
                    // Marketplace button
                    GestureDetector(
                      onTap: () => Navigator.pushReplacementNamed(context, '/pets-marketplace'),
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
                            const Icon(Icons.store, color: Color(0xFFFF6BB0), size: 16),
                            const SizedBox(width: 6),
                            Text(
                              'Market',
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

              // Portfolio Summary Card
              Container(
                margin: const EdgeInsets.symmetric(horizontal: 16),
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  gradient: const LinearGradient(
                    colors: [Color(0xFFFF6BB0), AppColors.primary],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                  borderRadius: BorderRadius.circular(20),
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
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Portfolio Value',
                              style: GoogleFonts.inter(
                                color: Colors.white.withOpacity(0.9),
                                fontSize: 14,
                              ),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              '${_totalPortfolioValue.toStringAsFixed(4)} ETH',
                              style: GoogleFonts.fredoka(
                                color: Colors.white,
                                fontSize: 28,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ],
                        ),
                        Container(
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: Colors.white.withOpacity(0.2),
                            shape: BoxShape.circle,
                          ),
                          child: const Icon(
                            Icons.account_balance_wallet,
                            color: Colors.white,
                            size: 32,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 16),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                      decoration: BoxDecoration(
                        color: Colors.white.withOpacity(0.2),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          const Icon(Icons.pets, color: Colors.white, size: 18),
                          const SizedBox(width: 8),
                          Text(
                            '${_myPets.length} Pets Owned',
                            style: GoogleFonts.inter(
                              color: Colors.white,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 20),

              // Pets List
              Expanded(
                child: _isLoading
                    ? const Center(child: CircularProgressIndicator(color: Color(0xFFFF6BB0)))
                    : _error.isNotEmpty
                        ? _buildErrorWidget()
                        : _myPets.isEmpty
                            ? _buildEmptyWidget()
                            : ListView.builder(
                                padding: const EdgeInsets.symmetric(horizontal: 16),
                                itemCount: _myPets.length,
                                itemBuilder: (context, index) {
                                  return _buildPetListItem(_myPets[index]);
                                },
                              ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildPetListItem(Pet pet) {
    final isLocked = pet.isLocked ?? false;
    
    return GestureDetector(
      onTap: () => Navigator.pushNamed(
        context,
        '/pet-detail',
        arguments: {'tokenId': pet.tokenId.toString(), 'isOwned': true},
      ),
      child: Container(
        margin: const EdgeInsets.only(bottom: 12),
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Colors.white.withOpacity(0.1),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: Colors.white.withOpacity(0.2)),
        ),
        child: Row(
          children: [
            // Avatar
            Container(
              width: 60,
              height: 60,
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [Color(0xFFFF6BB0), AppColors.primary],
                ),
                shape: BoxShape.circle,
              ),
              child: Center(
                child: pet.avatarIpfsHash != null
                    ? ClipOval(
                        child: Image.network(
                          'https://ipfs.io/ipfs/${pet.avatarIpfsHash}',
                          width: 56,
                          height: 56,
                          fit: BoxFit.cover,
                        ),
                      )
                    : Text(
                        pet.displayName?.substring(0, 1).toUpperCase() ?? '?',
                        style: GoogleFonts.fredoka(
                          color: Colors.white,
                          fontSize: 24,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
              ),
            ),
            const SizedBox(width: 16),
            
            // Info
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Text(
                        pet.displayName ?? 'Unknown',
                        style: GoogleFonts.inter(
                          color: Colors.white,
                          fontWeight: FontWeight.bold,
                          fontSize: 16,
                        ),
                      ),
                      const SizedBox(width: 6),
                      if (pet.isVerified ?? false)
                        const Icon(Icons.verified, color: Color(0xFF00FF88), size: 16),
                      if (isLocked)
                        const Padding(
                          padding: EdgeInsets.only(left: 6),
                          child: Icon(Icons.lock, color: Colors.red, size: 16),
                        ),
                    ],
                  ),
                  const SizedBox(height: 2),
                  Text(
                    '@${pet.username ?? 'unknown'}',
                    style: GoogleFonts.inter(
                      color: Colors.white.withOpacity(0.6),
                      fontSize: 13,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Row(
                    children: [
                      const Icon(Icons.trending_up, color: Color(0xFFFFD700), size: 14),
                      const SizedBox(width: 4),
                      Text(
                        '${pet.totalPurchases ?? 0} purchases',
                        style: GoogleFonts.inter(
                          color: Colors.white.withOpacity(0.7),
                          fontSize: 12,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            
            // Price
            Column(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Text(
                  _formatPrice(pet.currentPriceWei),
                  style: GoogleFonts.inter(
                    color: const Color(0xFFFFD700),
                    fontWeight: FontWeight.bold,
                    fontSize: 14,
                  ),
                ),
                const SizedBox(height: 4),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: const Color(0xFF00FF88).withOpacity(0.2),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Text(
                    'OWNED',
                    style: GoogleFonts.inter(
                      color: const Color(0xFF00FF88),
                      fontSize: 10,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
              ],
            ),
          ],
        ),
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
            'Failed to load pets',
            style: GoogleFonts.inter(color: Colors.white, fontSize: 16),
          ),
          const SizedBox(height: 16),
          ElevatedButton(
            onPressed: _loadMyPets,
            child: const Text('Retry'),
          ),
        ],
      ),
    );
  }

  Widget _buildEmptyWidget() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const Text('🐾', style: TextStyle(fontSize: 64)),
          const SizedBox(height: 16),
          Text(
            'No pets yet',
            style: GoogleFonts.fredoka(
              color: Colors.white,
              fontSize: 24,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            'Visit the marketplace to buy your first pet!',
            style: GoogleFonts.inter(
              color: Colors.white.withOpacity(0.7),
              fontSize: 14,
            ),
          ),
          const SizedBox(height: 24),
          ElevatedButton.icon(
            onPressed: () => Navigator.pushReplacementNamed(context, '/pets-marketplace'),
            icon: const Icon(Icons.store),
            label: const Text('Browse Marketplace'),
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFFFF6BB0),
              foregroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
            ),
          ),
        ],
      ),
    );
  }
}
