import 'dart:math' as math;
import 'dart:typed_data';
import 'dart:ui' as ui;
import 'package:flutter/material.dart';
import '../models/cartoon_avatar.dart';

/// Renders [avatar] to PNG bytes off-screen (no widget tree needed), so the
/// avatar can be uploaded to the backend for non-Flutter consumers.
Future<Uint8List> renderAvatarToPng(CartoonAvatar avatar, {int size = 256}) async {
  final recorder = ui.PictureRecorder();
  final canvas = Canvas(recorder);
  _CartoonAvatarPainter(avatar, true).paint(canvas, Size(size.toDouble(), size.toDouble()));
  final picture = recorder.endRecording();
  final image = await picture.toImage(size, size);
  final byteData = await image.toByteData(format: ui.ImageByteFormat.png);
  return byteData!.buffer.asUint8List();
}

/// Renders a [CartoonAvatar] purely on-device with no network calls.
///
/// Usage:
///   CartoonAvatarView(avatar: myAvatar, size: 200)
class CartoonAvatarView extends StatelessWidget {
  final CartoonAvatar avatar;
  final double size;
  final bool showBackground;

  const CartoonAvatarView({
    super.key,
    required this.avatar,
    this.size = 200,
    this.showBackground = true,
  });

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: size,
      height: size,
      child: CustomPaint(
        painter: _CartoonAvatarPainter(avatar, showBackground),
        size: Size(size, size),
      ),
    );
  }
}

class _CartoonAvatarPainter extends CustomPainter {
  final CartoonAvatar a;
  final bool showBackground;

  _CartoonAvatarPainter(this.a, this.showBackground);

  Color _skin() => AvatarOptions.skinTones[a.skin % AvatarOptions.skinTones.length];
  Color _hair() => AvatarOptions.hairColors[a.hairColor % AvatarOptions.hairColors.length];
  Color _bg() => AvatarOptions.backgrounds[a.background % AvatarOptions.backgrounds.length];

  @override
  void paint(Canvas canvas, Size size) {
    final w = size.width;
    final h = size.height;
    // Work on a 200x200 logical canvas, then scale.
    canvas.save();
    canvas.scale(w / 200, h / 200);

    if (showBackground) {
      final bgPaint = Paint()..color = _bg();
      canvas.drawCircle(const Offset(100, 100), 100, bgPaint);
    }

    // Clip to circle so hair/shoulders don't spill out.
    if (showBackground) {
      canvas.clipPath(Path()..addOval(Rect.fromCircle(center: const Offset(100, 100), radius: 100)));
    }

    _drawBody(canvas);
    _drawBackHair(canvas);
    _drawHead(canvas);
    _drawEars(canvas);
    _drawFacialHair(canvas);
    _drawMouth(canvas);
    _drawNose(canvas);
    _drawEyes(canvas);
    _drawEyebrows(canvas);
    _drawHair(canvas);
    _drawGlasses(canvas);

    canvas.restore();
  }

  // ── Body / shoulders ───────────────────────────────────────────
  void _drawBody(Canvas canvas) {
    final shirt = Paint()..color = const Color(0xFF6C7CE0);
    final path = Path()
      ..moveTo(45, 200)
      ..quadraticBezierTo(45, 165, 100, 158)
      ..quadraticBezierTo(155, 165, 155, 200)
      ..close();
    canvas.drawPath(path, shirt);
    // neck
    final neck = Paint()..color = _skin().withOpacity(0.95);
    canvas.drawRRect(
      RRect.fromRectAndRadius(
          const Rect.fromLTWH(86, 138, 28, 30), const Radius.circular(10)),
      neck,
    );
  }

  // ── Face shape ─────────────────────────────────────────────────
  Rect _faceRect() {
    switch (a.face % AvatarOptions.faceShapes) {
      case 1: // oval
        return const Rect.fromLTWH(58, 46, 84, 104);
      case 2: // square
        return const Rect.fromLTWH(56, 50, 88, 96);
      case 3: // heart (narrow chin)
        return const Rect.fromLTWH(56, 48, 88, 100);
      default: // round
        return const Rect.fromLTWH(54, 50, 92, 96);
    }
  }

  void _drawHead(Canvas canvas) {
    final skin = Paint()..color = _skin();
    final shape = a.face % AvatarOptions.faceShapes;
    final r = _faceRect();
    if (shape == 2) {
      // square
      canvas.drawRRect(
        RRect.fromRectAndRadius(r, const Radius.circular(26)),
        skin,
      );
    } else if (shape == 3) {
      // heart: wide top, pointy chin
      final p = Path()
        ..moveTo(r.left, r.top + 36)
        ..quadraticBezierTo(r.left, r.top, r.center.dx, r.top)
        ..quadraticBezierTo(r.right, r.top, r.right, r.top + 36)
        ..quadraticBezierTo(r.right, r.bottom - 4, r.center.dx, r.bottom)
        ..quadraticBezierTo(r.left, r.bottom - 4, r.left, r.top + 36)
        ..close();
      canvas.drawPath(p, skin);
    } else {
      canvas.drawOval(r, skin);
    }
    // subtle cheek shading
    final shade = Paint()..color = Colors.black.withOpacity(0.04);
    canvas.drawOval(r.deflate(2), shade);
    canvas.drawOval(r.deflate(4), Paint()..color = _skin());
  }

  void _drawEars(Canvas canvas) {
    final skin = Paint()..color = _skin();
    final r = _faceRect();
    canvas.drawCircle(Offset(r.left + 2, r.center.dy + 8), 9, skin);
    canvas.drawCircle(Offset(r.right - 2, r.center.dy + 8), 9, skin);
  }

  // ── Eyes ───────────────────────────────────────────────────────
  void _drawEyes(Canvas canvas) {
    final r = _faceRect();
    final cy = r.top + r.height * 0.46;
    final lx = r.center.dx - 18;
    final rx = r.center.dx + 18;
    final white = Paint()..color = Colors.white;
    final iris = Paint()..color = const Color(0xFF4A3520);
    final pupil = Paint()..color = const Color(0xFF1A1A1A);
    final line = Paint()
      ..color = const Color(0xFF2A2A2A)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 2.4
      ..strokeCap = StrokeCap.round;

    void normalEye(double x) {
      canvas.drawOval(Rect.fromCenter(center: Offset(x, cy), width: 22, height: 16), white);
      canvas.drawCircle(Offset(x, cy), 5.5, iris);
      canvas.drawCircle(Offset(x, cy), 2.6, pupil);
      canvas.drawCircle(Offset(x - 1.6, cy - 1.6), 1.4, white);
    }

    switch (a.eyes % AvatarOptions.eyeStyles) {
      case 1: // big
        for (final x in [lx, rx]) {
          canvas.drawOval(Rect.fromCenter(center: Offset(x, cy), width: 26, height: 22), white);
          canvas.drawCircle(Offset(x, cy + 1), 7, iris);
          canvas.drawCircle(Offset(x, cy + 1), 3.2, pupil);
          canvas.drawCircle(Offset(x - 2, cy - 1), 1.8, white);
        }
        break;
      case 2: // happy / closed (^ ^)
        for (final x in [lx, rx]) {
          final p = Path()
            ..moveTo(x - 9, cy + 2)
            ..quadraticBezierTo(x, cy - 6, x + 9, cy + 2);
          canvas.drawPath(p, line);
        }
        break;
      case 3: // sleepy (half)
        for (final x in [lx, rx]) {
          canvas.drawOval(Rect.fromCenter(center: Offset(x, cy), width: 22, height: 14), white);
          canvas.drawCircle(Offset(x, cy + 1), 5, iris);
          canvas.drawCircle(Offset(x, cy + 1), 2.4, pupil);
          final lid = Paint()
            ..color = _skin()
            ..style = PaintingStyle.fill;
          canvas.drawRect(Rect.fromLTWH(x - 12, cy - 9, 24, 7), lid);
          canvas.drawLine(Offset(x - 11, cy - 2), Offset(x + 11, cy - 2), line);
        }
        break;
      case 4: // wink (left closed)
        canvas.drawPath(
            Path()
              ..moveTo(lx - 9, cy)
              ..quadraticBezierTo(lx, cy - 6, lx + 9, cy),
            line);
        normalEye(rx);
        break;
      case 5: // wide / surprised
        for (final x in [lx, rx]) {
          canvas.drawCircle(Offset(x, cy), 11, white);
          canvas.drawCircle(Offset(x, cy), 5, pupil);
          canvas.drawCircle(Offset(x - 1.6, cy - 1.6), 1.6, white);
        }
        break;
      default: // normal
        normalEye(lx);
        normalEye(rx);
    }
  }

  // ── Eyebrows ───────────────────────────────────────────────────
  void _drawEyebrows(Canvas canvas) {
    final r = _faceRect();
    final cy = r.top + r.height * 0.46 - 14;
    final lx = r.center.dx - 18;
    final rx = r.center.dx + 18;
    final brow = Paint()
      ..color = _hair()
      ..style = PaintingStyle.stroke
      ..strokeWidth = 3.4
      ..strokeCap = StrokeCap.round;

    void draw(double x, bool mirror) {
      final s = mirror ? -1 : 1;
      switch (a.eyebrows % AvatarOptions.eyebrowStyles) {
        case 1: // raised arc
          canvas.drawPath(
              Path()
                ..moveTo(x - 9, cy + 2)
                ..quadraticBezierTo(x, cy - 5, x + 9, cy + 2),
              brow);
          break;
        case 2: // angry (angled)
          canvas.drawLine(Offset(x - 9, cy + (mirror ? 4 : 0)),
              Offset(x + 9, cy + (mirror ? 0 : 4)), brow);
          break;
        case 3: // thick straight
          final tb = Paint()
            ..color = _hair()
            ..strokeWidth = 5.5
            ..strokeCap = StrokeCap.round;
          canvas.drawLine(Offset(x - 9, cy + 1), Offset(x + 9, cy + 1), tb);
          break;
        default: // flat
          canvas.drawLine(Offset(x - 9 * s, cy), Offset(x + 9 * s, cy), brow);
      }
    }

    draw(lx, false);
    draw(rx, true);
  }

  // ── Nose ───────────────────────────────────────────────────────
  void _drawNose(Canvas canvas) {
    final r = _faceRect();
    final cx = r.center.dx;
    final ny = r.top + r.height * 0.6;
    final p = Paint()
      ..color = _skin().withOpacity(0.0)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 2.2
      ..strokeCap = StrokeCap.round;
    final stroke = Paint()
      ..color = Colors.black.withOpacity(0.18)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 2.2
      ..strokeCap = StrokeCap.round;
    canvas.drawPath(
        Path()
          ..moveTo(cx - 2, ny - 6)
          ..lineTo(cx - 4, ny + 4)
          ..quadraticBezierTo(cx, ny + 7, cx + 4, ny + 4),
        stroke);
    // (transparent helper to keep p referenced)
    if (p.color.opacity > 1) canvas.drawCircle(Offset(cx, ny), 1, p);
  }

  // ── Mouth ──────────────────────────────────────────────────────
  void _drawMouth(Canvas canvas) {
    final r = _faceRect();
    final cx = r.center.dx;
    final my = r.top + r.height * 0.76;
    final lip = Paint()
      ..color = const Color(0xFFD56A6A)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 3
      ..strokeCap = StrokeCap.round;
    final fill = Paint()..color = const Color(0xFFC15B5B);
    final teeth = Paint()..color = Colors.white;

    switch (a.mouth % AvatarOptions.mouthStyles) {
      case 1: // big smile with teeth
        final p = Path()
          ..moveTo(cx - 16, my)
          ..quadraticBezierTo(cx, my + 16, cx + 16, my)
          ..close();
        canvas.drawPath(p, fill);
        canvas.drawRRect(
            RRect.fromRectAndRadius(
                Rect.fromCenter(center: Offset(cx, my + 2), width: 26, height: 6),
                const Radius.circular(2)),
            teeth);
        break;
      case 2: // neutral
        canvas.drawLine(Offset(cx - 12, my), Offset(cx + 12, my), lip);
        break;
      case 3: // sad
        canvas.drawPath(
            Path()
              ..moveTo(cx - 12, my + 4)
              ..quadraticBezierTo(cx, my - 6, cx + 12, my + 4),
            lip);
        break;
      case 4: // open "o"
        canvas.drawOval(
            Rect.fromCenter(center: Offset(cx, my), width: 16, height: 18), fill);
        break;
      case 5: // smirk
        canvas.drawPath(
            Path()
              ..moveTo(cx - 12, my)
              ..quadraticBezierTo(cx + 4, my + 8, cx + 14, my - 2),
            lip);
        break;
      case 6: // tongue out
        canvas.drawPath(
            Path()
              ..moveTo(cx - 14, my)
              ..quadraticBezierTo(cx, my + 12, cx + 14, my),
            lip);
        canvas.drawCircle(Offset(cx, my + 8), 5, Paint()..color = const Color(0xFFE98A8A));
        break;
      default: // gentle smile
        canvas.drawPath(
            Path()
              ..moveTo(cx - 13, my - 2)
              ..quadraticBezierTo(cx, my + 10, cx + 13, my - 2),
            lip);
    }
  }

  // ── Facial hair ────────────────────────────────────────────────
  void _drawFacialHair(Canvas canvas) {
    final style = a.facialHair % AvatarOptions.facialHairStyles;
    if (style == 0) return;
    final r = _faceRect();
    final cx = r.center.dx;
    final p = Paint()..color = _hair();
    switch (style) {
      case 1: // stubble (light beard)
        final path = Path()
          ..moveTo(r.left + 8, r.center.dy + 18)
          ..quadraticBezierTo(cx, r.bottom + 6, r.right - 8, r.center.dy + 18)
          ..quadraticBezierTo(cx, r.bottom - 18, r.left + 8, r.center.dy + 18)
          ..close();
        canvas.drawPath(path, Paint()..color = _hair().withOpacity(0.55));
        break;
      case 2: // full beard
        final path = Path()
          ..moveTo(r.left + 4, r.center.dy + 6)
          ..quadraticBezierTo(cx, r.bottom + 14, r.right - 4, r.center.dy + 6)
          ..quadraticBezierTo(cx, r.bottom - 26, r.left + 4, r.center.dy + 6)
          ..close();
        canvas.drawPath(path, p);
        break;
      case 3: // moustache
        final my = r.top + r.height * 0.7;
        canvas.drawPath(
            Path()
              ..moveTo(cx - 14, my)
              ..quadraticBezierTo(cx - 7, my + 6, cx, my + 2)
              ..quadraticBezierTo(cx + 7, my + 6, cx + 14, my)
              ..quadraticBezierTo(cx, my + 12, cx - 14, my)
              ..close(),
            p);
        break;
      case 4: // goatee
        canvas.drawOval(
            Rect.fromCenter(
                center: Offset(cx, r.bottom - 10), width: 24, height: 26),
            p);
    }
  }

  // ── Hair (front) ───────────────────────────────────────────────
  void _drawBackHair(Canvas canvas) {
    final style = a.hairStyle % AvatarOptions.hairStyles;
    if (style == 0) return; // bald
    final r = _faceRect();
    final p = Paint()..color = _hair();
    // Long styles get hair behind the head/shoulders.
    if (style == 5 || style == 7) {
      final path = Path()
        ..moveTo(r.left - 6, r.top + 30)
        ..quadraticBezierTo(r.left - 14, r.bottom + 30, r.left + 6, r.bottom + 40)
        ..lineTo(r.right - 6, r.bottom + 40)
        ..quadraticBezierTo(r.right + 14, r.bottom + 30, r.right + 6, r.top + 30)
        ..close();
      canvas.drawPath(path, p);
    }
  }

  void _drawHair(Canvas canvas) {
    final style = a.hairStyle % AvatarOptions.hairStyles;
    if (style == 0) return; // bald
    final r = _faceRect();
    final cx = r.center.dx;
    final p = Paint()..color = _hair();

    switch (style) {
      case 1: // short rounded
        final path = Path()
          ..moveTo(r.left - 2, r.top + 34)
          ..quadraticBezierTo(r.left - 4, r.top - 16, cx, r.top - 18)
          ..quadraticBezierTo(r.right + 4, r.top - 16, r.right + 2, r.top + 34)
          ..quadraticBezierTo(r.right - 10, r.top + 8, cx, r.top + 14)
          ..quadraticBezierTo(r.left + 10, r.top + 8, r.left - 2, r.top + 34)
          ..close();
        canvas.drawPath(path, p);
        break;
      case 2: // side part / swoosh
        final path = Path()
          ..moveTo(r.left - 2, r.top + 30)
          ..quadraticBezierTo(r.left - 6, r.top - 14, cx + 6, r.top - 16)
          ..quadraticBezierTo(r.right + 6, r.top - 6, r.right, r.top + 24)
          ..quadraticBezierTo(r.right - 16, r.top + 4, cx - 6, r.top + 10)
          ..quadraticBezierTo(r.left + 4, r.top + 16, r.left - 2, r.top + 30)
          ..close();
        canvas.drawPath(path, p);
        break;
      case 3: // spiky
        final base = Path()
          ..moveTo(r.left, r.top + 26)
          ..quadraticBezierTo(cx, r.top - 6, r.right, r.top + 26)
          ..lineTo(r.right, r.top + 12)
          ..lineTo(r.left, r.top + 12)
          ..close();
        canvas.drawPath(base, p);
        for (int i = 0; i < 6; i++) {
          final x = r.left + 6 + i * (r.width - 12) / 5;
          canvas.drawPath(
              Path()
                ..moveTo(x - 7, r.top + 14)
                ..lineTo(x, r.top - 16)
                ..lineTo(x + 7, r.top + 14)
                ..close(),
              p);
        }
        break;
      case 4: // curly / afro
        for (int i = 0; i < 9; i++) {
          final ang = math.pi + i * math.pi / 8;
          final x = cx + math.cos(ang) * (r.width / 2 + 4);
          final y = (r.top + 14) + math.sin(ang) * 20;
          canvas.drawCircle(Offset(x, y), 13, p);
        }
        canvas.drawArc(
            Rect.fromCircle(center: Offset(cx, r.top + 18), radius: r.width / 2 + 6),
            math.pi,
            math.pi,
            false,
            p);
        break;
      case 5: // long straight (front)
        final path = Path()
          ..moveTo(r.left - 6, r.top + 30)
          ..quadraticBezierTo(r.left - 8, r.top - 16, cx, r.top - 18)
          ..quadraticBezierTo(r.right + 8, r.top - 16, r.right + 6, r.top + 30)
          ..quadraticBezierTo(r.right - 6, r.top + 6, cx + 4, r.top + 12)
          ..quadraticBezierTo(r.left + 6, r.top + 6, r.left - 6, r.top + 30)
          ..close();
        canvas.drawPath(path, p);
        break;
      case 6: // buzz / very short
        canvas.drawArc(
            Rect.fromCircle(center: Offset(cx, r.top + 26), radius: r.width / 2),
            math.pi,
            math.pi,
            false,
            Paint()..color = _hair().withOpacity(0.85));
        break;
      case 7: // bun on top + sides (top knot)
        canvas.drawCircle(Offset(cx, r.top - 8), 12, p);
        final path = Path()
          ..moveTo(r.left - 2, r.top + 30)
          ..quadraticBezierTo(r.left - 4, r.top - 4, cx, r.top + 2)
          ..quadraticBezierTo(r.right + 4, r.top - 4, r.right + 2, r.top + 30)
          ..quadraticBezierTo(r.right - 10, r.top + 14, cx, r.top + 16)
          ..quadraticBezierTo(r.left + 10, r.top + 14, r.left - 2, r.top + 30)
          ..close();
        canvas.drawPath(path, p);
        break;
      case 8: // mohawk
        canvas.drawPath(
            Path()
              ..moveTo(cx - 10, r.top + 14)
              ..lineTo(cx - 6, r.top - 24)
              ..lineTo(cx + 6, r.top - 24)
              ..lineTo(cx + 10, r.top + 14)
              ..close(),
            p);
        break;
    }
  }

  // ── Glasses ────────────────────────────────────────────────────
  void _drawGlasses(Canvas canvas) {
    final style = a.glasses % AvatarOptions.glassesStyles;
    if (style == 0) return;
    final r = _faceRect();
    final cy = r.top + r.height * 0.46;
    final lx = r.center.dx - 18;
    final rx = r.center.dx + 18;
    final frame = Paint()
      ..color = const Color(0xFF2A2A2A)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 2.6;

    switch (style) {
      case 1: // round
        canvas.drawCircle(Offset(lx, cy), 12, frame);
        canvas.drawCircle(Offset(rx, cy), 12, frame);
        canvas.drawLine(Offset(lx + 12, cy), Offset(rx - 12, cy), frame);
        break;
      case 2: // square
        for (final x in [lx, rx]) {
          canvas.drawRRect(
              RRect.fromRectAndRadius(
                  Rect.fromCenter(center: Offset(x, cy), width: 24, height: 18),
                  const Radius.circular(4)),
              frame);
        }
        canvas.drawLine(Offset(lx + 12, cy), Offset(rx - 12, cy), frame);
        break;
      case 3: // sunglasses (filled)
        final lens = Paint()..color = const Color(0xFF222222);
        for (final x in [lx, rx]) {
          canvas.drawRRect(
              RRect.fromRectAndRadius(
                  Rect.fromCenter(center: Offset(x, cy), width: 26, height: 20),
                  const Radius.circular(8)),
              lens);
        }
        canvas.drawLine(Offset(lx + 13, cy - 4), Offset(rx - 13, cy - 4), frame);
        break;
    }
  }

  @override
  bool shouldRepaint(covariant _CartoonAvatarPainter old) =>
      old.a.toJsonString() != a.toJsonString() ||
      old.showBackground != showBackground;
}
