import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';
import '../providers/auth_provider.dart';

class WalletModal extends ConsumerWidget {
  const WalletModal({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final authState = ref.watch(authProvider);

    return Container(
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: [
            Color(0xFF2E0B5C),
            Color(0xFF1A0738),
          ],
        ),
        borderRadius: const BorderRadius.vertical(top: Radius.circular(28)),
        border: Border.all(
          color: Colors.white.withOpacity(0.18),
        ),
      ),
      child: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              // Handle
              Container(
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: Colors.white.withOpacity(0.3),
                  borderRadius: BorderRadius.circular(2),
                ),
              ),

              const SizedBox(height: 24),

              // Header
              Text(
                'Welcome to Catch Up 🐾',
                style: GoogleFonts.fredoka(
                  fontSize: 26,
                  fontWeight: FontWeight.w600,
                  color: Colors.white,
                ),
              ),

              const SizedBox(height: 8),

              Text(
                'Choose how you want to sign in',
                style: GoogleFonts.inter(
                  fontSize: 15,
                  color: Colors.white.withOpacity(0.7),
                ),
              ),

              const SizedBox(height: 12),

              // Demo mode badge
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                decoration: BoxDecoration(
                  color: Colors.orange.withOpacity(0.2),
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: Colors.orange.withOpacity(0.5)),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(Icons.info_outline, color: Colors.orange, size: 16),
                    const SizedBox(width: 8),
                    Text(
                      'DEMO MODE: Backend offline, using mock data',
                      style: GoogleFonts.inter(
                        fontSize: 12,
                        color: Colors.orange,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 24),

              // Wallet Options
              _WalletOption(
                icon: '⚡',
                title: 'Quick Start',
                description: 'We create a wallet for you. Easiest option.',
                tag: 'RECOMMENDED',
                onTap: () => _connectWallet(context, ref, WalletType.inApp),
              ),

              const SizedBox(height: 12),

              _WalletOption(
                icon: '🦊',
                title: 'MetaMask',
                description: 'Connect your MetaMask wallet',
                onTap: () => _connectWallet(context, ref, WalletType.metamask),
              ),

              const SizedBox(height: 12),

              _WalletOption(
                icon: '🔵',
                title: 'Coinbase Wallet',
                description: 'Connect with Coinbase',
                onTap: () => _connectWallet(context, ref, WalletType.coinbase),
              ),

              const SizedBox(height: 12),

              _WalletOption(
                icon: '📱',
                title: 'WalletConnect',
                description: 'Scan with any mobile wallet',
                onTap: () => _connectWallet(context, ref, WalletType.walletConnect),
              ),

              const SizedBox(height: 12),

              _WalletOption(
                icon: '🏦',
                title: 'Coinbase CDP',
                description: 'Secure MPC wallet',
                onTap: () => _connectWallet(context, ref, WalletType.cdp),
              ),

              const SizedBox(height: 20),

              // Cancel Button
              SizedBox(
                width: double.infinity,
                child: TextButton(
                  onPressed: () => Navigator.pop(context),
                  style: TextButton.styleFrom(
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    side: BorderSide(color: Colors.white.withOpacity(0.18)),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                  child: Text(
                    'Cancel',
                    style: GoogleFonts.inter(
                      fontSize: 15,
                      color: Colors.white.withOpacity(0.7),
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

  void _connectWallet(BuildContext context, WidgetRef ref, WalletType type) {
    // Show loading
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => const Center(
        child: CircularProgressIndicator(
          color: Colors.white,
        ),
      ),
    );

    // Trigger auth flow
    ref.read(authProvider.notifier).connectWallet(type).then((success) {
      Navigator.pop(context); // Close loading
      if (success) {
        Navigator.pop(context); // Close modal
        // Navigate to main app
        // Navigator.pushReplacement(...)
      } else {
        // Show error
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Connection failed. Please try again.'),
            backgroundColor: Colors.red,
          ),
        );
      }
    });
  }
}

class _WalletOption extends StatelessWidget {
  final String icon;
  final String title;
  final String description;
  final String? tag;
  final VoidCallback onTap;

  const _WalletOption({
    required this.icon,
    required this.title,
    required this.description,
    this.tag,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Colors.white.withOpacity(0.08),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: Colors.white.withOpacity(0.18),
          ),
        ),
        child: Row(
          children: [
            // Icon
            Container(
              width: 44,
              height: 44,
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(10),
                gradient: const LinearGradient(
                  colors: [
                    Color(0xFFFF6BB0),
                    Color(0xFF9B4FFF),
                  ],
                ),
              ),
              child: Center(
                child: Text(
                  icon,
                  style: const TextStyle(fontSize: 22),
                ),
              ),
            ),

            const SizedBox(width: 14),

            // Info
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Text(
                        title,
                        style: GoogleFonts.inter(
                          fontSize: 16,
                          fontWeight: FontWeight.w600,
                          color: Colors.white,
                        ),
                      ),
                      if (tag != null) ...[
                        const SizedBox(width: 8),
                        Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 8,
                            vertical: 2,
                          ),
                          decoration: BoxDecoration(
                            color: const Color(0xFFFFD700).withOpacity(0.2),
                            borderRadius: BorderRadius.circular(6),
                          ),
                          child: Text(
                            tag!,
                            style: GoogleFonts.inter(
                              fontSize: 10,
                              fontWeight: FontWeight.w600,
                              color: const Color(0xFFFFD700),
                            ),
                          ),
                        ),
                      ],
                    ],
                  ),
                  const SizedBox(height: 2),
                  Text(
                    description,
                    style: GoogleFonts.inter(
                      fontSize: 13,
                      color: Colors.white.withOpacity(0.6),
                    ),
                  ),
                ],
              ),
            ),

            // Arrow
            Icon(
              Icons.chevron_right,
              color: Colors.white.withOpacity(0.4),
            ),
          ],
        ),
      ),
    );
  }
}

enum WalletType {
  inApp,
  metamask,
  coinbase,
  walletConnect,
  cdp,
}
