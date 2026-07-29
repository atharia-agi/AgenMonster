import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildGoal, persistGoals, loadGoals, completeGoal } from '../src/lib/goals.ts';

const store: Record<string, string> = {};
(globalThis as any).localStorage = {
  getItem: (k: string) => (k in store ? store[k] : null),
  setItem: (k: string, v: string) => { store[k] = v; },
  removeItem: (k: string) => { delete store[k]; },
};

test('goals persist to localStorage on completeGoal', () => {
  const goal = buildGoal('deploy', ['review', 'test', 'ship']);
  const completed = completeGoal(goal);
  persistGoals([completed]);
  const raw = localStorage.getItem('agenmonster_goals');
  assert.ok(raw !== null);
  const parsed = JSON.parse(raw);
  assert.equal(parsed[0].title, 'deploy');
  assert.ok(parsed[0].doneAt > 0);
});

test('goals load from localStorage on session start', () => {
  const goal = buildGoal('refactor');
  persistGoals([goal]);
  const loaded = loadGoals();
  assert.equal(loaded.length, 1);
  assert.equal(loaded[0].title, 'refactor');
});

test('completed goals marked with doneAt timestamp', () => {
  const goal = buildGoal('test');
  const completed = completeGoal(goal);
  assert.ok(completed.doneAt !== undefined);
  assert.ok(completed.doneAt > 0);
});

test('localStorage corruption falls back to empty goals', () => {
  localStorage.setItem('agenmonster_goals', 'not json');
  const loaded = loadGoals();
  assert.deepEqual(loaded, []);
});

test('empty goals array persists and loads', () => {
  localStorage.removeItem('agenmonster_goals');
  persistGoals([]);
  const loaded = loadGoals();
  assert.deepEqual(loaded, []);
});