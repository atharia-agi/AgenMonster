// libp2p WebRTC Transport — P2P transport for cross-device sync
// Stub implementation: actual libp2p integration requires a signaling server
// and is planned for a future release. Falls back to other transports.

import type { SyncTransport, SyncMessage } from './syncTypes.ts';
import { getDeviceId } from './syncUtils.ts';

export interface LibP2PTransportConfig {
  relayServers?: string[];
  bootstrapPeers?: string[];
  connectionTimeout?: number;
  enableMDNS?: boolean;
  enableDHT?: boolean;
  enableRelay?: boolean;
}

export class LibP2PTransport implements SyncTransport {
  private node: any = null;
  private handler: ((msg: any) => void) | null = null;
  private config: any;
  private deviceId: string;
  private connectedPeers: Map<string, { deviceId: string; lastSeen: number }> = new Map();
  private protocol = '/agenmonster/sync/1.0.0';
  private started = false;

  constructor(config: any = {}) {
    this.config = {
      relayServers: config.relayServers || [],
      bootstrapPeers: config.bootstrapPeers || [],
      connectionTimeout: config.connectionTimeout || 30000,
      enableMDNS: config.enableMDNS ?? false,
      enableDHT: config.enableDHT ?? false,
      enableRelay: config.enableRelay ?? false,
    };
    this.deviceId = getDeviceId();
  }

  getName(): string {
    return 'libp2p-webrtc';
  }

  async start(handler: (msg: any) => void): Promise<void> {
    if (this.started) return;
    this.handler = handler;
    this.started = true;
    console.info('[libp2p] Stub transport active — WebRTC requires signaling server deployment');
  }

  stop(): void {
    this.started = false;
    this.connectedPeers.clear();
    this.handler = null;
    this.node = null;
  }

  broadcast(msg: any): void {
    if (!this.started) return;
    if (msg.deviceId === this.deviceId) return;

    this.connectedPeers.set(msg.deviceId, {
      deviceId: msg.deviceId,
      lastSeen: Date.now(),
    });

    if (this.handler) {
      this.handler(msg);
    }
  }

  getPeers(): any[] {
    return Array.from(this.connectedPeers.values());
  }
}

export async function createLibP2PTransport(config?: any): Promise<LibP2PTransport | null> {
  return new LibP2PTransport(config);
}

export function isLibP2PTransportAvailable(): boolean {
  return false;
}
