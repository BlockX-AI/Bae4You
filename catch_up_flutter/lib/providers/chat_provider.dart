import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../services/chat_service.dart';
import '../services/api_service.dart';
import '../models/chat_models.dart';
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
      if (msg.matchId == _matchId || state.value != null) {
        final current = state.value ?? [];
        state = AsyncValue.data([
          ...current,
          {
            'id': msg.id,
            'sender_id': msg.isMe ? _currentUserId : 'other',
            'content': msg.content,
            'sent_at': msg.createdAt.toIso8601String(),
            'isMe': msg.isMe,
          }
        ]);
      }
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

  void addLocal(String content, String senderId) {
    final current = state.value ?? [];
    state = AsyncValue.data([
      ...current,
      {'sender_id': senderId, 'content': content, 'sent_at': DateTime.now().toIso8601String(), 'isMe': true},
    ]);
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
