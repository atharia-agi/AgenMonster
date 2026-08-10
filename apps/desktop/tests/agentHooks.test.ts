import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  AgentHooks,
  type HookContext,
} from '../src/lib/agentHooks.ts';

describe('AgentHooks', () => {
  it('allows read-only tools in default mode', async () => {
    const hooks = new AgentHooks({ mode: 'default' });
    const result = await hooks.onPreToolUse('memory.recall', { query: 'test' }, 'tool-1');
    assert.strictEqual(result.permissionDecision, 'allow');
  });

  it('denies disallowed tools', async () => {
    const hooks = new AgentHooks({
      mode: 'default',
      disallowedTools: ['dangerous.tool'],
    });
    const result = await hooks.onPreToolUse('dangerous.tool', { foo: 'bar' }, 'tool-2');
    assert.strictEqual(result.permissionDecision, 'deny');
  });

  it('denies tools matching deny rules', async () => {
    const hooks = new AgentHooks({
      mode: 'default',
      denyRules: ['browseros\\.execute_action'],
    });
    const result = await hooks.onPreToolUse('browseros.execute_action', { action: 'delete' }, 'tool-3');
    assert.strictEqual(result.permissionDecision, 'deny');
  });

  it('asks for edit tools in default mode', async () => {
    const hooks = new AgentHooks({ mode: 'default' });
    const result = await hooks.onPreToolUse('memory.record', { key: 'x', value: 'y' }, 'tool-4');
    assert.strictEqual(result.permissionDecision, 'ask');
  });

  it('allows all tools in bypassPermissions mode', async () => {
    const hooks = new AgentHooks({ mode: 'bypassPermissions' });
    const result = await hooks.onPreToolUse('dangerous.tool', { foo: 'bar' }, 'tool-5');
    assert.strictEqual(result.permissionDecision, 'allow');
  });

  it('asks for unknown tools in acceptEdits mode', async () => {
    const hooks = new AgentHooks({ mode: 'acceptEdits' });
    const result = await hooks.onPreToolUse('unknown.tool', {}, 'tool-6');
    assert.strictEqual(result.permissionDecision, 'ask');
  });

  it('allows file edits in acceptEdits mode', async () => {
    const hooks = new AgentHooks({ mode: 'acceptEdits' });
    const result = await hooks.onPreToolUse('memory.record', { key: 'x', value: 'y' }, 'tool-7');
    assert.strictEqual(result.permissionDecision, 'allow');
  });

  it('allows read-only tools in plan mode', async () => {
    const hooks = new AgentHooks({ mode: 'plan' });
    const result = await hooks.onPreToolUse('memory.recall', { query: 'test' }, 'tool-8');
    assert.strictEqual(result.permissionDecision, 'allow');
  });

  it('asks for edits in plan mode', async () => {
    const hooks = new AgentHooks({ mode: 'plan' });
    const result = await hooks.onPreToolUse('memory.record', { key: 'x', value: 'y' }, 'tool-9');
    assert.strictEqual(result.permissionDecision, 'ask');
  });

  it('uses canUseTool callback for decision', async () => {
    const hooks = new AgentHooks({
      mode: 'default',
      canUseTool: async (name) => name === 'allowed.tool' ? 'allow' : 'deny',
    });
    const result = await hooks.onPreToolUse('allowed.tool', {}, 'tool-10');
    assert.strictEqual(result.permissionDecision, 'allow');
    const denied = await hooks.onPreToolUse('blocked.tool', {}, 'tool-11');
    assert.strictEqual(denied.permissionDecision, 'deny');
  });

  it('runs PreToolUse hooks and respects deny decision', async () => {
    const hooks = new AgentHooks({
      mode: 'default',
      hooks: {
        PreToolUse: [
          {
            matcher: 'blocked.tool',
            hooks: [
              async (): Promise<{ permissionDecision: 'deny'; permissionDecisionReason: string }> => ({
                permissionDecision: 'deny',
                permissionDecisionReason: 'Blocked by custom hook',
              }),
            ],
          },
        ],
      },
    });
    const result = await hooks.onPreToolUse('blocked.tool', {}, 'tool-12');
    assert.strictEqual(result.permissionDecision, 'deny');
    assert.strictEqual(result.permissionDecisionReason, 'Blocked by custom hook');
  });

  it('runs PostToolUse hooks after execution', async () => {
    let hookCalled = false;
    const hooks = new AgentHooks({
      mode: 'default',
      hooks: {
        PostToolUse: [
          {
            matcher: 'memory.recall',
            hooks: [
              async () => {
                hookCalled = true;
                return {};
              },
            ],
          },
        ],
      },
    });
    await hooks.onPostToolUse('memory.recall', { query: 'test' }, { ok: true, data: [] }, 'tool-13');
    assert.strictEqual(hookCalled, true);
  });

  it('wildcard matcher matches all tools', async () => {
    let called = false;
    const hooks = new AgentHooks({
      mode: 'default',
      hooks: {
        PreToolUse: [
          {
            matcher: '*',
            hooks: [
              async (): Promise<{ permissionDecision: 'allow' }> => {
                called = true;
                return { permissionDecision: 'allow' };
              },
            ],
          },
        ],
      },
    });
    await hooks.onPreToolUse('any.tool', {}, 'tool-14');
    assert.strictEqual(called, true);
  });

  it('notifies via Notification hooks', async () => {
    let notified = false;
    const hooks = new AgentHooks({
      mode: 'default',
      hooks: {
        Notification: [
          {
            matcher: '*',
            hooks: [
              async () => {
                notified = true;
                return {};
              },
            ],
          },
        ],
      },
    });
    await hooks.onNotification('test message', 'info');
    assert.strictEqual(notified, true);
  });

  it('respects ask rules', async () => {
    const hooks = new AgentHooks({
      mode: 'default',
      askRules: ['sensitive\\.tool'],
    });
    const result = await hooks.onPreToolUse('sensitive.tool', {}, 'tool-15');
    assert.strictEqual(result.permissionDecision, 'ask');
  });

  it('dontAsk mode allows only allowedTools', async () => {
    const hooks = new AgentHooks({
      mode: 'dontAsk',
      allowedTools: ['memory.recall', 'memory.record'],
    });
    const allowed = await hooks.onPreToolUse('memory.recall', { query: 'test' }, 'tool-16');
    assert.strictEqual(allowed.permissionDecision, 'allow');
    const blocked = await hooks.onPreToolUse('browseros.click', { element: 1, page: 0 }, 'tool-17');
    assert.strictEqual(blocked.permissionDecision, 'deny');
  });

  it('auto mode allows safe tools but asks for dangerous ones', async () => {
    const hooks = new AgentHooks({ mode: 'auto' });
    const safe = await hooks.onPreToolUse('memory.recall', { query: 'test' }, 'tool-18');
    assert.strictEqual(safe.permissionDecision, 'allow');
    const dangerous = await hooks.onPreToolUse('browseros.execute_action', { action: 'delete' }, 'tool-19');
    assert.strictEqual(dangerous.permissionDecision, 'ask');
  });
});
