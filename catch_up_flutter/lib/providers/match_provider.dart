import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/user_models.dart';
import '../services/api_service.dart';
import 'auth_provider.dart';

/// Active discovery filters. Null fields mean "no constraint".
class DiscoverFilters {
  final int minAge;
  final int maxAge;
  final String? gender; // 'male' | 'female' | 'nonbinary' | 'other' | null (any)

  const DiscoverFilters({
    this.minAge = 18,
    this.maxAge = 60,
    this.gender,
  });

  DiscoverFilters copyWith({int? minAge, int? maxAge, String? gender, bool clearGender = false}) {
    return DiscoverFilters(
      minAge: minAge ?? this.minAge,
      maxAge: maxAge ?? this.maxAge,
      gender: clearGender ? null : (gender ?? this.gender),
    );
  }

  /// Only send age bounds to the backend when narrowed from the full range.
  int? get minAgeParam => minAge > 18 ? minAge : null;
  int? get maxAgeParam => maxAge < 60 ? maxAge : null;
}

final discoverFiltersProvider =
    StateProvider<DiscoverFilters>((ref) => const DiscoverFilters());

// Discover candidates provider — refetches when filters change.
final discoverCandidatesProvider = FutureProvider<List<DiscoverCandidate>>((ref) async {
  final apiService = ref.read(apiServiceProvider);
  final token = ref.read(authProvider).token;
  final filters = ref.watch(discoverFiltersProvider);

  if (token == null) {
    throw Exception('Not authenticated');
  }

  // Let errors propagate so the swipe screen can show a real error state
  // instead of silently masking failures with mock profiles.
  final response = await apiService.discoverMatches(
    token: token,
    limit: '20',
    minAge: filters.minAgeParam,
    maxAge: filters.maxAgeParam,
    gender: filters.gender,
  );
  return response.candidates;
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

  Future<MatchResult?> likeUser(String targetUserId) async {
    final token = _token;
    if (token == null) return null;

    state = const AsyncValue.loading();
    try {
      final result = await _apiService.likeUser(targetUserId, token);
      state = const AsyncValue.data(null);
      return result;
    } catch (e) {
      state = AsyncValue.error(e, StackTrace.current);
      return null;
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
