import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:logger/logger.dart';
import '../models/auth_models.dart';
import '../models/user_models.dart';
import '../models/pet_models.dart';

class ApiService {
  late final Dio _dio;
  final Logger _logger = Logger();
  
  static const String baseUrl = 'https://baebackend-production.up.railway.app';
  
  /// Set to true for offline demo mode (no backend required)
  static const bool demoMode = false;
  
  ApiService() {
    _dio = Dio(
      BaseOptions(
        baseUrl: baseUrl,
        connectTimeout: const Duration(seconds: 30),
        receiveTimeout: const Duration(seconds: 30),
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      ),
    );
    
    _dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) {
          _logger.i('${options.method} ${options.path}');
          if (options.headers.containsKey('Authorization')) {
            _logger.d('Token: ${options.headers['Authorization']}');
          }
          return handler.next(options);
        },
        onResponse: (response, handler) {
          _logger.i('${response.statusCode} ${response.requestOptions.path}');
          return handler.next(response);
        },
        onError: (DioException error, handler) {
          _logger.e('Error: ${error.message}');
          if (error.response != null) {
            _logger.e('Response: ${error.response?.data}');
          }
          return handler.next(error);
        },
      ),
    );
  }
  
  // ============ AUTH ENDPOINTS ============
  
  /// GET /auth/nonce/:wallet - Get SIWE nonce for wallet
  Future<NonceResponse> getNonce(String walletAddress) async {
    if (demoMode) {
      return NonceResponse(nonce: 'demo_nonce_123456789');
    }
    try {
      final response = await _dio.get('/auth/nonce/$walletAddress');
      return NonceResponse.fromJson(response.data);
    } catch (e) {
      throw _handleError(e);
    }
  }
  
  /// POST /auth/siwe - Verify SIWE signature and get JWT
  Future<AuthResponse> verifySiwe({
    required String message,
    required String signature,
  }) async {
    if (demoMode) {
      return AuthResponse(
        accessToken: 'demo_token_12345',
        user: UserAuth(
          id: 'demo_user_123',
          wallet: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEbD',
          username: 'demo_user',
          displayName: 'Demo User',
        ),
      );
    }
    try {
      final response = await _dio.post('/auth/siwe', data: {
        'message': message,
        'signature': signature,
      });
      return AuthResponse.fromJson(response.data);
    } catch (e) {
      throw _handleError(e);
    }
  }
  
  // ============ USER ENDPOINTS ============
  
  /// GET /users/me - Get current user profile
  Future<User> getCurrentUser(String token) async {
    if (demoMode) {
      return User(
        id: 'demo_user_123',
        walletAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEbD',
        username: 'demo_user',
        displayName: 'Demo User',
        bio: 'Demo account for testing',
        countryCode: 'IN',
        isVerified: true,
        emoji: '🎮',
        interests: ['Gaming', 'Crypto', 'Web3'],
      );
    }
    try {
      final response = await _dio.get(
        '/users/me',
        options: Options(headers: {'Authorization': 'Bearer $token'}),
      );
      return User.fromJson(response.data);
    } catch (e) {
      throw _handleError(e);
    }
  }
  
  /// POST /users/me/push-token - Register push token
  Future<void> registerPushToken(String token, String pushToken) async {
    try {
      await _dio.post(
        '/users/me/push-token',
        data: {'token': pushToken},
        options: Options(headers: {'Authorization': 'Bearer $token'}),
      );
    } catch (e) {
      throw _handleError(e);
    }
  }

  /// PUT /users/me - Update user profile
  Future<User> updateProfile({
    required String token,
    required String displayName,
    required String username,
    required String bio,
    required String countryCode,
    required List<String> interests,
    String? avatarUrl,
  }) async {
    try {
      final response = await _dio.put(
        '/users/me',
        data: {
          'displayName': displayName,
          'username': username,
          'bio': bio,
          'countryCode': countryCode,
          'interests': interests,
          if (avatarUrl != null) 'avatarUrl': avatarUrl,
        },
        options: Options(headers: {'Authorization': 'Bearer $token'}),
      );
      return User.fromJson(response.data);
    } catch (e) {
      throw _handleError(e);
    }
  }
  
  // ============ PETS ENDPOINTS ============
  
  /// GET /pets - Browse all active pets with pagination
  Future<PetsResponse> getPets({
    String? page,
    String? limit,
    String? country,
    required String token,
  }) async {
    try {
      final queryParams = <String, dynamic>{
        if (page != null) 'page': page,
        if (limit != null) 'limit': limit,
        if (country != null) 'country': country,
      };
      
      final response = await _dio.get(
        '/pets',
        queryParameters: queryParams,
        options: Options(headers: {'Authorization': 'Bearer $token'}),
      );
      return PetsResponse.fromJson(response.data);
    } catch (e) {
      throw _handleError(e);
    }
  }
  
  /// GET /pets/:tokenId - Get specific pet details
  Future<Pet> getPet(String tokenId, String authToken) async {
    try {
      final response = await _dio.get(
        '/pets/$tokenId',
        options: Options(headers: {'Authorization': 'Bearer $authToken'}),
      );
      return Pet.fromJson(response.data);
    } catch (e) {
      throw _handleError(e);
    }
  }
  
  /// GET /pets/portfolio/:walletAddress - Get owned pets
  Future<List<Pet>> getPortfolio(String walletAddress, String token) async {
    try {
      final response = await _dio.get(
        '/pets/portfolio/$walletAddress',
        options: Options(headers: {'Authorization': 'Bearer $token'}),
      );
      return (response.data['portfolio'] as List)
          .map((e) => Pet.fromJson(e))
          .toList();
    } catch (e) {
      throw _handleError(e);
    }
  }
  
  // ============ MATCHES ENDPOINTS ============
  
  /// GET /matches/discover - Get swipe candidates
  Future<DiscoverResponse> discoverMatches({
    String? limit,
    String? offset,
    String? country,
    required String token,
  }) async {
    if (demoMode) {
      // Return mock candidates
      final mockCandidates = [
        DiscoverCandidate(
          id: 'user_1',
          displayName: 'Sarah',
          username: 'sarah_c',
          bio: 'Love hiking and coffee ☕',
          countryCode: 'US',
          isVerified: true,
        ),
        DiscoverCandidate(
          id: 'user_2',
          displayName: 'Alex',
          username: 'alex_w',
          bio: 'Web3 developer 🚀',
          countryCode: 'UK',
          isVerified: true,
        ),
      ];
      return DiscoverResponse(candidates: mockCandidates);
    }
    try {
      final queryParams = <String, dynamic>{
        if (limit != null) 'limit': limit,
        if (offset != null) 'offset': offset,
        if (country != null) 'country': country,
      };
      
      final response = await _dio.get(
        '/matches/discover',
        queryParameters: queryParams,
        options: Options(headers: {'Authorization': 'Bearer $token'}),
      );
      return DiscoverResponse.fromJson(response.data);
    } catch (e) {
      throw _handleError(e);
    }
  }

  /// Simplified method for getting discover candidates
  Future<DiscoverResponse> getDiscoverCandidates(String token) async {
    return discoverMatches(token: token, limit: '20');
  }

  /// GET /matches - Get user's matches
  Future<List<Match>> getMatches(String token) async {
    if (demoMode) {
      // Return mock matches
      return [
        Match(
          id: 'match_1',
          partnerId: 'user_1',
          username: 'sarah_c',
          displayName: 'Sarah',
          matchedAt: DateTime.now(),
          lastMessage: 'Hey there! 👋',
        ),
      ];
    }
    try {
      final response = await _dio.get(
        '/matches',
        options: Options(headers: {'Authorization': 'Bearer $token'}),
      );
      return (response.data as List)
          .map((json) => Match.fromJson(json as Map<String, dynamic>))
          .toList();
    } catch (e) {
      throw _handleError(e);
    }
  }
  
  /// POST /matches/like - Like a user
  Future<MatchResult> likeUser(String targetUserId, String token) async {
    if (demoMode) {
      // Return mock like result
      return MatchResult(
        isNewMatch: true,
      );
    }
    try {
      final response = await _dio.post(
        '/matches/like',
        data: {'targetUserId': targetUserId},
        options: Options(headers: {'Authorization': 'Bearer $token'}),
      );
      return MatchResult.fromJson(response.data);
    } catch (e) {
      throw _handleError(e);
    }
  }
  
  /// POST /matches/pass - Pass on a user
  Future<void> passUser(String targetUserId, String token) async {
    try {
      await _dio.post(
        '/matches/pass',
        data: {'targetUserId': targetUserId},
        options: Options(headers: {'Authorization': 'Bearer $token'}),
      );
    } catch (e) {
      throw _handleError(e);
    }
  }
  
  // ============ MESSAGES ENDPOINTS ============

  /// GET /messages/:matchId — load chat history
  Future<List<Map<String, dynamic>>> getMessageHistory(String matchId, String token, {String? before}) async {
    try {
      final queryParams = <String, dynamic>{if (before != null) 'before': before, 'limit': '50'};
      final response = await _dio.get(
        '/messages/$matchId',
        queryParameters: queryParams,
        options: Options(headers: {'Authorization': 'Bearer $token'}),
      );
      final messages = response.data['messages'] as List<dynamic>;
      return messages.map((m) => m as Map<String, dynamic>).toList();
    } catch (e) {
      throw _handleError(e);
    }
  }

  // ============ HEROES / TOURNAMENTS ============
  
  /// GET /heroes/leaderboard
  Future<LeaderboardResponse> getHeroLeaderboard({
    String? page,
    String? limit,
    required String token,
  }) async {
    try {
      final queryParams = <String, dynamic>{
        if (page != null) 'page': page,
        if (limit != null) 'limit': limit,
      };
      
      final response = await _dio.get(
        '/heroes/leaderboard',
        queryParameters: queryParams,
        options: Options(headers: {'Authorization': 'Bearer $token'}),
      );
      return LeaderboardResponse.fromJson(response.data);
    } catch (e) {
      throw _handleError(e);
    }
  }
  
  /// GET /heroes/me - Get current user's hero stats
  Future<HeroStats> getMyHeroStats(String token) async {
    try {
      final response = await _dio.get(
        '/heroes/me',
        options: Options(headers: {'Authorization': 'Bearer $token'}),
      );
      return HeroStats.fromJson(response.data);
    } catch (e) {
      throw _handleError(e);
    }
  }
  
  /// GET /bonus - Claim daily PCASH bonus
  Future<BonusResponse> claimBonus(String token) async {
    try {
      final response = await _dio.get(
        '/bonus',
        options: Options(headers: {'Authorization': 'Bearer $token'}),
      );
      return BonusResponse.fromJson(response.data);
    } catch (e) {
      throw _handleError(e);
    }
  }
  
  // ============ ERROR HANDLING ============
  
  Exception _handleError(dynamic error) {
    if (error is DioException) {
      switch (error.type) {
        case DioExceptionType.connectionTimeout:
        case DioExceptionType.sendTimeout:
        case DioExceptionType.receiveTimeout:
          return TimeoutException('Connection timed out. Please try again.');
        case DioExceptionType.connectionError:
          return NetworkException('No internet connection.');
        case DioExceptionType.badResponse:
          final statusCode = error.response?.statusCode;
          final message = error.response?.data?['error'] ?? 'Unknown error';
          
          switch (statusCode) {
            case 400:
              return BadRequestException(message);
            case 401:
              return UnauthorizedException(message);
            case 429:
              final retryAfter = error.response?.headers.value('Retry-After');
              return RateLimitException(message, retryAfter: retryAfter);
            case 500:
            case 502:
            case 503:
              return ServerException('Server error. Please try again later.');
            default:
              return ApiException(message, statusCode: statusCode);
          }
        default:
          return ApiException(error.message ?? 'Unknown error');
      }
    }
    return ApiException(error.toString());
  }
}

// Custom Exceptions
class ApiException implements Exception {
  final String message;
  final int? statusCode;
  ApiException(this.message, {this.statusCode});
  @override
  String toString() => 'ApiException: $message';
}

class TimeoutException extends ApiException {
  TimeoutException(super.message);
}

class NetworkException extends ApiException {
  NetworkException(super.message);
}

class BadRequestException extends ApiException {
  BadRequestException(super.message);
}

class UnauthorizedException extends ApiException {
  UnauthorizedException(super.message);
}

class RateLimitException extends ApiException {
  final String? retryAfter;
  RateLimitException(super.message, {this.retryAfter});
}

class ServerException extends ApiException {
  ServerException(super.message);
}
