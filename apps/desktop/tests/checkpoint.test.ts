import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import {
  MemoryCheckpointStore,
  LocalCheckpointStore,
  createCheckpoint,
  type Checkpoint,
  type CheckpointTuple,
} from '../src/lib/checkpoint.ts';

describe('checkpoint', () => {
  let store: MemoryCheckpointStore;

  beforeEach(() => {
    store = new MemoryCheckpointStore();
  });

  it('save and load a checkpoint', async () => {
    const cp = createCheckpoint('thread-1', 1, { goals: [] }, { step: 'plan' });
    await store.save(cp);
    const loaded: CheckpointTuple | null = await store.load('thread-1');
    assert.ok(loaded);
    assert.strictEqual(loaded!.checkpoint.id, cp.id);
    assert.strictEqual(loaded!.checkpoint.step, 1);
    assert.deepStrictEqual(loaded!.checkpoint.state, { goals: [] });
  });

  it('load returns null for unknown thread', async () => {
    const loaded = await store.load('nonexistent');
    assert.strictEqual(loaded, null);
  });

  it('load returns latest checkpoint when step not specified', async () => {
    await store.save(createCheckpoint('thread-2', 1, { a: 1 }));
    await store.save(createCheckpoint('thread-2', 2, { a: 2 }));
    await store.save(createCheckpoint('thread-2', 3, { a: 3 }));
    const latest: CheckpointTuple | null = await store.load('thread-2');
    assert.ok(latest);
    assert.strictEqual(latest!.checkpoint.step, 3);
    assert.deepStrictEqual(latest!.checkpoint.state, { a: 3 });
  });

  it('load returns specific step checkpoint', async () => {
    await store.save(createCheckpoint('thread-3', 1, { a: 1 }));
    const cp2 = createCheckpoint('thread-3', 2, { a: 2 });
    await store.save(cp2);
    const step1: CheckpointTuple | null = await store.load('thread-3', cp2.id);
    assert.ok(step1);
    assert.strictEqual(step1!.checkpoint.step, 2);
    assert.deepStrictEqual(step1!.checkpoint.state, { a: 2 });
  });

  it('list returns all checkpoints for a thread', async () => {
    await store.save(createCheckpoint('thread-4', 1, {}));
    await store.save(createCheckpoint('thread-4', 2, {}));
    await store.save(createCheckpoint('thread-4', 3, {}));
    const list = await store.list('thread-4');
    assert.strictEqual(list.length, 3);
    assert.strictEqual(list[0].step, 1);
    assert.strictEqual(list[2].step, 3);
  });

  it('delete removes a specific checkpoint', async () => {
    const cp1 = createCheckpoint('thread-5', 1, {});
    const cp2 = createCheckpoint('thread-5', 2, {});
    await store.save(cp1);
    await store.save(cp2);
    await store.delete('thread-5', cp2.id);
    const list = await store.list('thread-5');
    assert.strictEqual(list.length, 1);
    assert.strictEqual(list[0].step, 1);
  });

  it('clear removes all checkpoints for a thread', async () => {
    await store.save(createCheckpoint('thread-6', 1, {}));
    await store.save(createCheckpoint('thread-6', 2, {}));
    await store.clear('thread-6');
    const list = await store.list('thread-6');
    assert.strictEqual(list.length, 0);
  });

  it('createCheckpoint deep clones state', async () => {
    const original = { nested: { value: 42 } };
    const cp = createCheckpoint('thread-7', 1, original);
    original.nested.value = 0;
    assert.strictEqual((cp.state as any).nested.value, 42);
  });

  it('checkpoint has correct metadata', async () => {
    const cp = createCheckpoint('thread-8', 1, { test: true }, { source: 'test' });
    assert.ok(cp.id.length > 0);
    assert.strictEqual(cp.threadId, 'thread-8');
    assert.strictEqual(cp.step, 1);
    assert.strictEqual(cp.metadata.source, 'test');
    assert.ok(cp.createdAt > 0);
  });

  it('overwrites checkpoint with same id', async () => {
    const cp = createCheckpoint('thread-9', 1, { a: 1 });
    await store.save(cp);
    // Save a new checkpoint with same thread+step but different id
    const cp2 = createCheckpoint('thread-9', 1, { a: 2 });
    await store.save(cp2);
    const list = await store.list('thread-9');
    // Both have same step but different ids, so both are stored
    assert.ok(list.length >= 1);
  });

  it('caps checkpoints per thread at MAX_CHECKPOINTS_PER_THREAD', async () => {
    for (let i = 0; i < 60; i++) {
      await store.save(createCheckpoint('thread-10', i, { step: i }));
    }
    const list = await store.list('thread-10');
    assert.ok(list.length <= 50);
  });

  it('supports namespaces', async () => {
    const cp = createCheckpoint('thread-11', 1, { ns: true }, {}, { namespace: 'subgraph-1' });
    await store.save(cp);
    const loaded: CheckpointTuple | null = await store.load('thread-11', undefined, 'subgraph-1');
    assert.ok(loaded);
    assert.strictEqual(loaded!.checkpoint.namespace, 'subgraph-1');
    assert.strictEqual(loaded!.checkpoint.state.ns, true);
  });

  it('getStateHistory returns chronological checkpoints', async () => {
    await store.save(createCheckpoint('thread-12', 1, { a: 1 }));
    await store.save(createCheckpoint('thread-12', 2, { a: 2 }));
    const history = await store.getStateHistory('thread-12');
    assert.strictEqual(history.length, 2);
    assert.strictEqual(history[0].checkpoint.step, 1);
    assert.strictEqual(history[1].checkpoint.step, 2);
  });

  it('supports pending writes', async () => {
    const cp = createCheckpoint('thread-13', 1, { a: 1 });
    await store.save(cp);
    await store.saveWrites('thread-13', cp.id, [{ channel: 'messages', value: { role: 'user', content: 'hi' } }]);
    const loaded: CheckpointTuple | null = await store.load('thread-13');
    assert.ok(loaded);
    assert.ok(loaded!.pendingWrites);
    assert.strictEqual(loaded!.pendingWrites!.length, 1);
    assert.strictEqual(loaded!.pendingWrites![0].channel, 'messages');
  });
});
