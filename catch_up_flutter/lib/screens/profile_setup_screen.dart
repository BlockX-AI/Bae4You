import 'dart:typed_data';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:image_picker/image_picker.dart';
import '../theme/app_colors.dart';
import '../providers/auth_provider.dart';
import '../providers/avataaars_provider.dart';
import '../models/avataaars.dart';
import '../widgets/avataaars_display.dart';
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
  final int _totalSteps = 7;

  // Steps on which the "Skip" action is offered (optional steps only).
  static const Set<int> _skippableSteps = {3, 4, 5};

  // Step 1 - Name
  final _nameController = TextEditingController();
  final _usernameController = TextEditingController();

  // Step 2 - Gender & orientation (required for matching)
  String? _gender;        // 'male' | 'female' | 'nonbinary' | 'other'
  String? _interestedIn;  // 'male' | 'female' | 'everyone'

  // Step 2 - Photos (up to 6, first 3 mandatory). Holds picked image bytes;
  // uploaded to IPFS at save time.
  final ImagePicker _imagePicker = ImagePicker();
  final List<Uint8List> _photoBytes = [];

  // Step 3 - Avatar is built via the Avataaars studio (avataaarsProvider)

  // Step 4 - Bio
  final _bioController = TextEditingController();
  String _selectedCountry = '🇮🇳 India';

  // Step 5 - Interests
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
        final displayName = _nameController.text.trim();
        final bio = _bioController.text.trim();
        // Upload photos to IPFS first so the returned URLs can be saved with
        // the rest of the profile. Non-fatal on failure — don't block setup.
        List<String>? photoUrls;
        if (_photoBytes.isNotEmpty) {
          try {
            photoUrls = await ApiService()
                .uploadPhotos(token: token, photos: _photoBytes);
          } catch (_) {
            // Backend photo endpoint may not be deployed yet; continue without.
          }
        }
        await ApiService().updateProfile(
          token: token,
          displayName: displayName.isEmpty ? 'Anonymous' : displayName,
          username: _usernameController.text.trim().isEmpty
              ? displayName.toLowerCase().replaceAll(' ', '_')
              : _usernameController.text.trim().toLowerCase(),
          bio: bio.isEmpty ? null : bio,
          countryCode: countryCode,
          gender: _gender,
          interestedIn: _interestedIn,
          interests: _selectedInterests.isEmpty ? null : _selectedInterests.toList(),
          photos: photoUrls,
        );
        // Persist the avatar built/randomized during setup. The builder screen
        // saves on its own Save button, but the "Surprise me" shortcut only
        // updates local state — sync it here so the backend has it too.
        final avataaars = ref.read(avataaarsProvider);
        if (avataaars != null) {
          try {
            await ApiService()
                .updateAvataaars(token: token, config: avataaars.toJson());
          } catch (_) {
            // Non-fatal: the avatar is already stored locally and renders
            // offline; don't block profile completion on this sync.
          }
        }
        await ref.read(authProvider.notifier).refreshUser();
      }
    } catch (e) {
      // Surface the failure and let the user retry instead of silently
      // advancing with an unsaved profile.
      if (mounted) {
        setState(() => _isSaving = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Could not save profile: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
      return;
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
      case 1: return _gender != null && _interestedIn != null;
      case 2: return _photoBytes.length >= 3;
      case 3: return true;
      case 4: return _bioController.text.trim().isNotEmpty;
      case 5: return _selectedInterests.length >= 3;
      case 6: return true;
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
                  _buildAboutYouStep(),
                  _buildPhotosStep(),
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
          // Skip is offered only on optional steps (Avatar, Bio, Interests).
          if (_skippableSteps.contains(_step))
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
      case 1: return 'About You';
      case 2: return 'Your Photos';
      case 3: return 'Pick Avatar';
      case 4: return 'Your Story';
      case 5: return 'Your Interests';
      case 6: return 'All Set!';
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

  // ── STEP 2: About You (gender + orientation) ──────────────
  Widget _buildAboutYouStep() {
    const genders = [
      {'value': 'male', 'label': 'Man'},
      {'value': 'female', 'label': 'Woman'},
      {'value': 'nonbinary', 'label': 'Non-binary'},
      {'value': 'other', 'label': 'Other'},
    ];
    const preferences = [
      {'value': 'male', 'label': 'Men'},
      {'value': 'female', 'label': 'Women'},
      {'value': 'everyone', 'label': 'Everyone'},
    ];
    return SingleChildScrollView(
      padding: const EdgeInsets.all(24),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        const SizedBox(height: 12),
        Text('A bit about you', style: GoogleFonts.fredoka(fontSize: 28, color: AppColors.textPrimary, fontWeight: FontWeight.w600)),
        const SizedBox(height: 8),
        Text('This helps us show you the right people.', style: GoogleFonts.inter(fontSize: 14, color: AppColors.textSecondary)),
        const SizedBox(height: 32),
        Text('I am a', style: GoogleFonts.inter(fontSize: 15, fontWeight: FontWeight.w600, color: AppColors.textPrimary)),
        const SizedBox(height: 12),
        Wrap(
          spacing: 10, runSpacing: 10,
          children: genders.map((g) => _choiceChip(
            label: g['label']!,
            selected: _gender == g['value'],
            onTap: () => setState(() => _gender = g['value']),
          )).toList(),
        ),
        const SizedBox(height: 28),
        Text('Show me', style: GoogleFonts.inter(fontSize: 15, fontWeight: FontWeight.w600, color: AppColors.textPrimary)),
        const SizedBox(height: 12),
        Wrap(
          spacing: 10, runSpacing: 10,
          children: preferences.map((p) => _choiceChip(
            label: p['label']!,
            selected: _interestedIn == p['value'],
            onTap: () => setState(() => _interestedIn = p['value']),
          )).toList(),
        ),
      ]),
    );
  }

  Widget _choiceChip({required String label, required bool selected, required VoidCallback onTap}) {
    return GestureDetector(
      onTap: () {
        onTap();
        setState(() {}); // refresh _canProceed on the bottom bar
      },
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 12),
        decoration: BoxDecoration(
          gradient: selected ? AppColors.buttonGradient : null,
          color: selected ? null : AppColors.surfaceCard,
          borderRadius: BorderRadius.circular(24),
          border: Border.all(color: selected ? Colors.transparent : AppColors.border),
          boxShadow: selected ? [BoxShadow(color: AppColors.primary.withOpacity(0.25), blurRadius: 8, offset: const Offset(0, 2))] : [],
        ),
        child: Text(label, style: GoogleFonts.inter(fontSize: 14, fontWeight: FontWeight.w600, color: selected ? Colors.white : AppColors.textSecondary)),
      ),
    );
  }

  // ── STEP 3: Photos ────────────────────────────────────────
  Future<void> _pickPhoto() async {
    if (_photoBytes.length >= 6) return;
    try {
      final XFile? picked = await _imagePicker.pickImage(
        source: ImageSource.gallery,
        maxWidth: 1200,
        imageQuality: 85,
      );
      if (picked == null) return;
      final bytes = await picked.readAsBytes();
      if (!mounted) return;
      setState(() => _photoBytes.add(bytes));
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Could not pick photo: $e'), backgroundColor: Colors.red),
        );
      }
    }
  }

  void _removePhoto(int index) {
    setState(() => _photoBytes.removeAt(index));
  }

  Widget _buildPhotosStep() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(24),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        const SizedBox(height: 12),
        Text('Add your photos', style: GoogleFonts.fredoka(fontSize: 28, color: AppColors.textPrimary, fontWeight: FontWeight.w600)),
        const SizedBox(height: 8),
        Text('Add up to 6 photos — the first 3 are required', style: GoogleFonts.inter(fontSize: 14, color: AppColors.textSecondary)),
        const SizedBox(height: 6),
        Row(children: [
          Text('${_photoBytes.length} added', style: GoogleFonts.inter(fontSize: 13, fontWeight: FontWeight.w600, color: AppColors.primaryDark)),
          Text(' / 3 minimum', style: GoogleFonts.inter(fontSize: 13, color: AppColors.textHint)),
        ]),
        const SizedBox(height: 20),
        GridView.builder(
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          itemCount: 6,
          gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
            crossAxisCount: 3,
            crossAxisSpacing: 12,
            mainAxisSpacing: 12,
            childAspectRatio: 0.75,
          ),
          itemBuilder: (_, i) => _buildPhotoSlot(i),
        ),
        const SizedBox(height: 16),
        Row(children: [
          const Icon(Icons.lock_outline, size: 14, color: AppColors.textHint),
          const SizedBox(width: 6),
          Expanded(
            child: Text('The first photo shows on your swipe card. Tap a photo to remove it.',
                style: GoogleFonts.inter(fontSize: 12, color: AppColors.textHint)),
          ),
        ]),
      ]),
    );
  }

  Widget _buildPhotoSlot(int index) {
    final hasPhoto = index < _photoBytes.length;
    final required = index < 3;
    if (hasPhoto) {
      return GestureDetector(
        onTap: () => _removePhoto(index),
        child: Stack(fit: StackFit.expand, children: [
          ClipRRect(
            borderRadius: BorderRadius.circular(14),
            child: Image.memory(_photoBytes[index], fit: BoxFit.cover),
          ),
          if (index == 0)
            Positioned(
              left: 6, top: 6,
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(gradient: AppColors.buttonGradient, borderRadius: BorderRadius.circular(10)),
                child: Text('Main', style: GoogleFonts.inter(fontSize: 10, fontWeight: FontWeight.w700, color: Colors.white)),
              ),
            ),
          Positioned(
            right: 6, top: 6,
            child: Container(
              padding: const EdgeInsets.all(4),
              decoration: const BoxDecoration(color: Colors.black54, shape: BoxShape.circle),
              child: const Icon(Icons.close, size: 14, color: Colors.white),
            ),
          ),
        ]),
      );
    }
    // Only allow adding into the next empty slot.
    final isNextSlot = index == _photoBytes.length;
    return GestureDetector(
      onTap: isNextSlot ? _pickPhoto : null,
      child: DottedSlot(required: required, enabled: isNextSlot),
    );
  }

  // ── STEP 3: Avatar ────────────────────────────────────────
  Widget _buildAvatarStep() {
    final avataaars = ref.watch(avataaarsProvider);
    final hasAvatar = avataaars != null;
    return SingleChildScrollView(
      padding: const EdgeInsets.all(24),
      child: Column(children: [
        const SizedBox(height: 12),
        AnimatedBuilder(
          animation: _pulseController,
          builder: (_, child) => Transform.scale(
            scale: 1.0 + 0.05 * _pulseController.value,
            child: child,
          ),
          child: Container(
            width: 160,
            height: 160,
            decoration: BoxDecoration(
              gradient: hasAvatar ? null : AppColors.buttonGradient,
              shape: BoxShape.circle,
              boxShadow: [
                BoxShadow(
                    color: AppColors.primary.withOpacity(0.4),
                    blurRadius: 24,
                    spreadRadius: 4)
              ],
            ),
            clipBehavior: Clip.antiAlias,
            child: hasAvatar
                ? AvataaarsDisplay(config: avataaars, size: 160)
                : const Center(
                    child: Icon(Icons.face_retouching_natural,
                        size: 64, color: Colors.white)),
          ),
        ),
        const SizedBox(height: 28),
        Text(
          hasAvatar ? 'Looking good!' : 'Build your avatar',
          style: GoogleFonts.fredoka(
              fontSize: 24,
              color: AppColors.textPrimary,
              fontWeight: FontWeight.w600),
        ),
        const SizedBox(height: 8),
        Text(
          'Customize hair, eyes, outfit and more',
          textAlign: TextAlign.center,
          style: GoogleFonts.inter(fontSize: 14, color: AppColors.textSecondary),
        ),
        const SizedBox(height: 28),
        SizedBox(
          width: double.infinity,
          child: ElevatedButton.icon(
            onPressed: () =>
                Navigator.pushNamed(context, '/avataaars-builder'),
            icon: const Icon(Icons.brush),
            label: Text(hasAvatar ? 'Edit avatar' : 'Open Avatar Studio',
                style: GoogleFonts.inter(
                    fontSize: 16, fontWeight: FontWeight.w700)),
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.primaryDark,
              foregroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(vertical: 16),
              shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(16)),
              elevation: 0,
            ),
          ),
        ),
        const SizedBox(height: 12),
        TextButton.icon(
          onPressed: () => ref
              .read(avataaarsProvider.notifier)
              .save(AvataaarsConfig.random()),
          icon: const Icon(Icons.shuffle, size: 18),
          label: Text('Surprise me',
              style: GoogleFonts.inter(
                  fontSize: 14, color: AppColors.textSecondary)),
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
              final avataaars = ref.watch(avataaarsProvider);
              return Transform.scale(
                scale: 0.5 + 0.5 * Curves.elasticOut.transform(v.clamp(0.0, 1.0)),
                child: Container(
                  width: 140, height: 140,
                  decoration: BoxDecoration(
                    gradient: avataaars == null ? AppColors.buttonGradient : null,
                    shape: BoxShape.circle,
                    boxShadow: [BoxShadow(color: AppColors.primary.withOpacity(0.4), blurRadius: 32, spreadRadius: 8)]),
                  clipBehavior: Clip.antiAlias,
                  child: avataaars != null
                      ? AvataaarsDisplay(config: avataaars, size: 140)
                      : const Center(child: Icon(Icons.celebration, size: 72, color: Colors.white)),
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

class DottedSlot extends StatelessWidget {
  final bool required;
  final bool enabled;
  const DottedSlot({super.key, required this.required, required this.enabled});

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: AppColors.surfaceCard,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(
          color: enabled ? AppColors.primary.withOpacity(0.5) : AppColors.border,
          width: 1.5,
        ),
      ),
      child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
        Icon(
          enabled ? Icons.add_a_photo_outlined : Icons.image_outlined,
          size: 26,
          color: enabled ? AppColors.primaryDark : AppColors.textHint,
        ),
        const SizedBox(height: 6),
        Text(
          required ? 'Required' : 'Optional',
          style: GoogleFonts.inter(
            fontSize: 11,
            fontWeight: FontWeight.w600,
            color: required ? AppColors.primaryDark : AppColors.textHint,
          ),
        ),
      ]),
    );
  }
}
