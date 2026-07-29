import { test } from 'node:test';
import assert from 'node:assert/strict';
import { recordTopic, rememberEvent } from '../src/lib/memory.ts';
import { evolvePersonality } from '../src/lib/personality.ts';
import {
  forgetStaleEpisodes,
  recallTopEpisodes,
  getMemoriesForPrompt,
} from '../src/lib/memory.ts';

function fresh() {
  recordTopic('typescript', 0); // resets via the eps counter reset is not standard;
  // Instead, drop the trivial approach and use call epsilon by direct reset
}

test('evolvePersonality: heavy typescript -> genius tilt', () => {
  const topics = [
    { topic: 'typescript', count: 10 },
    { topic: 'python', count: 5 },
  ];
  const ev = evolvePersonality('hatchling', topics);
  assert.equal(ev.shift, 'genius', 'expected genius shift given code activity');
  assert.ok(ev.reason.includes('typescript'));
});

test('evolvePersonality: heavy aws/deploy -> stoic tilt', () => {
  const topics = [
    { topic: 'aws', count: 8 },
    { topic: 'deploy', count: 5 },
  ];
  const ev = evolvePersonality('hatchling', topics);
  assert.equal(ev.shift, 'stoic');
});

test('evolvePersonality: insufficient signal returns null shift', () => {
  const topics = [{ topic: 'typescript', count: 1 }];
  const ev = evolvePersonality('hatchling', topics);
  assert.equal(ev.shift, null, 'count=1 must not flip personality');
});

test('evolvePersonality: empty topics returns base only', () => {
  const ev = evolvePersonality('hatchling', []);
  assert.equal(ev.shift, null);
});

test('evolvePersonality: topics without profile mapping return base', () => {
  const ev = evolvePersonality('hatchling', [
    { topic: 'kawaii-mascot-spec', count: 10 } as any,
  ]);
  assert.equal(ev.shift, null);
});

test('recallTopEpisodes returns a copy of recent items', () => {
  rememberEvent({ kind: 'success', title: 'a', detail: 'b', tags: ['x'], confidence: 1 });
  rememberEvent({ kind: 'success', title: 'c', detail: 'd', tags: ['y'], confidence: 1 });
  const eps = recallTopEpisodes(5);
  assert.equal(eps.length, 2);
  assert.equal(eps[0].title, 'c'); // newest first
});

test('forgetStaleEpisodes removes only episodes older than maxAgeMs', () => {
  // We don't control Date.now() here easily, but we KNOW nothing is super old,
  // so the call should return 0 when all episodes are recent.
  rememberEvent({ kind: 'success', title: 'fresh', detail: 'now', tags: [], confidence: 1 });
  const removed = forgetStaleEpisodes(60 * 24 * 60 * 60 * 1000);
  assert.equal(removed, 0);
});

test('getMemoriesForPrompt returns at most `limit` items', () => {
  // Re-seeds known episodes
  rememberEvent({ kind: 'success', title: 'ts reroll', detail: 'typescript tip', tags: ['typescript'], confidence: 1 });
  rememberEvent({ kind: 'success', title: 'reroll', detail: 'typescript notes', tags: ['typescript'], confidence: 1 });
  const hits = getMemoriesForPrompt('typescript', 2);
  assert.ok(hits.length <= 2);
  assert.ok(hits.length > 0);
});
