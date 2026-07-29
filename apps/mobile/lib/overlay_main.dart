// Flutter main.dart for overlay service.

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'render/pixel_pet_painter.dart';
import 'render/stage_data.dart';
import 'render/speech_bubble.dart';
import 'render/particle_effect.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  SystemChrome.setEnabledSystemUIMode(SystemUiMode.immersiveSticky);
  runApp(const OverlayApp());
}

class OverlayApp extends StatelessWidget {
  const OverlayApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'AgenMonster Overlay',
      theme: ThemeData.dark(),
      home: const OverlayScreen(),
    );
  }
}

class OverlayScreen extends StatefulWidget {
  const OverlayScreen({super.key});

  @override
  State<OverlayScreen> createState() => _OverlayScreenState();
}

class _OverlayScreenState extends State<OverlayScreen> with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  String _stage = 'egg';
  bool _showSpeech = false;
  String _speechText = '';
  bool _showParticles = false;

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

  @override
  Widget build(BuildContext context) {
    final stageData = getStageData(_stage);

    return Scaffold(
      backgroundColor: Colors.transparent,
      body: GestureDetector(
        onPanUpdate: (details) {
          // Move overlay window
        },
        child: Stack(
          alignment: Alignment.center,
          children: [
            // Background
            CustomPaint(
              size: MediaQuery.of(context).size,
              painter: _TranslucentBackground(),
            ),
            // Pet
            SizedBox(
              width: 120,
              height: 120,
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
            // Speech
            Positioned(
              top: MediaQuery.of(context).size.height * 0.3,
              child: SpeechBubble(
                text: _speechText,
                visible: _showSpeech,
              ),
            ),
            // Particles
            ParticleEffect(
              active: _showParticles,
              colors: stageData.palette.map((c) => Color(c)).toList(),
            ),
          ],
        ),
      ),
    );
  }
}

class _TranslucentBackground extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    canvas.drawRect(
      Rect.fromLTWH(0, 0, size.width, size.height),
      Paint()..color = const Color(0x400d1117),
    );
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
