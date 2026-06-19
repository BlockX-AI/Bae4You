import 'package:flutter/material.dart';
import '../theme/app_colors.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';
import '../providers/auth_provider.dart';

class SettingsScreen extends ConsumerStatefulWidget {
  const SettingsScreen({super.key});

  @override
  ConsumerState<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends ConsumerState<SettingsScreen> {
  bool _notificationsEnabled = true;
  bool _emailNotifications = true;
  bool _matchNotifications = true;
  bool _messageNotifications = true;
  bool _darkMode = false;
  String _selectedLanguage = 'English';
  String _selectedCountry = 'India';

  final List<String> _languages = ['English', 'Hindi', 'Spanish', 'French'];
  final List<String> _countries = ['India', 'USA', 'UK', 'Canada', 'Australia'];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.bgTop,
      body: CustomScrollView(
        slivers: [
          // App Bar
          SliverAppBar(
            expandedHeight: 120,
            floating: false,
            pinned: true,
            backgroundColor: AppColors.bgTop,
            elevation: 0,
            flexibleSpace: FlexibleSpaceBar(
              title: Text(
                'Settings',
                style: GoogleFonts.fredoka(
                  fontSize: 24,
                  fontWeight: FontWeight.w600,
                  color: Colors.white,
                ),
              ),
              background: Container(
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.topCenter,
                    end: Alignment.bottomCenter,
                    colors: [
                      AppColors.primary.withOpacity(0.3),
                      AppColors.textPrimary,
                    ],
                  ),
                ),
              ),
            ),
            leading: IconButton(
              icon: const Icon(Icons.arrow_back, color: Colors.white),
              onPressed: () => Navigator.pop(context),
            ),
          ),

          // Settings Content
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.all(20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Notifications Section
                  _buildSectionHeader('Notifications'),
                  const SizedBox(height: 16),
                  _buildSettingsCard([
                    _buildSwitchTile(
                      'Push Notifications',
                      'Receive push notifications',
                      Icons.notifications,
                      _notificationsEnabled,
                      (value) => setState(() => _notificationsEnabled = value),
                    ),
                    _buildDivider(),
                    _buildSwitchTile(
                      'Email Notifications',
                      'Receive email updates',
                      Icons.email,
                      _emailNotifications,
                      (value) => setState(() => _emailNotifications = value),
                    ),
                    _buildDivider(),
                    _buildSwitchTile(
                      'Match Alerts',
                      'Get notified about new matches',
                      Icons.favorite,
                      _matchNotifications,
                      (value) => setState(() => _matchNotifications = value),
                    ),
                    _buildDivider(),
                    _buildSwitchTile(
                      'Message Notifications',
                      'Get notified about new messages',
                      Icons.message,
                      _messageNotifications,
                      (value) => setState(() => _messageNotifications = value),
                    ),
                  ]),

                  const SizedBox(height: 24),

                  // Preferences Section
                  _buildSectionHeader('Preferences'),
                  const SizedBox(height: 16),
                  _buildSettingsCard([
                    _buildDropdownTile(
                      'Language',
                      _selectedLanguage,
                      Icons.language,
                      _languages,
                      (value) => setState(() => _selectedLanguage = value!),
                    ),
                    _buildDivider(),
                    _buildDropdownTile(
                      'Country',
                      _selectedCountry,
                      Icons.location_on,
                      _countries,
                      (value) => setState(() => _selectedCountry = value!),
                    ),
                    _buildDivider(),
                    _buildSwitchTile(
                      'Dark Mode',
                      'Use dark theme',
                      Icons.dark_mode,
                      _darkMode,
                      (value) => setState(() => _darkMode = value),
                    ),
                  ]),

                  const SizedBox(height: 24),

                  // Privacy & Security Section
                  _buildSectionHeader('Privacy & Security'),
                  const SizedBox(height: 16),
                  _buildSettingsCard([
                    _buildNavigationTile(
                      'Privacy Policy',
                      'Read our privacy policy',
                      Icons.privacy_tip,
                      () => _showPrivacyPolicy(),
                    ),
                    _buildDivider(),
                    _buildNavigationTile(
                      'Terms of Service',
                      'Read our terms of service',
                      Icons.description,
                      () => _showTermsOfService(),
                    ),
                    _buildDivider(),
                    _buildNavigationTile(
                      'Blocked Users',
                      'Manage blocked accounts',
                      Icons.block,
                      () => _showBlockedUsers(),
                    ),
                    _buildDivider(),
                    _buildNavigationTile(
                      'Data Export',
                      'Download your data',
                      Icons.download,
                      () => _exportData(),
                    ),
                  ]),

                  const SizedBox(height: 24),

                  // Account Actions Section
                  _buildSectionHeader('Account Actions'),
                  const SizedBox(height: 16),
                  _buildSettingsCard([
                    _buildActionTile(
                      'Clear Cache',
                      'Clear app cache and temporary files',
                      Icons.cleaning_services,
                      Colors.orange,
                      () => _clearCache(),
                    ),
                    _buildDivider(),
                    _buildActionTile(
                      'Logout',
                      'Sign out of your account',
                      Icons.logout,
                      Colors.red,
                      () => _showLogoutDialog(),
                    ),
                    _buildDivider(),
                    _buildActionTile(
                      'Delete Account',
                      'Permanently delete your account',
                      Icons.delete_forever,
                      Colors.red,
                      () => _showDeleteAccountDialog(),
                      isDestructive: true,
                    ),
                  ]),

                  const SizedBox(height: 32),

                  // App Info
                  Center(
                    child: Column(
                      children: [
                        Text(
                          'Catch Up',
                          style: GoogleFonts.fredoka(
                            fontSize: 20,
                            fontWeight: FontWeight.w600,
                            color: Colors.white,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          'Version 1.0.0 (Build 100)',
                          style: GoogleFonts.inter(
                            fontSize: 12,
                            color: Colors.white.withOpacity(0.6),
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          'Made with in India',
                          style: GoogleFonts.inter(
                            fontSize: 12,
                            color: Colors.white.withOpacity(0.6),
                          ),
                        ),
                      ],
                    ),
                  ),

                  const SizedBox(height: 40),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSectionHeader(String title) {
    return Text(
      title,
      style: GoogleFonts.fredoka(
        fontSize: 18,
        fontWeight: FontWeight.w600,
        color: AppColors.accent,
      ),
    );
  }

  Widget _buildSettingsCard(List<Widget> children) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.05),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: Colors.white.withOpacity(0.1),
        ),
      ),
      child: Column(
        children: children,
      ),
    );
  }

  Widget _buildSwitchTile(
    String title,
    String subtitle,
    IconData icon,
    bool value,
    ValueChanged<bool> onChanged,
  ) {
    return ListTile(
      leading: Container(
        padding: const EdgeInsets.all(8),
        decoration: BoxDecoration(
          color: AppColors.primary.withOpacity(0.2),
          borderRadius: BorderRadius.circular(8),
        ),
        child: Icon(icon, color: AppColors.primary, size: 20),
      ),
      title: Text(
        title,
        style: GoogleFonts.inter(
          fontSize: 14,
          fontWeight: FontWeight.w600,
          color: Colors.white,
        ),
      ),
      subtitle: Text(
        subtitle,
        style: GoogleFonts.inter(
          fontSize: 12,
          color: Colors.white.withOpacity(0.6),
        ),
      ),
      trailing: Switch(
        value: value,
        onChanged: onChanged,
        activeColor: AppColors.primary,
        activeTrackColor: AppColors.primary.withOpacity(0.3),
      ),
    );
  }

  Widget _buildDropdownTile(
    String title,
    String value,
    IconData icon,
    List<String> options,
    ValueChanged<String?> onChanged,
  ) {
    return ListTile(
      leading: Container(
        padding: const EdgeInsets.all(8),
        decoration: BoxDecoration(
          color: AppColors.primary.withOpacity(0.2),
          borderRadius: BorderRadius.circular(8),
        ),
        child: Icon(icon, color: AppColors.primary, size: 20),
      ),
      title: Text(
        title,
        style: GoogleFonts.inter(
          fontSize: 14,
          fontWeight: FontWeight.w600,
          color: Colors.white,
        ),
      ),
      trailing: DropdownButton<String>(
        value: value,
        dropdownColor: const Color(0xFF2D1B4E),
        style: GoogleFonts.inter(
          fontSize: 14,
          color: Colors.white,
        ),
        underline: const SizedBox(),
        icon: const Icon(Icons.arrow_drop_down, color: Colors.white70),
        onChanged: onChanged,
        items: options.map((String option) {
          return DropdownMenuItem<String>(
            value: option,
            child: Text(option),
          );
        }).toList(),
      ),
    );
  }

  Widget _buildNavigationTile(
    String title,
    String subtitle,
    IconData icon,
    VoidCallback onTap,
  ) {
    return ListTile(
      leading: Container(
        padding: const EdgeInsets.all(8),
        decoration: BoxDecoration(
          color: AppColors.primary.withOpacity(0.2),
          borderRadius: BorderRadius.circular(8),
        ),
        child: Icon(icon, color: AppColors.primary, size: 20),
      ),
      title: Text(
        title,
        style: GoogleFonts.inter(
          fontSize: 14,
          fontWeight: FontWeight.w600,
          color: Colors.white,
        ),
      ),
      subtitle: Text(
        subtitle,
        style: GoogleFonts.inter(
          fontSize: 12,
          color: Colors.white.withOpacity(0.6),
        ),
      ),
      trailing: const Icon(
        Icons.arrow_forward_ios,
        color: Colors.white54,
        size: 16,
      ),
      onTap: onTap,
    );
  }

  Widget _buildActionTile(
    String title,
    String subtitle,
    IconData icon,
    Color color,
    VoidCallback onTap, {
    bool isDestructive = false,
  }) {
    return ListTile(
      leading: Container(
        padding: const EdgeInsets.all(8),
        decoration: BoxDecoration(
          color: color.withOpacity(0.2),
          borderRadius: BorderRadius.circular(8),
        ),
        child: Icon(icon, color: color, size: 20),
      ),
      title: Text(
        title,
        style: GoogleFonts.inter(
          fontSize: 14,
          fontWeight: FontWeight.w600,
          color: isDestructive ? Colors.red : Colors.white,
        ),
      ),
      subtitle: Text(
        subtitle,
        style: GoogleFonts.inter(
          fontSize: 12,
          color: Colors.white.withOpacity(0.6),
        ),
      ),
      trailing: const Icon(
        Icons.arrow_forward_ios,
        color: Colors.white54,
        size: 16,
      ),
      onTap: onTap,
    );
  }

  Widget _buildDivider() {
    return Divider(
      height: 1,
      indent: 56,
      color: Colors.white.withOpacity(0.1),
    );
  }

  void _showPrivacyPolicy() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: const Color(0xFF2D1B4E),
        title: Text(
          'Privacy Policy',
          style: GoogleFonts.fredoka(color: Colors.white),
        ),
        content: SingleChildScrollView(
          child: Text(
            'Your privacy is important to us. We collect minimal data necessary to provide our services.\n\n'
            '1. Data Collection: We collect wallet addresses, profile information, and usage data.\n'
            '2. Data Usage: We use data to match you with other users and improve our services.\n'
            '3. Data Protection: We use industry-standard security measures to protect your data.\n'
            '4. Third Parties: We do not sell your data to third parties.',
            style: GoogleFonts.inter(color: Colors.white70),
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: Text(
              'Close',
              style: GoogleFonts.inter(color: AppColors.primary),
            ),
          ),
        ],
      ),
    );
  }

  void _showTermsOfService() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: const Color(0xFF2D1B4E),
        title: Text(
          'Terms of Service',
          style: GoogleFonts.fredoka(color: Colors.white),
        ),
        content: SingleChildScrollView(
          child: Text(
            'By using Catch Up, you agree to the following terms:\n\n'
            '1. You must be 18 years or older to use this service.\n'
            '2. You are responsible for maintaining the security of your wallet.\n'
            '3. You agree to use the service respectfully and lawfully.\n'
            '4. We reserve the right to suspend accounts violating our policies.',
            style: GoogleFonts.inter(color: Colors.white70),
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: Text(
              'Close',
              style: GoogleFonts.inter(color: AppColors.primary),
            ),
          ),
        ],
      ),
    );
  }

  void _showBlockedUsers() {
    // Navigate to blocked users screen or show dialog
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Blocked users feature coming soon')),
    );
  }

  void _exportData() {
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Data export requested. Check your email.')),
    );
  }

  void _clearCache() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: const Color(0xFF2D1B4E),
        title: Text(
          'Clear Cache?',
          style: GoogleFonts.fredoka(color: Colors.white),
        ),
        content: Text(
          'This will clear temporary files and cached data. You will need to log in again.',
          style: GoogleFonts.inter(color: Colors.white70),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: Text(
              'Cancel',
              style: GoogleFonts.inter(color: Colors.white70),
            ),
          ),
          TextButton(
            onPressed: () {
              Navigator.pop(context);
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('Cache cleared successfully')),
              );
            },
            child: Text(
              'Clear',
              style: GoogleFonts.inter(color: Colors.orange),
            ),
          ),
        ],
      ),
    );
  }

  void _showLogoutDialog() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: const Color(0xFF2D1B4E),
        title: Text(
          'Logout?',
          style: GoogleFonts.fredoka(color: Colors.white),
        ),
        content: Text(
          'Are you sure you want to logout?',
          style: GoogleFonts.inter(color: Colors.white70),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: Text(
              'Cancel',
              style: GoogleFonts.inter(color: Colors.white70),
            ),
          ),
          TextButton(
            onPressed: () {
              Navigator.pop(context);
              ref.read(authProvider.notifier).signOut();
              Navigator.pushNamedAndRemoveUntil(
                context,
                '/',
                (route) => false,
              );
            },
            child: Text(
              'Logout',
              style: GoogleFonts.inter(color: Colors.red),
            ),
          ),
        ],
      ),
    );
  }

  void _showDeleteAccountDialog() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: const Color(0xFF2D1B4E),
        title: Text(
          'Delete Account?',
          style: GoogleFonts.fredoka(color: Colors.red),
        ),
        content: Text(
          'This action is PERMANENT and cannot be undone. All your data, matches, and pets will be deleted.\n\nAre you absolutely sure?',
          style: GoogleFonts.inter(color: Colors.white70),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: Text(
              'Cancel',
              style: GoogleFonts.inter(color: Colors.white70),
            ),
          ),
          TextButton(
            onPressed: () {
              Navigator.pop(context);
              _showFinalDeleteConfirmation();
            },
            child: Text(
              'Delete',
              style: GoogleFonts.inter(color: Colors.red),
            ),
          ),
        ],
      ),
    );
  }

  void _showFinalDeleteConfirmation() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: const Color(0xFF2D1B4E),
        title: Text(
          'Final Confirmation',
          style: GoogleFonts.fredoka(color: Colors.red),
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(
              Icons.warning_amber_rounded,
              color: Colors.red,
              size: 48,
            ),
            const SizedBox(height: 16),
            Text(
              'Type "DELETE" to confirm account deletion:',
              style: GoogleFonts.inter(color: Colors.white70),
            ),
            const SizedBox(height: 12),
            TextField(
              style: GoogleFonts.inter(color: Colors.white),
              decoration: InputDecoration(
                hintText: 'DELETE',
                hintStyle: GoogleFonts.inter(color: Colors.white30),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(8),
                  borderSide: const BorderSide(color: Colors.red),
                ),
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: Text(
              'Cancel',
              style: GoogleFonts.inter(color: Colors.white70),
            ),
          ),
          TextButton(
            onPressed: () {
              Navigator.pop(context);
              ref.read(authProvider.notifier).signOut();
              Navigator.pushNamedAndRemoveUntil(
                context,
                '/',
                (route) => false,
              );
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(
                  content: Text('Account deleted successfully'),
                  backgroundColor: Colors.red,
                ),
              );
            },
            child: Text(
              'Confirm Delete',
              style: GoogleFonts.inter(color: Colors.red),
            ),
          ),
        ],
      ),
    );
  }
}
