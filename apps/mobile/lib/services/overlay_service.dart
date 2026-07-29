// Android overlay service — starts floating pet window on Android.
// Uses Flutter's SystemNavigator and platform channels.

import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

class OverlayService {
  static const MethodChannel _channel = MethodChannel('com.agenmonster/overlay');

  static Future<void> startOverlay() async {
    try {
      await _channel.invokeMethod('startOverlay');
    } on PlatformException catch (e) {
      debugPrint('Failed to start overlay: ${e.message}');
    }
  }

  static Future<void> stopOverlay() async {
    try {
      await _channel.invokeMethod('stopOverlay');
    } on PlatformException catch (e) {
      debugPrint('Failed to stop overlay: ${e.message}');
    }
  }

  static Future<bool> hasOverlayPermission() async {
    try {
      return await _channel.invokeMethod('hasPermission') ?? false;
    } on PlatformException catch (e) {
      debugPrint('Failed to check permission: ${e.message}');
      return false;
    }
  }

  static Future<void> requestOverlayPermission() async {
    try {
      await _channel.invokeMethod('requestPermission');
    } on PlatformException catch (e) {
      debugPrint('Failed to request permission: ${e.message}');
    }
  }
}
