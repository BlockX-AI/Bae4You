import 'dart:convert';
import 'dart:math' as math;
import 'package:flutter/material.dart';

/// A fully client-side cartoon avatar — Snapchat/bitmoji style.
///
/// Everything is drawn with CustomPainter (see cartoon_avatar_painter.dart),
/// so it works 100% offline with no backend dependency. Each field is an
/// index into the option lists defined below.
class CartoonAvatar {
  int skin; // index into AvatarOptions.skinTones
  int hairStyle; // index into AvatarOptions.hairStyles
  int hairColor; // index into AvatarOptions.hairColors
  int eyes; // index into AvatarOptions.eyeStyles
  int eyebrows; // index into AvatarOptions.eyebrowStyles
  int mouth; // index into AvatarOptions.mouthStyles
  int face; // index into AvatarOptions.faceShapes
  int glasses; // 0 = none, else index into AvatarOptions.glassesStyles
  int facialHair; // 0 = none, else index into AvatarOptions.facialHairStyles
  int background; // index into AvatarOptions.backgrounds

  CartoonAvatar({
    this.skin = 1,
    this.hairStyle = 1,
    this.hairColor = 0,
    this.eyes = 0,
    this.eyebrows = 0,
    this.mouth = 0,
    this.face = 0,
    this.glasses = 0,
    this.facialHair = 0,
    this.background = 0,
  });

  CartoonAvatar copy() => CartoonAvatar(
        skin: skin,
        hairStyle: hairStyle,
        hairColor: hairColor,
        eyes: eyes,
        eyebrows: eyebrows,
        mouth: mouth,
        face: face,
        glasses: glasses,
        facialHair: facialHair,
        background: background,
      );

  Map<String, dynamic> toJson() => {
        'skin': skin,
        'hairStyle': hairStyle,
        'hairColor': hairColor,
        'eyes': eyes,
        'eyebrows': eyebrows,
        'mouth': mouth,
        'face': face,
        'glasses': glasses,
        'facialHair': facialHair,
        'background': background,
      };

  String toJsonString() => jsonEncode(toJson());

  factory CartoonAvatar.fromJson(Map<String, dynamic> j) => CartoonAvatar(
        skin: j['skin'] ?? 1,
        hairStyle: j['hairStyle'] ?? 1,
        hairColor: j['hairColor'] ?? 0,
        eyes: j['eyes'] ?? 0,
        eyebrows: j['eyebrows'] ?? 0,
        mouth: j['mouth'] ?? 0,
        face: j['face'] ?? 0,
        glasses: j['glasses'] ?? 0,
        facialHair: j['facialHair'] ?? 0,
        background: j['background'] ?? 0,
      );

  static CartoonAvatar? tryParse(String? source) {
    if (source == null || source.isEmpty) return null;
    try {
      return CartoonAvatar.fromJson(jsonDecode(source) as Map<String, dynamic>);
    } catch (_) {
      return null;
    }
  }

  /// A deterministic, varied avatar — used for the "Randomize" button.
  factory CartoonAvatar.random([int? seed]) {
    final r = math.Random(seed);
    int pick(int len) => r.nextInt(len);
    return CartoonAvatar(
      skin: pick(AvatarOptions.skinTones.length),
      hairStyle: pick(AvatarOptions.hairStyles),
      hairColor: pick(AvatarOptions.hairColors.length),
      eyes: pick(AvatarOptions.eyeStyles),
      eyebrows: pick(AvatarOptions.eyebrowStyles),
      mouth: pick(AvatarOptions.mouthStyles),
      face: pick(AvatarOptions.faceShapes),
      glasses: r.nextInt(3) == 0 ? pick(AvatarOptions.glassesStyles) : 0,
      facialHair: r.nextInt(3) == 0 ? pick(AvatarOptions.facialHairStyles) : 0,
      background: pick(AvatarOptions.backgrounds.length),
    );
  }

  /// Generic getter/setter by step key — used by the builder UI.
  int valueFor(String key) {
    switch (key) {
      case 'face':
        return face;
      case 'skin':
        return skin;
      case 'hairStyle':
        return hairStyle;
      case 'hairColor':
        return hairColor;
      case 'eyes':
        return eyes;
      case 'eyebrows':
        return eyebrows;
      case 'mouth':
        return mouth;
      case 'glasses':
        return glasses;
      case 'facialHair':
        return facialHair;
      case 'background':
        return background;
      default:
        return 0;
    }
  }

  void setValue(String key, int v) {
    switch (key) {
      case 'face':
        face = v;
        break;
      case 'skin':
        skin = v;
        break;
      case 'hairStyle':
        hairStyle = v;
        break;
      case 'hairColor':
        hairColor = v;
        break;
      case 'eyes':
        eyes = v;
        break;
      case 'eyebrows':
        eyebrows = v;
        break;
      case 'mouth':
        mouth = v;
        break;
      case 'glasses':
        glasses = v;
        break;
      case 'facialHair':
        facialHair = v;
        break;
      case 'background':
        background = v;
        break;
    }
  }
}

/// All selectable options for the avatar, as colour palettes / counts.
class AvatarOptions {
  AvatarOptions._();

  // Skin tones — light → deep.
  static const List<Color> skinTones = [
    Color(0xFFFFE0BD),
    Color(0xFFFFCD94),
    Color(0xFFEAC086),
    Color(0xFFD1A36C),
    Color(0xFFA9764B),
    Color(0xFF8D5524),
    Color(0xFF613915),
  ];

  // Hair colours.
  static const List<Color> hairColors = [
    Color(0xFF1C1C1C), // jet black
    Color(0xFF3B2417), // dark brown
    Color(0xFF6A4029), // brown
    Color(0xFF9E6B3F), // light brown
    Color(0xFFD8A14B), // blonde
    Color(0xFFB23A1E), // auburn
    Color(0xFFB0B0B0), // grey
    Color(0xFFE94E9C), // pink
    Color(0xFF4E7BE9), // blue
    Color(0xFF6BCB77), // green
  ];

  // Background colours (avatar circle fill).
  static const List<Color> backgrounds = [
    Color(0xFFFFD6DE),
    Color(0xFFFFE8C8),
    Color(0xFFE4F0D4),
    Color(0xFFD4ECF0),
    Color(0xFFD9E0F5),
    Color(0xFFEADAF5),
    Color(0xFFFFC9D6),
    Color(0xFFFBE3A1),
  ];

  // The number of variants for each painted feature. The painter draws
  // a different look for each index (modulo the count).
  static const int faceShapes = 4; // round, oval, square, heart
  static const int hairStyles = 9; // 0 = bald
  static const int eyeStyles = 6;
  static const int eyebrowStyles = 4;
  static const int mouthStyles = 7;
  static const int glassesStyles = 4; // 0 = none
  static const int facialHairStyles = 5; // 0 = none

  // Convenience counts used by the generic builder steps.
  static int countFor(String key) {
    switch (key) {
      case 'face':
        return faceShapes;
      case 'skin':
        return skinTones.length;
      case 'hairStyle':
        return hairStyles;
      case 'hairColor':
        return hairColors.length;
      case 'eyes':
        return eyeStyles;
      case 'eyebrows':
        return eyebrowStyles;
      case 'mouth':
        return mouthStyles;
      case 'glasses':
        return glassesStyles;
      case 'facialHair':
        return facialHairStyles;
      case 'background':
        return backgrounds.length;
      default:
        return 1;
    }
  }
}
