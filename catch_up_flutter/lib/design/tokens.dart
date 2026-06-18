/// AppTokens — The single source of truth for all design values.
///
/// RULES:
/// 1. Import this file everywhere you need colors, spacing, typography, or shadows.
/// 2. Use static const references — never inline Color(0xFF...), never Colors.red.
/// 3. All text styles go through AppTokens.textStyles. Never TextStyle(...) inline.
/// 4. Spacing must use the 4pt scale — no magic numbers like padding: 13.
/// 5. Durations are in milliseconds. Prefer fast for micro-interactions, slow for page transitions.
/// 6. Opacity tokens are for overlays, not text (text uses textLow/textMid/textHi).
///
/// WHAT NOT TO DO:
/// - NO Color(0xFF...) anywhere outside this file
/// - NO Colors.pink, Colors.white, Colors.black in widgets
/// - NO TextStyle(fontSize: 16, ...) inline
/// - NO BoxShadow(color: Colors.pink.withOpacity(0.5), ...)
/// - NO decorative glows, neon outlines, or "premium" effects without functional purpose
///
/// Example usage:
/// ```dart
/// Container(
///   color: AppTokens.surface,
///   padding: EdgeInsets.all(AppTokens.s16),
///   child: Text('Hello', style: AppTokens.textStyles.body),
/// )
/// ```

import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

class AppTokens {
  AppTokens._();

  // ==========================================
  // COLORS
  // ==========================================

  /// Deep background — the canvas. Use for scaffolds, root containers.
  static const Color bg = Color(0xFF0A0A0F);

  /// Primary surface — cards, sheets, elevated containers.
  static const Color surface = Color(0xFF15151C);

  /// Secondary surface — nested cards, hover states, sub-sections.
  static const Color surface2 = Color(0xFF1E1E28);

  /// Borders and dividers — subtle separation, never decorative.
  static const Color border = Color(0xFF2A2A36);

  /// High-emphasis text — headings, values, primary data.
  static const Color textHi = Color(0xFFF5F5F7);

  /// Medium-emphasis text — body copy, secondary labels.
  static const Color textMid = Color(0xFFA0A0B0);

  /// Low-emphasis text — metadata, hints, disabled states.
  static const Color textLow = Color(0xFF6B6B7A);

  /// Accent — CTAs, active states, value-up indicators. Use sparingly.
  static const Color accent = Color(0xFFFF4D6D);

  /// Accent muted — backgrounds for accent chips, badges, subtle highlights.
  static const Color accentMuted = Color(0xFF8C3247);

  /// Success — gains, confirmations, positive deltas.
  static const Color success = Color(0xFF4ADE80);

  /// Warning — pending, attention required, partial states.
  static const Color warning = Color(0xFFF5A524);

  /// Danger — losses, errors, destructive actions, negative deltas.
  static const Color danger = Color(0xFFEF4444);

  // ==========================================
  // SPACING (4pt scale)
  // ==========================================

  static const double s4 = 4;
  static const double s8 = 8;
  static const double s12 = 12;
  static const double s16 = 16;
  static const double s20 = 20;
  static const double s24 = 24;
  static const double s32 = 32;
  static const double s48 = 48;
  static const double s64 = 64;

  // ==========================================
  // RADIUS
  // ==========================================

  /// Sharp corners — data tables, tight lists.
  static const double r4 = 4;

  /// Subtle rounding — input fields, small buttons.
  static const double r8 = 8;

  /// Standard rounding — cards, medium buttons, chips.
  static const double r12 = 12;

  /// Generous rounding — modals, large cards.
  static const double r16 = 16;

  /// Pills, full buttons — navigation items, tags.
  static const double r24 = 24;

  /// Fully rounded — avatars, icon buttons, circular indicators.
  static const double r999 = 999;

  // ==========================================
  // DURATIONS (ms)
  // ==========================================

  /// Micro-interactions — button presses, toggles, focus rings.
  static const int fast = 120;

  /// Standard transitions — page pushes, sheet opens, expands.
  static const int base = 200;

  /// Emphasized transitions — success confirmations, value changes.
  static const int slow = 320;

  // ==========================================
  // OPACITY (for overlays, not text)
  // ==========================================

  /// Hover state overlay on interactive elements.
  static const double hoverOpacity = 0.08;

  /// Pressed/active state overlay.
  static const double pressedOpacity = 0.12;

  /// Disabled elements — substantial dimming.
  static const double disabledOpacity = 0.40;

  // ==========================================
  // TYPOGRAPHY
  // ==========================================

  /// Display: Space Grotesk (700, 600) — headlines, brand moments
  /// Body: Inter (400, 500, 600) — everything else
  /// Mono: JetBrains Mono (500) — money, IDs, addresses, data
  static TextStyles get textStyles => TextStyles._();

  // ==========================================
  // SHADOWS
  // ==========================================

  /// Flat — default for most surfaces in dark UI.
  static List<BoxShadow> get none => const [];

  /// Small lift — cards at rest, subtle elevation.
  static List<BoxShadow> get sm => const [
        BoxShadow(
          color: Color(0x40000000),
          blurRadius: 4,
          offset: Offset(0, 2),
        ),
      ];

  /// Medium lift — modals, dropdowns, focused cards.
  static List<BoxShadow> get md => const [
        BoxShadow(
          color: Color(0x40000000),
          blurRadius: 8,
          offset: Offset(0, 4),
        ),
        BoxShadow(
          color: Color(0x20000000),
          blurRadius: 16,
          offset: Offset(0, 8),
        ),
      ];

  /// Large lift — top sheets, full-screen overlays.
  static List<BoxShadow> get lg => const [
        BoxShadow(
          color: Color(0x40000000),
          blurRadius: 16,
          offset: Offset(0, 8),
        ),
        BoxShadow(
          color: Color(0x20000000),
          blurRadius: 32,
          offset: Offset(0, 16),
        ),
      ];
}

/// Nested text styles. Access via AppTokens.textStyles.
class TextStyles {
  TextStyles._();

  /// Space Grotesk 700, 48/56, -0.02 letter-spacing
  /// Hero headlines, splash screens, large numbers.
  TextStyle get display1 => GoogleFonts.spaceGrotesk(
        fontWeight: FontWeight.w700,
        fontSize: 48,
        height: 56 / 48,
        letterSpacing: -0.02,
        color: AppTokens.textHi,
      );

  /// Space Grotesk 700, 32/40, -0.01 letter-spacing
  /// Section headers, major card titles.
  TextStyle get display2 => GoogleFonts.spaceGrotesk(
        fontWeight: FontWeight.w700,
        fontSize: 32,
        height: 40 / 32,
        letterSpacing: -0.01,
        color: AppTokens.textHi,
      );

  /// Space Grotesk 600, 24/32
  /// Page titles, major section boundaries.
  TextStyle get h1 => GoogleFonts.spaceGrotesk(
        fontWeight: FontWeight.w600,
        fontSize: 24,
        height: 32 / 24,
        color: AppTokens.textHi,
      );

  /// Space Grotesk 600, 20/28
  /// Card titles, sub-section headers.
  TextStyle get h2 => GoogleFonts.spaceGrotesk(
        fontWeight: FontWeight.w600,
        fontSize: 20,
        height: 28 / 20,
        color: AppTokens.textHi,
      );

  /// Inter 600, 16/24
  /// List headers, button labels, emphasized body.
  TextStyle get h3 => GoogleFonts.inter(
        fontWeight: FontWeight.w600,
        fontSize: 16,
        height: 24 / 16,
        color: AppTokens.textHi,
      );

  /// Inter 400, 16/24
  /// Large body text, descriptions, paragraphs.
  TextStyle get bodyLg => GoogleFonts.inter(
        fontWeight: FontWeight.w400,
        fontSize: 16,
        height: 24 / 16,
        color: AppTokens.textHi,
      );

  /// Inter 400, 14/22
  /// Standard body text — the default for most content.
  TextStyle get body => GoogleFonts.inter(
        fontWeight: FontWeight.w400,
        fontSize: 14,
        height: 22 / 14,
        color: AppTokens.textHi,
      );

  /// Inter 400, 12/18
  /// Small print, metadata, timestamps, captions.
  TextStyle get bodySm => GoogleFonts.inter(
        fontWeight: FontWeight.w400,
        fontSize: 12,
        height: 18 / 12,
        color: AppTokens.textMid,
      );

  /// Inter 500, 12/16, +0.04 letter-spacing
  /// Uppercase labels, tags, table headers, all-caps UI.
  TextStyle get label => GoogleFonts.inter(
        fontWeight: FontWeight.w500,
        fontSize: 12,
        height: 16 / 12,
        letterSpacing: 0.04,
        color: AppTokens.textMid,
      );

  /// JetBrains Mono 500, 24/32
  /// Large monetary values, big numbers, portfolio totals.
  TextStyle get moneyLg => GoogleFonts.jetBrainsMono(
        fontWeight: FontWeight.w500,
        fontSize: 24,
        height: 32 / 24,
        color: AppTokens.textHi,
      );

  /// JetBrains Mono 500, 16/24
  /// Standard money values, prices, deltas, quantities.
  TextStyle get money => GoogleFonts.jetBrainsMono(
        fontWeight: FontWeight.w500,
        fontSize: 16,
        height: 24 / 16,
        color: AppTokens.textHi,
      );

  /// JetBrains Mono 500, 12/18
  /// Small money values, compact tables, footnotes.
  TextStyle get moneySm => GoogleFonts.jetBrainsMono(
        fontWeight: FontWeight.w500,
        fontSize: 12,
        height: 18 / 12,
        color: AppTokens.textMid,
      );
}
