import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../design/tokens.dart';
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
  List<Map<String, dynamic>> _bids = [];

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

      // Bids are best-effort: a pet with none (or a transient failure) should
      // not block rendering the pet itself.
      List<Map<String, dynamic>> bids = [];
      try {
        bids = await _apiService.getPetBids(pet.tokenId, token);
      } catch (_) {}

      setState(() {
        _pet = pet;
        _bids = bids;
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
    final pet = _pet;
    if (pet == null) return;
    
    setState(() => _isProcessing = true);
    
    try {
      final authState = ref.read(authProvider);
      if (authState.token == null) throw Exception('Not authenticated');
      
      await _apiService.buyPet(pet.tokenId, authState.token!);

      // Refresh the buyer's balance so PCASH reflects the debit immediately.
      await ref.read(authProvider.notifier).refreshUser();

      if (mounted) {
        setState(() => _isProcessing = false);
        _showSuccessDialog('Purchase Successful', 'You now own this pet.');
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isProcessing = false);
        _showErrorDialog('Purchase Failed', e.toString());
      }
    }
  }

  Future<void> _placeBid() async {
    final pet = _pet;
    if (pet == null) return;
    
    final amount = await _showBidDialog();
    if (amount == null || amount.isEmpty) return;
    
    setState(() => _isProcessing = true);
    
    try {
      final authState = ref.read(authProvider);
      if (authState.token == null) throw Exception('Not authenticated');
      
      await _apiService.placeBid(pet.tokenId, amount, authState.token!);

      // Reflect the new bid in the list without leaving the screen.
      try {
        final bids = await _apiService.getPetBids(pet.tokenId, authState.token!);
        if (mounted) setState(() => _bids = bids);
      } catch (_) {}

      if (mounted) {
        setState(() => _isProcessing = false);
        _showSuccessDialog('Bid Placed', 'Your bid has been submitted.');
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isProcessing = false);
        _showErrorDialog('Bid Failed', e.toString());
      }
    }
  }

  Future<void> _sellPet() async {
    final pet = _pet;
    if (pet == null) return;
    
    final price = await _showPriceDialog();
    if (price == null || price.isEmpty) return;
    
    setState(() => _isProcessing = true);
    
    try {
      final authState = ref.read(authProvider);
      if (authState.token == null) throw Exception('Not authenticated');
      
      await _apiService.listPetForSale(pet.tokenId, price, authState.token!);
      
      if (mounted) {
        setState(() => _isProcessing = false);
        _showSuccessDialog('Listed for Sale', 'Your pet is now on the marketplace.');
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isProcessing = false);
        _showErrorDialog('Listing Failed', e.toString());
      }
    }
  }

  void _showErrorDialog(String title, String message) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: AppTokens.surface,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppTokens.r16)),
        title: Text(title, style: AppTokens.textStyles.h3),
        content: Text(message, style: AppTokens.textStyles.body),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('OK'),
          ),
        ],
      ),
    );
  }

  Future<String?> _showBidDialog() async {
    final controller = TextEditingController();
    return showDialog<String>(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: AppTokens.surface,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppTokens.r16)),
        title: Text('Place Bid', style: AppTokens.textStyles.h3),
        content: TextField(
          controller: controller,
          keyboardType: TextInputType.number,
          decoration: InputDecoration(
            hintText: 'Enter amount in PCASH',
            hintStyle: AppTokens.textStyles.bodySm.copyWith(color: AppTokens.textMid),
            filled: true,
            fillColor: AppTokens.surface2,
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(AppTokens.r12),
              borderSide: const BorderSide(color: AppTokens.border),
            ),
          ),
          style: AppTokens.textStyles.body,
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(context, controller.text),
            child: const Text('Place Bid'),
          ),
        ],
      ),
    );
  }

  Future<String?> _showPriceDialog() async {
    final controller = TextEditingController();
    return showDialog<String>(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: AppTokens.surface,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppTokens.r16)),
        title: Text('Set Sale Price', style: AppTokens.textStyles.h3),
        content: TextField(
          controller: controller,
          keyboardType: TextInputType.number,
          decoration: InputDecoration(
            hintText: 'Enter price in PCASH',
            hintStyle: AppTokens.textStyles.bodySm.copyWith(color: AppTokens.textMid),
            filled: true,
            fillColor: AppTokens.surface2,
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(AppTokens.r12),
              borderSide: const BorderSide(color: AppTokens.border),
            ),
          ),
          style: AppTokens.textStyles.body,
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(context, controller.text),
            child: const Text('List'),
          ),
        ],
      ),
    );
  }

  void _showSuccessDialog(String title, String message) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: AppTokens.surface,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: Text(title, style: AppTokens.textStyles.h3),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.check_circle, size: 48, color: AppTokens.success),
            const SizedBox(height: 16),
            Text(message, style: AppTokens.textStyles.body),
          ],
        ),
        actions: [
          ElevatedButton(
            onPressed: () {
              Navigator.pop(context);
              Navigator.pop(context);
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: AppTokens.accent,
              foregroundColor: AppTokens.textHi,
            ),
            child: const Text('Done'),
          ),
        ],
      ),
    );
  }

  String _formatPrice(String? price) {
    // Off-chain PCASH prices are plain integers (the source of truth), not wei.
    final value = int.tryParse(price ?? '') ?? 0;
    if (value >= 1000000) return '${(value / 1000000).toStringAsFixed(1)}M PCASH';
    if (value >= 1000) return '${(value / 1000).toStringAsFixed(1)}K PCASH';
    return '$value PCASH';
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
          color: AppTokens.bg,
        ),
        child: SafeArea(
          child: _isLoading
              ? const Center(child: CircularProgressIndicator(color: AppTokens.accent))
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
                icon: const Icon(Icons.arrow_back, color: AppTokens.textHi),
              ),
              Expanded(
                child: Text(
                  'Pet Details',
                  textAlign: TextAlign.center,
                  style: AppTokens.textStyles.h3,
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
                    color: AppTokens.surface,
                    border: Border.all(color: AppTokens.border, width: 1),
                    borderRadius: BorderRadius.circular(24),
                  ),
                  child: Column(
                    children: [
                      // Avatar
                      Container(
                        width: 140,
                        height: 140,
                        decoration: BoxDecoration(
                          color: AppTokens.textHi.withOpacity(0.2),
                          shape: BoxShape.circle,
                          border: Border.all(color: AppTokens.textHi.withOpacity(0.3), width: 4),
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
                                  style: AppTokens.textStyles.display1.copyWith(fontSize: 64),
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
                            style: AppTokens.textStyles.h2,
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
                        style: AppTokens.textStyles.body,
                      ),
                      const SizedBox(height: 8),
                      
                      // Country
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                        decoration: BoxDecoration(
                          color: AppTokens.textHi.withOpacity(0.2),
                          borderRadius: BorderRadius.circular(20),
                        ),
                        child: Text(
                          pet.countryCode ?? 'Unknown',
                          style: AppTokens.textStyles.label,
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
                    color: AppTokens.textHi.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: AppTokens.textHi.withOpacity(0.2)),
                  ),
                  child: Column(
                    children: [
                      Text(
                        'Statistics',
                        style: AppTokens.textStyles.h3,
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
                            valueColor: AppTokens.accent,
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
                            valueColor: isLocked ? AppTokens.danger : AppTokens.success,
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
                    color: AppTokens.textHi.withOpacity(0.05),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: AppTokens.textHi.withOpacity(0.1)),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Owner Information',
                        style: AppTokens.textStyles.body,
                      ),
                      const SizedBox(height: 8),
                      Text(
                        pet.ownerAddress,
                        style: AppTokens.textStyles.bodySm,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ],
                  ),
                ),

                if (_bids.isNotEmpty) ...[
                  const SizedBox(height: 24),
                  _buildBidsSection(),
                ],

                const SizedBox(height: 80),
              ],
            ),
          ),
        ),

        // Bottom Action Button
        Container(
          padding: const EdgeInsets.all(20),
          decoration: const BoxDecoration(
            color: AppTokens.surface,
            border: Border(
              top: BorderSide(color: AppTokens.border, width: 1),
            ),
          ),
          child: SafeArea(
            top: false,
            child: _isProcessing
                ? const Center(
                    child: CircularProgressIndicator(color: AppTokens.accent),
                  )
                : _isOwned
                    ? ElevatedButton.icon(
                        onPressed: isLocked ? null : _sellPet,
                        icon: const Icon(Icons.sell),
                        label: Text(
                          isLocked ? 'Locked until ${_formatDate(pet.lockExpiry)}' : 'Sell Pet',
                          style: AppTokens.textStyles.h3,
                        ),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: isLocked ? AppTokens.surface2 : AppTokens.accent,
                          foregroundColor: AppTokens.textHi,
                          minimumSize: const Size(double.infinity, 56),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(16),
                          ),
                        ),
                      )
                    : Column(
                        children: [
                          ElevatedButton.icon(
                            onPressed: isLocked ? null : _buyPet,
                            icon: const Icon(Icons.shopping_cart),
                            label: Text(
                              isLocked
                                  ? 'Currently Locked'
                                  : 'Buy for ${_formatPrice(pet.currentPriceWei)}',
                              style: AppTokens.textStyles.h3,
                            ),
                            style: ElevatedButton.styleFrom(
                              backgroundColor: isLocked ? AppTokens.surface2 : AppTokens.accent,
                              foregroundColor: AppTokens.textHi,
                              minimumSize: const Size(double.infinity, 56),
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(AppTokens.r12),
                              ),
                            ),
                          ),
                          if (!isLocked) ...[
                            const SizedBox(height: 12),
                            OutlinedButton.icon(
                              onPressed: _placeBid,
                              icon: const Icon(Icons.gavel),
                              label: Text(
                                'Place Bid',
                                style: AppTokens.textStyles.h3,
                              ),
                              style: OutlinedButton.styleFrom(
                                foregroundColor: AppTokens.textHi,
                                side: const BorderSide(color: AppTokens.border),
                                minimumSize: const Size(double.infinity, 48),
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(AppTokens.r12),
                                ),
                              ),
                            ),
                          ],
                        ],
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
          Icon(icon, color: AppTokens.accent, size: 28),
          const SizedBox(height: 8),
          Text(
            value,
            style: AppTokens.textStyles.h2.copyWith(
              color: valueColor ?? AppTokens.textHi,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            label,
            style: AppTokens.textStyles.label,
          ),
        ],
      ),
    );
  }

  Widget _buildBidsSection() {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: AppTokens.textHi.withOpacity(0.1),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppTokens.textHi.withOpacity(0.2)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(Icons.gavel, color: AppTokens.accent, size: 20),
              const SizedBox(width: 8),
              Text('Active Bids (${_bids.length})', style: AppTokens.textStyles.h3),
            ],
          ),
          const SizedBox(height: 16),
          ..._bids.map((bid) {
            final name = (bid['bidder_display_name'] ??
                    bid['bidder_name'] ??
                    'Anonymous')
                .toString();
            final amount = bid['amount']?.toString();
            return Padding(
              padding: const EdgeInsets.only(bottom: 12),
              child: Row(
                children: [
                  Expanded(
                    child: Text(name, style: AppTokens.textStyles.body),
                  ),
                  Text(
                    _formatPrice(amount),
                    style: AppTokens.textStyles.body.copyWith(
                      color: AppTokens.accent,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ],
              ),
            );
          }),
        ],
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
            'Failed to load pet',
            style: AppTokens.textStyles.body,
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
