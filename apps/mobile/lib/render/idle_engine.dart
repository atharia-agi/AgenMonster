// Flutter idle engine — drives bob/blink for mobile overlay.

import 'dart:async';
import 'dart:math';
import 'personality.dart';

class IdleEngine {
  PersonalityData personality;
  double bobOffset = 0;
  bool isBlinking = false;
  Timer? _timer;
  int _blinkAccum = 0;
  int _attentionAccum = 0;

  Function(String)? onAttentionGrab;

  IdleEngine({required this.stage, this.onAttentionGrab}) : personality = getPersonality(stage);

  String stage;

  void start() {
    _timer = Timer.periodic(const Duration(milliseconds: 16), (_) => _tick());
  }

  void stop() {
    _timer?.cancel();
    _timer = null;
  }

  void updateStage(String newStage) {
    stage = newStage;
    personality = getPersonality(newStage);
    _blinkAccum = 0;
    _attentionAccum = 0;
  }

  void _tick() {
    final now = DateTime.now().millisecondsSinceEpoch;
    final t = now / 1000.0;
    final rng = Random();

    // Bob
    bobOffset = sin(t / (personality.idleBobSpeedMs / 1000)) * personality.idleBobAmplitude;

    // Blink
    _blinkAccum += 16;
    if (!isBlinking && _blinkAccum > personality.blinkRateMinMs + rng.nextInt(personality.blinkRateMaxMs - personality.blinkRateMinMs)) {
      isBlinking = true;
      _blinkAccum = 0;
    }
    if (isBlinking && _blinkAccum > 150) {
      isBlinking = false;
      _blinkAccum = 0;
    }

    // Attention grab
    _attentionAccum += 16;
    if (_attentionAccum > 5000) {
      _attentionAccum = 0;
      if (rng.nextDouble() < personality.attentionGrabChance) {
        final phrase = personality.attentionPhrases[rng.nextInt(personality.attentionPhrases.length)];
        onAttentionGrab?.call(phrase);
      }
    }
  }
}
