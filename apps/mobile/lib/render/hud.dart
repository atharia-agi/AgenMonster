// HUD panel + speech bubble pixel-art widgets.

import 'package:flutter/material.dart';

class HudPanel extends StatelessWidget {
  const HudPanel({
    super.key,
    required this.child,
    this.bg = const Color(0xFFFDFDF3),
    this.borderColor = const Color(0xFF0C0C0C),
    this.borderWidth = 1,
  });

  final Widget child;
  final Color bg;
  final Color borderColor;
  final double borderWidth;

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: bg,
        border: Border.all(color: borderColor, width: borderWidth),
      ),
      child: child,
    );
  }
}

class SpeechBubble extends StatelessWidget {
  const SpeechBubble({super.key, required this.text});

  final String text;

  @override
  Widget build(BuildContext context) {
    return HudPanel(
      borderWidth: 1,
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
        child: Text(
          text,
          style: const TextStyle(
            fontFamily: 'PressStart2P',
            fontSize: 8,
            color: Color(0xFF0C0C0C),
            height: 1.4,
          ),
        ),
      ),
    );
  }
}

class HudButton extends StatelessWidget {
  const HudButton({super.key, required this.label, required this.onPressed});
  final String label;
  final VoidCallback onPressed;

  @override
  Widget build(BuildContext context) {
    return HudPanel(
      bg: const Color(0xFFBCE0FF),
      child: InkWell(
        onTap: onPressed,
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
          child: Text(
            label,
            style: const TextStyle(
              fontFamily: 'PressStart2P',
              fontSize: 10,
              color: Color(0xFF0C0C0C),
            ),
          ),
        ),
      ),
    );
  }
}
