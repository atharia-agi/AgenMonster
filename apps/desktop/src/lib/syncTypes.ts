// Cross-device sync types — shared types to avoid circular dependencies

export interface SyncMessage {
  type: 'state' | 'memory' | 'goals' | 'ping' | 'pong';
  deviceId: string;
  timestamp: number;
  /** Monotonically increasing sequence number per device (vector clock component). */
  seq: number;
  /** For state/memory/goals: the last-modified time of the payload source. */
  lastModified?: number;
  payload: any;
}

export interface SyncPeer {
  deviceId: string;
  lastSeen: number;
}

export interface SyncTransport {
  start(handler: (msg: SyncMessage) => void): void;
  stop(): void;
  broadcast(msg: SyncMessage): void;
  getName(): string;
}

export interface GoalCRDTItem {
  id: string;
  title: string;
  steps: Array<{ id: string; text: string; done: boolean }>;
  createdAt: number;
  updatedAt: number;
  doneAt?: number;
  /** tombstone: set to timestamp when removed, absent if alive */
  removedAt?: number;
}

export interface GoalsCRDTEnvelope {
  /** Unique add events: goalId -> timestamp */
  adds: Record<string, number>;
  /** Unique remove events: goalId -> timestamp */
  removes: Record<string, number>;
  /** Per-goal step tombstones: `${goalId}:${stepId}` -> timestamp */
  stepRemoves: Record<string, number>;
  /** Full goal state for each add */
  goals: Record<string, GoalCRDTItem>;
}

const DEVICE_ID_KEY = 'agenmonster_device_id';

export function getDeviceId(): string {
  let id = localStorage.getItem(DEVICE_ID_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(DEVICE_ID_KEY, id);
  }
  return id;
}