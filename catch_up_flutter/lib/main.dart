import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';
import 'screens/landing_screen.dart';
import 'screens/home_screen.dart';
import 'screens/ui_showcase_screen.dart';
import 'screens/splash_screen.dart';
import 'screens/onboarding_screen.dart';
import 'screens/interactive_showcase.dart';
import 'screens/profile_creation_screen.dart';
import 'screens/edit_profile_screen.dart';
import 'screens/pets_marketplace_screen.dart';
import 'screens/my_pets_screen.dart';
import 'screens/pet_detail_screen.dart';
import 'screens/heroes_leaderboard_screen.dart';
import 'screens/my_hero_stats_screen.dart';
import 'providers/auth_provider.dart';

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
          seedColor: const Color(0xFF7B2FE8),
          brightness: Brightness.dark,
        ),
        textTheme: TextTheme(
          displayLarge: GoogleFonts.fredoka(
            fontSize: 56,
            fontWeight: FontWeight.w700,
            letterSpacing: -0.03,
            color: Colors.white,
          ),
          displayMedium: GoogleFonts.fredoka(
            fontSize: 40,
            fontWeight: FontWeight.w700,
            letterSpacing: -0.02,
            color: Colors.white,
          ),
          titleLarge: GoogleFonts.inter(
            fontSize: 20,
            fontWeight: FontWeight.w600,
            color: Colors.white,
          ),
          bodyLarge: GoogleFonts.inter(
            fontSize: 16,
            fontWeight: FontWeight.w400,
            color: Colors.white.withOpacity(0.85),
          ),
          bodyMedium: GoogleFonts.inter(
            fontSize: 14,
            fontWeight: FontWeight.w400,
            color: Colors.white.withOpacity(0.7),
          ),
        ),
        elevatedButtonTheme: ElevatedButtonThemeData(
          style: ElevatedButton.styleFrom(
            backgroundColor: Colors.white,
            foregroundColor: const Color(0xFF5B1FB8),
            elevation: 4,
            shadowColor: const Color(0xFFE94B9C).withOpacity(0.3),
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
            foregroundColor: Colors.white,
            side: BorderSide(color: Colors.white.withOpacity(0.18)),
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
      ),
      home: const AuthWrapper(),
      routes: {
        '/ui-showcase': (context) => const UIShowcaseScreen(),
        '/splash': (context) => const SplashScreenWrapper(),
        '/onboarding': (context) => const OnboardingScreenWrapper(),
        '/interactive': (context) => const InteractiveShowcase(),
        '/create-profile': (context) => const ProfileCreationScreen(),
        '/edit-profile': (context) => const EditProfileScreen(),
        '/pets-marketplace': (context) => const PetsMarketplaceScreen(),
        '/my-pets': (context) => const MyPetsScreen(),
        '/pet-detail': (context) => const PetDetailScreen(),
        '/heroes-leaderboard': (context) => const HeroesLeaderboardScreen(),
        '/my-hero-stats': (context) => const MyHeroStatsScreen(),
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
