// Benchmark 3: Goal Parsing from Text
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildGoalFromText, isGoalIntent, deriveGoalTitle, splitGoalSteps } from '../../src/lib/goals.ts';
import { runBenchmark, checkBudgets } from './harness.ts';

const goalTexts = [
  'deploy to aws',
  'build the app and run tests',
  'fix the login bug | add unit tests | deploy to staging',
  'please refactor the user service',
  'can you help me migrate to typescript',
  'I want to implement a new feature for the dashboard',
  'setup CI/CD pipeline | configure environments | run smoke tests',
  'optimize the database queries and add indexes',
  'just chatting about the weather',
  'what is the capital of france',
];

test('bench: goal parsing from text', async () => {
  const results = await runBenchmark({
    name: 'goal-parsing-from-text',
    fn: () => {
      for (const text of goalTexts) {
        buildGoalFromText(text);
      }
    },
    iterations: 10000,
    warmup: 1000,
  });
  
  assert.ok(checkBudgets(results), 'Budget exceeded for goal-parsing-from-text');
});

test('bench: goal intent detection', async () => {
  const results = await runBenchmark({
    name: 'goal-intent-detection',
    fn: () => {
      for (const text of goalTexts) {
        isGoalIntent(text);
      }
    },
    iterations: 50000,
    warmup: 5000,
  });
  
  assert.ok(checkBudgets(results), 'Budget exceeded for goal-intent-detection');
});

test('bench: goal title derivation', async () => {
  const results = await runBenchmark({
    name: 'goal-title-derivation',
    fn: () => {
      for (const text of goalTexts) {
        deriveGoalTitle(text);
      }
    },
    iterations: 50000,
    warmup: 5000,
  });
  
  assert.ok(checkBudgets(results), 'Budget exceeded for goal-title-derivation');
});

test('bench: goal step splitting', async () => {
  const stepTexts = [
    'step 1: build | step 2: test | step 3: deploy',
    '1. build the app 2. run tests 3. deploy to prod',
    'deploy to aws',
    'build | test | deploy | monitor',
  ];
  
  const results = await runBenchmark({
    name: 'goal-step-splitting',
    fn: () => {
      for (const text of stepTexts) {
        splitGoalSteps(text);
      }
    },
    iterations: 20000,
    warmup: 2000,
  });
  
  assert.ok(checkBudgets(results), 'Budget exceeded for goal-step-splitting');
});