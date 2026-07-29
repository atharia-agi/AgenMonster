// Flutter HUD widget — compact stat display.

import 'package:flutter/material.dart';

class HudWidget extends StatelessWidget {
  final String stage;
  final int xp;
  final int xpToNext;
  final int energy;
  final int maxEnergy;
  final int skillsCount;

  const HudWidget({
    super.key,
    required this.stage,
    required this.xp,
    required this.xpToNext,
    required this.energy,
    required this.maxEnergy,
    required this.skillsCount,
  });

  @override
  Widget build(BuildContext context) {
    final xpPct = xpToNext > 0 ? (xp / xpToNext).clamp(0.0, 1.0) : 0.0;
    final engPct = maxEnergy > 0 ? (energy / maxEnergy).clamp(0.0, 1.0) : 0.0;

    return Container(
      padding: const EdgeInsets.all(8),
      decoration: BoxDecoration(
        color: const Color(0xFF1a1a2e),
        border: Border.all(color: const Color(0xFF444466), width: 1),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          // Stage
          Text(
            stage.toUpperCase(),
            style: const TextStyle(
              fontFamily: 'PressStart2P',
              fontSize: 10,
              color: Color(0xFFd2a8ff),
            ),
          ),
          const SizedBox(height: 8),
          // XP bar
          _StatBar(label: 'XP', value: xp, max: xpToNext, pct: xpPct, color: const Color(0xFF7ee787)),
          const SizedBox(height: 4),
          // Energy bar
          _StatBar(label: 'ENG', value: energy, max: maxEnergy, pct: engPct, color: const Color(0xFF58a6ff)),
          const SizedBox(height: 4),
          // Skills count
          Text(
            'Skills: $skillsCount',
            style: const TextStyle(
              fontFamily: 'PressStart2P',
              fontSize: 6,
              color: Color(0xFF484f58),
            ),
          ),
        ],
      ),
    );
  }
}

class _StatBar extends StatelessWidget {
  final String label;
  final int value;
  final int max;
  final double pct;
  final Color color;

  const _StatBar({
    required this.label,
    required this.value,
    required this.max,
    required this.pct,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        SizedBox(
          width: 28,
          child: Text(
            label,
            style: TextStyle(
              fontFamily: 'PressStart2P',
              fontSize: 6,
              color: color,
            ),
          ),
        ),
        Expanded(
          child: Container(
            height: 8,
            color: const Color(0xFF2a2a3a),
            child: FractionallySizedBox(
              alignment: Alignment.centerLeft,
              widthFactor: pct,
              child: Container(color: color),
            ),
          ),
        ),
        const SizedBox(width: 4),
        SizedBox(
          width: 36,
          child: Text(
            '$value/$max',
            style: const TextStyle(
              fontFamily: 'PressStart2P',
              fontSize: 5,
              color: Color(0xFFe6edf3),
            ),
          ),
        ),
      ],
    );
  }
}
