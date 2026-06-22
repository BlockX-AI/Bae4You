import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../services/chat_service.dart';
import '../services/api_service.dart';
import 'auth_provider.dart';

// Chat service singleton provider
final chatServiceProvider = Provider<ChatService>((ref) => ChatService());

// Message history provider — loads from REST on open, then merges WS messages
class ChatMessagesNotifier extends StateNotifier<AsyncValue<List<Map<String, dynamic>>>> {
  final ApiService _api;
  final ChatService _chatService;
  final String _matchId;
  final String _currentUserId;

  ChatMessagesNotifier(this._api, this._chatService, this._matchId, this._currentUserId, String token)
      : super(const AsyncValue.loading()) {
    _loadHistory(token);
    _chatService.messageStream.listen((msg) {
      if (msg.matchId != _matchId) return;
      final isMe = msg.senderId == _currentUserId;
      final current = state.value ?? [];
      // Skip if we already have this message id (avoids dupes on reconnect).
      if (msg.id.isNotEmpty && current.any((m) => m['id'] == msg.id)) return;
      state = AsyncValue.data([
        ...current,
        {
          'id': msg.id,
          'sender_id': msg.senderId,
          'content': msg.content,
          'sent_at': msg.createdAt.toIso8601String(),
          'isMe': isMe,
        }
      ]);
    });
  }

  Future<void> _loadHistory(String token) async {
    try {
      final msgs = await _api.getMessageHistory(_matchId, token);
      state = AsyncValue.data(msgs);
    } catch (_) {
      // Fall back to empty list — WS messages will populate
      state = const AsyncValue.data([]);
    }
  }

}

final chatMessagesProvider = StateNotifierProvider.family<ChatMessagesNotifier, AsyncValue<List<Map<String, dynamic>>>, String>(
  (ref, matchId) {
    final api = ref.read(apiServiceProvider);
    final chatService = ref.read(chatServiceProvider);
    final authState = ref.read(authProvider);
    final userId = authState.user?.id ?? '';
    final token = authState.token ?? '';
    return ChatMessagesNotifier(api, chatService, matchId, userId, token);
  },
);

// Connection status provider
final chatConnectionProvider = StreamProvider<bool>((ref) {
  return ref.read(chatServiceProvider).connectionStream;
});
