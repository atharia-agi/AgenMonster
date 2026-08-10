import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  registerSubagent,
  unregisterSubagent,
  getSubagentSpec,
  getAllSubagentSpecs,
  spawnSubagent,
  BUILTIN_SUBAGENTS,
} from '../src/lib/subagent.ts';

describe('subagent', () => {
  it('registerSubagent stores spec and handler', () => {
    registerSubagent(
      { id: 'test-agent', name: 'Test', description: 'Test agent', systemPrompt: 'You are test', tools: ['memory.recall'] },
      async () => ({
        subagentId: 'test-agent',
        status: 'success',
        output: 'done',
        toolCalls: [],
        turnsUsed: 1,
        startedAt: Date.now(),
        finishedAt: Date.now(),
      })
    );
    const spec = getSubagentSpec('test-agent');
    assert.ok(spec);
    assert.strictEqual(spec.name, 'Test');
  });

  it('getSubagentSpec returns undefined for unknown id', () => {
    const spec = getSubagentSpec('nonexistent');
    assert.strictEqual(spec, undefined);
  });

  it('spawnSubagent calls handler and returns result', async () => {
    registerSubagent(
      { id: 'echo', name: 'Echo', description: 'Echoes input', systemPrompt: 'Echo', tools: [] },
      async (_spec, _ctx, input) => ({
        subagentId: 'echo',
        status: 'success' as const,
        output: input,
        toolCalls: [],
        turnsUsed: 1,
        startedAt: Date.now(),
        finishedAt: Date.now(),
      })
    );
    const result = await spawnSubagent('echo', 'hello world');
    assert.strictEqual(result.status, 'success');
    assert.strictEqual(result.output, 'hello world');
  });

  it('spawnSubagent returns error for unknown subagent', async () => {
    const result = await spawnSubagent('nonexistent', 'input');
    assert.strictEqual(result.status, 'error');
    assert.ok(result.error?.includes('Unknown subagent'));
  });

  it('unregisterSubagent removes spec and handler', () => {
    registerSubagent(
      { id: 'temp', name: 'Temp', description: 'Temporary', systemPrompt: 'Temp', tools: [] },
      async () => ({
        subagentId: 'temp',
        status: 'success',
        output: '',
        toolCalls: [],
        turnsUsed: 0,
        startedAt: Date.now(),
        finishedAt: Date.now(),
      })
    );
    unregisterSubagent('temp');
    assert.strictEqual(getSubagentSpec('temp'), undefined);
  });

  it('getAllSubagentSpecs returns all registered specs', () => {
    const all = getAllSubagentSpecs();
    assert.ok(all.some((s) => s.id === 'researcher'));
    assert.ok(all.some((s) => s.id === 'coder'));
    assert.ok(all.some((s) => s.id === 'planner'));
    assert.ok(all.some((s) => s.id === 'reviewer'));
  });

  it('builtin subagents have correct structure', () => {
    for (const agent of BUILTIN_SUBAGENTS) {
      assert.ok(agent.id.length > 0);
      assert.ok(agent.name.length > 0);
      assert.ok(agent.description.length > 0);
      assert.ok(agent.systemPrompt.length > 0);
      assert.ok(Array.isArray(agent.tools));
    }
  });

  it('spawnSubagent with context passes context to handler', async () => {
    let receivedCtx: Record<string, unknown> = {};
    registerSubagent(
      { id: 'ctx-test', name: 'Context Test', description: 'Test', systemPrompt: 'Test', tools: [] },
      async (_spec, ctx) => {
        receivedCtx = ctx as Record<string, unknown>;
        return {
          subagentId: 'ctx-test',
          status: 'success',
          output: '',
          toolCalls: [],
          turnsUsed: 0,
          startedAt: Date.now(),
          finishedAt: Date.now(),
        };
      }
    );
    await spawnSubagent('ctx-test', 'input', { parentGoalId: 'goal-1', workingDir: '/test' });
    assert.strictEqual(receivedCtx.parentGoalId, 'goal-1');
    assert.strictEqual(receivedCtx.workingDir, '/test');
  });

  it('spawnSubagent records result in registry', async () => {
    registerSubagent(
      { id: 'record-test', name: 'Record', description: 'Test', systemPrompt: 'Test', tools: [] },
      async () => ({
        subagentId: 'record-test',
        status: 'success',
        output: 'done',
        toolCalls: [],
        turnsUsed: 2,
        startedAt: Date.now(),
        finishedAt: Date.now(),
      })
    );
    const result = await spawnSubagent('record-test', 'test');
    assert.strictEqual(result.turnsUsed, 2);
    assert.strictEqual(result.status, 'success');
  });

  it('spawnSubagent handles handler throwing error', async () => {
    registerSubagent(
      { id: 'error-test', name: 'Error Test', description: 'Test', systemPrompt: 'Test', tools: [] },
      async () => {
        throw new Error('handler failed');
      }
    );
    const result = await spawnSubagent('error-test', 'input');
    assert.strictEqual(result.status, 'error');
    assert.ok(result.error?.includes('handler failed'));
  });
});
