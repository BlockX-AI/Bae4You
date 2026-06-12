class NonceResponse {
  final String nonce;

  NonceResponse({required this.nonce});

  factory NonceResponse.fromJson(Map<String, dynamic> json) =>
      NonceResponse(nonce: json['nonce'] as String);
}

class AuthResponse {
  final String accessToken;
  final UserAuth user;

  AuthResponse({required this.accessToken, required this.user});

  factory AuthResponse.fromJson(Map<String, dynamic> json) => AuthResponse(
        accessToken: json['accessToken'] as String,
        user: UserAuth.fromJson(json['user'] as Map<String, dynamic>),
      );
}

class UserAuth {
  final String id;
  final String wallet;
  final int? tokenId;
  final String? username;
  final String? displayName;
  final bool? isCreator;
  final DateTime? bonusClaimedAt;

  UserAuth({
    required this.id,
    required this.wallet,
    this.tokenId,
    this.username,
    this.displayName,
    this.isCreator,
    this.bonusClaimedAt,
  });

  factory UserAuth.fromJson(Map<String, dynamic> json) => UserAuth(
        id: json['id'] as String,
        wallet: json['wallet'] as String,
        tokenId: json['tokenId'] as int?,
        username: json['username'] as String?,
        displayName: json['displayName'] as String?,
        isCreator: json['isCreator'] as bool?,
        bonusClaimedAt: json['bonusClaimedAt'] != null
            ? DateTime.parse(json['bonusClaimedAt'] as String)
            : null,
      );
}

// SIWE Message Builder
class SiweMessageBuilder {
  final String domain;
  final String address;
  final String statement;
  final String uri;
  final String version;
  final String chainId;
  final String nonce;
  final DateTime? issuedAt;
  final DateTime? expirationTime;
  
  SiweMessageBuilder({
    required this.domain,
    required this.address,
    required this.statement,
    required this.uri,
    required this.version,
    required this.chainId,
    required this.nonce,
    this.issuedAt,
    this.expirationTime,
  });
  
  String build() {
    final buffer = StringBuffer();
    buffer.writeln('$domain wants you to sign in with your Ethereum account:');
    buffer.writeln(address);
    buffer.writeln();
    buffer.writeln(statement);
    buffer.writeln();
    buffer.writeln('URI: $uri');
    buffer.writeln('Version: $version');
    buffer.writeln('Chain ID: $chainId');
    buffer.writeln('Nonce: $nonce');
    buffer.writeln('Issued At: ${(issuedAt ?? DateTime.now()).toUtc().toIso8601String()}');
    
    if (expirationTime != null) {
      buffer.writeln('Expiration Time: ${expirationTime!.toUtc().toIso8601String()}');
    }
    
    return buffer.toString();
  }
}
