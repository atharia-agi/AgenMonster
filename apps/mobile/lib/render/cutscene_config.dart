// Flutter cutscene config — transition data for evolution events.

class CutsceneConfig {
  final String fromStage;
  final String toStage;
  final int durationFrames;
  final String flashText;
  final int particleCount;

  const CutsceneConfig({
    required this.fromStage,
    required this.toStage,
    required this.durationFrames,
    required this.flashText,
    required this.particleCount,
  });

  static const Map<String, CutsceneConfig> transitions = {
    'egg→hatchling': CutsceneConfig(fromStage: 'egg', toStage: 'hatchling', durationFrames: 32, flashText: 'HATCHED!', particleCount: 40),
    'hatchling→baby': CutsceneConfig(fromStage: 'hatchling', toStage: 'baby', durationFrames: 40, flashText: 'GROWING!', particleCount: 50),
    'baby→child': CutsceneConfig(fromStage: 'baby', toStage: 'child', durationFrames: 40, flashText: 'LEARNING!', particleCount: 50),
    'child→teen': CutsceneConfig(fromStage: 'child', toStage: 'teen', durationFrames: 48, flashText: 'POWER UP!', particleCount: 60),
    'teen→adult': CutsceneConfig(fromStage: 'teen', toStage: 'adult', durationFrames: 56, flashText: 'EVOLVED!', particleCount: 70),
    'adult→mega': CutsceneConfig(fromStage: 'adult', toStage: 'mega', durationFrames: 64, flashText: 'MEGA EVOLUTION!', particleCount: 80),
  };

  static CutsceneConfig? getTransition(String from, String to) {
    return transitions['$from→$to'];
  }
}
