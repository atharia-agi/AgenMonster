import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getFactImportance, importanceDecay, importanceBump } from '../src/lib/importance.ts';

test('user.* keys have importance 3, never decay', () => {
  const imp = getFactImportance('user.language');
  assert.equal(imp.importance, 3);
  assert.equal(imp.minConfidence, 0.5);
  assert.equal(importanceDecay(0.05, imp.importance), 0);
});

test('project.* keys have importance 2', () => {
  const imp = getFactImportance('project.framework');
  assert.equal(imp.importance, 2);
  assert.equal(imp.minConfidence, 0.3);
});

test('tool.* keys have importance 1.5', () => {
  const imp = getFactImportance('tool.last');
  assert.equal(imp.importance, 1.5);
});

test('note.* keys have importance 1', () => {
  const imp = getFactImportance('note.tmp');
  assert.equal(imp.importance, 1);
});

test('unknown keys fallback to importance 1', () => {
  const imp = getFactImportance('other.key');
  assert.equal(imp.importance, 1);
});

test('importance scales decay and bump', () => {
  const i1 = importanceDecay(0.05, 3);
  const i2 = importanceDecay(0.05, 1);
  assert.equal(i1, 0);
  assert.ok(i1 < i2);
  assert.equal(importanceBump(0.04, 3), 0.04);
  assert.ok(importanceBump(0.04, 1) < importanceBump(0.04, 3));
});