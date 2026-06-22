import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:socket_io_client/socket_io_client.dart' as io;
import '../models/chat_models.dart';

/// Socket.IO chat client. Talks to the backend's Socket.IO server, which is
/// attached to the main API HTTP server (shared public port). Events match
/// `apps/api/src/plugins/socket.ts`:
///   emit:   join:match, send:message, typing:start, typing:stop, mark:read
///   listen: joined:match, new:message, peer:typing, peer:stopped-typing,
///           messages:read, error
class ChatService {
  io.Socket? _socket;
  final _messageController = StreamController<ChatMessage>.broadcast();
  final _connectionController = StreamController<bool>.broadcast();
  final _typingController = StreamController<bool>.broadcast();

  String? _currentMatchId;
  bool _isConnected = false;

  static const String _socketUrl =
      'https://baebackend-production.up.railway.app';

  Stream<ChatMessage> get messageStream => _messageController.stream;
  Stream<bool> get connectionStream => _connectionController.stream;
  Stream<bool> get typingStream => _typingController.stream;
  bool get isConnected => _isConnected;

  /// Connect to the Socket.IO server, authenticating with the JWT.
  void connect(String token) {
    if (_socket != null) return; // already connected/connecting

    _socket = io.io(
      _socketUrl,
      io.OptionBuilder()
          .setTransports(['websocket', 'polling'])
          .disableAutoConnect()
          .setAuth({'token': token})
          .build(),
    );

    _socket!
      ..onConnect((_) {
        _isConnected = true;
        _connectionController.add(true);
        // Re-join the active room after a reconnect.
        if (_currentMatchId != null) {
          _socket!.emit('join:match', _currentMatchId);
        }
      })
      ..onDisconnect((_) {
        _isConnected = false;
        _connectionController.add(false);
      })
      ..onConnectError((err) {
        if (kDebugMode) debugPrint('Socket connect error: $err');
        _isConnected = false;
        _connectionController.add(false);
      })
      ..on('new:message', (data) {
        try {
          _messageController.add(
            ChatMessage.fromJson(Map<String, dynamic>.from(data as Map)),
          );
        } catch (e) {
          if (kDebugMode) debugPrint('Bad new:message payload: $e');
        }
      })
      ..on('peer:typing', (_) => _typingController.add(true))
      ..on('peer:stopped-typing', (_) => _typingController.add(false))
      ..on('error', (data) {
        if (kDebugMode) debugPrint('Socket error event: $data');
      });

    _socket!.connect();
  }

  /// Join a match room. Server validates membership and replies joined:match.
  void joinMatch(String matchId) {
    _currentMatchId = matchId;
    _socket?.emit('join:match', matchId);
  }

  void leaveMatch() {
    _currentMatchId = null;
  }

  /// Send a chat message. The server persists it and broadcasts new:message
  /// back to the room (including the sender), so we do NOT echo locally here.
  void sendMessage(String content, String matchId, {String type = 'text'}) {
    _socket?.emit('send:message', {
      'matchId': matchId,
      'content': content,
      'type': type,
    });
  }

  void markAsRead(String messageId, String matchId) {
    _socket?.emit('mark:read', {'matchId': matchId});
  }

  void sendTyping(String matchId, bool isTyping) {
    _socket?.emit(isTyping ? 'typing:start' : 'typing:stop', {
      'matchId': matchId,
    });
  }

  void disconnect() {
    leaveMatch();
    _socket?.dispose();
    _socket = null;
    _isConnected = false;
    _connectionController.add(false);
  }

  void dispose() {
    disconnect();
    _messageController.close();
    _connectionController.close();
    _typingController.close();
  }
}

// Singleton instance
final chatService = ChatService();
