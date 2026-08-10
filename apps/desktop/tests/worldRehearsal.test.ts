import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  rehearseToolCall,
  shouldRehearse,
  DEFAULT_REHEARSAL_CONFIG,
} from '../src/lib/worldRehearsal.ts';

test('rehearseToolCall returns null when disabled', async () => {
  const config = { ...DEFAULT_REHEARSAL_CONFIG, enabled: false };
  const result = await rehearseToolCall(
    'test.tool',
    {},
    config,
    () => null,
    () => null,
    async () => 'simulated'
  );
  assert.equal(result, null);
});

test('rehearseToolCall returns null in skip mode', async () => {
  const config = { ...DEFAULT_REHEARSAL_CONFIG, mode: 'skip' as const };
  const result = await rehearseToolCall(
    'test.tool',
    {},
    config,
    () => null,
    () => null,
    async () => 'simulated'
  );
  assert.equal(result, null);
});

test('rehearseToolCall uses causal memory when confidence high enough', async () => {
  const config = { ...DEFAULT_REHEARSAL_CONFIG, mode: 'light' as const, confidenceThreshold: 0.5 };
  const result = await rehearseToolCall(
    'test.tool',
    {},
    config,
    () => ({ outcome: 'cached result', confidence: 0.9 }),
    () => null,
    async () => 'simulated'
  );
  assert.ok(result !== null);
  assert.equal(result!.source, 'causal-memory');
  assert.equal(result!.predictedResponse, 'cached result');
});

test('rehearseToolCall falls back to world graph when causal missing', async () => {
  const config = { ...DEFAULT_REHEARSAL_CONFIG, mode: 'light' as const };
  const result = await rehearseToolCall(
    'test.tool',
    {},
    config,
    () => null,
    () => 'graph context',
    async () => 'simulated'
  );
  assert.ok(result !== null);
  assert.equal(result!.source, 'world-graph');
});

test('rehearseToolCall uses llm simulation in full mode', async () => {
  const config = { ...DEFAULT_REHEARSAL_CONFIG, mode: 'full' as const };
  const result = await rehearseToolCall(
    'test.tool',
    {},
    config,
    () => null,
    () => null,
    async () => 'llm simulated'
  );
  assert.ok(result !== null);
  assert.equal(result!.source, 'llm-simulation');
  assert.equal(result!.predictedResponse, 'llm simulated');
});

test('shouldRehearse returns true for high-stakes tools', () => {
  assert.ok(shouldRehearse('goal.create', {}, DEFAULT_REHEARSAL_CONFIG));
  assert.ok(shouldRehearse('memory.record', {}, DEFAULT_REHEARSAL_CONFIG));
});

test('shouldRehearse returns true for destructive input', () => {
  assert.ok(shouldRehearse('some.tool', { action: 'delete' }, DEFAULT_REHEARSAL_CONFIG));
  assert.ok(shouldRehearse('some.tool', { action: 'remove' }, DEFAULT_REHEARSAL_CONFIG));
});

test('shouldRehearse returns false for normal tools', () => {
  assert.ok(!shouldRehearse('chat.send', { message: 'hi' }, DEFAULT_REHEARSAL_CONFIG));
});
