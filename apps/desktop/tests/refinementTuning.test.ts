import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  createRefinementCorpus,
  addRefinementPair,
  getRefinementsByContext,
  getTopRefinements,
  persistCorpus,
  loadCorpus,
} from '../src/lib/refinementTuning.ts';

test('createRefinementCorpus returns empty state', () => {
  const corpus = createRefinementCorpus();
  assert.equal(corpus.pairs.length, 0);
  assert.equal(corpus.totalRefinements, 0);
});

test('addRefinementPair increments count and updates successRate', () => {
  const corpus = createRefinementCorpus();
  addRefinementPair(corpus, {
    originalTrajectory: 'failed attempt',
    refinedTrajectory: 'fixed attempt',
    outcome: 'success',
    context: 'test context',
    source: 'self-correct',
  });
  assert.equal(corpus.pairs.length, 1);
  assert.equal(corpus.totalRefinements, 1);
  assert.equal(corpus.successRate, 1);
});

test('addRefinementPair caps at MAX_PAIRS', () => {
  const corpus = createRefinementCorpus();
  for (let i = 0; i < 600; i++) {
    addRefinementPair(corpus, {
      originalTrajectory: `failed ${i}`,
      refinedTrajectory: `refined ${i}`,
      outcome: i % 2 === 0 ? 'success' : 'failure',
      context: 'test',
      source: 'self-correct',
    });
  }
  assert.ok(corpus.pairs.length <= 500);
});

test('getRefinementsByContext filters by context', () => {
  const corpus = createRefinementCorpus();
  addRefinementPair(corpus, {
    originalTrajectory: 'a',
    refinedTrajectory: 'b',
    outcome: 'success',
    context: 'deploy to aws',
    source: 'self-correct',
  });
  addRefinementPair(corpus, {
    originalTrajectory: 'c',
    refinedTrajectory: 'd',
    outcome: 'success',
    context: 'write code',
    source: 'self-correct',
  });

  const results = getRefinementsByContext(corpus, 'deploy', 5);
  assert.equal(results.length, 1);
  assert.equal(results[0].context, 'deploy to aws');
});

test('getTopRefinements returns only success outcomes', () => {
  const corpus = createRefinementCorpus();
  addRefinementPair(corpus, {
    originalTrajectory: 'a',
    refinedTrajectory: 'b',
    outcome: 'success',
    context: 'ctx',
    source: 'self-correct',
  });
  addRefinementPair(corpus, {
    originalTrajectory: 'c',
    refinedTrajectory: 'd',
    outcome: 'failure',
    context: 'ctx',
    source: 'self-correct',
  });

  const top = getTopRefinements(corpus, 10);
  assert.equal(top.length, 1);
  assert.equal(top[0].outcome, 'success');
});
