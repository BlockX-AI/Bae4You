import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

// Haptic feedback wrapper for buttons
class HapticButton extends StatelessWidget {
  final Widget child;
  final VoidCallback onPressed;
  final HapticFeedbackType feedbackType;

  const HapticButton({
    super.key,
    required this.child,
    required this.onPressed,
    this.feedbackType = HapticFeedbackType.lightImpact,
  });

  void _triggerHaptic() {
    switch (feedbackType) {
      case HapticFeedbackType.lightImpact:
        HapticFeedback.lightImpact();
        break;
      case HapticFeedbackType.mediumImpact:
        HapticFeedback.mediumImpact();
        break;
      case HapticFeedbackType.heavyImpact:
        HapticFeedback.heavyImpact();
        break;
      case HapticFeedbackType.selectionClick:
        HapticFeedback.selectionClick();
        break;
      case HapticFeedbackType.vibrate:
        HapticFeedback.vibrate();
        break;
    }
    onPressed();
  }

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: _triggerHaptic,
      child: child,
    );
  }
}

enum HapticFeedbackType {
  lightImpact,
  mediumImpact,
  heavyImpact,
  selectionClick,
  vibrate,
}

// Touch ripple effect with custom colors
class CustomRipple extends StatelessWidget {
  final Widget child;
  final VoidCallback onTap;
  final Color rippleColor;
  final BorderRadius? borderRadius;

  const CustomRipple({
    super.key,
    required this.child,
    required this.onTap,
    this.rippleColor = const Color(0xFFFF6BB0),
    this.borderRadius,
  });

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: () {
          HapticFeedback.lightImpact();
          onTap();
        },
        borderRadius: borderRadius ?? BorderRadius.circular(16),
        splashColor: rippleColor.withOpacity(0.3),
        highlightColor: rippleColor.withOpacity(0.1),
        child: child,
      ),
    );
  }
}

// Long press with haptic
class HapticLongPress extends StatelessWidget {
  final Widget child;
  final VoidCallback onLongPress;

  const HapticLongPress({
    super.key,
    required this.child,
    required this.onLongPress,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onLongPress: () {
        HapticFeedback.heavyImpact();
        onLongPress();
      },
      child: child,
    );
  }
}

// Success haptic feedback
class SuccessHaptic {
  static void trigger() {
    HapticFeedback.mediumImpact();
    Future.delayed(const Duration(milliseconds: 100), () {
      HapticFeedback.lightImpact();
    });
  }
}

// Error haptic feedback
class ErrorHaptic {
  static void trigger() {
    HapticFeedback.heavyImpact();
    Future.delayed(const Duration(milliseconds: 50), () {
      HapticFeedback.heavyImpact();
    });
  }
}
