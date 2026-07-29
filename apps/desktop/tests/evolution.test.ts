import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  createEvolutionState,
  evolve,
  selectBestPrompt,
  selectBestRoutine,
  updateRoutineFitness,
  getPersonalityTraits,
  getEvolutionProgress,
} from '../src/lib/evolution.ts';

test('createEvolutionState returns valid initial state with 3 prompt variants', () => {
  const state = createEvolutionState();
  assert.equal(state.promptVariants.length, 3);
});

test('createEvolutionState starts at generation 1', () => {
  const state = createEvolutionState();
  assert.equal(state.generation, 1);
});

test('createEvolutionState has routine population', () => {
  const state = createEvolutionState();
  assert.ok(state.routinePopulation.length > 0);
});

test('evolve does not progress with insufficient data', () => {
  const state = createEvolutionState();
  const result = evolve(state, [], []);
  assert.equal(result.generation, 1);
});

test('evolve progresses to next generation with sufficient data', () => {
  const state = createEvolutionState();
  const result = evolve(state, [0.8, 0.9, 0.7], [0.6, 0.8, 0.5]);
  assert.equal(result.generation, state.generation + 1);
});

test('evolve records log entries', () => {
  const state = createEvolutionState();
  const result = evolve(state, [0.8, 0.9, 0.7], [0.6, 0.8, 0.5]);
  assert.ok(result.evolutionLog.length > 0);
});

test('evolve tracks mutations over multiple generations', () => {
  const state = createEvolutionState();
  for (let i = 0; i < 5; i++) {
    evolve(state, [0.8, 0.9, 0.7], [0.6, 0.8, 0.5]);
  }
  assert.ok(state.mutations > 0);
});

test('evolve respects max generations cap', () => {
  const state = createEvolutionState();
  state.generation = 1000;
  for (let i = 0; i < 10; i++) {
    evolve(state, [0.8, 0.9, 0.7], [0.6, 0.8, 0.5]);
  }
  assert.equal(state.generation, 1000);
});

test('selectBestPrompt returns a prompt variant with name and text', () => {
  const state = createEvolutionState();
  const best = selectBestPrompt(state, { systemPromptWeight: 0.5 });
  assert.ok(best.name);
  assert.ok(best.text.length > 0);
});

test('selectBestRoutine returns null when no routines match', () => {
  const state = createEvolutionState();
  const result = selectBestRoutine(state, 'nonexistent');
  assert.equal(result, null);
});

test('selectBestRoutine returns a routine by name', () => {
  const state = createEvolutionState();
  const result = selectBestRoutine(state, 'morning');
  assert.ok(result);
  assert.equal(result.name, 'morning');
});

test('updateRoutineFitness updates fitness for existing routine', () => {
  const state = createEvolutionState();
  const initialFitness = state.routinePopulation[0].fitness;
  updateRoutineFitness(state, 'morning', 0.9);
  assert.notEqual(state.routinePopulation[0].fitness, initialFitness);
});

test('getPersonalityTraits returns all personality traits', () => {
  const state = createEvolutionState();
  const traits = getPersonalityTraits(state);
  assert.ok('enthusiasm' in traits);
  assert.ok('empathy' in traits);
  assert.ok('directness' in traits);
  assert.ok('humor' in traits);
  assert.ok('patience' in traits);
});

test('getPersonalityTraits all trait values in [0, 1]', () => {
  const state = createEvolutionState();
  const traits = getPersonalityTraits(state);
  for (const value of Object.values(traits)) {
    assert.ok(value >= 0, 'trait should be >= 0');
    assert.ok(value <= 1, 'trait should be <= 1');
  }
});

test('getEvolutionProgress returns valid progress values', () => {
  const state = createEvolutionState();
  const progress = getEvolutionProgress(state);
  assert.equal(progress.generation, 1);
  assert.equal(progress.promptVariants, 3);
  assert.ok(progress.routines > 0);
});

test('evolve with only feedbackScores progresses', () => {
  const state = createEvolutionState();
  const result = evolve(state, [0.8, 0.9], []);
  assert.equal(result.generation, 2);
});

test('evolve with only routineScores progresses', () => {
  const state = createEvolutionState();
  const result = evolve(state, [], [0.8, 0.9]);
  assert.equal(result.generation, 2);
});

test('evolve preserves prompt variant count', () => {
  const state = createEvolutionState();
  const result = evolve(state, [0.8, 0.9, 0.7], [0.6, 0.8, 0.5]);
  assert.ok(result.promptVariants.length > 0);
});

test('evolve preserves routine population size', () => {
  const state = createEvolutionState();
  const result = evolve(state, [0.8, 0.9, 0.7], [0.6, 0.8, 0.5]);
  assert.ok(result.routinePopulation.length > 0);
});
