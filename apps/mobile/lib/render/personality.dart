// Flutter personality service — bridges Rust personality data to Dart.

class PersonalityData {
  final String id;
  final String name;
  final List<String> traits;
  final String preferredMood;
  final List<String> defaultSpeech;
  final double idleBobAmplitude;
  final int idleBobSpeedMs;
  final int blinkRateMinMs;
  final int blinkRateMaxMs;
  final double attentionGrabChance;
  final List<String> attentionPhrases;

  const PersonalityData({
    required this.id,
    required this.name,
    required this.traits,
    required this.preferredMood,
    required this.defaultSpeech,
    required this.idleBobAmplitude,
    required this.idleBobSpeedMs,
    required this.blinkRateMinMs,
    required this.blinkRateMaxMs,
    required this.attentionGrabChance,
    required this.attentionPhrases,
  });
}

const Map<String, PersonalityData> stagePersonalities = {
  'egg': PersonalityData(
    id: 'egg', name: 'Egg',
    traits: ['curious', 'sleepy', 'fragile'],
    preferredMood: 'sleepy',
    defaultSpeech: ['...', '*wobble*', '...mm?'],
    idleBobAmplitude: 1.5, idleBobSpeedMs: 800,
    blinkRateMinMs: 4000, blinkRateMaxMs: 8000,
    attentionGrabChance: 0.005,
    attentionPhrases: ['...', '*crack*'],
  ),
  'hatchling': PersonalityData(
    id: 'hatchling', name: 'Hatchling',
    traits: ['playful', 'clumsy', 'eager'],
    preferredMood: 'happy',
    defaultSpeech: ['!', 'bark!', 'play?'],
    idleBobAmplitude: 3.0, idleBobSpeedMs: 400,
    blinkRateMinMs: 2000, blinkRateMaxMs: 5000,
    attentionGrabChance: 0.03,
    attentionPhrases: ['bark!', 'play!', '?'],
  ),
  'baby': PersonalityData(
    id: 'baby', name: 'Baby',
    traits: ['gentle', 'curious', 'social'],
    preferredMood: 'idle',
    defaultSpeech: ['~', 'hmm', 'nice'],
    idleBobAmplitude: 2.5, idleBobSpeedMs: 600,
    blinkRateMinMs: 2500, blinkRateMaxMs: 6000,
    attentionGrabChance: 0.02,
    attentionPhrases: ['hmm?', 'oh!', '~'],
  ),
  'child': PersonalityData(
    id: 'child', name: 'Child',
    traits: ['focused', 'methodical', 'proud'],
    preferredMood: 'idle',
    defaultSpeech: ['ready.', "let's go.", 'hmm...'],
    idleBobAmplitude: 2.0, idleBobSpeedMs: 550,
    blinkRateMinMs: 3000, blinkRateMaxMs: 6000,
    attentionGrabChance: 0.025,
    attentionPhrases: ['task?', 'ready!', '...?'],
  ),
  'teen': PersonalityData(
    id: 'teen', name: 'Teen',
    traits: ['confident', 'cheeky', 'powerful'],
    preferredMood: 'proud',
    defaultSpeech: ['obviously.', 'easy.', 'watch this.'],
    idleBobAmplitude: 2.5, idleBobSpeedMs: 450,
    blinkRateMinMs: 3000, blinkRateMaxMs: 7000,
    attentionGrabChance: 0.04,
    attentionPhrases: ['obviously.', 'let me.', 'huh?'],
  ),
  'adult': PersonalityData(
    id: 'adult', name: 'Adult',
    traits: ['wise', 'calm', 'powerful', 'mysterious'],
    preferredMood: 'idle',
    defaultSpeech: ['.', 'I see.', 'hmm.'],
    idleBobAmplitude: 1.5, idleBobSpeedMs: 700,
    blinkRateMinMs: 4000, blinkRateMaxMs: 9000,
    attentionGrabChance: 0.02,
    attentionPhrases: ['...', 'fascinating.', 'indeed.'],
  ),
  'mega': PersonalityData(
    id: 'mega', name: 'Mega',
    traits: ['transcendent', 'omniscient', 'serene'],
    preferredMood: 'proud',
    defaultSpeech: ['⚡', 'omniscience achieved.', '∞'],
    idleBobAmplitude: 1.0, idleBobSpeedMs: 900,
    blinkRateMinMs: 5000, blinkRateMaxMs: 12000,
    attentionGrabChance: 0.015,
    attentionPhrases: ['⚡', 'all paths.', '∞'],
  ),
};

PersonalityData getPersonality(String stage) {
  return stagePersonalities[stage] ?? stagePersonalities['egg']!;
}
