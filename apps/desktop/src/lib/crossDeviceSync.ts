// Cross-device sync — BroadcastChannel for same-origin, libp2p WebRTC for P2P, server-relay fallback.
// Priority order: libp2p WebRTC > BroadcastChannel > ServerRelay

import { getDeviceId } from './syncUtils.ts';
import type { SyncTransport, SyncMessage, SyncPeer, GoalsCRDTEnvelope, GoalCRDTItem } from './syncTypes.ts';
import { BroadcastChannelTransport } from './broadcastChannelTransport.ts';
import { ServerRelayTransport } from './serverRelayTransport.ts';
import { LibP2PTransport, isLibP2PTransportAvailable } from './libp2pTransport.ts';
import { shouldAcceptSync } from './syncUtils.ts';
import { mergeGoalsCRDT } from './syncUtils.ts';
import { filterCRDTGoals } from './syncUtils.ts';
import { encodeGoalsToCRDT } from './syncUtils.ts';
import { decodeCRDTToGoals } from './syncUtils.ts';
import { logger } from './logger.ts';

export { type SyncMessage, type SyncPeer, type GoalsCRDTEnvelope, type GoalCRDTItem };
export { getDeviceId, shouldAcceptSync, mergeGoalsCRDT, filterCRDTGoals, encodeGoalsToCRDT, decodeCRDTToGoals };
export { BroadcastChannelTransport, ServerRelayTransport };

export class CrossDeviceSync {
  transport: SyncTransport | null = null;
  private peers: Map<string, any> = new Map();
  private listeners: Set<(msg: any) => void> = new Set();
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;
  private started = false;
  private seq = 0;

  constructor() {}

  async start(): Promise<void> {
    if (this.started) return;

    if (!this.transport) {
      const deviceId = getDeviceId();

      // Try libp2p first (true P2P)
      if (isLibP2PTransportAvailable()) {
        try {
          const { createLibP2PTransport } = await import('./libp2pTransport.ts');
          this.transport = await createLibP2PTransport();
          logger.info('[CrossDeviceSync] Using libp2p WebRTC transport');
        } catch (e) {
          logger.warn('[CrossDeviceSync] libp2p failed, falling back', { error: String(e) });
        }
      }

      // Fallback to BroadcastChannel
      if (!this.transport && typeof BroadcastChannel !== 'undefined') {
        this.transport = new BroadcastChannelTransport();
        logger.info('[CrossDeviceSync] Using BroadcastChannel transport');
      }

      // Last resort: server relay
      if (!this.transport) {
        this.transport = new ServerRelayTransport(getDeviceId());
        logger.info('[CrossDeviceSync] Using ServerRelay transport');
      }
    }

    this.transport!.start((msg: any) => {
      if (msg.deviceId === getDeviceId()) return;
      if (msg.type === 'ping') {
        this.peers.set(msg.deviceId, { deviceId: msg.deviceId, lastSeen: Date.now() });
        this.seq++;
        this.transport!.broadcast({ type: 'pong', deviceId: getDeviceId(), timestamp: Date.now(), seq: this.seq, payload: msg.payload });
      } else if (msg.type === 'pong') {
        this.peers.set(msg.deviceId, { deviceId: msg.deviceId, lastSeen: Date.now() });
      }
      this.notifyListeners(msg);
    });

    this.heartbeatInterval = setInterval(() => {
      this.seq++;
      this.transport!.broadcast({ type: 'ping', deviceId: getDeviceId(), timestamp: Date.now(), seq: this.seq, payload: {} });
    }, 5000);

    this.started = true;
  }

  stop(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    this.transport?.stop();
    this.started = false;
  }

  broadcast(msg: any): void {
    this.transport?.broadcast(msg);
  }

  syncState(state: any, lastModified?: number): void {
    this.seq++;
    this.broadcast({ type: 'state', deviceId: getDeviceId(), timestamp: Date.now(), seq: this.seq, lastModified: lastModified ?? Date.now(), payload: state });
  }

  syncMemory(memory: any, lastModified?: number): void {
    this.seq++;
    this.broadcast({ type: 'memory', deviceId: getDeviceId(), timestamp: Date.now(), seq: this.seq, lastModified: lastModified ?? Date.now(), payload: memory });
  }

  syncGoals(goals: any, lastModified?: number): void {
    this.seq++;
    this.broadcast({ type: 'goals', deviceId: getDeviceId(), timestamp: Date.now(), seq: this.seq, lastModified: lastModified ?? Date.now(), payload: goals });
  }

  onMessage(listener: (msg: any) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  getPeers(): any[] {
    this.pruneStalePeers();
    return Array.from(this.peers.values());
  }

  getTransportName(): string {
    return this.transport?.getName() || 'none';
  }

  private notifyListeners(msg: any): void {
    this.listeners.forEach((fn) => fn(msg));
  }

  private pruneStalePeers(): void {
    const now = Date.now();
    this.peers.forEach((peer, id) => {
      if (now - peer.lastSeen > 15000) {
        this.peers.delete(id);
      }
    });
  }
}

export const sync = new CrossDeviceSync();