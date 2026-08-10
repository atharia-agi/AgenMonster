import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runExperiment, abTest } from '../src/lib/experimentEngine.ts';
import { createCausalMemoryState } from '../src/lib/causalMemory.ts';
import { createDefaultSelfModel } from '../src/lib/identityModel.ts';

test('runExperiment updates causal graph', () => {
  const state = createCausalMemoryState();
  const before = state.chains.length;
  const res = runExperiment(
    {
      id: 'e1',
      hypothesis: 'prompt X improves coding',
      design: 'A/B prompt',
      run: () => ({ outcome: 'success', metric: 0.9 }),
      measure: (r) => (r.outcome === 'success' ? 0.9 : 0.1),
    },
    { self: createDefaultSelfModel(), state },
  );
  assert.equal(res.outcome, 'success');
  assert.equal(res.causalUpdated, true);
  assert.ok(state.chains.length > before);
});

test('runExperiment records failure too', () => {
  const state = createCausalMemoryState();
  const res = runExperiment(
    {
      id: 'e2',
      hypothesis: 'approach Y fails',
      design: 'try Y',
      run: () => ({ outcome: 'fail', metric: 0.2 }),
      measure: (r) => (r.outcome === 'fail' ? 0.2 : 1),
    },
    { self: createDefaultSelfModel(), state },
  );
  assert.equal(res.outcome, 'fail');
  assert.ok(res.lesson.includes('fail'));
});

test('abTest picks higher metric', () => {
  const r = abTest('promptA', () => 0.6, 'promptB', () => 0.8);
  assert.equal(r.winner, 'promptB');
  assert.equal(r.a, 0.6);
  assert.equal(r.b, 0.8);
});
