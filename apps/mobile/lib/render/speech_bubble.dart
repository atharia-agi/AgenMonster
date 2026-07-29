// Flutter speech bubble — pixel-art styled speech.

import 'dart:async';
import 'package:flutter/material.dart';

class SpeechBubble extends StatefulWidget {
  final String text;
  final bool visible;
  final int speedMs;

  const SpeechBubble({
    super.key,
    required this.text,
    this.visible = false,
    this.speedMs = 50,
  });

  @override
  State<SpeechBubble> createState() => _SpeechBubbleState();
}

class _SpeechBubbleState extends State<SpeechBubble> {
  String _displayedText = '';
  int _charIndex = 0;
  Timer? _timer;

  @override
  void didUpdateWidget(SpeechBubble oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.visible && widget.text != oldWidget.text) {
      _startTyping();
    } else if (!widget.visible) {
      _stopTyping();
      setState(() { _displayedText = ''; _charIndex = 0; });
    }
  }

  void _startTyping() {
    _stopTyping();
    setState(() { _displayedText = ''; _charIndex = 0; });
    _timer = Timer.periodic(Duration(milliseconds: widget.speedMs), (timer) {
      if (_charIndex < widget.text.length) {
        setState(() {
          _displayedText += widget.text[_charIndex];
          _charIndex++;
        });
      } else {
        timer.cancel();
      }
    });
  }

  void _stopTyping() {
    _timer?.cancel();
    _timer = null;
  }

  @override
  void dispose() {
    _stopTyping();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (!widget.visible || _displayedText.isEmpty) return const SizedBox.shrink();

    return Container(
      padding: const EdgeInsets.all(8),
      decoration: BoxDecoration(
        color: const Color(0xFF1a1a2e),
        border: Border.all(color: const Color(0xFF444466)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(
            _displayedText,
            style: const TextStyle(
              fontFamily: 'PressStart2P',
              fontSize: 10,
              color: Color(0xFFe6edf3),
            ),
          ),
          Text(
            _charIndex < widget.text.length ? '▌' : '',
            style: const TextStyle(
              fontFamily: 'PressStart2P',
              fontSize: 10,
              color: Color(0xFFe6edf3),
            ),
          ),
        ],
      ),
    );
  }
}
