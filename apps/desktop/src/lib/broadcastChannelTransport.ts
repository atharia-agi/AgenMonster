import type { SyncTransport } from './syncTypes.ts';
import { getDeviceId } from './syncTypes.ts';

const CHANNEL_NAME = 'agenmonster-sync';

export class BroadcastChannelTransport {
  private channel: BroadcastChannel | null = null;

  getName(): string {
    return 'broadcastchannel';
  }

  start(handler: (msg: any) => void): void {
    if (typeof BroadcastChannel !== 'undefined' && !this.channel) {
      this.channel = new BroadcastChannel('agenmonster-sync');
      this.channel.onmessage = (event: MessageEvent) => {
        const msg = event.data;
        if (msg.deviceId === getDeviceId()) return;
        if (msg.type === 'ping') {
          this.broadcast({ type: 'pong', deviceId: getDeviceId(), timestamp: Date.now(), seq: 0, payload: msg.payload });
        }
        handler(msg);
      };
    }
  }

  stop(): void {
    this.channel?.close();
    this.channel = null;
  }

  broadcast(msg: any): void {
    this.channel?.postMessage(msg);
  }
}