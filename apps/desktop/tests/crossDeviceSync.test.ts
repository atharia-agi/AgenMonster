import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getDeviceId, CrossDeviceSync, type SyncMessage, shouldAcceptSync, mergeGoalsCRDT, filterCRDTGoals, encodeGoalsToCRDT, decodeCRDTToGoals, type GoalsCRDTEnvelope, BroadcastChannelTransport, ServerRelayTransport } from '../src/lib/crossDeviceSync.ts';

class LS {
  store: Record<string, string> = {};
  getItem(k: string) { return k in this.store ? this.store[k] : null; }
  setItem(k: string, v: string) { this.store[k] = v; }
  removeItem(k: string) { delete this.store[k]; }
  clear() { this.store = {}; }
}
const ls = new LS();
(globalThis as any).localStorage = ls;

class MockChannel {
  onmessage: ((e: any) => void) | null = null;
  postMessage(msg: any) {
    if (this.onmessage) this.onmessage({ data: msg });
  }
  close() {}
}

function withBroadcastChannelMock(fn: () => void) {
  const originalBC = (globalThis as any).BroadcastChannel;
  (globalThis as any).BroadcastChannel = MockChannel;
  try {
    fn();
  } finally {
    (globalThis as any).BroadcastChannel = originalBC;
  }
}

test('getDeviceId returns stable id across calls', () => {
  ls.clear();
  const a = getDeviceId();
  const b = getDeviceId();
  assert.equal(a, b);
  assert.ok(a.length > 10);
});

test('getDeviceId returns different ids after clear', () => {
  ls.clear();
  const a = getDeviceId();
  ls.clear();
  const b = getDeviceId();
  assert.ok(a.length > 10);
  assert.ok(b.length > 10);
  assert.notEqual(a, b);
});

test('SyncMessage type accepts valid payloads', () => {
  const msg: SyncMessage = {
    type: 'state',
    deviceId: 'dev-1',
    timestamp: Date.now(),
    seq: 1,
    payload: { mood: 'happy' },
  };
  assert.equal(msg.type, 'state');
  assert.equal(msg.deviceId, 'dev-1');
  assert.deepEqual(msg.payload, { mood: 'happy' });
});

test('CrossDeviceSync constructor does not create BroadcastChannel', () => {
  withBroadcastChannelMock(() => {
    const sync = new CrossDeviceSync();
    assert.equal(sync['started'], false);
  });
});

test('CrossDeviceSync start creates transport and sets heartbeat', () => {
  withBroadcastChannelMock(() => {
    const sync = new CrossDeviceSync();
    sync.start();
    assert.equal(sync['started'], true);
    assert.ok(sync['heartbeatInterval'] !== null);
    sync.stop();
    assert.equal(sync['heartbeatInterval'], null);
    assert.equal(sync['started'], false);
  });
});

test('CrossDeviceSync broadcasts and receives messages', () => {
  withBroadcastChannelMock(() => {
    const sync = new CrossDeviceSync();
    const received: SyncMessage[] = [];
    sync.onMessage((msg) => received.push(msg));
    sync.start();
    sync.broadcast({ type: 'state', deviceId: 'dev-a', timestamp: Date.now(), seq: 1, payload: { x: 1 } });
    assert.equal(received.length, 1);
    assert.equal(received[0].type, 'state');
    assert.equal(received[0].deviceId, 'dev-a');
    sync.stop();
  });
});

test('CrossDeviceSync ignores own messages', () => {
  withBroadcastChannelMock(() => {
    const myId = getDeviceId();
    const sync = new CrossDeviceSync();
    const received: SyncMessage[] = [];
    sync.onMessage((msg) => received.push(msg));
    sync.start();
    sync.broadcast({ type: 'ping', deviceId: myId, timestamp: Date.now(), seq: 1, payload: {} });
    assert.equal(received.length, 0);
    sync.stop();
  });
});

test('CrossDeviceSync onMessage returns unsubscribe function', () => {
  withBroadcastChannelMock(() => {
    const sync = new CrossDeviceSync();
    const received: SyncMessage[] = [];
    const unsub = sync.onMessage((msg) => received.push(msg));
    unsub();
    sync.start();
    sync.broadcast({ type: 'state', deviceId: 'dev-b', timestamp: Date.now(), seq: 1, payload: {} });
    assert.equal(received.length, 0);
    sync.stop();
  });
});

test('CrossDeviceSync handles ping and responds with pong', () => {
  withBroadcastChannelMock(() => {
    const sync = new CrossDeviceSync();
    sync.start();
    const received: SyncMessage[] = [];
    sync.onMessage((msg) => received.push(msg));
    sync.transport!.broadcast({ type: 'ping', deviceId: 'peer-1', timestamp: Date.now(), seq: 1, payload: {} });
    assert.equal(received.length, 1);
    assert.equal(received[0].type, 'ping');
    assert.ok(sync.getPeers().some((p) => p.deviceId === 'peer-1'));
    sync.stop();
  });
});

test('CrossDeviceSync updates peers only on ping and pong', () => {
  withBroadcastChannelMock(() => {
    const sync = new CrossDeviceSync();
    sync.start();
    const received: SyncMessage[] = [];
    sync.onMessage((msg) => received.push(msg));
    sync.transport!.broadcast({ type: 'state', deviceId: 'peer-state', timestamp: Date.now(), seq: 1, payload: { x: 1 } });
    assert.equal(received.length, 1);
    assert.equal(received[0].type, 'state');
    assert.ok(sync.getPeers().length === 0);
    sync.stop();
  });
});

test('CrossDeviceSync pong updates peer lastSeen', () => {
  withBroadcastChannelMock(() => {
    const sync = new CrossDeviceSync();
    sync.start();
    const received: SyncMessage[] = [];
    sync.onMessage((msg) => received.push(msg));
    sync.transport!.broadcast({ type: 'pong', deviceId: 'peer-pong', timestamp: Date.now(), seq: 1, payload: {} });
    assert.equal(received.length, 1);
    assert.equal(received[0].type, 'pong');
    assert.ok(sync.getPeers().some((p) => p.deviceId === 'peer-pong'));
    sync.stop();
  });
});

test('CrossDeviceSync pruneStalePeers removes old entries', () => {
  withBroadcastChannelMock(() => {
    const sync = new CrossDeviceSync();
    sync['peers'].set('old-peer', { deviceId: 'old-peer', lastSeen: Date.now() - 20000 });
    sync['peers'].set('new-peer', { deviceId: 'new-peer', lastSeen: Date.now() });
    sync.getPeers();
    assert.ok(!sync['peers'].has('old-peer'));
    assert.ok(sync['peers'].has('new-peer'));
  });
});

test('CrossDeviceSync syncState/memory/goals call broadcast', () => {
  withBroadcastChannelMock(() => {
    const sync = new CrossDeviceSync();
    const received: SyncMessage[] = [];
    sync.onMessage((msg) => received.push(msg));
    sync.start();
    const otherId = 'other-device-' + Date.now();
    sync.transport!.broadcast({ type: 'state', deviceId: otherId, timestamp: Date.now(), seq: 1, payload: { x: 1 } });
    sync.transport!.broadcast({ type: 'memory', deviceId: otherId, timestamp: Date.now(), seq: 2, payload: { y: 2 } });
    sync.transport!.broadcast({ type: 'goals', deviceId: otherId, timestamp: Date.now(), seq: 3, payload: { z: 3 } });
    assert.equal(received.length, 3);
    assert.equal(received[0].type, 'state');
    assert.equal(received[1].type, 'memory');
    assert.equal(received[2].type, 'goals');
    sync.stop();
  });
});

test('CrossDeviceSync double start is safe', () => {
  withBroadcastChannelMock(() => {
    const sync = new CrossDeviceSync();
    sync.start();
    const firstInterval = sync['heartbeatInterval'];
    sync.start();
    assert.equal(sync['heartbeatInterval'], firstInterval);
    sync.stop();
  });
});

test('shouldAcceptSync accepts ping/pong always', () => {
  const msg: SyncMessage = { type: 'ping', deviceId: 'd1', timestamp: 10, seq: 1, payload: {} };
  assert.equal(shouldAcceptSync(msg, 0, 0), true);
  const pong: SyncMessage = { type: 'pong', deviceId: 'd1', timestamp: 10, seq: 1, payload: {} };
  assert.equal(shouldAcceptSync(pong, 0, 0), true);
});

test('shouldAcceptSync accepts state when remote is newer', () => {
  const msg: SyncMessage = { type: 'state', deviceId: 'd1', timestamp: 100, seq: 5, lastModified: 200, payload: {} };
  assert.equal(shouldAcceptSync(msg, 3, 150), true);
});

test('shouldAcceptSync rejects state when remote is older', () => {
  const msg: SyncMessage = { type: 'state', deviceId: 'd1', timestamp: 100, seq: 2, lastModified: 50, payload: {} };
  assert.equal(shouldAcceptSync(msg, 5, 200), false);
});

test('shouldAcceptSync falls back to timestamp when lastModified missing', () => {
  const msg: SyncMessage = { type: 'state', deviceId: 'd1', timestamp: 100, seq: 5, payload: {} };
  assert.equal(shouldAcceptSync(msg, 3, 50), true);
  assert.equal(shouldAcceptSync(msg, 7, 150), false);
});

test('encodeGoalsToCRDT produces valid envelope', () => {
  const goals = [{ id: 'g1', title: 'Test', steps: [], createdAt: 10, updatedAt: 20 }];
  const env = encodeGoalsToCRDT(goals);
  assert.ok('g1' in env.adds);
  assert.equal(env.adds['g1'], 10);
  assert.ok('g1' in env.goals);
  assert.equal(env.goals['g1'].title, 'Test');
});

test('decodeCRDTToGoals round-trips through filter', () => {
  const goals = [{ id: 'g1', title: 'Test', steps: [], createdAt: 10, updatedAt: 20 }];
  const env = encodeGoalsToCRDT(goals);
  const decoded = decodeCRDTToGoals(env);
  assert.equal(decoded.length, 1);
  assert.equal(decoded[0].title, 'Test');
});

test('mergeGoalsCRDT accepts newer add', () => {
  const local: GoalsCRDTEnvelope = {
    adds: { g1: 10 },
    removes: {},
    stepRemoves: {},
    goals: { g1: { id: 'g1', title: 'Local', steps: [], createdAt: 10, updatedAt: 10 } },
  };
  const remote: GoalsCRDTEnvelope = {
    adds: { g1: 20 },
    removes: {},
    stepRemoves: {},
    goals: { g1: { id: 'g1', title: 'Remote', steps: [], createdAt: 10, updatedAt: 20 } },
  };
  const merged = mergeGoalsCRDT(local, remote);
  assert.equal(merged.adds['g1'], 20);
  assert.equal(merged.goals['g1'].title, 'Remote');
});

test('mergeGoalsCRDT removes goal when remove is newer', () => {
  const local: GoalsCRDTEnvelope = {
    adds: { g1: 10 },
    removes: {},
    stepRemoves: {},
    goals: { g1: { id: 'g1', title: 'Test', steps: [], createdAt: 10, updatedAt: 10 } },
  };
  const remote: GoalsCRDTEnvelope = {
    adds: {},
    removes: { g1: 15 },
    stepRemoves: {},
    goals: {},
  };
  const merged = mergeGoalsCRDT(local, remote);
  assert.equal(merged.removes['g1'], 15);
  const filtered = filterCRDTGoals(merged);
  assert.equal(filtered.length, 0);
});

test('filterCRDTGoals excludes removed goals', () => {
  const envelope: GoalsCRDTEnvelope = {
    adds: { g1: 10, g2: 12 },
    removes: { g1: 15 },
    stepRemoves: {},
    goals: {
      g1: { id: 'g1', title: 'Removed', steps: [], createdAt: 10, updatedAt: 10 },
      g2: { id: 'g2', title: 'Kept', steps: [], createdAt: 12, updatedAt: 12 },
    },
  };
  const filtered = filterCRDTGoals(envelope);
  assert.equal(filtered.length, 1);
  assert.equal(filtered[0].title, 'Kept');
});

test('BroadcastChannelTransport getName returns broadcastchannel', () => {
  withBroadcastChannelMock(() => {
    const transport = new BroadcastChannelTransport();
    assert.equal(transport.getName(), 'broadcastchannel');
  });
});

test('ServerRelayTransport getName returns server-relay', () => {
  const deviceId = getDeviceId();
  const transport = new ServerRelayTransport(deviceId);
  assert.equal(transport.getName(), 'server-relay');
});
