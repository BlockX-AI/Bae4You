import 'package:flutter/material.dart';
import 'dart:math';
import '../widgets/gradient_avatar.dart';
import '../widgets/gradient_chip.dart';
import '../widgets/glow_button.dart';
import '../widgets/tilt_card.dart';

class InteractiveShowcase extends StatefulWidget {
  const InteractiveShowcase({super.key});

  @override
  State<InteractiveShowcase> createState() => _InteractiveShowcaseState();
}

class _InteractiveShowcaseState extends State<InteractiveShowcase>
    with TickerProviderStateMixin {
  late AnimationController _pulseController;
  late AnimationController _floatController;
  late AnimationController _rotateController;
  
  int _selectedAvatar = 0;
  int _likes = 0;
  bool _isLiked = false;
  bool _isSuperLiked = false;

  @override
  void initState() {
    super.initState();
    _pulseController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1000),
    );
    
    _floatController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 2000),
    )..repeat();
    
    _rotateController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 3000),
    )..repeat();
  }

  @override
  void dispose() {
    _pulseController.dispose();
    _floatController.dispose();
    _rotateController.dispose();
    super.dispose();
  }

  void _handleLike() {
    setState(() {
      _isLiked = !_isLiked;
      if (_isLiked) {
        _likes++;
        _pulseController.forward(from: 0);
      } else {
        _likes--;
      }
    });
  }

  void _handleSuperLike() {
    setState(() {
      _isSuperLiked = true;
    });
    
    _pulseController.forward(from: 0).then((_) {
      setState(() => _isSuperLiked = false);
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Container(
        decoration: const BoxDecoration(
          gradient: RadialGradient(
            center: Alignment.topCenter,
            radius: 1.2,
            colors: [
              Color(0xFFFF6BB0),
              Color(0xFF7B2FE8),
              Color(0xFF2E0B5C),
            ],
          ),
        ),
        child: SafeArea(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Header
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text(
                      '✨ Interactive Demo',
                      style: TextStyle(
                        fontSize: 28,
                        fontWeight: FontWeight.bold,
                        color: Colors.white,
                      ),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                      decoration: BoxDecoration(
                        gradient: const LinearGradient(
                          colors: [Color(0xFFFF6BB0), Color(0xFF7B2FE8)],
                        ),
                        borderRadius: BorderRadius.circular(20),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          const Icon(Icons.favorite, color: Colors.white, size: 18),
                          const SizedBox(width: 6),
                          Text(
                            '$_likes',
                            style: const TextStyle(
                              color: Colors.white,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
                
                const SizedBox(height: 8),
                
                Text(
                  '🎨 Experience 50+ Premium UI Animations',
                  style: TextStyle(
                    color: Colors.white.withOpacity(0.7),
                    fontSize: 14,
                  ),
                ),
                
                const SizedBox(height: 32),

                // INTERACTIVE AVATAR GALLERY
                _buildSectionHeader('👤 Tap Avatars to Select'),
                SizedBox(
                  height: 100,
                  child: ListView.builder(
                    scrollDirection: Axis.horizontal,
                    itemCount: 5,
                    itemBuilder: (context, index) {
                      final emojis = ['😊', '🎸', '🌟', '🎨', '🚀'];
                      final isSelected = _selectedAvatar == index;
                      
                      return GestureDetector(
                        onTap: () {
                          setState(() => _selectedAvatar = index);
                          _pulseController.forward(from: 0);
                        },
                        child: AnimatedContainer(
                          duration: const Duration(milliseconds: 300),
                          margin: const EdgeInsets.only(right: 16),
                          transform: Matrix4.identity()
                            ..scale(isSelected ? 1.2 : 1.0),
                          child: Stack(
                            children: [
                              GradientAvatar(
                                emoji: emojis[index],
                                size: 70,
                                isOnline: index % 2 == 0,
                                isVerified: index == 0,
                              ),
                              if (isSelected)
                                Positioned(
                                  bottom: 0,
                                  right: 0,
                                  child: Container(
                                    padding: const EdgeInsets.all(4),
                                    decoration: BoxDecoration(
                                      color: const Color(0xFF00FF88),
                                      borderRadius: BorderRadius.circular(10),
                                      border: Border.all(
                                        color: const Color(0xFF2E0B5C),
                                        width: 2,
                                      ),
                                    ),
                                    child: const Icon(
                                      Icons.check,
                                      color: Colors.white,
                                      size: 14,
                                    ),
                                  ),
                                ),
                            ],
                          ),
                        ),
                      );
                    },
                  ),
                ),

                const SizedBox(height: 32),

                // INTEREST CHIPS - TOGGLE ON TAP
                _buildSectionHeader('🏷️ Toggle Your Interests'),
                Wrap(
                  spacing: 12,
                  runSpacing: 12,
                  children: [
                    _buildToggleChip('Music', '🎵'),
                    _buildToggleChip('Travel', '✈️'),
                    _buildToggleChip('Gaming', '🎮'),
                    _buildToggleChip('Food', '🍕'),
                    _buildToggleChip('Fitness', '💪'),
                    _buildToggleChip('Reading', '📚'),
                  ],
                ),

                const SizedBox(height: 32),

                // INTERACTIVE TILT CARD
                _buildSectionHeader('✨ 3D Parallax Card Effect'),
                Center(
                  child: TiltCard(
                    child: Container(
                      width: 280,
                      padding: const EdgeInsets.all(24),
                      child: Column(
                        children: [
                          AnimatedBuilder(
                            animation: _floatController,
                            builder: (context, child) {
                              return Transform.translate(
                                offset: Offset(
                                  0,
                                  5 * sin(_floatController.value * 2 * pi),
                                ),
                                child: Container(
                                  width: 100,
                                  height: 100,
                                  decoration: BoxDecoration(
                                    gradient: const LinearGradient(
                                      colors: [Color(0xFFFF6BB0), Color(0xFF7B2FE8)],
                                    ),
                                    borderRadius: BorderRadius.circular(30),
                                    boxShadow: [
                                      BoxShadow(
                                        color: const Color(0xFFFF6BB0).withOpacity(0.4),
                                        blurRadius: 20,
                                        spreadRadius: 5,
                                      ),
                                    ],
                                  ),
                                  child: AnimatedBuilder(
                                    animation: _rotateController,
                                    builder: (context, child) {
                                      return Transform.rotate(
                                        angle: _rotateController.value * 0.5,
                                        child: const Icon(
                                          Icons.auto_awesome,
                                          color: Colors.white,
                                          size: 50,
                                        ),
                                      );
                                    },
                                  ),
                                ),
                              );
                            },
                          ),
                          const SizedBox(height: 20),
                          const Text(
                            'Glassmorphism 3D',
                            style: TextStyle(
                              color: Colors.white,
                              fontSize: 20,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          Text(
                            'Move cursor to see parallax tilt effect',
                            style: TextStyle(
                              color: Colors.white.withOpacity(0.7),
                              fontSize: 14,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),

                const SizedBox(height: 32),

                // INTERACTIVE LIKE BUTTONS
                _buildSectionHeader('💝 Tap to Like & Super Like'),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                  children: [
                    // Like button
                    GestureDetector(
                      onTap: _handleLike,
                      child: AnimatedBuilder(
                        animation: _pulseController,
                        builder: (context, child) {
                          final scale = 1 + (_pulseController.value * 0.3);
                          return Transform.scale(
                            scale: scale,
                            child: Container(
                              width: 80,
                              height: 80,
                              decoration: BoxDecoration(
                                gradient: _isLiked
                                    ? const LinearGradient(
                                        colors: [Color(0xFFFF1744), Color(0xFFFF6BB0)],
                                      )
                                    : null,
                                color: _isLiked ? null : Colors.white.withOpacity(0.1),
                                shape: BoxShape.circle,
                                boxShadow: _isLiked
                                    ? [
                                        BoxShadow(
                                          color: const Color(0xFFFF1744).withOpacity(0.6),
                                          blurRadius: 30,
                                          spreadRadius: 10,
                                        ),
                                      ]
                                    : [],
                              ),
                              child: Icon(
                                _isLiked ? Icons.favorite : Icons.favorite_border,
                                color: Colors.white,
                                size: 40,
                              ),
                            ),
                          );
                        },
                      ),
                    ),

                    // Super like button
                    GestureDetector(
                      onTap: _handleSuperLike,
                      child: AnimatedBuilder(
                        animation: _pulseController,
                        builder: (context, child) {
                          final scale = _isSuperLiked
                              ? 1 + (_pulseController.value * 0.5)
                              : 1.0;
                          return Transform.scale(
                            scale: scale,
                            child: Container(
                              width: 80,
                              height: 80,
                              decoration: BoxDecoration(
                                gradient: const LinearGradient(
                                  colors: [Color(0xFFFFD700), Color(0xFFFFA726)],
                                ),
                                shape: BoxShape.circle,
                                boxShadow: [
                                  BoxShadow(
                                    color: const Color(0xFFFFD700).withOpacity(0.5),
                                    blurRadius: _isSuperLiked ? 40 : 20,
                                    spreadRadius: _isSuperLiked ? 15 : 5,
                                  ),
                                ],
                              ),
                              child: const Icon(
                                Icons.star,
                                color: Colors.white,
                                size: 40,
                              ),
                            ),
                          );
                        },
                      ),
                    ),
                  ],
                ),

                const SizedBox(height: 32),

                // ANIMATED STATS
                _buildSectionHeader('📊 Live Animated Stats'),
                Container(
                  padding: const EdgeInsets.all(20),
                  decoration: BoxDecoration(
                    color: Colors.white.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(
                      color: Colors.white.withOpacity(0.2),
                    ),
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceAround,
                    children: [
                      _buildAnimatedCounter('Matches', _likes, const Color(0xFFFF6BB0)),
                      _buildAnimatedCounter('Messages', _likes * 3, const Color(0xFF00FF88)),
                      _buildAnimatedCounter('PCASH', _likes * 100, const Color(0xFFFFD700)),
                    ],
                  ),
                ),

                const SizedBox(height: 32),

                // ANIMATED ACTION BUTTONS
                _buildSectionHeader('🎮 Animated Action Buttons'),
                Wrap(
                  spacing: 16,
                  runSpacing: 16,
                  alignment: WrapAlignment.center,
                  children: [
                    _buildAnimatedActionButton('Connect', Icons.wallet, const Color(0xFF7B2FE8)),
                    _buildAnimatedActionButton('Message', Icons.chat_bubble, const Color(0xFF00FF88)),
                    _buildAnimatedActionButton('Share', Icons.share, const Color(0xFFFF6BB0)),
                    _buildAnimatedActionButton('Notify', Icons.notifications, const Color(0xFFFFD700)),
                  ],
                ),

                const SizedBox(height: 32),

                // BREATHING ANIMATION BUTTONS
                _buildSectionHeader('🫁 Breathing Glow Buttons'),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                  children: [
                    _buildBreathingButton(Icons.favorite, const Color(0xFFFF1744)),
                    _buildBreathingButton(Icons.star, const Color(0xFFFFD700)),
                    _buildBreathingButton(Icons.bolt, const Color(0xFF00FF88)),
                  ],
                ),

                const SizedBox(height: 32),

                // SLIDER BUTTON
                _buildSectionHeader('👆 Slide to Match'),
                _buildSlideToConfirmButton(),

                const SizedBox(height: 50),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildSectionHeader(String title) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: Text(
        title,
        style: TextStyle(
          fontSize: 14,
          fontWeight: FontWeight.w600,
          color: Colors.white.withOpacity(0.7),
        ),
      ),
    );
  }

  Widget _buildToggleChip(String label, String emoji) {
    return StatefulBuilder(
      builder: (context, setState) {
        bool isSelected = false;
        return GestureDetector(
          onTap: () => setState(() => isSelected = !isSelected),
          child: AnimatedContainer(
            duration: const Duration(milliseconds: 200),
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
            decoration: BoxDecoration(
              gradient: isSelected
                  ? const LinearGradient(
                      colors: [Color(0xFFFF6BB0), Color(0xFF7B2FE8)],
                    )
                  : null,
              color: isSelected ? null : Colors.white.withOpacity(0.1),
              borderRadius: BorderRadius.circular(20),
              boxShadow: isSelected
                  ? [
                      BoxShadow(
                        color: const Color(0xFFFF6BB0).withOpacity(0.4),
                        blurRadius: 12,
                        spreadRadius: 2,
                      ),
                    ]
                  : [],
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(emoji, style: const TextStyle(fontSize: 16)),
                const SizedBox(width: 6),
                Text(
                  label,
                  style: TextStyle(
                    color: Colors.white,
                    fontWeight: isSelected ? FontWeight.w600 : FontWeight.normal,
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _buildAnimatedCounter(String label, int value, Color color) {
    return TweenAnimationBuilder<int>(
      tween: IntTween(begin: 0, end: value),
      duration: const Duration(milliseconds: 1000),
      builder: (context, animatedValue, child) {
        return Column(
          children: [
            Text(
              animatedValue.toString(),
              style: TextStyle(
                color: color,
                fontSize: 28,
                fontWeight: FontWeight.bold,
              ),
            ),
            Text(
              label,
              style: TextStyle(
                color: Colors.white.withOpacity(0.7),
                fontSize: 12,
              ),
            ),
          ],
        );
      },
    );
  }

  Widget _buildAnimatedActionButton(String label, IconData icon, Color color) {
    return StatefulBuilder(
      builder: (context, setState) {
        bool isPressed = false;
        return GestureDetector(
          onTapDown: (_) => setState(() => isPressed = true),
          onTapUp: (_) => setState(() => isPressed = false),
          onTapCancel: () => setState(() => isPressed = false),
          onTap: () {
            setState(() => isPressed = true);
            Future.delayed(const Duration(milliseconds: 150), () {
              setState(() => isPressed = false);
            });
          },
          child: AnimatedContainer(
            duration: const Duration(milliseconds: 150),
            curve: Curves.easeOutBack,
            transform: Matrix4.identity()..scale(isPressed ? 0.95 : 1.0),
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: [color, color.withOpacity(0.7)],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
              borderRadius: BorderRadius.circular(25),
              boxShadow: [
                BoxShadow(
                  color: color.withOpacity(0.4),
                  blurRadius: isPressed ? 8 : 20,
                  spreadRadius: isPressed ? 2 : 5,
                ),
              ],
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(icon, color: Colors.white, size: 20),
                const SizedBox(width: 8),
                Text(
                  label,
                  style: const TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _buildBreathingButton(IconData icon, Color color) {
    return AnimatedBuilder(
      animation: _floatController,
      builder: (context, child) {
        final scale = 1.0 + 0.1 * sin(_floatController.value * 2 * pi);
        final glowOpacity = 0.3 + 0.2 * sin(_floatController.value * 2 * pi);
        
        return Transform.scale(
          scale: scale,
          child: Container(
            width: 70,
            height: 70,
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: [color, color.withOpacity(0.8)],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
              shape: BoxShape.circle,
              boxShadow: [
                BoxShadow(
                  color: color.withOpacity(glowOpacity),
                  blurRadius: 30,
                  spreadRadius: 8,
                ),
              ],
            ),
            child: Icon(icon, color: Colors.white, size: 32),
          ),
        );
      },
    );
  }

  Widget _buildSlideToConfirmButton() {
    return StatefulBuilder(
      builder: (context, setState) {
        double slidePosition = 0;
        bool isConfirmed = false;
        
        return GestureDetector(
          onHorizontalDragUpdate: (details) {
            setState(() {
              slidePosition += details.delta.dx;
              slidePosition = slidePosition.clamp(0, 250);
              if (slidePosition > 200) {
                isConfirmed = true;
              }
            });
          },
          onHorizontalDragEnd: (_) {
            if (!isConfirmed) {
              setState(() => slidePosition = 0);
            }
          },
          child: Container(
            width: 320,
            height: 60,
            decoration: BoxDecoration(
              color: Colors.white.withOpacity(0.1),
              borderRadius: BorderRadius.circular(30),
              border: Border.all(
                color: isConfirmed 
                    ? const Color(0xFF00FF88) 
                    : Colors.white.withOpacity(0.2),
                width: 2,
              ),
            ),
            child: Stack(
              alignment: Alignment.centerLeft,
              children: [
                // Background text
                Center(
                  child: AnimatedOpacity(
                    duration: const Duration(milliseconds: 200),
                    opacity: isConfirmed ? 0 : 1,
                    child: Text(
                      'Slide to Match',
                      style: TextStyle(
                        color: Colors.white.withOpacity(0.6),
                        fontSize: 16,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ),
                ),
                
                // Success text
                Center(
                  child: AnimatedOpacity(
                    duration: const Duration(milliseconds: 200),
                    opacity: isConfirmed ? 1 : 0,
                    child: const Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(Icons.check_circle, color: Color(0xFF00FF88)),
                        SizedBox(width: 8),
                        Text(
                          'Matched!',
                          style: TextStyle(
                            color: Color(0xFF00FF88),
                            fontSize: 16,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
                
                // Sliding thumb
                AnimatedPositioned(
                  duration: const Duration(milliseconds: 100),
                  curve: Curves.easeOut,
                  left: slidePosition,
                  child: Container(
                    width: 56,
                    height: 56,
                    margin: const EdgeInsets.all(2),
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        colors: isConfirmed
                            ? [const Color(0xFF00FF88), const Color(0xFF00CC6A)]
                            : [const Color(0xFFFF6BB0), const Color(0xFF7B2FE8)],
                      ),
                      shape: BoxShape.circle,
                      boxShadow: [
                        BoxShadow(
                          color: (isConfirmed 
                              ? const Color(0xFF00FF88)
                              : const Color(0xFFFF6BB0)).withOpacity(0.5),
                          blurRadius: 15,
                          spreadRadius: 3,
                        ),
                      ],
                    ),
                    child: Icon(
                      isConfirmed ? Icons.check : Icons.arrow_forward,
                      color: Colors.white,
                    ),
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }
}
