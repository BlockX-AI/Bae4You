class User {
  final String id;
  final String walletAddress;
  final int? tokenId;

  static int? _parseTokenId(dynamic value) {
    if (value == null) return null;
    if (value is int) return value;
    if (value is String) return int.tryParse(value);
    return null;
  }

  static int _parseInt(dynamic value, int defaultValue) {
    if (value == null) return defaultValue;
    if (value is int) return value;
    if (value is String) return int.tryParse(value) ?? defaultValue;
    return defaultValue;
  }

  static List<String>? _parsePhotos(dynamic value) {
    if (value == null) return null;
    if (value is List) {
      return value.map((e) => e.toString()).toList();
    }
    return null;
  }
  final String? username;
  final String? displayName;
  final String? avatarIpfsHash;
  final String? bio;
  final String? countryCode;
  final String? gender;
  final String? interestedIn;
  final bool? isVerified;
  final bool? isCreator;
  final String? status;
  final DateTime? createdAt;
  final DateTime? lastLoginAt;
  final List<dynamic>? personalityVector;
  final String? emoji;
  final List<String>? interests;
  final String? avatarUrl;
  final Map<String, dynamic>? bitmojiConfig;
  final Map<String, dynamic>? avataaarsConfig;
  final List<String>? photos;
  final int pcashBalance;
  final int goldBalance;
  final int currentValue;

  User({
    required this.id,
    required this.walletAddress,
    this.tokenId,
    this.username,
    this.displayName,
    this.avatarIpfsHash,
    this.bio,
    this.countryCode,
    this.gender,
    this.interestedIn,
    this.isVerified,
    this.isCreator,
    this.status,
    this.createdAt,
    this.lastLoginAt,
    this.personalityVector,
    this.emoji,
    this.interests,
    this.avatarUrl,
    this.bitmojiConfig,
    this.avataaarsConfig,
    this.photos,
    this.pcashBalance = 0,
    this.goldBalance = 0,
    this.currentValue = 0,
  });

  factory User.fromJson(Map<String, dynamic> json) => User(
        id: json['id'] as String,
        walletAddress:
            (json['walletAddress'] ?? json['wallet_address'] ?? '') as String,
        tokenId: _parseTokenId(json['tokenId'] ?? json['token_id']),
        username: json['username'] as String?,
        displayName: json['displayName'] ?? json['display_name'] as String?,
        avatarIpfsHash: json['avatarIpfsHash'] ?? json['avatar_ipfs_hash'] as String?,
        bio: json['bio'] as String?,
        countryCode: json['countryCode'] ?? json['country_code'] as String?,
        gender: json['gender'] as String?,
        interestedIn: json['interestedIn'] ?? json['interested_in'] as String?,
        isVerified: json['isVerified'] ?? json['is_verified'] as bool?,
        isCreator: json['isCreator'] ?? json['is_creator'] as bool?,
        status: json['status'] as String?,
        createdAt: json['createdAt'] != null
            ? DateTime.parse(json['createdAt'] as String)
            : null,
        lastLoginAt: json['lastLoginAt'] != null
            ? DateTime.parse(json['lastLoginAt'] as String)
            : null,
        personalityVector: json['personalityVector'] ?? json['personality_vector'] as List<dynamic>?,
        emoji: json['emoji'] as String?,
        interests: json['interests'] != null
            ? List<String>.from(json['interests'] as List)
            : null,
        avatarUrl: json['avatarUrl'] ?? json['avatar_url'] as String?,
        bitmojiConfig: (json['bitmojiConfig'] ?? json['bitmoji_config'])
            as Map<String, dynamic>?,
        avataaarsConfig: (json['avataaarsConfig'] ?? json['avataaars_config'])
            as Map<String, dynamic>?,
        photos: User._parsePhotos(json['photos']),
        pcashBalance: User._parseInt(json['pcashBalance'] ?? json['pcash_balance'], 0),
        goldBalance: User._parseInt(json['goldBalance'] ?? json['gold_balance'], 0),
        currentValue: User._parseInt(json['currentValue'] ?? json['current_value'], 0),
      );

  Map<String, dynamic> toJson() => {
        'id': id,
        'walletAddress': walletAddress,
        'tokenId': tokenId,
        'username': username,
        'displayName': displayName,
        'avatarIpfsHash': avatarIpfsHash,
        'bio': bio,
        'countryCode': countryCode,
        'gender': gender,
        'interestedIn': interestedIn,
        'isVerified': isVerified,
        'isCreator': isCreator,
        'status': status,
        'emoji': emoji,
        'interests': interests,
        'avatarUrl': avatarUrl,
        'bitmojiConfig': bitmojiConfig,
        'avataaarsConfig': avataaarsConfig,
        'photos': photos,
        'pcashBalance': pcashBalance,
        'goldBalance': goldBalance,
        'currentValue': currentValue,
      };

  User copyWith({
    String? username,
    String? displayName,
    String? bio,
    String? countryCode,
    String? gender,
    String? interestedIn,
    String? emoji,
    List<String>? interests,
    String? avatarUrl,
    Map<String, dynamic>? bitmojiConfig,
    Map<String, dynamic>? avataaarsConfig,
    List<String>? photos,
    int? pcashBalance,
    int? goldBalance,
    int? currentValue,
  }) =>
      User(
        id: id,
        walletAddress: walletAddress,
        tokenId: tokenId,
        username: username ?? this.username,
        displayName: displayName ?? this.displayName,
        avatarIpfsHash: avatarIpfsHash,
        bio: bio ?? this.bio,
        countryCode: countryCode ?? this.countryCode,
        gender: gender ?? this.gender,
        interestedIn: interestedIn ?? this.interestedIn,
        isVerified: isVerified,
        isCreator: isCreator,
        status: status,
        createdAt: createdAt,
        lastLoginAt: lastLoginAt,
        personalityVector: personalityVector,
        emoji: emoji ?? this.emoji,
        interests: interests ?? this.interests,
        avatarUrl: avatarUrl ?? this.avatarUrl,
        bitmojiConfig: bitmojiConfig ?? this.bitmojiConfig,
        avataaarsConfig: avataaarsConfig ?? this.avataaarsConfig,
        photos: photos ?? this.photos,
        pcashBalance: pcashBalance ?? this.pcashBalance,
        goldBalance: goldBalance ?? this.goldBalance,
        currentValue: currentValue ?? this.currentValue,
      );
}

class Match {
  final String id;
  final double? compatibilityScore;
  final DateTime? matchedAt;
  final String? partnerId;
  final String? username;
  final String? displayName;
  final String? avatarIpfsHash;
  final Map<String, dynamic>? bitmojiConfig;
  final bool? isVerified;
  final String? lastMessage;
  final DateTime? lastMessageAt;

  Match({
    required this.id,
    this.compatibilityScore,
    this.matchedAt,
    this.partnerId,
    this.username,
    this.displayName,
    this.avatarIpfsHash,
    this.bitmojiConfig,
    this.isVerified,
    this.lastMessage,
    this.lastMessageAt,
  });

  factory Match.fromJson(Map<String, dynamic> json) => Match(
        id: json['id'] as String,
        compatibilityScore: (json['compatibilityScore'] ?? json['compatibility_score']) as double?,
        matchedAt: json['matchedAt'] != null
            ? DateTime.parse(json['matchedAt'] as String)
            : null,
        partnerId: json['partnerId'] ?? json['partner_id'] as String?,
        username: json['username'] as String?,
        displayName: json['displayName'] ?? json['display_name'] as String?,
        avatarIpfsHash: json['avatarIpfsHash'] ?? json['avatar_ipfs_hash'] as String?,
        bitmojiConfig: (json['bitmojiConfig'] ?? json['bitmoji_config'])
            as Map<String, dynamic>?,
        isVerified: json['isVerified'] ?? json['is_verified'] as bool?,
        lastMessage: json['lastMessage'] ?? json['last_message'] as String?,
        lastMessageAt: json['lastMessageAt'] != null
            ? DateTime.parse(json['lastMessageAt'] as String)
            : null,
      );
}

class DiscoverResponse {
  final List<DiscoverCandidate> candidates;
  final String? matchedBy;
  final PaginationInfo? pagination;

  DiscoverResponse({
    required this.candidates,
    this.matchedBy,
    this.pagination,
  });

  factory DiscoverResponse.fromJson(Map<String, dynamic> json) =>
      DiscoverResponse(
        candidates: (json['candidates'] as List)
            .map((e) => DiscoverCandidate.fromJson(e as Map<String, dynamic>))
            .toList(),
        matchedBy: json['matchedBy'] as String?,
        pagination: json['pagination'] != null
            ? PaginationInfo.fromJson(json['pagination'] as Map<String, dynamic>)
            : null,
      );
}

class DiscoverCandidate {
  final String id;
  final String? username;
  final String? displayName;
  final String? avatarIpfsHash;
  final Map<String, dynamic>? bitmojiConfig;
  final String? bio;
  final String? countryCode;
  final String? gender;
  final DateTime? birthDate;
  final bool? isVerified;
  final int? tokenId;
  final List<String>? photos;
  final List<String>? interests;
  final DateTime? createdAt;

  DiscoverCandidate({
    required this.id,
    this.username,
    this.displayName,
    this.avatarIpfsHash,
    this.bitmojiConfig,
    this.bio,
    this.countryCode,
    this.gender,
    this.birthDate,
    this.isVerified,
    this.tokenId,
    this.photos,
    this.interests,
    this.createdAt,
  });

  /// Age in years derived from birthDate, or null if unknown.
  int? get age {
    final b = birthDate;
    if (b == null) return null;
    final now = DateTime.now();
    var years = now.year - b.year;
    if (now.month < b.month || (now.month == b.month && now.day < b.day)) years--;
    return years >= 0 && years < 130 ? years : null;
  }

  factory DiscoverCandidate.fromJson(Map<String, dynamic> json) =>
      DiscoverCandidate(
        id: json['id'] as String,
        username: json['username'] as String?,
        displayName: json['displayName'] ?? json['display_name'] as String?,
        avatarIpfsHash: json['avatarIpfsHash'] ?? json['avatar_ipfs_hash'] as String?,
        bitmojiConfig: (json['bitmojiConfig'] ?? json['bitmoji_config'])
            as Map<String, dynamic>?,
        bio: json['bio'] as String?,
        countryCode: json['countryCode'] ?? json['country_code'] as String?,
        gender: json['gender'] as String?,
        birthDate: (json['birthDate'] ?? json['birth_date']) != null
            ? DateTime.tryParse((json['birthDate'] ?? json['birth_date']).toString())
            : null,
        isVerified: json['isVerified'] ?? json['is_verified'] as bool?,
        tokenId: User._parseTokenId(json['tokenId'] ?? json['token_id']),
        photos: User._parsePhotos(json['photos']),
        interests: json['interests'] != null
            ? List<String>.from(json['interests'] as List)
            : null,
        createdAt: json['createdAt'] != null
            ? DateTime.parse(json['createdAt'] as String)
            : null,
      );
}

class PaginationInfo {
  final int limit;
  final int offset;
  final bool hasMore;

  PaginationInfo({
    required this.limit,
    required this.offset,
    required this.hasMore,
  });

  factory PaginationInfo.fromJson(Map<String, dynamic> json) => PaginationInfo(
        limit: json['limit'] as int,
        offset: json['offset'] as int,
        hasMore: json['hasMore'] ?? json['has_more'] as bool,
      );
}

class MatchResult {
  final Match? match;
  final bool? isNewMatch;

  MatchResult({this.match, this.isNewMatch});

  factory MatchResult.fromJson(Map<String, dynamic> json) => MatchResult(
        match: json['match'] != null
            ? Match.fromJson(json['match'] as Map<String, dynamic>)
            : null,
        isNewMatch: json['isNewMatch'] ?? json['is_new_match'] as bool?,
      );
}

class HeroStats {
  final int? totalScore;
  final int? weeklyScore;
  final int? rank;
  final int? weeklyRank;
  final int? cardsCollected;
  final int? tournamentsWon;
  final double? winRate;
  final int? currentStreak;

  HeroStats({
    this.totalScore,
    this.weeklyScore,
    this.rank,
    this.weeklyRank,
    this.cardsCollected,
    this.tournamentsWon,
    this.winRate,
    this.currentStreak,
  });

  factory HeroStats.fromJson(Map<String, dynamic> json) => HeroStats(
        totalScore: json['totalScore'] ?? json['total_score'] as int?,
        weeklyScore: json['weeklyScore'] ?? json['weekly_score'] as int?,
        rank: json['rank'] as int?,
        weeklyRank: json['weeklyRank'] ?? json['weekly_rank'] as int?,
        cardsCollected: json['cardsCollected'] ?? json['cards_collected'] as int?,
        tournamentsWon: json['tournamentsWon'] ?? json['tournaments_won'] as int?,
        winRate: (json['winRate'] ?? json['win_rate']) as double?,
        currentStreak: json['currentStreak'] ?? json['current_streak'] as int?,
      );
}

class LeaderboardResponse {
  final List<LeaderboardEntry> entries;
  final PaginationInfo? pagination;

  LeaderboardResponse({required this.entries, this.pagination});

  factory LeaderboardResponse.fromJson(Map<String, dynamic> json) =>
      LeaderboardResponse(
        entries: ((json['entries'] ?? json['heroes'] ?? const []) as List)
            .map((e) => LeaderboardEntry.fromJson(e as Map<String, dynamic>))
            .toList(),
        pagination: json['pagination'] != null
            ? PaginationInfo.fromJson(json['pagination'] as Map<String, dynamic>)
            : null,
      );
}

class LeaderboardEntry {
  final String id;
  final String userId;
  final String? displayName;
  final String? avatarIpfsHash;
  final int score;
  final int rank;

  LeaderboardEntry({
    required this.id,
    required this.userId,
    this.displayName,
    this.avatarIpfsHash,
    required this.score,
    required this.rank,
  });

  factory LeaderboardEntry.fromJson(Map<String, dynamic> json) =>
      LeaderboardEntry(
        id: (json['id'] ?? json['userId'] ?? json['user_id'] ?? '') as String,
        userId: (json['userId'] ?? json['user_id'] ?? '') as String,
        displayName: json['displayName'] ?? json['display_name'] as String?,
        avatarIpfsHash: (json['avatarIpfsHash'] ?? json['avatar_ipfs_hash'] ?? json['avatarHash']) as String?,
        score: ((json['score'] ?? json['rawScore'] ?? json['raw_score'] ?? 0) as num).round(),
        rank: (json['rank'] ?? 0) as int,
      );
}

class BonusResponse {
  final int amount;
  final DateTime? claimedAt;
  final DateTime? nextClaimAt;
  final String? txHash;

  BonusResponse({
    required this.amount,
    this.claimedAt,
    this.nextClaimAt,
    this.txHash,
  });

  factory BonusResponse.fromJson(Map<String, dynamic> json) => BonusResponse(
        amount: json['amount'] as int,
        claimedAt: json['claimedAt'] != null
            ? DateTime.parse(json['claimedAt'] as String)
            : null,
        nextClaimAt: json['nextClaimAt'] != null
            ? DateTime.parse(json['nextClaimAt'] as String)
            : null,
        txHash: json['txHash'] ?? json['tx_hash'] as String?,
      );
}
