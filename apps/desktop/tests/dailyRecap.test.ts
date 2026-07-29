import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildDailyRecap, runDailyRecap } from '../src/lib/dailyRecap.ts';

test('returns summary string with topic names when episodes exist', () => {
  const recap = buildDailyRecap({
    episodes: [{ id: '1', ts: Date.now(), kind: 'success', title: 'x', detail: '', tags: [], confidence: 1 }],
    topics: [{ topic: 'typescript', count: 5, lastSeen: Date.now() }, { topic: 'rust', count: 3, lastSeen: Date.now() }],
    messageCount: 12,
    goalsCompleted: 2,
    factsLearned: 4,
  });
  assert.ok(recap.detail.includes('typescript'));
  assert.ok(recap.detail.includes('12 messages'));
  assert.ok(recap.detail.includes('2 goals completed'));
  assert.ok(recap.detail.includes('4 facts learned'));
});

test('returns no-activity result when no episodes', () => {
  const recap = buildDailyRecap({
    episodes: [],
    topics: [],
    messageCount: 0,
    goalsCompleted: 0,
    factsLearned: 0,
  });
  assert.ok(recap.detail.includes('no topics yet'));
});

test('tags include daily-recap', () => {
  const recap = buildDailyRecap({
    episodes: [{ id: '1', ts: Date.now(), kind: 'success', title: 'x', detail: '', tags: [], confidence: 1 }],
    topics: [{ topic: 'svelte', count: 2, lastSeen: Date.now() }],
    messageCount: 5,
    goalsCompleted: 1,
    factsLearned: 1,
  });
  assert.ok(recap.tags.includes('daily-recap'));
  assert.ok(recap.tags.includes('svelte'));
});

test('confidence is 0.9', () => {
  const recap = buildDailyRecap({
    episodes: [{ id: '1', ts: Date.now(), kind: 'success', title: 'x', detail: '', tags: [], confidence: 1 }],
    topics: [],
    messageCount: 1,
    goalsCompleted: 0,
    factsLearned: 1,
  });
  assert.equal(recap.confidence, 0.9);
});

test('returns no-activity result when no episodes', () => {
  const recap = buildDailyRecap({
    episodes: [],
    topics: [],
    messageCount: 0,
    goalsCompleted: 0,
    factsLearned: 0,
  });
  assert.ok(recap.detail.includes('no topics yet'));
});

test('tags capped at 6 when more topics provided', () => {
  const recap = buildDailyRecap({
    episodes: [{ id: '1', ts: Date.now(), kind: 'success', title: 'x', detail: '', tags: [], confidence: 1 }],
    topics: [
      { topic: 'ts', count: 5, lastSeen: Date.now() },
      { topic: 'rust', count: 4, lastSeen: Date.now() },
      { topic: 'aws', count: 3, lastSeen: Date.now() },
      { topic: 'docker', count: 2, lastSeen: Date.now() },
    ],
    messageCount: 1,
    goalsCompleted: 0,
    factsLearned: 0,
  });
  assert.ok(recap.tags.length <= 6);
});