import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getChatStats, pushChatCall, resetChatStats } from '../src/lib/chatStatsStore.svelte.ts';

test('store starts empty after reset', () => {
  resetChatStats();
  const s = getChatStats();
  assert.equal(s.totalCalls, 0);
  assert.equal(s.rollingMsAvg, 0);
});

test('pushChatCall updates totals + per-route', () => {
  resetChatStats();
  pushChatCall({ provider: 'groq', model: 'm1', task: 'CHAT', ms: 420, ok: true });
  const s = getChatStats();
  assert.equal(s.totalCalls, 1);
  assert.equal(s.totalSuccess, 1);
  assert.equal(s.byRoute['groq/m1#CHAT']?.calls, 1);
  assert.equal(s.byRoute['groq/m1#CHAT']?.msLast, 420);
});

test('pushChatCall aggregates multiple calls per route', () => {
  resetChatStats();
  pushChatCall({ provider: 'mistral', model: 'm', task: 'CODE', ms: 100, ok: true });
  pushChatCall({ provider: 'mistral', model: 'm', task: 'CODE', ms: 800, ok: false });
  const s = getChatStats();
  assert.equal(s.totalCalls, 2);
  assert.equal(s.totalSuccess, 1);
  assert.equal(s.totalFail, 1);
  const r = s.byRoute['mistral/m#CODE'];
  assert.equal(r.calls, 2);
  assert.equal(r.successes, 1);
  assert.equal(r.failures, 1);
});

test('resetChatStats clears all state without throwing', () => {
  pushChatCall({ provider: 'groq', model: 'm', task: 'CHAT', ms: 200, ok: true });
  assert.ok(getChatStats().totalCalls > 0);
  resetChatStats();
  assert.equal(getChatStats().totalCalls, 0);
});

test('pushChatCall tracks rollingMsAvg across routes', () => {
  resetChatStats();
  pushChatCall({ provider: 'a', model: 'm', task: 'T', ms: 100, ok: true });
  pushChatCall({ provider: 'b', model: 'm', task: 'T', ms: 500, ok: true });
  const s = getChatStats();
  assert.ok(s.rollingMsAvg > 0);
  assert.equal(s.totalCalls, 2);
});

test('pushChatCall handles ok:false failure path', () => {
  resetChatStats();
  pushChatCall({ provider: 'p', model: 'm', task: 'T', ms: 100, ok: false });
  const s = getChatStats();
  assert.equal(s.totalFail, 1);
  assert.equal(s.totalSuccess, 0);
});
