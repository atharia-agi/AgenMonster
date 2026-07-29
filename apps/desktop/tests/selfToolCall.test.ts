import { test } from 'node:test';
import assert from 'node:assert/strict';
import { handleTool, TOOLS } from '../src/lib/mcp.ts';
import { resetMemory, rememberEvent } from '../src/lib/memory.ts';

function fresh() {
  resetMemory();
}

test('TOOLS list has 19 entries after YOLO sweep', () => {
  assert.ok(TOOLS.length >= 19);
  assert.ok(TOOLS.includes('goal.list'));
  assert.ok(TOOLS.includes('goal.create'));
  assert.ok(TOOLS.includes('goal.markdone'));
  assert.ok(TOOLS.includes('goal.complete'));
});

test('handleTool goal.list returns goals array', () => {
  fresh();
  const r = handleTool('goal.list', {});
  assert.equal(r.ok, true);
  assert.ok(Array.isArray((r as any).data.goals));
});

test('handleTool goal.create accepts title + optional steps', () => {
  fresh();
  const r = handleTool('goal.create', { title: 'ship it' });
  assert.equal(r.ok, true);
  assert.equal((r as any).data.created.title, 'ship it');
  assert.ok((r as any).data.created.steps.length === 0);
});

test('handleTool goal.create parses pipe-separated steps', () => {
  fresh();
  const r = handleTool('goal.create', { title: 'deploy app', steps: 'write terraform|run plan|apply' });
  assert.equal(r.ok, true);
  assert.equal((r as any).data.created.steps.length, 3);
  assert.equal((r as any).data.created.steps[0].title, 'write terraform');
});

test('handleTool goal.markdone marks step by substring', () => {
  fresh();
  const created = (handleTool('goal.create', { title: 'do stuff', steps: 'alpha|beta|gamma' }) as any).data.created;
  const r = handleTool('goal.markdone', { goalId: created.id, stepTitle: 'be' });
  assert.equal(r.ok, true);
  assert.equal((r as any).data.goal.steps[1].done, true);
});

test('handleTool goal.complete marks entire goal done', () => {
  fresh();
  const created = (handleTool('goal.create', { title: 'done stuff' }) as any).data.created;
  const r = handleTool('goal.complete', { goalId: created.id });
  assert.equal(r.ok, true);
  assert.ok((r as any).data.goal.doneAt !== undefined);
});

test('handleTool goal.list returns progress ratios', () => {
  fresh();
  handleTool('goal.create', { title: 'ratio test', steps: 'a|b' });
  const r = handleTool('goal.list', {});
  assert.equal((r as any).data.goals[0].progress.total, 2);
  assert.equal((r as any).data.goals[0].progress.done, 0);
  assert.equal((r as any).data.goals[0].progress.ratio, 0);
});

test("handleTool goal.markdone is idempotent — marking done step again keeps done", () => {
  fresh();
  const created = (handleTool('goal.create', { title: 'idem test', steps: 'alpha|beta' }) as any).data.created;
  handleTool('goal.markdone', { goalId: created.id, stepTitle: 'alpha' });
  const afterFirst = (handleTool('goal.list', {}) as any).data;
  const goal = afterFirst.goals.find((g: any) => g.id === created.id);
  assert.equal(goal.progress.done, 1);
  handleTool('goal.markdone', { goalId: created.id, stepTitle: 'alpha' });
  const afterSecond = (handleTool('goal.list', {}) as any).data;
  const goal2 = afterSecond.goals.find((g: any) => g.id === created.id);
  assert.equal(goal2.progress.done, 1);
});

test("goal.create with empty steps creates goal with no steps", () => {
  fresh();
  const r = handleTool('goal.create', { title: 'no steps' });
  assert.equal(r.ok, true);
  assert.equal((r as any).data.created.steps.length, 0);
  assert.equal((r as any).data.created.title, 'no steps');
  resetMemory();
});
