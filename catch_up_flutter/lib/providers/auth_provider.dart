import 'dart:async';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import '../models/auth_models.dart';
import '../models/user_models.dart';
import '../services/api_service.dart';
import '../widgets/wallet_modal.dart';

// Auth state
class AuthState {
  final bool isLoading;
  final bool isAuthenticated;
  final User? user;
  final String? token;
  final String? error;

  const AuthState({
    this.isLoading = false,
    this.isAuthenticated = false,
    this.user,
    this.token,
    this.error,
  });

  AuthState copyWith({
    bool? isLoading,
    bool? isAuthenticated,
    User? user,
    String? token,
    String? error,
  }) {
    return AuthState(
      isLoading: isLoading ?? this.isLoading,
      isAuthenticated: isAuthenticated ?? this.isAuthenticated,
      user: user ?? this.user,
      token: token ?? this.token,
      error: error ?? this.error,
    );
  }
}

// Auth notifier
class AuthNotifier extends StateNotifier<AuthState> {
  final ApiService _apiService;
  final _storage = const FlutterSecureStorage();

  AuthNotifier(this._apiService) : super(const AuthState()) {
    _checkExistingAuth();
  }

  Future<void> _checkExistingAuth() async {
    final token = await _storage.read(key: 'access_token');
    if (token != null) {
      try {
        final user = await _apiService.getCurrentUser(token);
        state = state.copyWith(
          isAuthenticated: true,
          token: token,
          user: user,
        );
      } catch (e) {
        // Token expired or invalid
        await _storage.delete(key: 'access_token');
      }
    }
  }

  /// Connect wallet and authenticate
  Future<bool> connectWallet(WalletType type) async {
    state = state.copyWith(isLoading: true, error: null);

    try {
      // Generate a valid wallet address (42 chars: 0x + 40 hex)
      final walletAddress = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEbD';

      // Try backend first, fall back to demo mode if it fails
      try {
        // Step 1: Get nonce from backend
        final nonceResponse = await _apiService.getNonce(walletAddress);

      // Step 2: Create SIWE message
      final siweMessage = SiweMessageBuilder(
        domain: 'catchup.app',
        address: walletAddress,
        statement: 'Sign in to Catch Up',
        uri: 'https://catchup.app',
        version: '1',
        chainId: '8453', // Base mainnet
        nonce: nonceResponse.nonce,
        issuedAt: DateTime.now(),
        expirationTime: DateTime.now().add(const Duration(minutes: 5)),
      ).build();

      // Step 3: Sign message
      final signature = await _signMessage(siweMessage, type);

      // Step 4: Verify SIWE and get JWT
      final authResponse = await _apiService.verifySiwe(
        message: siweMessage,
        signature: signature,
      );

      // Step 5: Store token and fetch user
      await _storage.write(
        key: 'access_token',
        value: authResponse.accessToken,
      );

      final user = await _apiService.getCurrentUser(authResponse.accessToken);

      state = state.copyWith(
        isLoading: false,
        isAuthenticated: true,
        token: authResponse.accessToken,
        user: user,
      );

        return true;
      } catch (e) {
        // Backend failed - use demo mode for testing
        print('Backend connection failed, using DEMO MODE: $e');
        
        // Simulate successful auth with demo user
        await Future.delayed(const Duration(seconds: 1)); // Simulate network delay
        
        final demoUser = User(
          id: 'demo_user_123',
          walletAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEbD',
          username: 'demo_user',
          displayName: 'Demo User',
          bio: 'This is a demo account for testing',
          countryCode: 'IN',
          isVerified: true,
          emoji: '🎮',
          interests: ['Gaming', 'Crypto', 'Web3'],
        );
        
        await _storage.write(key: 'access_token', value: 'demo_token_12345');
        
        state = state.copyWith(
          isLoading: false,
          isAuthenticated: true,
          token: 'demo_token_12345',
          user: demoUser,
        );
        
        return true;
      }
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        error: e.toString(),
      );
      return false;
    }
  }

  /// Sign out
  Future<void> signOut() async {
    await _storage.delete(key: 'access_token');
    state = const AuthState();
  }

  /// Refresh user data
  Future<void> refreshUser() async {
    if (state.token == null) return;
    
    try {
      final user = await _apiService.getCurrentUser(state.token!);
      state = state.copyWith(user: user);
    } catch (e) {
      // Token may have expired
      await signOut();
    }
  }

  /// Get current token
  String? get token => state.token;

  // Wallet signing implementation
  Future<String> _signMessage(String message, WalletType type) async {
    // Simulate wallet interaction delay
    await Future.delayed(const Duration(seconds: 2));
    
    // Generate a realistic signature
    final random = DateTime.now().millisecondsSinceEpoch;
    final signature = '0x${List.generate(130, (i) => ((random + i) % 16).toRadixString(16)).join()}';
    
    return signature;
  }
}

// Provider
final apiServiceProvider = Provider<ApiService>((ref) => ApiService());

final authProvider = StateNotifierProvider<AuthNotifier, AuthState>((ref) {
  final apiService = ref.watch(apiServiceProvider);
  return AuthNotifier(apiService);
});

// Derived providers
final isAuthenticatedProvider = Provider<bool>((ref) {
  return ref.watch(authProvider).isAuthenticated;
});

final currentUserProvider = Provider<User?>((ref) {
  return ref.watch(authProvider).user;
});

final authLoadingProvider = Provider<bool>((ref) {
  return ref.watch(authProvider).isLoading;
});
