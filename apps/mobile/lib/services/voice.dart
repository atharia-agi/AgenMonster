import 'package:flutter/material.dart';
import 'package:flutter_overlay_window/flutter_overlay_window.dart';

class VoiceService {
  static Future<void> listenMicrophone() async {
    // Real impl: whisper-cpp via flutter_rust_bridge + audio recording.
  }
  static Future<String> listenPendingOtp() async {
    // Real impl: peek device notifications via Android NotificationListenerService.
    await Future.delayed(const Duration(milliseconds: 100));
    return '';
  }
}
