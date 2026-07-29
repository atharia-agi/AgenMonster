// Bridge from Dart into the Rust monster-ffi cdylib.
import 'dart:ffi';
import 'package:ffi/ffi.dart';
import 'package:flutter_rust_bridge/flutter_rust_bridge.dart';
import 'package:path_provider/path_provider.dart';
import 'dart:io';

class AgentBridge {
  AgentBridge._();
  static final AgentBridge instance = AgentBridge._();

  static final DynamicLibrary _native = Platform.isAndroid
      ? DynamicLibrary.open('libagenmonster.so')
      : DynamicLibrary.process();

  late final RustRuntime _rt;

  Future<void> boot({required String busConfigPath}) async {
    _rt = RustRuntime(dylib: _native);
    await _rt.api.crateApiAgentBootSimple(
      busConfigPath: busConfigPath,
    );
    await _rt.api.crateApiWorldBootDefault();
  }
}
