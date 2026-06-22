import 'dart:async';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import '../models/auth_models.dart';
import '../models/user_models.dart';
import '../services/api_service.dart';

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

  /// Register a new account with email + password.
  Future<bool> register({
    required String email,
    required String password,
    String? displayName,
  }) async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      final auth = await _apiService.register(
        email: email,
        password: password,
        displayName: displayName,
      );
      await _persistTokens(auth);
      final user = await _apiService.getCurrentUser(auth.accessToken);
      state = state.copyWith(
        isLoading: false,
        isAuthenticated: true,
        token: auth.accessToken,
        user: user,
      );
      return true;
    } catch (e) {
      state = state.copyWith(isLoading: false, error: e.toString());
      return false;
    }
  }

  /// Log in with email + password.
  Future<bool> login({
    required String email,
    required String password,
  }) async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      final auth = await _apiService.login(email: email, password: password);
      await _persistTokens(auth);
      final user = await _apiService.getCurrentUser(auth.accessToken);
      state = state.copyWith(
        isLoading: false,
        isAuthenticated: true,
        token: auth.accessToken,
        user: user,
      );
      return true;
    } catch (e) {
      state = state.copyWith(isLoading: false, error: e.toString());
      return false;
    }
  }

  Future<void> _persistTokens(AuthResponse auth) async {
    await _storage.write(key: 'access_token', value: auth.accessToken);
    if (auth.refreshToken != null) {
      await _storage.write(key: 'refresh_token', value: auth.refreshToken!);
    }
  }

  /// DEV/TEAM login — gets a REAL JWT from the backend's /auth/team-login
  /// endpoint and loads the real user. No wallet signing required.
  /// This is the path that actually exercises the deployed backend.
  Future<bool> teamLogin({String name = 'sarthak-test'}) async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      final token = await _apiService.teamLogin(
        secret: const String.fromEnvironment('TEAM_SECRET', defaultValue: 'bae4u2026'),
        name: name,
      );
      await _storage.write(key: 'access_token', value: token);
      final user = await _apiService.getCurrentUser(token);
      state = state.copyWith(
        isLoading: false,
        isAuthenticated: true,
        token: token,
        user: user,
      );
      return true;
    } catch (e) {
      state = state.copyWith(isLoading: false, error: e.toString());
      return false;
    }
  }

  /// Sign out
  Future<void> signOut() async {
    final token = state.token;
    if (token != null) {
      await _apiService.logout(token);
    }
    await _storage.delete(key: 'access_token');
    await _storage.delete(key: 'refresh_token');
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
