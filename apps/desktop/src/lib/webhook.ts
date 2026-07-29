// Webhook client — sends events to configured URLs.

export interface WebhookConfig {
  url: string;
  kind: 'discord' | 'slack' | 'http_post';
  filter: string[];
  secret?: string;
  enabled: boolean;
}

export class WebhookClient {
  private hooks: WebhookConfig[] = [];

  add(hook: WebhookConfig) {
    this.hooks.push(hook);
  }

  remove(url: string) {
    this.hooks = this.hooks.filter(h => h.url !== url);
  }

  async dispatch(topic: string, payload: string) {
    for (const hook of this.hooks) {
      if (!hook.enabled) continue;
      if (hook.filter.length > 0 && !hook.filter.includes(topic)) continue;

      try {
        const body = hook.kind === 'discord'
          ? { content: `[${topic}] ${payload}` }
          : hook.kind === 'slack'
          ? { text: `[${topic}] ${payload}` }
          : { topic, payload, ts: new Date().toISOString() };

        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (hook.secret) {
          // HMAC signature would go here
          headers['X-Signature'] = 'placeholder';
        }

        await fetch(hook.url, {
          method: 'POST',
          headers,
          body: JSON.stringify(body),
        });
      } catch (e) {
        console.warn(`Webhook dispatch failed for ${hook.url}:`, e);
      }
    }
  }
}
