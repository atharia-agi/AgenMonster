import { test } from 'node:test';
import assert from 'node:assert/strict';
import { modelStakeholder, tailorFor, stakeholderWeight } from '../src/lib/socialCognition.ts';

test('modelStakeholder returns role-specific model', () => {
  const dev = modelStakeholder('developer');
  const inv = modelStakeholder('investor');
  assert.ok(dev.knowledgeLevel > inv.knowledgeLevel);
  assert.equal(dev.role, 'developer');
});

test('tailorFor picks simple tone for low knowledge', () => {
  const r = tailorFor('end_user', 'here is the API');
  assert.equal(r.tone, 'simple');
});

test('tailorFor picks evidence-heavy for low trust', () => {
  const r = tailorFor('critic', 'our method works');
  assert.equal(r.tone, 'evidence-heavy');
});

test('stakeholderWeight averages trust*knowledge', () => {
  const w = stakeholderWeight([modelStakeholder('developer'), modelStakeholder('user')]);
  assert.ok(w > 0 && w <= 1);
});

test('stakeholderWeight empty → 0.5', () => {
  assert.equal(stakeholderWeight([]), 0.5);
});
