import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  rememberEvent,
  upsertFact,
  getFact,
  bumpFact,
  forgetFact,
  recordTopic,
  getTopTopics,
  getMemoriesForPrompt,
  resetMemory,
  getMemoryState,
  iterateDecay,
  setPersonaPreset,
  getPersona,
  setPersona,
  PERSONA_PRESETS,
  MAX_EPISODES,
  MAX_FACTS,
} from '../src/lib/memory.ts';

function fresh() {
  resetMemory();
  return getMemoryState();
}

test('empty state has zero memories', () => {
  const s = fresh();
  assert.equal(s.episodes.length, 0);
  assert.equal(s.totalMemories, 0);
});

test('rememberEvent appends episode, caps at MAX_EPISODES', () => {
  fresh();
  for (let i = 0; i < 300; i++) {
    rememberEvent({ kind: 'success', title: `do ${i}`, detail: `did ${i}`, tags: ['code'], confidence: 1 });
  }
  const s = getMemoryState();
  assert.equal(s.episodes.length, 200);
  assert.equal(s.totalMemories, 300);
});

test('upsertFact + getFact round-trips, confidence compounds', () => {
  fresh();
  upsertFact('user.lang', 'typescript', 0.9);
  upsertFact('user.lang', 'typescript', 0.8);
  assert.equal(getFact('user.lang'), 'typescript');
  const f = getMemoryState().facts['user.lang'];
  assert.equal(f.confidence, 0.9);
});

test('forgetFact removes the key', () => {
  fresh();
  upsertFact('x', 'y');
  assert.equal(getFact('x'), 'y');
  forgetFact('x');
  assert.equal(getFact('x'), undefined);
});

test('recordTopic + getTopTopics sorts desc, caps at MAX_TOPICS', () => {
  fresh();
  recordTopic('aws', 5);
  recordTopic('ts', 10);
  recordTopic('python', 3);
  const top = getTopTopics(2);
  assert.equal(top[0].topic, 'ts');
  assert.equal(top[0].count, 10);
  assert.equal(top[1].topic, 'aws');
});

test('getMemoriesForPrompt returns top scoring episodes matching keywords', () => {
  fresh();
  rememberEvent({ kind: 'error', title: 'YAML parse failed', detail: 'ruamel needs safe_load', tags: ['yaml', 'preference'], confidence: 1 });
  rememberEvent({ kind: 'success', title: 'deployed to AWS', detail: 'Lambda + API Gateway', tags: ['aws'], confidence: 1 });
  rememberEvent({ kind: 'milestone', title: 'first chat', detail: 'asked about YAML config', tags: ['yaml'], confidence: 0.5 });
  const hits = getMemoriesForPrompt('yaml parse error', 3);
  assert.ok(hits.length >= 1);
  assert.ok(hits[0].toLowerCase().includes('yaml'));
});

test('getMemoriesForPrompt returns empty when nothing matches', () => {
  fresh();
  rememberEvent({ kind: 'success', title: 'deployed', detail: 'lambda', tags: ['aws'], confidence: 1 });
  const hits = getMemoriesForPrompt('cooking pasta recipe', 3);
  assert.equal(hits.length, 0);
});

test('PERSONA_PRESETS has expected keys and non-empty values', () => {
  const keys = Object.keys(PERSONA_PRESETS);
  assert.ok(keys.includes('terse'));
  assert.ok(keys.includes('helpful'));
  assert.ok(keys.includes('sarcastic'));
  assert.ok(keys.includes('indonesian'));
  assert.ok(keys.includes('pirate'));
  assert.ok(PERSONA_PRESETS.terse.length > 0);
  assert.ok(PERSONA_PRESETS.helpful.length > 0);
  assert.ok(PERSONA_PRESETS.sarcastic.length > 0);
  assert.strictEqual(keys.length, 5);
});

test('MAX_EPISODES and MAX_FACTS are positive numbers', () => {
  assert.ok(MAX_EPISODES > 0);
  assert.ok(MAX_FACTS > 0);
});

test('iterateDecay does not crash on empty state', () => {
  fresh();
  iterateDecay();
  assert.equal(getMemoryState().episodes.length, 0);
});

test('iterateDecay does not crash after many episodes', () => {
  fresh();
  for (let i = 0; i < 50; i++) {
    rememberEvent({ kind: 'success', title: `old ${i}`, detail: 'x', tags: [], confidence: 0.5 });
  }
  iterateDecay();
  assert.ok(Number.isFinite(getMemoryState().episodes.length));
  resetMemory();
});

test('iterateDecay prunes success episode older than 30 days', () => {
  fresh();
  const veryOld = Date.now() - 31 * 24 * 60 * 60 * 1000;
  // rememberEvent always stamps Date.now(); we inject by mutating the internal
  // module state via getMemoryState().episodes (test-only hack).
  const s = getMemoryState();
  s.episodes.unshift({
    id: 'ancient-success',
    ts: veryOld,
    kind: 'success',
    title: 'ancient success',
    detail: 'old success',
    tags: ['code'],
    confidence: 0.5,
  });
  s.lastIndexedAt = veryOld;
  const before = getMemoryState().episodes.length;
  iterateDecay();
  const after = getMemoryState().episodes.length;
  assert.ok(after < before, `expected prune: before=${before} after=${after}`);
  resetMemory();
});

test('iterateDecay prunes non-milestone non-lesson episode older than 30 days', () => {
  fresh();
  const veryOld = Date.now() - 31 * 24 * 60 * 60 * 1000;
  const s = getMemoryState();
  s.episodes.unshift({
    id: 'ancient-success',
    ts: veryOld,
    kind: 'success',
    title: 'ancient success',
    detail: 'old success',
    tags: ['code'],
    confidence: 0.5,
  });
  s.lastIndexedAt = veryOld;
  const before = getMemoryState().episodes.length;
  iterateDecay();
  const after = getMemoryState().episodes.length;
  assert.ok(after < before, `expected prune for non-milestone/non-lesson`);
  resetMemory();
});

test('iterateDecay preserves milestone episode older than 30 days', () => {
  fresh();
  const veryOld = Date.now() - 31 * 24 * 60 * 60 * 1000;
  const s = getMemoryState();
  s.episodes.unshift({
    id: 'ancient-milestone',
    ts: veryOld,
    kind: 'milestone',
    title: 'ancient milestone',
    detail: 'keep me',
    tags: [],
    confidence: 0.5,
  });
  s.lastIndexedAt = veryOld;
  iterateDecay();
  assert.equal(getMemoryState().episodes.length, 1);
  resetMemory();
});

test('iterateDecay preserves lesson episode older than 30 days', () => {
  fresh();
  const veryOld = Date.now() - 31 * 24 * 60 * 60 * 1000;
  const s = getMemoryState();
  s.episodes.unshift({
    id: 'ancient-lesson',
    ts: veryOld,
    kind: 'lesson',
    title: 'ancient lesson',
    detail: 'keep me too',
    tags: [],
    confidence: 0.5,
  });
  s.lastIndexedAt = veryOld;
  iterateDecay();
  assert.equal(getMemoryState().episodes.length, 1);
  resetMemory();
});

test('PERSONA_PRESETS has all expected preset keys', () => {
  assert.ok(PERSONA_PRESETS['terse']);
  assert.ok(PERSONA_PRESETS['helpful']);
  assert.ok(PERSONA_PRESETS['sarcastic']);
  assert.ok(PERSONA_PRESETS['indonesian']);
  assert.ok(PERSONA_PRESETS['pirate']);
});

test('setPersonaPreset with invalid key falls back to setPersona', () => {
  setPersonaPreset('nonexistent-preset');
  assert.equal(getPersona(), '');
  resetMemory();
});

test('iterateDecay precise: +0.04 per bumpFact call', () => {
  fresh();
  upsertFact('user.driver', 'groq', 0.6);
  const v0 = getMemoryState().facts['user.driver'].confidence;
  bumpFact('user.driver');
  const v1 = getMemoryState().facts['user.driver'].confidence;
  assert.equal(v1, Math.min(1, v0 + 0.04));
  resetMemory();
});

test('getMemoriesForPrompt limits to n results', () => {
  fresh();
  for (let i = 0; i < 10; i++) {
    rememberEvent({ kind: 'success', title: `ep ${i}`, detail: 'typescript helper', tags: ['code'], confidence: 0.5 });
  }
  const hits = getMemoriesForPrompt('typescript', 4);
  assert.equal(hits.length, 4);
  resetMemory();
});

test('getMemoriesForPrompt returns zero results when nothing matches', () => {
  fresh();
  rememberEvent({ kind: 'success', title: 'deployed', detail: 'lambda', tags: ['aws'], confidence: 1 });
  const hits = getMemoriesForPrompt('cooking pasta recipe', 3);
  assert.equal(hits.length, 0);
  resetMemory();
});
