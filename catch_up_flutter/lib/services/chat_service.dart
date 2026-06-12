import 'dart:async';
import 'dart:convert';
import 'package:web_socket_channel/web_socket_channel.dart';
import 'package:web_socket_channel/io.dart';
import 'package:flutter/foundation.dart';
import '../models/chat_models.dart';

class ChatService {
  WebSocketChannel? _channel;
  final _messageController = StreamController<ChatMessage>.broadcast();
  final _connectionController = StreamController<bool>.broadcast();
  
  String? _token;
  String? _currentMatchId;
  bool _isConnected = false;

  // Streams
  Stream<ChatMessage> get messageStream => _messageController.stream;
  Stream<bool> get connectionStream => _connectionController.stream;
  bool get isConnected => _isConnected;

  /// Connect to WebSocket
  void connect(String token) {
    _token = token;
    
    try {
      // WebSocket URL - replace with your Railway WebSocket endpoint
      final wsUrl = kIsWeb
          ? 'wss://baebackend-production.up.railway.app/ws?token=$token'
          : 'wss://baebackend-production.up.railway.app/ws?token=$token';
      
      _channel = WebSocketChannel.connect(Uri.parse(wsUrl));
      
      _channel!.stream.listen(
        (data) => _handleMessage(data),
        onError: (error) {
          print('WebSocket error: $error');
          _isConnected = false;
          _connectionController.add(false);
        },
        onDone: () {
          print('WebSocket closed');
          _isConnected = false;
          _connectionController.add(false);
        },
      );
      
      _isConnected = true;
      _connectionController.add(true);
      
      // Send authentication
      _send({
        'type': 'auth',
        'token': token,
      });
      
    } catch (e) {
      print('WebSocket connection failed: $e');
      _isConnected = false;
      _connectionController.add(false);
    }
  }

  /// Join a match room
  void joinMatch(String matchId) {
    _currentMatchId = matchId;
    _send({
      'type': 'join',
      'matchId': matchId,
    });
  }

  /// Leave current match room
  void leaveMatch() {
    if (_currentMatchId != null) {
      _send({
        'type': 'leave',
        'matchId': _currentMatchId,
      });
      _currentMatchId = null;
    }
  }

  /// Send a message
  void sendMessage(String content, String matchId) {
    _send({
      'type': 'message',
      'matchId': matchId,
      'content': content,
      'timestamp': DateTime.now().toIso8601String(),
    });
  }

  /// Mark message as read
  void markAsRead(String messageId, String matchId) {
    _send({
      'type': 'read',
      'matchId': matchId,
      'messageId': messageId,
    });
  }

  /// Typing indicator
  void sendTyping(String matchId, bool isTyping) {
    _send({
      'type': 'typing',
      'matchId': matchId,
      'isTyping': isTyping,
    });
  }

  /// Disconnect
  void disconnect() {
    leaveMatch();
    _channel?.sink.close();
    _channel = null;
    _isConnected = false;
    _connectionController.add(false);
  }

  /// Handle incoming message
  void _handleMessage(dynamic data) {
    try {
      final json = jsonDecode(data as String);
      final type = json['type'] as String?;
      
      switch (type) {
        case 'message':
          final message = ChatMessage.fromJson(json['data'] as Map<String, dynamic>);
          _messageController.add(message);
          break;
          
        case 'typing':
          // Handle typing indicator
          break;
          
        case 'read':
          // Handle read receipt
          break;
          
        case 'error':
          print('WebSocket error: ${json['message']}');
          break;
          
        default:
          print('Unknown message type: $type');
      }
    } catch (e) {
      print('Error parsing WebSocket message: $e');
    }
  }

  /// Send data to WebSocket
  void _send(Map<String, dynamic> data) {
    if (_channel != null && _isConnected) {
      _channel!.sink.add(jsonEncode(data));
    }
  }

  void dispose() {
    disconnect();
    _messageController.close();
    _connectionController.close();
  }
}

// Singleton instance
final chatService = ChatService();
