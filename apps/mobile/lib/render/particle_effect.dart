// Flutter particle effect — sparkle/burst for evolution.

import 'dart:math';
import 'package:flutter/material.dart';

class ParticleEffect extends StatefulWidget {
  final bool active;
  final int count;
  final List<Color> colors;

  const ParticleEffect({
    super.key,
    this.active = false,
    this.count = 30,
    this.colors = const [
      Color(0xFFd2a8ff),
      Color(0xFF58a6ff),
      Color(0xFF7ee787),
      Color(0xFFf0e68c),
      Color(0xFFFF6B6B),
    ],
  });

  @override
  State<ParticleEffect> createState() => _ParticleEffectState();
}

class _Particle {
  double x, y, vx, vy, life, size;
  Color color;
  _Particle({required this.x, required this.y, required this.vx, required this.vy,
    required this.life, required this.size, required this.color});
}

class _ParticleEffectState extends State<ParticleEffect> {
  List<_Particle> _particles = [];
  final _rng = Random();

  @override
  void didUpdateWidget(ParticleEffect oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.active && !oldWidget.active) {
      _spawn();
    } else if (!widget.active) {
      setState(() { _particles = []; });
    }
  }

  void _spawn() {
    _particles = List.generate(widget.count, (_) {
      final angle = _rng.nextDouble() * 2 * pi;
      final speed = 1 + _rng.nextDouble() * 4;
      return _Particle(
        x: 100, y: 100,
        vx: cos(angle) * speed,
        vy: sin(angle) * speed - 2,
        life: 1.0,
        size: 2 + _rng.nextDouble() * 3,
        color: widget.colors[_rng.nextInt(widget.colors.length)],
      );
    });
  }

  @override
  Widget build(BuildContext context) {
    if (!widget.active || _particles.isEmpty) return const SizedBox.shrink();

    return CustomPaint(
      size: const Size(200, 200),
      painter: _ParticlePainter(particles: _particles),
    );
  }
}

class _ParticlePainter extends CustomPainter {
  final List<_Particle> particles;

  _ParticlePainter({required this.particles});

  @override
  void paint(Canvas canvas, Size size) {
    for (final p in particles) {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.1;
      p.life -= 0.02;

      if (p.life > 0) {
        final paint = Paint()
          ..color = p.color.withOpacity(p.life.clamp(0.0, 1.0));
        canvas.drawRect(
          Rect.fromLTWH(p.x, p.y, p.size, p.size),
          paint,
        );
      }
    }
  }

  @override
  bool shouldRepaint(covariant _ParticlePainter oldDelegate) => true;
}
