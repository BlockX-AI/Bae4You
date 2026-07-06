import 'dart:typed_data';
import 'package:flutter/material.dart';
import '../theme/app_colors.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:image_picker/image_picker.dart';
import '../providers/auth_provider.dart';
import '../services/api_service.dart';

/// Edit Profile Screen - Manage user profile settings

class EditProfileScreen extends ConsumerStatefulWidget {
  const EditProfileScreen({super.key});

  @override
  ConsumerState<EditProfileScreen> createState() => _EditProfileScreenState();
}

class _EditProfileScreenState extends ConsumerState<EditProfileScreen> {
  final _formKey = GlobalKey<FormState>();
  late TextEditingController _displayNameController;
  late TextEditingController _usernameController;
  late TextEditingController _bioController;
  
  String? _selectedCountry;
  List<String> _selectedInterests = [];
  bool _isLoading = false;
  bool _hasChanges = false;

  // Profile photos (up to 6). Existing photos are URLs already on the server;
  // newly picked photos are held as bytes and uploaded on save.
  List<String> _existingPhotos = [];
  final List<Uint8List> _newPhotoBytes = [];
  final ImagePicker _imagePicker = ImagePicker();

  int get _photoCount => _existingPhotos.length + _newPhotoBytes.length;
  
  final List<String> _availableInterests = [
    'Travel', 'Music', 'Gaming', 'Crypto', 'Art', 'Fitness',
    'Foodie', 'Movies', 'Reading', 'Technology', 'Fashion',
    'Sports', 'Photography', 'Dancing', 'Cooking', 'Yoga',
    'Investing', 'NFTs', 'DeFi', 'Web3', 'Startup', 'AI',
  ];
  
  final List<Map<String, String>> _countries = [
    {'code': 'IN', 'name': 'India', 'flag': '🇮🇳'},
    {'code': 'US', 'name': 'United States', 'flag': '🇺🇸'},
    {'code': 'UK', 'name': 'United Kingdom', 'flag': '🇬🇧'},
    {'code': 'CA', 'name': 'Canada', 'flag': '🇨🇦'},
    {'code': 'AU', 'name': 'Australia', 'flag': '🇦🇺'},
    {'code': 'SG', 'name': 'Singapore', 'flag': '🇸🇬'},
    {'code': 'AE', 'name': 'UAE', 'flag': '🇦🇪'},
    {'code': 'DE', 'name': 'Germany', 'flag': '🇩🇪'},
    {'code': 'FR', 'name': 'France', 'flag': '🇫🇷'},
    {'code': 'JP', 'name': 'Japan', 'flag': '🇯🇵'},
    {'code': 'KR', 'name': 'South Korea', 'flag': '🇰🇷'},
    {'code': 'BR', 'name': 'Brazil', 'flag': '🇧🇷'},
  ];

  @override
  void initState() {
    super.initState();
    _initializeControllers();
  }

  void _initializeControllers() {
    final user = ref.read(authProvider).user;
    
    _displayNameController = TextEditingController(text: user?.displayName ?? '');
    _usernameController = TextEditingController(text: user?.username ?? '');
    _bioController = TextEditingController(text: user?.bio ?? '');
    _selectedCountry = user?.countryCode;
    _existingPhotos = List<String>.from(user?.photos ?? const []);
    _selectedInterests = List<String>.from(user?.interests ?? []);
  }

  @override
  void dispose() {
    _displayNameController.dispose();
    _usernameController.dispose();
    _bioController.dispose();
    super.dispose();
  }

  void _markChanged() {
    setState(() => _hasChanges = true);
  }

  Future<void> _addPhoto() async {
    if (_photoCount >= 6) return;
    try {
      final picked = await _imagePicker.pickImage(
        source: ImageSource.gallery,
        maxWidth: 1200,
        imageQuality: 85,
      );
      if (picked == null) return;
      final bytes = await picked.readAsBytes();
      if (!mounted) return;
      setState(() {
        _newPhotoBytes.add(bytes);
        _hasChanges = true;
      });
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Could not pick photo: $e'), backgroundColor: Colors.red),
        );
      }
    }
  }

  void _removeExistingPhoto(int index) {
    setState(() {
      _existingPhotos.removeAt(index);
      _hasChanges = true;
    });
  }

  void _removeNewPhoto(int index) {
    setState(() {
      _newPhotoBytes.removeAt(index);
      _hasChanges = true;
    });
  }

  void _previewPhotoNetwork(String url) {
    showDialog(
      context: context,
      builder: (_) => _PhotoPreviewDialog(child: Image.network(url, fit: BoxFit.contain)),
    );
  }

  void _previewPhotoBytes(Uint8List bytes) {
    showDialog(
      context: context,
      builder: (_) => _PhotoPreviewDialog(child: Image.memory(bytes, fit: BoxFit.contain)),
    );
  }

  void _toggleInterest(String interest) {
    setState(() {
      if (_selectedInterests.contains(interest)) {
        _selectedInterests.remove(interest);
      } else if (_selectedInterests.length < 5) {
        _selectedInterests.add(interest);
      }
      _hasChanges = true;
    });
  }

  Future<void> _saveProfile() async {
    if (!_formKey.currentState!.validate()) return;
    if (!_hasChanges) {
      Navigator.pop(context);
      return;
    }

    setState(() => _isLoading = true);

    try {
      final apiService = ApiService();
      final token = ref.read(authProvider).token;

      if (token == null) throw Exception('Not authenticated');

      // Build the final ordered photo list: kept existing URLs first, then
      // upload any newly-picked photos to IPFS and append their URLs.
      // POST /users/me/photos replaces the whole array, so send everything.
      final List<Uint8List> allBytes = List.of(_newPhotoBytes);
      List<String> finalPhotos = List.of(_existingPhotos);
      if (allBytes.isNotEmpty || _existingPhotos.isNotEmpty) {
        try {
          if (allBytes.isNotEmpty) {
            final uploaded = await apiService.uploadPhotos(token: token, photos: allBytes);
            // uploadPhotos replaces the server array with just the new uploads,
            // so re-persist the full ordered list via updateProfile below.
            finalPhotos = [..._existingPhotos, ...uploaded];
          }
        } catch (e) {
          if (mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(content: Text('Photo upload failed: $e'), backgroundColor: Colors.red),
            );
          }
        }
      }

      // Update user profile via API (photos sent as the desired ordered list)
      await apiService.updateProfile(
        token: token,
        displayName: _displayNameController.text.trim(),
        username: _usernameController.text.trim().toLowerCase(),
        bio: _bioController.text.trim(),
        countryCode: _selectedCountry ?? 'IN',
        interests: _selectedInterests,
        photos: finalPhotos,
      );

      // Refresh user data
      await ref.read(authProvider.notifier).refreshUser();

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Profile updated successfully!'),
            backgroundColor: Color(0xFF00FF88),
          ),
        );
        Navigator.pop(context);
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Error: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final user = ref.watch(currentUserProvider);
    
    return Scaffold(
      body: Container(
        decoration: const BoxDecoration(
          gradient: RadialGradient(
            center: Alignment.topCenter,
            radius: 1.2,
            colors: [
              Color(0xFFFF6BB0),
              AppColors.primary,
              AppColors.textPrimary,
            ],
            stops: [0.0, 0.4, 1.0],
          ),
        ),
        child: SafeArea(
          child: Column(
            children: [
              // Header
              Padding(
                padding: const EdgeInsets.all(16),
                child: Row(
                  children: [
                    IconButton(
                      onPressed: () => Navigator.pop(context),
                      icon: const Icon(Icons.arrow_back, color: Colors.white),
                    ),
                    Expanded(
                      child: Text(
                        'Edit Profile',
                        textAlign: TextAlign.center,
                        style: GoogleFonts.fredoka(
                          fontSize: 24,
                          fontWeight: FontWeight.bold,
                          color: Colors.white,
                        ),
                      ),
                    ),
                    // Save button
                    TextButton(
                      onPressed: _isLoading ? null : _saveProfile,
                      child: _isLoading
                          ? const SizedBox(
                              width: 20,
                              height: 20,
                              child: CircularProgressIndicator(
                                strokeWidth: 2,
                                color: Colors.white,
                              ),
                            )
                          : Text(
                              'Save',
                              style: GoogleFonts.inter(
                                color: _hasChanges ? const Color(0xFFFF6BB0) : Colors.white54,
                                fontWeight: FontWeight.bold,
                                fontSize: 16,
                              ),
                            ),
                    ),
                  ],
                ),
              ),

              // Content
              Expanded(
                child: SingleChildScrollView(
                  padding: const EdgeInsets.all(20),
                  child: Form(
                    key: _formKey,
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        // Profile Photos (up to 6, first shows on swipe card)
                        _buildSectionTitle('Photos ($_photoCount/6)'),
                        const SizedBox(height: 4),
                        Text(
                          'The first photo shows on your card. Tap to preview, tap ✕ to remove.',
                          style: GoogleFonts.inter(fontSize: 12, color: Colors.white70),
                        ),
                        const SizedBox(height: 12),
                        _buildPhotoGrid(),

                        const SizedBox(height: 24),
                        
                        // Wallet Address (Read only)
                        _buildInfoCard(
                          title: 'Wallet Address',
                          child: Container(
                            padding: const EdgeInsets.all(12),
                            decoration: BoxDecoration(
                              color: Colors.white.withOpacity(0.1),
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: Row(
                              children: [
                                const Icon(
                                  Icons.account_balance_wallet,
                                  color: Color(0xFFFF6BB0),
                                  size: 20,
                                ),
                                const SizedBox(width: 12),
                                Expanded(
                                  child: Text(
                                    user?.walletAddress ?? 'Not connected',
                                    style: GoogleFonts.inter(
                                      color: Colors.white70,
                                      fontSize: 12,
                                    ),
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                ),
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                  decoration: BoxDecoration(
                                    color: const Color(0xFF00FF88).withOpacity(0.2),
                                    borderRadius: BorderRadius.circular(4),
                                  ),
                                  child: const Text(
                                    'Verified',
                                    style: TextStyle(
                                      color: Color(0xFF00FF88),
                                      fontSize: 10,
                                      fontWeight: FontWeight.bold,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                        
                        const SizedBox(height: 24),
                        
                        // Basic Info Section
                        _buildSectionTitle('Basic Information'),
                        const SizedBox(height: 16),
                        
                        _buildTextField(
                          controller: _displayNameController,
                          label: 'Display Name',
                          icon: Icons.person,
                          onChanged: (_) => _markChanged(),
                          validator: (value) {
                            if (value == null || value.trim().isEmpty) {
                              return 'Display name is required';
                            }
                            return null;
                          },
                        ),
                        
                        const SizedBox(height: 16),
                        
                        _buildTextField(
                          controller: _usernameController,
                          label: 'Username',
                          icon: Icons.alternate_email,
                          onChanged: (_) => _markChanged(),
                          validator: (value) {
                            if (value == null || value.trim().isEmpty) {
                              return 'Username is required';
                            }
                            if (!RegExp(r'^[a-zA-Z0-9_]+$').hasMatch(value)) {
                              return 'Only letters, numbers, underscores allowed';
                            }
                            return null;
                          },
                        ),
                        
                        const SizedBox(height: 16),
                        
                        _buildTextField(
                          controller: _bioController,
                          label: 'Bio',
                          icon: Icons.edit,
                          maxLines: 4,
                          maxLength: 150,
                          onChanged: (_) => _markChanged(),
                        ),
                        
                        const SizedBox(height: 24),
                        
                        // Country Section
                        _buildSectionTitle('Location'),
                        const SizedBox(height: 12),
                        
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 12),
                          decoration: BoxDecoration(
                            color: Colors.white.withOpacity(0.1),
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(color: Colors.white.withOpacity(0.2)),
                          ),
                          child: DropdownButtonHideUnderline(
                            child: DropdownButton<String>(
                              value: _selectedCountry,
                              dropdownColor: AppColors.textPrimary,
                              isExpanded: true,
                              icon: const Icon(Icons.arrow_drop_down, color: Colors.white70),
                              style: GoogleFonts.inter(color: Colors.white),
                              hint: Text(
                                'Select Country',
                                style: GoogleFonts.inter(color: Colors.white54),
                              ),
                              onChanged: (value) {
                                setState(() {
                                  _selectedCountry = value;
                                  _hasChanges = true;
                                });
                              },
                              items: _countries.map((country) {
                                return DropdownMenuItem<String>(
                                  value: country['code'],
                                  child: Row(
                                    children: [
                                      Text(country['flag']!, style: const TextStyle(fontSize: 20)),
                                      const SizedBox(width: 12),
                                      Text(country['name']!),
                                    ],
                                  ),
                                );
                              }).toList(),
                            ),
                          ),
                        ),
                        
                        const SizedBox(height: 24),
                        
                        // Interests Section
                        _buildSectionTitle('Interests (${_selectedInterests.length}/5)'),
                        const SizedBox(height: 12),
                        
                        Wrap(
                          spacing: 8,
                          runSpacing: 8,
                          children: _availableInterests.map((interest) {
                            final isSelected = _selectedInterests.contains(interest);
                            final canSelect = _selectedInterests.length < 5 || isSelected;
                            
                            return GestureDetector(
                              onTap: canSelect ? () => _toggleInterest(interest) : null,
                              child: Container(
                                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                                decoration: BoxDecoration(
                                  gradient: isSelected
                                      ? const LinearGradient(
                                          colors: [Color(0xFFFF6BB0), AppColors.primary],
                                        )
                                      : null,
                                  color: isSelected ? null : Colors.white.withOpacity(0.1),
                                  borderRadius: BorderRadius.circular(20),
                                  border: Border.all(
                                    color: isSelected
                                        ? Colors.white.withOpacity(0.3)
                                        : Colors.white.withOpacity(0.2),
                                  ),
                                ),
                                child: Text(
                                  interest,
                                  style: GoogleFonts.inter(
                                    color: canSelect ? Colors.white : Colors.white38,
                                    fontSize: 13,
                                    fontWeight: isSelected ? FontWeight.w600 : FontWeight.normal,
                                  ),
                                ),
                              ),
                            );
                          }).toList(),
                        ),
                        
                        const SizedBox(height: 40),
                        
                        // Danger Zone
                        _buildSectionTitle('Danger Zone', color: Colors.red),
                        const SizedBox(height: 12),
                        
                        _buildDangerButton(
                          icon: Icons.logout,
                          label: 'Sign Out',
                          color: Colors.orange,
                          onTap: () => _showSignOutDialog(),
                        ),
                        
                        const SizedBox(height: 8),
                        
                        _buildDangerButton(
                          icon: Icons.delete_forever,
                          label: 'Delete Account',
                          color: Colors.red,
                          onTap: () => _showDeleteAccountDialog(),
                        ),
                        
                        const SizedBox(height: 20),
                      ],
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildPhotoGrid() {
    return GridView.builder(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      itemCount: 6,
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 3,
        crossAxisSpacing: 10,
        mainAxisSpacing: 10,
        childAspectRatio: 0.78,
      ),
      itemBuilder: (_, i) => _buildPhotoTile(i),
    );
  }

  Widget _buildPhotoTile(int index) {
    final existingCount = _existingPhotos.length;
    // Existing photos occupy the first slots, then newly-picked bytes.
    if (index < existingCount) {
      final url = _existingPhotos[index];
      return _photoTileFrame(
        index: index,
        onPreview: () => _previewPhotoNetwork(url),
        onRemove: () => _removeExistingPhoto(index),
        image: Image.network(url, fit: BoxFit.cover),
      );
    }
    final newIdx = index - existingCount;
    if (newIdx < _newPhotoBytes.length) {
      final bytes = _newPhotoBytes[newIdx];
      return _photoTileFrame(
        index: index,
        onPreview: () => _previewPhotoBytes(bytes),
        onRemove: () => _removeNewPhoto(newIdx),
        image: Image.memory(bytes, fit: BoxFit.cover),
      );
    }
    // Empty add-slot (only the next empty one is tappable)
    final isNext = index == _photoCount;
    return GestureDetector(
      onTap: isNext ? _addPhoto : null,
      child: Container(
        decoration: BoxDecoration(
          color: Colors.white.withOpacity(0.08),
          borderRadius: BorderRadius.circular(14),
          border: Border.all(
            color: isNext ? const Color(0xFFFF6BB0) : Colors.white24,
            width: 1.5,
          ),
        ),
        child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
          Icon(isNext ? Icons.add_a_photo_outlined : Icons.image_outlined,
              color: isNext ? const Color(0xFFFF6BB0) : Colors.white38, size: 24),
          const SizedBox(height: 4),
          Text(isNext ? 'Add' : '',
              style: GoogleFonts.inter(fontSize: 11, color: Colors.white54)),
        ]),
      ),
    );
  }

  Widget _photoTileFrame({
    required int index,
    required VoidCallback onPreview,
    required VoidCallback onRemove,
    required Widget image,
  }) {
    return GestureDetector(
      onTap: onPreview,
      child: Stack(fit: StackFit.expand, children: [
        ClipRRect(borderRadius: BorderRadius.circular(14), child: image),
        if (index == 0)
          Positioned(
            left: 6, top: 6,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
              decoration: BoxDecoration(
                color: const Color(0xFFFF6BB0),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Text('Main',
                  style: GoogleFonts.inter(fontSize: 10, fontWeight: FontWeight.w700, color: Colors.white)),
            ),
          ),
        Positioned(
          right: 6, top: 6,
          child: GestureDetector(
            onTap: onRemove,
            child: Container(
              padding: const EdgeInsets.all(4),
              decoration: const BoxDecoration(color: Colors.black54, shape: BoxShape.circle),
              child: const Icon(Icons.close, size: 14, color: Colors.white),
            ),
          ),
        ),
      ]),
    );
  }

  Widget _buildInfoCard({required String title, required Widget child}) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          title,
          style: GoogleFonts.inter(
            fontSize: 14,
            fontWeight: FontWeight.w600,
            color: Colors.white.withOpacity(0.7),
          ),
        ),
        const SizedBox(height: 8),
        child,
      ],
    );
  }

  Widget _buildSectionTitle(String title, {Color? color}) {
    return Text(
      title,
      style: GoogleFonts.inter(
        fontSize: 18,
        fontWeight: FontWeight.bold,
        color: color ?? Colors.white,
      ),
    );
  }

  Widget _buildTextField({
    required TextEditingController controller,
    required String label,
    required IconData icon,
    int maxLines = 1,
    int? maxLength,
    void Function(String)? onChanged,
    String? Function(String?)? validator,
  }) {
    return TextFormField(
      controller: controller,
      maxLines: maxLines,
      maxLength: maxLength,
      onChanged: onChanged,
      validator: validator,
      style: const TextStyle(color: Colors.white),
      decoration: InputDecoration(
        labelText: label,
        labelStyle: TextStyle(color: Colors.white.withOpacity(0.7)),
        prefixIcon: Icon(icon, color: const Color(0xFFFF6BB0)),
        filled: true,
        fillColor: Colors.white.withOpacity(0.1),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide(color: Colors.white.withOpacity(0.2)),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide(color: Colors.white.withOpacity(0.2)),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: Color(0xFFFF6BB0)),
        ),
        counterStyle: TextStyle(color: Colors.white.withOpacity(0.5)),
      ),
    );
  }

  Widget _buildDangerButton({
    required IconData icon,
    required String label,
    required Color color,
    required VoidCallback onTap,
  }) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: double.infinity,
        padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 20),
        decoration: BoxDecoration(
          color: color.withOpacity(0.1),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: color.withOpacity(0.3)),
        ),
        child: Row(
          children: [
            Icon(icon, color: color, size: 20),
            const SizedBox(width: 12),
            Text(
              label,
              style: GoogleFonts.inter(
                color: color,
                fontWeight: FontWeight.w600,
              ),
            ),
            const Spacer(),
            Icon(Icons.arrow_forward_ios, color: color, size: 16),
          ],
        ),
      ),
    );
  }

  void _showSignOutDialog() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: AppColors.textPrimary,
        title: Text('Sign Out?', style: GoogleFonts.fredoka(color: Colors.white)),
        content: Text(
          'Are you sure you want to sign out?',
          style: GoogleFonts.inter(color: Colors.white70),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: Text('Cancel', style: GoogleFonts.inter(color: Colors.white70)),
          ),
          ElevatedButton(
            onPressed: () {
              ref.read(authProvider.notifier).signOut();
              Navigator.pop(context);
              Navigator.pushReplacementNamed(context, '/');
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.orange,
              foregroundColor: Colors.white,
            ),
            child: const Text('Sign Out'),
          ),
        ],
      ),
    );
  }

  void _showDeleteAccountDialog() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: AppColors.textPrimary,
        title: Text('Delete Account?', style: GoogleFonts.fredoka(color: Colors.red)),
        content: Text(
          'This action cannot be undone. All your data will be permanently deleted.',
          style: GoogleFonts.inter(color: Colors.white70),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: Text('Cancel', style: GoogleFonts.inter(color: Colors.white70)),
          ),
          ElevatedButton(
            onPressed: () {
              // TODO: Implement account deletion API call
              Navigator.pop(context);
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.red,
              foregroundColor: Colors.white,
            ),
            child: const Text('Delete'),
          ),
        ],
      ),
    );
  }
}

class _PhotoPreviewDialog extends StatelessWidget {
  final Widget child;
  const _PhotoPreviewDialog({required this.child});

  @override
  Widget build(BuildContext context) {
    return Dialog(
      backgroundColor: Colors.transparent,
      insetPadding: const EdgeInsets.all(16),
      child: Stack(children: [
        ClipRRect(borderRadius: BorderRadius.circular(16), child: child),
        Positioned(
          right: 8, top: 8,
          child: GestureDetector(
            onTap: () => Navigator.pop(context),
            child: Container(
              padding: const EdgeInsets.all(6),
              decoration: const BoxDecoration(color: Colors.black54, shape: BoxShape.circle),
              child: const Icon(Icons.close, color: Colors.white, size: 22),
            ),
          ),
        ),
      ]),
    );
  }
}
