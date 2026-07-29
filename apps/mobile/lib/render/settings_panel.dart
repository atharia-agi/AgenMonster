// Flutter settings panel — configuration for mobile.

import 'package:flutter/material.dart';

class SettingsPanel extends StatefulWidget {
  final bool alwaysOnTop;
  final double opacity;
  final double scale;
  final int energyMax;
  final int regenPerHour;
  final String llmProvider;
  final ValueChanged<bool> onAlwaysOnTopChanged;
  final ValueChanged<double> onOpacityChanged;
  final ValueChanged<double> onScaleChanged;

  const SettingsPanel({
    super.key,
    required this.alwaysOnTop,
    required this.opacity,
    required this.scale,
    required this.energyMax,
    required this.regenPerHour,
    required this.llmProvider,
    required this.onAlwaysOnTopChanged,
    required this.onOpacityChanged,
    required this.onScaleChanged,
  });

  @override
  State<SettingsPanel> createState() => _SettingsPanelState();
}

class _SettingsPanelState extends State<SettingsPanel> {
  bool _showPanel = false;

  @override
  Widget build(BuildContext context) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        IconButton(
          icon: const Icon(Icons.settings, color: Color(0xFFe6edf3)),
          onPressed: () => setState(() => _showPanel = !_showPanel),
        ),
        if (_showPanel)
          Container(
            width: 240,
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: const Color(0xFF1a1a2e),
              border: Border.all(color: const Color(0xFF444466)),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('DISPLAY', style: TextStyle(fontFamily: 'PressStart2P', fontSize: 6, color: Color(0xFF58a6ff))),
                const SizedBox(height: 8),
                Row(
                  children: [
                    const Text('Opacity', style: TextStyle(fontFamily: 'PressStart2P', fontSize: 6, color: Color(0xFFe6edf3))),
                    Expanded(
                      child: Slider(
                        value: widget.opacity,
                        min: 0.1, max: 1.0,
                        onChanged: widget.onOpacityChanged,
                        activeColor: const Color(0xFF58a6ff),
                      ),
                    ),
                  ],
                ),
                Row(
                  children: [
                    const Text('Scale', style: TextStyle(fontFamily: 'PressStart2P', fontSize: 6, color: Color(0xFFe6edf3))),
                    Expanded(
                      child: Slider(
                        value: widget.scale,
                        min: 0.5, max: 2.0,
                        onChanged: widget.onScaleChanged,
                        activeColor: const Color(0xFF58a6ff),
                      ),
                    ),
                  ],
                ),
                SwitchListTile(
                  title: const Text('Always on Top', style: TextStyle(fontFamily: 'PressStart2P', fontSize: 6, color: Color(0xFFe6edf3))),
                  value: widget.alwaysOnTop,
                  onChanged: widget.onAlwaysOnTopChanged,
                  activeColor: const Color(0xFF7ee787),
                  contentPadding: EdgeInsets.zero,
                ),
              ],
            ),
          ),
      ],
    );
  }
}
