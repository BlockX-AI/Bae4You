import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../design/tokens.dart';
import '../providers/auth_provider.dart';
import '../services/api_service.dart';
import '../models/pet_models.dart';
import '../widgets/avatar_display.dart';

/// Pet Marketplace Screen - Browse and buy NFT pets

class PetsMarketplaceScreen extends ConsumerStatefulWidget {
  const PetsMarketplaceScreen({super.key});

  @override
  ConsumerState<PetsMarketplaceScreen> createState() => _PetsMarketplaceScreenState();
}

class _PetsMarketplaceScreenState extends ConsumerState<PetsMarketplaceScreen> {
  final ApiService _apiService = ApiService();
  List<Pet> _pets = [];
  bool _isLoading = true;
  String _error = '';
  int _currentPage = 1;
  bool _hasMore = true;
  String? _selectedCountry;
  String _searchQuery = '';
  String _sortBy = 'price_asc'; // price_asc, price_desc, popular, newest
  
  final ScrollController _scrollController = ScrollController();

  final List<Map<String, String>> _countries = [
    {'code': 'ALL', 'name': 'All Countries', 'flag': 'WW'},
    {'code': 'IN', 'name': 'India', 'flag': 'IN'},
    {'code': 'US', 'name': 'United States', 'flag': 'US'},
    {'code': 'UK', 'name': 'United Kingdom', 'flag': 'UK'},
    {'code': 'CA', 'name': 'Canada', 'flag': 'CA'},
    {'code': 'AU', 'name': 'Australia', 'flag': 'AU'},
    {'code': 'SG', 'name': 'Singapore', 'flag': 'SG'},
  ];

  @override
  void initState() {
    super.initState();
    _loadPets();
    _scrollController.addListener(_onScroll);
  }

  @override
  void dispose() {
    _scrollController.dispose();
    super.dispose();
  }

  void _onScroll() {
    if (_scrollController.position.pixels >= 
        _scrollController.position.maxScrollExtent - 200) {
      if (!_isLoading && _hasMore) {
        _loadMorePets();
      }
    }
  }

  Future<void> _loadPets() async {
    setState(() {
      _isLoading = true;
      _error = '';
      _currentPage = 1;
      _pets = [];
    });

    try {
      final token = ref.read(authProvider).token;
      if (token == null) throw Exception('Not authenticated');

      final response = await _apiService.getPets(
        token: token,
        page: '1',
        limit: '20',
        country: _selectedCountry == 'ALL' ? null : _selectedCountry,
      );

      setState(() {
        _pets = response.pets;
        _hasMore = response.pets.length == 20;
        _isLoading = false;
      });
    } catch (e) {
      setState(() {
        _error = e.toString();
        _isLoading = false;
      });
    }
  }

  Future<void> _loadMorePets() async {
    if (_isLoading || !_hasMore) return;

    setState(() => _isLoading = true);

    try {
      final token = ref.read(authProvider).token;
      if (token == null) return;

      final nextPage = _currentPage + 1;
      final response = await _apiService.getPets(
        token: token,
        page: nextPage.toString(),
        limit: '20',
        country: _selectedCountry == 'ALL' ? null : _selectedCountry,
      );

      setState(() {
        _pets.addAll(response.pets);
        _currentPage = nextPage;
        _hasMore = response.pets.length == 20;
        _isLoading = false;
      });
    } catch (e) {
      setState(() => _isLoading = false);
    }
  }

  List<Pet> get _filteredPets {
    var filtered = _pets;
    
    // Search filter
    if (_searchQuery.isNotEmpty) {
      filtered = filtered.where((pet) {
        final name = pet.displayName?.toLowerCase() ?? '';
        final username = pet.username?.toLowerCase() ?? '';
        final query = _searchQuery.toLowerCase();
        return name.contains(query) || username.contains(query);
      }).toList();
    }
    
    // Sort
    switch (_sortBy) {
      case 'price_asc':
        filtered.sort((a, b) {
          final priceA = int.tryParse(a.currentPriceWei ?? '0') ?? 0;
          final priceB = int.tryParse(b.currentPriceWei ?? '0') ?? 0;
          return priceA.compareTo(priceB);
        });
        break;
      case 'price_desc':
        filtered.sort((a, b) {
          final priceA = int.tryParse(a.currentPriceWei ?? '0') ?? 0;
          final priceB = int.tryParse(b.currentPriceWei ?? '0') ?? 0;
          return priceB.compareTo(priceA);
        });
        break;
      case 'popular':
        filtered.sort((a, b) {
          final purchasesA = a.totalPurchases ?? 0;
          final purchasesB = b.totalPurchases ?? 0;
          return purchasesB.compareTo(purchasesA);
        });
        break;
    }
    
    return filtered;
  }

  String _formatPrice(String? price) {
    // Off-chain PCASH prices are plain integers (the source of truth), not wei.
    final value = int.tryParse(price ?? '') ?? 0;
    if (value >= 1000000) return '${(value / 1000000).toStringAsFixed(1)}M PCASH';
    if (value >= 1000) return '${(value / 1000).toStringAsFixed(1)}K PCASH';
    return '$value PCASH';
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
              AppTokens.accent,
              AppTokens.textHi,
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
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Pet Marketplace',
                            style: AppTokens.textStyles.h2,
                          ),
                          Text(
                            'Buy unique NFT pets',
                            style: AppTokens.textStyles.body.copyWith(color: AppTokens.textMid),
                          ),
                        ],
                      ),
                    ),
                    // My Pets button
                    GestureDetector(
                      onTap: () => Navigator.pushNamed(context, '/my-pets'),
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
                            const Icon(Icons.pets, color: AppTokens.accent, size: 18),
                            const SizedBox(width: 6),
                            Text(
                              'My Pets',
                              style: AppTokens.textStyles.label,
                            ),
                          ],
                        ),
                      ),
                    ),
                  ],
                ),
              ),

              // Search Bar
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                child: Container(
                  decoration: BoxDecoration(
                    color: AppTokens.surface2,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: AppTokens.border),
                  ),
                  child: TextField(
                    onChanged: (value) {
                      setState(() => _searchQuery = value);
                    },
                    style: const TextStyle(color: AppTokens.textHi),
                    decoration: InputDecoration(
                      hintText: 'Search pets by name...',
                      hintStyle: TextStyle(color: AppTokens.textMid),
                      prefixIcon: const Icon(Icons.search, color: AppTokens.textMid),
                      suffixIcon: _searchQuery.isNotEmpty
                          ? IconButton(
                              icon: const Icon(Icons.clear, color: AppTokens.textMid),
                              onPressed: () {
                                setState(() => _searchQuery = '');
                              },
                            )
                          : null,
                      border: InputBorder.none,
                      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                    ),
                  ),
                ),
              ),

              const SizedBox(height: 12),

              // Filters
              SingleChildScrollView(
                scrollDirection: Axis.horizontal,
                padding: const EdgeInsets.symmetric(horizontal: 16),
                child: Row(
                  children: [
                    // Country filter
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12),
                      decoration: BoxDecoration(
                        color: AppTokens.surface2,
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(color: AppTokens.border),
                      ),
                      child: DropdownButtonHideUnderline(
                        child: DropdownButton<String>(
                          value: _selectedCountry ?? 'ALL',
                          dropdownColor: AppTokens.textHi,
                          icon: const Icon(Icons.arrow_drop_down, color: AppTokens.textMid, size: 20),
                          style: AppTokens.textStyles.body,
                          onChanged: (value) {
                            setState(() {
                              _selectedCountry = value;
                            });
                            _loadPets();
                          },
                          items: _countries.map((country) {
                            return DropdownMenuItem<String>(
                              value: country['code'],
                              child: Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  Text(country['flag']!, style: const TextStyle(fontSize: 16)),
                                  const SizedBox(width: 6),
                                  Text(country['name']!, style: const TextStyle(fontSize: 13)),
                                ],
                              ),
                            );
                          }).toList(),
                        ),
                      ),
                    ),
                    
                    const SizedBox(width: 8),
                    
                    // Sort filter
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12),
                      decoration: BoxDecoration(
                        color: AppTokens.surface2,
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(color: AppTokens.border),
                      ),
                      child: DropdownButtonHideUnderline(
                        child: DropdownButton<String>(
                          value: _sortBy,
                          dropdownColor: AppTokens.textHi,
                          icon: const Icon(Icons.sort, color: AppTokens.textMid, size: 18),
                          style: AppTokens.textStyles.body,
                          onChanged: (value) {
                            if (value != null) {
                              setState(() => _sortBy = value);
                            }
                          },
                          items: [
                            DropdownMenuItem(
                              value: 'price_asc',
                              child: Row(
                                children: [
                                  const Icon(Icons.arrow_upward, size: 14, color: AppTokens.textMid),
                                  const SizedBox(width: 6),
                                  Text('Price: Low to High', style: AppTokens.textStyles.bodySm),
                                ],
                              ),
                            ),
                            DropdownMenuItem(
                              value: 'price_desc',
                              child: Row(
                                children: [
                                  const Icon(Icons.arrow_downward, size: 14, color: AppTokens.textMid),
                                  const SizedBox(width: 6),
                                  Text('Price: High to Low', style: AppTokens.textStyles.bodySm),
                                ],
                              ),
                            ),
                            DropdownMenuItem(
                              value: 'popular',
                              child: Row(
                                children: [
                                  const Icon(Icons.trending_up, size: 14, color: AppTokens.textMid),
                                  const SizedBox(width: 6),
                                  Text('Most Popular', style: AppTokens.textStyles.bodySm),
                                ],
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                    
                    const SizedBox(width: 8),
                    
                    // Refresh button
                    GestureDetector(
                      onTap: _loadPets,
                      child: Container(
                        padding: const EdgeInsets.all(10),
                        decoration: BoxDecoration(
                          color: AppTokens.surface2,
                          borderRadius: BorderRadius.circular(AppTokens.r12),
                          border: Border.all(color: AppTokens.border),
                        ),
                        child: const Icon(Icons.refresh, color: AppTokens.textMid, size: 18),
                      ),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 16),

              // Pets Grid
              Expanded(
                child: _error.isNotEmpty
                    ? _buildErrorWidget()
                    : _filteredPets.isEmpty && !_isLoading
                        ? _buildEmptyWidget()
                        : GridView.builder(
                            controller: _scrollController,
                            padding: const EdgeInsets.symmetric(horizontal: 16),
                            gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                              crossAxisCount: 2,
                              childAspectRatio: 0.75,
                              crossAxisSpacing: 12,
                              mainAxisSpacing: 12,
                            ),
                            itemCount: _filteredPets.length + (_hasMore ? 1 : 0),
                            itemBuilder: (context, index) {
                              if (index >= _filteredPets.length) {
                                return const Center(
                                  child: CircularProgressIndicator(
                                    color: AppTokens.accent,
                                  ),
                                );
                              }
                              
                              final pet = _filteredPets[index];
                              return _buildPetCard(pet);
                            },
                          ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildPetCard(Pet pet) {
    final isLocked = pet.isLocked ?? false;
    
    return GestureDetector(
      onTap: () => Navigator.pushNamed(
        context,
        '/pet-detail',
        arguments: {'tokenId': pet.tokenId.toString()},
      ),
      child: Container(
        decoration: BoxDecoration(
          gradient: LinearGradient(
            colors: isLocked
                ? [AppTokens.surface2, AppTokens.bg]
                : [
                    AppTokens.accent.withOpacity(0.8),
                    AppTokens.accent.withOpacity(0.6),
                  ],
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          ),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: isLocked
                ? AppTokens.border
                : AppTokens.border,
          ),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Avatar area
            Expanded(
              flex: 3,
              child: Container(
                decoration: BoxDecoration(
                  color: Colors.black.withOpacity(0.2),
                  borderRadius: const BorderRadius.vertical(top: Radius.circular(16)),
                ),
                child: Center(
                  child: AvatarDisplay(
                    avataaarsConfig: pet.avataaarsConfig,
                    notionConfig: pet.bitmojiConfig,
                    avatarIpfsHash: pet.avatarIpfsHash,
                    size: 80,
                    fallback: _buildAvatarPlaceholder(pet),
                  ),
                ),
              ),
            ),
            
            // Info area
            Expanded(
              flex: 2,
              child: Padding(
                padding: const EdgeInsets.all(12),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            pet.displayName ?? 'Unknown',
                            style: AppTokens.textStyles.body.copyWith(fontWeight: FontWeight.w600),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                        if (pet.isVerified ?? false)
                          const Icon(Icons.verified, color: AppTokens.success, size: 14),
                      ],
                    ),
                    const SizedBox(height: 2),
                    Text(
                      '@${pet.username ?? 'unknown'}',
                      style: AppTokens.textStyles.label.copyWith(color: AppTokens.textMid),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const Spacer(),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          _formatPrice(pet.currentPriceWei),
                          style: AppTokens.textStyles.body.copyWith(
                            color: AppTokens.accent,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                        if (isLocked)
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                            decoration: BoxDecoration(
                              color: AppTokens.danger.withOpacity(0.3),
                              borderRadius: BorderRadius.circular(4),
                            ),
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                const Icon(Icons.lock, color: AppTokens.danger, size: 10),
                                const SizedBox(width: 2),
                                Text(
                                  'LOCKED',
                                  style: AppTokens.textStyles.label.copyWith(
                                    color: AppTokens.danger,
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
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildAvatarPlaceholder(Pet pet) {
    return Container(
      width: 80,
      height: 80,
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [AppTokens.accent, AppTokens.accent],
        ),
        shape: BoxShape.circle,
      ),
      child: Center(
        child: Text(
          pet.displayName?.substring(0, 1).toUpperCase() ?? '?',
          style: AppTokens.textStyles.display1,
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
          const SizedBox(height: 8),
          Text(
            _error,
            style: AppTokens.textStyles.bodySm.copyWith(color: AppTokens.textMid),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 16),
          ElevatedButton(
            onPressed: _loadPets,
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
          const Icon(Icons.search_off, size: 64, color: AppTokens.textMid),
          const SizedBox(height: 16),
          Text(
            'No pets found',
            style: AppTokens.textStyles.h2,
          ),
          const SizedBox(height: 8),
          Text(
            'Try adjusting your filters',
            style: AppTokens.textStyles.body,
          ),
        ],
      ),
    );
  }
}
