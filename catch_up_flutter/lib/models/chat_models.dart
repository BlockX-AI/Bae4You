class ChatMessage {
  final String id;
  final String matchId;
  final String senderId;
  final String? senderName;
  final String content;
  final DateTime createdAt;
  final bool isRead;
  final String? avatarEmoji;

  ChatMessage({
    required this.id,
    required this.matchId,
    required this.senderId,
    this.senderName,
    required this.content,
    required this.createdAt,
    this.isRead = false,
    this.avatarEmoji,
  });

  factory ChatMessage.fromJson(Map<String, dynamic> json) => ChatMessage(
        id: json['id'] ?? json['messageId'] ?? json['_id'] as String,
        matchId: json['matchId'] ?? json['match_id'] as String,
        senderId: json['senderId'] ?? json['sender_id'] ?? json['sender'] as String,
        senderName: json['senderName'] ?? json['sender_name'] as String?,
        content: json['content'] ?? json['message'] ?? json['text'] as String,
        createdAt: json['createdAt'] != null || json['created_at'] != null
            ? DateTime.parse(json['createdAt'] ?? json['created_at'] as String)
            : DateTime.now(),
        isRead: json['isRead'] ?? json['is_read'] ?? json['read'] as bool? ?? false,
        avatarEmoji: json['avatarEmoji'] ?? json['avatar_emoji'] as String?,
      );

  Map<String, dynamic> toJson() => {
        'id': id,
        'matchId': matchId,
        'senderId': senderId,
        'senderName': senderName,
        'content': content,
        'createdAt': createdAt.toIso8601String(),
        'isRead': isRead,
        'avatarEmoji': avatarEmoji,
      };

  bool get isMe => senderId == 'current_user'; // Will be updated with actual user ID
}

class Conversation {
  final String matchId;
  final String? partnerId;
  final String? partnerName;
  final String? partnerAvatar;
  final String? lastMessage;
  final DateTime? lastMessageAt;
  final int unreadCount;
  final bool isOnline;

  Conversation({
    required this.matchId,
    this.partnerId,
    this.partnerName,
    this.partnerAvatar,
    this.lastMessage,
    this.lastMessageAt,
    this.unreadCount = 0,
    this.isOnline = false,
  });

  factory Conversation.fromJson(Map<String, dynamic> json) => Conversation(
        matchId: json['matchId'] ?? json['match_id'] ?? json['id'] as String,
        partnerId: json['partnerId'] ?? json['partner_id'] as String?,
        partnerName: json['partnerName'] ?? json['partner_name'] ?? json['displayName'] as String?,
        partnerAvatar: json['partnerAvatar'] ?? json['partner_avatar'] ?? json['avatarIpfsHash'] as String?,
        lastMessage: json['lastMessage'] ?? json['last_message'] as String?,
        lastMessageAt: json['lastMessageAt'] != null || json['last_message_at'] != null
            ? DateTime.parse(json['lastMessageAt'] ?? json['last_message_at'] as String)
            : null,
        unreadCount: json['unreadCount'] ?? json['unread_count'] as int? ?? 0,
        isOnline: json['isOnline'] ?? json['is_online'] as bool? ?? false,
      );
}
