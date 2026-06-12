import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../services/chat_service.dart';
import '../models/chat_models.dart';
import '../services/api_service.dart';

// Chat service provider
final chatServiceProvider = Provider<ChatService>((ref) => ChatService());

// Messages provider for a specific match
final matchMessagesProvider = StreamProvider.family<List<ChatMessage>, String>((ref, matchId) {
  final chatService = ref.read(chatServiceProvider);
  
  // Return stream of messages for this match
  return chatService.messageStream.map((message) {
    // Filter messages for this match
    if (message.matchId == matchId) {
      return [message];
    }
    return [];
  }).expand((messages) => messages as Iterable<ChatMessage>).toList().asStream();
});

// Connection status provider
final chatConnectionProvider = StreamProvider<bool>((ref) {
  final chatService = ref.read(chatServiceProvider);
  return chatService.connectionStream;
});

// Chat notifier for actions
class ChatNotifier extends StateNotifier<AsyncValue<void>> {
  final ChatService _chatService;

  ChatNotifier(this._chatService) : super(const AsyncValue.data(null));

  void sendMessage(String content, String matchId) {
    _chatService.sendMessage(content, matchId);
  }

  void sendTyping(String matchId, bool isTyping) {
    _chatService.sendTyping(matchId, isTyping);
  }

  void markAsRead(String messageId, String matchId) {
    _chatService.markAsRead(messageId, matchId);
  }
}

final chatNotifierProvider = StateNotifierProvider<ChatNotifier, AsyncValue<void>>((ref) {
  final chatService = ref.read(chatServiceProvider);
  return ChatNotifier(chatService);
});
