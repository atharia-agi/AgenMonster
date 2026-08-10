import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  setChaosConfig,
  enableChaos,
  disableChaos,
  isChaosEnabled,
  injectFailure,
  applyScenario,
  clearScenarios,
  createChaosMiddleware,
  defaultChaosConfig,
  getChaosConfig,
} from '../../src/lib/chaos/chaos-engine.ts';

describe('Chaos Engineering Tests', () => {
  beforeEach(() => {
    clearScenarios();
  });

  afterEach(() => {
    clearScenarios();
  });

  test('chaos engine can be enabled and disabled', () => {
    assert.equal(isChaosEnabled(), false);

    enableChaos();
    assert.equal(isChaosEnabled(), true);

    disableChaos();
    assert.equal(isChaosEnabled(), false);
  });

  test('chaos config can be set and retrieved', () => {
    const config = { failureRate: 0.5, latencyMs: { min: 100, max: 200 } };
    setChaosConfig(config);

    const retrieved = getChaosConfig();
    assert.equal(retrieved.failureRate, 0.5);
    assert.equal(retrieved.latencyMs.min, 100);
    assert.equal(retrieved.latencyMs.max, 200);
  });

  test('injectFailure throws chaos error when failure rate is 1', async () => {
    setChaosConfig({ enabled: true, failureRate: 1 });

    let errorThrown = false;
    try {
      await injectFailure(async () => 'success');
    } catch (error) {
      errorThrown = true;
      assert.equal((error as any).isChaosError, true);
    }

    assert.equal(errorThrown, true);
  });

  test('injectFailure succeeds when failure rate is 0', async () => {
    setChaosConfig({ enabled: true, failureRate: 0 });

    const result = await injectFailure(async () => 'success');
    assert.equal(result, 'success');
  });

  test('applyScenario applies predefined chaos scenarios', () => {
    applyScenario('networkPartition');
    const config = getChaosConfig();
    assert.equal(config.enabled, true);
    assert.equal(config.networkPartition, true);
    assert.equal(config.failureRate, 0.3);

    clearScenarios();
    const cleared = getChaosConfig();
    assert.equal(cleared.enabled, false);
    assert.equal(cleared.failureRate, 0);
  });

  test('chaos middleware wraps handler with failure injection', async () => {
    const middleware = createChaosMiddleware({ enabled: true, failureRate: 1 });

    const mockHandler = async (req: Request) => {
      return new Response('OK', { status: 200 });
    };

    const request = new Request('http://localhost/test');
    const response = await middleware.handle(request, mockHandler);

    assert.ok(response.status >= 500);
    assert.equal(response.headers.get('X-Chaos-Injected'), 'true');
  });

  test('chaos middleware passes through when disabled', async () => {
    const middleware = createChaosMiddleware({ enabled: false, failureRate: 1 });

    const mockHandler = async (req: Request) => {
      return new Response('OK', { status: 200 });
    };

    const request = new Request('http://localhost/test');
    const response = await middleware.handle(request, mockHandler);

    assert.equal(response.status, 200);
    assert.equal(await response.text(), 'OK');
  });

  test('latency injection adds delay', async () => {
    setChaosConfig({ enabled: true, latencyMs: { min: 50, max: 100 } });

    const start = Date.now();
    await injectFailure(async () => {
      await new Promise(resolve => setTimeout(resolve, 10));
      return 'done';
    });
    const elapsed = Date.now() - start;

    assert.ok(elapsed >= 50);
  });
});

describe('Chaos Integration Tests', () => {
  test('can simulate network partition', async () => {
    applyScenario('networkPartition');

    const results = await Promise.allSettled(
      Array.from({ length: 10 }, () =>
        injectFailure(async () => {
          await new Promise(resolve => setTimeout(resolve, 10));
          return 'success';
        })
      )
    );

    const failures = results.filter(r => r.status === 'rejected').length;
    assert.ok(failures > 0);

    clearScenarios();
  });

  test('can simulate high latency', async () => {
    applyScenario('highLatency');

    const start = Date.now();
    await injectFailure(async () => 'fast');
    const elapsed = Date.now() - start;

    assert.ok(elapsed >= 1000);

    clearScenarios();
  });

  test('can simulate cascade failure', async () => {
    applyScenario('cascadeFailure');

    let successCount = 0;
    let failureCount = 0;

    for (let i = 0; i < 20; i++) {
      try {
        await injectFailure(async () => 'success');
        successCount++;
      } catch {
        failureCount++;
      }
    }

    assert.ok(failureCount > 5);
    assert.equal(successCount + failureCount, 20);

    clearScenarios();
  });

  test('can simulate timeout storm', async () => {
    applyScenario('timeoutStorm');

    const start = Date.now();
    try {
      await injectFailure(async () => {
        await new Promise(resolve => setTimeout(resolve, 50));
        return 'done';
      });
    } catch {
      // Expected
    }
    const elapsed = Date.now() - start;

    assert.ok(elapsed >= 10000);

    clearScenarios();
  });

  test('can simulate degraded performance', async () => {
    applyScenario('degradePerformance');

    let totalTime = 0;
    let failures = 0;
    for (let i = 0; i < 10; i++) {
      const start = Date.now();
      try {
        await injectFailure(async () => 'ok');
      } catch {
        failures++;
      }
      totalTime += Date.now() - start;
    }

    const avgTime = totalTime / 10;
    assert.ok(avgTime >= 100);
    assert.ok(avgTime <= 1000); // Allow overhead
    // With 5% failure rate over 10 attempts, expect <= 3 failures (statistical tolerance)
    assert.ok(failures <= 3);

    clearScenarios();
  });
});

describe('Chaos E2E Scenarios', () => {
  test('app handles intermittent errors gracefully', async () => {
    applyScenario('intermittentErrors');

    const mockApiCall = async (): Promise<string> => {
      return await injectFailure(async () => 'data');
    };

    let successes = 0;
    let errors = 0;

    for (let i = 0; i < 50; i++) {
      try {
        await mockApiCall();
        successes++;
      } catch {
        errors++;
      }
    }

    assert.ok(errors > 0);
    assert.ok(successes > 0);
    assert.equal(successes + errors, 50);

    clearScenarios();
  });

  test('app recovers after chaos scenario ends', async () => {
    applyScenario('intermittentErrors');

    // During chaos
    let chaosSuccesses = 0;
    for (let i = 0; i < 20; i++) {
      try {
        await injectFailure(async () => 'ok');
        chaosSuccesses++;
      } catch {}
    }

    clearScenarios();

    // After chaos
    let recoverySuccesses = 0;
    for (let i = 0; i < 20; i++) {
      try {
        await injectFailure(async () => 'ok');
        recoverySuccesses++;
      } catch {}
    }

    assert.equal(recoverySuccesses, 20);
  });
});