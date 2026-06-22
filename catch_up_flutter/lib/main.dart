import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'screens/landing_screen.dart';
import 'screens/home_screen.dart';
import 'screens/splash_screen.dart';
import 'screens/edit_profile_screen.dart';
import 'screens/pets_marketplace_screen.dart';
import 'screens/my_pets_screen.dart';
import 'screens/pet_detail_screen.dart';
import 'screens/heroes_leaderboard_screen.dart';
import 'screens/my_hero_stats_screen.dart';
import 'screens/settings_screen.dart';
import 'screens/profile_setup_screen.dart';
import 'screens/avatar_studio_screen.dart';
import 'providers/auth_provider.dart';
import 'theme/app_theme.dart';

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
      theme: AppTheme.dark(),
      home: const AuthWrapper(),
      routes: {
        '/splash': (context) => const SplashScreenWrapper(),
        '/edit-profile': (context) => const EditProfileScreen(),
        '/pets-marketplace': (context) => const PetsMarketplaceScreen(),
        '/my-pets': (context) => const MyPetsScreen(),
        '/pet-detail': (context) => const PetDetailScreen(),
        '/heroes-leaderboard': (context) => const HeroesLeaderboardScreen(),
        '/my-hero-stats': (context) => const MyHeroStatsScreen(),
        '/settings': (context) => const SettingsScreen(),
        '/avatar-studio': (context) => const AvatarStudioScreen(),
        '/profile-setup': (context) => ProfileSetupScreen(onComplete: () => Navigator.pushReplacementNamed(context, '/home')),
        '/home': (context) => const HomeScreen(),
      },
      // Safety net: any unregistered route falls back to home instead of
      // throwing a "route not found" exception.
      onUnknownRoute: (settings) => MaterialPageRoute(
        builder: (_) => const HomeScreen(),
        settings: settings,
      ),
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
        return ProfileSetupScreen(onComplete: () {
          Navigator.pushReplacementNamed(context, '/home');
        });
      }
    } else {
      return const LandingScreen();
    }
  }
}

// Wrapper for splash to home navigation
class SplashScreenWrapper extends StatelessWidget {
  const SplashScreenWrapper({super.key});

  @override
  Widget build(BuildContext context) {
    return AnimatedSplashScreen(
      onComplete: () {
        WidgetsBinding.instance.addPostFrameCallback((_) {
          Navigator.of(context).pushReplacementNamed('/home');
        });
      },
    );
  }
}
