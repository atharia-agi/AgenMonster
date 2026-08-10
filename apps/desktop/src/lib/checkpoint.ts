// Durable checkpoint system — inspired by LangGraph's checkpointer (2025-2026).
//
// Checkpoints capture the full agent state at a point in time, enabling:
//   - Crash recovery (resume from last checkpoint)
//   - Session persistence (reload state across reloads)
//   - Time-travel debugging (inspect prior states)
//   - Goal state machine durability
//   - Human-in-the-loop workflows
//   - Fault tolerance with pending writes

export interface Checkpoint {
  id: string;
  threadId: string;
  step: number;
  state: Record<string, unknown>;
  metadata: Record<string, unknown>;
  createdAt: number;
  parentId?: string;
  namespace?: string;
}

export interface PendingWrite {
  channel: string;
  value: unknown;
}

export interface CheckpointTuple {
  config: { threadId: string; checkpointId: string; namespace?: string };
  checkpoint: Checkpoint;
  metadata: Record<string, unknown>;
  parentConfig?: { threadId: string; checkpointId: string; namespace?: string };
  pendingWrites?: PendingWrite[];
}

export interface CheckpointStore {
  save(checkpoint: Checkpoint): Promise<void> | void;
  saveWrites(threadId: string, checkpointId: string, writes: PendingWrite[]): Promise<void> | void;
  load(threadId: string, checkpointId?: string, namespace?: string): Promise<CheckpointTuple | null>;
  list(threadId: string, namespace?: string, limit?: number): Promise<Checkpoint[]>;
  delete(threadId: string, checkpointId?: string): Promise<void> | void;
  clear(threadId: string): Promise<void> | void;
  getStateHistory(threadId: string, namespace?: string): Promise<CheckpointTuple[]>;
}

const STORAGE_KEY = 'agenmonster_checkpoints';
const STORAGE_WRITES_KEY = 'agenmonster_checkpoint_writes';
const MAX_CHECKPOINTS_PER_THREAD = 50;

function loadAll(): Record<string, Checkpoint[]> {
  if (typeof localStorage === 'undefined') return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, Checkpoint[]>;
  } catch {
    return {};
  }
}

function persistAll(data: Record<string, Checkpoint[]>): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e: unknown) {
    if ((e as Error)?.name !== 'QuotaExceededError') {
      console.warn('[checkpoint] persist error:', e);
    }
  }
}

function loadAllWrites(): Record<string, PendingWrite[]> {
  if (typeof localStorage === 'undefined') return {};
  try {
    const raw = localStorage.getItem(STORAGE_WRITES_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, PendingWrite[]>;
  } catch {
    return {};
  }
}

function persistAllWrites(data: Record<string, PendingWrite[]>): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_WRITES_KEY, JSON.stringify(data));
  } catch {}
}

export class LocalCheckpointStore implements CheckpointStore {
  async save(checkpoint: Checkpoint): Promise<void> {
    const all = loadAll();
    const key = checkpoint.namespace
      ? `${checkpoint.threadId}::${checkpoint.namespace}`
      : checkpoint.threadId;
    const thread = all[key] || [];
    const existingIdx = thread.findIndex((c) => c.id === checkpoint.id);
    if (existingIdx >= 0) {
      thread[existingIdx] = checkpoint;
    } else {
      thread.push(checkpoint);
      thread.sort((a, b) => a.step - b.step);
      while (thread.length > MAX_CHECKPOINTS_PER_THREAD) {
        thread.shift();
      }
    }
    all[key] = thread;
    persistAll(all);
  }

  async saveWrites(threadId: string, checkpointId: string, writes: PendingWrite[]): Promise<void> {
    const all = loadAllWrites();
    const key = `${threadId}:${checkpointId}`;
    all[key] = [...(all[key] || []), ...writes];
    persistAllWrites(all);
  }

  async load(threadId: string, checkpointId?: string, namespace?: string): Promise<CheckpointTuple | null> {
    const all = loadAll();
    const key = namespace ? `${threadId}::${namespace}` : threadId;
    const thread = all[key];
    if (!thread || thread.length === 0) return null;

    let checkpoint: Checkpoint | null = null;
    if (checkpointId) {
      checkpoint = thread.find((c) => c.id === checkpointId) || null;
    } else {
      checkpoint = thread[thread.length - 1] || null;
    }
    if (!checkpoint) return null;

    const writes = loadAllWrites()[`${threadId}:${checkpoint.id}`] || [];

    const parentConfig = checkpoint.parentId
      ? { threadId, checkpointId: checkpoint.parentId, namespace }
      : undefined;

    return {
      config: { threadId, checkpointId: checkpoint.id, namespace },
      checkpoint,
      metadata: checkpoint.metadata,
      parentConfig,
      pendingWrites: writes,
    };
  }

  async list(threadId: string, namespace?: string, limit = 50): Promise<Checkpoint[]> {
    const all = loadAll();
    const key = namespace ? `${threadId}::${namespace}` : threadId;
    const thread = all[key] || [];
    return thread.slice(-limit);
  }

  async delete(threadId: string, checkpointId?: string): Promise<void> {
    const all = loadAll();
    if (!checkpointId) {
      Object.keys(all).forEach((k) => {
        if (k === threadId || k.startsWith(`${threadId}::`)) delete all[k];
      });
    } else {
      for (const key of Object.keys(all)) {
        if (key === threadId || key.startsWith(`${threadId}::`)) {
          all[key] = all[key].filter((c) => c.id !== checkpointId);
        }
      }
    }
    persistAll(all);
  }

  async clear(threadId: string): Promise<void> {
    const all = loadAll();
    Object.keys(all).forEach((k) => {
      if (k === threadId || k.startsWith(`${threadId}::`)) delete all[k];
    });
    persistAll(all);
  }

  async getStateHistory(threadId: string, namespace?: string): Promise<CheckpointTuple[]> {
    const all = loadAll();
    const key = namespace ? `${threadId}::${namespace}` : threadId;
    const thread = all[key] || [];
    const tuples: CheckpointTuple[] = [];
    for (const checkpoint of thread) {
      const writes = loadAllWrites()[`${threadId}:${checkpoint.id}`] || [];
      const parentConfig = checkpoint.parentId
        ? { threadId, checkpointId: checkpoint.parentId, namespace }
        : undefined;
      tuples.push({
        config: { threadId, checkpointId: checkpoint.id, namespace },
        checkpoint,
        metadata: checkpoint.metadata,
        parentConfig,
        pendingWrites: writes,
      });
    }
    return tuples;
  }
}

// In-memory store for dev/testing
export class MemoryCheckpointStore implements CheckpointStore {
  private store = new Map<string, Checkpoint[]>();
  private writes = new Map<string, PendingWrite[]>();

  private key(threadId: string, namespace?: string): string {
    return namespace ? `${threadId}::${namespace}` : threadId;
  }

  async save(checkpoint: Checkpoint): Promise<void> {
    const k = this.key(checkpoint.threadId, checkpoint.namespace);
    const thread = this.store.get(k) || [];
    const existingIdx = thread.findIndex((c) => c.id === checkpoint.id);
    if (existingIdx >= 0) {
      thread[existingIdx] = checkpoint;
    } else {
      thread.push(checkpoint);
      thread.sort((a, b) => a.step - b.step);
      while (thread.length > MAX_CHECKPOINTS_PER_THREAD) {
        thread.shift();
      }
    }
    this.store.set(k, thread);
  }

  async saveWrites(threadId: string, checkpointId: string, writes: PendingWrite[]): Promise<void> {
    const k = `${threadId}:${checkpointId}`;
    this.writes.set(k, [...(this.writes.get(k) || []), ...writes]);
  }

  async load(threadId: string, checkpointId?: string, namespace?: string): Promise<CheckpointTuple | null> {
    const k = this.key(threadId, namespace);
    const thread = this.store.get(k);
    if (!thread || thread.length === 0) return null;

    let checkpoint: Checkpoint | null = null;
    if (checkpointId) {
      checkpoint = thread.find((c) => c.id === checkpointId) || null;
    } else {
      checkpoint = thread[thread.length - 1] || null;
    }
    if (!checkpoint) return null;

    const writes = this.writes.get(`${threadId}:${checkpoint.id}`) || [];
    const parentConfig = checkpoint.parentId
      ? { threadId, checkpointId: checkpoint.parentId, namespace }
      : undefined;

    return {
      config: { threadId, checkpointId: checkpoint.id, namespace },
      checkpoint,
      metadata: checkpoint.metadata,
      parentConfig,
      pendingWrites: writes,
    };
  }

  async list(threadId: string, namespace?: string, limit = 50): Promise<Checkpoint[]> {
    const k = this.key(threadId, namespace);
    const thread = this.store.get(k) || [];
    return thread.slice(-limit);
  }

  async delete(threadId: string, checkpointId?: string): Promise<void> {
    if (!checkpointId) {
      this.store.delete(this.key(threadId));
      this.store.delete(this.key(threadId, undefined));
    } else {
      for (const [k, thread] of this.store.entries()) {
        if (k === this.key(threadId) || k === this.key(threadId, undefined)) {
          this.store.set(k, thread.filter((c) => c.id !== checkpointId));
        }
      }
    }
  }

  async clear(threadId: string): Promise<void> {
    this.store.delete(this.key(threadId));
    this.store.delete(this.key(threadId, undefined));
  }

  async getStateHistory(threadId: string, namespace?: string): Promise<CheckpointTuple[]> {
    const k = this.key(threadId, namespace);
    const thread = this.store.get(k) || [];
    return thread.map((checkpoint) => {
      const writes = this.writes.get(`${threadId}:${checkpoint.id}`) || [];
      const parentConfig = checkpoint.parentId
        ? { threadId, checkpointId: checkpoint.parentId, namespace }
        : undefined;
      return {
        config: { threadId, checkpointId: checkpoint.id, namespace },
        checkpoint,
        metadata: checkpoint.metadata,
        parentConfig,
        pendingWrites: writes,
      };
    });
  }
}

let defaultStore: CheckpointStore | null = null;

export function getDefaultCheckpointStore(): CheckpointStore {
  if (!defaultStore) {
    defaultStore = new LocalCheckpointStore();
  }
  return defaultStore;
}

export function setDefaultCheckpointStore(store: CheckpointStore): void {
  defaultStore = store;
}

export function createCheckpoint(
  threadId: string,
  step: number,
  state: Record<string, unknown>,
  metadata: Record<string, unknown> = {},
  options: { parentId?: string; namespace?: string } = {},
): Checkpoint {
  return {
    id: crypto.randomUUID(),
    threadId,
    step,
    state: JSON.parse(JSON.stringify(state)),
    metadata,
    createdAt: Date.now(),
    parentId: options.parentId,
    namespace: options.namespace,
  };
}
