import 'dart:math';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';
import '../theme/app_colors.dart';
import '../providers/auth_provider.dart';
import '../services/api_service.dart';

class ProfileSetupScreen extends ConsumerStatefulWidget {
  final VoidCallback onComplete;
  const ProfileSetupScreen({super.key, required this.onComplete});

  @override
  ConsumerState<ProfileSetupScreen> createState() => _ProfileSetupScreenState();
}

class _ProfileSetupScreenState extends ConsumerState<ProfileSetupScreen>
    with TickerProviderStateMixin {
  final PageController _pageController = PageController();
  int _step = 0;
  final int _totalSteps = 5;

  // Step 1 - Name
  final _nameController = TextEditingController();
  final _usernameController = TextEditingController();

  // Step 2 - Avatar (emoji picker for now)
  String _selectedEmoji = '😊';

  // Step 3 - Bio
  final _bioController = TextEditingController();
  String _selectedCountry = '🇮🇳 India';

  // Step 4 - Interests
  final List<String> _allInterests = [
    '🎵 Music', '🎮 Gaming', '🏋️ Fitness', '✈️ Travel', '📚 Reading',
    '🍕 Foodie', '🎨 Art', '💻 Tech', '🌿 Nature', '📸 Photography',
    '🎬 Movies', '🐾 Pets', '💃 Dancing', '🏄 Sports', '🧘 Yoga',
    '🚀 Web3', '₿ Crypto', '🎭 Theatre', '🍳 Cooking', '🎯 Startups',
  ];
  final Set<String> _selectedInterests = {};

  // Step 5 - Done
  bool _isSaving = false;
  late AnimationController _celebrationController;
  late AnimationController _pulseController;

  @override
  void initState() {
    super.initState();
    _celebrationController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1200),
    );
    _pulseController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1500),
    )..repeat(reverse: true);
  }

  @override
  void dispose() {
    _pageController.dispose();
    _nameController.dispose();
    _usernameController.dispose();
    _bioController.dispose();
    _celebrationController.dispose();
    _pulseController.dispose();
    super.dispose();
  }

  Future<void> _saveAndComplete() async {
    setState(() => _isSaving = true);
    try {
      final token = ref.read(authProvider).token;
      if (token != null) {
        final countryCode = _selectedCountry.split(' ').last.substring(0, 2).toUpperCase();
        await ApiService().updateProfile(
          token: token,
          displayName: _nameController.text.trim().isEmpty ? 'Anonymous' : _nameController.text.trim(),
          username: _usernameController.text.trim().isEmpty
              ? _nameController.text.trim().toLowerCase().replaceAll(' ', '_')
              : _usernameController.text.trim().toLowerCase(),
          bio: _bioController.text.trim(),
          countryCode: countryCode,
          interests: _selectedInterests.toList(),
        );
        await ref.read(authProvider.notifier).refreshUser();
      }
    } catch (_) {
      // Non-blocking — proceed even if save fails
    }
    if (mounted) {
      setState(() => _isSaving = false);
      widget.onComplete();
    }
  }

  void _next() {
    if (_step < _totalSteps - 1) {
      _pageController.nextPage(duration: const Duration(milliseconds: 400), curve: Curves.easeInOutCubic);
      setState(() => _step++);
      if (_step == _totalSteps - 1) _celebrationController.forward();
    } else {
      widget.onComplete();
    }
  }

  void _back() {
    if (_step > 0) {
      _pageController.previousPage(duration: const Duration(milliseconds: 400), curve: Curves.easeInOutCubic);
      setState(() => _step--);
    }
  }

  bool get _canProceed {
    switch (_step) {
      case 0: return _nameController.text.trim().isNotEmpty;
      case 1: return true;
      case 2: return _bioController.text.trim().isNotEmpty;
      case 3: return _selectedInterests.length >= 3;
      case 4: return true;
      default: return false;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.bgTop,
      body: SafeArea(
        child: Column(
          children: [
            _buildTopBar(),
            _buildProgressBar(),
            Expanded(
              child: PageView(
                controller: _pageController,
                physics: const NeverScrollableScrollPhysics(),
                children: [
                  _buildNameStep(),
                  _buildAvatarStep(),
                  _buildBioStep(),
                  _buildInterestsStep(),
                  _buildDoneStep(),
                ],
              ),
            ),
            if (_step < _totalSteps - 1) _buildBottomBar(),
          ],
        ),
      ),
    );
  }

  Widget _buildTopBar() {
    return Padding(
      padding: const EdgeInsets.fromLTRB(8, 8, 16, 0),
      child: Row(
        children: [
          if (_step > 0)
            IconButton(
              onPressed: _back,
              icon: const Icon(Icons.arrow_back_ios_rounded, color: AppColors.textPrimary, size: 20),
            )
          else
            const SizedBox(width: 48),
          Expanded(
            child: Text(
              _stepTitle,
              textAlign: TextAlign.center,
              style: GoogleFonts.fredoka(fontSize: 20, fontWeight: FontWeight.w600, color: AppColors.textPrimary),
            ),
          ),
          if (_step < _totalSteps - 1)
            TextButton(
              onPressed: _next,
              child: Text('Skip', style: GoogleFonts.inter(fontSize: 14, color: AppColors.textHint)),
            )
          else
            const SizedBox(width: 48),
        ],
      ),
    );
  }

  String get _stepTitle {
    switch (_step) {
      case 0: return 'Your Name';
      case 1: return 'Pick Avatar';
      case 2: return 'About You';
      case 3: return 'Your Interests';
      case 4: return 'All Set!';
      default: return '';
    }
  }

  Widget _buildProgressBar() {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
      child: Row(
        children: List.generate(_totalSteps, (i) {
          final done = i <= _step;
          return Expanded(
            child: Container(
              margin: const EdgeInsets.symmetric(horizontal: 3),
              height: 4,
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(2),
                gradient: done ? AppColors.buttonGradient : null,
                color: done ? null : AppColors.divider,
              ),
            ),
          );
        }),
      ),
    );
  }

  // ── STEP 1: Name ──────────────────────────────────────────
  Widget _buildNameStep() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(24),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        const SizedBox(height: 20),
        Center(child: Text('👋', style: const TextStyle(fontSize: 72))),
        const SizedBox(height: 24),
        Text('What should we call you?', style: GoogleFonts.fredoka(fontSize: 28, color: AppColors.textPrimary, fontWeight: FontWeight.w600)),
        const SizedBox(height: 8),
        Text('This is how others will see you on Bae4U', style: GoogleFonts.inter(fontSize: 14, color: AppColors.textSecondary)),
        const SizedBox(height: 32),
        _inputField(_nameController, 'Display name', Icons.person_outline),
        const SizedBox(height: 16),
        _inputField(_usernameController, 'Username (optional)', Icons.alternate_email),
        const SizedBox(height: 12),
        Text('e.g. sarah_c, alex_w', style: GoogleFonts.inter(fontSize: 12, color: AppColors.textHint)),
      ]),
    );
  }

  // ── STEP 2: Avatar ────────────────────────────────────────
  Widget _buildAvatarStep() {
    final emojis = ['😊','😎','🥰','🤩','😏','🌟','🔥','💫','🎯','🎨','🎸','📚','🏔️','☕','🌈','🦋','🐉','🌺','🎭','🚀'];
    return SingleChildScrollView(
      padding: const EdgeInsets.all(24),
      child: Column(children: [
        const SizedBox(height: 12),
        AnimatedBuilder(
          animation: _pulseController,
          builder: (_, __) => Transform.scale(
            scale: 1.0 + 0.05 * _pulseController.value,
            child: Container(
              width: 120, height: 120,
              decoration: BoxDecoration(gradient: AppColors.buttonGradient, shape: BoxShape.circle,
                boxShadow: [BoxShadow(color: AppColors.primary.withOpacity(0.4), blurRadius: 24, spreadRadius: 4)]),
              child: Center(child: Text(_selectedEmoji, style: const TextStyle(fontSize: 60))),
            ),
          ),
        ),
        const SizedBox(height: 8),
        Text('Tap to change', style: GoogleFonts.inter(fontSize: 13, color: AppColors.textHint)),
        const SizedBox(height: 20),
        // Create a real avatar (bitmoji / AI) from a photo
        GestureDetector(
          onTap: () => Navigator.pushNamed(context, '/avatar-studio'),
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            decoration: BoxDecoration(
              gradient: AppColors.buttonGradient,
              borderRadius: BorderRadius.circular(24),
              boxShadow: [BoxShadow(color: AppColors.primary.withOpacity(0.3), blurRadius: 10, offset: const Offset(0, 3))],
            ),
            child: Row(mainAxisSize: MainAxisSize.min, children: [
              const Icon(Icons.auto_awesome, color: Colors.white, size: 18),
              const SizedBox(width: 8),
              Text('Create bitmoji / AI avatar', style: GoogleFonts.inter(fontSize: 14, fontWeight: FontWeight.w600, color: Colors.white)),
            ]),
          ),
        ),
        const SizedBox(height: 24),
        Text('Or choose your vibe', style: GoogleFonts.fredoka(fontSize: 22, color: AppColors.textPrimary, fontWeight: FontWeight.w600)),
        const SizedBox(height: 16),
        GridView.builder(
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(crossAxisCount: 5, mainAxisSpacing: 12, crossAxisSpacing: 12),
          itemCount: emojis.length,
          itemBuilder: (_, i) {
            final selected = emojis[i] == _selectedEmoji;
            return GestureDetector(
              onTap: () => setState(() => _selectedEmoji = emojis[i]),
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 200),
                decoration: BoxDecoration(
                  color: selected ? AppColors.primaryLight : AppColors.surfaceCard,
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(color: selected ? AppColors.primaryDark : AppColors.divider, width: selected ? 2 : 1),
                  boxShadow: selected ? [BoxShadow(color: AppColors.primary.withOpacity(0.3), blurRadius: 8)] : [],
                ),
                child: Center(child: Text(emojis[i], style: const TextStyle(fontSize: 28))),
              ),
            );
          },
        ),
      ]),
    );
  }

  // ── STEP 3: Bio ───────────────────────────────────────────
  Widget _buildBioStep() {
    final countries = ['🇮🇳 India', '🇺🇸 USA', '🇬🇧 UK', '🇨🇦 Canada', '🇦🇺 Australia', '🇩🇪 Germany', '🇯🇵 Japan', '🇧🇷 Brazil'];
    return SingleChildScrollView(
      padding: const EdgeInsets.all(24),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        const SizedBox(height: 12),
        Text('Tell your story', style: GoogleFonts.fredoka(fontSize: 28, color: AppColors.textPrimary, fontWeight: FontWeight.w600)),
        const SizedBox(height: 8),
        Text('A good bio gets 3x more matches', style: GoogleFonts.inter(fontSize: 14, color: AppColors.textSecondary)),
        const SizedBox(height: 28),
        Container(
          decoration: BoxDecoration(color: AppColors.surface, borderRadius: BorderRadius.circular(16), border: Border.all(color: AppColors.border)),
          child: TextField(
            controller: _bioController,
            maxLines: 5,
            maxLength: 200,
            style: GoogleFonts.inter(fontSize: 15, color: AppColors.textPrimary),
            decoration: InputDecoration(
              hintText: 'Write something about yourself...\n\ne.g. Coffee addict ☕ | Travel lover ✈️ | Building in Web3 🚀',
              hintStyle: GoogleFonts.inter(fontSize: 14, color: AppColors.textHint),
              border: InputBorder.none,
              contentPadding: const EdgeInsets.all(16),
              counterStyle: GoogleFonts.inter(fontSize: 12, color: AppColors.textHint),
            ),
            onChanged: (_) => setState(() {}),
          ),
        ),
        const SizedBox(height: 20),
        Text('Country', style: GoogleFonts.inter(fontSize: 14, fontWeight: FontWeight.w600, color: AppColors.textSecondary)),
        const SizedBox(height: 8),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 16),
          decoration: BoxDecoration(color: AppColors.surface, borderRadius: BorderRadius.circular(14), border: Border.all(color: AppColors.border)),
          child: DropdownButtonHideUnderline(
            child: DropdownButton<String>(
              value: _selectedCountry,
              isExpanded: true,
              style: GoogleFonts.inter(fontSize: 15, color: AppColors.textPrimary),
              dropdownColor: AppColors.surface,
              items: countries.map((c) => DropdownMenuItem(value: c, child: Text(c))).toList(),
              onChanged: (v) => setState(() => _selectedCountry = v!),
            ),
          ),
        ),
      ]),
    );
  }

  // ── STEP 4: Interests ─────────────────────────────────────
  Widget _buildInterestsStep() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(24),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text('What are you into?', style: GoogleFonts.fredoka(fontSize: 28, color: AppColors.textPrimary, fontWeight: FontWeight.w600)),
        const SizedBox(height: 4),
        Text('Pick at least 3 interests', style: GoogleFonts.inter(fontSize: 14, color: AppColors.textSecondary)),
        const SizedBox(height: 6),
        Row(children: [
          Text('${_selectedInterests.length} selected', style: GoogleFonts.inter(fontSize: 13, fontWeight: FontWeight.w600, color: AppColors.primaryDark)),
          Text(' / 3 minimum', style: GoogleFonts.inter(fontSize: 13, color: AppColors.textHint)),
        ]),
        const SizedBox(height: 20),
        Wrap(
          spacing: 10, runSpacing: 10,
          children: _allInterests.map((interest) {
            final selected = _selectedInterests.contains(interest);
            return GestureDetector(
              onTap: () => setState(() {
                if (selected) _selectedInterests.remove(interest);
                else _selectedInterests.add(interest);
              }),
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 200),
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                decoration: BoxDecoration(
                  gradient: selected ? AppColors.buttonGradient : null,
                  color: selected ? null : AppColors.surfaceCard,
                  borderRadius: BorderRadius.circular(24),
                  border: Border.all(color: selected ? Colors.transparent : AppColors.border),
                  boxShadow: selected ? [BoxShadow(color: AppColors.primary.withOpacity(0.25), blurRadius: 8, offset: const Offset(0, 2))] : [],
                ),
                child: Text(interest, style: GoogleFonts.inter(fontSize: 14, fontWeight: FontWeight.w500, color: selected ? Colors.white : AppColors.textSecondary)),
              ),
            );
          }).toList(),
        ),
        const SizedBox(height: 24),
      ]),
    );
  }

  // ── STEP 5: Done ──────────────────────────────────────────
  Widget _buildDoneStep() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
          AnimatedBuilder(
            animation: _celebrationController,
            builder: (_, __) {
              final v = _celebrationController.value;
              return Transform.scale(
                scale: 0.5 + 0.5 * Curves.elasticOut.transform(v.clamp(0.0, 1.0)),
                child: Container(
                  width: 140, height: 140,
                  decoration: BoxDecoration(gradient: AppColors.buttonGradient, shape: BoxShape.circle,
                    boxShadow: [BoxShadow(color: AppColors.primary.withOpacity(0.4), blurRadius: 32, spreadRadius: 8)]),
                  child: Center(child: Text(_selectedEmoji, style: const TextStyle(fontSize: 72))),
                ),
              );
            },
          ),
          const SizedBox(height: 32),
          Text('You\'re ready, ${_nameController.text.isEmpty ? 'friend' : _nameController.text.trim().split(' ').first}! 🎉',
            textAlign: TextAlign.center,
            style: GoogleFonts.fredoka(fontSize: 30, fontWeight: FontWeight.w700, color: AppColors.textPrimary)),
          const SizedBox(height: 12),
          Text('Your profile is set up. Start discovering your perfect match!',
            textAlign: TextAlign.center,
            style: GoogleFonts.inter(fontSize: 15, color: AppColors.textSecondary, height: 1.5)),
          const SizedBox(height: 40),
          // Summary chips
          if (_selectedInterests.isNotEmpty)
            Wrap(
              spacing: 8, runSpacing: 8,
              children: _selectedInterests.take(6).map((i) => Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                decoration: BoxDecoration(color: AppColors.surfaceCard, borderRadius: BorderRadius.circular(20), border: Border.all(color: AppColors.border)),
                child: Text(i, style: GoogleFonts.inter(fontSize: 12, color: AppColors.textSecondary)),
              )).toList(),
            ),
          const SizedBox(height: 40),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: _isSaving ? null : _saveAndComplete,
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.primaryDark,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 18),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                elevation: 0,
              ),
              child: _isSaving
                  ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                  : Text('Start Discovering 💘', style: GoogleFonts.inter(fontSize: 16, fontWeight: FontWeight.w700)),
            ),
          ),
        ]),
      ),
    );
  }

  // ── Shared Widgets ────────────────────────────────────────
  Widget _inputField(TextEditingController ctrl, String hint, IconData icon) {
    return Container(
      decoration: BoxDecoration(color: AppColors.surface, borderRadius: BorderRadius.circular(14), border: Border.all(color: AppColors.border)),
      child: TextField(
        controller: ctrl,
        style: GoogleFonts.inter(fontSize: 16, color: AppColors.textPrimary),
        onChanged: (_) => setState(() {}),
        decoration: InputDecoration(
          prefixIcon: Icon(icon, color: AppColors.textHint, size: 20),
          hintText: hint,
          hintStyle: GoogleFonts.inter(fontSize: 15, color: AppColors.textHint),
          border: InputBorder.none,
          contentPadding: const EdgeInsets.symmetric(vertical: 16),
        ),
      ),
    );
  }

  Widget _buildBottomBar() {
    return Padding(
      padding: const EdgeInsets.fromLTRB(24, 0, 24, 24),
      child: SizedBox(
        width: double.infinity,
        child: ElevatedButton(
          onPressed: _canProceed ? _next : null,
          style: ElevatedButton.styleFrom(
            backgroundColor: AppColors.primaryDark,
            disabledBackgroundColor: AppColors.divider,
            foregroundColor: Colors.white,
            padding: const EdgeInsets.symmetric(vertical: 16),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
            elevation: 0,
          ),
          child: Text(
            _step == _totalSteps - 2 ? 'Finish Setup 🎉' : 'Continue',
            style: GoogleFonts.inter(fontSize: 16, fontWeight: FontWeight.w700),
          ),
        ),
      ),
    );
  }
}
