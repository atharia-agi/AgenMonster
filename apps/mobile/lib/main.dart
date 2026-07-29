// Flutter main.dart — app entry point.

import 'package:flutter/material.dart';
import 'render/pixel_pet_painter.dart';
import 'render/hud_widget.dart';
import 'render/stage_data.dart';
import 'render/personality.dart';

void main() {
  runApp(const AgenMonsterApp());
}

class AgenMonsterApp extends StatelessWidget {
  const AgenMonsterApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'AgenMonster',
      theme: ThemeData.dark().copyWith(
        scaffoldBackgroundColor: const Color(0xFF0d1117),
      ),
      home: const MonsterHome(),
    );
  }
}

class MonsterHome extends StatefulWidget {
  const MonsterHome({super.key});

  @override
  State<MonsterHome> createState() => _MonsterHomeState();
}

class _MonsterHomeState extends State<MonsterHome> with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  String _stage = 'egg';
  int _xp = 0;
  int _xpToNext = 100;
  int _energy = 1000;
  String _speech = '';
  bool _showSpeech = false;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 50),
    )..repeat();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  void _evolve() {
    final nextStages = ['egg', 'hatchling', 'baby', 'child', 'teen', 'adult', 'mega'];
    final idx = nextStages.indexOf(_stage);
    if (idx < nextStages.length - 1) {
      setState(() {
        _stage = nextStages[idx + 1];
        _xp = 0;
        _xpToNext *= 2;
      });
    }
  }

  void _addXp(int amount) {
    setState(() {
      _xp += amount;
      if (_xp >= _xpToNext) _evolve();
    });
  }

  void _showMessage(String msg) {
    setState(() {
      _speech = msg;
      _showSpeech = true;
    });
    Future.delayed(const Duration(seconds: 3), () {
      setState(() { _showSpeech = false; });
    });
  }

  @override
  Widget build(BuildContext context) {
    final personality = getPersonality(_stage);
    final stageData = getStageData(_stage);

    return Scaffold(
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            // HUD
            HudWidget(
              stage: _stage,
              xp: _xp,
              xpToNext: _xpToNext,
              energy: _energy,
              maxEnergy: 1000,
              skillsCount: 0,
            ),
            const SizedBox(height: 16),
            // Pet canvas
            SizedBox(
              width: 200,
              height: 200,
              child: AnimatedBuilder(
                animation: _controller,
                builder: (context, child) {
                  return CustomPaint(
                    painter: PixelPetPainter(
                      frame: (_controller.value * 60).toInt(),
                      palette: stageData.palette,
                      bodyScale: stageData.bodyScale,
                      hasWings: stageData.hasWings,
                    ),
                  );
                },
              ),
            ),
            const SizedBox(height: 16),
            // Speech
            if (_showSpeech)
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: const Color(0xFF1a1a2e),
                  border: Border.all(color: const Color(0xFF444466)),
                ),
                child: Text(
                  _speech,
                  style: const TextStyle(
                    fontFamily: 'PressStart2P',
                    fontSize: 10,
                    color: Color(0xFFe6edf3),
                  ),
                ),
              ),
            const SizedBox(height: 16),
            // Buttons
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                _ActionButton(label: '+XP', onTap: () => _addXp(20)),
                const SizedBox(width: 8),
                _ActionButton(label: 'SAY', onTap: () => _showMessage(personality.defaultSpeech.first)),
                const SizedBox(width: 8),
                _ActionButton(label: 'EVO', onTap: _evolve),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _ActionButton extends StatelessWidget {
  final String label;
  final VoidCallback onTap;

  const _ActionButton({required this.label, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        decoration: BoxDecoration(
          color: const Color(0xFF1a1a2e),
          border: Border.all(color: const Color(0xFF7ee787)),
        ),
        child: Text(
          label,
          style: const TextStyle(
            fontFamily: 'PressStart2P',
            fontSize: 8,
            color: Color(0xFF7ee787),
          ),
        ),
      ),
    );
  }
}
