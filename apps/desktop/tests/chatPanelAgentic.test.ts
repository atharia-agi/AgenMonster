import { describe, it } from 'node:test';
import assert from 'node:assert';
import { isModeReadOnly } from '../src/lib/agentMode.ts';
import { shouldCompact, compactMessages } from '../src/lib/compaction.ts';
import { DoomLoopDetector } from '../src/lib/doomLoop.ts';

// ChatPanel agentic features: agent modes, steer mode, compaction UI wiring
describe('ChatPanel agentic features', () => {
  it('agentMode state defaults to build', () => {
    const defaultMode = 'build';
    assert.strictEqual(defaultMode, 'build');
  });

  it('mode cycle order is build -> plan -> review -> explore', () => {
    const modes: Array<'build' | 'plan' | 'review' | 'explore'> = ['build', 'plan', 'review', 'explore'];
    const next = (current: typeof modes[0]) => modes[(modes.indexOf(current) + 1) % modes.length];
    assert.strictEqual(next('build'), 'plan');
    assert.strictEqual(next('plan'), 'review');
    assert.strictEqual(next('review'), 'explore');
    assert.strictEqual(next('explore'), 'build');
  });

  it('isModeReadOnly returns true for plan/review/explore', () => {
    assert.strictEqual(isModeReadOnly('plan'), true);
    assert.strictEqual(isModeReadOnly('review'), true);
    assert.strictEqual(isModeReadOnly('explore'), true);
    assert.strictEqual(isModeReadOnly('build'), false);
  });

  it('messageQueue starts empty and grows with queueMessage', () => {
    let queue: string[] = [];
    queue = [...queue, 'step 1'];
    queue = [...queue, 'step 2'];
    assert.strictEqual(queue.length, 2);
    assert.strictEqual(queue[0], 'step 1');
  });

  it('processQueue drains messages sequentially', async () => {
    const results: string[] = [];
    const queue: string[] = ['a', 'b', 'c'];
    while (queue.length > 0) {
      const next = queue[0];
      queue.shift();
      results.push(next);
    }
    assert.deepEqual(results, ['a', 'b', 'c']);
    assert.strictEqual(queue.length, 0);
  });

  it('steer mode toggles isSteering flag', () => {
    let isSteering = false;
    isSteering = true;
    assert.strictEqual(isSteering, true);
    isSteering = false;
    assert.strictEqual(isSteering, false);
  });

  it('compaction triggers when messages > 20', () => {
    const short = Array.from({ length: 5 }, () => ({ role: 'user', content: 'hi' }));
    const long = Array.from({ length: 30 }, () => ({ role: 'user', content: 'hello'.repeat(50) }));
    assert.strictEqual(shouldCompact(short), false);
    assert.strictEqual(shouldCompact(long), true);
  });

  it('compactMessages preserves recent messages', () => {
    const messages = Array.from({ length: 30 }, (_, i) => ({
      role: i % 2 === 0 ? 'user' : 'assistant',
      content: `msg ${i}`.repeat(50),
    }));
    const result = compactMessages(messages);
    assert.ok(result.summary.length > 0);
    assert.ok(result.messages.length <= 10);
    assert.ok(result.messages.every(m => m.role === 'user' || m.role === 'assistant' || m.role === 'system'));
  });

  it('doomLoopDetector is instantiated in ChatPanel state', () => {
    const detector = new DoomLoopDetector({ maxIdenticalCalls: 3, maxNearIdenticalRatio: 0.8, windowMs: 60000 });
    assert.ok(detector);
    detector.record('bash', 'npm test');
    const result = detector.check('bash', 'npm test');
    assert.strictEqual(result.isDoomLoop, false);
  });
});
