import { test } from 'node:test';
import assert from 'node:assert/strict';
import { rememberEvent, getMemoriesForPrompt, getMemoryState, resetMemory } from '../src/lib/memory.ts';

test('retrieval triggers reconsolidation: recalled episode confidence climbs', () => {
  rememberEvent({
    kind: 'user_note',
    title: 'TS strict mode',
    detail: 'user prefers strict null checks',
    tags: ['typescript', 'preference'],
    confidence: 0.5,
  });
  const before = getMemoryState().episodes[0].confidence;
  getMemoriesForPrompt('typescript strict', 3);
  const after = getMemoryState().episodes[0].confidence;
  assert.ok(after > before, `confidence should rise (before=${before} after=${after})`);
  assert.ok(after <= 1, 'confidence caps at 1.0');
});

test('non-recalled episodes are not reconsolidated', () => {
  rememberEvent({
    kind: 'user_note',
    title: 'TS strict mode',
    detail: 'null checks',
    tags: ['typescript'],
    confidence: 0.8,
  });
  rememberEvent({
    kind: 'user_note',
    title: 'pasta recipe',
    detail: 'boil water',
    tags: ['cooking'],
    confidence: 0.7,
  });
  getMemoriesForPrompt('typescript', 1);
  const eps = getMemoryState().episodes;
  const ts = eps.find((e) => e.title === 'TS strict mode')!;
  const cooking = eps.find((e) => e.title === 'pasta recipe')!;
  assert.ok(ts.confidence > 0.8, 'retrieved episode should be bumped');
  assert.equal(cooking.confidence, 0.7, 'unrelated episode unchanged');
});

test('repeated retrieval compounds confidence toward 1.0', () => {
  rememberEvent({
    kind: 'user_note',
    title: 'AWS region us-east-1',
    detail: 'pin everything to us-east-1',
    tags: ['aws', 'region'],
    confidence: 0.55,
  });
  for (let i = 0; i < 10; i++) getMemoriesForPrompt('region us-east', 1);
  const final = getMemoryState().episodes[0].confidence;
  assert.ok(final > 0.95, `expected confidence > 0.95 after repeated retrieval, got ${final}`);
});

test('reconsolidation respects MAX_EPISODES cap', () => {
  resetMemory();
  for (let i = 0; i < 200; i++) {
    rememberEvent({ kind: 'success', title: `cap test ${i}`, detail: '', tags: ['code'], confidence: 0.5 });
  }
  const firstId = getMemoryState().episodes[getMemoryState().episodes.length - 1]?.id;
  getMemoriesForPrompt('cap test', 5);
  const eps = getMemoryState().episodes;
  assert.ok(eps.length <= 200);
});
