// Palette data for Flutter — stage-specific color palettes.

class PaletteData {
  static const Map<String, List<int>> palettes = {
    'egg': [0xFFF5F0E6, 0xFFDCD2C3, 0xFFF0E8D8, 0xFFC8BFA8, 0xFFB8A898, 0xFFA89888, 0xFF988878],
    'hatchling': [0xFF90C878, 0xFF70A858, 0xFFB0D898, 0xFF508838, 0xFF609848, 0xFF408028, 0xFF307018],
    'baby': [0xFF88CCF0, 0xFF60A8D8, 0xFFA0D8F8, 0xFF4888C0, 0xFF3878B0, 0xFF2868A0, 0xFF185890],
    'child': [0xFFD8C8F0, 0xFFB8A8D8, 0xFFE8D8F8, 0xFF9888C0, 0xFF8878B0, 0xFF7868A0, 0xFF685890],
    'teen': [0xFFFF8090, 0xFFE06070, 0xFFFFA0B0, 0xFFC04050, 0xFFB03040, 0xFFA02030, 0xFF901020],
    'adult': [0xFF8070C0, 0xFF6050A0, 0xFFA090E0, 0xFF403080, 0xFF302070, 0xFF201060, 0xFF100050],
    'mega': [0xFFFFC860, 0xFFFFB840, 0xFFFFD880, 0xFFFFA820, 0xFFFF9810, 0xFFFF8800, 0xFFFF7800],
  };

  static List<int> getPalette(String stage) => palettes[stage] ?? palettes['egg']!;

  static int getBodyColor(String stage) => getPalette(stage)[1];
  static int getBellyColor(String stage) => getPalette(stage)[2];
  static int getOutlineColor(String stage) => getPalette(stage)[0];
  static int getAccentColor(String stage) => getPalette(stage)[4];

  static Color intToColor(int hex) => Color(hex);
}
