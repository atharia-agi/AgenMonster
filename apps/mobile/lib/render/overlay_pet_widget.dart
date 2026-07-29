import 'package:flutter/material.dart';
import 'dart:async';
import 'dart:math' as math;

/// FloatingWindowAnimatorIdle — the live animated pet rendered inside the
/// Android floating overlay window (TYPE_APPLICATION_OVERLAY) using a
/// `flutter_overlay_window` entry point.
class OverlayPetWidget extends StatefulWidget {
  final String stage; // egg | hatchling | baby | child | teen | adult | mega
  final Offset? anchorInScreen; // optional drift target
  const OverlayPetWidget({super.key, this.stage = 'egg', this.anchorInScreen});

  @override
  State<OverlayPetWidget> createState() => _OverlayPetWidgetState();
}

class _OverlayPetWidgetState extends State<OverlayPetWidget> with SingleTickerProviderStateMixin {
  late final AnimationController _ctrl;
  double _t = 0;
  String? _speech;
  Timer? _speechTimer;

  @override
  void initState() {
    super.initState();
    _ctrl = AnimationController(vsync: this, duration: const Duration(seconds: 30))..repeat();
    _ctrl.addListener(() => setState(() => _t = _ctrl.value));
  }

  @override
  void dispose() { _speechTimer?.cancel(); _ctrl.dispose(); super.dispose(); }

  void say(String text) {
    setState(() => _speech = text);
    _speechTimer?.cancel();
    _speechTimer = Timer(const Duration(seconds: 6), () => setState(() => _speech = null));
  }

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      behavior: HitTestBehavior.opaque,
      onPanStart: (_) => FlutterOverlayBridge.say(speakNow: false),
      onTap: () => FlutterOverlayBridge.say(speakNow: true),
      child: SizedBox(
        width: 200, height: 200,
        child: Stack(
          alignment: Alignment.bottomCenter,
          children: [
            if (_speech != null)
              Positioned(
                top: 0,
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                  decoration: BoxDecoration(
                    color: const Color(0xCC0F1116),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Text(_speech!, style: const TextStyle(color: Colors.white, fontSize: 13), textDirection: TextDirection.ltr),
                ),
              ),
            CustomPaint(
              size: const Size(200, 200),
              painter: _PetPainter(stage: widget.stage, t: _t),
            ),
          ],
        ),
      ),
    );
  }
}

/// Shims the in-app ↔ overlay bridge. In real impl, Rust runtime sends
/// speech text via flutter RUST bridge.
class FlutterOverlayBridge {
  static void say({required bool speakNow}) {
    // Native channel: no-op for now.
  }
}

class _PetPainter extends CustomPainter {
  final String stage;
  final double t; // 0..1 loop
  _PetPainter({required this.stage, required this.t});

  @override
  void paint(Canvas canvas, Size size) {
    final cx = size.width / 2;
    final cy = size.height / 2 + math.sin(t * math.pi * 2 * 0.5) * 3;
    final breathe = 1.0 + math.sin(t * math.pi * 2 * 1.0) * 0.04;

    final palette = _palette(stage);

    // glow
    final glow = Paint()
      ..color = palette.glow.withOpacity(0.35)
      ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 12);
    canvas.drawCircle(Offset(cx, cy), 60 * breathe + 8, glow);

    // body
    final bodyPaint = Paint()..color = palette.body;
    canvas.drawCircle(Offset(cx, cy), 60 * breathe, bodyPaint);

    // stage accents
    switch (stage) {
      case 'hatchling':
        canvas.drawCircle(Offset(cx + 50, cy + 30), 22, Paint()..color = palette.accent);
        break;
      case 'baby':
      case 'child':
        canvas.drawCircle(Offset(cx - 50, cy + 30), 22, Paint()..color = palette.accent);
        canvas.drawCircle(Offset(cx + 50, cy + 30), 22, Paint()..color = palette.accent);
        break;
      case 'teen':
      case 'adult':
      case 'mega':
        // halo ring
        final ringPaint = Paint()
          ..color = palette.accent
          ..style = PaintingStyle.stroke
          ..strokeWidth = 2;
        canvas.drawCircle(Offset(cx, cy), 70 * breathe, ringPaint);
        canvas.drawCircle(Offset(cx, cy), 78 * breathe, ringPaint);
        break;
      default: // egg
        break;
    }

    // eyes
    final eyePaint = Paint()..color = palette.eye;
    final pupilPaint = Paint()..color = Colors.black;
    final eyeOffset = math.sin(t * math.pi * 2 * 0.7) * 1.5;
    canvas.drawCircle(Offset(cx - 18 + eyeOffset, cy - 8), 6, eyePaint);
    canvas.drawCircle(Offset(cx + 18 + eyeOffset, cy - 8), 6, eyePaint);
    canvas.drawCircle(Offset(cx - 17 + eyeOffset, cy - 8), 2.5, pupilPaint);
    canvas.drawCircle(Offset(cx + 19 + eyeOffset, cy - 8), 2.5, pupilPaint);

    // mouth (mood-based emoji will fire as speech bubbles)
  }

  @override
  bool shouldRepaint(covariant _PetPainter old) => old.t != t || old.stage != stage;
}

class _Pal { final Color body; final Color eye; final Color accent; final Color glow;
  const _Pal(this.body, this.eye, this.accent, this.glow);
}

_Pal _palette(String stage) {
  switch (stage) {
    case 'hatchling': return const _Pal(Color(0xFFA3E635), Colors.white, Color(0xFF65A30D), Color(0xFFAACC44));
    case 'baby':      return const _Pal(Color(0xFF60A5FA), Colors.white, Color(0xFF1D4ED8), Color(0xFF60A5FA));
    case 'child':     return const _Pal(Color(0xFFA78BFA), Colors.white, Color(0xFF7C3AED), Color(0xFFA78BFA));
    case 'teen':      return const _Pal(Color(0xFFF472B6), Colors.white, Color(0xFFDB2777), Color(0xFFF472B6));
    case 'adult':     return const _Pal(Color(0xFFFACC15), Color(0xFF7C2D12), Color(0xFFB45309), Color(0xFFFACC15));
    case 'mega':      return const _Pal(Color(0xFFFEF08A), Color(0xFFFACC15), Color(0xFFDC2626), Color(0xFFFEF08A));
    default:          return const _Pal(Color(0xFFF5F5DC), Colors.white, Color(0xFFFFD27D), Color(0xFFFCFC8C));
  }
}
