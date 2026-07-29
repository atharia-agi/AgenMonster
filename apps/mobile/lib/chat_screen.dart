import 'package:flutter/material.dart';

class ChatScreen extends StatefulWidget {
  const ChatScreen({super.key});
  @override
  State<ChatScreen> createState() => _ChatScreenState();
}

class _ChatScreenState extends State<ChatScreen> {
  final _messages = <_Msg>[
    const _Msg('I am AgenMonster 🐉. How can I help?', who: 'pet'),
  ];
  final _ctrl = TextEditingController();

  void _send() async {
    if (_ctrl.text.isEmpty) return;
    setState(() {
      _messages.insert(0, _Msg(_ctrl.text, who: 'you'));
    });
    final reply = await _askAgent(_ctrl.text);
    setState(() {
      _messages.insert(0, _Msg(reply, who: 'pet'));
    });
    _ctrl.clear();
  }

  Future<String> _askAgent(String prompt) async {
    // Delegate to Rust agent loop. Returns the streamed final answer text.
    await Future.delayed(const Duration(milliseconds: 50));
    return 'Thinking… (real impl rounds-trips via monster-ffi)';
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Chat')),
      body: Column(children: [
        Expanded(
          child: ListView.builder(
            reverse: true,
            itemCount: _messages.length,
            itemBuilder: (_, i) {
              final m = _messages[i];
              return ListTile(
                leading: m.who == 'you' ? const Icon(Icons.person) : const Icon(Icons.smart_toy),
                title: Text(m.text),
              );
            },
          ),
        ),
        Padding(
          padding: const EdgeInsets.all(8),
          child: Row(children: [
            Expanded(
              child: TextField(controller: _ctrl, decoration: const InputDecoration(hintText: '…')),
            ),
            IconButton(icon: const Icon(Icons.send), onPressed: _send),
          ]),
        ),
      ]),
    );
  }
}

class _Msg {
  final String text;
  final String who;
  const _Msg(this.text, {required this.who});
}

class EvolutionScreen extends StatelessWidget {
  const EvolutionScreen({super.key});
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Evolution')),
      body: const Center(child: Text('Pet Evolution Timeline — placeholder')),
    );
  }
}

class OverlayLauncher extends StatelessWidget {
  const OverlayLauncher({super.key});
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Spawn Floating Pet')),
      body: const Center(child: Text('Tap to spawn the floating window via flutter_overlay_window')),
    );
  }
}

class OverlayPet extends StatelessWidget {
  const OverlayPet({super.key});
  @override
  Widget build(BuildContext context) {
    return const ColoredBox(
      color: Colors.transparent,
      child: Center(child: Text('🐉', style: TextStyle(fontSize: 80), textDirection: TextDirection.ltr)),
    );
  }
}
