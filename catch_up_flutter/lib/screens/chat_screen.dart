import 'package:flutter/material.dart';
import '../theme/app_colors.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';
import '../providers/match_provider.dart';
import '../providers/auth_provider.dart';
import '../providers/chat_provider.dart';
import '../models/user_models.dart';
import '../services/chat_service.dart';
import '../widgets/report_sheet.dart';

class ChatScreen extends ConsumerWidget {
  const ChatScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final matchesAsync = ref.watch(matchesProvider);

    return Scaffold(
      backgroundColor: AppColors.bgTop,
      body: SafeArea(
        child: Column(
          children: [
            // Header
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 16, 20, 8),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text('Messages', style: GoogleFonts.fredoka(fontSize: 28, fontWeight: FontWeight.w600, color: AppColors.textPrimary)),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                    decoration: BoxDecoration(
                      color: const Color(0xFF00C853).withOpacity(0.12),
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(color: const Color(0xFF00C853).withOpacity(0.3)),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Icon(Icons.circle, color: Color(0xFF00C853), size: 8),
                        const SizedBox(width: 6),
                        Text('Online', style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.w600, color: Color(0xFF00C853))),
                      ],
                    ),
                  ),
                ],
              ),
            ),

            // Chat list
            Expanded(
              child: matchesAsync.when(
                data: (matches) => matches.isEmpty
                    ? _buildEmptyState()
                    : ListView.builder(
                        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                        itemCount: matches.length,
                        itemBuilder: (context, index) => _ChatListItem(match: matches[index]),
                      ),
                loading: () => const Center(child: CircularProgressIndicator(color: AppColors.primary)),
                error: (err, stack) => _buildErrorState(err.toString()),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Container(
            width: 100, height: 100,
            decoration: BoxDecoration(color: AppColors.surfaceCard, shape: BoxShape.circle),
            child: const Icon(Icons.chat_bubble_outline, size: 48, color: AppColors.primary),
          ),
          const SizedBox(height: 24),
          Text('No messages yet', style: GoogleFonts.fredoka(fontSize: 24, color: AppColors.textPrimary)),
          const SizedBox(height: 8),
          Text('Match someone to start chatting!', style: GoogleFonts.inter(fontSize: 14, color: AppColors.textSecondary)),
        ],
      ),
    );
  }

  Widget _buildErrorState(String error) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const Icon(Icons.error_outline, size: 48, color: AppColors.textHint),
          const SizedBox(height: 16),
          Text('Something went wrong', style: GoogleFonts.fredoka(fontSize: 20, color: AppColors.textPrimary)),
        ],
      ),
    );
  }
}

class _ChatListItem extends StatelessWidget {
  final Match match;

  const _ChatListItem({required this.match});

  @override
  Widget build(BuildContext context) {
    final displayName = match.displayName ?? match.username ?? 'Unknown';
    final emoji = _getEmojiForName(displayName);
    final hasUnread = match.lastMessage == null; // Simplified

    return GestureDetector(
      onTap: () {
        Navigator.push(
          context,
          MaterialPageRoute(
            builder: (context) => ChatDetailScreen(
              matchId: match.id,
              displayName: displayName,
              partnerId: match.partnerId ?? '',
            ),
          ),
        );
      },
      child: Container(
        margin: const EdgeInsets.only(bottom: 12),
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: hasUnread ? AppColors.surfaceCard : AppColors.surface,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: hasUnread ? AppColors.border : AppColors.divider),
          boxShadow: hasUnread ? [BoxShadow(color: AppColors.primary.withOpacity(0.08), blurRadius: 8, offset: const Offset(0, 2))] : [],
        ),
        child: Row(
          children: [
            // Avatar
            Container(
              width: 56,
              height: 56,
              decoration: BoxDecoration(
                gradient: AppColors.buttonGradient,
                borderRadius: BorderRadius.circular(28),
              ),
              child: Center(
                child: Text(
                  emoji,
                  style: const TextStyle(fontSize: 24),
                ),
              ),
            ),

            const SizedBox(width: 16),

            // Info
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Text(
                        displayName,
                        style: GoogleFonts.fredoka(
                          fontSize: 18,
                          fontWeight: hasUnread ? FontWeight.w600 : FontWeight.w500,
                          color: AppColors.textPrimary,
                        ),
                      ),
                      if (match.isVerified == true)
                        const Padding(
                          padding: EdgeInsets.only(left: 4),
                          child: Icon(
                            Icons.verified,
                            size: 16,
                            color: Color(0xFF00FF88),
                          ),
                        ),
                    ],
                  ),
                  const SizedBox(height: 4),
                  if (match.lastMessage != null)
                    Text(
                      match.lastMessage!,
                      style: GoogleFonts.inter(
                        fontSize: 14,
                        color: hasUnread ? AppColors.textPrimary : AppColors.textHint,
                        fontWeight: hasUnread ? FontWeight.w500 : FontWeight.normal,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    )
                  else
                    Text(
                      '${(match.compatibilityScore! * 100).toInt()}% match · Start chatting!',
                      style: GoogleFonts.inter(
                        fontSize: 14,
                        color: AppColors.accent,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                ],
              ),
            ),

            // Time
            if (match.lastMessageAt != null)
              Text(_formatTime(match.lastMessageAt!), style: GoogleFonts.inter(fontSize: 12, color: AppColors.textHint)),
          ],
        ),
      ),
    );
  }

  String _getEmojiForName(String name) {
    final emojis = ['😊', '🎨', '🎸', '📚', '🏔️', '☕', '🌟', '🎯', '🔥', '💫'];
    return emojis[name.length % emojis.length];
  }

  String _formatTime(DateTime time) {
    final now = DateTime.now();
    final diff = now.difference(time);

    if (diff.inDays > 0) {
      return '${diff.inDays}d';
    } else if (diff.inHours > 0) {
      return '${diff.inHours}h';
    } else if (diff.inMinutes > 0) {
      return '${diff.inMinutes}m';
    } else {
      return 'now';
    }
  }
}

// Chat detail screen (for when a match is selected)
class ChatDetailScreen extends ConsumerStatefulWidget {
  final String matchId;
  final String displayName;
  final String partnerId;

  const ChatDetailScreen({
    super.key,
    required this.matchId,
    required this.displayName,
    required this.partnerId,
  });

  @override
  ConsumerState<ChatDetailScreen> createState() => _ChatDetailScreenState();
}

class _ChatDetailScreenState extends ConsumerState<ChatDetailScreen> {
  final TextEditingController _messageController = TextEditingController();
  bool _isConnected = false;
  ChatService? _chatService;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _initWebSocket());
  }

  void _initWebSocket() {
    final token = ref.read(authProvider).token ?? '';
    _chatService = ref.read(chatServiceProvider);
    _chatService!.connect(token);
    _chatService!.joinMatch(widget.matchId);
    _chatService!.connectionStream.listen((connected) {
      if (mounted) setState(() => _isConnected = connected);
    });
  }

  @override
  void dispose() {
    _chatService?.leaveMatch();
    _messageController.dispose();
    super.dispose();
  }

  void _sendMessage() {
    final content = _messageController.text.trim();
    if (content.isEmpty) return;
    // The server persists and broadcasts new:message back to this client,
    // so we don't echo locally — the socket stream appends it once.
    _chatService?.sendMessage(content, widget.matchId);
    _messageController.clear();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.bgTop,
      body: SafeArea(
        child: Column(
          children: [
            // Header
            Container(
              decoration: BoxDecoration(
                color: AppColors.surface,
                border: Border(bottom: BorderSide(color: AppColors.divider)),
              ),
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 8),
              child: Row(
                children: [
                  IconButton(
                    onPressed: () => Navigator.pop(context),
                    icon: const Icon(Icons.arrow_back, color: AppColors.textPrimary),
                  ),
                    const SizedBox(width: 8),
                    Container(
                      width: 44,
                      height: 44,
                      decoration: BoxDecoration(
                        gradient: AppColors.buttonGradient,
                        borderRadius: BorderRadius.circular(22),
                      ),
                      child: Center(
                        child: Text(
                          _getEmojiForName(widget.displayName),
                          style: const TextStyle(fontSize: 22),
                        ),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(widget.displayName, style: GoogleFonts.fredoka(fontSize: 20, fontWeight: FontWeight.w600, color: AppColors.textPrimary)),
                          Row(
                            children: [
                              Container(
                                width: 8, height: 8,
                                decoration: BoxDecoration(
                                  color: _isConnected ? const Color(0xFF00C853) : Colors.orange,
                                  shape: BoxShape.circle,
                                ),
                              ),
                              const SizedBox(width: 6),
                              Text(_isConnected ? 'Online' : 'Demo mode', style: GoogleFonts.inter(fontSize: 12, color: AppColors.textHint)),
                            ],
                          ),
                        ],
                      ),
                    ),
                    PopupMenuButton<String>(
                      icon: const Icon(Icons.more_vert, color: AppColors.textPrimary),
                      color: AppColors.surface,
                      onSelected: (value) async {
                        if (value == 'report') {
                          if (widget.partnerId.isEmpty) return;
                          final reported = await showReportSheet(
                            context, ref,
                            userId: widget.partnerId,
                            name: widget.displayName,
                          );
                          if (reported && context.mounted) {
                            ref.invalidate(matchesProvider);
                            Navigator.pop(context); // leave the conversation
                          }
                        }
                      },
                      itemBuilder: (_) => [
                        PopupMenuItem(
                          value: 'report',
                          child: Row(children: [
                            const Icon(Icons.flag_outlined, size: 18, color: Colors.red),
                            const SizedBox(width: 10),
                            Text('Report & block', style: GoogleFonts.inter(color: AppColors.textPrimary)),
                          ]),
                        ),
                      ],
                    ),
                  ],
                ),
              ),

              // Messages
              Expanded(
                child: Builder(builder: (context) {
                  final messagesAsync = ref.watch(chatMessagesProvider(widget.matchId));
                  return messagesAsync.when(
                    loading: () => const Center(child: CircularProgressIndicator(color: AppColors.primary)),
                    error: (_, __) => _buildEmptyChat(),
                    data: (messages) => messages.isEmpty
                        ? _buildEmptyChat()
                        : ListView.builder(
                            padding: const EdgeInsets.all(16),
                            reverse: true,
                            itemCount: messages.length,
                            itemBuilder: (context, index) {
                              final msg = messages[messages.length - 1 - index];
                              final isMe = msg['isMe'] == true || msg['sender_id'] == ref.read(authProvider).user?.id;
                              final sentAt = msg['sent_at'] != null ? DateTime.tryParse(msg['sent_at'] as String) ?? DateTime.now() : DateTime.now();
                              return _MessageBubble(text: msg['content'] as String? ?? '', isMe: isMe, time: sentAt);
                            },
                          ),
                  );
                }),
              ),

              // Input
              Padding(
                padding: const EdgeInsets.all(16),
                child: Row(
                  children: [
                    Expanded(
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 16),
                        decoration: BoxDecoration(
                          color: AppColors.surface,
                          borderRadius: BorderRadius.circular(24),
                          border: Border.all(color: AppColors.border),
                        ),
                        child: TextField(
                          controller: _messageController,
                          style: GoogleFonts.inter(color: AppColors.textPrimary),
                          decoration: InputDecoration(
                            hintText: 'Type a message...',
                            hintStyle: GoogleFonts.inter(color: AppColors.textHint),
                            border: InputBorder.none,
                            contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                          ),
                          onSubmitted: (_) => _sendMessage(),
                        ),
                      ),
                    ),
                    const SizedBox(width: 12),
                    GestureDetector(
                      onTap: _sendMessage,
                      child: Container(
                        width: 48, height: 48,
                        decoration: const BoxDecoration(gradient: AppColors.buttonGradient, shape: BoxShape.circle),
                        child: const Icon(Icons.send_rounded, color: Colors.white, size: 20),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      );
  }

  Widget _buildEmptyChat() {
    return Center(child: Column(mainAxisSize: MainAxisSize.min, children: [
      const Text('💬', style: TextStyle(fontSize: 48)),
      const SizedBox(height: 12),
      Text('Say hello!', style: GoogleFonts.fredoka(fontSize: 22, color: AppColors.textPrimary)),
      const SizedBox(height: 4),
      Text('Start your conversation', style: GoogleFonts.inter(fontSize: 13, color: AppColors.textSecondary)),
    ]));
  }

  String _getEmojiForName(String name) {
    final emojis = ['😊', '🎨', '🎸', '📚', '🏔️', '☕', '🌟', '🎯', '🔥', '💫'];
    return emojis[name.length % emojis.length];
  }
}

class _MessageBubble extends StatelessWidget {
  final String text;
  final bool isMe;
  final DateTime time;

  const _MessageBubble({
    required this.text,
    required this.isMe,
    required this.time,
  });

  @override
  Widget build(BuildContext context) {
    return Align(
      alignment: isMe ? Alignment.centerRight : Alignment.centerLeft,
      child: Container(
        margin: const EdgeInsets.only(bottom: 8),
        padding: const EdgeInsets.symmetric(
          horizontal: 16,
          vertical: 12,
        ),
        decoration: BoxDecoration(
          gradient: isMe ? AppColors.buttonGradient : null,
          color: isMe ? null : AppColors.surfaceCard,
          borderRadius: BorderRadius.circular(16),
        ),
        child: Text(text, style: GoogleFonts.inter(fontSize: 14, color: isMe ? Colors.white : AppColors.textPrimary)),
      ),
    );
  }
}
