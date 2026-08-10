import { test } from 'node:test';
import assert from 'node:assert/strict';
import { orchestrate, type OrchestrationDeps, type ToolStep } from '../src/lib/toolOrchestration.ts';

const step = (tool: string): ToolStep => ({ tool, params: {} });

test('orchestrate commits when all steps pass', async () => {
  const deps: OrchestrationDeps = {
    dryRun: () => ({ ok: true }),
    execute: async () => ({ ok: true, data: { ok: true } }),
    verify: () => true,
  };
  const r = await orchestrate([step('a'), step('b')], deps);
  assert.equal(r.committed, true);
  assert.equal(r.outcomes.length, 6); // 3 per step: dry-run-ok, executed, verified
});

test('orchestrate rolls back on execute failure', async () => {
  let rolled = false;
  const deps: OrchestrationDeps = {
    dryRun: () => ({ ok: true }),
    execute: async (s) => (s.tool === 'b' ? { ok: false, error: 'boom' } : { ok: true, data: {} }),
    verify: () => true,
    rollback: async () => {
      rolled = true;
    },
  };
  const r = await orchestrate([step('a'), step('b')], deps);
  assert.equal(r.committed, false);
  assert.equal(rolled, true);
});

test('orchestrate blocks on dry-run failure', async () => {
  const deps: OrchestrationDeps = {
    dryRun: (s) => (s.tool === 'a' ? { ok: false, reason: 'unsafe' } : { ok: true }),
    execute: async () => ({ ok: true, data: {} }),
    verify: () => true,
  };
  const r = await orchestrate([step('a'), step('b')], deps);
  assert.equal(r.committed, false);
  assert.equal(r.outcomes[0].status, 'dry-run-fail');
});

test('orchestrate rolls back on verify failure', async () => {
  let rolled = false;
  const deps: OrchestrationDeps = {
    dryRun: () => ({ ok: true }),
    execute: async () => ({ ok: true, data: {} }),
    verify: () => false,
    rollback: async () => {
      rolled = true;
    },
  };
  const r = await orchestrate([step('a')], deps);
  assert.equal(r.committed, false);
  assert.equal(rolled, true);
});
