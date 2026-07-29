import { test } from 'node:test';
import assert from 'node:assert/strict';
import { emptyStats, recordCall, msLabel } from '../src/lib/chatStats.ts';

test('msLabel formats sub-second and full-second values', () => {
  assert.equal(msLabel(0), '0ms');
  assert.equal(msLabel(500), '500ms');
  assert.equal(msLabel(950), '950ms');
  assert.equal(msLabel(1000), '1.00s');
  assert.equal(msLabel(2345), '2.35s');
});

test('emptyStats starts with zeros across all counters', () => {
  const s = emptyStats();
  assert.equal(s.totalCalls, 0);
  assert.equal(s.totalSuccess, 0);
  assert.equal(s.totalFail, 0);
  assert.equal(s.lastMs, 0);
  assert.equal(s.lastOk, false);
  assert.equal(s.rollingMsAvg, 0);
  assert.deepEqual(s.byRoute, {});
  assert.deepEqual(s.entries, []);
});

test('recordCall books success + latency into totals and per-route bag', () => {
  const s = recordCall(emptyStats(), { provider: 'groq', model: 'm1', task: 'CODE', ms: 800, ok: true });
  assert.equal(s.totalCalls, 1);
  assert.equal(s.totalSuccess, 1);
  assert.equal(s.totalFail, 0);
  assert.equal(s.lastMs, 800);
  assert.equal(s.lastOk, true);
  assert.equal(s.rollingMsAvg, 800);
  assert.equal(s.byRoute['groq/m1#CODE'].calls, 1);
  assert.equal(s.byRoute['groq/m1#CODE'].successes, 1);
  assert.equal(s.byRoute['groq/m1#CODE'].failures, 0);
  assert.equal(s.byRoute['groq/m1#CODE'].msLast, 800);
});

test('recordCall books failure distinctly', () => {
  const s = recordCall(emptyStats(), { provider: 'groq', model: 'm1', task: 'CHAT', ms: 1200, ok: false });
  assert.equal(s.totalFail, 1);
  assert.equal(s.lastOk, false);
  assert.equal(s.byRoute['groq/m1#CHAT'].failures, 1);
  assert.equal(s.byRoute['groq/m1#CHAT'].successes, 0);
});

test('recordCall aggregates multiple calls per route and computes EMA msAvg', () => {
  let s = emptyStats();
  const route = { provider: 'mistral', model: 'm', task: 'CHAT' };
  s = recordCall(s, { ...route, ms: 100, ok: true });
  s = recordCall(s, { ...route, ms: 300, ok: true });
  s = recordCall(s, { ...route, ms: 1000, ok: true });
  const r = s.byRoute['mistral/m#CHAT'];
  assert.equal(r.calls, 3);
  assert.equal(r.successes, 3);
  // msAvg should be pulled toward 1000 by 30% each step; the EMA settles
  // between 100 and 1000 rather than at the arithmetic mean (400).
  assert.ok(r.msAvg > 400, `expected EMA > 400 but was ${r.msAvg}`);
  assert.ok(r.msAvg < 900, `expected EMA < 900 but was ${r.msAvg}`);
  assert.equal(r.msLast, 1000);
});

test('recordCall keeps only the most recent 50 entries', () => {
  let s = emptyStats();
  for (let i = 0; i < 80; i++) {
    s = recordCall(s, { provider: 'groq', model: 'm', task: 'CHAT', ms: 100 + i, ok: i % 2 === 0 });
  }
  assert.equal(s.entries.length, 50);
  assert.equal(s.totalCalls, 80);
});

test('recordCall computes rollingMsAvg as EMA', () => {
  let s = emptyStats();
  s = recordCall(s, { provider: 'p', model: 'm', task: 'T', ms: 100, ok: true });
  s = recordCall(s, { provider: 'p', model: 'm', task: 'T', ms: 200, ok: true });
  assert.ok(s.rollingMsAvg >= 100 && s.rollingMsAvg <= 200, `EMA ${s.rollingMsAvg} out of range`);
});

test('recordCall counts failures separately', () => {
  let s = emptyStats();
  s = recordCall(s, { provider: 'p', model: 'm', task: 'T', ms: 100, ok: false });
  s = recordCall(s, { provider: 'p', model: 'm', task: 'T', ms: 100, ok: true });
  assert.equal(s.totalCalls, 2);
  assert.equal(s.totalFail, 1);
  assert.equal(s.totalSuccess, 1);
});
