import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import { deepRecursiveAgent } from '../src/lib/deepRecursiveAgent.ts';
import { autonomousAgent } from '../src/lib/autonomousAgent.ts';
import { autonomousWorld } from '../src/lib/autonomousWorld.ts';
import { autonomousSelfCare } from '../src/lib/autonomousSelfCare.ts';

if (typeof globalThis.window === 'undefined') {
  const listeners: Record<string, Function[]> = {};
  (globalThis as any).window = {
    dispatchEvent: (e: any) => {
      const type = e.type;
      if (listeners[type]) {
        listeners[type].forEach((fn: Function) => fn(e));
      }
    },
    addEventListener: (name: string, fn: Function) => {
      if (!listeners[name]) listeners[name] = [];
      listeners[name].push(fn);
    },
    removeEventListener: (name: string, fn: Function) => {
      if (listeners[name]) {
        listeners[name] = listeners[name].filter((f: Function) => f !== fn);
      }
    },
  };
}
if (typeof globalThis.sessionStorage === 'undefined') {
  (globalThis as any).sessionStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
}
if (typeof globalThis.localStorage === 'undefined') {
  (globalThis as any).localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
}

describe('autonomous modules integration', () => {
  beforeEach(() => {
    deepRecursiveAgent.stop();
    autonomousAgent.stop();
    autonomousWorld.stop();
    autonomousSelfCare.stop();
  });

  afterEach(() => {
    deepRecursiveAgent.stop();
    autonomousAgent.stop();
    autonomousWorld.stop();
    autonomousSelfCare.stop();
  });

  it('all 3 deep modules can start and stop together without crashing', () => {
    assert.strictEqual(deepRecursiveAgent.isActive(), false);
    assert.strictEqual(autonomousWorld.isActive(), false);
    assert.strictEqual(autonomousSelfCare.isActive(), false);

    deepRecursiveAgent.start(5_000);
    autonomousWorld.start();
    autonomousSelfCare.start();

    assert.strictEqual(deepRecursiveAgent.isActive(), true);
    assert.strictEqual(autonomousWorld.isActive(), true);
    assert.strictEqual(autonomousSelfCare.isActive(), true);

    deepRecursiveAgent.stop();
    autonomousWorld.stop();
    autonomousSelfCare.stop();

    assert.strictEqual(deepRecursiveAgent.isActive(), false);
    assert.strictEqual(autonomousWorld.isActive(), false);
    assert.strictEqual(autonomousSelfCare.isActive(), false);
  });

  it('deepRecursiveAgent dispatches deep-turn events after a turn', { timeout: 45000 }, async () => {
    let received = false;
    let detail: any;
    const handler = (e: any) => {
      received = true;
      detail = e.detail;
    };
    window.addEventListener('deep-turn', handler);

    deepRecursiveAgent.start(25_000);

    const deadline = Date.now() + 25_000;
    while (!received && Date.now() < deadline) {
      await new Promise(r => setTimeout(r, 500));
    }

    window.removeEventListener('deep-turn', handler);
    deepRecursiveAgent.stop();

    assert.ok(received, 'deep-turn event should have been dispatched');
    assert.ok(detail?.turnId, 'event should contain turnId');
    assert.ok(detail?.turnNumber >= 1, 'event should contain turnNumber >= 1');
    assert.ok(['success', 'failed', 'unknown'].includes(detail?.outcome), 'event should contain outcome');
  });

  it('autonomousAgent dispatches autonomous-turn events after a turn', { timeout: 45000 }, async () => {
    let received = false;
    let detail: any;
    const handler = (e: any) => {
      received = true;
      detail = e.detail;
    };
    window.addEventListener('autonomous-turn', handler);

    autonomousAgent.start(35_000);

    const deadline = Date.now() + 35_000;
    while (!received && Date.now() < deadline) {
      await new Promise(r => setTimeout(r, 500));
    }

    window.removeEventListener('autonomous-turn', handler);
    autonomousAgent.stop();

    assert.ok(received, 'autonomous-turn event should have been dispatched');
    assert.ok(detail?.turnId, 'event should contain turnId');
    assert.ok(detail?.turnNumber >= 1, 'event should contain turnNumber >= 1');
  });

  it('deepRecursiveAgent auto-stops after durationMs', { timeout: 10000 }, async () => {
    deepRecursiveAgent.start(2_000);
    assert.strictEqual(deepRecursiveAgent.isActive(), true);

    await new Promise(r => setTimeout(r, 3_000));
    assert.strictEqual(deepRecursiveAgent.isActive(), false);
  });

  it('deepRecursiveAgent stop() clears the timer and prevents pile-up', async () => {
    for (let i = 0; i < 5; i++) {
      deepRecursiveAgent.start(10_000);
      assert.strictEqual(deepRecursiveAgent.isActive(), true);
      deepRecursiveAgent.stop();
      assert.strictEqual(deepRecursiveAgent.isActive(), false);
    }
  });
});
