import 'package:flutter/material.dart';
import '../theme/app_colors.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';
import '../providers/auth_provider.dart';
import '../services/api_service.dart';
import '../models/pet_models.dart';

/// Pet Detail Screen - View pet details and buy/sell

class PetDetailScreen extends ConsumerStatefulWidget {
  const PetDetailScreen({super.key});

  @override
  ConsumerState<PetDetailScreen> createState() => _PetDetailScreenState();
}

class _PetDetailScreenState extends ConsumerState<PetDetailScreen> {
  final ApiService _apiService = ApiService();
  Pet? _pet;
  bool _isLoading = true;
  String _error = '';
  bool _isOwned = false;
  bool _isProcessing = false;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    final args = ModalRoute.of(context)?.settings.arguments as Map<String, dynamic>?;
    final tokenId = args?['tokenId'] as String?;
    _isOwned = args?['isOwned'] as bool? ?? false;
    
    if (tokenId != null) {
      _loadPet(tokenId);
    }
  }

  Future<void> _loadPet(String tokenId) async {
    setState(() {
      _isLoading = true;
      _error = '';
    });

    try {
      final token = ref.read(authProvider).token;
      if (token == null) throw Exception('Not authenticated');

      final pet = await _apiService.getPet(tokenId, token);

      setState(() {
        _pet = pet;
        _isLoading = false;
      });
    } catch (e) {
      setState(() {
        _error = e.toString();
        _isLoading = false;
      });
    }
  }

  Future<void> _buyPet() async {
    setState(() => _isProcessing = true);
    
    // Simulate purchase
    await Future.delayed(const Duration(seconds: 2));
    
    if (mounted) {
      setState(() => _isProcessing = false);
      _showSuccessDialog('Purchase Successful!', 'You now own this pet! 🎉');
    }
  }

  Future<void> _sellPet() async {
    setState(() => _isProcessing = true);
    
    // Simulate sale
    await Future.delayed(const Duration(seconds: 2));
    
    if (mounted) {
      setState(() => _isProcessing = false);
      _showSuccessDialog('Listed for Sale!', 'Your pet is now on the marketplace! 🐾');
    }
  }

  void _showSuccessDialog(String title, String message) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: AppColors.textPrimary,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: Text(title, style: GoogleFonts.fredoka(color: Colors.white)),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Text('🎉', style: TextStyle(fontSize: 48)),
            const SizedBox(height: 16),
            Text(message, style: GoogleFonts.inter(color: Colors.white70)),
          ],
        ),
        actions: [
          ElevatedButton(
            onPressed: () {
              Navigator.pop(context);
              Navigator.pop(context);
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFFFF6BB0),
              foregroundColor: Colors.white,
            ),
            child: const Text('Awesome!'),
          ),
        ],
      ),
    );
  }

  String _formatPrice(String? priceWei) {
    if (priceWei == null) return '0 ETH';
    final price = int.tryParse(priceWei) ?? 0;
    final eth = price / 1e18;
    return '${eth.toStringAsFixed(4)} ETH';
  }

  String _formatDate(DateTime? date) {
    if (date == null) return 'Unknown';
    return '${date.day}/${date.month}/${date.year}';
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
          child: _isLoading
              ? const Center(child: CircularProgressIndicator(color: Color(0xFFFF6BB0)))
              : _error.isNotEmpty
                  ? _buildErrorWidget()
                  : _pet == null
                      ? const Center(child: Text('Pet not found'))
                      : _buildPetContent(),
        ),
      ),
    );
  }

  Widget _buildPetContent() {
    final pet = _pet!;
    final isLocked = pet.isLocked ?? false;
    
    return Column(
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
                  'Pet Details',
                  textAlign: TextAlign.center,
                  style: GoogleFonts.fredoka(
                    fontSize: 20,
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
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(20),
            child: Column(
              children: [
                // Pet Card
                Container(
                  padding: const EdgeInsets.all(24),
                  decoration: BoxDecoration(
                    gradient: const LinearGradient(
                      colors: [Color(0xFFFF6BB0), AppColors.primary],
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                    ),
                    borderRadius: BorderRadius.circular(24),
                    boxShadow: [
                      BoxShadow(
                        color: const Color(0xFFFF6BB0).withOpacity(0.4),
                        blurRadius: 30,
                        spreadRadius: 10,
                      ),
                    ],
                  ),
                  child: Column(
                    children: [
                      // Avatar
                      Container(
                        width: 140,
                        height: 140,
                        decoration: BoxDecoration(
                          color: Colors.white.withOpacity(0.2),
                          shape: BoxShape.circle,
                          border: Border.all(color: Colors.white.withOpacity(0.3), width: 4),
                        ),
                        child: Center(
                          child: pet.avatarIpfsHash != null
                              ? ClipOval(
                                  child: Image.network(
                                    'https://ipfs.io/ipfs/${pet.avatarIpfsHash}',
                                    width: 132,
                                    height: 132,
                                    fit: BoxFit.cover,
                                  ),
                                )
                              : Text(
                                  pet.displayName?.substring(0, 1).toUpperCase() ?? '?',
                                  style: GoogleFonts.fredoka(
                                    color: Colors.white,
                                    fontSize: 64,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                        ),
                      ),
                      const SizedBox(height: 20),
                      
                      // Name
                      Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Text(
                            pet.displayName ?? 'Unknown',
                            style: GoogleFonts.fredoka(
                              fontSize: 28,
                              fontWeight: FontWeight.bold,
                              color: Colors.white,
                            ),
                          ),
                          if (pet.isVerified ?? false)
                            const Padding(
                              padding: EdgeInsets.only(left: 8),
                              child: Icon(Icons.verified, color: Color(0xFF00FF88), size: 28),
                            ),
                        ],
                      ),
                      const SizedBox(height: 4),
                      Text(
                        '@${pet.username ?? 'unknown'}',
                        style: GoogleFonts.inter(
                          fontSize: 16,
                          color: Colors.white.withOpacity(0.9),
                        ),
                      ),
                      const SizedBox(height: 8),
                      
                      // Country
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                        decoration: BoxDecoration(
                          color: Colors.white.withOpacity(0.2),
                          borderRadius: BorderRadius.circular(20),
                        ),
                        child: Text(
                          '🇮🇳 ${pet.countryCode ?? 'Unknown'}',
                          style: GoogleFonts.inter(
                            color: Colors.white,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),

                const SizedBox(height: 24),

                // Stats Grid
                Container(
                  padding: const EdgeInsets.all(20),
                  decoration: BoxDecoration(
                    color: Colors.white.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: Colors.white.withOpacity(0.2)),
                  ),
                  child: Column(
                    children: [
                      Text(
                        'Statistics',
                        style: GoogleFonts.inter(
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                          color: Colors.white,
                        ),
                      ),
                      const SizedBox(height: 16),
                      Row(
                        children: [
                          _buildStatItem(
                            icon: Icons.trending_up,
                            label: 'Purchases',
                            value: '${pet.totalPurchases ?? 0}',
                          ),
                          _buildStatItem(
                            icon: Icons.attach_money,
                            label: 'Current Price',
                            value: _formatPrice(pet.currentPriceWei),
                            valueColor: const Color(0xFFFFD700),
                          ),
                        ],
                      ),
                      const SizedBox(height: 16),
                      Row(
                        children: [
                          _buildStatItem(
                            icon: Icons.schedule,
                            label: 'Lock Expiry',
                            value: _formatDate(pet.lockExpiry),
                          ),
                          _buildStatItem(
                            icon: Icons.pets,
                            label: 'Status',
                            value: isLocked ? 'LOCKED' : (pet.petStatus ?? 'Active'),
                            valueColor: isLocked ? Colors.red : const Color(0xFF00FF88),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),

                const SizedBox(height: 24),

                // Wallet Info
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: Colors.white.withOpacity(0.05),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: Colors.white.withOpacity(0.1)),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Owner Information',
                        style: GoogleFonts.inter(
                          color: Colors.white.withOpacity(0.7),
                          fontSize: 14,
                        ),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        pet.ownerAddress,
                        style: GoogleFonts.inter(
                          color: Colors.white,
                          fontSize: 12,
                        ),
                        overflow: TextOverflow.ellipsis,
                      ),
                    ],
                  ),
                ),

                const SizedBox(height: 80),
              ],
            ),
          ),
        ),

        // Bottom Action Button
        Container(
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            color: AppColors.textPrimary.withOpacity(0.9),
            borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
          ),
          child: SafeArea(
            top: false,
            child: _isProcessing
                ? const Center(
                    child: CircularProgressIndicator(color: Color(0xFFFF6BB0)),
                  )
                : _isOwned
                    ? ElevatedButton.icon(
                        onPressed: isLocked ? null : _sellPet,
                        icon: const Icon(Icons.sell),
                        label: Text(
                          isLocked ? 'Locked until ${_formatDate(pet.lockExpiry)}' : 'Sell Pet',
                          style: GoogleFonts.inter(
                            fontSize: 18,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: isLocked ? Colors.grey : const Color(0xFFFFD700),
                          foregroundColor: isLocked ? Colors.white70 : AppColors.textPrimary,
                          minimumSize: const Size(double.infinity, 56),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(16),
                          ),
                        ),
                      )
                    : ElevatedButton.icon(
                        onPressed: isLocked ? null : _buyPet,
                        icon: const Icon(Icons.shopping_cart),
                        label: Text(
                          isLocked
                              ? 'Currently Locked'
                              : 'Buy for ${_formatPrice(pet.currentPriceWei)}',
                          style: GoogleFonts.inter(
                            fontSize: 18,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: isLocked ? Colors.grey : const Color(0xFFFF6BB0),
                          foregroundColor: Colors.white,
                          minimumSize: const Size(double.infinity, 56),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(16),
                          ),
                          elevation: 8,
                          shadowColor: const Color(0xFFFF6BB0).withOpacity(0.5),
                        ),
                      ),
          ),
        ),
      ],
    );
  }

  Widget _buildStatItem({
    required IconData icon,
    required String label,
    required String value,
    Color? valueColor,
  }) {
    return Expanded(
      child: Column(
        children: [
          Icon(icon, color: const Color(0xFFFF6BB0), size: 28),
          const SizedBox(height: 8),
          Text(
            value,
            style: GoogleFonts.inter(
              fontSize: 18,
              fontWeight: FontWeight.bold,
              color: valueColor ?? Colors.white,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            label,
            style: GoogleFonts.inter(
              fontSize: 12,
              color: Colors.white.withOpacity(0.7),
            ),
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
            'Failed to load pet',
            style: GoogleFonts.inter(color: Colors.white, fontSize: 16),
          ),
          const SizedBox(height: 16),
          ElevatedButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Go Back'),
          ),
        ],
      ),
    );
  }
}
