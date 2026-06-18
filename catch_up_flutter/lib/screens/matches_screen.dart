import 'package:flutter/material.dart';
import '../theme/app_colors.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';
import '../providers/match_provider.dart';
import '../models/user_models.dart';
import 'chat_screen.dart';

class MatchesScreen extends ConsumerWidget {
  const MatchesScreen({super.key});

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
                  Text('Matches 💞', style: GoogleFonts.fredoka(fontSize: 28, fontWeight: FontWeight.w700, color: AppColors.textPrimary)),
                  matchesAsync.when(
                    data: (matches) => Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                      decoration: BoxDecoration(
                        color: AppColors.surfaceCard,
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(color: AppColors.border),
                      ),
                      child: Text('${matches.length} matches',
                          style: GoogleFonts.inter(fontSize: 13, fontWeight: FontWeight.w600, color: AppColors.primaryDark)),
                    ),
                    loading: () => const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2, color: AppColors.primary)),
                    error: (_, __) => const SizedBox(),
                  ),
                ],
              ),
            ),

            // Matches list
            Expanded(
              child: matchesAsync.when(
                data: (matches) => matches.isEmpty
                    ? _buildEmptyState()
                    : ListView.builder(
                        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                        itemCount: matches.length,
                        itemBuilder: (context, index) => _MatchCard(match: matches[index]),
                      ),
                loading: () => const Center(child: CircularProgressIndicator(color: AppColors.primary)),
                error: (err, _) => Center(child: Column(mainAxisSize: MainAxisSize.min, children: [
                  const Icon(Icons.error_outline, size: 48, color: AppColors.textHint),
                  const SizedBox(height: 12),
                  Text('Could not load matches', style: GoogleFonts.fredoka(fontSize: 18, color: AppColors.textPrimary)),
                ])),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
        Container(
          width: 100, height: 100,
          decoration: const BoxDecoration(color: AppColors.surfaceCard, shape: BoxShape.circle),
          child: const Icon(Icons.favorite_border, size: 48, color: AppColors.primary),
        ),
        const SizedBox(height: 24),
        Text('No matches yet', style: GoogleFonts.fredoka(fontSize: 24, color: AppColors.textPrimary)),
        const SizedBox(height: 8),
        Text('Keep swiping to find your match!', style: GoogleFonts.inter(fontSize: 14, color: AppColors.textSecondary)),
      ]),
    );
  }
}

class _MatchCard extends StatelessWidget {
  final Match match;

  const _MatchCard({required this.match});

  @override
  Widget build(BuildContext context) {
    final displayName = match.displayName ?? match.username ?? 'Unknown';
    final emojis = ['😊','🎨','🎸','📚','🏔️','☕','🌟','🎯','🔥','💫'];
    final emoji = emojis[displayName.length % emojis.length];
    final compat = match.compatibilityScore != null ? (match.compatibilityScore! * 100).toInt() : null;

    return GestureDetector(
      onTap: () => Navigator.push(context, MaterialPageRoute(
        builder: (_) => ChatDetailScreen(
          matchId: match.id,
          displayName: displayName,
          partnerId: match.partnerId ?? '',
        ),
      )),
      child: Container(
        margin: const EdgeInsets.only(bottom: 12),
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: AppColors.border),
          boxShadow: [BoxShadow(color: AppColors.primary.withOpacity(0.06), blurRadius: 8, offset: const Offset(0, 2))],
        ),
        child: Row(children: [
          // Avatar
          Container(
            width: 58, height: 58,
            decoration: BoxDecoration(gradient: AppColors.buttonGradient, borderRadius: BorderRadius.circular(29)),
            child: Center(child: Text(emoji, style: const TextStyle(fontSize: 26))),
          ),
          const SizedBox(width: 14),
          // Info
          Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Row(children: [
              Text(displayName, style: GoogleFonts.fredoka(fontSize: 18, fontWeight: FontWeight.w600, color: AppColors.textPrimary)),
              if (match.isVerified == true) ...[
                const SizedBox(width: 4),
                const Icon(Icons.verified, size: 15, color: Color(0xFF00C853)),
              ],
            ]),
            const SizedBox(height: 3),
            if (match.lastMessage != null)
              Text(match.lastMessage!, style: GoogleFonts.inter(fontSize: 13, color: AppColors.textHint), maxLines: 1, overflow: TextOverflow.ellipsis)
            else if (compat != null)
              Row(children: [
                Icon(Icons.favorite, size: 13, color: AppColors.accent),
                const SizedBox(width: 4),
                Text('$compat% compatibility', style: GoogleFonts.inter(fontSize: 13, fontWeight: FontWeight.w600, color: AppColors.accent)),
              ]),
          ])),
          // Time + arrow
          Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
            if (match.lastMessageAt != null)
              Text(_formatTime(match.lastMessageAt!), style: GoogleFonts.inter(fontSize: 11, color: AppColors.textHint)),
            const SizedBox(height: 4),
            const Icon(Icons.chevron_right_rounded, color: AppColors.textHint, size: 20),
          ]),
        ]),
      ),
    );
  }

  String _formatTime(DateTime time) {
    final diff = DateTime.now().difference(time);
    if (diff.inDays > 0) return '${diff.inDays}d';
    if (diff.inHours > 0) return '${diff.inHours}h';
    if (diff.inMinutes > 0) return '${diff.inMinutes}m';
    return 'now';
  }
}
