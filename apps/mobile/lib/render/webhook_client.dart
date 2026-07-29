// Flutter webhook client — sends events to configured URLs.

import 'dart:convert';
import 'package:http/http.dart' as http;

enum WebhookKind { discord, slack, httpPost }

class WebhookConfig {
  final String url;
  final WebhookKind kind;
  final List<String> filter;
  final String? secret;
  final bool enabled;

  const WebhookConfig({
    required this.url,
    required this.kind,
    this.filter = const [],
    this.secret,
    this.enabled = true,
  });
}

class WebhookClient {
  final List<WebhookConfig> hooks = [];

  void add(WebhookConfig hook) => hooks.add(hook);
  void remove(String url) => hooks.removeWhere((h) => h.url == url);

  Future<void> dispatch(String topic, String payload) async {
    for (final hook in hooks) {
      if (!hook.enabled) continue;
      if (hook.filter.isNotEmpty && !hook.filter.contains(topic)) continue;

      try {
        final body = hook.kind == WebhookKind.discord
            ? {'content': '[$topic] $payload'}
            : hook.kind == WebhookKind.slack
            ? {'text': '[$topic] $payload'}
            : {'topic': topic, 'payload': payload, 'ts': DateTime.now().toIso8601String()};

        final headers = <String, String>{'Content-Type': 'application/json'};
        if (hook.secret != null) {
          headers['X-Signature'] = 'placeholder';
        }

        await http.post(
          Uri.parse(hook.url),
          headers: headers,
          body: jsonEncode(body),
        );
      } catch (e) {
        print('Webhook dispatch failed for ${hook.url}: $e');
      }
    }
  }
}
