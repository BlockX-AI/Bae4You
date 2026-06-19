class Pet {
  final int tokenId;
  final String ownerAddress;
  final String userAddress;
  final String? currentPriceWei;
  final int? totalPurchases;
  final bool? isLocked;
  final DateTime? lockExpiry;
  final String? petStatus;
  final String? username;
  final String? displayName;
  final String? avatarIpfsHash;
  final String? countryCode;
  final bool? isVerified;

  Pet({
    required this.tokenId,
    required this.ownerAddress,
    required this.userAddress,
    this.currentPriceWei,
    this.totalPurchases,
    this.isLocked,
    this.lockExpiry,
    this.petStatus,
    this.username,
    this.displayName,
    this.avatarIpfsHash,
    this.countryCode,
    this.isVerified,
  });

  factory Pet.fromJson(Map<String, dynamic> json) => Pet(
        tokenId: json['tokenId'] ?? json['token_id'] as int,
        ownerAddress: json['ownerAddress'] ?? json['owner_address'] as String,
        userAddress: json['userAddress'] ?? json['user_address'] as String,
        currentPriceWei: json['currentPriceWei'] ?? json['current_price_wei'] as String?,
        totalPurchases: json['totalPurchases'] ?? json['total_purchases'] as int?,
        isLocked: json['isLocked'] ?? json['is_locked'] as bool?,
        lockExpiry: json['lockExpiry'] != null || json['lock_expiry'] != null
            ? DateTime.parse(json['lockExpiry'] ?? json['lock_expiry'] as String)
            : null,
        petStatus: json['petStatus'] ?? json['pet_status'] as String?,
        username: json['username'] as String?,
        displayName: json['displayName'] ?? json['display_name'] as String?,
        avatarIpfsHash: json['avatarIpfsHash'] ?? json['avatar_ipfs_hash'] as String?,
        countryCode: json['countryCode'] ?? json['country_code'] as String?,
        isVerified: json['isVerified'] ?? json['is_verified'] as bool?,
      );
}

class PetsResponse {
  final List<Pet> pets;
  final int page;
  final int limit;

  PetsResponse({
    required this.pets,
    required this.page,
    required this.limit,
  });

  factory PetsResponse.fromJson(Map<String, dynamic> json) => PetsResponse(
        pets: (json['pets'] as List)
            .map((e) => Pet.fromJson(e as Map<String, dynamic>))
            .toList(),
        page: json['page'] as int,
        limit: json['limit'] as int,
      );
}

class PetTransaction {
  final String? txHash;
  final String? fromAddress;
  final String? toAddress;
  final String? salePriceWei;
  final String? newPriceWei;
  final int? blockNumber;
  final DateTime? createdAt;

  PetTransaction({
    this.txHash,
    this.fromAddress,
    this.toAddress,
    this.salePriceWei,
    this.newPriceWei,
    this.blockNumber,
    this.createdAt,
  });

  factory PetTransaction.fromJson(Map<String, dynamic> json) => PetTransaction(
        txHash: json['txHash'] ?? json['tx_hash'] as String?,
        fromAddress: json['fromAddress'] ?? json['from_address'] as String?,
        toAddress: json['toAddress'] ?? json['to_address'] as String?,
        salePriceWei: json['salePriceWei'] ?? json['sale_price_wei'] as String?,
        newPriceWei: json['newPriceWei'] ?? json['new_price_wei'] as String?,
        blockNumber: json['blockNumber'] ?? json['block_number'] as int?,
        createdAt: json['createdAt'] != null || json['created_at'] != null
            ? DateTime.parse(json['createdAt'] ?? json['created_at'] as String)
            : null,
      );
}

class WishlistItem {
  final String id;
  final int targetTokenId;
  final String? note;
  final DateTime? addedAt;
  final String? currentPriceWei;
  final String? username;
  final String? displayName;
  final String? avatarIpfsHash;

  WishlistItem({
    required this.id,
    required this.targetTokenId,
    this.note,
    this.addedAt,
    this.currentPriceWei,
    this.username,
    this.displayName,
    this.avatarIpfsHash,
  });

  factory WishlistItem.fromJson(Map<String, dynamic> json) => WishlistItem(
        id: json['id'] as String,
        targetTokenId: json['targetTokenId'] ?? json['target_token_id'] as int,
        note: json['note'] as String?,
        addedAt: json['addedAt'] != null || json['added_at'] != null
            ? DateTime.parse(json['addedAt'] ?? json['added_at'] as String)
            : null,
        currentPriceWei: json['currentPriceWei'] ?? json['current_price_wei'] as String?,
        username: json['username'] as String?,
        displayName: json['displayName'] ?? json['display_name'] as String?,
        avatarIpfsHash: json['avatarIpfsHash'] ?? json['avatar_ipfs_hash'] as String?,
      );
}

class Bid {
  final String id;
  final String tokenId;
  final String bidderAddress;
  final String amountWei;
  final DateTime? createdAt;
  final String? bidderUsername;
  final String? bidderDisplayName;

  Bid({
    required this.id,
    required this.tokenId,
    required this.bidderAddress,
    required this.amountWei,
    this.createdAt,
    this.bidderUsername,
    this.bidderDisplayName,
  });

  factory Bid.fromJson(Map<String, dynamic> json) => Bid(
        id: json['id'] as String,
        tokenId: json['tokenId'] ?? json['token_id'] as String,
        bidderAddress: json['bidderAddress'] ?? json['bidder_address'] as String,
        amountWei: json['amountWei'] ?? json['amount_wei'] as String,
        createdAt: json['createdAt'] != null || json['created_at'] != null
            ? DateTime.parse(json['createdAt'] ?? json['created_at'] as String)
            : null,
        bidderUsername: json['bidderUsername'] ?? json['bidder_username'] as String?,
        bidderDisplayName: json['bidderDisplayName'] ?? json['bidder_display_name'] as String?,
      );
}
