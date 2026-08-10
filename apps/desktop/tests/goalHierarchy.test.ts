import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Goal } from '../src/lib/goals.ts';
import {
  toTiered,
  addGoalTiered,
  getGoalsByTier,
  buildGoalTree,
  decomposeIntoSteps,
  pickActiveTieredGoal,
  sortByTier,
} from '../src/lib/goalHierarchy.ts';
import { createDefaultSelfModel } from '../src/lib/identityModel.ts';

function makeGoal(title: string, id = title): Goal {
  return { id, title, steps: [], createdAt: Date.now(), source: 'manual' };
}

test('toTiered adds tier + parentId', () => {
  const g = toTiered(makeGoal('ship v2'), 'long', 'core-1');
  assert.equal(g.tier, 'long');
  assert.equal(g.parentId, 'core-1');
});

test('getGoalsByTier filters correctly', () => {
  let gs: ReturnType<typeof toTiered>[] = [];
  gs = addGoalTiered(gs, makeGoal('be helpful', 'c1'), 'core');
  gs = addGoalTiered(gs, makeGoal('learn daily', 'd1'), 'daily');
  assert.equal(getGoalsByTier(gs, 'core').length, 1);
  assert.equal(getGoalsByTier(gs, 'daily').length, 1);
});

test('buildGoalTree groups by parentId', () => {
  let gs: ReturnType<typeof toTiered>[] = [];
  gs = addGoalTiered(gs, makeGoal('core', 'c1'), 'core');
  gs = addGoalTiered(gs, makeGoal('sub', 'm1'), 'mid', 'c1');
  const tree = buildGoalTree(gs);
  assert.equal(tree.get(undefined)!.length, 1);
  assert.equal(tree.get('c1')!.length, 1);
});

test('decomposeIntoSteps splits piped text', () => {
  const steps = decomposeIntoSteps('Build site | write docs | launch');
  assert.equal(steps.length, 3);
});

test('pickActiveTieredGoal prefers on-mission + high tier', () => {
  const self = createDefaultSelfModel();
  let gs: ReturnType<typeof toTiered>[] = [];
  gs = addGoalTiered(gs, makeGoal('help user learn', 'c1'), 'core');
  gs = addGoalTiered(gs, makeGoal('random trivia', 'd1'), 'daily');
  const picked = pickActiveTieredGoal(gs, self);
  assert.equal(picked!.id, 'c1');
});

test('sortByTier orders core before daily', () => {
  let gs: ReturnType<typeof toTiered>[] = [];
  gs = addGoalTiered(gs, makeGoal('daily', 'd1'), 'daily');
  gs = addGoalTiered(gs, makeGoal('core', 'c1'), 'core');
  const sorted = sortByTier(gs);
  assert.equal(sorted[0].tier, 'core');
});
