import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../design/tokens.dart';
import '../providers/match_provider.dart';
import '../models/user_models.dart';
import '../widgets/avatar_display.dart';
import 'chat_screen.dart';

class SwipeScreen extends ConsumerStatefulWidget {
  const SwipeScreen({super.key});
  @override
  ConsumerState<SwipeScreen> createState() => _SwipeScreenState();
}

class _SwipeScreenState extends ConsumerState<SwipeScreen> {
  String _activeFilter = 'All';
  final List<String> _filters = ['All', 'Near Me', 'Verified', 'New'];

  @override
  Widget build(BuildContext context) {
    final candidatesAsync = ref.watch(discoverCandidatesProvider);
    return Scaffold(
      backgroundColor: AppTokens.bg,
      body: SafeArea(
        child: Column(
          children: [
            _buildHeader(),
            _buildFilters(),
            Expanded(
              child: candidatesAsync.when(
                data: (candidates) => _CardStack(candidates: candidates),
                loading: () => const Center(child: CircularProgressIndicator(color: AppTokens.accent)),
                error: (err, stack) => Center(
                  child: Column(mainAxisSize: MainAxisSize.min, children: [
                    const Icon(Icons.wifi_off, size: 48, color: AppTokens.textMid),
                    const SizedBox(height: 12),
                    Text('Could not load profiles', style: AppTokens.textStyles.h2),
                    const SizedBox(height: 6),
                    Text(err.toString(), style: AppTokens.textStyles.bodySm.copyWith(color: AppTokens.textMid), textAlign: TextAlign.center),
                  ]),
                ),
              ),
            ),
            const SizedBox(height: 12),
          ],
        ),
      ),
    );
  }

  Widget _buildHeader() {
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 16, 20, 8),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text('Discover', style: AppTokens.textStyles.h1),
          Row(children: [
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
              decoration: BoxDecoration(
                color: AppTokens.surface,
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: AppTokens.border),
              ),
              child: Row(mainAxisSize: MainAxisSize.min, children: [
                const Icon(Icons.bolt, color: Color(0xFFFFB300), size: 16),
                const SizedBox(width: 4),
                Text('2,450', style: AppTokens.textStyles.body.copyWith(fontWeight: FontWeight.w600)),
              ]),
            ),
            const SizedBox(width: 8),
            GestureDetector(
              onTap: _showFilterSheet,
              child: Container(
                width: 38, height: 38,
                decoration: BoxDecoration(color: AppTokens.surface, borderRadius: BorderRadius.circular(AppTokens.r12), border: Border.all(color: AppTokens.border)),
                child: const Icon(Icons.tune_rounded, color: AppTokens.textHi, size: 20),
              ),
            ),
          ]),
        ],
      ),
    );
  }

  Widget _buildFilters() {
    return SizedBox(
      height: 36,
      child: ListView.separated(
        padding: const EdgeInsets.symmetric(horizontal: 20),
        scrollDirection: Axis.horizontal,
        itemCount: _filters.length,
        separatorBuilder: (_, __) => const SizedBox(width: 8),
        itemBuilder: (context, i) {
          final active = _filters[i] == _activeFilter;
          return GestureDetector(
            onTap: () => setState(() => _activeFilter = _filters[i]),
            child: AnimatedContainer(
              duration: const Duration(milliseconds: 200),
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
              decoration: BoxDecoration(
                gradient: active ? const LinearGradient(colors: [AppTokens.accent, AppTokens.accentMuted]) : null,
                color: active ? null : AppTokens.surface,
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: active ? Colors.transparent : AppTokens.border),
              ),
              child: Text(_filters[i], style: AppTokens.textStyles.body.copyWith(fontSize: 13, fontWeight: FontWeight.w600, color: active ? Colors.white : AppTokens.textMid)),
            ),
          );
        },
      ),
    );
  }

  void _showFilterSheet() {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      builder: (_) => Container(
        decoration: const BoxDecoration(color: AppTokens.surface, borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
        padding: const EdgeInsets.all(24),
        child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text('Filters', style: AppTokens.textStyles.h2.copyWith(fontSize: 24, color: AppTokens.textHi, fontWeight: FontWeight.w600)),
          const SizedBox(height: 20),
          Text('Distance', style: AppTokens.textStyles.body.copyWith(fontSize: 14, fontWeight: FontWeight.w600, color: AppTokens.textMid)),
          const SizedBox(height: 8),
          SliderTheme(
            data: SliderTheme.of(context).copyWith(activeTrackColor: AppTokens.accent, thumbColor: AppTokens.accentMuted, inactiveTrackColor: AppTokens.border),
            child: Slider(value: 50, min: 5, max: 200, onChanged: (_) {}),
          ),
          const SizedBox(height: 16),
          Text('Age Range', style: AppTokens.textStyles.body.copyWith(fontSize: 14, fontWeight: FontWeight.w600, color: AppTokens.textMid)),
          const SizedBox(height: 8),
          RangeSlider(
            values: const RangeValues(20, 35),
            min: 18, max: 60,
            activeColor: AppTokens.accent,
            inactiveColor: AppTokens.border,
            onChanged: (_) {},
          ),
          const SizedBox(height: 24),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: () => Navigator.pop(context),
              style: ElevatedButton.styleFrom(backgroundColor: AppTokens.accentMuted, foregroundColor: Colors.white, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)), padding: const EdgeInsets.symmetric(vertical: 14)),
              child: Text('Apply Filters', style: AppTokens.textStyles.body.copyWith(fontWeight: FontWeight.w600)),
            ),
          ),
        ]),
      ),
    );
  }
}

class _CardStack extends ConsumerStatefulWidget {
  final List<DiscoverCandidate> candidates;
  const _CardStack({required this.candidates});
  @override
  ConsumerState<_CardStack> createState() => _CardStackState();
}

class _CardStackState extends ConsumerState<_CardStack> with SingleTickerProviderStateMixin {
  int _currentIndex = 0;
  late AnimationController _animController;
  Offset _dragOffset = Offset.zero;
  double _dragAngle = 0;

  @override
  void initState() {
    super.initState();
    _animController = AnimationController(vsync: this, duration: const Duration(milliseconds: 300));
  }

  @override
  void dispose() { _animController.dispose(); super.dispose(); }

  Future<void> _swipe(bool like) async {
    if (_currentIndex >= widget.candidates.length) return;
    final candidate = widget.candidates[_currentIndex];
    setState(() {
      _currentIndex++;
      _dragOffset = Offset.zero;
      _dragAngle = 0;
    });
    if (like) {
      try {
        final result = await ref.read(matchActionProvider.notifier).likeUser(candidate.id);
        if (mounted && result?.isNewMatch == true) {
          _showMatchPopup(candidate);
        }
      } catch (_) {}
    } else {
      try { await ref.read(matchActionProvider.notifier).passUser(candidate.id); } catch (_) {}
    }
  }

  void _showMatchPopup(DiscoverCandidate candidate) {
    if (!mounted) return;
    showDialog(
      context: context,
      barrierColor: Colors.black54,
      builder: (_) => _MatchPopup(candidate: candidate),
    );
  }

  @override
  Widget build(BuildContext context) {
    if (_currentIndex >= widget.candidates.length) {
      return Center(child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
        const Icon(Icons.check_circle, size: 64, color: AppTokens.accent),
        const SizedBox(height: 16),
        Text('You\'ve seen everyone!', style: AppTokens.textStyles.h2.copyWith(fontSize: 24, color: AppTokens.textHi)),
        const SizedBox(height: 8),
        Text('Check back soon for new profiles', style: AppTokens.textStyles.body.copyWith(fontSize: 14, color: AppTokens.textMid)),
        const SizedBox(height: 24),
        ElevatedButton(
          onPressed: () => setState(() => _currentIndex = 0),
          style: ElevatedButton.styleFrom(backgroundColor: AppTokens.accentMuted, foregroundColor: Colors.white, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14))),
          child: Text('Start Over', style: AppTokens.textStyles.body.copyWith(fontWeight: FontWeight.w600)),
        ),
      ]));
    }

    final screenW = MediaQuery.of(context).size.width;
    final swipeProgress = (_dragOffset.dx / screenW).clamp(-1.0, 1.0);

    return Column(children: [
      Expanded(
        child: Stack(alignment: Alignment.center, children: [
          // Background card
          if (_currentIndex + 1 < widget.candidates.length)
            Transform.scale(
              scale: 0.92 + 0.08 * (_dragOffset.dx.abs() / 150).clamp(0.0, 1.0),
              child: _ProfileCard(candidate: widget.candidates[_currentIndex + 1], isTop: false, swipeProgress: 0),
            ),
          // Top draggable card
          GestureDetector(
            onPanUpdate: (details) => setState(() {
              _dragOffset += details.delta;
              _dragAngle = (_dragOffset.dx / screenW) * 0.4;
            }),
            onPanEnd: (_) {
              if (_dragOffset.dx > 100) _swipe(true);
              else if (_dragOffset.dx < -100) _swipe(false);
              else setState(() { _dragOffset = Offset.zero; _dragAngle = 0; });
            },
            child: Transform.translate(
              offset: _dragOffset,
              child: Transform.rotate(
                angle: _dragAngle,
                child: _ProfileCard(candidate: widget.candidates[_currentIndex], isTop: true, swipeProgress: swipeProgress),
              ),
            ),
          ),
        ]),
      ),
      // Action Buttons
      Padding(
        padding: const EdgeInsets.symmetric(horizontal: 40, vertical: 16),
        child: Row(mainAxisAlignment: MainAxisAlignment.spaceEvenly, children: [
          _ActionButton(icon: Icons.close_rounded, color: Colors.white, iconColor: AppTokens.danger, onTap: () { _swipe(false); }, size: 60, borderColor: const Color(0xFFFFCDD2)),
          _ActionButton(icon: Icons.star_rounded, color: Colors.white, iconColor: const Color(0xFFFFB300), onTap: () {}, size: 48, borderColor: const Color(0xFFFFF9C4)),
          _ActionButton(icon: Icons.favorite_rounded, gradient: const LinearGradient(colors: [AppTokens.accent, AppTokens.accentMuted]), iconColor: Colors.white, onTap: () { _swipe(true); }, size: 60, borderColor: Colors.transparent),
        ]),
      ),
    ]);
  }
}

class _ProfileCard extends StatelessWidget {
  final DiscoverCandidate candidate;
  final bool isTop;
  final double swipeProgress;

  const _ProfileCard({required this.candidate, required this.isTop, required this.swipeProgress});

  @override
  Widget build(BuildContext context) {
    final name = candidate.displayName ?? candidate.username ?? 'Anonymous';
    final emoji = ['😊','🎨','🎸','📚','🏔️','☕','🌟','🎯','🔥','💫'][name.length % 10];
    final compat = 72 + (name.length * 3 % 25);
    final isLiking = swipeProgress > 0.15;
    final isDisliking = swipeProgress < -0.15;

    return Stack(children: [
      Container(
        width: 320,
        height: 460,
        decoration: BoxDecoration(
          color: AppTokens.surface,
          borderRadius: BorderRadius.circular(28),
          border: Border.all(color: isLiking ? AppTokens.accent.withOpacity(0.6) : isDisliking ? AppTokens.danger.withOpacity(0.4) : AppTokens.border, width: isLiking || isDisliking ? 2 : 1),
          boxShadow: [BoxShadow(color: AppTokens.accent.withOpacity(0.15), blurRadius: 24, offset: const Offset(0, 8))],
        ),
        child: ClipRRect(
          borderRadius: BorderRadius.circular(28),
          child: Column(children: [
            // Photo area
            Expanded(
              flex: 3,
              child: Container(
                decoration: BoxDecoration(gradient: LinearGradient(begin: Alignment.topLeft, end: Alignment.bottomRight, colors: [AppTokens.surface2, AppTokens.accent.withOpacity(0.6)])),
                child: Stack(children: [
                  Center(
                    child: AvatarDisplay(
                      notionConfig: candidate.bitmojiConfig,
                      avatarIpfsHash: candidate.avatarIpfsHash,
                      size: 180,
                      fallback: Text(emoji, style: const TextStyle(fontSize: 100)),
                    ),
                  ),
                  // Compatibility badge
                  Positioned(top: 14, right: 14,
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                      decoration: BoxDecoration(color: Colors.white.withOpacity(0.9), borderRadius: BorderRadius.circular(20)),
                      child: Row(mainAxisSize: MainAxisSize.min, children: [
                        Icon(Icons.favorite, size: 12, color: AppTokens.accent),
                        const SizedBox(width: 4),
                        Text('$compat%', style: AppTokens.textStyles.body.copyWith(fontSize: 12, fontWeight: FontWeight.w700, color: AppTokens.textHi)),
                      ]),
                    ),
                  ),
                  if (candidate.isVerified == true)
                    Positioned(top: 14, left: 14,
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                        decoration: BoxDecoration(color: const Color(0xFF00C853), borderRadius: BorderRadius.circular(20)),
                        child: Row(mainAxisSize: MainAxisSize.min, children: [
                          const Icon(Icons.verified, size: 12, color: Colors.white),
                          const SizedBox(width: 4),
                          Text('Verified', style: AppTokens.textStyles.body.copyWith(fontSize: 11, fontWeight: FontWeight.w600, color: Colors.white)),
                        ]),
                      ),
                    ),
                ]),
              ),
            ),
            // Info area
            Expanded(
              flex: 2,
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Row(children: [
                    Expanded(child: Text(name, style: AppTokens.textStyles.h2.copyWith(fontSize: 24, fontWeight: FontWeight.w600, color: AppTokens.textHi))),
                    if (candidate.countryCode != null)
                      Text('📍 ${candidate.countryCode}', style: AppTokens.textStyles.body.copyWith(fontSize: 13, color: AppTokens.textMid)),
                  ]),
                  const SizedBox(height: 6),
                  // Compatibility bar
                  Row(children: [
                    Text('Match', style: AppTokens.textStyles.body.copyWith(fontSize: 12, color: AppTokens.textMid)),
                    const SizedBox(width: 8),
                    Expanded(child: ClipRRect(
                      borderRadius: BorderRadius.circular(4),
                      child: LinearProgressIndicator(
                        value: compat / 100,
                        backgroundColor: AppTokens.border,
                        valueColor: AlwaysStoppedAnimation<Color>(AppTokens.accentMuted),
                        minHeight: 6,
                      ),
                    )),
                    const SizedBox(width: 8),
                    Text('$compat%', style: AppTokens.textStyles.body.copyWith(fontSize: 12, fontWeight: FontWeight.w700, color: AppTokens.accentMuted)),
                  ]),
                  const SizedBox(height: 8),
                  if (candidate.bio != null)
                    Text(candidate.bio!, style: AppTokens.textStyles.body.copyWith(fontSize: 13, color: AppTokens.textMid, height: 1.4), maxLines: 2, overflow: TextOverflow.ellipsis),
                ]),
              ),
            ),
          ]),
        ),
      ),
      // Like / Nope overlay
      if (isLiking)
        Positioned(top: 20, left: 20,
          child: Transform.rotate(angle: -0.3,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
              decoration: BoxDecoration(border: Border.all(color: AppTokens.accent, width: 3), borderRadius: BorderRadius.circular(10)),
              child: Text('LIKE', style: AppTokens.textStyles.h2.copyWith(fontSize: 28, color: AppTokens.accent, fontWeight: FontWeight.w700)),
            ),
          ),
        ),
      if (isDisliking)
        Positioned(top: 20, right: 20,
          child: Transform.rotate(angle: 0.3,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
              decoration: BoxDecoration(border: Border.all(color: AppTokens.danger, width: 3), borderRadius: BorderRadius.circular(10)),
              child: Text('NOPE', style: AppTokens.textStyles.h2.copyWith(fontSize: 28, color: AppTokens.danger, fontWeight: FontWeight.w700)),
            ),
          ),
        ),
    ]);
  }
}

class _ActionButton extends StatelessWidget {
  final IconData icon;
  final Color? color;
  final LinearGradient? gradient;
  final Color iconColor;
  final VoidCallback onTap;
  final double size;
  final Color borderColor;

  const _ActionButton({required this.icon, this.color, this.gradient, required this.iconColor, required this.onTap, this.size = 56, required this.borderColor});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: size, height: size,
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          color: color,
          gradient: gradient,
          border: Border.all(color: borderColor, width: 1.5),
          boxShadow: [BoxShadow(color: AppTokens.accent.withOpacity(0.15), blurRadius: 12, offset: const Offset(0, 4))],
        ),
        child: Icon(icon, color: iconColor, size: size * 0.42),
      ),
    );
  }
}

// ── Match Popup ────────────────────────────────────────────────
class _MatchPopup extends StatelessWidget {
  final DiscoverCandidate candidate;
  const _MatchPopup({required this.candidate});

  @override
  Widget build(BuildContext context) {
    final name = candidate.displayName ?? candidate.username ?? 'Someone';
    final emoji = ['😊','🎨','🎸','📚','🏔️','☕','🌟','🎯','🔥','💫'][name.length % 10];
    return Dialog(
      backgroundColor: Colors.transparent,
      child: Container(
        padding: const EdgeInsets.all(32),
        decoration: BoxDecoration(
          color: AppTokens.surface,
          borderRadius: BorderRadius.circular(28),
          boxShadow: [BoxShadow(color: AppTokens.accent.withOpacity(0.3), blurRadius: 40, spreadRadius: 8)],
        ),
        child: Column(mainAxisSize: MainAxisSize.min, children: [
          ShaderMask(
            shaderCallback: (bounds) => const LinearGradient(colors: [AppTokens.accent, AppTokens.accentMuted]).createShader(bounds),
            child: Text('It\'s a Match! 💘', style: AppTokens.textStyles.h2.copyWith(fontSize: 32, fontWeight: FontWeight.w700, color: Colors.white)),
          ),
          const SizedBox(height: 8),
          Text('You and $name liked each other!', style: AppTokens.textStyles.body.copyWith(fontSize: 15, color: AppTokens.textMid), textAlign: TextAlign.center),
          const SizedBox(height: 24),
          Row(mainAxisAlignment: MainAxisAlignment.center, children: [
            Container(width: 72, height: 72, decoration: BoxDecoration(gradient: const LinearGradient(colors: [AppTokens.accent, AppTokens.accentMuted]), shape: BoxShape.circle, border: Border.all(color: Colors.white, width: 3)), child: const Center(child: Text('', style: TextStyle(fontSize: 36)))),
            const SizedBox(width: 8),
            const Icon(Icons.favorite, color: AppTokens.accent, size: 28),
            const SizedBox(width: 8),
            Container(width: 72, height: 72, decoration: BoxDecoration(gradient: const LinearGradient(colors: [AppTokens.accent, AppTokens.accentMuted]), shape: BoxShape.circle, border: Border.all(color: Colors.white, width: 3)), child: Center(child: Text(emoji, style: const TextStyle(fontSize: 36)))),
          ]),
          const SizedBox(height: 28),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: () {
                Navigator.pop(context);
                Navigator.push(context, MaterialPageRoute(builder: (_) => ChatDetailScreen(matchId: 'new', displayName: name, partnerId: candidate.id)));
              },
              style: ElevatedButton.styleFrom(backgroundColor: AppTokens.accentMuted, foregroundColor: Colors.white, padding: const EdgeInsets.symmetric(vertical: 14), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14))),
              child: Text('Send a Message 💬', style: AppTokens.textStyles.body.copyWith(fontWeight: FontWeight.w700, fontSize: 15)),
            ),
          ),
          const SizedBox(height: 10),
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: Text('Keep Swiping', style: AppTokens.textStyles.body.copyWith(color: AppTokens.textMid, fontSize: 14)),
          ),
        ]),
      ),
    );
  }
}
