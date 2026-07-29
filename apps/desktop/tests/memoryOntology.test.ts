import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  classifyKey,
  validateKeyForKind,
  validateValue,
  validateFact,
  SPECS,
} from '../src/lib/memoryOntology.ts';
import { upsertTypedFact, resetMemory, getMemoryState } from '../src/lib/memory.ts';

test('classifyKey recognizes all 4 kinds and rejects unknown', () => {
  assert.equal(classifyKey('user.lang'), 'user');
  assert.equal(classifyKey('project.framework'), 'project');
  assert.equal(classifyKey('tool.linter'), 'tool');
  assert.equal(classifyKey('note.something'), 'note');
  assert.equal(classifyKey('legacy.key'), null);
  assert.equal(classifyKey('plainkey'), null);
});

test('validateKeyForKind accepts canonical keys and rejects mismatched prefix', () => {
  assert.deepEqual(validateKeyForKind('user.lang', 'user'), { ok: true });
  assert.deepEqual(validateKeyForKind('project.framework', 'project'), { ok: true });
  const wrong = validateKeyForKind('project.framework', 'user');
  assert.equal(wrong.ok, false);
  assert.match(wrong.error || '', /must start with/);
});

test('validateKeyForKind enforces pattern per kind', () => {
  assert.equal(validateKeyForKind('user.9starts_with_digit', 'user').ok, false);
  assert.equal(validateKeyForKind('tool.LINT', 'tool').ok, false);
  assert.equal(validateKeyForKind('tool.lint', 'tool').ok, true);
});

test('validateValue rejects empty strings', () => {
  for (const k of ['user', 'project', 'tool'] as const) {
    const r = validateValue(k, '   ');
    assert.equal(r.ok, false);
    assert.match(r.error || '', /cannot be empty/);
  }
});

test('validateValue rejects oversized strings', () => {
  const r = validateValue('user', 'x'.repeat(500));
  assert.equal(r.ok, false);
  assert.match(r.error || '', /> 200/);
});

test('validateFact integrates prefix + pattern + value checks', () => {
  const ok = validateFact('user.lang', 'typescript');
  assert.equal(ok.ok, true);
  assert.equal(ok.kind, 'user');
  assert.equal(ok.value, 'typescript');

  const wrongKind = validateFact('user.lang', 'typescript');
  assert.equal(validateFact('user.framework', 'sveltekit').ok, true);
  assert.equal(validateFact('project.lang', 'typescript').ok, true);

  const fail1 = validateFact('foo.lang', 'typescript');
  assert.equal(fail1.ok, false);
  const fail2 = validateFact('user.lang', '');
  assert.equal(fail2.ok, false);
  const fail3 = validateFact('user.123', 'typescript');
  assert.equal(fail3.ok, false);
});

test('SPECS has 4 kinds', () => {
  assert.equal(Object.keys(SPECS).length, 4);
  assert.ok(SPECS.user && SPECS.project && SPECS.tool && SPECS.note);
});

test('upsertTypedFact persists user.* keys and rejects wrong prefix', () => {
  resetMemory();
  const ok = upsertTypedFact('user.lang', 'typescript', 0.9);
  assert.equal(ok.ok, true);
  assert.equal(getMemoryState().facts['user.lang'].value, 'typescript');

  const bad = upsertTypedFact('foo.lang', 'typescript', 0.9);
  assert.equal(bad.ok, false);
  assert.equal(getMemoryState().facts['foo.lang'], undefined);
});

test('validateFact accepts values shaped by kind', () => {
  const r = validateFact('user.note', 'any string');
  assert.equal(r.ok, true);
});

test('validateFact rejects unknown kind', () => {
  const r = validateFact('unknown.x', 'v');
  assert.equal(r.ok, false);
});
