import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/user_models.dart';
import '../services/api_service.dart';
import 'auth_provider.dart';

// API Service provider
final apiServiceProvider = Provider<ApiService>((ref) => ApiService());

// Discover candidates provider
final discoverCandidatesProvider = FutureProvider<List<DiscoverCandidate>>((ref) async {
  final apiService = ref.read(apiServiceProvider);
  final token = ref.read(authProvider).token;
  
  if (token == null) {
    throw Exception('Not authenticated');
  }
  
  try {
    final response = await apiService.getDiscoverCandidates(token);
    return response.candidates;
  } catch (e) {
    // Return mock data for demo if API fails
    return _mockCandidates;
  }
});

// Matches provider
final matchesProvider = FutureProvider<List<Match>>((ref) async {
  final apiService = ref.read(apiServiceProvider);
  final token = ref.read(authProvider).token;
  
  if (token == null) {
    throw Exception('Not authenticated');
  }
  
  try {
    return await apiService.getMatches(token);
  } catch (e) {
    // Return mock data for demo
    return _mockMatches;
  }
});

// Like/Pass actions
class MatchActionNotifier extends StateNotifier<AsyncValue<void>> {
  final ApiService _apiService;
  final String? _token;

  MatchActionNotifier(this._apiService, this._token) : super(const AsyncValue.data(null));

  Future<void> likeUser(String targetUserId) async {
    final token = _token;
    if (token == null) return;
    
    state = const AsyncValue.loading();
    try {
      await _apiService.likeUser(targetUserId, token);
      state = const AsyncValue.data(null);
    } catch (e) {
      state = AsyncValue.error(e, StackTrace.current);
    }
  }

  Future<void> passUser(String targetUserId) async {
    final token = _token;
    if (token == null) return;
    
    state = const AsyncValue.loading();
    try {
      await _apiService.passUser(targetUserId, token);
      state = const AsyncValue.data(null);
    } catch (e) {
      state = AsyncValue.error(e, StackTrace.current);
    }
  }
}

final matchActionProvider = StateNotifierProvider<MatchActionNotifier, AsyncValue<void>>((ref) {
  final apiService = ref.read(apiServiceProvider);
  final token = ref.read(authProvider).token;
  return MatchActionNotifier(apiService, token);
});

// Mock data for demo
final _mockCandidates = [
  DiscoverCandidate(
    id: '1',
    displayName: 'Priya',
    username: 'priya_26',
    countryCode: 'IN',
    isVerified: true,
    bio: 'Love traveling and coffee. Looking for someone to explore the world with.',
    tokenId: 101,
  ),
  DiscoverCandidate(
    id: '2',
    displayName: 'Arjun',
    username: 'arjun_dev',
    countryCode: 'IN',
    isVerified: true,
    bio: 'Blockchain developer by day, musician by night.',
    tokenId: 102,
  ),
  DiscoverCandidate(
    id: '3',
    displayName: 'Maya',
    username: 'maya_art',
    countryCode: 'IN',
    isVerified: false,
    bio: 'Digital artist and crypto enthusiast.',
    tokenId: 103,
  ),
  DiscoverCandidate(
    id: '4',
    displayName: 'Rahul',
    username: 'rahul_gym',
    countryCode: 'IN',
    isVerified: true,
    bio: 'Fitness coach and NFT collector.',
    tokenId: 104,
  ),
  DiscoverCandidate(
    id: '5',
    displayName: 'Ananya',
    username: 'ananya_writes',
    countryCode: 'IN',
    isVerified: false,
    bio: 'Writer, reader, dreamer.',
    tokenId: 105,
  ),
];

final _mockMatches = [
  Match(
    id: 'match1',
    partnerId: 'user2',
    displayName: 'Neha',
    username: 'neha_crypto',
    compatibilityScore: 0.89,
    matchedAt: DateTime.now().subtract(const Duration(days: 2)),
    isVerified: true,
    lastMessage: 'Hey! Loved your profile',
    lastMessageAt: DateTime.now().subtract(const Duration(hours: 2)),
  ),
  Match(
    id: 'match2',
    partnerId: 'user3',
    displayName: 'Vikram',
    username: 'vikram_base',
    compatibilityScore: 0.76,
    matchedAt: DateTime.now().subtract(const Duration(days: 5)),
    isVerified: true,
    lastMessage: 'When are you free to meet?',
    lastMessageAt: DateTime.now().subtract(const Duration(days: 1)),
  ),
];
