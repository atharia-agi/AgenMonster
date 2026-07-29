// Flutter stage data — backgrounds, palettes, visual config for Dart.

class StageData {
  final String id;
  final String name;
  final List<int> palette;
  final String bgPattern;
  final double bodyScale;
  final bool hasWings;
  final bool hasCrown;

  const StageData({
    required this.id,
    required this.name,
    required this.palette,
    required this.bgPattern,
    required this.bodyScale,
    required this.hasWings,
    required this.hasCrown,
  });
}

const List<StageData> allStages = [
  StageData(
    id: 'egg', name: 'Egg',
    palette: [0xFF0d1117, 0xFFd2a8ff, 0xFF58a6ff, 0xFFe6edf3, 0xFF484f58, 0xFFf0e68c, 0xFFff6b6b],
    bgPattern: 'dots', bodyScale: 0.8, hasWings: false, hasCrown: false,
  ),
  StageData(
    id: 'hatchling', name: 'Hatchling',
    palette: [0xFF0d1117, 0xFF7ee787, 0xFF58a6ff, 0xFFe6edf3, 0xFF484f58, 0xFFffd700, 0xFFFF6B6B],
    bgPattern: 'grass', bodyScale: 1.0, hasWings: false, hasCrown: false,
  ),
  StageData(
    id: 'baby', name: 'Baby',
    palette: [0xFF0d1117, 0xFFff9a9e, 0xFFa18cd1, 0xFFe6edf3, 0xFF484f58, 0xFFfad0c4, 0xFFFF6B6B],
    bgPattern: 'waves', bodyScale: 1.0, hasWings: true, hasCrown: false,
  ),
  StageData(
    id: 'child', name: 'Child',
    palette: [0xFF0d1117, 0xFF66d9ef, 0xFFa6e22e, 0xFFe6edf3, 0xFF484f58, 0xFFe6db74, 0xFFFF6B6B],
    bgPattern: 'mist', bodyScale: 1.1, hasWings: true, hasCrown: false,
  ),
  StageData(
    id: 'teen', name: 'Teen',
    palette: [0xFF0d1117, 0xFFae81ff, 0xFFf92672, 0xFFe6edf3, 0xFF484f58, 0xFFa6e22e, 0xFFFF6B6B],
    bgPattern: 'hearts', bodyScale: 1.2, hasWings: true, hasCrown: false,
  ),
  StageData(
    id: 'adult', name: 'Adult',
    palette: [0xFF0d1117, 0xFFe6db74, 0xFF66d9ef, 0xFFe6edf3, 0xFF484f58, 0xFFfd971f, 0xFFFF6B6B],
    bgPattern: 'sun-rays', bodyScale: 1.3, hasWings: true, hasCrown: false,
  ),
  StageData(
    id: 'mega', name: 'Mega',
    palette: [0xFF0d1117, 0xFFffd700, 0xFF00ffff, 0xFFe6edf3, 0xFF484f58, 0xFFff6b6b, 0xFFFF6B6B],
    bgPattern: 'aurora', bodyScale: 1.5, hasWings: true, hasCrown: true,
  ),
];

StageData getStageData(String id) {
  return allStages.firstWhere((s) => s.id == id, orElse: () => allStages[0]);
}
