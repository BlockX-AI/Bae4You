import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';
import '../providers/auth_provider.dart';
import '../widgets/glass_navbar.dart';
import 'swipe_screen.dart';
import 'matches_screen.dart';
import 'chat_screen.dart';
import 'profile_screen.dart';

class HomeScreen extends ConsumerStatefulWidget {
  const HomeScreen({super.key});

  @override
  ConsumerState<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends ConsumerState<HomeScreen> {
  int _currentIndex = 0;

  final List<Widget> _screens = [
    const SwipeScreen(),
    const MatchesScreen(),
    const ChatScreen(),
    const ProfileScreen(),
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: _screens[_currentIndex],
      bottomNavigationBar: GlassNavbar(
        currentIndex: _currentIndex,
        onTap: (index) => setState(() => _currentIndex = index),
        items: [
          NavItem(icon: Icons.favorite, label: 'Swipe'),
          NavItem(icon: Icons.people, label: 'Matches'),
          NavItem(icon: Icons.chat_bubble, label: 'Chat'),
          NavItem(icon: Icons.person, label: 'Profile'),
        ],
      ),
    );
  }
}
