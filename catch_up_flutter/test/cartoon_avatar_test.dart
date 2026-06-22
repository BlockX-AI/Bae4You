// Verifies the CartoonAvatar painter renders every feature variant without
// throwing — i.e. the avatar face actually draws for all builder options.
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:catch_up/models/cartoon_avatar.dart';
import 'package:catch_up/widgets/cartoon_avatar_painter.dart';

void main() {
  testWidgets('default avatar paints without error', (tester) async {
    await tester.pumpWidget(MaterialApp(
      home: Center(child: CartoonAvatarView(avatar: CartoonAvatar(), size: 200)),
    ));
    expect(tester.takeException(), isNull);
    expect(find.byType(CartoonAvatarView), findsOneWidget);
  });

  testWidgets('every variant of every feature paints without error',
      (tester) async {
    final keys = [
      'face', 'skin', 'hairStyle', 'hairColor', 'eyes',
      'eyebrows', 'mouth', 'glasses', 'facialHair', 'background',
    ];
    for (final key in keys) {
      final count = AvatarOptions.countFor(key);
      for (var i = 0; i < count; i++) {
        final a = CartoonAvatar()..setValue(key, i);
        await tester.pumpWidget(MaterialApp(
          home: Center(child: CartoonAvatarView(avatar: a, size: 120)),
        ));
        expect(tester.takeException(), isNull,
            reason: 'painting $key=$i threw');
      }
    }
  });

  testWidgets('100 random avatars paint without error', (tester) async {
    for (var seed = 0; seed < 100; seed++) {
      final a = CartoonAvatar.random(seed);
      await tester.pumpWidget(MaterialApp(
        home: Center(child: CartoonAvatarView(avatar: a, size: 120)),
      ));
      expect(tester.takeException(), isNull, reason: 'random seed=$seed threw');
    }
  });

  test('json round-trips', () {
    final a = CartoonAvatar.random(7);
    final b = CartoonAvatar.fromJson(a.toJson());
    expect(b.toJsonString(), a.toJsonString());
  });
}
