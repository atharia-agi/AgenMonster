import { test } from 'node:test';
import assert from 'node:assert/strict';
import { simulate, likelyFailureMode, outcomeDistance } from '../src/lib/simulation.ts';
import { createWorldGraph, addEntity, link } from '../src/lib/worldModelGraph.ts';

function buildGraph() {
  let g = createWorldGraph();
  g = addEntity(g, { id: 'push', type: 'action', label: 'push glass' });
  g = addEntity(g, { id: 'fall', type: 'event', label: 'glass falls' });
  g = addEntity(g, { id: 'spill', type: 'event', label: 'water spills' });
  g = addEntity(g, { id: 'slip', type: 'event', label: 'person slips' });
  g = link(g, 'push', 'fall', 'causes');
  g = link(g, 'fall', 'spill', 'causes');
  g = link(g, 'spill', 'slip', 'causes');
  return g;
}

test('simulate rolls out causal chain', () => {
  const g = buildGraph();
  const r = simulate('push glass', g, 30);
  assert.ok(r.steps.length >= 1);
  assert.equal(r.steps[0].event, 'causes glass falls');
  assert.ok(['low', 'medium', 'high'].includes(r.risk));
});

test('simulate confidence decays over rollout', () => {
  const g = buildGraph();
  const r = simulate('push glass', g);
  const confs = r.steps.map((s) => s.confidence);
  for (let i = 1; i < confs.length; i++) assert.ok(confs[i] <= confs[i - 1] + 1e-9);
});

test('likelyFailureMode detects blocker', () => {
  let g = buildGraph();
  g = addEntity(g, { id: 'ship', type: 'action', label: 'ship feature' });
  g = addEntity(g, { id: 'bug', type: 'event', label: 'blocking bug' });
  g = link(g, 'ship', 'bug', 'blocked_by');
  assert.equal(likelyFailureMode('ship feature', g), 'blocked by blocking bug');
});

test('likelyFailureMode unknown action', () => {
  const g = buildGraph();
  assert.ok(likelyFailureMode('teleport', g)!.includes('unknown'));
});

test('outcomeDistance measures relation hops', () => {
  const g = buildGraph();
  assert.equal(outcomeDistance('push glass', 'person slips', g), 3);
});
