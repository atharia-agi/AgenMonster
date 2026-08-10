import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  createBeliefState,
  computeTurnCredits,
  reshapeAdvantage,
  recordTrajectoryCredit,
  getTrajectoryCredit,
} from '../src/lib/creditAssignment.ts';

test('createBeliefState returns initialized state', () => {
  const state = createBeliefState();
  assert.equal(state.B0, 0.5);
  assert.equal(state.ck, 0);
  assert.equal(state.gamma, 0.9);
  assert.equal(state.lambda_, 0.5);
  assert.equal(state.b, 0.3);
});

test('computeTurnCredits assigns credit to turns', () => {
  const beliefState = createBeliefState(0.5, 0.9, 0.5, 0.3);
  const logProbs = [
    [0.1, 0.1],
    [0.5, 0.5],
    [0.01, 0.01],
  ];
  const result = computeTurnCredits(beliefState, logProbs, 1.0);

  assert.equal(result.turnCredits.length, 3);
  assert.ok(Array.isArray(result.pivotalTurns));
  assert.ok(typeof result.totalAdvantage === 'number');
});

test('computeTurnCredits handles empty logProbs', () => {
  const beliefState = createBeliefState();
  const result = computeTurnCredits(beliefState, [], 1.0);
  assert.equal(result.turnCredits.length, 0);
  assert.equal(result.pivotalTurns.length, 0);
  assert.equal(result.totalAdvantage, 0);
});

test('reshapeAdvantage scales with deltaBelief', () => {
  const base = 1.0;
  const small = reshapeAdvantage(base, 0.01, 0.5, 0.3);
  const large = reshapeAdvantage(base, 0.5, 0.5, 0.3);
  assert.ok(large !== small);
});

test('record and retrieve trajectory credit', () => {
  const beliefState = createBeliefState();
  const logProbs = [[0.1], [0.2]];
  const result = computeTurnCredits(beliefState, logProbs, 1.0);

  assert.ok(result.turnCredits.length === 2);
  assert.ok(result.turnCredits[0].credit !== 0);
  assert.ok(typeof result.turnCredits[0].pivotal === 'boolean');
});
