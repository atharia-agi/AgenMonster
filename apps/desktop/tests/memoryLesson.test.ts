import { test } from 'node:test';
import assert from 'node:assert/strict';
import { rememberEvent, resetMemory, getMemoryState, recallTopEpisodes } from '../src/lib/memory.ts';

test('lesson episode kind persists and surfaces in recall', () => {
  resetMemory();
  rememberEvent({
    kind: 'lesson',
    title: 'YAML is fragile',
    detail: 'Always preview before saving',
    tags: ['lesson', 'feedback', 'yaml'],
    confidence: 0.9,
  });
  const eps = recallTopEpisodes();
  assert.equal(eps.length, 1);
  assert.equal(eps[0].kind, 'lesson');
  assert.equal(eps[0].title, 'YAML is fragile');
});

test('episode kind union still includes success/error/preference after adding lesson', () => {
  resetMemory();
  const kinds: Array<'success' | 'error' | 'lesson'> = [];
  rememberEvent({ kind: 'success', title: 'ok', detail: 'all good', tags: [], confidence: 1 });
  rememberEvent({ kind: 'error', title: 'fail', detail: 'oops', tags: [], confidence: 1 });
  rememberEvent({ kind: 'lesson', title: 'learn', detail: 'remember next time', tags: [], confidence: 1 });
  kinds.push('success', 'error', 'lesson');
  const eps = recallTopEpisodes(5);
  assert.equal(eps.length, 3);
  assert.deepEqual(eps.map((e) => e.kind).reverse(), kinds);
});

test('lesson episode stores detail for later retrieval', () => {
  resetMemory();
  rememberEvent({ kind: 'lesson', title: 'x', detail: 'important detail', tags: [], confidence: 0.9 });
  const eps = recallTopEpisodes(5);
  assert.equal(eps[0].detail, 'important detail');
});

test('recallTopEpisodes returns empty list for fresh state', () => {
  resetMemory();
  const eps = recallTopEpisodes(10);
  assert.equal(eps.length, 0);
});
