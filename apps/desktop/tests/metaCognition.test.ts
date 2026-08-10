import { test } from 'node:test';
import assert from 'node:assert/strict';
import { assessBelief, aggregateUncertainty } from '../src/lib/metaCognition.ts';

test('assessBelief confidence rises with evidence', () => {
  const low = assessBelief('model A better', [], ['benchmark'], []);
  const high = assessBelief('model A better', ['bench1', 'bench2', 'bench3'], [], []);
  assert.ok(high.confidence > low.confidence);
  assert.ok(high.nextAction === 'act' || high.nextAction === 'verify');
});

test('low confidence triggers experiment', () => {
  const b = assessBelief('unknown claim', [], ['data', 'context'], ['assume X']);
  assert.ok(b.confidence < 0.4);
  assert.equal(b.nextAction, 'experiment');
});

test('assessBelief bounded 0..1', () => {
  const b = assessBelief('x', new Array(20).fill('e'), [], []);
  assert.ok(b.confidence <= 1);
});

test('aggregateUncertainty flags weakest belief', () => {
  const weak = assessBelief('claim', [], ['proof'], []);
  const strong = assessBelief('claim2', ['a', 'b', 'c'], [], []);
  const agg = aggregateUncertainty([weak, strong]);
  assert.equal(agg.weakest!.belief, 'claim');
  assert.equal(agg.shouldPause, true);
});

test('aggregateUncertainty not pause when all strong', () => {
  const a = assessBelief('c1', ['e1', 'e2', 'e3'], [], []);
  const b = assessBelief('c2', ['e1', 'e2', 'e3'], [], []);
  const agg = aggregateUncertainty([a, b]);
  assert.equal(agg.shouldPause, false);
});
