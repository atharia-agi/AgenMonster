import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  assessTaskDifficulty,
  allocateComputeBudget,
  getComputeBudgetForQuery,
  getUserComputeDirective,
} from '../src/lib/adaptiveCompute.ts';

test('assessTaskDifficulty returns score in [0,1]', () => {
  const d = assessTaskDifficulty(100, 2, 0.5, 0.7, 0.2);
  assert.ok(d.score >= 0);
  assert.ok(d.score <= 1);
});

test('allocateComputeBudget returns quick for low difficulty', () => {
  const budget = allocateComputeBudget({ score: 0.1, factors: {} as any }, {
    turns: 20, depth: 'normal', tools: 10, modelTier: 'standard', reason: 'test',
  });
  assert.equal(budget.depth, 'quick');
  assert.ok(budget.turns <= 3);
});

test('allocateComputeBudget returns deep for high difficulty', () => {
  const budget = allocateComputeBudget({ score: 0.9, factors: {} as any }, {
    turns: 20, depth: 'normal', tools: 10, modelTier: 'standard', reason: 'test',
  });
  assert.equal(budget.depth, 'deep');
  assert.equal(budget.turns, 20);
});

test('getComputeBudgetForQuery scales with query length', () => {
  const short = getComputeBudgetForQuery('hi', 1, 0.1, 0.9, 0.8);
  const long = getComputeBudgetForQuery('a'.repeat(500), 5, 0.8, 0.3, 0.8);
  assert.ok(long.turns >= short.turns);
});

test('getUserComputeDirective parses /deep', () => {
  assert.equal(getUserComputeDirective('/deep analyze this'), 'deep');
});

test('getUserComputeDirective parses /quick', () => {
  assert.equal(getUserComputeDirective('/quick answer'), 'quick');
});

test('getUserComputeDirective returns null for normal messages', () => {
  assert.equal(getUserComputeDirective('hello there'), null);
});
