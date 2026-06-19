import 'package:flutter/material.dart';
class AppColors {
  static const Color primary = Color(0xFFFF8FAB);
  static const Color primaryLight = Color(0xFFFFB3C1);
  static const Color primaryDark = Color(0xFFFF6B8A);
  static const Color accent = Color(0xFFFF4D79);
  static const Color bgTop = Color(0xFFFFCDD8);
  static const Color bgMid = Color(0xFFFFB3C1);
  static const Color bgBottom = Color(0xFFFF8FAB);
  static const Color surface = Color(0xFFFFF0F3);
  static const Color surfaceCard = Color(0xFFFFE4EA);
  static const Color textPrimary = Color(0xFF3D0017);
  static const Color textSecondary = Color(0xFF8B3A52);
  static const Color textHint = Color(0xFFBB7085);
  static const Color border = Color(0xFFFFB3C1);
  static const Color divider = Color(0xFFFFD6DE);
  static const LinearGradient mainGradient = LinearGradient(
    begin: Alignment.topCenter,
    end: Alignment.bottomCenter,
    colors: [bgTop, bgMid, bgBottom],
  );
  static const LinearGradient cardGradient = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [Color(0xFFFFE4EA), Color(0xFFFFCDD8)],
  );
  static const LinearGradient buttonGradient = LinearGradient(
    colors: [Color(0xFFFF6B8A), Color(0xFFFF4D79)],
  );
}
