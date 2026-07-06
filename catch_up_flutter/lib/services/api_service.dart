import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:logger/logger.dart';
import '../models/auth_models.dart';
import '../models/user_models.dart';
import '../models/pet_models.dart';
import '../models/notion_avatar.dart';
import '../models/avataaars.dart';

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
  
  /// POST /auth/team-login - DEV/TEAM ONLY. Issues a real JWT from a shared
  /// secret so the app can talk to the real backend without wallet signing.
  Future<String> teamLogin({required String secret, String? name}) async {
    final response = await _dio.post('/auth/team-login', data: {
      'secret': secret,
      if (name != null) 'name': name,
    });
    return response.data['token'] as String;
  }

  /// POST /auth/register - email/password signup. Returns tokens + user.
  Future<AuthResponse> register({
    required String email,
    required String password,
    String? displayName,
  }) async {
    try {
      final response = await _dio.post('/auth/register', data: {
        'email': email,
        'password': password,
        if (displayName != null && displayName.isNotEmpty) 'displayName': displayName,
      });
      return AuthResponse.fromJson(response.data);
    } catch (e) {
      throw _handleError(e);
    }
  }

  /// POST /auth/login - email/password login. Returns tokens + user.
  Future<AuthResponse> login({
    required String email,
    required String password,
  }) async {
    try {
      final response = await _dio.post('/auth/login', data: {
        'email': email,
        'password': password,
      });
      return AuthResponse.fromJson(response.data);
    } catch (e) {
      throw _handleError(e);
    }
  }

  /// POST /auth/logout - stateless server ack; client drops its tokens.
  Future<void> logout(String token) async {
    try {
      await _dio.post(
        '/auth/logout',
        options: Options(headers: {'Authorization': 'Bearer $token'}),
      );
    } catch (_) {
      // Logout is best-effort; ignore network errors.
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
    String? displayName,
    String? username,
    String? bio,
    String? countryCode,
    List<String>? interests,
    String? avatarUrl,
    Map<String, dynamic>? cartoonAvatar,
    List<String>? photos,
  }) async {
    try {
      final data = <String, dynamic>{};
      if (displayName != null && displayName.isNotEmpty) data['displayName'] = displayName;
      if (username != null && username.isNotEmpty) data['username'] = username;
      if (bio != null && bio.isNotEmpty) data['bio'] = bio;
      if (countryCode != null && countryCode.isNotEmpty) data['countryCode'] = countryCode;
      if (interests != null && interests.isNotEmpty) data['interests'] = interests;
      if (avatarUrl != null && avatarUrl.isNotEmpty) data['avatarUrl'] = avatarUrl;
      if (cartoonAvatar != null) data['cartoonAvatar'] = cartoonAvatar;
      if (photos != null) data['photos'] = photos;

      final response = await _dio.put(
        '/users/me',
        data: data,
        options: Options(headers: {'Authorization': 'Bearer $token'}),
      );
      return User.fromJson(response.data);
    } catch (e) {
      throw _handleError(e);
    }
  }

  /// GET /users/me/bitmoji — fetch current Notion avatar config + SVG
  Future<BitmojiResponse> getBitmoji({required String token}) async {
    try {
      final response = await _dio.get(
        '/users/me/bitmoji',
        options: Options(headers: {'Authorization': 'Bearer $token'}),
      );
      return BitmojiResponse.fromJson(response.data);
    } catch (e) {
      throw _handleError(e);
    }
  }

  /// PATCH /users/me/bitmoji — update Notion avatar config (customizer)
  Future<BitmojiResponse> updateBitmoji({
    required String token,
    required Map<String, dynamic> config,
  }) async {
    try {
      final response = await _dio.patch(
        '/users/me/bitmoji',
        data: config,
        options: Options(headers: {'Authorization': 'Bearer $token'}),
      );
      return BitmojiResponse.fromJson(response.data);
    } catch (e) {
      throw _handleError(e);
    }
  }

  /// POST /users/me/bitmoji/generate — generate from photo
  Future<BitmojiResponse> generateBitmoji({
    required String token,
    required Uint8List photoBytes,
  }) async {
    try {
      final form = FormData.fromMap({
        'photo': MultipartFile.fromBytes(
          photoBytes,
          filename: 'photo.jpg',
          contentType: DioMediaType('image', 'jpeg'),
        ),
      });
      final response = await _dio.post(
        '/users/me/bitmoji/generate',
        data: form,
        options: Options(headers: {'Authorization': 'Bearer $token'}),
      );
      return BitmojiResponse.fromJson(response.data);
    } catch (e) {
      throw _handleError(e);
    }
  }

  /// GET /users/me/avataaars — fetch current Avataaars config + SVG
  Future<AvataaarsResponse> getAvataaars({required String token}) async {
    try {
      final response = await _dio.get(
        '/users/me/avataaars',
        options: Options(headers: {'Authorization': 'Bearer $token'}),
      );
      return AvataaarsResponse.fromJson(response.data);
    } catch (e) {
      throw _handleError(e);
    }
  }

  /// PATCH /users/me/avataaars — update Avataaars config (customizer)
  Future<AvataaarsResponse> updateAvataaars({
    required String token,
    required Map<String, dynamic> config,
  }) async {
    try {
      final response = await _dio.patch(
        '/users/me/avataaars',
        data: config,
        options: Options(headers: {'Authorization': 'Bearer $token'}),
      );
      return AvataaarsResponse.fromJson(response.data);
    } catch (e) {
      throw _handleError(e);
    }
  }

  /// POST /users/me/avataaars/randomize — server-generated random config
  Future<AvataaarsResponse> randomizeAvataaars({required String token}) async {
    try {
      final response = await _dio.post(
        '/users/me/avataaars/randomize',
        options: Options(headers: {'Authorization': 'Bearer $token'}),
      );
      return AvataaarsResponse.fromJson(response.data);
    } catch (e) {
      throw _handleError(e);
    }
  }

  /// POST /users/me/avataaars/generate — generate from photo frames
  Future<AvataaarsResponse> generateAvataaars({
    required String token,
    required Uint8List photoBytes,
  }) async {
    try {
      final form = FormData.fromMap({
        'frame0': MultipartFile.fromBytes(
          photoBytes,
          filename: 'frame0.jpg',
          contentType: DioMediaType('image', 'jpeg'),
        ),
      });
      final response = await _dio.post(
        '/users/me/avataaars/generate',
        data: form,
        options: Options(headers: {'Authorization': 'Bearer $token'}),
      );
      return AvataaarsResponse.fromJson(response.data);
    } catch (e) {
      throw _handleError(e);
    }
  }

  /// POST /users/me/avatar — upload a rendered PNG of the avatar to IPFS.
  /// Returns the gateway URL (and sets the user's avatar_ipfs_hash server-side)
  /// so non-Flutter consumers can display the avatar as an image.
  Future<String?> uploadAvatarPng({
    required String token,
    required Uint8List bytes,
  }) async {
    try {
      final form = FormData.fromMap({
        'file': MultipartFile.fromBytes(
          bytes,
          filename: 'cartoon-avatar.png',
          contentType: DioMediaType('image', 'png'),
        ),
      });
      final response = await _dio.post(
        '/users/me/avatar',
        data: form,
        options: Options(headers: {'Authorization': 'Bearer $token'}),
      );
      return response.data['url'] as String?;
    } catch (e) {
      throw _handleError(e);
    }
  }

  /// POST /users/me/photos — upload up to 6 profile photos to IPFS.
  /// Sends one multipart field per photo (photo0…photo5). Returns the server's
  /// ordered list of IPFS gateway URLs (which replaces the user's photo array).
  Future<List<String>> uploadPhotos({
    required String token,
    required List<Uint8List> photos,
  }) async {
    try {
      final map = <String, dynamic>{};
      for (var i = 0; i < photos.length; i++) {
        map['photo$i'] = MultipartFile.fromBytes(
          photos[i],
          filename: 'photo$i.jpg',
          contentType: DioMediaType('image', 'jpeg'),
        );
      }
      final form = FormData.fromMap(map);
      final response = await _dio.post(
        '/users/me/photos',
        data: form,
        options: Options(headers: {'Authorization': 'Bearer $token'}),
      );
      final list = (response.data['photos'] as List?) ?? const [];
      return list.map((e) => e.toString()).toList();
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

  // ============ TRADING / PETS ============

  /// POST /pets/:tokenId/buy - Buy a pet at current price
  Future<Map<String, dynamic>> buyPet(int tokenId, String token) async {
    try {
      final response = await _dio.post(
        '/pets/$tokenId/buy',
        // Send an empty JSON object: Fastify rejects an empty body when the
        // Content-Type is application/json (FST_ERR_CTP_EMPTY_JSON_BODY → 400).
        data: const <String, dynamic>{},
        options: Options(headers: {'Authorization': 'Bearer $token'}),
      );
      return response.data as Map<String, dynamic>;
    } catch (e) {
      throw _handleError(e);
    }
  }

  /// POST /pets/:tokenId/bid - Place a bid on a pet
  Future<Map<String, dynamic>> placeBid(
    int tokenId,
    String amount, // in wei
    String token,
  ) async {
    try {
      final response = await _dio.post(
        '/pets/$tokenId/bid',
        data: {'amount': amount},
        options: Options(headers: {'Authorization': 'Bearer $token'}),
      );
      return response.data as Map<String, dynamic>;
    } catch (e) {
      throw _handleError(e);
    }
  }

  /// POST /pets/:tokenId/list - List pet for sale
  Future<Map<String, dynamic>> listPetForSale(
    int tokenId,
    String price, // in wei
    String token,
  ) async {
    try {
      final response = await _dio.post(
        '/pets/$tokenId/list',
        data: {'price': price},
        options: Options(headers: {'Authorization': 'Bearer $token'}),
      );
      return response.data as Map<String, dynamic>;
    } catch (e) {
      throw _handleError(e);
    }
  }

  /// GET /pets/:tokenId/bids - Get active bids on a pet
  Future<List<Map<String, dynamic>>> getPetBids(int tokenId, String token) async {
    try {
      final response = await _dio.get(
        '/pets/$tokenId/bids',
        options: Options(headers: {'Authorization': 'Bearer $token'}),
      );
      final bids = response.data['bids'] as List<dynamic>;
      return bids.map((b) => b as Map<String, dynamic>).toList();
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
