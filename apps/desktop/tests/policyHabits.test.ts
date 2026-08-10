import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createPolicy, reinforce, PolicyLibrary } from '../src/lib/policyHabits.ts';

test('createPolicy starts at 0.5 confidence', () => {
  const p = createPolicy('codebase_setup', 'use template_v7');
  assert.equal(p.confidence, 0.5);
  assert.equal(p.uses, 0);
});

test('reinforce grows confidence and uses', () => {
  let p = createPolicy('x', 'y');
  p = reinforce(p);
  assert.equal(p.uses, 1);
  assert.ok(Math.abs(p.confidence - 0.53) < 1e-9);
});

test('PolicyLibrary add/get/reinforce', () => {
  const lib = new PolicyLibrary();
  lib.add('deploy', 'canary first');
  const got = lib.getFor('deploy');
  assert.ok(got);
  const r = lib.reinforce('deploy')!;
  assert.equal(r.uses, 1);
  assert.ok(r.confidence > 0.5);
});

test('PolicyLibrary getFor unknown returns null', () => {
  const lib = new PolicyLibrary();
  assert.equal(lib.getFor('nope'), null);
});
