import 'package:flutter/material.dart';
import '../theme/app_colors.dart';
import 'package:share_plus/share_plus.dart';

/// Profile sharing widget

class ShareProfileButton extends StatelessWidget {
  final String userName;
  final String? userEmoji;
  final String? profileUrl;
  final String message;

  const ShareProfileButton({
    super.key,
    required this.userName,
    this.userEmoji,
    this.profileUrl,
    this.message = 'Check out this profile on Catch Up!',
  });

  void _shareProfile(BuildContext context) {
    final String shareText = '''
$message 💜

👤 $userName ${userEmoji ?? ''}

Join Catch Up - Web3 Dating App
${profileUrl ?? 'https://catchup.app'}
    ''';

    Share.share(
      shareText,
      subject: 'Check out $userName on Catch Up!',
    );
  }

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: () => _shareProfile(context),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
        decoration: BoxDecoration(
          color: Colors.white.withOpacity(0.1),
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: Colors.white.withOpacity(0.2),
          ),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(
              Icons.share,
              color: Colors.white,
              size: 18,
            ),
            const SizedBox(width: 8),
            Text(
              'Share',
              style: TextStyle(
                color: Colors.white.withOpacity(0.9),
                fontSize: 14,
                fontWeight: FontWeight.w500,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class MatchShareCelebration extends StatelessWidget {
  final String matchName;
  final VoidCallback? onShare;
  final VoidCallback? onContinue;

  const MatchShareCelebration({
    super.key,
    required this.matchName,
    this.onShare,
    this.onContinue,
  });

  void _shareMatch() {
    final String shareText = '''
🎉 I just matched with $matchName on Catch Up! 

Find your perfect match too 💜
https://catchup.app
    ''';

    Share.share(
      shareText,
      subject: 'I got a new match on Catch Up! 🎉',
    );

    onShare?.call();
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [Color(0xFFFF6BB0), AppColors.primary],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(24),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFFFF6BB0).withOpacity(0.4),
            blurRadius: 30,
            spreadRadius: 10,
          ),
        ],
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          // Celebration emoji
          TweenAnimationBuilder<double>(
            tween: Tween(begin: 0, end: 1),
            duration: const Duration(milliseconds: 600),
            curve: Curves.elasticOut,
            builder: (context, value, child) {
              return Transform.scale(
                scale: value,
                child: const Text(
                  '🎉',
                  style: TextStyle(fontSize: 60),
                ),
              );
            },
          ),
          const SizedBox(height: 16),
          const Text(
            'It\'s a Match!',
            style: TextStyle(
              color: Colors.white,
              fontSize: 28,
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            'You and $matchName liked each other',
            style: TextStyle(
              color: Colors.white.withOpacity(0.9),
              fontSize: 16,
            ),
          ),
          const SizedBox(height: 24),
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              // Share button
              GestureDetector(
                onTap: _shareMatch,
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: const Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(Icons.share, color: AppColors.primary, size: 20),
                      SizedBox(width: 8),
                      Text(
                        'Share',
                        style: TextStyle(
                          color: AppColors.primary,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(width: 12),
              // Continue button
              GestureDetector(
                onTap: onContinue,
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                  decoration: BoxDecoration(
                    color: Colors.white.withOpacity(0.2),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: Colors.white.withOpacity(0.3)),
                  ),
                  child: const Text(
                    'Continue',
                    style: TextStyle(
                      color: Colors.white,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class InviteFriendsButton extends StatelessWidget {
  final String inviteCode;

  const InviteFriendsButton({super.key, required this.inviteCode});

  void _inviteFriends() {
    final String inviteText = '''
💜 Join me on Catch Up!

The Web3 dating app where connections have real value.

Use my invite code: $inviteCode
https://catchup.app/invite/$inviteCode
    ''';

    Share.share(
      inviteText,
      subject: 'Join me on Catch Up! 💜',
    );
  }

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: _inviteFriends,
      child: Container(
        width: double.infinity,
        padding: const EdgeInsets.symmetric(vertical: 16),
        decoration: BoxDecoration(
          gradient: const LinearGradient(
            colors: [Color(0xFFFF6BB0), AppColors.primary],
          ),
          borderRadius: BorderRadius.circular(16),
          boxShadow: [
            BoxShadow(
              color: const Color(0xFFFF6BB0).withOpacity(0.4),
              blurRadius: 20,
              spreadRadius: 5,
            ),
          ],
        ),
        child: const Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.person_add, color: Colors.white),
            SizedBox(width: 8),
            Text(
              'Invite Friends',
              style: TextStyle(
                color: Colors.white,
                fontSize: 16,
                fontWeight: FontWeight.bold,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
