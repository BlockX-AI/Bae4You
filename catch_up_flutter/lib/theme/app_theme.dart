import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../design/tokens.dart';

/// AppTheme — ThemeData factory using AppTokens.
///
/// All visual configuration lives in AppTokens. This file is the bridge
/// to Flutter's ThemeData system. No values should be hardcoded here.
class AppTheme {
  AppTheme._();

  /// Dark theme — the only theme for this product.
  static ThemeData dark() {
    final tokens = AppTokens;
    final textStyles = AppTokens.textStyles;

    return ThemeData(
      useMaterial3: true,
      brightness: Brightness.dark,
      scaffoldBackgroundColor: AppTokens.bg,

      // ==========================================
      // COLOR SCHEME
      // ==========================================
      colorScheme: ColorScheme.fromSeed(
        seedColor: AppTokens.accent,
        brightness: Brightness.dark,
        primary: AppTokens.accent,
        onPrimary: AppTokens.textHi,
        surface: AppTokens.surface,
        onSurface: AppTokens.textHi,
        surfaceContainerHighest: AppTokens.surface2,
        error: AppTokens.danger,
        onError: AppTokens.textHi,
        background: AppTokens.bg,
        onBackground: AppTokens.textHi,
      ),

      // ==========================================
      // TYPOGRAPHY
      // ==========================================
      textTheme: TextTheme(
        displayLarge: textStyles.display1,
        displayMedium: textStyles.display2,
        displaySmall: textStyles.h1,
        headlineLarge: textStyles.h1,
        headlineMedium: textStyles.h2,
        headlineSmall: textStyles.h3,
        titleLarge: textStyles.h3,
        titleMedium: textStyles.body,
        titleSmall: textStyles.bodySm,
        bodyLarge: textStyles.bodyLg,
        bodyMedium: textStyles.body,
        bodySmall: textStyles.bodySm,
        labelLarge: textStyles.label,
        labelMedium: textStyles.label,
        labelSmall: textStyles.bodySm,
      ),

      // ==========================================
      // BUTTON THEMES
      // ==========================================
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: AppTokens.accent,
          foregroundColor: AppTokens.textHi,
          disabledBackgroundColor: AppTokens.accent.withOpacity(AppTokens.disabledOpacity),
          disabledForegroundColor: AppTokens.textHi,
          elevation: 0,
          shadowColor: Colors.transparent,
          padding: const EdgeInsets.symmetric(
            horizontal: AppTokens.s24,
            vertical: AppTokens.s16,
          ),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(AppTokens.r12),
          ),
          textStyle: textStyles.h3,
        ),
      ),

      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          backgroundColor: Colors.transparent,
          foregroundColor: AppTokens.textHi,
          disabledForegroundColor: AppTokens.textLow,
          side: BorderSide(color: AppTokens.border, width: 1),
          padding: const EdgeInsets.symmetric(
            horizontal: AppTokens.s24,
            vertical: AppTokens.s16,
          ),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(AppTokens.r12),
          ),
          textStyle: textStyles.h3,
        ),
      ),

      textButtonTheme: TextButtonThemeData(
        style: TextButton.styleFrom(
          foregroundColor: AppTokens.textHi,
          disabledForegroundColor: AppTokens.textLow,
          padding: const EdgeInsets.symmetric(
            horizontal: AppTokens.s12,
            vertical: AppTokens.s8,
          ),
          textStyle: textStyles.body,
        ),
      ),

      // ==========================================
      // INPUT DECORATION
      // ==========================================
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: AppTokens.surface2,
        contentPadding: const EdgeInsets.all(AppTokens.s16),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppTokens.r12),
          borderSide: BorderSide(color: AppTokens.border, width: 1),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppTokens.r12),
          borderSide: BorderSide(color: AppTokens.border, width: 1),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppTokens.r12),
          borderSide: BorderSide(color: AppTokens.accent, width: 1.5),
        ),
        errorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppTokens.r12),
          borderSide: BorderSide(color: AppTokens.danger, width: 1),
        ),
        focusedErrorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppTokens.r12),
          borderSide: BorderSide(color: AppTokens.danger, width: 1.5),
        ),
        hintStyle: textStyles.body.copyWith(color: AppTokens.textLow),
        labelStyle: textStyles.body.copyWith(color: AppTokens.textMid),
        errorStyle: textStyles.bodySm.copyWith(color: AppTokens.danger),
      ),

      // ==========================================
      // CARD THEME
      // ==========================================
      cardTheme: CardThemeData(
        color: AppTokens.surface,
        surfaceTintColor: Colors.transparent,
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(AppTokens.r16),
          side: BorderSide(color: AppTokens.border, width: 1),
        ),
        margin: EdgeInsets.zero,
      ),

      // ==========================================
      // ICON THEME
      // ==========================================
      iconTheme: IconThemeData(
        color: AppTokens.textMid,
        size: 20,
      ),

      // ==========================================
      // DIVIDER THEME
      // ==========================================
      dividerTheme: DividerThemeData(
        color: AppTokens.border,
        thickness: 1,
        space: 0,
      ),

      // ==========================================
      // APP BAR THEME
      // ==========================================
      appBarTheme: AppBarTheme(
        backgroundColor: AppTokens.bg,
        foregroundColor: AppTokens.textHi,
        elevation: 0,
        scrolledUnderElevation: 0,
        centerTitle: false,
        titleTextStyle: textStyles.h1,
        toolbarHeight: 64,
      ),

      // ==========================================
      // BOTTOM NAVIGATION THEME
      // ==========================================
      bottomNavigationBarTheme: BottomNavigationBarThemeData(
        backgroundColor: AppTokens.surface,
        elevation: 0,
        selectedItemColor: AppTokens.accent,
        unselectedItemColor: AppTokens.textMid,
        type: BottomNavigationBarType.fixed,
        showSelectedLabels: true,
        showUnselectedLabels: true,
        selectedLabelStyle: AppTokens.textStyles.label,
        unselectedLabelStyle: AppTokens.textStyles.label,
      ),

      // ==========================================
      // DIALOG THEME
      // ==========================================
      dialogTheme: DialogThemeData(
        backgroundColor: AppTokens.surface,
        surfaceTintColor: Colors.transparent,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(AppTokens.r16),
          side: BorderSide(color: AppTokens.border, width: 1),
        ),
        elevation: 0,
      ),

      // ==========================================
      // SNACKBAR THEME
      // ==========================================
      snackBarTheme: SnackBarThemeData(
        backgroundColor: AppTokens.surface2,
        contentTextStyle: AppTokens.textStyles.body,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(AppTokens.r12),
          side: BorderSide(color: AppTokens.border, width: 1),
        ),
        behavior: SnackBarBehavior.floating,
        elevation: 0,
      ),

      // ==========================================
      // CHIP THEME
      // ==========================================
      chipTheme: ChipThemeData(
        backgroundColor: AppTokens.surface2,
        disabledColor: AppTokens.surface2,
        selectedColor: AppTokens.accentMuted,
        secondarySelectedColor: AppTokens.accentMuted,
        padding: const EdgeInsets.symmetric(
          horizontal: AppTokens.s12,
          vertical: AppTokens.s4,
        ),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(AppTokens.r24),
          side: BorderSide(color: AppTokens.border, width: 1),
        ),
        labelStyle: AppTokens.textStyles.label,
        secondaryLabelStyle: AppTokens.textStyles.label,
        brightness: Brightness.dark,
      ),

      // ==========================================
      // SCROLLBEHAVIOR
      // ==========================================
      scrollbarTheme: ScrollbarThemeData(
        thumbColor: WidgetStateProperty.all(AppTokens.textLow),
        trackColor: WidgetStateProperty.all(Colors.transparent),
        thickness: WidgetStateProperty.all(4),
        radius: const Radius.circular(2),
        minThumbLength: 48,
      ),

      // ==========================================
      // VISUAL DENSITY & SPLASH
      // ==========================================
      visualDensity: VisualDensity.standard,
      splashFactory: NoSplash.splashFactory,

      // ==========================================
      // SYSTEM UI OVERLAY
      // ==========================================
      platform: TargetPlatform.iOS,
    );
  }
}
