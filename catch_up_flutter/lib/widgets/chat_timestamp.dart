import 'package:flutter/material.dart';
import 'package:timeago/timeago.dart' as timeago;
import 'package:intl/intl.dart';

/// Chat timestamp formatting with timeago

class ChatTimestamp extends StatelessWidget {
  final DateTime timestamp;
  final bool showFullDate;
  final TextStyle? style;

  const ChatTimestamp({
    super.key,
    required this.timestamp,
    this.showFullDate = false,
    this.style,
  });

  String _formatTime() {
    final now = DateTime.now();
    final difference = now.difference(timestamp);

    if (showFullDate) {
      return DateFormat('MMM d, yyyy').format(timestamp);
    }

    // For recent messages (less than 24 hours), use timeago
    if (difference.inHours < 24) {
      return timeago.format(timestamp, locale: 'en_short');
    }

    // For older messages, show date
    if (difference.inDays < 7) {
      return DateFormat('EEEE').format(timestamp); // Monday, Tuesday, etc.
    }

    return DateFormat('MMM d').format(timestamp); // Jan 12
  }

  @override
  Widget build(BuildContext context) {
    return Text(
      _formatTime(),
      style: style ?? TextStyle(
        color: Colors.white.withOpacity(0.6),
        fontSize: 12,
      ),
    );
  }
}

class MessageTimeGroup extends StatelessWidget {
  final DateTime date;

  const MessageTimeGroup({super.key, required this.date});

  @override
  Widget build(BuildContext context) {
    final now = DateTime.now();
    final difference = now.difference(date);

    String label;
    if (difference.inDays == 0) {
      label = 'Today';
    } else if (difference.inDays == 1) {
      label = 'Yesterday';
    } else {
      label = DateFormat('MMMM d, yyyy').format(date);
    }

    return Center(
      child: Container(
        margin: const EdgeInsets.symmetric(vertical: 16),
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
        decoration: BoxDecoration(
          color: Colors.white.withOpacity(0.1),
          borderRadius: BorderRadius.circular(12),
        ),
        child: Text(
          label,
          style: TextStyle(
            color: Colors.white.withOpacity(0.7),
            fontSize: 12,
            fontWeight: FontWeight.w500,
          ),
        ),
      ),
    );
  }
}

class LastSeenIndicator extends StatelessWidget {
  final DateTime? lastSeen;

  const LastSeenIndicator({super.key, this.lastSeen});

  @override
  Widget build(BuildContext context) {
    if (lastSeen == null) {
      return Text(
        'Offline',
        style: TextStyle(
          color: Colors.white.withOpacity(0.6),
          fontSize: 12,
        ),
      );
    }

    final now = DateTime.now();
    final difference = now.difference(lastSeen!);

    String status;
    if (difference.inMinutes < 1) {
      status = 'Active now';
    } else if (difference.inHours < 1) {
      status = 'Active ${difference.inMinutes}m ago';
    } else if (difference.inHours < 24) {
      status = 'Active ${difference.inHours}h ago';
    } else {
      status = 'Last seen ${timeago.format(lastSeen!)}';
    }

    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          width: 8,
          height: 8,
          decoration: BoxDecoration(
            color: difference.inMinutes < 5 
                ? const Color(0xFF00FF88) 
                : Colors.grey,
            shape: BoxShape.circle,
          ),
        ),
        const SizedBox(width: 6),
        Text(
          status,
          style: TextStyle(
            color: Colors.white.withOpacity(0.6),
            fontSize: 12,
          ),
        ),
      ],
    );
  }
}

class TypingIndicator extends StatefulWidget {
  const TypingIndicator({super.key});

  @override
  State<TypingIndicator> createState() => _TypingIndicatorState();
}

class _TypingIndicatorState extends State<TypingIndicator>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1200),
    )..repeat();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Text(
          'typing',
          style: TextStyle(
            color: Colors.white.withOpacity(0.6),
            fontSize: 12,
            fontStyle: FontStyle.italic,
          ),
        ),
        const SizedBox(width: 4),
        ...List.generate(3, (index) {
          return AnimatedBuilder(
            animation: _controller,
            builder: (context, child) {
              final delay = index * 0.3;
              final value = (_controller.value + delay) % 1.0;
              final opacity = 0.3 + (0.7 * (value < 0.5 ? value * 2 : (1 - value) * 2));
              
              return Container(
                margin: const EdgeInsets.symmetric(horizontal: 2),
                width: 4,
                height: 4,
                decoration: BoxDecoration(
                  color: Colors.white.withOpacity(opacity),
                  shape: BoxShape.circle,
                ),
              );
            },
          );
        }),
      ],
    );
  }
}
