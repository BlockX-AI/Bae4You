import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../design/tokens.dart';
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
              AppTokens.accent,
              AppTokens.accentMuted,
              AppTokens.bg,
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
                      icon: const Icon(Icons.arrow_back, color: AppTokens.textHi),
                    ),
                    Expanded(
                      child: Text(
                        'My Pets',
                        style: AppTokens.textStyles.h2,
                      ),
                    ),
                    // Marketplace button
                    GestureDetector(
                      onTap: () => Navigator.pushReplacementNamed(context, '/pets-marketplace'),
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                        decoration: BoxDecoration(
                          color: AppTokens.surface2,
                          borderRadius: BorderRadius.circular(AppTokens.r12),
                          border: Border.all(color: AppTokens.border),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            const Icon(Icons.store, color: AppTokens.accent, size: 16),
                            const SizedBox(width: 6),
                            Text(
                              'Market',
                              style: AppTokens.textStyles.label,
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
                    colors: [AppTokens.accent, AppTokens.accentMuted],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                  borderRadius: BorderRadius.circular(AppTokens.r16),
                  boxShadow: [
                    BoxShadow(
                      color: AppTokens.accent.withOpacity(0.4),
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
                              style: AppTokens.textStyles.body,
                            ),
                            const SizedBox(height: 4),
                            Text(
                              '${_totalPortfolioValue.toStringAsFixed(4)} ETH',
                              style: AppTokens.textStyles.display1,
                            ),
                          ],
                        ),
                        Container(
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: AppTokens.surface2,
                            shape: BoxShape.circle,
                          ),
                          child: const Icon(
                            Icons.account_balance_wallet,
                            color: AppTokens.textHi,
                            size: 32,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 16),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                      decoration: BoxDecoration(
                        color: AppTokens.surface2,
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          const Icon(Icons.pets, color: AppTokens.textHi, size: 18),
                          const SizedBox(width: 8),
                          Text(
                            '${_myPets.length} Pets Owned',
                            style: AppTokens.textStyles.label.copyWith(fontWeight: FontWeight.w600),
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
                    ? const Center(child: CircularProgressIndicator(color: AppTokens.accent))
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
          color: AppTokens.surface2,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: AppTokens.border),
        ),
        child: Row(
          children: [
            // Avatar
            Container(
              width: 60,
              height: 60,
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [AppTokens.accent, AppTokens.accentMuted],
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
                        style: AppTokens.textStyles.h2,
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
                        style: AppTokens.textStyles.body.copyWith(fontWeight: FontWeight.w600),
                      ),
                      const SizedBox(width: 6),
                      if (pet.isVerified ?? false)
                        const Icon(Icons.verified, color: AppTokens.success, size: 16),
                      if (isLocked)
                        const Padding(
                          padding: EdgeInsets.only(left: 6),
                          child: Icon(Icons.lock, color: AppTokens.danger, size: 16),
                        ),
                    ],
                  ),
                  const SizedBox(height: 2),
                  Text(
                    '@${pet.username ?? 'unknown'}',
                    style: AppTokens.textStyles.bodySm.copyWith(color: AppTokens.textMid),
                  ),
                  const SizedBox(height: 4),
                  Row(
                    children: [
                      const Icon(Icons.trending_up, color: AppTokens.accent, size: 14),
                      const SizedBox(width: 4),
                      Text(
                        '${pet.totalPurchases ?? 0} purchases',
                        style: AppTokens.textStyles.label.copyWith(color: AppTokens.textMid),
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
                  style: AppTokens.textStyles.body.copyWith(
                    color: AppTokens.accent,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const SizedBox(height: 4),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: AppTokens.success.withOpacity(0.2),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Text(
                    'OWNED',
                    style: AppTokens.textStyles.label.copyWith(
                      color: AppTokens.success,
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
          const Icon(Icons.error_outline, color: AppTokens.danger, size: 48),
          const SizedBox(height: 16),
          Text(
            'Failed to load pets',
            style: AppTokens.textStyles.body,
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
          const Icon(Icons.pets, size: 64, color: AppTokens.textMid),
          const SizedBox(height: 16),
          Text(
            'No pets yet',
            style: AppTokens.textStyles.h2,
          ),
          const SizedBox(height: 8),
          Text(
            'Visit the marketplace to buy your first pet!',
            style: AppTokens.textStyles.body,
          ),
          const SizedBox(height: 24),
          ElevatedButton.icon(
            onPressed: () => Navigator.pushReplacementNamed(context, '/pets-marketplace'),
            icon: const Icon(Icons.store),
            label: const Text('Browse Marketplace'),
            style: ElevatedButton.styleFrom(
              backgroundColor: AppTokens.accent,
              foregroundColor: AppTokens.textHi,
              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
            ),
          ),
        ],
      ),
    );
  }
}
