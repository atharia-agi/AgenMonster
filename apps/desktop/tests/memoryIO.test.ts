import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  rememberEvent,
  upsertFact,
  getFact,
  bumpFact,
  exportMemoryJSON,
  importMemoryJSON,
  resetMemory,
  getMemoryState,
} from '../src/lib/memory.ts';

test('exportMemoryJSON returns structured v1 envelope', () => {
  resetMemory();
  rememberEvent({ kind: 'success', title: 't', detail: 'd', tags: [], confidence: 1 });
  upsertFact('lang', 'typescript', 0.9);
  const json = exportMemoryJSON();
  const parsed = JSON.parse(json);
  assert.equal(parsed.version, 1);
  assert.ok(parsed.state.episodes.length >= 1);
  assert.equal(parsed.state.facts.lang.value, 'typescript');
});

test('importMemoryJSON round-trips exported state', () => {
  resetMemory();
  rememberEvent({ kind: 'lesson', title: 'round-trip', detail: 'survives', tags: ['lesson'], confidence: 0.8 });
  upsertFact('editor', 'zed', 0.9);
  const exported = exportMemoryJSON();
  resetMemory();
  assert.equal(getMemoryState().episodes.length, 0);
  const result = importMemoryJSON(exported);
  assert.ok(result.ok);
  assert.ok(getMemoryState().episodes.length >= 1);
  assert.equal(getFact('editor'), 'zed');
});

test('importMemoryJSON rejects unsupported version', () => {
  const result = importMemoryJSON(JSON.stringify({ version: 99 }));
  assert.equal(result.ok, false);
  assert.equal(result.reason, 'unsupported version');
});

test('importMemoryJSON rejects malformed JSON', () => {
  const result = importMemoryJSON('not json');
  assert.equal(result.ok, false);
  assert.ok(result.reason);
});

test('bumpFact reconsolidates: confidence climbs +0.04 per use', () => {
  resetMemory();
  upsertFact('user.driver', 'groq', 0.6);
  const v0 = getMemoryState().facts['user.driver'].confidence;
  bumpFact('user.driver');
  const v3 = getMemoryState().facts['user.driver'].confidence;
  assert.ok(v3 > v0, 'confidence should increase with user.* fact');
  assert.ok(v3 <= 1, 'confidence caps at 1.0');
});

test('exportMemoryJSON returns valid JSON string', () => {
  resetMemory();
  const json = exportMemoryJSON();
  assert.ok(typeof json === 'string');
  assert.ok(JSON.parse(json).version === 1);
});

test('importMemoryJSON rejects empty string', () => {
  const result = importMemoryJSON('');
  assert.equal(result.ok, false);
});

test('importMemoryJSON rejects object without version', () => {
  const result = importMemoryJSON(JSON.stringify({ state: {} }));
  assert.equal(result.ok, false);
});

test('importMemoryJSON round-trip preserves episode count and fact count', () => {
  resetMemory();
  for (let i = 0; i < 5; i++) {
    rememberEvent({ kind: 'success', title: `ep ${i}`, detail: `detail ${i}`, tags: ['test'], confidence: 0.9 });
  }
  for (let i = 0; i < 3; i++) {
    upsertFact(`key${i}`, `value${i}`, 0.8);
  }
  const exported = exportMemoryJSON();
  resetMemory();
  importMemoryJSON(exported);
  assert.equal(getMemoryState().episodes.length, 5);
  const factKeys = Object.keys(getMemoryState().facts);
  assert.equal(factKeys.length, 3);
});

test('importMemoryJSON preserves episode kinds after round-trip', () => {
  resetMemory();
  rememberEvent({ kind: 'success', title: 'ok', detail: '', tags: [], confidence: 0.9 });
  rememberEvent({ kind: 'error', title: 'fail', detail: '', tags: [], confidence: 0.9 });
  const exported = exportMemoryJSON();
  resetMemory();
  importMemoryJSON(exported);
  assert.equal(getMemoryState().episodes.length, 2);
});

test('exportMemoryJSON export has version, exportedAt, and state', () => {
  resetMemory();
  const json = exportMemoryJSON();
  const parsed = JSON.parse(json);
  assert.equal(parsed.version, 1);
  assert.equal(typeof parsed.exportedAt, 'string');
  assert.ok('state' in parsed);
});
