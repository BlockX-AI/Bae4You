import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';
import 'screens/landing_screen.dart';
import 'screens/home_screen.dart';
import 'screens/splash_screen.dart';
import 'screens/onboarding_screen.dart';
import 'screens/profile_creation_screen.dart';
import 'screens/edit_profile_screen.dart';
import 'screens/pets_marketplace_screen.dart';
import 'screens/my_pets_screen.dart';
import 'screens/pet_detail_screen.dart';
import 'screens/heroes_leaderboard_screen.dart';
import 'screens/my_hero_stats_screen.dart';
import 'screens/settings_screen.dart';
import 'screens/transaction_history_screen.dart';
import 'screens/notifications_screen.dart';
import 'screens/profile_setup_screen.dart';
import 'providers/auth_provider.dart';
import 'theme/app_colors.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(
    const ProviderScope(
      child: CatchUpApp(),
    ),
  );
}

class CatchUpApp extends StatelessWidget {
  const CatchUpApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Catch Up',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        useMaterial3: true,
        colorScheme: ColorScheme.fromSeed(
          seedColor: AppColors.primary,
          brightness: Brightness.light,
          primary: AppColors.primary,
          secondary: AppColors.accent,
          surface: AppColors.surface,
          background: AppColors.bgTop,
        ),
        scaffoldBackgroundColor: AppColors.bgTop,
        textTheme: TextTheme(
          displayLarge: GoogleFonts.fredoka(
            fontSize: 56,
            fontWeight: FontWeight.w700,
            letterSpacing: -0.03,
            color: AppColors.textPrimary,
          ),
          displayMedium: GoogleFonts.fredoka(
            fontSize: 40,
            fontWeight: FontWeight.w700,
            letterSpacing: -0.02,
            color: AppColors.textPrimary,
          ),
          titleLarge: GoogleFonts.inter(
            fontSize: 20,
            fontWeight: FontWeight.w600,
            color: AppColors.textPrimary,
          ),
          bodyLarge: GoogleFonts.inter(
            fontSize: 16,
            fontWeight: FontWeight.w400,
            color: AppColors.textSecondary,
          ),
          bodyMedium: GoogleFonts.inter(
            fontSize: 14,
            fontWeight: FontWeight.w400,
            color: AppColors.textHint,
          ),
        ),
        elevatedButtonTheme: ElevatedButtonThemeData(
          style: ElevatedButton.styleFrom(
            backgroundColor: AppColors.primaryDark,
            foregroundColor: Colors.white,
            elevation: 4,
            shadowColor: AppColors.primary.withOpacity(0.4),
            padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(999),
            ),
            textStyle: GoogleFonts.inter(
              fontSize: 16,
              fontWeight: FontWeight.w600,
            ),
          ),
        ),
        outlinedButtonTheme: OutlinedButtonThemeData(
          style: OutlinedButton.styleFrom(
            foregroundColor: AppColors.primaryDark,
            side: const BorderSide(color: AppColors.border),
            padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(999),
            ),
            textStyle: GoogleFonts.inter(
              fontSize: 16,
              fontWeight: FontWeight.w600,
            ),
          ),
        ),
        appBarTheme: AppBarTheme(
          backgroundColor: AppColors.bgTop,
          foregroundColor: AppColors.textPrimary,
          elevation: 0,
          titleTextStyle: GoogleFonts.fredoka(
            fontSize: 22,
            fontWeight: FontWeight.w600,
            color: AppColors.textPrimary,
          ),
        ),
        cardTheme: const CardThemeData(
          color: AppColors.surfaceCard,
          surfaceTintColor: Colors.transparent,
        ),
        dividerColor: AppColors.divider,
      ),
      home: const AuthWrapper(),
      routes: {
        '/splash': (context) => const SplashScreenWrapper(),
        '/onboarding': (context) => const OnboardingScreenWrapper(),
        '/create-profile': (context) => const ProfileCreationScreen(),
        '/edit-profile': (context) => const EditProfileScreen(),
        '/pets-marketplace': (context) => const PetsMarketplaceScreen(),
        '/my-pets': (context) => const MyPetsScreen(),
        '/pet-detail': (context) => const PetDetailScreen(),
        '/heroes-leaderboard': (context) => const HeroesLeaderboardScreen(),
        '/my-hero-stats': (context) => const MyHeroStatsScreen(),
        '/settings': (context) => const SettingsScreen(),
        '/transaction-history': (context) => const TransactionHistoryScreen(),
        '/notifications': (context) => const NotificationsScreen(),
        '/profile-setup': (context) => ProfileSetupScreen(onComplete: () => Navigator.pushReplacementNamed(context, '/home')),
        '/home': (context) => const HomeScreen(),
      },
    );
  }
}

class AuthWrapper extends ConsumerWidget {
  const AuthWrapper({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    // Check if user is authenticated
    final authState = ref.watch(authProvider);

    // Navigate based on auth state
    if (authState.isAuthenticated) {
      // Check if profile is complete
      final user = authState.user;
      final isProfileComplete = user != null && 
          user.displayName != null && 
          user.displayName!.isNotEmpty &&
          user.username != null && 
          user.username!.isNotEmpty;
      
      if (isProfileComplete) {
        return const HomeScreen();
      } else {
        return const ProfileCreationScreen();
      }
    } else {
      return const LandingScreen();
    }
  }
}

// Wrapper widgets for safe navigation
class SplashScreenWrapper extends StatelessWidget {
  const SplashScreenWrapper({super.key});

  @override
  Widget build(BuildContext context) {
    return AnimatedSplashScreen(
      onComplete: () {
        WidgetsBinding.instance.addPostFrameCallback((_) {
          Navigator.of(context).pushReplacement(
            MaterialPageRoute(builder: (_) => const OnboardingScreenWrapper()),
          );
        });
      },
    );
  }
}

class OnboardingScreenWrapper extends StatelessWidget {
  const OnboardingScreenWrapper({super.key});

  @override
  Widget build(BuildContext context) {
    return OnboardingScreen(
      onComplete: () {
        WidgetsBinding.instance.addPostFrameCallback((_) {
          Navigator.of(context).pushReplacement(
            MaterialPageRoute(builder: (_) => const InteractiveShowcase()),
          );
        });
      },
    );
  }
}
