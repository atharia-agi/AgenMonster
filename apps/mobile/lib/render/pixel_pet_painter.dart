// Flutter PixelPetPainter — CustomPainter for pixel-art pet rendering.

import 'dart:math';
import 'package:flutter/material.dart';

class PixelPetPainter extends CustomPainter {
  final int frame;
  final List<int> palette;
  final double bodyScale;
  final bool hasWings;

  PixelPetPainter({
    required this.frame,
    required this.palette,
    required this.bodyScale,
    required this.hasWings,
  });

  @override
  void paint(Canvas canvas, Size size) {
    final cx = size.width / 2;
    final cy = size.height / 2;
    final t = frame / 60.0;
    final bobY = sin(t * 2) * 2.0;

    // Egg body
    final bodyPaint = Paint()..color = Color(palette[1]);
    final bodyRect = Rect.fromCenter(
      center: Offset(cx, cy + bobY),
      width: 40 * bodyScale,
      height: 56 * bodyScale,
    );
    canvas.drawOval(bodyRect, bodyPaint);

    // Highlight
    final highlightPaint = Paint()..color = Color(palette[3]);
    canvas.drawRect(
      Rect.fromLTWH(cx - 6, cy - 18 * bodyScale + bobY, 4, 4),
      highlightPaint,
    );

    // Eyes
    final eyePaint = Paint()..color = Color(palette[3]);
    final pupilPaint = Paint()..color = Color(palette[0]);
    final isBlinking = (sin(t * 0.5) > 0.95);

    if (!isBlinking) {
      // Left eye
      canvas.drawRect(Rect.fromLTWH(cx - 10, cy - 4 + bobY, 6, 6), eyePaint);
      canvas.drawRect(Rect.fromLTWH(cx - 8, cy - 2 + bobY, 3, 3), pupilPaint);
      // Right eye
      canvas.drawRect(Rect.fromLTWH(cx + 4, cy - 4 + bobY, 6, 6), eyePaint);
      canvas.drawRect(Rect.fromLTWH(cx + 6, cy - 2 + bobY, 3, 3), pupilPaint);
    } else {
      // Closed eyes
      canvas.drawRect(Rect.fromLTWH(cx - 10, cy - 1 + bobY, 8, 2), pupilPaint);
      canvas.drawRect(Rect.fromLTWH(cx + 4, cy - 1 + bobY, 8, 2), pupilPaint);
    }

    // Wings
    if (hasWings) {
      final wingPaint = Paint()..color = Color(palette[2]);
      final wingFlap = sin(t * 4) * 4;
      // Left wing
      canvas.drawRect(
        Rect.fromLTWH(cx - 24, cy - 8 + wingFlap + bobY, 12, 8),
        wingPaint,
      );
      // Right wing
      canvas.drawRect(
        Rect.fromLTWH(cx + 12, cy - 8 - wingFlap + bobY, 12, 8),
        wingPaint,
      );
    }
  }

  @override
  bool shouldRepaint(covariant PixelPetPainter oldDelegate) {
    return oldDelegate.frame != frame || oldDelegate.bodyScale != bodyScale;
  }
}
