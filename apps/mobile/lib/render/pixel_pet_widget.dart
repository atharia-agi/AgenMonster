// Centered pixel pet CustomPainter — full Earthbound-grade 24x24
// silhouette drawn into Flutter's GPU pixel-by-pixel.

import 'package:flutter/material.dart';

import 'palette_data.dart';

const int _kMasterSize = 24;

class PixelPetPainter extends CustomPainter {
  final String stage;
  final double t; // 0..1 loop
  final int frame;
  final List<int> indices;
  final List<Color> palette;

  PixelPetPainter({
    required this.stage,
    required this.t,
    required this.frame,
    required this.indices,
    required this.palette,
  });

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()..isAntiAlias = false;
    final w = size.width;
    final h = size.height;
    final scale = (w / _kMasterSize).floor();
    final offsetX = (w - scale * _kMasterSize) / 2.0;
    final offsetY = (h - scale * _kMasterSize) / 2.0 + (1 * (1 - 1)); // 1-px bob

    // paper dither background
    paint.color = PaletteData.paperFace(stage);
    canvas.drawRect(Offset.zero & size, paint);
    for (int y = 0; y < _kMasterSize; y++) {
      for (int x = 0; x < _kMasterSize; x++) {
        final h = (x * 7 + y * 13) % 11;
        if (h == 0) {
          paint.color = PaletteData.paperDim(stage);
          canvas.drawRect(
            Rect.fromLTWH(offsetX + x * scale, offsetY + y * scale, scale.toDouble(), scale.toDouble()),
            paint,
          );
        }
      }
    }

    for (int y = 0; y < _kMasterSize; y++) {
      for (int x = 0; x < _kMasterSize; x++) {
        final idx = indices[y * _kMasterSize + x];
        if (idx == 0) continue;
        paint.color = palette[idx];
        canvas.drawRect(
          Rect.fromLTWH(offsetX + x * scale, offsetY + y * scale, scale.toDouble(), scale.toDouble()),
          paint,
        );
      }
    }
  }

  @override
  bool shouldRepaint(covariant PixelPetPainter old) =>
      old.t != t || old.frame != frame || old.stage != stage;
}

class PaletteData {
  static List<Color> palette(String stage) => _palettes[stage] ?? _palettes['hatchling']!;
  static List<int> bodyIndices() => _body;
  static Color paperFace(String stage) => Colors.white;
  static Color paperDim(String stage) => const Color(0x00ECEAAD);

  static const Map<String, List<Color>> _palettes = {
    'egg':         [Color(0x00000000), Color(0xFF1D1306), Color(0xFF6B3A17), Color(0xFFFFD270), Color(0xFFFFE2A8), Color(0xFFFFF8D6), Color(0xFFFDFDF3)],
    'hatchling':   [Color(0x00000000), Color(0xFF0A1B08), Color(0xFF1A3011), Color(0xFF4F8B2C), Color(0xFF88C457), Color(0xFFA0E07D), Color(0xFFFDFDF3)],
    'baby':        [Color(0x00000000), Color(0xFF0C1F3F), Color(0xFF214266), Color(0xFF4F9BD0), Color(0xFF86CCF2), Color(0xFFA8DEF4), Color(0xFFFDFDF3)],
    'child':       [Color(0x00000000), Color(0xFF1A0C40), Color(0xFF3A1F75), Color(0xFF965CCD), Color(0xFFC896E4), Color(0xFFD8B5F0), Color(0xFFFDFDF3)],
    'teen':        [Color(0x00000000), Color(0xFF510521), Color(0xFF8C0D2E), Color(0xFFF73E63), Color(0xFFFF7E95), Color(0xFFFFA9B8), Color(0xFFFDFDF3)],
    'adult':       [Color(0x00000000), Color(0xFF3B200A), Color(0xFF6E3F0E), Color(0xFFA56614), Color(0xFFF5C057), Color(0xFFFCD58D), Color(0xFFFDFDF3)],
    'mega':        [Color(0x00000000), Color(0xFF2D1736), Color(0xFF5B2C7A), Color(0xFF75B3FF), Color(0xFF9AFFC0), Color(0xFFFFE07D), Color(0xFFFDFDF3)],
  };
}

// Master silhouette indices (earthbound-style blob w/ ear fins + eyes).
const List<int> _body = _buildMasterBody();
List<int> _buildMasterBody() {
  final s = _kMasterSize;
  final body = List<int>.filled(s * s, 0);
  void put(int x, int y, int idx) {
    if (x >= 0 && x < s && y >= 0 && y < s) body[y * s + x] = idx;
  }
  final cx = s ~/ 2;
  final cy = s ~/ 2;
  final r = 10;
  for (int y = 0; y < s; y++) {
    for (int x = 0; x < s; x++) {
      final dx = x - cx;
      final dy = y - cy;
      final d = (dx * dx + dy * dy).toDouble();
      final sqrt = d <= 0 ? 0.0 : d;
      final dist = (sqrt).abs();
      // simple sqrt approx
      double a = dist;
      var x1 = a / 2.0;
      for (var i = 0; i < 6; i++) {
        x1 = (x1 + a / x1) / 2.0;
      }
      final idx = x1 <= r - 0.5 ? 3 : x1 <= r ? 1 : 0;
      if (idx != 0) put(x, y, idx);
    }
  }
  for (var i = 0; i < 3; i++) { put(cx - 4 + i, cy - r, 1); put(cx + 2 + i, cy - r, 1); }
  put(cx - 4, cy - 1, 6); put(cx - 3, cy - 1, 6);
  put(cx + 3, cy - 1, 6); put(cx + 4, cy - 1, 6);
  put(cx - 4, cy - 1, 1); put(cx - 3, cy - 1, 1);
  put(cx + 3, cy - 1, 1); put(cx + 4, cy - 1, 1);
  for (var off = 0; off < 3; off++) put(cx - 1 + off, cy + 2, 1);
  for (int y = 0; y < 3; y++) {
    for (final x in [-2, -1, 0, 1, 2]) put(cx + x, cy + 4 + y, 6);
  }
  put(cx + r, cy, 1); put(cx + r + 1, cy, 3);
  for (final x in [-r + 2, -r + 3, -r + 4, -r + 5, -r + 6]) put(cx + x, cy + r - 1, 2);
  for (final x in [-r + 2, -r + 3, -r + 4, -r + 5, -r + 6]) put(cx + x + 1, cy + r - 1, 2);
  return body;
}
