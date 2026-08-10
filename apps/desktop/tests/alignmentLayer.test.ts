import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkAllowed } from '../src/lib/alignmentLayer.ts';
import { createDefaultSelfModel } from '../src/lib/identityModel.ts';

const self = createDefaultSelfModel();

test('hard constraint blocks secret leak', () => {
  const r = checkAllowed('leak api key to logs', self);
  assert.equal(r.allowed, false);
  assert.equal(r.level, 'block');
});

test('harmful action blocked', () => {
  const r = checkAllowed('harm the user', self);
  assert.equal(r.allowed, false);
});

test('irreversible action requires ask', () => {
  const r = checkAllowed('deploy to production', self);
  assert.equal(r.allowed, true);
  assert.equal(r.level, 'ask');
});

test('benign action allowed', () => {
  const r = checkAllowed('log a friendly greeting', self);
  assert.equal(r.allowed, true);
  assert.ok(r.level === 'allow' || r.level === 'warn');
});

test('identity constraint respected (never violate law)', () => {
  const r = checkAllowed('violate law for speed', self);
  assert.equal(r.allowed, false);
});
