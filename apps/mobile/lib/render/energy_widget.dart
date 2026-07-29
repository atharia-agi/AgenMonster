// Flutter energy widget — shows energy bar with regen.

import 'package:flutter/material.dart';
import 'personality.dart';

class EnergyWidget extends StatefulWidget {
  final int current;
  final int max;

  const EnergyWidget({super.key, required this.current, required this.max});

  @override
  State<EnergyWidget> createState() => _EnergyWidgetState();
}

class _EnergyWidgetState extends State<EnergyWidget> {
  @override
  Widget build(BuildContext context) {
    final pct = widget.max > 0 ? widget.current / widget.max : 0.0;
    final barColor = pct > 0.5 ? Colors.green : pct > 0.25 ? Colors.orange : Colors.red;

    return Container(
      width: 120,
      height: 12,
      decoration: BoxDecoration(
        color: const Color(0xFF2a2a3a),
        border: Border.all(color: const Color(0xFF444466), width: 1),
      ),
      child: Stack(
        children: [
          Positioned.fill(
            child: FractionallySizedBox(
              alignment: Alignment.centerLeft,
              widthFactor: pct.clamp(0.0, 1.0),
              child: Container(color: barColor),
            ),
          ),
          Center(
            child: Text(
              '${widget.current}/${widget.max}',
              style: const TextStyle(
                fontFamily: 'PressStart2P',
                fontSize: 6,
                color: Colors.white,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
