import type { SyncTransport } from './syncTypes.ts';
import { getDeviceId } from './syncUtils.ts';

const RELAY_STORAGE_KEY = 'agenmonster_sync_relay_last_poll';

export class ServerRelayTransport {
  private handler: ((msg: any) => void) | null = null;
  private pollInterval: ReturnType<typeof setInterval> | null = null;
  private lastPollTs = 0;
  private deviceId: string;

  constructor(deviceId?: string) {
    this.deviceId = deviceId || getDeviceId();
  }

  getName(): string {
    return 'server-relay';
  }

  start(handler: (msg: any) => void): void {
    this.handler = handler;
    try {
      const stored = localStorage.getItem('agenmonster_sync_relay_last_poll');
      this.lastPollTs = stored ? Number(stored) : Date.now() - 5000;
    } catch {
      this.lastPollTs = Date.now() - 5000;
    }
    this.poll();
    this.pollInterval = setInterval(() => this.poll(), 2000);
  }

  stop(): void {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
    this.handler = null;
  }

  broadcast(msg: any): void {
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      const token = localStorage.getItem('agenmonster_sync_secret');
      if (token) headers['X-Device-Token'] = token;
      fetch('/api/sync/publish', {
        method: 'POST',
        headers,
        body: JSON.stringify(msg),
      }).catch(() => {});
    } catch {}
  }

  private async poll(): Promise<void> {
    if (!this.handler) return;
    try {
      const headers: Record<string, string> = {};
      const token = localStorage.getItem('agenmonster_sync_secret');
      if (token) headers['X-Device-Token'] = token;
      const url = `/api/sync/poll?since=${this.lastPollTs}&deviceId=${encodeURIComponent(this.deviceId)}`;
      const resp = await fetch(url, { headers });
      if (!resp.ok) return;
      const messages: any[] = await resp.json();
      for (const msg of messages) {
        if (msg.deviceId === this.deviceId) continue;
        if (msg.type === 'ping') {
          this.broadcast({ type: 'pong', deviceId: getDeviceId(), timestamp: Date.now(), seq: 0, payload: msg.payload });
        }
        this.handler(msg);
      }
      if (messages.length > 0) {
        const maxTs = messages.reduce((m: number, msg: any) => Math.max(m, msg.timestamp), this.lastPollTs);
        this.lastPollTs = maxTs;
        try { localStorage.setItem('agenmonster_sync_relay_last_poll', String(this.lastPollTs)); } catch {}
      }
    } catch {}
  }
}