import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  createAdaptationState,
  recordInteraction,
  computeReward,
  adaptWeights,
  selectPromptVariant,
  updateBandit,
  decayWeights,
  generateReport,
  persistState,
  loadState,
} from '../src/lib/selfAdapt.ts';

const store: Record<string, string> = {};
(globalThis as any).localStorage = {
  getItem: (k: string) => (k in store ? store[k] : null),
  setItem: (k: string, v: string) => { store[k] = v; },
  removeItem: (k: string) => { delete store[k]; },
};

test('createAdaptationState returns valid initial weights', () => {
  const state = createAdaptationState();
  assert.equal(state.weights.moodEnergy, 0.5);
  assert.equal(state.weights.proactivity, 0.5);
  assert.equal(state.weights.systemPromptWeight, 0.5);
  assert.equal(state.weights.routineAdherence, 0.5);
  assert.equal(state.weights.responseStyle, 0.5);
});

test('createAdaptationState has 3 bandit arms', () => {
  const state = createAdaptationState();
  assert.equal(state.bandits.length, 3);
});

test('createAdaptationState has empty feedback log', () => {
  const state = createAdaptationState();
  assert.equal(state.feedbackLog.length, 0);
});

test('computeReward returns 1.0 for goal_complete', () => {
  const signal = { type: 'goal_complete' as const, timestamp: Date.now(), detail: 'goal1', value: 1 };
  assert.equal(computeReward(signal), 1.0);
});

test('computeReward returns -0.5 for goal_fail', () => {
  const signal = { type: 'goal_fail' as const, timestamp: Date.now(), detail: 'goal1', value: 0 };
  assert.equal(computeReward(signal), -0.5);
});

test('computeReward returns feedback value for feedback type', () => {
  const signal = { type: 'feedback' as const, timestamp: Date.now(), detail: 'thumbs up', value: 1 };
  assert.equal(computeReward(signal), 1);
});

test('computeReward returns 0.0 for message_sent', () => {
  const signal = { type: 'message_sent' as const, timestamp: Date.now(), detail: 'hi', value: 0 };
  assert.equal(computeReward(signal), 0.0);
});

test('recordInteraction adds entry to feedbackLog', () => {
  const state = createAdaptationState();
  recordInteraction(state, { type: 'goal_complete', timestamp: Date.now(), detail: 'test', value: 1 }, 0.8);
  assert.equal(state.feedbackLog.length, 1);
  assert.equal(state.feedbackLog[0].score, 0.8);
});

test('recordInteraction increments totalInteractions', () => {
  const state = createAdaptationState();
  recordInteraction(state, { type: 'session_start', timestamp: Date.now(), detail: 'session1', value: 1 }, 0.5);
  assert.equal(state.totalInteractions, 1);
});

test('recordInteraction caps feedback log to 500', () => {
  const state = createAdaptationState();
  for (let i = 0; i < 600; i++) {
    recordInteraction(state, { type: 'message_sent', timestamp: Date.now(), detail: `m${i}`, value: 0 }, 0);
  }
  assert.ok(state.feedbackLog.length <= 500);
});

test('adaptWeights returns unchanged with insufficient data', () => {
  const state = createAdaptationState();
  recordInteraction(state, { type: 'session_start', timestamp: Date.now(), detail: 's1', value: 1 }, 0.5);
  const newWeights = adaptWeights(state);
  assert.deepEqual(newWeights, state.weights);
});

test('adaptWeights adjusts weights with positive feedback', () => {
  const state = createAdaptationState();
  for (let i = 0; i < 10; i++) {
    recordInteraction(state, { type: 'goal_complete', timestamp: Date.now(), detail: `g${i}`, value: 1 }, 0.9);
  }
  const newWeights = adaptWeights(state);
  for (const key of ['moodEnergy', 'proactivity', 'systemPromptWeight', 'routineAdherence', 'responseStyle'] as const) {
    assert.ok(newWeights[key] >= 0, `${key} should be >= 0`);
    assert.ok(newWeights[key] <= 1, `${key} should be <= 1`);
  }
});

test('selectPromptVariant returns valid variant name', () => {
  const state = createAdaptationState();
  const variant = selectPromptVariant(state);
  assert.ok(['casual', 'focused', 'creative'].includes(variant));
});

test('selectPromptVariant prefers high-reward arms', () => {
  const state = createAdaptationState();
  state.bandits[0].pulls = 100;
  state.bandits[0].rewards = 90;
  state.bandits[1].pulls = 50;
  state.bandits[1].rewards = 10;
  state.bandits[2].pulls = 30;
  state.bandits[2].rewards = 5;
  const variant = selectPromptVariant(state);
  assert.equal(variant, 'casual');
});

test('updateBandit increments pulls and rewards', () => {
  const state = createAdaptationState();
  updateBandit(state, 'casual', 1.0);
  assert.equal(state.bandits[0].pulls, 1);
  assert.equal(state.bandits[0].rewards, 1.0);
});

test('decayWeights reduces all weights toward 0', () => {
  const state = createAdaptationState();
  decayWeights(state);
  assert.ok(state.weights.moodEnergy < 0.5);
  assert.ok(state.weights.proactivity < 0.5);
});

test('generateReport returns valid report', () => {
  const state = createAdaptationState();
  const report = generateReport(state);
  assert.equal(report.avgScore, 0);
  assert.equal(report.goalCompleteRate, 0);
  assert.equal(report.totalInteractions, 0);
  assert.ok(report.weights);
});

test('persistState stores and loadState retrieves data', () => {
  const data = { key: 'value', count: 42 };
  persistState('test_key_selfadapt', data);
  const loaded = loadState('test_key_selfadapt', { key: '', count: 0 });
  assert.equal(loaded.key, 'value');
  assert.equal(loaded.count, 42);
  try { store['test_key_selfadapt'] = ''; } catch {}
});

test('loadState returns fallback when key missing', () => {
  const loaded = loadState('nonexistent_key_xyz_12345', { value: 'default' });
  assert.equal(loaded.value, 'default');
});
