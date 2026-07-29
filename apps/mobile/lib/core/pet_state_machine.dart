import 'dart:async';
import 'package:flutter_rust_bridge/flutter_rust_bridge.dart';

class PetState {
  final String stage;
  final String mood;
  final String? speech;

  const PetState({required this.stage, required this.mood, this.speech});
}

class PetStateMachine {
  PetStateMachine._();
  static final PetStateMachine instance = PetStateMachine._();

  final StreamController<PetState> _ctrl = StreamController<PetState>.broadcast();
  Stream<PetState> get stream => _ctrl.stream;

  Future<void> boot() async {
    // Listen to the Rust event stream and translate into PetState updates.
    // Each stream event contains a tuple (stage, mood, optional speech).
  }

  void emit(PetState s) {
    _ctrl.add(s);
  }
}
