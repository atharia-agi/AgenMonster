import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  rememberEvent,
  forgetEpisode,
  searchMemory,
  upsertFact,
  forgetFact,
  resetMemory,
  getMemoryState,
  recordTopic,
  getTopTopics,
  bumpFact,
  recallTopEpisodes,
} from '../src/lib/memory.ts';

test('forgetEpisode removes only the targeted episode and returns true', () => {
  resetMemory();
  rememberEvent({ kind: 'success', title: 'keep-me', detail: 'around', tags: [], confidence: 1 });
  const target = rememberEvent({
    kind: 'lesson',
    title: 'drop-me',
    detail: 'to be removed',
    tags: [],
    confidence: 1,
  });
  rememberEvent({ kind: 'success', title: 'keep-me-2', detail: 'still here', tags: [], confidence: 1 });
  assert.equal(getMemoryState().episodes.length, 3);
  const ok = forgetEpisode(target.id);
  assert.equal(ok, true);
  const after = getMemoryState().episodes;
  assert.equal(after.length, 2);
  assert.ok(after.every((e) => e.title !== 'drop-me'));
});

test('forgetEpisode on missing id returns false', () => {
  resetMemory();
  rememberEvent({ kind: 'success', title: 'a', detail: 'b', tags: [], confidence: 1 });
  assert.equal(forgetEpisode('nonexistent-id'), false);
});

test('searchMemory filters episodes by keyword in title/detail/tags', () => {
  resetMemory();
  rememberEvent({ kind: 'success', title: 'YAML is fragile', detail: 'preview first', tags: ['yaml'], confidence: 1 });
  rememberEvent({ kind: 'success', title: 'TS strict mode', detail: 'no any', tags: ['typescript'], confidence: 1 });
  const hit = searchMemory('yaml');
  assert.equal(hit.episodes.length, 1);
  assert.equal(hit.episodes[0].title, 'YAML is fragile');
});

test('searchMemory filters facts by keyword in key or value', () => {
  resetMemory();
  upsertFact('lang', 'typescript', 0.9);
  upsertFact('editor', 'zed', 0.9);
  const hit = searchMemory('lang');
  assert.equal(hit.facts.length, 1);
  assert.equal(hit.facts[0].key, 'lang');
});

test('searchMemory returns both episodes and facts matching', () => {
  resetMemory();
  rememberEvent({ kind: 'success', title: 'deploy to aws', detail: 'ci pipeline', tags: ['aws'], confidence: 1 });
  upsertFact('project.cloud', 'aws', 0.9);
  const hit = searchMemory('aws');
  assert.ok(hit.episodes.length >= 1);
  assert.ok(hit.facts.length >= 1);
  resetMemory();
});

test('searchMemory is case-insensitive', () => {
  resetMemory();
  rememberEvent({ kind: 'success', title: 'YAML', detail: 'safe', tags: [], confidence: 1 });
  const hit = searchMemory('yaml');
  assert.equal(hit.episodes.length, 1);
  resetMemory();
});

test('searchMemory returns empty result for no match', () => {
  resetMemory();
  rememberEvent({ kind: 'success', title: 'YAML', detail: 'safe', tags: [], confidence: 1 });
  const hit = searchMemory('nonexistent-keyword');
  assert.equal(hit.episodes.length, 0);
  assert.equal(hit.facts.length, 0);
});

test('getTopTopics returns topics sorted by count desc', () => {
  resetMemory();
  recordTopic('typescript', 5);
  recordTopic('python', 3);
  recordTopic('rust', 1);
  const top = getTopTopics(10);
  assert.equal(top[0].topic, 'typescript');
  assert.equal(top[1].topic, 'python');
  assert.equal(top[2].topic, 'rust');
});

test('bumpFact compounds confidence up to 1', () => {
  resetMemory();
  upsertFact('user.lang', 'typescript', 0.5);
  bumpFact('user.lang');
  const val = getMemoryState().facts['user.lang'];
  assert.ok(val.confidence <= 1);
  assert.ok(val.confidence > 0.5);
  resetMemory();
});

test('recallTopEpisodes returns empty list for fresh state', () => {
  resetMemory();
  const recents = recallTopEpisodes(3);
  assert.equal(recents.length, 0);
});

test('recallTopEpisodes returns episodes sorted by recency', () => {
  resetMemory();
  rememberEvent({ kind: 'success', title: 'old', detail: '', tags: [], confidence: 0.5 });
  rememberEvent({ kind: 'success', title: 'new', detail: '', tags: [], confidence: 0.5 });
  const result = recallTopEpisodes(1);
  assert.equal(result[0].title, 'new');
});

test('recallTopEpisodes caps results to limit', () => {
  resetMemory();
  for (let i = 0; i < 5; i++) {
    rememberEvent({ kind: 'success', title: `ep ${i}`, detail: '', tags: [], confidence: 0.5 });
  }
  const result = recallTopEpisodes(3);
  assert.equal(result.length, 3);
});

test('recordTopic deduplicates same topic on same call', () => {
  resetMemory();
  recordTopic('typescript');
  recordTopic('typescript');
  const top = getTopTopics();
  const ts = top.find((t) => t.topic === 'typescript');
  assert.ok(ts && ts.count >= 2);
});

test('recordTopic stores topic name and count as number', () => {
  resetMemory();
  recordTopic('rust');
  const top = getTopTopics();
  const rust = top.find((t) => t.topic === 'rust');
  assert.ok(rust);
  assert.equal(rust.count, 1);
  assert.equal(typeof rust.count, 'number');
  resetMemory();
});

test('getTopTopics returns empty array when no topics recorded', () => {
  resetMemory();
  assert.equal(getTopTopics().length, 0);
});
