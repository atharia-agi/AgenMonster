// Flutter background painter — stage-specific animated backgrounds.

import 'dart:math';
import 'package:flutter/material.dart';

class BackgroundPainter extends CustomPainter {
  final String pattern;
  final double time;

  BackgroundPainter({required this.pattern, required this.time});

  @override
  void paint(Canvas canvas, Size size) {
    // Base
    canvas.drawRect(Rect.fromLTWH(0, 0, size.width, size.height),
      Paint()..color = const Color(0xFF0d1117));

    switch (pattern) {
      case 'dots': _paintDots(canvas, size); break;
      case 'waves': _paintWaves(canvas, size); break;
      case 'grass': _paintGrass(canvas, size); break;
      case 'mist': _paintMist(canvas, size); break;
      case 'stars': _paintStars(canvas, size); break;
      case 'hearts': _paintHearts(canvas, size); break;
      case 'sun-rays': _paintSunRays(canvas, size); break;
      case 'aurora': _paintAurora(canvas, size); break;
    }
  }

  void _paintDots(Canvas canvas, Size size) {
    final paint = Paint()..color = const Color(0xFF484f58);
    for (double y = 0; y < size.height; y += 12) {
      for (double x = 0; x < size.width; x += 12) {
        final pulse = (sin(time + x * 0.01 + y * 0.01) * 0.5 + 0.5);
        if (pulse > 0.7) {
          canvas.drawRect(Rect.fromLTWH(x, y, 2, 2), paint);
        }
      }
    }
  }

  void _paintWaves(Canvas canvas, Size size) {
    for (int row = 0; row < 5; row++) {
      final paint = Paint()
        ..color = const Color(0xFF58a6ff).withOpacity(0.3 - row * 0.05)
        ..style = PaintingStyle.stroke
        ..strokeWidth = 1;
      final path = Path();
      for (double x = 0; x < size.width; x += 2) {
        final y = size.height * 0.3 + row * 16 + sin(time * 2 + x * 0.05 + row) * 4;
        x == 0 ? path.moveTo(x, y) : path.lineTo(x, y);
      }
      canvas.drawPath(path, paint);
    }
  }

  void _paintGrass(Canvas canvas, Size size) {
    final paint = Paint()..color = const Color(0xFF7ee787);
    for (double x = 0; x < size.width; x += 6) {
      final h = 8 + sin(time + x * 0.1) * 2;
      canvas.drawRect(Rect.fromLTWH(x, size.height - h, 2, h), paint);
    }
  }

  void _paintMist(Canvas canvas, Size size) {
    final paint = Paint()..color = const Color(0xFF484f58).withOpacity(0.15);
    for (int i = 0; i < 8; i++) {
      final x = (time * 10 + i * 25) % (size.width + 40) - 20;
      final y = size.height * 0.6 + sin(time + i) * 8;
      canvas.drawRect(Rect.fromLTWH(x, y, 20, 4), paint);
    }
  }

  void _paintStars(Canvas canvas, Size size) {
    final rng = Random(42);
    for (int i = 0; i < 20; i++) {
      final sx = (i * 37 + 5) % size.width.toInt();
      final sy = (i * 23 + 7) % size.height.toInt();
      final bright = sin(time * 3 + i) > 0.5;
      final paint = Paint()..color = bright ? const Color(0xFFe6edf3) : const Color(0xFF484f58);
      canvas.drawRect(Rect.fromLTWH(sx.toDouble(), sy.toDouble(), 2, 2), paint);
    }
  }

  void _paintHearts(Canvas canvas, Size size) {
    final paint = Paint()..color = const Color(0xFFf92672).withOpacity(0.4);
    for (int i = 0; i < 6; i++) {
      final x = (time * 8 + i * 30) % (size.width + 20) - 10;
      final y = size.height * 0.4 + sin(time * 2 + i * 1.5) * 20;
      canvas.drawRect(Rect.fromLTWH(x, y, 4, 4), paint);
      canvas.drawRect(Rect.fromLTWH(x + 4, y, 4, 4), paint);
      canvas.drawRect(Rect.fromLTWH(x + 8, y, 4, 4), paint);
      canvas.drawRect(Rect.fromLTWH(x, y + 4, 12, 4), paint);
      canvas.drawRect(Rect.fromLTWH(x + 2, y + 8, 8, 4), paint);
      canvas.drawRect(Rect.fromLTWH(x + 4, y + 12, 4, 4), paint);
    }
  }

  void _paintSunRays(Canvas canvas, Size size) {
    final cx = size.width / 2;
    final cy = size.height * 0.3;
    final paint = Paint()..color = const Color(0xFFffd700).withOpacity(0.3);
    for (int i = 0; i < 8; i++) {
      final angle = (i / 8) * 2 * pi + time * 0.5;
      final len = 30 + sin(time * 2 + i) * 10;
      final ex = cx + cos(angle) * len;
      final ey = cy + sin(angle) * len;
      canvas.drawRect(Rect.fromLTWH(ex - 1, ey - 1, 3, 3), paint);
    }
  }

  void _paintAurora(Canvas canvas, Size size) {
    final colors = [
      const Color(0xFF7ee787),
      const Color(0xFF58a6ff),
      const Color(0xFFae81ff),
      const Color(0xFFf92672),
    ];
    for (int i = 0; i < 4; i++) {
      final paint = Paint()
        ..color = colors[i].withOpacity(0.4)
        ..style = PaintingStyle.stroke
        ..strokeWidth = 2;
      final path = Path();
      for (double x = 0; x < size.width; x += 2) {
        final y = size.height * 0.2 + i * 12 + sin(time * 1.5 + x * 0.03 + i * 0.8) * 12;
        x == 0 ? path.moveTo(x, y) : path.lineTo(x, y);
      }
      canvas.drawPath(path, paint);
    }
  }

  @override
  bool shouldRepaint(covariant BackgroundPainter oldDelegate) => oldDelegate.time != time;
}
