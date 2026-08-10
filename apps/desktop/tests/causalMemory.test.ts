import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  createCausalMemoryState,
  recordCausalChain,
  findChainsByTrigger,
  findChainsByOutcome,
  getLessonsForQuery,
  predictOutcome,
  formatCausalChain,
  serializeCausalMemory,
  type CausalMemoryState,
} from '../src/lib/causalMemory.ts';

test('recordCausalChain adds a chain', () => {
  const state = createCausalMemoryState();
  const chain = recordCausalChain(state, {
    trigger: 'user reports build failure',
    goal: 'get build passing',
    approach: ['read error log', 'find culprit', 'patch code', 'rerun build'],
    outcome: 'success',
    lesson: 'read the error log first',
    tags: ['build', 'debug'],
  });
  assert.equal(state.chains.length, 1);
  assert.equal(chain.occurrences, 1);
  assert.ok(chain.id.startsWith('causal-'));
});

test('recordCausalChain merges causally similar chains', () => {
  const state = createCausalMemoryState();
  recordCausalChain(state, {
    trigger: 'user reports build failure',
    goal: 'get build passing',
    approach: ['read error log'],
    outcome: 'success',
  });
  const merged = recordCausalChain(state, {
    trigger: 'user reports build failing',
    goal: 'make build pass',
    approach: ['read error log', 'check config'],
    outcome: 'success',
  });
  assert.equal(state.chains.length, 1, 'similar chains should merge');
  assert.equal(merged.occurrences, 2);
  assert.ok(merged.approach.includes('check config'), 'approaches should combine');
});

test('recordCausalChain does not merge different outcomes', () => {
  const state = createCausalMemoryState();
  recordCausalChain(state, { trigger: 'build fails', goal: 'fix build', approach: ['a'], outcome: 'fail' });
  recordCausalChain(state, { trigger: 'build fails', goal: 'fix build', approach: ['a'], outcome: 'success' });
  assert.equal(state.chains.length, 2);
});

test('findChainsByTrigger returns relevant chains ranked by similarity', () => {
  const state = createCausalMemoryState();
  recordCausalChain(state, { trigger: 'user reports build failure', goal: 'fix build', approach: ['a'], outcome: 'fail' });
  recordCausalChain(state, { trigger: 'deploy to production', goal: 'ship release', approach: ['b'], outcome: 'success' });
  const found = findChainsByTrigger(state, 'build broke');
  assert.ok(found.length >= 1);
  assert.match(found[0].trigger, /build/i);
});

test('findChainsByOutcome filters by outcome', () => {
  const state = createCausalMemoryState();
  recordCausalChain(state, { trigger: 'a', goal: 'x', approach: [], outcome: 'fail', confidence: 0.9 });
  recordCausalChain(state, { trigger: 'b', goal: 'y', approach: [], outcome: 'success', confidence: 0.6 });
  const fails = findChainsByOutcome(state, 'fail');
  assert.equal(fails.length, 1);
  assert.equal(fails[0].trigger, 'a');
});

test('getLessonsForQuery returns lessons relevant to the query', () => {
  const state = createCausalMemoryState();
  recordCausalChain(state, {
    trigger: 'yaml parse error',
    goal: 'parse config',
    approach: ['check indentation'],
    outcome: 'fail',
    lesson: 'yaml indentation must be consistent',
  });
  recordCausalChain(state, {
    trigger: 'deploy',
    goal: 'deploy app',
    approach: ['build'],
    outcome: 'success',
    lesson: 'always build before deploy',
  });
  const lessons = getLessonsForQuery(state, 'yaml parse');
  assert.ok(lessons.length >= 1);
  assert.match(lessons[0].lesson, /yaml/i);
});

test('predictOutcome predicts from past causal arcs', () => {
  const state = createCausalMemoryState();
  for (let i = 0; i < 3; i++) {
    recordCausalChain(state, {
      trigger: 'migrate database schema',
      goal: 'schema migration',
      approach: ['backup', 'migrate'],
      outcome: 'fail',
      confidence: 0.8,
    });
  }
  recordCausalChain(state, {
    trigger: 'migrate database schema',
    goal: 'schema migration',
    approach: ['backup', 'migrate'],
    outcome: 'success',
    confidence: 0.5,
  });
  const prediction = predictOutcome(state, 'migrate the database schema');
  assert.ok(prediction, 'expected a prediction');
  assert.equal(prediction!.outcome, 'fail');
  assert.ok(prediction!.confidence > 0.5);
});

test('predictOutcome returns null with no matches', () => {
  const state = createCausalMemoryState();
  assert.equal(predictOutcome(state, 'something never seen'), null);
});

test('formatCausalChain produces readable narrative', () => {
  const state = createCausalMemoryState();
  const chain = recordCausalChain(state, {
    trigger: 'app crashes on startup',
    goal: 'fix startup crash',
    approach: ['reproduce', 'check logs'],
    outcome: 'fail',
    lesson: 'check env vars first',
  });
  const text = formatCausalChain(chain);
  assert.match(text, /Trigger: app crashes on startup/);
  assert.match(text, /Outcome: fail/);
  assert.match(text, /Lesson: check env vars first/);
});

test('serializeCausalMemory round-trips', () => {
  const state = createCausalMemoryState();
  recordCausalChain(state, { trigger: 't', goal: 'g', approach: ['a'], outcome: 'success' });
  const json = serializeCausalMemory(state);
  const parsed = JSON.parse(json) as CausalMemoryState;
  assert.equal(parsed.chains.length, 1);
  assert.equal(parsed.chains[0].trigger, 't');
});

test('MAX_CHAINS cap enforced', () => {
  const state = createCausalMemoryState();
  for (let i = 0; i < 150; i++) {
    recordCausalChain(state, {
      trigger: `unique trigger ${i}`,
      goal: `unique goal ${i}`,
      approach: ['x'],
      outcome: i % 2 === 0 ? 'success' : 'fail',
    });
  }
  assert.ok(state.chains.length <= 120, `expected cap 120, got ${state.chains.length}`);
});
