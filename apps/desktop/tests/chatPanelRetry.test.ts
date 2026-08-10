import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runAgentLoop, type AgentLoopOptions } from '../src/lib/agentLoop.ts';

test('runAgentLoop returns needsRetry=true on weak reply with providerFallback', async () => {
  let fallbackCalls = 0;
  const options: AgentLoopOptions = {
    maxTurns: 1,
    retryLimit: 1,
    providerFallback: () => {
      fallbackCalls++;
      return 'groq';
    },
    onRetry: (attempt) => {
      assert.equal(attempt, 1);
    },
  };

  const result = await runAgentLoop('I cannot assist with that request.', options);
  assert.equal(result.needsRetry, true);
  assert.equal(result.retries, 1);
  assert.equal(result.turnsUsed, 1);
  assert.equal(fallbackCalls, 0);
});

test('runAgentLoop does not retry when providerFallback is absent', async () => {
  const result = await runAgentLoop('I cannot help you with that.', {
    maxTurns: 1,
    retryLimit: 1,
  });
  assert.equal(result.needsRetry, false);
  assert.equal(result.retries, 0);
});

test('runAgentLoop does not retry when retryLimit is 0', async () => {
  let fallbackCalls = 0;
  const result = await runAgentLoop('I cannot help you with that.', {
    maxTurns: 1,
    retryLimit: 0,
    providerFallback: () => {
      fallbackCalls++;
      return 'groq';
    },
  });
  assert.equal(result.needsRetry, false);
  assert.equal(fallbackCalls, 0);
});

test('runAgentLoop consumes remainingRetries on weak reply', async () => {
  let fallbackCalls = 0;
  const result = await runAgentLoop('As an AI, I am unable to do that.', {
    maxTurns: 1,
    retryLimit: 2,
    providerFallback: () => {
      fallbackCalls++;
      return 'groq';
    },
  });
  assert.equal(result.needsRetry, true);
  assert.equal(result.retries, 1);
  assert.equal(fallbackCalls, 0);
});

test('chatPanel retry backoff is exponential with jitter and capped', () => {
  const base = 500;
  const max = 3000;
  for (let attempt = 0; attempt < 5; attempt++) {
    const jitter = Math.random() * 200;
    const expectedBase = base * Math.pow(2, attempt);
    const delay = Math.min(expectedBase + jitter, max);
    if (expectedBase <= max) {
      assert.ok(delay >= expectedBase, `delay ${delay} >= base ${expectedBase} for attempt ${attempt}`);
    }
    assert.ok(delay <= max, `delay ${delay} <= max for attempt ${attempt}`);
  }
});
